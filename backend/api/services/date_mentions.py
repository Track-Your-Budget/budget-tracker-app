"""Find phrases like "gestern", "4 days ago" or "23th of November" in a quick entry.

Every phrase resolves to a concrete date relative to the user's today. The
regexes only propose; whether a phrase really is the date of the payment
("Geschenk für Mamas Geburtstag am 23. November") is the model's call.
Transactions record the past, so a day without a year is its latest
occurrence that is not in the future.
"""

from __future__ import annotations

import re
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass(frozen=True)
class DateCandidate:
    value: date
    # As typed ("vor 4 Tagen"); shown to the model and cut from the title.
    raw: str
    start: int
    end: int


WEEKDAYS = {
    'monday': 0, 'montag': 0,
    'tuesday': 1, 'dienstag': 1,
    'wednesday': 2, 'mittwoch': 2,
    'thursday': 3, 'donnerstag': 3,
    'friday': 4, 'freitag': 4,
    'saturday': 5, 'samstag': 5, 'sonnabend': 5,
    'sunday': 6, 'sonntag': 6,
}  # fmt: skip

MONTHS = {
    'january': 1, 'januar': 1, 'jan': 1,
    'february': 2, 'februar': 2, 'feb': 2,
    'march': 3, 'märz': 3, 'maerz': 3, 'mar': 3, 'mär': 3,
    'april': 4, 'apr': 4,
    'may': 5, 'mai': 5,
    'june': 6, 'juni': 6, 'jun': 6,
    'july': 7, 'juli': 7, 'jul': 7,
    'august': 8, 'aug': 8,
    'september': 9, 'sept': 9, 'sep': 9,
    'october': 10, 'oktober': 10, 'oct': 10, 'okt': 10,
    'november': 11, 'nov': 11,
    'december': 12, 'dezember': 12, 'dec': 12, 'dez': 12,
}  # fmt: skip

NUMBER_WORDS = {
    'a': 1, 'an': 1, 'one': 1, 'ein': 1, 'einem': 1, 'einer': 1,
    'two': 2, 'zwei': 2, 'three': 3, 'drei': 3, 'four': 4, 'vier': 4,
    'five': 5, 'fünf': 5, 'six': 6, 'sechs': 6, 'seven': 7, 'sieben': 7,
}  # fmt: skip

RELATIVE_DAYS = {
    'the day before yesterday': 2, 'day before yesterday': 2, 'vorgestern': 2,
    'yesterday': 1, 'gestern': 1,
    'today': 0, 'heute': 0,
}  # fmt: skip


def _alternation(words) -> str:
    # Longest first, so "november" wins over "nov".
    return '|'.join(sorted(map(re.escape, words), key=len, reverse=True))


_MONTH = rf'(?P<month>{_alternation(MONTHS)})\.?'
_COUNT = rf'(?P<count>\d{{1,3}}|{_alternation(NUMBER_WORDS)})'
_YEAR = r'(?P<year>\d{4})'


def _day_in_past(today: date, month: int, day: int, year: int | None) -> date | None:
    try:
        if year is not None:
            return date(year, month, day)
        candidate = date(today.year, month, day)
        return candidate if candidate <= today else date(today.year - 1, month, day)
    except ValueError:
        # 30 February and friends.
        return None


def _count(match: re.Match) -> int:
    raw = match.group('count').lower()
    return int(raw) if raw.isdigit() else NUMBER_WORDS[raw]


def _weeks_or_days(match: re.Match) -> timedelta:
    unit = match.group('unit').lower()
    weeks = unit.startswith(('week', 'woche'))
    return timedelta(weeks=_count(match)) if weeks else timedelta(days=_count(match))


def _year(match: re.Match) -> int | None:
    raw = match.group('year')
    if raw is None:
        return None
    # "23.11.25" -> 2025
    return int(raw) + 2000 if len(raw) == 2 else int(raw)


# Most specific first: a later pattern never claims text an earlier one took.
PATTERNS: list[tuple[re.Pattern, Callable[[re.Match, date], date | None]]] = [
    (
        # "23th of November", "am 23. November 2025", "on the 3rd of may"
        re.compile(
            rf'\b(?:(?:on|am)\s+)?(?:the\s+)?(?P<day>\d{{1,2}})(?:st|nd|rd|th|\.)?\s+(?:of\s+)?'
            rf'{_MONTH}(?!\w)(?:\s+{_YEAR})?',
            re.IGNORECASE,
        ),
        lambda m, today: _day_in_past(
            today, MONTHS[m.group('month').lower()], int(m.group('day')), _year(m)
        ),
    ),
    (
        # "November 23", "on Nov 3rd, 2025"
        re.compile(
            rf'\b(?:on\s+)?{_MONTH}\s+(?P<day>\d{{1,2}})(?:st|nd|rd|th)?\b(?:,?\s+{_YEAR})?',
            re.IGNORECASE,
        ),
        lambda m, today: _day_in_past(
            today, MONTHS[m.group('month').lower()], int(m.group('day')), _year(m)
        ),
    ),
    (
        # "23.11." or "23.11.2025"; the trailing dot keeps "23.11" an amount.
        re.compile(
            r'(?<![\d.,])(?:am\s+)?(?P<day>\d{1,2})\.(?P<month>\d{1,2})\.'
            r'(?P<year>\d{4}|\d{2})?(?!\d)',
            re.IGNORECASE,
        ),
        lambda m, today: _day_in_past(today, int(m.group('month')), int(m.group('day')), _year(m)),
    ),
    (
        # "4 days ago", "a week ago"
        re.compile(rf'\b{_COUNT}\s+(?P<unit>days?|weeks?)\s+ago\b', re.IGNORECASE),
        lambda m, today: today - _weeks_or_days(m),
    ),
    (
        # "vor 4 Tagen", "vor einer Woche"
        re.compile(rf'\bvor\s+{_COUNT}\s+(?P<unit>tage?n?|wochen?)\b', re.IGNORECASE),
        lambda m, today: today - _weeks_or_days(m),
    ),
    (
        re.compile(rf'\b(?P<word>{_alternation(RELATIVE_DAYS)})\b', re.IGNORECASE),
        lambda m, today: today - timedelta(days=RELATIVE_DAYS[m.group('word').lower()]),
    ),
    (
        # "last Monday", "am Freitag": the latest one before today.
        re.compile(
            rf'\b(?:(?:last|on|am|letzten|letzte|vergangenen)\s+)?'
            rf'(?P<weekday>{_alternation(WEEKDAYS)})\b',
            re.IGNORECASE,
        ),
        lambda m, today: today
        - timedelta(days=(today.weekday() - WEEKDAYS[m.group('weekday').lower()]) % 7 or 7),
    ),
]


def find_dates(text: str, today: date) -> list[DateCandidate]:
    """Every date phrase in ``text``, in order, one entry per resolved date."""
    found: list[DateCandidate] = []
    for pattern, resolve in PATTERNS:
        for match in pattern.finditer(text):
            if any(match.start() < c.end and c.start < match.end() for c in found):
                continue
            value = resolve(match, today)
            if value is None:
                continue
            found.append(DateCandidate(value, match.group().strip(), match.start(), match.end()))

    # Same date written twice: keep the last phrase, like the amounts do.
    by_value: dict[date, DateCandidate] = {}
    for candidate in sorted(found, key=lambda c: c.start):
        by_value.pop(candidate.value, None)
        by_value[candidate.value] = candidate
    return list(by_value.values())
