from rest_framework import serializers
from .models import Transaction
from django.contrib.auth.models import User

class JWTSerializer(serializers.Serializer):
    # Refresh token is delivered via httpOnly cookie (see REST_AUTH), not in the body.
    access = serializers.CharField()

class UserSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'image', 'bio']

    def get_image(self, user):
        if not (hasattr(user, 'profile') and user.profile.avatar):
            return None
        url = user.profile.avatar.url
        # Absolutise against the incoming request so the URL is correct behind
        # whatever host/scheme the deployment happens to use. Callers must pass
        # context={'request': request}; without it we fall back to the relative
        # URL, which the SPA can still resolve when served from the same origin.
        request = self.context.get('request')
        return request.build_absolute_uri(url) if request else url

    def get_bio(self, user):
        return getattr(user.profile, 'bio', '') if hasattr(user, 'profile') else ''


class MonthlySummarySerializer(serializers.Serializer):
    """One bar of the dashboard chart: a month label plus its two totals.

    Amounts stay Decimal all the way through; DecimalField renders them at a
    fixed two places instead of the view hand-casting to float.
    """

    month = serializers.CharField()
    income = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)
    expense = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)


class TransactionSerializer(serializers.ModelSerializer):
    # Return amount as a JSON number instead of a string so the frontend can do arithmetic directly.
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, coerce_to_string=False)

    class Meta:
        model = Transaction
        fields = ['id', 'title', 'notes', 'amount', 'category', 'date', 'type']

    def validate_amount(self, value):
        # Sign comes from `type`; every consumer (summaries, charts,
        # category breakdown) assumes amount itself is always positive.
        if value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def create(self, validated_data):
        # Inject the authenticated user from the request context
        user = self.context['request'].user
        return Transaction.objects.create(user=user, **validated_data)
