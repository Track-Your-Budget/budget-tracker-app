from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """Liveness/readiness target for Kubernetes.

    Unauthenticated on purpose: the probe has no credentials. It only reports
    that the app booted and can answer; it deliberately does not touch the DB,
    so a database blip restarts nothing.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
