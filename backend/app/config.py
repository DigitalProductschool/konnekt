from urllib.parse import urlsplit

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEVELOPMENT_CONNECTION_BASE_URL = 'http://localhost:3000'


class Settings(BaseSettings):
    """Application settings, read from the environment and .env.

    Field names are matched to environment variables case-insensitively, so
    `database_url` is populated from `DATABASE_URL`.
    """

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    database_url: str = (
        'postgresql+psycopg://postgres:postgres@localhost:5432/template_db'
    )
    port: int = 3000
    cors_origin: str = 'http://localhost:5173'
    app_env: str = 'development'

    # Base URL that serviceBW uses to reach the middleware (research R18)
    connection_base_url: str | None = None

    # EUDIPLO management API; saving and triggering answer 503 while one is empty
    eudiplo_url: str = ''
    eudiplo_client_id: str = ''
    eudiplo_client_secret: str = ''
    eudiplo_trust_list_id: str = ''

    request_lifetime_seconds: int = 600
    document_retention_seconds: int = 1800
    pull_repeat_window_seconds: int = 60
    request_record_retention_seconds: int = 604800
    allow_plain_http: bool = False
    worker_enabled: bool = True
    login_session_hours: int = 8

    @model_validator(mode='after')
    def check_connection_base_url(self) -> 'Settings':
        """Default the connection base URL in development, require it elsewhere.

        Outside development the connection URLs are copied into serviceBW, and the
        pull URL carries documents, so a missing or plain-HTTP address stops the
        startup (FR-019).
        """
        value = (self.connection_base_url or '').strip().rstrip('/')
        if self.app_env == 'development':
            self.connection_base_url = value or DEVELOPMENT_CONNECTION_BASE_URL
            return self

        if not value:
            raise ValueError(
                'CONNECTION_BASE_URL must be set when APP_ENV is not development'
            )
        parts = urlsplit(value)
        allowed_schemes = {'https', 'http'} if self.allow_plain_http else {'https'}
        if parts.scheme not in allowed_schemes or not parts.netloc:
            raise ValueError(
                'CONNECTION_BASE_URL must be an https:// URL '
                '(http:// only with ALLOW_PLAIN_HTTP=true)'
            )
        self.connection_base_url = value
        return self


settings = Settings()
