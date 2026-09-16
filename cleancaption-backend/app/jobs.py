"""
In-memory job tracking for CleanCaption.

This file:
- creates processing jobs
- stores progress
- handles cancellation
- converts technical backend errors into
  user-friendly messages
"""

import shutil
import subprocess
import threading
import traceback
import uuid

from concurrent.futures import (
    ThreadPoolExecutor,
)

from dataclasses import (
    dataclass,
    field,
)

from pathlib import Path
from typing import Optional

from .pipeline.pipeline import (
    detections_to_api_shape,
    run_pipeline,
)


# ============================================================
# STORAGE
# ============================================================

STORAGE_ROOT = (
    Path(__file__)
    .resolve()
    .parent
    .parent
    / "storage"
    / "jobs"
)

STORAGE_ROOT.mkdir(
    parents=True,
    exist_ok=True,
)


# Maximum number of videos processed
# at the same time.
_executor = ThreadPoolExecutor(
    max_workers=2
)


# ============================================================
# CUSTOM EXCEPTION
# ============================================================

class JobCancelled(Exception):
    pass


# ============================================================
# JOB MODEL
# ============================================================

@dataclass
class Job:

    id: str

    status: str = "queued"

    progress: int = 0

    message: str = (
        "Waiting to start..."
    )

    detections: list = field(
        default_factory=list
    )

    output_path: Optional[str] = None

    cancelled: bool = False

    subtitle_style: dict = field(
        default_factory=dict
    )

    censor_mode: str = "beep"

    _lock: threading.Lock = field(
        default_factory=threading.Lock
    )


_jobs: dict[str, Job] = {}


# ============================================================
# FRIENDLY ERROR MESSAGES
# ============================================================

def _friendly_error_message(
    exc: Exception,
) -> str:
    """
    Convert technical Python / FFmpeg /
    AI errors into messages that make
    sense to a normal user.

    The complete technical error is still
    printed in the backend terminal.
    """

    technical_message = str(
        exc
    ).lower()


    # --------------------------------------------------------
    # FFMPEG NOT INSTALLED / NOT FOUND
    # --------------------------------------------------------

    if isinstance(
        exc,
        FileNotFoundError,
    ):

        if "ffmpeg" in technical_message:
            return (
                "CleanCaption could not start the video processor. "
                "FFmpeg is not available on the server."
            )

        return (
            "CleanCaption could not find a file required "
            "for processing."
        )


    # --------------------------------------------------------
    # FFMPEG PROCESSING ERROR
    # --------------------------------------------------------

    if isinstance(
        exc,
        subprocess.CalledProcessError,
    ):

        return (
            "CleanCaption could not process this video. "
            "The video may be damaged, incomplete, "
            "or use an unsupported codec."
        )


    # --------------------------------------------------------
    # VIDEO / AUDIO PROBLEMS
    # --------------------------------------------------------

    video_error_words = [
        "invalid data",
        "invalid argument",
        "moov atom",
        "could not find codec",
        "codec",
        "decoder",
        "demux",
        "video stream",
        "audio stream",
    ]

    if any(
        word in technical_message
        for word in video_error_words
    ):

        return (
            "CleanCaption could not read this video correctly. "
            "Please try another MP4, MOV or AVI file."
        )


    # --------------------------------------------------------
    # WHISPER / TRANSCRIPTION
    # --------------------------------------------------------

    whisper_error_words = [
        "whisper",
        "ctranslate",
        "transcrib",
        "speech model",
    ]

    if any(
        word in technical_message
        for word in whisper_error_words
    ):

        return (
            "CleanCaption could not transcribe the audio "
            "in this video. Please try another video."
        )


    # --------------------------------------------------------
    # MEDIAPIPE / FACE DETECTION
    # --------------------------------------------------------

    mediapipe_error_words = [
        "mediapipe",
        "face landmarker",
        "face_landmarker",
        "landmark",
    ]

    if any(
        word in technical_message
        for word in mediapipe_error_words
    ):

        return (
            "CleanCaption had a problem while analyzing "
            "the video image. Please try again or use "
            "Subtitles only mode."
        )


    # --------------------------------------------------------
    # MEMORY
    # --------------------------------------------------------

    if isinstance(
        exc,
        MemoryError,
    ):

        return (
            "The server does not have enough memory "
            "to process this video. Try a shorter "
            "or smaller video."
        )


    memory_error_words = [
        "out of memory",
        "cannot allocate memory",
        "memory allocation",
    ]

    if any(
        word in technical_message
        for word in memory_error_words
    ):

        return (
            "The server ran out of memory while processing "
            "this video. Try a shorter or smaller video."
        )


    # --------------------------------------------------------
    # MODEL DOWNLOAD / INTERNET
    # --------------------------------------------------------

    network_error_words = [
        "connection error",
        "connection refused",
        "connection reset",
        "timed out",
        "timeout",
        "huggingface",
        "storage.googleapis",
        "download",
    ]

    if any(
        word in technical_message
        for word in network_error_words
    ):

        return (
            "CleanCaption could not load one of its AI models. "
            "Please check the server internet connection "
            "and try again."
        )


    # --------------------------------------------------------
    # DEFAULT
    # --------------------------------------------------------

    return (
        "CleanCaption could not finish processing this video. "
        "Please try again. If the problem continues, "
        "try another video."
    )


