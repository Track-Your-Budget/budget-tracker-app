"""The welcome dialog's answer: mark the account as greeted and, on request,
fill it with sample transactions."""

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Profile
from ..serializers import OnboardingSerializer
from ..services.sample_data import seed_sample_data


class OnboardingView(APIView):
    """POST /onboarding/ with ``{"sample_data": true|false}``.

    Either way the welcome dialog will not be shown again. Sample data is
    only ever added to an empty account, so a retried request or a second
    tab cannot double the rows; the second call answers 409.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = OnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        created = 0
        with transaction.atomic():
            if serializer.validated_data['sample_data']:
                if request.user.transactions.exists():
                    return Response(
                        {'detail': 'This account already has transactions.'},
                        status=status.HTTP_409_CONFLICT,
                    )
                created = len(seed_sample_data(request.user))

            # The signal creates a profile with every user; the fallback only
            # covers accounts that predate it.
            try:
                profile = request.user.profile
            except Profile.DoesNotExist:
                profile = Profile.objects.create(user=request.user)
            profile.onboarded_at = timezone.now()
            profile.save(update_fields=['onboarded_at'])

        return Response({'created': created}, status=status.HTTP_200_OK)
