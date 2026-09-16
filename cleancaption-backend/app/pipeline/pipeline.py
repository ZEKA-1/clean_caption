"""
CleanCaption processing pipeline.

Censor modes:

beep
    Censored subtitles
    + beep audio
    + mouth blur

mute
    Censored subtitles
    + muted offensive words
    + mouth blur

subtitles
    Censored subtitles only.
    Original audio and original video are kept.
"""

import subprocess

from pathlib import Path
from typing import Callable, Optional

from .audio_censor import (
    censor_audio,
)

from .profanity import (
    Detection,
    find_profanity,
    format_timestamp,
)

from .subtitles import (
    create_censored_srt,
)

from .transcribe import (
    transcribe_words,
)

from .video_censor import (
    censor_video,
)


ProgressCB = Callable[
    [int, str],
    None,
]


DEFAULT_SUBTITLE_STYLE = {
    "font": "Arial",
    "color": "#ffffff",
    "size": 32,
    "bold": True,
    "position": "Bottom",
    "background":
        "semi-transparent",
}


# ============================================================
# EXTRACT AUDIO FOR TRANSCRIPTION
# ============================================================

def _extract_audio(
    input_video: str,
    output_wav: str,
) -> None:

    cmd = [
        "ffmpeg",
        "-y",

        "-i",
        input_video,

        "-vn",

        "-acodec",
        "pcm_s16le",

        "-ar",
        "16000",

        "-ac",
        "1",

        output_wav,
    ]

    subprocess.run(
        cmd,
        check=True,
        capture_output=True,
    )


# ============================================================
# COLOR CONVERSION
# ============================================================

def _hex_to_ass_color(
    hex_color: str,
) -> str:

    value = (
        hex_color
        .lstrip("#")
    )

    if len(value) != 6:
        value = "ffffff"

    try:

        red = value[0:2]
        green = value[2:4]
        blue = value[4:6]

        int(red, 16)
        int(green, 16)
        int(blue, 16)

    except ValueError:

        return (
            "&H00FFFFFF"
        )

    return (
        f"&H00"
        f"{blue}"
        f"{green}"
        f"{red}"
    ).upper()


# ============================================================
# BUILD SUBTITLE STYLE
# ============================================================