# ============================================================
# CREATE JOB
# ============================================================

def create_job(
    upload_path: str,
    subtitle_style: Optional[dict] = None,
    censor_mode: str = "beep",
) -> Job:

    job_id = str(
        uuid.uuid4()
    )


    job = Job(
        id=job_id,

        subtitle_style=(
            subtitle_style or {}
        ),

        censor_mode=censor_mode,
    )


    _jobs[job_id] = job


    work_dir = (
        STORAGE_ROOT
        / job_id
    )


    work_dir.mkdir(
        parents=True,
        exist_ok=True,
    )


    output_path = str(
        work_dir
        / "output.mp4"
    )


    print(
        f"Job {job_id} subtitle style:",
        job.subtitle_style,
    )


    print(
        f"Job {job_id} censor mode:",
        job.censor_mode,
    )


    _executor.submit(
        _run_job,
        job,
        upload_path,
        str(work_dir),
        output_path,
    )


    return job


# ============================================================
# GET JOB
# ============================================================

def get_job(
    job_id: str,
) -> Optional[Job]:

    return _jobs.get(
        job_id
    )


# ============================================================
# CANCEL JOB
# ============================================================

def cancel_job(
    job_id: str,
) -> bool:

    job = _jobs.get(
        job_id
    )


    if (
        not job
        or job.status
        in (
            "done",
            "error",
        )
    ):
        return False


    job.cancelled = True

    return True


# ============================================================
# RUN JOB
# ============================================================

def _run_job(
    job: Job,
    upload_path: str,
    work_dir: str,
    output_path: str,
) -> None:

    job.status = "running"

    job.progress = 0

    job.message = (
        "Starting processing..."
    )


    def progress_cb(
        percent: int,
        message: str,
    ) -> None:

        if job.cancelled:
            raise JobCancelled()


        with job._lock:

            job.progress = max(
                0,
                min(
                    100,
                    int(percent),
                ),
            )

            job.message = (
                message
            )


    try:

        detections = run_pipeline(
            input_video=upload_path,

            work_dir=work_dir,

            output_path=output_path,

            progress_cb=progress_cb,

            subtitle_style=(
                job.subtitle_style
            ),

            censor_mode=(
                job.censor_mode
            ),
        )


        if job.cancelled:
            raise JobCancelled()


        job.detections = (
            detections_to_api_shape(
                detections
            )
        )


        job.output_path = (
            output_path
        )


        job.status = "done"

        job.progress = 100

        job.message = (
            "Processing complete."
        )


        print(
            f"Job {job.id} completed successfully."
        )


    # ========================================================
    # USER CANCELLED
    # ========================================================

    except JobCancelled:

        job.status = "error"

        job.message = (
            "Processing was cancelled."
        )


        print(
            f"Job {job.id} was cancelled."
        )


        shutil.rmtree(
            work_dir,
            ignore_errors=True,
        )


    # ========================================================
    # PROCESSING ERROR
    # ========================================================

    except Exception as exc:

        friendly_message = (
            _friendly_error_message(
                exc
            )
        )


        job.status = "error"

        job.message = (
            friendly_message
        )


        job.output_path = None


        print()
        print(
            "=" * 70
        )

        print(
            f"CLEANCAPTION JOB ERROR: {job.id}"
        )

        print(
            "User-friendly message:"
        )

        print(
            friendly_message
        )

        print()
        print(
            "Technical error:"
        )

        print(
            repr(exc)
        )

        print()
        print(
            "Full traceback:"
        )


        traceback.print_exc()


        print(
            "=" * 70
        )

        print()


        # Remove incomplete output file
        # if FFmpeg created one before failing.

        incomplete_output = Path(
            output_path
        )


        if incomplete_output.exists():

            try:

                incomplete_output.unlink()

            except OSError:

                pass