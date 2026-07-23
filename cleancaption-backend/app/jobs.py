"""
In-memory job tracking. Good enough for a single backend instance /
demo deployment. For production with multiple workers, swap this for
Redis (or a DB table) + a real task queue (Celery/RQ/Arq) — the shape
of `Job` and the endpoints in main.py would stay the same.
"""

import shutil
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from .pipeline.pipeline import detections_to_api_shape, run_pipeline

STORAGE_ROOT = Path(__file__).resolve().parent.parent / "storage" / "jobs"
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

_executor = ThreadPoolExecutor(max_workers=2)  # bump for more concurrent jobs


class JobCancelled(Exception):
    pass


@dataclass
class Job:
    id: str
    status: str = "queued"   # queued | running | done | error
    progress: int = 0
    message: str = ""
    detections: list = field(default_factory=list)
    output_path: Optional[str] = None
    cancelled: bool = False
    _lock: threading.Lock = field(default_factory=threading.Lock)


_jobs: dict[str, Job] = {}


def create_job(upload_path: str) -> Job:
    job_id = str(uuid.uuid4())
    job = Job(id=job_id)
    _jobs[job_id] = job

    work_dir = STORAGE_ROOT / job_id
    work_dir.mkdir(parents=True, exist_ok=True)
    output_path = str(work_dir / "output.mp4")

    _executor.submit(_run_job, job, upload_path, str(work_dir), output_path)
    return job


def get_job(job_id: str) -> Optional[Job]:
    return _jobs.get(job_id)


def cancel_job(job_id: str) -> bool:
    job = _jobs.get(job_id)
    if not job or job.status in ("done", "error"):
        return False
    job.cancelled = True
    return True


def _run_job(job: Job, upload_path: str, work_dir: str, output_path: str) -> None:
    job.status = "running"

    def progress_cb(percent: int, message: str) -> None:
        if job.cancelled:
            raise JobCancelled()
        job.progress = percent
        job.message = message

    try:
        detections = run_pipeline(upload_path, work_dir, output_path, progress_cb)
        if job.cancelled:
            raise JobCancelled()
        job.detections = detections_to_api_shape(detections)
        job.output_path = output_path
        job.status = "done"
        job.progress = 100
        job.message = "Processing complete."
    except JobCancelled:
        job.status = "error"
        job.message = "Cancelled."
        shutil.rmtree(work_dir, ignore_errors=True)
    except Exception as exc:  # noqa: BLE001 — surface any failure to the client
        job.status = "error"
        job.message = f"Processing failed: {exc}"
