"""
Background Job Scheduler
========================
Runs three nightly/hourly jobs:
  1. Dynamic pricing   — every hour
  2. Recommendation rebuild — every night at 2 AM
  3. Churn score update    — every night at 3 AM

Start alongside the API:
    python scheduler.py &
    python main.py
Or integrate into main.py lifespan using asyncio.create_task.
"""

import logging
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger
    HAS_SCHEDULER = True
except ImportError:
    HAS_SCHEDULER = False
    logger.warning("APScheduler not installed. Run: pip install apscheduler")

from app.core.database import SessionLocal
from app.ml.pricing import pricing_engine
from app.ml.recommender import recommender
from app.ml.search import search_engine


def run_pricing_update():
    logger.info("⚙️  Running dynamic pricing update...")
    with SessionLocal() as db:
        result = pricing_engine.run(db)
    logger.info(f"   Pricing done: {result}")


def run_recommendation_rebuild():
    logger.info("🤖 Rebuilding recommendation engine...")
    with SessionLocal() as db:
        result = recommender.run(db)
    logger.info(f"   Recommendations done: {result}")


def run_search_index_rebuild():
    logger.info("🔍 Rebuilding search index...")
    with SessionLocal() as db:
        count = search_engine.build_index(db)
    logger.info(f"   Search index: {count} products indexed")


def run_churn_update():
    logger.info("📊 Updating churn scores...")
    from app.models.user import User
    from app.api.users import compute_churn_score
    with SessionLocal() as db:
        users = db.query(User).filter(User.is_active == True).all()
        for u in users:
            u.churn_risk_score = compute_churn_score(u)
        db.commit()
    logger.info(f"   Churn scores updated for {len(users)} users")


def start_scheduler():
    if not HAS_SCHEDULER:
        logger.error("Cannot start scheduler — APScheduler not installed.")
        return None

    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")

    # Pricing: every hour
    scheduler.add_job(run_pricing_update, "interval", hours=1, id="pricing",
                      next_run_time=datetime.now(timezone.utc))

    # Recommendations: every night at 2 AM IST
    scheduler.add_job(run_recommendation_rebuild, CronTrigger(hour=2, minute=0),
                      id="recommendations")

    # Search index: every night at 1 AM IST
    scheduler.add_job(run_search_index_rebuild, CronTrigger(hour=1, minute=0),
                      id="search_index")

    # Churn scores: every night at 3 AM IST
    scheduler.add_job(run_churn_update, CronTrigger(hour=3, minute=0),
                      id="churn_scores")

    scheduler.start()
    logger.info("✅ Scheduler started — 4 jobs registered")
    return scheduler


if __name__ == "__main__":
    logger.info("Starting background scheduler standalone mode...")
    scheduler = start_scheduler()
    if scheduler:
        import time
        try:
            while True:
                time.sleep(60)
        except (KeyboardInterrupt, SystemExit):
            scheduler.shutdown()
            logger.info("Scheduler stopped.")