def _build_subtitle_force_style(
    subtitle_style: Optional[dict],
) -> str:

    style = (
        DEFAULT_SUBTITLE_STYLE.copy()
    )

    if subtitle_style:
        style.update(
            subtitle_style
        )

    font = str(
        style.get(
            "font",
            "Arial",
        )
    )

    color = _hex_to_ass_color(
        str(
            style.get(
                "color",
                "#ffffff",
            )
        )
    )

    try:

        size = int(
            style.get(
                "size",
                32,
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        size = 32

    size = max(
        18,
        min(
            60,
            size,
        ),
    )

    bold = (
        -1
        if bool(
            style.get(
                "bold",
                True,
            )
        )
        else 0
    )

    position = str(
        style.get(
            "position",
            "Bottom",
        )
    )

    alignment_map = {
        "Top": 8,
        "Center": 5,
        "Bottom": 2,
    }

    alignment = (
        alignment_map.get(
            position,
            2,
        )
    )

    background = str(
        style.get(
            "background",
            "semi-transparent",
        )
    )

    if background == "black":

        border_style = 3

        back_colour = (
            "&H00000000"
        )

        outline = 0

    elif background == "none":

        border_style = 1

        back_colour = (
            "&HFF000000"
        )

        outline = 2

    else:

        border_style = 3

        back_colour = (
            "&H80000000"
        )

        outline = 0

    return ",".join(
        [
            f"FontName={font}",

            f"FontSize={size}",

            f"PrimaryColour={color}",

            f"Bold={bold}",

            f"Alignment={alignment}",

            f"BorderStyle={border_style}",

            f"BackColour={back_colour}",

            "OutlineColour=&H00000000",

            f"Outline={outline}",

            "Shadow=0",

            "MarginL=35",

            "MarginR=35",

            "MarginV=28",
        ]
    )


# ============================================================
# FINAL VIDEO
# ============================================================

def _mux(
    video_source: str,
    audio_source: str,
    subtitles_path: str,
    output_path: str,
    subtitle_style: Optional[dict],
) -> None:

    work_dir = Path(
        subtitles_path
    ).parent

    subtitle_file_name = Path(
        subtitles_path
    ).name

    force_style = (
        _build_subtitle_force_style(
            subtitle_style
        )
    )

    subtitle_filter = (
        f"subtitles="
        f"{subtitle_file_name}:"
        f"force_style="
        f"'{force_style}'"
    )

    print(
        "Subtitle FFmpeg style:",
        force_style,
    )

    cmd = [
        "ffmpeg",
        "-y",

        "-i",
        video_source,

        "-i",
        audio_source,

        "-vf",
        subtitle_filter,

        "-c:v",
        "libx264",

        "-pix_fmt",
        "yuv420p",

        "-preset",
        "veryfast",

        "-c:a",
        "aac",

        "-b:a",
        "192k",

        "-map",
        "0:v:0",

        "-map",
        "1:a:0",

        "-shortest",

        "-movflags",
        "+faststart",

        output_path,
    ]

    print(
        "Running final mux with subtitles:"
    )

    print(
        " ".join(cmd)
    )

    subprocess.run(
        cmd,
        check=True,
        capture_output=True,
        cwd=str(work_dir),
    )


# ============================================================
# MAIN PIPELINE
# ============================================================

def run_pipeline(
    input_video: str,
    work_dir: str,
    output_path: str,
    progress_cb: ProgressCB,
    subtitle_style: Optional[dict] = None,
    censor_mode: str = "beep",
) -> list[Detection]:

    censor_mode = (
        censor_mode
        .strip()
        .lower()
    )

    if censor_mode not in {
        "beep",
        "mute",
        "subtitles",
    }:
        raise ValueError(
            f"Invalid censor mode: "
            f"{censor_mode}"
        )

    print(
        "Pipeline censor mode:",
        censor_mode,
    )

    work = Path(
        work_dir
    )

    work.mkdir(
        parents=True,
        exist_ok=True,
    )

    audio_wav = str(
        work
        / "audio.wav"
    )

    censored_audio = str(
        work
        / "censored_audio.m4a"
    )

    censored_video_noaudio = str(
        work
        / "censored_video.mp4"
    )

    subtitle_srt = str(
        work
        / "subtitles.srt"
    )

    # ========================================================
    # 1. EXTRACT AUDIO
    # ========================================================

    progress_cb(
        5,
        "Extracting audio...",
    )

    _extract_audio(
        input_video,
        audio_wav,
    )

    # ========================================================
    # 2. TRANSCRIPTION
    # ========================================================

    progress_cb(
        15,
        "Transcribing speech...",
    )

    words = transcribe_words(
        audio_wav
    )

    print(
        "WORDS COUNT:",
        len(words),
    )

    # ========================================================
    # 3. PROFANITY DETECTION
    # ========================================================

    progress_cb(
        35,
        "Detecting offensive language...",
    )

    detections = find_profanity(
        words
    )

    print(
        "DETECTIONS:",
        len(detections),
    )

    # ========================================================
    # 4. CREATE CENSORED SUBTITLES
    # ========================================================

    progress_cb(
        45,
        "Creating censored subtitles...",
    )

    create_censored_srt(
        words,
        subtitle_srt,
    )

    # ========================================================
    # 5. AUDIO MODE
    # ========================================================

    if censor_mode == "beep":

        progress_cb(
            55,
            "Adding audio beeps...",
        )

        censor_audio(
            input_video,
            detections,
            censored_audio,
            mode="beep",
        )

        audio_for_final_video = (
            censored_audio
        )

    elif censor_mode == "mute":

        progress_cb(
            55,
            "Muting offensive words...",
        )

        censor_audio(
            input_video,
            detections,
            censored_audio,
            mode="mute",
        )

        audio_for_final_video = (
            censored_audio
        )

    else:

        progress_cb(
            55,
            "Keeping original audio...",
        )

        # Important:
        # We use the original video as
        # the audio source.
        #
        # The final mux maps only its
        # audio stream.

        audio_for_final_video = (
            input_video
        )

    # ========================================================
    # 6. VIDEO MODE
    # ========================================================

    if censor_mode in {
        "beep",
        "mute",
    }:

        progress_cb(
            70,
            "Applying mouth blur...",
        )

        censor_video(
            input_video,
            detections,
            censored_video_noaudio,
        )

        video_for_final_video = (
            censored_video_noaudio
        )

    else:

        progress_cb(
            70,
            "Keeping original video...",
        )

        # "Subtitles only"
        # means no mouth blur.

        video_for_final_video = (
            input_video
        )

    # ========================================================
    # 7. FINAL VIDEO
    # ========================================================

    progress_cb(
        95,
        "Finalizing video with subtitles...",
    )

    _mux(
        video_source=(
            video_for_final_video
        ),

        audio_source=(
            audio_for_final_video
        ),

        subtitles_path=(
            subtitle_srt
        ),

        output_path=(
            output_path
        ),

        subtitle_style=(
            subtitle_style
        ),
    )

    progress_cb(
        100,
        "Processing complete.",
    )

    return detections


# ============================================================
# DETECTIONS FOR FRONTEND
# ============================================================

def detections_to_api_shape(
    detections: list[Detection],
) -> list[dict]:

    return [
        {
            "time":
                format_timestamp(
                    detection.start
                ),

            "word":
                detection.word,
        }

        for detection
        in detections
    ]