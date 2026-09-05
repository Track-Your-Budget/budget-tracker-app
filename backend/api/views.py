from rest_framework.decorators import api_view
from django.contrib.auth.models import User
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from datetime import date
from .models import Transaction
from .serializers import TransactionSerializer
import logging
import os
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftGraphOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client, OAuth2Error
from dj_rest_auth.registration.views import SocialLoginView
from rest_framework.permissions import IsAuthenticated
from .serializers import UserSerializer
from django.conf import settings

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

class UserMe(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class TransactionView(APIView):
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
    def get(self, request):
        today = date.today()
        result = []

        for i in range(2, -1, -1):
            month = today.month - i
            year = today.year
            while month <= 0:
                month += 12
                year -= 1

            qs = request.user.transactions.filter(date__year=year, date__month=month)
            income = qs.filter(type='income').aggregate(total=Sum('amount'))['total'] or 0
            expense = qs.filter(type='expense').aggregate(total=Sum('amount'))['total'] or 0

            result.append({
                'month': GERMAN_MONTHS[month - 1],
                'income': float(income),
                'expense': float(expense),
            })

        return Response(result, status=status.HTTP_200_OK)

