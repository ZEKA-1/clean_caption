"""
Mouth blurring: for each frame that falls inside a detected profanity
interval, find the speaker's mouth with MediaPipe's Face Landmarker
(the current Tasks API) and blur it. Outside those intervals, frames
pass through untouched. Output has no audio track — audio_censor.py
produces that separately and pipeline.py muxes the two together.

Uses the modern `mediapipe.tasks` API rather than the old
`mediapipe.solutions` API, which newer mediapipe releases (0.10.30+)
no longer ship on most platforms. The face landmark model (a small
.task file) is downloaded once from Google's model repo and cached
locally under storage/models/.
"""

import urllib.request
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions

from .profanity import Detection

PAD_SECONDS = 0.15  # slightly wider than the beep so the blur doesn't "pop"
BLUR_KERNEL = (35, 35)
BOX_MARGIN = 12  # pixels of padding around the detected lip landmarks

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)
MODEL_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "storage" / "models" / "face_landmarker.task"
)

# Standard MediaPipe face-mesh lip landmark indices (outer + inner lip ring).
LIP_INDICES = sorted({
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375,
    291, 308, 324, 318, 402, 317, 14, 87, 178, 88,
    95, 78, 191, 80, 81, 82, 13, 312, 311, 310,
    415, 76, 77, 90, 180, 85, 16, 315, 404, 320, 307, 306, 292,
})


def _ensure_model() -> str:
    """Download the face landmark model once, then reuse the cached copy."""
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not MODEL_PATH.exists():
        urllib.request.urlretrieve(MODEL_URL, str(MODEL_PATH))
    return str(MODEL_PATH)


def _in_any_interval(t: float, detections: list[Detection]) -> bool:
    return any(
        (d.start - PAD_SECONDS) <= t <= (d.end + PAD_SECONDS) for d in detections
    )


def _blur_mouth(frame, landmarker, timestamp_ms: int, width: int, height: int):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = landmarker.detect_for_video(mp_image, timestamp_ms)

    if not result.face_landmarks:
        return frame  # no face found this frame — leave it as-is

    for landmarks in result.face_landmarks:
        xs = [landmarks[i].x * width for i in LIP_INDICES]
        ys = [landmarks[i].y * height for i in LIP_INDICES]
        x1 = max(0, int(min(xs)) - BOX_MARGIN)
        x2 = min(width, int(max(xs)) + BOX_MARGIN)
        y1 = max(0, int(min(ys)) - BOX_MARGIN)
        y2 = min(height, int(max(ys)) + BOX_MARGIN)
        if x2 > x1 and y2 > y1:
            roi = frame[y1:y2, x1:x2]
            frame[y1:y2, x1:x2] = cv2.GaussianBlur(roi, BLUR_KERNEL, 0)
    return frame


def censor_video(input_video: str, detections: list[Detection], output_video: str) -> None:
    model_path = _ensure_model()

    cap = cv2.VideoCapture(input_video)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_video, fourcc, fps, (width, height))

    options = vision.FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=vision.RunningMode.VIDEO,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    with vision.FaceLandmarker.create_from_options(options) as landmarker:
        frame_idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            t = frame_idx / fps
            if _in_any_interval(t, detections):
                timestamp_ms = int(t * 1000)
                frame = _blur_mouth(frame, landmarker, timestamp_ms, width, height)
            writer.write(frame)
            frame_idx += 1

    cap.release()
    writer.release()
