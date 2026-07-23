from typing import Literal, Optional
from pydantic import BaseModel


class ProcessResponse(BaseModel):
    jobId: str


class Detection(BaseModel):
    time: str   # "0:04" — mm:ss, matches BACKEND_INTEGRATION.md example
    word: str   # censored form, e.g. "s***"


class StatusResponse(BaseModel):
    status: Literal["queued", "running", "done", "error"]
    progress: int  # 0-100
    message: Optional[str] = None


class ResultResponse(BaseModel):
    videoUrl: str
    detections: list[Detection]
