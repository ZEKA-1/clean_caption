"""
Speech-to-text with word-level timestamps.

Uses faster-whisper (CTranslate2-based Whisper) which runs fine on CPU.
The model is downloaded once (from Hugging Face) the first time it's
used and then cached on disk — this requires outbound internet access
on whatever machine actually runs the backend.
"""

from dataclasses import dataclass
from functools import lru_cache

from faster_whisper import WhisperModel

# "base" is a good speed/accuracy tradeoff for CPU. Use "small" or "medium"
# for better accuracy if you have the CPU/GPU budget.
MODEL_SIZE = "base"


@dataclass
class Word:
    text: str
    start: float  # seconds
    end: float    # seconds


@lru_cache(maxsize=1)
def _get_model() -> WhisperModel:
    # compute_type="int8" keeps CPU inference fast and low-memory.
    return WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")


def transcribe_words(audio_path: str) -> list[Word]:
    """Return every spoken word in the audio with start/end timestamps."""
    model = _get_model()
    segments, _info = model.transcribe(
        audio_path,
        word_timestamps=True,
        vad_filter=True,  # skip silence, improves timestamp accuracy
    )

    words: list[Word] = []
    for segment in segments:
        for w in segment.words or []:
            words.append(Word(text=w.word.strip(), start=w.start, end=w.end))
    return words
