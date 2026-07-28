import shutil
import uuid
from pathlib import Path

from fastapi.responses import FileResponse
from fastapi import FastAPI, File, HTTPException, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import jobs
from .models import ProcessResponse, ResultResponse, StatusResponse

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "storage" / "uploads"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB, matches "Maximum 500 MB" in the UI
ALLOWED_CONTENT_TYPES = {"video/mp4", "video/quicktime", "video/x-msvideo"}

app = FastAPI(title="CleanCaption API")

# Loosen this to the real frontend origin(s) in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve finished videos at /files/<jobId>/output.mp4
app.mount("/files", StaticFiles(directory=jobs.STORAGE_ROOT), name="files")


@app.post("/api/process", response_model=ProcessResponse)
async def start_processing(video: UploadFile = File(...), quality: str = Form("original")):
    if video.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(400, "Unsupported file type. Use MP4, MOV or AVI.")

    upload_id = str(uuid.uuid4())
    dest = UPLOAD_ROOT / f"{upload_id}_{video.filename}"

    size = 0
    with dest.open("wb") as out:
        while chunk := await video.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(413, "File exceeds the 500 MB limit.")
            out.write(chunk)

    # `quality` is accepted for parity with the UI; wire it into
    # pipeline.run_pipeline / ffmpeg scaling flags if you need real
    # downscaling before processing.
    job = jobs.create_job(str(dest))
    return ProcessResponse(jobId=job.id)


@app.get("/api/process/{job_id}/status", response_model=StatusResponse)
async def get_status(job_id: str):
    job = jobs.get_job(job_id)
    if not job:
        raise HTTPException(404, "Unknown jobId.")
    return StatusResponse(status=job.status, progress=job.progress, message=job.message)


@app.delete("/api/process/{job_id}")
async def cancel(job_id: str):
    ok = jobs.cancel_job(job_id)
    if not ok:
        raise HTTPException(404, "Unknown jobId or job already finished.")
    return {"cancelled": True}


@app.get("/api/process/{job_id}/result", response_model=ResultResponse)
async def get_result(job_id: str):
    job = jobs.get_job(job_id)
    if not job:
        raise HTTPException(404, "Unknown jobId.")
    if job.status != "done":
        raise HTTPException(409, f"Job is not finished yet (status: {job.status}).")
    return ResultResponse(videoUrl=f"/files/{job_id}/output.mp4", detections=job.detections)

@app.get("/api/process/{job_id}/download")
async def download_result(job_id: str):
    job = jobs.get_job(job_id)

    if not job:
        raise HTTPException(404, "Unknown jobId.")

    if job.status != "done":
        raise HTTPException(409, f"Job is not finished yet (status: {job.status}).")

    if not job.output_path:
        raise HTTPException(404, "Processed video not found.")

    output_file = Path(job.output_path)

    if not output_file.exists():
        raise HTTPException(404, "Processed video file does not exist.")

    return FileResponse(
        path=str(output_file),
        media_type="video/mp4",
        filename=f"cleancaption-{job_id}.mp4",
    )