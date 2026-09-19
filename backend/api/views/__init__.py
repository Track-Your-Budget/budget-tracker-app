"""API views, grouped by concern.

Re-exported here so `from api.views import X` keeps working for urls.py,
tests and anything else that predates the split.
"""

from .auth import GitHubLogin, GoogleLogin, MicrosoftLogin, SocialProviderMisconfigured
from .health import HealthView
from .summary import MonthlySummaryView
from .transactions import TransactionDetailView, TransactionView
from .users import UserMe

__all__ = [
    'GitHubLogin',
    'GoogleLogin',
    'HealthView',
    'MicrosoftLogin',
    'MonthlySummaryView',
    'SocialProviderMisconfigured',
    'TransactionDetailView',
    'TransactionView',
    'UserMe',
]
