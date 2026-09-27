"""Example transactions for a fresh account, so the dashboard and the
insights page have something to show before the user has entered a thing.

The rows cover the last SAMPLE_DAYS days up to today: a monthly rhythm of
salary, rent and subscriptions, groceries every few days, and a handful of
one-offs. Amounts are drawn from a generator seeded with the user's id, so
one account always gets the same set (handy for support and tests) while
two accounts do not look identical. Every row carries SAMPLE_NOTE in its
notes, which is how a later "remove sample data" can find them.
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from ..models import Transaction

Category = Transaction.Category
INCOME = Transaction.TransactionType.INCOME
EXPENSE = Transaction.TransactionType.EXPENSE

SAMPLE_DAYS = 60
SAMPLE_NOTE = 'Sample data'
CENTS = Decimal('0.01')

# (day of month, title, amount, category, type): repeats every month.
MONTHLY = [
    (1, 'Salary', '2850.00', Category.GEHALT, INCOME),
    (1, 'Rent', '890.00', Category.MIETE, EXPENSE),
    (1, 'Deutschlandticket', '58.00', Category.TRANSPORT, EXPENSE),
    (3, 'Electricity', '65.00', Category.MIETE, EXPENSE),
    (5, 'Car insurance', '68.50', Category.VERSICHERUNG, EXPENSE),
    (5, 'Liability insurance', '4.90', Category.VERSICHERUNG, EXPENSE),
    (8, 'Mobile plan', '19.99', Category.MIETE, EXPENSE),
    (10, 'Gym', '29.90', Category.UNTERHALTUNG, EXPENSE),
    (15, 'Netflix', '12.99', Category.UNTERHALTUNG, EXPENSE),
    (20, 'Spotify', '10.99', Category.UNTERHALTUNG, EXPENSE),
]

GROCERY_STORES = ['Rewe', 'Aldi', 'Lidl', 'Edeka', 'Bakery', 'dm']

# (title, min cents, max cents, category): a random subset lands on random days.
ONE_OFFS = [
    ('Cinema', 1200, 1800, Category.UNTERHALTUNG),
    ('Concert tickets', 4500, 9000, Category.UNTERHALTUNG),
    ('Dinner with friends', 2500, 6000, Category.LEBENSMITTEL),
    ('Pizza delivery', 1500, 3200, Category.LEBENSMITTEL),
    ('Pharmacy', 800, 2500, Category.SONSTIGES),
    ('Haircut', 2200, 3500, Category.SONSTIGES),
    ('Amazon order', 1500, 6000, Category.SONSTIGES),
    ('Birthday gift', 2500, 5000, Category.SONSTIGES),
    ('Train ticket', 1900, 4900, Category.TRANSPORT),
    ('Parking', 300, 900, Category.TRANSPORT),
    ('Book', 1200, 2400, Category.UNTERHALTUNG),
    ('Board game', 3000, 4500, Category.UNTERHALTUNG),
]
ONE_OFF_COUNT = 8


def _cents(amount):
    return (Decimal(amount) / 100).quantize(CENTS)


def build_sample_transactions(user, today=None, days=SAMPLE_DAYS):
    """Unsaved Transaction rows for `user`, dated within the last `days` days."""
    today = today or timezone.localdate()
    start = today - timedelta(days=days)
    rng = random.Random(user.pk)
    rows = []

    def add(day, title, amount, category, tx_type=EXPENSE):
        rows.append(
            Transaction(
                user=user,
                title=title,
                notes=SAMPLE_NOTE,
                amount=Decimal(amount).quantize(CENTS),
                category=category,
                date=day,
                type=tx_type,
            )
        )

    # Fixed monthly items for every month the window touches.
    cursor = start.replace(day=1)
    while cursor <= today:
        for day_of_month, title, amount, category, tx_type in MONTHLY:
            day = cursor.replace(day=day_of_month)
            if start <= day <= today:
                add(day, title, amount, category, tx_type)
        cursor = (cursor + timedelta(days=32)).replace(day=1)

    # Groceries every two to four days.
    day = start + timedelta(days=rng.randint(0, 2))
    while day <= today:
        add(day, rng.choice(GROCERY_STORES), _cents(rng.randint(800, 7500)), Category.LEBENSMITTEL)
        day += timedelta(days=rng.randint(2, 4))

    # Fuel roughly every two weeks.
    day = start + timedelta(days=rng.randint(3, 10))
    while day <= today:
        add(day, 'Fuel', _cents(rng.randint(4500, 7000)), Category.TRANSPORT)
        day += timedelta(days=rng.randint(12, 18))

    # A few one-offs on random days.
    for title, low, high, category in rng.sample(ONE_OFFS, k=ONE_OFF_COUNT):
        add(start + timedelta(days=rng.randint(0, days)), title, _cents(rng.randint(low, high)), category)

    # One extra income so the income side is not only salary.
    add(start + timedelta(days=rng.randint(10, days - 5)), 'Freelance project', '350.00', Category.GEHALT, INCOME)

    rows.sort(key=lambda row: row.date)
    return rows


def seed_sample_data(user):
    """Insert the sample rows for `user` in one statement; returns them."""
    return Transaction.objects.bulk_create(build_sample_transactions(user))
