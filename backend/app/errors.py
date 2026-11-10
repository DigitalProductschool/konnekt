import logging
import traceback
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .language import Text, language_of_scope, resolve_text

logger = logging.getLogger(__name__)

# The message of a 500. What went wrong is only in the log, under the error id
INTERNAL_ERROR_MESSAGE = Text(
    en=(
        'Something went wrong on our side. Contact an administrator and give them '
        'the error ID.'
    ),
    de=(
        'Etwas ist auf unserer Seite schiefgelaufen. Wenden Sie sich an eine '
        'Administratorin oder einen Administrator und nennen Sie die Fehler-ID.'
    ),
)

# The message of a request whose body or parameters don't fit the endpoint
INVALID_PAYLOAD_MESSAGE = Text(en='Invalid request payload', de='Ungültige Anfrage.')


def describe_error(error: BaseException) -> str:
    """Name an error and the code that raised it, leaving out its message.

    Messages can quote data (a failed validation quotes its input), so logging them
    could put personal data into the log.
    """
    frames = traceback.extract_tb(error.__traceback__)
    if not frames:
        return type(error).__name__
    own_frames = [frame for frame in frames if 'site-packages' not in frame.filename]
    frame = (own_frames or frames)[-1]
    return (
        f'{type(error).__name__} in {frame.name} '
        f'({Path(frame.filename).name}:{frame.lineno})'
    )


def log_server_error(error: BaseException, description: str) -> str:
    """Log a failure on the server's side under a new error id, and return the id.

    The 5xx answer carries the id as `error_id`, so an administrator can find this
    line, while the answer says nothing about the cause. The line holds the
    description and the error's type and code location, never its message, which can
    quote data (see `describe_error`).
    """
    error_id = str(uuid.uuid4())
    logger.error('Error %s: %s (%s)', error_id, description, describe_error(error))
    return error_id


def _route_of(request: Request) -> str:
    """The matched route's template.

    Unlike the URL, it never holds a request reference, which mustn't be logged.
    """
    return getattr(request.scope.get('route'), 'path', '(no route)')


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers for the FastAPI app."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        _request: Request, exception: HTTPException
    ) -> JSONResponse:
        detail = exception.detail

        if isinstance(detail, dict) and 'error' in detail and 'message' in detail:
            # A new dict, so the exception keeps the detail it was raised with; a
            # `Text` message in the request's language, a plain string as it is
            content = {**detail, 'message': resolve_text(detail['message'])}
            return JSONResponse(status_code=exception.status_code, content=content)

        return JSONResponse(
            status_code=exception.status_code,
            content={'error': 'Request error', 'message': str(detail)},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request,
        _exception: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={
                'error': 'Validation error',
                'message': resolve_text(INVALID_PAYLOAD_MESSAGE),
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exception: Exception
    ) -> JSONResponse:
        error_id = log_server_error(
            exception, f'Unexpected error in {request.method} {_route_of(request)}'
        )
        # Starlette runs this handler outside every middleware, after the language
        # middleware has reset the request's language, so it reads the language
        # from the request again, by the middleware's rule
        language = language_of_scope(request.scope)
        return JSONResponse(
            status_code=500,
            content={
                'error': 'Internal server error',
                'message': INTERNAL_ERROR_MESSAGE.resolve(language),
                'error_id': error_id,
            },
        )
