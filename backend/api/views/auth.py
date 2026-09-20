"""Social login endpoints (Google, GitHub, Microsoft) via dj-rest-auth."""

import logging

from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException
from allauth.socialaccount.models import SocialApp
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.microsoft.views import MicrosoftGraphOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client, OAuth2Error
from dj_rest_auth.registration.views import SocialLoginView

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


class SocialProviderMisconfigured(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'This login provider is not configured on the server.'
    default_code = 'provider_not_configured'


class ConfiguredSocialLoginView(SocialLoginView):
    """SocialLoginView that fails as JSON instead of an HTML debug page.

    allauth's adapter.get_app() raises SocialApp.DoesNotExist when no
    SocialApp row exists for the provider on this site. DRF's default
    exception_handler only formats APIException/Http404/PermissionDenied and
    re-raises anything else, so the swap has to happen *inside*
    handle_exception: raising from dispatch() would already be past DRF's
    try/except and end up as Django's HTML 500 page instead of a JSON 503.
    """

    def handle_exception(self, exc):
        if isinstance(exc, SocialApp.DoesNotExist):
            exc = SocialProviderMisconfigured()
        return super().handle_exception(exc)


class GoogleLogin(ConfiguredSocialLoginView):
    adapter_class = GoogleOAuth2Adapter
    callback_url = settings.SOCIAL_AUTH_REDIRECT_URL
    client_class = OAuth2Client


class GitHubLogin(ConfiguredSocialLoginView):
    adapter_class = GitHubOAuth2Adapter
    callback_url = settings.SOCIAL_AUTH_REDIRECT_URL
    client_class = OAuth2Client


class MicrosoftLogin(ConfiguredSocialLoginView):
    adapter_class = MicrosoftGraphOAuth2Adapter
    callback_url = settings.SOCIAL_AUTH_REDIRECT_URL
    client_class = LoggingOAuth2Client
