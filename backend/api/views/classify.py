"""Suggest category and type for a transaction the user is about to save."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from ..models import Transaction
from ..serializers import ClassifyRequestSerializer
from ..services.quick_entry import parse_quick_entry

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
        data = serializer.validated_data

        entry = parse_quick_entry(data['text'], data['amounts'], data['dates'], data['today'])
        # Echoed back so the client saves exactly what was parsed here.
        parsed = {'title': entry.title, 'amount': entry.amount, 'date': entry.date}

        result = entry.classification
        if result is None:
            return Response(
                {**parsed, **FALLBACK, 'confidence': None, 'source': 'fallback'},
                status=status.HTTP_200_OK,
            )

        confidence = {'category': result.category_confidence, 'type': result.type_confidence}
        # Only present when the text held something to choose from.
        for pick in ('amount', 'date'):
            if (value := getattr(result, f'{pick}_confidence')) is not None:
                confidence[pick] = value

        return Response(
            {
                **parsed,
                'category': result.category,
                'type': result.type,
                'confidence': confidence,
                'source': 'ai',
                'model': result.model,
            },
            status=status.HTTP_200_OK,
        )
