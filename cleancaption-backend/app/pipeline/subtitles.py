"""
Create SRT subtitles from transcribed words.
Bad words are hidden with stars.
"""

import re

from better_profanity import profanity

from .transcribe import Word

profanity.load_censor_words()


MAX_WORDS_PER_LINE = 7
MAX_SECONDS_PER_LINE = 4.0
MAX_GAP_SECONDS = 0.9


def _normalize(token: str) -> str:
    return re.sub(r"[^\w']", "", token).lower()


def _hide_bad_word(token: str) -> str:
    clean = _normalize(token)

    if clean and profanity.contains_profanity(clean):
        return "*" * max(4, len(clean))

    return token


def _srt_time(seconds: float) -> str:
    milliseconds = int((seconds - int(seconds)) * 1000)
    total_seconds = int(seconds)

    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60

    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


def _line_text(words: list[Word]) -> str:
    clean_words = []

    for word in words:
        clean_words.append(_hide_bad_word(word.text))

    return " ".join(clean_words)


def create_censored_srt(words: list[Word], output_srt: str) -> None:
    """
    Create a subtitle file where bad words are replaced by stars.
    Example:
    Hello this is **** good
    """

    subtitle_blocks = []
    current_line: list[Word] = []

    def flush_line() -> None:
        if not current_line:
            return

        start = current_line[0].start
        end = current_line[-1].end

        if end <= start:
            end = start + 0.5

        text = _line_text(current_line)

        block_number = len(subtitle_blocks) + 1

        subtitle_blocks.append(
            f"{block_number}\n"
            f"{_srt_time(start)} --> {_srt_time(end)}\n"
            f"{text}\n"
        )

    for word in words:
        if not current_line:
            current_line.append(word)
            continue

        gap = word.start - current_line[-1].end
        duration = word.end - current_line[0].start

        should_start_new_line = (
            len(current_line) >= MAX_WORDS_PER_LINE
            or duration >= MAX_SECONDS_PER_LINE
            or gap >= MAX_GAP_SECONDS
        )

        if should_start_new_line:
            flush_line()
            current_line = [word]
        else:
            current_line.append(word)

    flush_line()

    with open(output_srt, "w", encoding="utf-8") as file:
        file.write("\n".join(subtitle_blocks))

    print("Subtitles created:", output_srt)
    print("Subtitle lines:", len(subtitle_blocks))