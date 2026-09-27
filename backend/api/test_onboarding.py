"""Tests for the welcome flow: the needs_welcome flag on /users/me/ and
POST /onboarding/ with and without sample data."""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import Transaction
from api.services.sample_data import SAMPLE_DAYS, SAMPLE_NOTE, build_sample_transactions


class NeedsWelcomeTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('ada', 'ada@example.com', 'pw')
        self.client.force_authenticate(self.user)

    def needs_welcome(self):
        response = self.client.get(reverse('user_detail'))
        self.assertEqual(response.status_code, 200)
        return response.data['needs_welcome']

    def test_new_user_needs_welcome(self):
        self.assertTrue(self.needs_welcome())

    def test_user_with_transactions_does_not(self):
        Transaction.objects.create(
            user=self.user, title='Rewe', amount=Decimal('10.00'),
            category='lebensmittel', date=date.today(), type='expense',
        )
        self.assertFalse(self.needs_welcome())

    def test_dismissed_user_does_not(self):
        self.client.post(reverse('onboarding'), {'sample_data': False}, format='json')
        self.assertFalse(self.needs_welcome())


class OnboardingViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('ada', 'ada@example.com', 'pw')
        self.client.force_authenticate(self.user)
        self.url = reverse('onboarding')

    def test_dismiss_marks_profile_without_data(self):
        response = self.client.post(self.url, {'sample_data': False}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {'created': 0})
        self.user.profile.refresh_from_db()
        self.assertIsNotNone(self.user.profile.onboarded_at)
        self.assertEqual(self.user.transactions.count(), 0)

    def test_sample_data_fills_the_last_60_days(self):
        response = self.client.post(self.url, {'sample_data': True}, format='json')
        self.assertEqual(response.status_code, 200)
        created = response.data['created']
        rows = self.user.transactions.all()
        self.assertEqual(rows.count(), created)
        # Enough to make the charts and the insights page look lived-in.
        self.assertGreater(created, 30)

        today = date.today()
        earliest = today - timedelta(days=SAMPLE_DAYS)
        for row in rows:
            self.assertTrue(earliest <= row.date <= today, row.date)
            self.assertEqual(row.notes, SAMPLE_NOTE)
            self.assertGreater(row.amount, 0)
        self.assertTrue(rows.filter(type='income').exists())
        self.assertTrue(rows.filter(type='expense').exists())
        self.user.profile.refresh_from_db()
        self.assertIsNotNone(self.user.profile.onboarded_at)

    def test_sample_data_refused_for_account_with_rows(self):
        Transaction.objects.create(
            user=self.user, title='Rewe', amount=Decimal('10.00'),
            category='lebensmittel', date=date.today(), type='expense',
        )
        response = self.client.post(self.url, {'sample_data': True}, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.user.transactions.count(), 1)
        # Refused means nothing changed, the dialog may be shown again.
        self.user.profile.refresh_from_db()
        self.assertIsNone(self.user.profile.onboarded_at)

    def test_second_seed_is_refused(self):
        self.client.post(self.url, {'sample_data': True}, format='json')
        count = self.user.transactions.count()
        response = self.client.post(self.url, {'sample_data': True}, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.user.transactions.count(), count)

    def test_defaults_to_no_sample_data(self):
        response = self.client.post(self.url, {}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['created'], 0)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.post(self.url, {'sample_data': True}, format='json')
        self.assertEqual(response.status_code, 401)


class SampleDataTests(APITestCase):
    def test_deterministic_per_user_and_covers_both_salaries(self):
        user = User.objects.create_user('ada', 'ada@example.com', 'pw')
        today = date(2026, 9, 27)
        first = build_sample_transactions(user, today=today)
        second = build_sample_transactions(user, today=today)
        self.assertEqual(
            [(r.date, r.title, r.amount) for r in first],
            [(r.date, r.title, r.amount) for r in second],
        )
        salaries = sorted(r.date for r in first if r.title == 'Salary')
        # Window is 2026-07-29 .. 2026-09-27: August and September pay days.
        self.assertEqual(salaries, [date(2026, 8, 1), date(2026, 9, 1)])
        self.assertEqual(first, sorted(first, key=lambda r: r.date))

    def test_window_starting_on_the_first_includes_that_day(self):
        user = User.objects.create_user('bob', 'bob@example.com', 'pw')
        # 60 days before 2026-09-30 is 2026-08-01, so August's rent is in.
        rows = build_sample_transactions(user, today=date(2026, 9, 30))
        rents = sorted(r.date for r in rows if r.title == 'Rent')
        self.assertEqual(rents, [date(2026, 8, 1), date(2026, 9, 1)])
