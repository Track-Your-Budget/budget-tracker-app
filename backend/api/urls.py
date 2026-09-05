from django.urls import path
from dj_rest_auth.jwt_auth import get_refresh_view
from dj_rest_auth.views import LogoutView
from .views import GoogleLogin, GitHubLogin, MicrosoftLogin, TransactionView, TransactionDetailView, MonthlySummaryView, UserMe

urlpatterns = [
    # Social login endpoints
    path('google/login/', GoogleLogin.as_view(), name='google_login'),
    path('github/login/', GitHubLogin.as_view(), name='github_login'),
    path('microsoft/login/', MicrosoftLogin.as_view(), name='microsoft_login'),

    path('users/me/', UserMe.as_view(), name='user_detail'),
    # Cookie-aware refresh: reads refresh from httpOnly cookie, rotates, sets new cookie.
    path('token/refresh/', get_refresh_view().as_view(), name='token_refresh'),
    # Blacklists refresh (from cookie) and clears the cookie.
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('transactions/', TransactionView.as_view(), name='transactions'),
    path('transactions/<int:pk>/', TransactionDetailView.as_view(), name='transaction_detail'),
    path('monthly-summary/', MonthlySummaryView.as_view(), name='monthly_summary'),
]