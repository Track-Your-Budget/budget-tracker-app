import logging
from datetime import date
from decimal import Decimal

from django.conf import settings
from django.db.models import Q, Sum
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftGraphOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client, OAuth2Error
from dj_rest_auth.registration.views import SocialLoginView

from .models import Transaction
from .serializers import (
    MonthlySummarySerializer,
    TransactionSerializer,
    UserSerializer,
)

logger = logging.getLogger(__name__)


class LoggingOAuth2Client(OAuth2Client):
    """OAuth2Client that logs the raw provider response on failure.

    dj-rest-auth catches OAuth2Error and re-raises a generic ValidationError,
    then DRF's is_valid() re-wraps it again, which drops __cause__. Logging at
    the client layer is the only reliable way to see the real error body.
    """

    def get_access_token(self, code, *args, **kwargs):
        try:
            return super().get_access_token(code, *args, **kwargs)
        except OAuth2Error as exc:
            logger.error("OAuth2 token exchange failed: %s", exc)
            raise


GERMAN_MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

# How many months back the dashboard chart shows, current month included.
SUMMARY_MONTHS = 3

ZERO = Decimal('0.00')


class GoogleLogin(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = settings.SOCIAL_AUTH_REDIRECT_URL
    client_class = OAuth2Client


class GitHubLogin(SocialLoginView):
    adapter_class = GitHubOAuth2Adapter
    callback_url = settings.SOCIAL_AUTH_REDIRECT_URL
    client_class = OAuth2Client


class MicrosoftLogin(SocialLoginView):
    adapter_class = MicrosoftGraphOAuth2Adapter
    callback_url = settings.SOCIAL_AUTH_REDIRECT_URL
    client_class = LoggingOAuth2Client


class HealthView(APIView):
    """Liveness/readiness target for Kubernetes.

    Unauthenticated on purpose — the probe has no credentials. It only reports
    that the app booted and can answer; it deliberately does not touch the DB,
    so a database blip restarts nothing.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)


class UserMe(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)


class TransactionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = request.user.transactions.all()
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
        serializer = TransactionSerializer(transaction, data=request.data, context={'request': request})
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


class MonthlySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = date.today()
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

