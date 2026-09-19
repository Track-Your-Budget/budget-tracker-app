"""List, create, update and delete the signed-in user's transactions."""

from datetime import date

from django.db.models import Q
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Transaction
from ..serializers import TransactionSerializer

# Upper bound for one page of the transactions list; the SPA asks for 10.
TRANSACTIONS_MAX_LIMIT = 100


class OptionalLimitOffsetPagination(LimitOffsetPagination):
    """Paginate only when the client asks for it.

    With ``default_limit`` unset, ``paginate_queryset`` returns None unless a
    ``?limit=`` param is present, so the dashboard keeps receiving the plain
    array it always did while the transactions page opts into
    ``{count, next, previous, results}`` pages.
    """

    default_limit = None
    max_limit = TRANSACTIONS_MAX_LIMIT


def _parse_iso_date(params, key):
    """Return ``params[key]`` as a date, None if absent, or raise a 400."""
    raw = params.get(key)
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        raise ValidationError({key: 'Use the format YYYY-MM-DD.'})


class TransactionView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = OptionalLimitOffsetPagination

    def filter_queryset(self, request):
        """Apply the optional query-string filters of the transactions page.

        ``category`` / ``type`` match exactly, ``search`` is a case-insensitive
        substring match on title or notes, ``date_from`` / ``date_to`` are
        inclusive ISO dates. Unknown category/type values simply match nothing.
        """
        params = request.query_params
        # Explicit secondary key so limit/offset pages never overlap or skip
        # rows that share the same date.
        queryset = request.user.transactions.order_by('-date', '-id')

        if category := params.get('category'):
            queryset = queryset.filter(category=category)

        if tx_type := params.get('type'):
            queryset = queryset.filter(type=tx_type)

        if search := params.get('search', '').strip():
            queryset = queryset.filter(Q(title__icontains=search) | Q(notes__icontains=search))

        if date_from := _parse_iso_date(params, 'date_from'):
            queryset = queryset.filter(date__gte=date_from)

        if date_to := _parse_iso_date(params, 'date_to'):
            queryset = queryset.filter(date__lte=date_to)

        return queryset

    def get(self, request):
        transactions = self.filter_queryset(request)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(transactions, request, view=self)
        if page is not None:
            serializer = TransactionSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = TransactionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, request, pk):
        try:
            return request.user.transactions.get(pk=pk)
        except Transaction.DoesNotExist:
            return None

    def put(self, request, pk):
        transaction = self.get_object(request, pk)
        if transaction is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = TransactionSerializer(
            transaction, data=request.data, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        transaction = self.get_object(request, pk)
        if transaction is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        transaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
