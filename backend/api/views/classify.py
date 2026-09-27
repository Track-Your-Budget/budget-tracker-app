"""Suggest category and type for a transaction the user is about to save."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models import Transaction
from ..serializers import ClassifyRequestSerializer
from ..services.classifier import classify

# What the client gets when the model has no opinion. The row is still
# saveable and the user can correct it in the details dialog.
FALLBACK = {
    'category': Transaction.Category.SONSTIGES,
    'type': Transaction.TransactionType.EXPENSE,
}


class TransactionClassifyView(APIView):
    permission_classes = [IsAuthenticated]
    # Every keystroke-triggered call costs money and latency upstream; the
    # rate lives in REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'classify'

    def post(self, request):
        serializer = ClassifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = classify(**serializer.validated_data)
        if result is None:
            return Response(
                {**FALLBACK, 'confidence': None, 'source': 'fallback'},
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                'category': result.category,
                'type': result.type,
                'confidence': {
                    'category': result.category_confidence,
                    'type': result.type_confidence,
                },
                'source': 'ai',
                'model': result.model,
            },
            status=status.HTTP_200_OK,
        )
