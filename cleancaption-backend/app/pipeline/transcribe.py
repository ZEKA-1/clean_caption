"""
Speech-to-text with word-level timestamps.
"""

from dataclasses import dataclass
from functools import lru_cache

from faster_whisper import WhisperModel

# Use "tiny" first because it is faster for testing.
# Later you can change it to "base" or "small" for better accuracy.
MODEL_SIZE = "tiny"


@dataclass
class Word:
    text: str
    start: float
    end: float


@lru_cache(maxsize=1)
def _get_model() -> WhisperModel:
    print("Loading Faster-Whisper model...")
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    print("Faster-Whisper model loaded.")
    return model


def transcribe_words(audio_path: str) -> list[Word]:
    print("Starting transcription...")
    print("Audio path:", audio_path)

    model = _get_model()

    segments, _info = model.transcribe(
        audio_path,
        word_timestamps=True,
        vad_filter=True,
    )

    words: list[Word] = []

    print("Reading transcription segments...")

    for segment in segments:
        print("Segment:", segment.start, segment.end, segment.text)

        for w in segment.words or []:
            words.append(
                Word(
                    text=w.word.strip(),
                    start=w.start,
                    end=w.end,
                )
            )

    print("Transcription finished.")
    print("Words found:", len(words))

    return words