"""
Profanity detection over a transcript.

Uses `better-profanity`'s curated wordlist (handles basic leetspeak /
punctuation obfuscation too), matched against normalized word tokens.
Swap in a custom wordlist by calling `profanity.load_censor_words([...])`
if you need domain-specific terms.
"""

import re
from dataclasses import dataclass

from better_profanity import profanity

from .transcribe import Word

profanity.load_censor_words()  # default built-in list


@dataclass
class Detection:
    word: str        # censored display form, e.g. "s***"
    start: float      # seconds
    end: float        # seconds


def _normalize(token: str) -> str:
    return re.sub(r"[^\w']", "", token).lower()


def _censor(token: str) -> str:
    clean = _normalize(token)
    if not clean:
        return token
    return clean[0] + "*" * (len(clean) - 1)


def find_profanity(words: list[Word]) -> list[Detection]:
    detections: list[Detection] = []
    for w in words:
        normalized = _normalize(w.text)
        if normalized and profanity.contains_profanity(normalized):
            detections.append(
                Detection(word=_censor(w.text), start=w.start, end=w.end)
            )
    return detections


def format_timestamp(seconds: float) -> str:
    """e.g. 64.2 -> '1:04' to match the mm:ss shape in BACKEND_INTEGRATION.md"""
    total = int(seconds)
    return f"{total // 60}:{total % 60:02d}"
