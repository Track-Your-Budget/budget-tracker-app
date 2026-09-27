"""Tests for GET /insights/month/ and GET /insights/year/.

They pin the contract the SPA relies on: which month is compared with
which, that other users' rows never leak in, and the ordering of the
category and top-expense lists.
"""

from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import Transaction
from api.views import insights


def add(user, title, amount, category, day, tx_type='expense'):
    return Transaction.objects.create(
        user=user,
        title=title,
        amount=Decimal(amount),
        category=category,
        date=day,
        type=tx_type,
    )


class MonthInsightsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('ada', 'ada@example.com', 'pw')
        self.other = User.objects.create_user('bob', 'bob@example.com', 'pw')
        self.client.force_authenticate(self.user)
        self.url = reverse('month_insights')

        # September 2026: the month under test.
        add(self.user, 'Gehalt', '3000.00', 'gehalt', date(2026, 9, 1), 'income')
        add(self.user, 'Rewe', '120.50', 'lebensmittel', date(2026, 9, 3))
        add(self.user, 'Aldi', '80.00', 'lebensmittel', date(2026, 9, 10))
        add(self.user, 'Miete', '900.00', 'miete', date(2026, 9, 1))
        add(self.user, 'Tanken', '60.00', 'transport', date(2026, 9, 12))
        add(self.user, 'Kino', '15.00', 'unterhaltung', date(2026, 9, 20))
        add(self.user, 'Zoo', '15.00', 'unterhaltung', date(2026, 9, 21))
        # August 2026: the comparison month, with a category September lacks.
        add(self.user, 'Gehalt', '3000.00', 'gehalt', date(2026, 8, 1), 'income')
        add(self.user, 'Edeka', '150.00', 'lebensmittel', date(2026, 8, 5))
        add(self.user, 'Miete', '900.00', 'miete', date(2026, 8, 1))
        add(self.user, 'Haftpflicht', '45.00', 'versicherung', date(2026, 8, 15))
        # Noise that must not show up: another user, and a month further back.
        add(self.other, 'Rewe', '999.00', 'lebensmittel', date(2026, 9, 3))
        add(self.user, 'Old', '500.00', 'sonstiges', date(2026, 7, 3))

    def get(self, month='2026-09'):
        response = self.client.get(self.url, {'month': month})
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_totals_for_month_and_previous_month(self):
        data = self.get()
        self.assertEqual(data['month'], '2026-09')
        self.assertEqual(
            data['totals'],
            {'income': 3000.0, 'expense': 1190.5, 'balance': 1809.5, 'count': 7},
        )
        self.assertEqual(
            data['previous'],
            {'month': '2026-08', 'income': 3000.0, 'expense': 1095.0, 'balance': 1905.0, 'count': 4},
        )

    def test_categories_sorted_by_current_amount_with_previous(self):
        data = self.get()
        rows = [(r['category'], r['amount'], r['previous_amount']) for r in data['categories']]
        self.assertEqual(
            rows,
            [
                ('miete', 900.0, 900.0),
                ('lebensmittel', 200.5, 150.0),
                ('transport', 60.0, 0.0),
                ('unterhaltung', 30.0, 0.0),
                # Spent last month, nothing this month: kept, at the end.
                ('versicherung', 0.0, 45.0),
            ],
        )

    def test_top_expenses_limited_and_ordered(self):
        data = self.get()
        titles = [row['title'] for row in data['top_expenses']]
        # Six expenses exist, largest first; equal amounts (Kino/Zoo) fall
        # back to the newer date. Only TOP_EXPENSES of them survive.
        ordered = ['Miete', 'Rewe', 'Aldi', 'Tanken', 'Zoo', 'Kino']
        self.assertEqual(titles, ordered[: insights.TOP_EXPENSES])

    def test_empty_month_has_zero_totals(self):
        data = self.get('2027-01')
        self.assertEqual(
            data['totals'], {'income': 0.0, 'expense': 0.0, 'balance': 0.0, 'count': 0}
        )
        self.assertEqual(data['categories'], [])
        self.assertEqual(data['top_expenses'], [])

    def test_january_compares_with_december(self):
        add(self.user, 'Weihnachten', '200.00', 'sonstiges', date(2025, 12, 24))
        data = self.get('2026-01')
        self.assertEqual(data['previous']['month'], '2025-12')
        self.assertEqual(data['previous']['expense'], 200.0)

    def test_defaults_to_current_month(self):
        with patch.object(insights.timezone, 'localdate', return_value=date(2026, 9, 27)):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['month'], '2026-09')
        self.assertEqual(response.data['totals']['count'], 7)

    def test_rejects_malformed_month(self):
        for bad in ['2026-9', '2026-13', '2026-09-01', 'nope']:
            response = self.client.get(self.url, {'month': bad})
            self.assertEqual(response.status_code, 400, bad)
            self.assertIn('month', response.data)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get(self.url, {'month': '2026-09'})
        self.assertEqual(response.status_code, 401)


class YearInsightsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('ada', 'ada@example.com', 'pw')
        self.other = User.objects.create_user('bob', 'bob@example.com', 'pw')
        self.client.force_authenticate(self.user)
        self.url = reverse('year_insights')

        # 2026, three months with data.
        add(self.user, 'Gehalt', '3000.00', 'gehalt', date(2026, 1, 1), 'income')
        add(self.user, 'Miete', '900.00', 'miete', date(2026, 1, 1))
        add(self.user, 'Gehalt', '3000.00', 'gehalt', date(2026, 2, 1), 'income')
        add(self.user, 'Miete', '900.00', 'miete', date(2026, 2, 1))
        add(self.user, 'Rewe', '200.00', 'lebensmittel', date(2026, 2, 14))
        add(self.user, 'Urlaub', '1200.00', 'sonstiges', date(2026, 8, 3))
        # 2025: the comparison year.
        add(self.user, 'Gehalt', '2800.00', 'gehalt', date(2025, 12, 1), 'income')
        add(self.user, 'Miete', '850.00', 'miete', date(2025, 12, 1))
        add(self.user, 'Kino', '20.00', 'unterhaltung', date(2025, 6, 1))
        # Noise: another user.
        add(self.other, 'Miete', '999.00', 'miete', date(2026, 1, 1))

    def get(self, year='2026'):
        response = self.client.get(self.url, {'year': year})
        self.assertEqual(response.status_code, 200, response.data)
        return response.data

    def test_totals_for_year_and_previous_year(self):
        data = self.get()
        self.assertEqual(data['year'], '2026')
        self.assertEqual(
            data['totals'], {'income': 6000.0, 'expense': 3200.0, 'balance': 2800.0, 'count': 6}
        )
        self.assertEqual(
            data['previous'],
            {'year': '2025', 'income': 2800.0, 'expense': 870.0, 'balance': 1930.0, 'count': 3},
        )

    def test_twelve_months_with_zero_fill(self):
        data = self.get()
        months = data['months']
        self.assertEqual([m['month'] for m in months], [f'2026-{i:02d}' for i in range(1, 13)])
        self.assertEqual(
            months[1], {'month': '2026-02', 'income': 3000.0, 'expense': 1100.0, 'balance': 1900.0, 'count': 3}
        )
        self.assertEqual(
            months[7], {'month': '2026-08', 'income': 0.0, 'expense': 1200.0, 'balance': -1200.0, 'count': 1}
        )
        self.assertEqual(months[11]['count'], 0)
        self.assertEqual(months[11]['expense'], 0.0)

    def test_categories_against_previous_year(self):
        data = self.get()
        rows = [(r['category'], r['amount'], r['previous_amount']) for r in data['categories']]
        self.assertEqual(
            rows,
            [
                ('miete', 1800.0, 850.0),
                ('sonstiges', 1200.0, 0.0),
                ('lebensmittel', 200.0, 0.0),
                ('unterhaltung', 0.0, 20.0),
            ],
        )

    def test_top_expenses_of_the_year(self):
        data = self.get()
        self.assertEqual([r['title'] for r in data['top_expenses']], ['Urlaub', 'Miete', 'Miete', 'Rewe'])

    def test_defaults_to_current_year(self):
        with patch.object(insights.timezone, 'localdate', return_value=date(2026, 9, 27)):
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['year'], '2026')

    def test_rejects_malformed_year(self):
        for bad in ['26', '2026-01', 'abcd', '20260']:
            response = self.client.get(self.url, {'year': bad})
            self.assertEqual(response.status_code, 400, bad)
            self.assertIn('year', response.data)
