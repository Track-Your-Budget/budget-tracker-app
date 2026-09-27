"""One month or one year at a glance: totals, spending per category and
the largest expenses, each next to the same number for the period before.

The server aggregates, the client interprets. Percentages, deltas and the
sentences on the insights page are derived in the SPA from the raw amounts
returned here, so the API stays language-neutral and every number the user
sees traces back to one Sum() in the database.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Transaction
from ..serializers import MonthInsightsSerializer, YearInsightsSerializer

INCOME = Transaction.TransactionType.INCOME
EXPENSE = Transaction.TransactionType.EXPENSE

# Rows in the "largest expenses" list.
TOP_EXPENSES = 6

ZERO = Decimal('0.00')


def parse_month(raw):
    """``'2026-09'`` → ``date(2026, 9, 1)``; empty → the current month; else 400.

    Appending ``-01`` and letting ``fromisoformat`` validate keeps the parser
    strict (no ``2026-9``, no ``2026-09-15``) without a hand-written regex.
    """
    if not raw:
        return timezone.localdate().replace(day=1)
    try:
        return date.fromisoformat(f'{raw}-01')
    except ValueError:
        raise ValidationError({'month': 'Use the format YYYY-MM.'})


def parse_year(raw):
    """``'2026'`` → ``2026``; empty → the current year; else 400."""
    if not raw:
        return timezone.localdate().year
    if not (raw.isdigit() and len(raw) == 4):
        raise ValidationError({'year': 'Use the format YYYY.'})
    return int(raw)


def previous_month(first_day):
    """First day of the month before the one starting on ``first_day``."""
    return (first_day - timedelta(days=1)).replace(day=1)


def month_rows(user, first_day):
    return user.transactions.filter(date__year=first_day.year, date__month=first_day.month)


def year_rows(user, year):
    return user.transactions.filter(date__year=year)


def _totals_from(income, expense, count):
    income = income or ZERO
    expense = expense or ZERO
    return {'income': income, 'expense': expense, 'balance': income - expense, 'count': count}


def totals(rows):
    """Income, expense, their difference and the row count, in one query."""
    agg = rows.aggregate(
        income=Sum('amount', filter=Q(type=INCOME)),
        expense=Sum('amount', filter=Q(type=EXPENSE)),
        count=Count('id'),
    )
    return _totals_from(agg['income'], agg['expense'], agg['count'])


def totals_per_month(rows, year):
    """Twelve entries, January to December, zeros for months without rows.

    One GROUP BY query; the chart needs every month present so its axis
    does not shift depending on where the data starts.
    """
    grouped = (
        rows.annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(
            income=Sum('amount', filter=Q(type=INCOME)),
            expense=Sum('amount', filter=Q(type=EXPENSE)),
            count=Count('id'),
        )
        .order_by('month')
    )
    by_month = {row['month'].month: row for row in grouped}
    result = []
    for month in range(1, 13):
        row = by_month.get(month)
        entry = (
            _totals_from(row['income'], row['expense'], row['count'])
            if row
            else _totals_from(ZERO, ZERO, 0)
        )
        result.append({'month': f'{year:04d}-{month:02d}', **entry})
    return result


def expense_by_category(rows):
    """``{'lebensmittel': Decimal('412.30'), ...}`` for the expense rows."""
    grouped = rows.filter(type=EXPENSE).values('category').annotate(amount=Sum('amount'))
    return {row['category']: row['amount'] for row in grouped}


def compare_categories(current, previous):
    """Merge both months into one list, largest current amount first.

    A category with spending last month but none this month is kept with
    amount 0: "nothing on entertainment this month" is itself an insight,
    and dropping it would make the comparison silently incomplete.
    """
    categories = set(current) | set(previous)
    rows = [
        {
            'category': category,
            'amount': current.get(category, ZERO),
            'previous_amount': previous.get(category, ZERO),
        }
        for category in categories
    ]
    rows.sort(key=lambda row: (-row['amount'], -row['previous_amount'], row['category']))
    return rows


class MonthInsightsView(APIView):
    """GET /insights/month/?month=YYYY-MM (defaults to the current month)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        first_day = parse_month(request.query_params.get('month'))
        previous_first_day = previous_month(first_day)

        current = month_rows(request.user, first_day)
        previous = month_rows(request.user, previous_first_day)

        top_expenses = (
            current.filter(type=EXPENSE).order_by('-amount', '-date', '-id')[:TOP_EXPENSES]
        )

        payload = {
            'month': first_day.strftime('%Y-%m'),
            'totals': totals(current),
            'previous': {
                'month': previous_first_day.strftime('%Y-%m'),
                **totals(previous),
            },
            'categories': compare_categories(
                expense_by_category(current), expense_by_category(previous)
            ),
            'top_expenses': top_expenses,
        }
        return Response(MonthInsightsSerializer(payload).data, status=status.HTTP_200_OK)


class YearInsightsView(APIView):
    """GET /insights/year/?year=YYYY (defaults to the current year)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        year = parse_year(request.query_params.get('year'))

        current = year_rows(request.user, year)
        previous = year_rows(request.user, year - 1)

        top_expenses = (
            current.filter(type=EXPENSE).order_by('-amount', '-date', '-id')[:TOP_EXPENSES]
        )

        payload = {
            'year': f'{year:04d}',
            'totals': totals(current),
            'previous': {'year': f'{year - 1:04d}', **totals(previous)},
            'months': totals_per_month(current, year),
            'categories': compare_categories(
                expense_by_category(current), expense_by_category(previous)
            ),
            'top_expenses': top_expenses,
        }
        return Response(YearInsightsSerializer(payload).data, status=status.HTTP_200_OK)
