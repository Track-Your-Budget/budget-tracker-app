"""Derive category and type of a transaction from its free text.

Backed by TypeSafe's System One model (Jev). It is a classifier, not a text
generator: it answers a fixed set of typed questions about the input and
returns calibrated probabilities. Both questions go out in one request
because the model evaluates them in parallel.

The API key never leaves the server. If it is missing or the call fails, the
caller gets ``None`` and decides what to fall back to; the feature degrades
instead of blocking the user from saving.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import asdict, dataclass
from functools import lru_cache

from django.conf import settings
from django.core.cache import cache
from typesafe_sdk import Choice, Noul, RetryPolicy, TypeSafeClient, TypeSafeError

from ..models import Transaction

logger = logging.getLogger(__name__)

Category = Transaction.Category
Kind = Transaction.TransactionType

# Seconds we are willing to keep the user waiting on the "Save" click.
REQUEST_TIMEOUT = 4.0
# Identical inputs are common ("Rewe", "Miete") and the answer will not
# change, so remember it for a day.
CACHE_TTL = 60 * 60 * 24

# One entry per Category value. Descriptions are what the model reads, so
# they name typical merchants and phrasings rather than restating the label.
CATEGORY_CRITERIA: dict[str, str] = {
    Category.LEBENSMITTEL: (
        'Groceries and food: supermarket, bakery, restaurant, café, takeaway, '
        'delivery (e.g. Rewe, Aldi, Lidl, Edeka, Lieferando, Wocheneinkauf)'
    ),
    Category.TRANSPORT: (
        'Getting around: fuel, car, parking, public transport, train, ticket, '
        'taxi, bike (e.g. Tanken, Deutschlandticket, DB, Uber)'
    ),
    Category.MIETE: (
        'Housing: rent, utilities, electricity, gas, water, internet, phone '
        'contract (e.g. Miete, Nebenkosten, Strom, Vodafone)'
    ),
    Category.GEHALT: (
        'Income from work: salary, wages, freelance payment, bonus '
        '(e.g. Gehalt, Lohn, Honorar, Freelance Projekt)'
    ),
    Category.UNTERHALTUNG: (
        'Leisure and entertainment: streaming, cinema, concerts, games, '
        'going out, hobbies, sports (e.g. Netflix, Spotify, Kino, Fitnessstudio)'
    ),
    Category.VERSICHERUNG: (
        'Insurance premiums of any kind (e.g. Haftpflicht, Kfz-Versicherung, '
        'Krankenversicherung, Hausrat)'
    ),
    Category.SONSTIGES: 'Anything that fits none of the other categories',
}

QUESTIONS = {
    'category': Choice(
        instructions='Which category does this transaction belong to?',
        criteria=CATEGORY_CRITERIA,
    ),
    'is_income': Noul(
        instructions='Is this money the user receives rather than spends?',
        criteria={
            'true': 'Salary, refund, money received from someone, sold something, gift received',
            'false': 'A purchase, bill, fee, subscription or any other payment made by the user',
        },
    ),
}


@dataclass(frozen=True)
class Classification:
    category: str
    type: str
    category_confidence: float
    type_confidence: float
    model: str

    def as_dict(self) -> dict:
        return asdict(self)


@lru_cache(maxsize=1)
def _client() -> TypeSafeClient | None:
    """One client per process; ``None`` when the feature is not configured."""
    api_key = settings.TYPESAFE_API_KEY
    if not api_key:
        logger.warning('TYPESAFE_API_KEY is not set; transaction classification is disabled')
        return None
    return TypeSafeClient(
        api_key=api_key,
        model=settings.TYPESAFE_MODEL,
        timeout=REQUEST_TIMEOUT,
        # One quick retry on 429/5xx, then give up: the user is waiting.
        retry=RetryPolicy(max_retries=1, backoff_initial=0.3, timeout=REQUEST_TIMEOUT * 2),
    )


def _normalise(title: str, notes: str) -> str:
    return ' '.join(f'{title} {notes}'.lower().split())


def _cache_key(text: str) -> str:
    digest = hashlib.sha256(f'{settings.TYPESAFE_MODEL}:{text}'.encode()).hexdigest()
    return f'classify:{digest}'


def classify(title: str, notes: str = '') -> Classification | None:
    """Return the model's verdict for ``title`` + ``notes``, or ``None``.

    ``None`` means "no opinion": key missing, network trouble, rate limit or
    an unexpected answer. Every such case is logged once at WARNING so it
    shows up in the pod log without a stack trace per request.
    """
    client = _client()
    if client is None:
        return None

    text = _normalise(title, notes)
    if not text:
        return None

    key = _cache_key(text)
    cached = cache.get(key)
    if cached is not None:
        return Classification(**cached)

    # Lean state on purpose: the guide warns that padding the input with
    # unrelated fields degrades accuracy.
    state = {'title': title.strip(), 'notes': notes.strip()} if notes.strip() else title.strip()

    try:
        response = client.system_one(state=state, questions=QUESTIONS)
    except TypeSafeError as exc:
        logger.warning('Classification failed for %r: %s', title, exc)
        return None

    category_answer = response.answers['category']
    income_answer = response.answers['is_income']
    category = category_answer.choice
    if category not in Category.values:
        # Should be impossible (choice is restricted to our criteria), but a
        # model update must never let an unknown value reach the database.
        logger.warning('Model returned unknown category %r for %r', category, title)
        return None

    p_income = income_answer.noul
    is_income = p_income >= 0.5
    result = Classification(
        category=category,
        type=Kind.INCOME if is_income else Kind.EXPENSE,
        category_confidence=round(category_answer.confidence, 3),
        type_confidence=round(p_income if is_income else 1 - p_income, 3),
        model=response.model,
    )
    cache.set(key, result.as_dict(), CACHE_TTL)
    return result
