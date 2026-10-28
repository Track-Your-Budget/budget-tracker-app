"""Turn a one-line quick entry like "Rewe 23,50 gestern" into a transaction.

The regexes only find candidates; the model decides. With several numbers
("Miete 800 für 2 Monate") it picks the amount, with a date phrase it
decides whether that phrase is when the payment happened, and with several
words it picks the one that makes the best title. No date phrase, or none
that fits, means today. A single number is never shown to the model: it
carries no meaning for the category and would make every entry a cache miss.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

from .classifier import Classification, classify
from .date_mentions import DateCandidate

# Key of the date option meaning "the text does not say when".
NO_DATE = 'none'

# German thousands ("1.234,56") or a plain number with "," or "." as decimal
# mark ("23,50", "23.5", "23"). Lookarounds keep us from grabbing the middle
# of a longer number, and the currency marks around it are swallowed so they
# do not end up in the title.
AMOUNT_PATTERN = re.compile(
    r'(?:€\s*)?'
    r'(?<![\d.,])'
    r'(?P<number>\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)'
    r'(?![.,]?\d)'
    r'(?:\s*(?:€|eur(?:o)?\b))?',
    re.IGNORECASE,
)

# Left over around the removed amount, e.g. "Miete - 800" -> "Miete -".
_TRAILING_JUNK = ' \t-–:,;'
# Stripped from both ends of a title word: "(Rewe)," -> "Rewe".
_WORD_PUNCTUATION = _TRAILING_JUNK + '.!?()[]"\'„“”'
_LETTER = re.compile(r'[^\W\d_]')


@dataclass(frozen=True)
class AmountCandidate:
    value: Decimal
    # As typed, currency mark included ("23,50 €"); shown to the model.
    raw: str
    start: int
    end: int


@dataclass(frozen=True)
class QuickEntry:
    title: str
    amount: Decimal
    date: date
    # ``None`` when the model had no opinion; the caller picks defaults.
    classification: Classification | None


def _to_decimal(number: str) -> Decimal | None:
    if ',' in number:
        # German notation: dots group thousands, the comma is the decimal mark.
        number = number.replace('.', '').replace(',', '.')
    elif number.count('.') > 1 or re.fullmatch(r'\d{1,3}(?:\.\d{3})+', number):
        number = number.replace('.', '')
    try:
        return Decimal(number).quantize(Decimal('0.01'))
    except InvalidOperation:
        return None


def find_amounts(text: str, dates: list[DateCandidate] = ()) -> list[AmountCandidate]:
    """Every positive number in ``text``, in order, one entry per value.

    Numbers inside a date phrase ("vor 4 Tagen") are skipped, unless that
    leaves nothing: in "Geschenk für Jan 20" the "date" is a name and the
    20 is the amount. A value written twice keeps its last occurrence, so
    removing it later leaves the earlier mention in the title.
    """
    by_value: dict[Decimal, AmountCandidate] = {}
    for match in AMOUNT_PATTERN.finditer(text):
        value = _to_decimal(match.group('number'))
        if value is None or value <= 0:
            continue
        by_value.pop(value, None)
        by_value[value] = AmountCandidate(value, match.group().strip(), match.start(), match.end())

    candidates = list(by_value.values())
    outside_dates = [c for c in candidates if not any(_overlaps(c, d) for d in dates)]
    return outside_dates or candidates


def _overlaps(a: AmountCandidate | DateCandidate, b: AmountCandidate | DateCandidate) -> bool:
    return a.start < b.end and b.start < a.end


def strip_spans(text: str, *spans: AmountCandidate | DateCandidate) -> str:
    """``text`` without ``spans``: what is left becomes the title."""
    removed = set()
    for span in spans:
        removed.update(range(span.start, span.end))
    rest = ''.join(' ' if i in removed else char for i, char in enumerate(text))
    return ' '.join(rest.split()).strip(_TRAILING_JUNK)


def find_words(text: str, *spans: AmountCandidate | DateCandidate) -> list[str]:
    """Title candidates: every word with a letter in it, outside ``spans``.

    Pass all amount and date candidates: whichever the model picks, their
    words are never the title. Case-insensitive duplicates are offered once.
    """
    words: dict[str, str] = {}
    for match in re.finditer(r'\S+', text):
        if any(match.start() < s.end and s.start < match.end() for s in spans):
            continue
        word = match.group().strip(_WORD_PUNCTUATION)
        if _LETTER.search(word):
            words.setdefault(word.casefold(), word)
    return list(words.values())


def _describe_date(candidate: DateCandidate) -> str:
    return f'"{candidate.raw}" ({candidate.value:%A, %d %B %Y})'


def parse_quick_entry(
    text: str,
    amounts: list[AmountCandidate],
    dates: list[DateCandidate],
    today: date,
) -> QuickEntry:
    """Pick amount and date among the candidates and classify what remains.

    ``amounts`` and ``find_words(text, *amounts, *dates)`` must be
    non-empty; the request serializer has checked both.
    """
    words = find_words(text, *amounts, *dates)
    # What is already decided leaves the text before the model sees it.
    settled = amounts if len(amounts) == 1 else []
    picks = {}
    if len(amounts) > 1:
        # Keys are the plain values so the answer maps back without ambiguity.
        picks['amount_options'] = {str(c.value): f'"{c.raw}" ({c.value} €)' for c in amounts}
    if dates:
        picks['date_options'] = {
            **{c.value.isoformat(): _describe_date(c) for c in dates},
            NO_DATE: 'The text does not say on which day the payment happened',
        }

    if len(words) > 1:
        picks['title_options'] = {word: f'"{word}"' for word in words}

    classification = classify(strip_spans(text, *settled), **picks)

    if len(amounts) == 1:
        amount = amounts[0]
    elif classification is None:
        # No model: the total usually comes last ("2x Kaffee 7,80").
        amount = amounts[-1]
    else:
        amount = next(c for c in amounts if str(c.value) == classification.amount)

    when: DateCandidate | None = None
    if dates and classification is None:
        # No model: the phrases are specific enough to trust ("gestern").
        when = dates[-1]
    elif dates and classification.date != NO_DATE:
        when = next(c for c in dates if c.value.isoformat() == classification.date)

    if len(words) == 1:
        (title,) = words
    elif classification is None:
        # No model: everything that is neither amount nor date.
        title = strip_spans(text, *([amount, when] if when is not None else [amount]))
    else:
        title = classification.title

    return QuickEntry(
        title=title,
        amount=amount.value,
        date=when.value if when is not None else today,
        classification=classification,
    )
