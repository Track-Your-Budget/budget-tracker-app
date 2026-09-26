"""Fill a user's account with plausible sample transactions.

    python manage.py seed --user alice            # last 3 months
    python manage.py seed --user alice --months 6 --per-month 15
    python manage.py seed --user alice --clear --seed 42

Every month gets the same fixed entries (salary, rent, subscriptions) plus a
random selection of everyday expenses. The current month only receives rows
up to today, so the dashboard looks like a month in progress rather than one
that is already over. Pass --seed for a reproducible data set.
"""

import calendar
import random
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction as db_transaction
from django.utils import timezone

from api.models import Transaction

Category = Transaction.Category
Kind = Transaction.TransactionType

# (title, notes, category, type, min €, max €, day of month)
FIXED_PER_MONTH = [
    ('Gehalt', 'Monatliches Gehalt', Category.GEHALT, Kind.INCOME, 2800, 3600, 1),
    ('Miete', 'Warmmiete', Category.MIETE, Kind.EXPENSE, 850, 1100, 2),
    ('Kfz-Versicherung', 'Monatliche Rate', Category.VERSICHERUNG, Kind.EXPENSE, 40, 70, 5),
    ('Streaming-Abo', 'Monatsabo', Category.UNTERHALTUNG, Kind.EXPENSE, 10, 18, 6),
    ('Deutschlandticket', 'ÖPNV-Monatsticket', Category.TRANSPORT, Kind.EXPENSE, 49, 49, 12),
]

# (title, notes, category, type, min €, max €); day is drawn at random
VARIABLE_POOL = [
    ('Supermarkt', 'Wocheneinkauf', Category.LEBENSMITTEL, Kind.EXPENSE, 35, 95),
    ('Bäckerei', 'Frühstück', Category.LEBENSMITTEL, Kind.EXPENSE, 4, 15),
    ('Drogerie', 'Haushalt', Category.SONSTIGES, Kind.EXPENSE, 10, 45),
    ('Tankstelle', 'Benzin', Category.TRANSPORT, Kind.EXPENSE, 40, 80),
    ('Restaurant', 'Essen gehen', Category.UNTERHALTUNG, Kind.EXPENSE, 20, 65),
    ('Kino', 'Filmabend', Category.UNTERHALTUNG, Kind.EXPENSE, 12, 30),
    ('Apotheke', 'Medikamente', Category.SONSTIGES, Kind.EXPENSE, 8, 40),
    ('Geschenk', 'Geburtstag', Category.SONSTIGES, Kind.EXPENSE, 15, 60),
    ('Haftpflichtversicherung', 'Jahresbeitrag anteilig', Category.VERSICHERUNG, Kind.EXPENSE, 10, 15),
    ('Freelance-Projekt', 'Zusatzeinkommen', Category.GEHALT, Kind.INCOME, 150, 600),
]


def _amount(rng, low, high):
    """Random amount between low and high euros, exact to the cent."""
    return Decimal(rng.randint(int(low * 100), int(high * 100))) / 100


def _months_back(today, count):
    """(year, month) tuples for the last `count` months, oldest first."""
    for offset in range(count - 1, -1, -1):
        year, month_index = divmod(today.year * 12 + today.month - 1 - offset, 12)
        yield year, month_index + 1


class Command(BaseCommand):
    help = 'Create sample transactions for a user (see module docstring).'

    def add_arguments(self, parser):
        parser.add_argument('--user', required=True, help='Username to seed.')
        parser.add_argument('--months', type=int, default=3,
                            help='How many months back to fill, current month included (default 3).')
        parser.add_argument('--per-month', type=int, default=12,
                            help='Random everyday entries per month on top of the fixed ones (default 12).')
        parser.add_argument('--seed', type=int, default=None,
                            help='Seed for the random generator; same seed, same data.')
        parser.add_argument('--clear', action='store_true',
                            help="Delete the user's existing transactions first.")

    def handle(self, *args, **options):
        User = get_user_model()
        try:
            user = User.objects.get(username=options['user'])
        except User.DoesNotExist:
            raise CommandError(f"User '{options['user']}' does not exist.")

        if options['months'] < 1 or options['per_month'] < 0:
            raise CommandError('--months must be >= 1 and --per-month >= 0.')

        rng = random.Random(options['seed'])
        today = timezone.localdate()
        rows = []

        for year, month in _months_back(today, options['months']):
            days_in_month = calendar.monthrange(year, month)[1]
            # The current month stops at today; past months are complete.
            last_day = today.day if (year, month) == (today.year, today.month) else days_in_month

            for title, notes, category, kind, low, high, day in FIXED_PER_MONTH:
                if day > last_day:
                    continue
                rows.append(Transaction(
                    user=user, title=title, notes=notes, category=category, type=kind,
                    amount=_amount(rng, low, high), date=date(year, month, day),
                ))

            for _ in range(options['per_month']):
                title, notes, category, kind, low, high = rng.choice(VARIABLE_POOL)
                rows.append(Transaction(
                    user=user, title=title, notes=notes, category=category, type=kind,
                    amount=_amount(rng, low, high),
                    date=date(year, month, rng.randint(1, last_day)),
                ))

        with db_transaction.atomic():
            deleted = 0
            if options['clear']:
                deleted, _ = user.transactions.all().delete()
            Transaction.objects.bulk_create(rows)

        if deleted:
            self.stdout.write(f'Deleted {deleted} existing transactions.')
        self.stdout.write(self.style.SUCCESS(
            f"Created {len(rows)} transactions for '{user.username}' "
            f"across {options['months']} month(s)."
        ))
