"""
Orchestrates the full CleanCaption pipeline:

1. Extract audio from the uploaded video
2. Transcribe it with word-level timestamps
3. Flag profane words -> a list of (word, start, end) detections
4. Build a censored audio track (mute + beep)
5. Build a censored video track (mouth blur during flagged intervals)
6. Mux censored video + censored audio into the final output

`progress_cb(percent, message)` is called throughout so the API layer
can report real status to the /processing page.
"""

import subprocess
from pathlib import Path
from typing import Callable

from .audio_censor import censor_audio
from .profanity import Detection, find_profanity, format_timestamp
from .transcribe import transcribe_words
from .video_censor import censor_video

ProgressCB = Callable[[int, str], None]


def _extract_audio(input_video: str, output_wav: str) -> None:
    cmd = [
        "ffmpeg", "-y", "-i", input_video,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        output_wav,
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def _mux(video_only: str, audio_only: str, output_path: str) -> None:
    cmd = [
        "ffmpeg", "-y",
        "-i", video_only, "-i", audio_only,
        "-c:v", "copy", "-c:a", "copy",
        "-map", "0:v:0", "-map", "1:a:0",
        "-shortest",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def run_pipeline(
    input_video: str,
    work_dir: str,
    output_path: str,
    progress_cb: ProgressCB,
) -> list[Detection]:
    work = Path(work_dir)
    work.mkdir(parents=True, exist_ok=True)

    audio_wav = str(work / "audio.wav")
    censored_audio = str(work / "censored_audio.m4a")
    censored_video_noaudio = str(work / "censored_video.mp4")

    progress_cb(5, "Extracting audio...")
    _extract_audio(input_video, audio_wav)

    progress_cb(15, "Transcribing speech...")
    words = transcribe_words(audio_wav)

    progress_cb(35, "Detecting offensive language...")
    detections = find_profanity(words)

    progress_cb(50, "Adding audio beeps...")
    censor_audio(input_video, detections, censored_audio)

    progress_cb(70, "Applying mouth blur...")
    censor_video(input_video, detections, censored_video_noaudio)

    progress_cb(95, "Finalizing video...")
    _mux(censored_video_noaudio, censored_audio, output_path)

    progress_cb(100, "Processing complete.")
    return detections


def detections_to_api_shape(detections: list[Detection]) -> list[dict]:
    return [{"time": format_timestamp(d.start), "word": d.word} for d in detections]
