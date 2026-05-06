from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/ecommerce_db"

    # App
    APP_NAME: str = "ECommerce AI System"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production-use-openssl-rand-hex-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ML settings
    RECO_TOP_N: int = 10            # how many recommendations to show
    PRICING_UPDATE_INTERVAL: int = 3600  # seconds between pricing engine runs
    MIN_EVENTS_FOR_RECO: int = 50   # minimum purchase events before building reco model

    # Dynamic pricing thresholds
    HIGH_DEMAND_VIEWS_THRESHOLD: int = 100   # views/24h above which price can increase
    LOW_STOCK_THRESHOLD: int = 10            # units below which urgency pricing kicks in
    MAX_PRICE_INCREASE_PCT: float = 0.20     # never raise more than 20% above base
    MAX_PRICE_DECREASE_PCT: float = 0.30     # never drop more than 30% below base

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
