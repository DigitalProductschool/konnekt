from urllib.parse import urlsplit

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEVELOPMENT_CONNECTION_BASE_URL = 'http://localhost:3000'
DEVELOPMENT_PORTAL_URL = 'http://localhost:5173'
DEVELOPMENT_MCP_URL = 'http://localhost:3100/mcp'


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
    # How long a deletion can be restored (spec 010, data-model §8); 0 switches
    # restoring off
    deletion_undo_seconds: int = 300

    # Agent access and the MCP server (spec 007, data-model §10); the three URLs
    # are resolved by resolve_agent_urls
    portal_url: str | None = None
    mcp_url: str | None = None
    oauth_issuer: str | None = None
    agent_access_token_minutes: int = 60
    agent_connection_idle_days: int = 30
    agent_token_max_days: int = 90
    approval_request_minutes: int = 10
    agent_drafts_per_hour: int = 20

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

    @model_validator(mode='after')
    def resolve_agent_urls(self) -> 'Settings':
        """Default the portal URL, the MCP URL and the OAuth issuer (spec 007).

        Runs after check_connection_base_url, so the connection base URL is set:
        in development the portal and the MCP server have their local ports, and
        elsewhere both live behind the connection base URL. The issuer is the
        connection base URL unless set.
        """
        base = self.connection_base_url or DEVELOPMENT_CONNECTION_BASE_URL
        development = self.app_env == 'development'
        portal_url = (self.portal_url or '').strip().rstrip('/')
        mcp_url = (self.mcp_url or '').strip().rstrip('/')
        oauth_issuer = (self.oauth_issuer or '').strip().rstrip('/')
        self.portal_url = portal_url or (
            DEVELOPMENT_PORTAL_URL if development else base
        )
        self.mcp_url = mcp_url or (
            DEVELOPMENT_MCP_URL if development else f'{base}/mcp'
        )
        self.oauth_issuer = oauth_issuer or base
        return self


settings = Settings()
