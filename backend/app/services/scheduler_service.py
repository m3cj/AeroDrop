"""
Scheduler Service — APScheduler wrapper for scheduled mission starts.
"""
import logging
from datetime import datetime
from typing import Callable, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger

logger = logging.getLogger(__name__)


class SchedulerService:
    def __init__(self):
        self._scheduler = AsyncIOScheduler()
        self._running = False

    def start(self):
        if not self._running:
            self._scheduler.start()
            self._running = True
            logger.info("APScheduler started")

    def stop(self):
        if self._running:
            self._scheduler.shutdown(wait=False)
            self._running = False
            logger.info("APScheduler stopped")

    def schedule_mission_start(
        self,
        mission_id: str,
        run_at: datetime,
        callback: Callable,
    ) -> str:
        """Schedule a mission to start at a specific datetime. Returns job ID."""
        job = self._scheduler.add_job(
            callback,
            trigger=DateTrigger(run_date=run_at),
            id=f"mission_{mission_id}",
            kwargs={"mission_id": mission_id},
            replace_existing=True,
            misfire_grace_time=60,
        )
        logger.info(f"Mission {mission_id} scheduled at {run_at}")
        return job.id

    def cancel_mission(self, mission_id: str):
        job_id = f"mission_{mission_id}"
        try:
            self._scheduler.remove_job(job_id)
            logger.info(f"Cancelled scheduled mission {mission_id}")
        except Exception:
            pass


# Singleton
scheduler_service = SchedulerService()
