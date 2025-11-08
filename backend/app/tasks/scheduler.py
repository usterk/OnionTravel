from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.config import settings
import logging

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def update_exchange_rates():
    """
    Task to update exchange rates daily.
    This function will be called by the scheduler.
    """
    from app.services.currency import CurrencyService
    from app.database import SessionLocal

    logger.info("Starting daily exchange rate update...")
    db = SessionLocal()
    try:
        currency_service = CurrencyService(db)
        currency_service.update_all_rates()
        logger.info("Exchange rates updated successfully")
    except Exception as e:
        logger.error(f"Failed to update exchange rates: {str(e)}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler"""
    if not scheduler.running:
        # Schedule daily update at configured hour (default: 3 AM UTC)
        scheduler.add_job(
            update_exchange_rates,
            trigger=CronTrigger(
                hour=settings.CURRENCY_UPDATE_HOUR,
                timezone=settings.CURRENCY_UPDATE_TIMEZONE
            ),
            id='update_exchange_rates',
            name='Update exchange rates daily',
            replace_existing=True
        )

        scheduler.start()
        logger.info(f"Scheduler started. Exchange rates will update daily at {settings.CURRENCY_UPDATE_HOUR}:00 {settings.CURRENCY_UPDATE_TIMEZONE}")


def stop_scheduler():
    """Stop the background scheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
