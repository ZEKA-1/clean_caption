import uuid
from pathlib import Path

from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import jobs
from .models import (
    ProcessResponse,
    ResultResponse,
    StatusResponse,
)


UPLOAD_ROOT = (
    Path(__file__).resolve().parent.parent
    / "storage"
    / "uploads"
)

UPLOAD_ROOT.mkdir(
    parents=True,
    exist_ok=True,
)

MAX_UPLOAD_BYTES = (
    500 * 1024 * 1024
)

ALLOWED_CONTENT_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
}

ALLOWED_FONTS = {
    "Arial",
    "Verdana",
    "Georgia",
    "Times New Roman",
    "Courier New",
}

ALLOWED_COLORS = {
    "#ffffff",
    "#ffd84d",
    "#ff5b5b",
    "#69d5ff",
    "#6ee7a8",
}

ALLOWED_POSITIONS = {
    "Bottom",
    "Center",
    "Top",
}

ALLOWED_BACKGROUNDS = {
    "semi-transparent",
    "black",
    "none",
}

ALLOWED_CENSOR_MODES = {
    "beep",
    "mute",
    "subtitles",
}


app = FastAPI(
    title="CleanCaption API"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/files",
    StaticFiles(
        directory=jobs.STORAGE_ROOT
    ),
    name="files",
)


@app.post(
    "/api/process",
    response_model=ProcessResponse,
)
async def start_processing(
    video: UploadFile = File(...),

    censor_mode: str = Form("beep"),

    subtitle_font: str = Form("Arial"),
    subtitle_color: str = Form("#ffffff"),
    subtitle_size: int = Form(32),
    subtitle_bold: bool = Form(True),
    subtitle_position: str = Form("Bottom"),
    subtitle_background: str = Form(
        "semi-transparent"
    ),
):
    # -----------------------------
    # VIDEO TYPE
    # -----------------------------

    if (
        video.content_type
        not in ALLOWED_CONTENT_TYPES
    ):
        raise HTTPException(
            400,
            "Unsupported file type. "
            "Use MP4, MOV or AVI.",
        )

    # -----------------------------
    # CENSOR MODE
    # -----------------------------

    censor_mode = (
        censor_mode
        .strip()
        .lower()
    )

    if (
        censor_mode
        not in ALLOWED_CENSOR_MODES
    ):
        raise HTTPException(
            400,
            "Unsupported censor mode.",
        )

    # -----------------------------
    # SUBTITLE STYLE
    # -----------------------------

    if (
        subtitle_font
        not in ALLOWED_FONTS
    ):
        raise HTTPException(
            400,
            "Unsupported subtitle font.",
        )

    subtitle_color = (
        subtitle_color.lower()
    )

    if (
        subtitle_color
        not in ALLOWED_COLORS
    ):
        raise HTTPException(
            400,
            "Unsupported subtitle color.",
        )

    if not (
        18 <= subtitle_size <= 60
    ):
        raise HTTPException(
            400,
            "Subtitle size must be "
            "between 18 and 60 px.",
        )

    if (
        subtitle_position
        not in ALLOWED_POSITIONS
    ):
        raise HTTPException(
            400,
            "Unsupported subtitle position.",
        )

    if (
        subtitle_background
        not in ALLOWED_BACKGROUNDS
    ):
        raise HTTPException(
            400,
            "Unsupported subtitle background.",
        )

    # -----------------------------
    # SAVE VIDEO
    # -----------------------------

    upload_id = str(
        uuid.uuid4()
    )

    safe_filename = Path(
        video.filename or "video.mp4"
    ).name

    dest = (
        UPLOAD_ROOT
        / f"{upload_id}_{safe_filename}"
    )

    size = 0

    with dest.open("wb") as out:
        while chunk := await video.read(
            1024 * 1024
        ):
            size += len(chunk)

            if size > MAX_UPLOAD_BYTES:
                out.close()

                dest.unlink(
                    missing_ok=True
                )

                raise HTTPException(
                    413,
                    "File exceeds the "
                    "500 MB limit.",
                )

            out.write(chunk)

    # -----------------------------
    # SUBTITLE STYLE
    # -----------------------------

    subtitle_style = {
        "font": subtitle_font,
        "color": subtitle_color,
        "size": subtitle_size,
        "bold": subtitle_bold,
        "position": subtitle_position,
        "background":
            subtitle_background,
    }

    print(
        "Censor mode received:",
        censor_mode,
    )

    print(
        "Subtitle style received:",
        subtitle_style,
    )

    # -----------------------------
    # CREATE JOB
    # -----------------------------

    job = jobs.create_job(
        upload_path=str(dest),
        subtitle_style=subtitle_style,
        censor_mode=censor_mode,
    )

    return ProcessResponse(
        jobId=job.id
    )


@app.get(
    "/api/process/{job_id}/status",
    response_model=StatusResponse,
)
async def get_status(
    job_id: str
):
    job = jobs.get_job(
        job_id
    )

    if not job:
        raise HTTPException(
            404,
            "Unknown jobId.",
        )

    return StatusResponse(
        status=job.status,
        progress=job.progress,
        message=job.message,
    )


@app.delete(
    "/api/process/{job_id}"
)
async def cancel(
    job_id: str
):
    ok = jobs.cancel_job(
        job_id
    )

    if not ok:
        raise HTTPException(
            404,
            "Unknown jobId or job "
            "already finished.",
        )

    return {
        "cancelled": True
    }


@app.get(
    "/api/process/{job_id}/result",
    response_model=ResultResponse,
)
async def get_result(
    job_id: str
):
    job = jobs.get_job(
        job_id
    )

    if not job:
        raise HTTPException(
            404,
            "Unknown jobId.",
        )

    if job.status != "done":
        raise HTTPException(
            409,
            f"Job is not finished yet "
            f"(status: {job.status}).",
        )

    return ResultResponse(
        videoUrl=(
            f"/files/{job_id}/output.mp4"
        ),
        detections=job.detections,
    )


@app.get(
    "/api/process/{job_id}/download"
)
async def download_result(
    job_id: str
):
    job = jobs.get_job(
        job_id
    )

    if not job:
        raise HTTPException(
            404,
            "Unknown jobId.",
        )

    if job.status != "done":
        raise HTTPException(
            409,
            f"Job is not finished yet "
            f"(status: {job.status}).",
        )

    if not job.output_path:
        raise HTTPException(
            404,
            "Processed video not found.",
        )

    output_file = Path(
        job.output_path
    )

    if not output_file.exists():
        raise HTTPException(
            404,
            "Processed video file "
            "does not exist.",
        )

    return FileResponse(
        path=str(output_file),
        media_type="video/mp4",
        filename=(
            f"cleancaption-{job_id}.mp4"
        ),
    )