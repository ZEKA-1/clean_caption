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
from .subtitles import create_censored_srt

ProgressCB = Callable[[int, str], None]


def _extract_audio(input_video: str, output_wav: str) -> None:
    cmd = [
        "ffmpeg", "-y", "-i", input_video,
        "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
        output_wav,
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def _mux(video_only: str, audio_only: str, subtitles_path: str, output_path: str) -> None:
    work_dir = Path(subtitles_path).parent
    subtitle_file_name = Path(subtitles_path).name

    cmd = [
        "ffmpeg", "-y",
        "-i", video_only,
        "-i", audio_only,

        # Burn subtitles directly into the video.
        "-vf", f"subtitles={subtitle_file_name}",

        # Browser-friendly video format.
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",

        # Browser-friendly audio format.
        "-c:a", "aac",
        "-b:a", "192k",

        "-map", "0:v:0",
        "-map", "1:a:0",
        "-shortest",
        "-movflags", "+faststart",
        output_path,
    ]

    print("Running final mux with subtitles:")
    print(" ".join(cmd))

    subprocess.run(cmd, check=True, capture_output=True, cwd=str(work_dir))


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
    subtitle_srt = str(work / "subtitles.srt")

    progress_cb(5, "Extracting audio...")
    _extract_audio(input_video, audio_wav)

    progress_cb(15, "Transcribing speech...")
    words = transcribe_words(audio_wav)

    print("WORDS COUNT:", len(words))
    print("FIRST WORDS:")
    for w in words[:50]:
        print(w.text, w.start, w.end)

    progress_cb(35, "Detecting offensive language...")
    detections = find_profanity(words)

    progress_cb(45, "Creating subtitles...")
    create_censored_srt(words, subtitle_srt)

    progress_cb(55, "Adding audio beeps...")
    censor_audio(input_video, detections, censored_audio)

    progress_cb(70, "Applying mouth blur...")
    censor_video(input_video, detections, censored_video_noaudio)

    progress_cb(95, "Finalizing video with subtitles...")
    _mux(censored_video_noaudio, censored_audio, subtitle_srt, output_path)

    progress_cb(100, "Processing complete.")
    return detections


def detections_to_api_shape(detections: list[Detection]) -> list[dict]:
    return [{"time": format_timestamp(d.start), "word": d.word} for d in detections]
