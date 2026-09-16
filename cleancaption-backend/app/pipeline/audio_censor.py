"""
Audio censoring for CleanCaption.

Modes:
- beep: mute offensive words and add beep sounds
- mute: mute offensive words without beep
"""

import subprocess

from .profanity import Detection


BEEP_FREQUENCY_HZ = 1000

# Small padding around the word
# so the censorship covers it fully.
PAD_SECONDS = 0.05


def _mute_filter(
    detections: list[Detection],
) -> str:

    if not detections:
        return "anull"

    parts = []

    for detection in detections:

        start = max(
            0.0,
            detection.start - PAD_SECONDS,
        )

        end = (
            detection.end
            + PAD_SECONDS
        )

        parts.append(
            (
                "volume="
                f"enable='between(t,"
                f"{start:.3f},"
                f"{end:.3f})':"
                "volume=0"
            )
        )

    return ",".join(parts)


def censor_audio(
    input_video: str,
    detections: list[Detection],
    output_audio: str,
    mode: str = "beep",
) -> None:

    mode = (
        mode
        .strip()
        .lower()
    )

    if mode not in {
        "beep",
        "mute",
    }:
        raise ValueError(
            f"Unsupported audio censor mode: {mode}"
        )

    # ========================================================
    # MUTE MODE
    # ========================================================

    if mode == "mute":

        cmd = [
            "ffmpeg",
            "-y",

            "-i",
            input_video,

            "-af",
            _mute_filter(
                detections
            ),

            "-vn",

            "-c:a",
            "aac",

            "-b:a",
            "192k",

            output_audio,
        ]

        print(
            "Audio censor mode: MUTE"
        )

        subprocess.run(
            cmd,
            check=True,
            capture_output=True,
        )

        return

    # ========================================================
    # BEEP MODE
    # ========================================================

    print(
        "Audio censor mode: BEEP"
    )

    filter_complex_parts = []

    # First mute all detected offensive words.

    filter_complex_parts.append(
        (
            f"[0:a]"
            f"{_mute_filter(detections)}"
            f"[muted]"
        )
    )

    beep_labels = []

    # Create one beep for every detection.

    for index, detection in enumerate(
        detections
    ):

        start = max(
            0.0,
            detection.start - PAD_SECONDS,
        )

        duration = (
            detection.end
            + PAD_SECONDS
            - start
        )

        delay_ms = int(
            start * 1000
        )

        beep_label = (
            f"beep{index}"
        )

        filter_complex_parts.append(
            (
                f"sine="
                f"frequency="
                f"{BEEP_FREQUENCY_HZ}:"
                f"duration="
                f"{duration:.3f}"
                f"[generated{index}];"

                f"[generated{index}]"
                f"adelay="
                f"{delay_ms}|"
                f"{delay_ms}"
                f"[{beep_label}]"
            )
        )

        beep_labels.append(
            f"[{beep_label}]"
        )

    # If offensive words exist,
    # mix the beeps with the muted audio.

    if beep_labels:

        mix_inputs = (
            "[muted]"
            + "".join(
                beep_labels
            )
        )

        number_of_inputs = (
            len(beep_labels)
            + 1
        )

        filter_complex_parts.append(
            (
                f"{mix_inputs}"
                f"amix="
                f"inputs="
                f"{number_of_inputs}:"
                f"duration=first:"
                f"dropout_transition=0"
                f"[aout]"
            )
        )

        final_label = "[aout]"

    else:

        final_label = "[muted]"

    filter_complex = ";".join(
        filter_complex_parts
    )

    cmd = [
        "ffmpeg",
        "-y",

        "-i",
        input_video,

        "-filter_complex",
        filter_complex,

        "-map",
        final_label,

        "-c:a",
        "aac",

        "-b:a",
        "192k",

        output_audio,
    ]

    subprocess.run(
        cmd,
        check=True,
        capture_output=True,
    )