"""Turn a voice recording from the quick-add dialog into text.

Backed by Whisper on Groq. The API key never leaves the server. If it is
missing or the call fails, the caller gets ``None`` and tells the user to
type instead.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from django.conf import settings
from groq import Groq, GroqError

logger = logging.getLogger(__name__)

# Seconds we are willing to keep the user waiting after they stop recording.
REQUEST_TIMEOUT = 15.0
# Users speak German; naming it skips language detection, which misfires on
# short clips like "Rewe 23,50 gestern".
LANGUAGE = 'de'


@lru_cache(maxsize=1)
def _client() -> Groq | None:
    """One client per process; ``None`` when the feature is not configured."""
    api_key = settings.WHISPER_API_KEY
    if not api_key:
        logger.warning('WHISPER_API_KEY is not set; voice input is disabled')
        return None
    # One quick retry on 429/5xx, then give up: the user is waiting.
    return Groq(api_key=api_key, timeout=REQUEST_TIMEOUT, max_retries=1)


def transcribe(audio: bytes, filename: str) -> str | None:
    """Return the text spoken in ``audio``, or ``None``.

    ``filename`` must carry the extension: Groq picks the decoder from it.
    ``None`` means key missing, network trouble, rate limit or an unexpected
    answer; each case is logged once at WARNING.
    """
    client = _client()
    if client is None:
        return None

    try:
        transcription = client.audio.transcriptions.create(
            file=(filename, audio),
            model=settings.WHISPER_MODEL,
            language=LANGUAGE,
            temperature=0,
            response_format='verbose_json',
        )
    except GroqError as exc:
        logger.warning('Transcription failed: %s', exc)
        return None

    return transcription.text.strip()
