"""One month at a glance: totals, spending per category and the largest
expenses, each next to the same number for the month before.

The server aggregates, the client interprets. Percentages, deltas and the
sentences on the insights page are derived in the SPA from the raw amounts
returned here, so the API stays language-neutral and every number the user
sees traces back to one Sum() in the database.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Transaction
from ..serializers import MonthInsightsSerializer

INCOME = Transaction.TransactionType.INCOME
EXPENSE = Transaction.TransactionType.EXPENSE

# Rows in the "largest expenses" list.
TOP_EXPENSES = 5

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


def previous_month(first_day):
    """First day of the month before the one starting on ``first_day``."""
    return (first_day - timedelta(days=1)).replace(day=1)


def month_rows(user, first_day):
    return user.transactions.filter(date__year=first_day.year, date__month=first_day.month)


def totals(rows):
    """Income, expense, their difference and the row count, in one query."""
    agg = rows.aggregate(
        income=Sum('amount', filter=Q(type=INCOME)),
        expense=Sum('amount', filter=Q(type=EXPENSE)),
        count=Count('id'),
    )
    income = agg['income'] or ZERO
    expense = agg['expense'] or ZERO
    return {
        'income': income,
        'expense': expense,
        'balance': income - expense,
        'count': agg['count'],
    }


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
