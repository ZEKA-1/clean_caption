"""
Audio censoring: mute each detected word's time range and overlay a
beep tone over that same range, using ffmpeg's filter graph directly
(no re-encoding of the original audio beyond the final mixdown).
"""

import subprocess

from .profanity import Detection

BEEP_FREQUENCY_HZ = 1000
# small padding so the beep fully covers fast/clipped words
PAD_SECONDS = 0.05


def _mute_filter(detections: list[Detection]) -> str:
    """Chain of volume=0 filters, each active only during one word."""
    if not detections:
        return "anull"
    parts = []
    for d in detections:
        start = max(0.0, d.start - PAD_SECONDS)
        end = d.end + PAD_SECONDS
        parts.append(f"volume=enable='between(t,{start:.3f},{end:.3f})':volume=0")
    return ",".join(parts)


def censor_audio(input_video: str, detections: list[Detection], output_audio: str) -> None:
    """
    Produce a standalone censored audio track (AAC) at `output_audio`:
    original audio with profane ranges muted, beep tones layered on top.
    """
    filter_complex_parts = []

    # [0:a] -> muted original audio -> [muted]
    filter_complex_parts.append(f"[0:a]{_mute_filter(detections)}[muted]")

    beep_labels = []
    for i, d in enumerate(detections):
        start = max(0.0, d.start - PAD_SECONDS)
        duration = (d.end + PAD_SECONDS) - start
        delay_ms = int(start * 1000)
        label = f"beep{i}"
        filter_complex_parts.append(
            f"sine=frequency={BEEP_FREQUENCY_HZ}:duration={duration:.3f}"
            f"[gen{i}];[gen{i}]adelay={delay_ms}|{delay_ms}[{label}]"
        )
        beep_labels.append(f"[{label}]")

    if beep_labels:
        mix_inputs = "[muted]" + "".join(beep_labels)
        n = len(beep_labels) + 1
        filter_complex_parts.append(
            f"{mix_inputs}amix=inputs={n}:duration=first:dropout_transition=0[aout]"
        )
        final_label = "[aout]"
    else:
        final_label = "[muted]"

    filter_complex = ";".join(filter_complex_parts)

    cmd = [
        "ffmpeg", "-y",
        "-i", input_video,
        "-filter_complex", filter_complex,
        "-map", final_label,
        "-c:a", "aac", "-b:a", "192k",
        output_audio,
    ]
    subprocess.run(cmd, check=True, capture_output=True)
