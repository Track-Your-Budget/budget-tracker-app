"""Per-month income/expense totals for the dashboard chart."""

from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Transaction
from ..serializers import MonthlySummarySerializer

GERMAN_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

# How many months back the dashboard chart shows, current month included.
SUMMARY_MONTHS = 3

ZERO = Decimal('0.00')


class MonthlySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        result = []

        for offset in range(SUMMARY_MONTHS - 1, -1, -1):
            # Counting in absolute months and splitting back out with divmod
            # handles the year rollover directly, without a borrow loop.
            year, month_index = divmod(today.year * 12 + today.month - 1 - offset, 12)
            month = month_index + 1

            # One conditional aggregate instead of two filtered queries per month.
            totals = request.user.transactions.filter(
                date__year=year, date__month=month
            ).aggregate(
                income=Sum('amount', filter=Q(type=Transaction.TransactionType.INCOME)),
                expense=Sum('amount', filter=Q(type=Transaction.TransactionType.EXPENSE)),
            )

            result.append({
                'month': GERMAN_MONTHS[month_index],
                # Stays Decimal; the serializer decides the representation.
                'income': totals['income'] or ZERO,
                'expense': totals['expense'] or ZERO,
            })

        serializer = MonthlySummarySerializer(result, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
