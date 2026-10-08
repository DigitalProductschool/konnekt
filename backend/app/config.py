from pydantic_settings import BaseSettings, SettingsConfigDict


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


settings = Settings()
