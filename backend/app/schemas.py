from datetime import datetime, timezone
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar('T')


class ApiResponse(BaseModel, Generic[T]):
    data: T
    message: str | None = None


class ApiErrorResponse(BaseModel):
    error: str
    message: str


def to_iso_utc(value: datetime) -> str:
    """Convert datetime to ISO 8601 format with UTC timezone."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


# Add our Pydantic schemas here
