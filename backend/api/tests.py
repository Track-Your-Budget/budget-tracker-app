"""Tests for the transaction classifier endpoint and service.

The TypeSafe client is always mocked: CI must never call the paid API, and
the tests describe our contract (fallback, caching, type mapping), not the
model's opinions.
"""

from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APITestCase

from api.services import classifier
from api.services.classifier import Classification, classify


def fake_response(category='lebensmittel', confidence=0.91, p_income=0.03, model='jev-test'):
    """Mimic SystemOneResponse closely enough for classify()."""
    return SimpleNamespace(
        model=model,
        answers={
            'category': SimpleNamespace(choice=category, confidence=confidence),
            'is_income': SimpleNamespace(noul=p_income),
        },
    )


class FakeClient:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.calls = 0

    def system_one(self, state, questions):
        self.calls += 1
        if self.error:
            raise self.error
        return self.response


class ClassifyServiceTests(APITestCase):
    def setUp(self):
        cache.clear()
        classifier._client.cache_clear()

    def test_returns_none_without_client(self):
        with patch.object(classifier, '_client', return_value=None):
            self.assertIsNone(classify('Rewe'))

    def test_maps_answers_to_classification(self):
        client = FakeClient(fake_response('transport', 0.8, p_income=0.1))
        with patch.object(classifier, '_client', return_value=client):
            result = classify('Tanken', 'Benzin')
        self.assertEqual(
            result,
            Classification(
                category='transport',
                type='expense',
                category_confidence=0.8,
                type_confidence=0.9,
                model='jev-test',
            ),
        )

    def test_income_when_probability_at_least_half(self):
        client = FakeClient(fake_response('gehalt', 0.95, p_income=0.5))
        with patch.object(classifier, '_client', return_value=client):
            result = classify('Gehalt')
        self.assertEqual(result.type, 'income')
        self.assertEqual(result.type_confidence, 0.5)

    def test_unknown_category_is_rejected(self):
        client = FakeClient(fake_response('crypto'))
        with patch.object(classifier, '_client', return_value=client):
            self.assertIsNone(classify('Bitcoin'))

    def test_api_error_returns_none(self):
        client = FakeClient(error=classifier.TypeSafeError('boom'))
        with patch.object(classifier, '_client', return_value=client):
            self.assertIsNone(classify('Rewe'))

    def test_identical_input_is_served_from_cache(self):
        client = FakeClient(fake_response())
        with patch.object(classifier, '_client', return_value=client):
            first = classify('Rewe', 'Wocheneinkauf')
            second = classify('  rewe   WOCHENEINKAUF ')
        self.assertEqual(first, second)
        self.assertEqual(client.calls, 1)

    def test_blank_input_is_not_sent(self):
        client = FakeClient(fake_response())
        with patch.object(classifier, '_client', return_value=client):
            self.assertIsNone(classify('   ', ''))
        self.assertEqual(client.calls, 0)


class ClassifyEndpointTests(APITestCase):
    url = reverse('transaction_classify')

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('alice', password='x')
        self.client.force_authenticate(self.user)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.url, {'title': 'Rewe'}).status_code, 401)

    def test_title_is_required(self):
        response = self.client.post(self.url, {'notes': 'x'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('title', response.data)

    def test_returns_model_verdict(self):
        verdict = Classification('lebensmittel', 'expense', 0.91, 0.97, 'jev-test')
        with patch('api.views.classify.classify', return_value=verdict) as mocked:
            response = self.client.post(self.url, {'title': 'Rewe', 'notes': 'Wocheneinkauf'})
        mocked.assert_called_once_with(title='Rewe', notes='Wocheneinkauf')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                'category': 'lebensmittel',
                'type': 'expense',
                'confidence': {'category': 0.91, 'type': 0.97},
                'source': 'ai',
                'model': 'jev-test',
            },
        )

    def test_falls_back_when_model_has_no_opinion(self):
        with patch('api.views.classify.classify', return_value=None):
            response = self.client.post(self.url, {'title': 'Rewe'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {'category': 'sonstiges', 'type': 'expense', 'confidence': None, 'source': 'fallback'},
        )
