"""Transcribe what the user said into the quick-add dialog."""

from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..serializers import TranscribeRequestSerializer
from ..services.transcriber import transcribe


class TransactionTranscribeView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]
    # Every call costs money upstream; the rate lives in
    # REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'transcribe'

    def post(self, request):
        serializer = TranscribeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        audio = serializer.validated_data['audio']

        text = transcribe(audio.read(), audio.name)
        if text is None:
            return Response(
                {'detail': 'Voice input is unavailable right now.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        print(text)
        return Response({'text': text}, status=status.HTTP_200_OK)
