from django.urls import path
from dj_rest_auth.jwt_auth import get_refresh_view
from dj_rest_auth.views import LogoutView
from .views import (
    GitHubLogin,
    GoogleLogin,
    HealthView,
    MicrosoftLogin,
    MonthInsightsView,
    MonthlySummaryView,
    OnboardingView,
    TransactionClassifyView,
    TransactionDetailView,
    TransactionView,
    UserMe,
    YearInsightsView,
)

urlpatterns = [
    # Unauthenticated probe target for Kubernetes.
    path('health/', HealthView.as_view(), name='health'),

    # Social login endpoints
    path('google/login/', GoogleLogin.as_view(), name='google_login'),
    path('github/login/', GitHubLogin.as_view(), name='github_login'),
    path('microsoft/login/', MicrosoftLogin.as_view(), name='microsoft_login'),

    path('users/me/', UserMe.as_view(), name='user_detail'),
    # Answer of the welcome dialog; optionally seeds sample transactions.
    path('onboarding/', OnboardingView.as_view(), name='onboarding'),
    # Cookie-aware refresh: reads refresh from httpOnly cookie, rotates, sets new cookie.
    path('token/refresh/', get_refresh_view().as_view(), name='token_refresh'),
    # Blacklists refresh (from cookie) and clears the cookie.
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('transactions/', TransactionView.as_view(), name='transactions'),
    # Must sit before the <int:pk> route only for readability; 'classify' can
    # never match <int:pk> anyway.
    path('transactions/classify/', TransactionClassifyView.as_view(), name='transaction_classify'),
    path('transactions/<int:pk>/', TransactionDetailView.as_view(), name='transaction_detail'),
    path('monthly-summary/', MonthlySummaryView.as_view(), name='monthly_summary'),
    # One month compared with the one before; the insights page.
    path('insights/month/', MonthInsightsView.as_view(), name='month_insights'),
    path('insights/year/', YearInsightsView.as_view(), name='year_insights'),
]