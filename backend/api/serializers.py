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
        if hasattr(user, 'profile') and user.profile.avatar:
            return f"http://127.0.0.1:8000{user.profile.avatar.url}"
        return None

    def get_bio(self, user):
        return getattr(user.profile, 'bio', '') if hasattr(user, 'profile') else ''


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'title', 'notes', 'amount', 'category', 'date', 'type']

    def create(self, validated_data):
        # Inject the authenticated user from the request context
        user = self.context['request'].user
        return Transaction.objects.create(user=user, **validated_data)
