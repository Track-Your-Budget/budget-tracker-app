from datetime import date

from django.contrib.auth.models import User
from allauth.socialaccount.models import SocialApp
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Transaction


class TransactionListFilterTests(TestCase):
    """GET /api/transactions/ with the transactions-page query params."""

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user('alice', password='x')
        other = User.objects.create_user('bob', password='x')

        def tx(title, amount, category, day, type_, notes='', user=None):
            return Transaction.objects.create(
                user=user or cls.user, title=title, notes=notes, amount=amount,
                category=category, date=day, type=type_,
            )

        # 12 rows for alice, spread over three months, newest first by date.
        cls.rows = []
        for i in range(12):
            month = 9 - (i // 5)  # 5 in Sep, 5 in Aug, 2 in Jul
            cls.rows.append(tx(
                title=f'Posten {i}',
                amount=10 + i,
                category='lebensmittel' if i % 2 else 'miete',
                day=date(2026, month, 28 - i),
                type_='income' if i % 3 == 0 else 'expense',
                notes='Rückerstattung' if i == 4 else '',
            ))
        # Same date as row 0 to prove the (-date, -id) tie-break is stable.
        cls.tie = tx('Gleicher Tag', 1, 'sonstiges', date(2026, 9, 28), 'expense')
        tx('Fremd', 99, 'miete', date(2026, 9, 1), 'expense', user=other)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def get(self, **params):
        response = self.client.get('/api/transactions/', params)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()

    def test_default_is_unpaginated_array_of_own_rows(self):
        data = self.get()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 13)
        self.assertNotIn('Fremd', [t['title'] for t in data])

    def test_limit_returns_page_envelope(self):
        page = self.get(limit=10)
        self.assertEqual(set(page), {'count', 'next', 'previous', 'results'})
        self.assertEqual(page['count'], 13)
        self.assertEqual(len(page['results']), 10)
        self.assertIsNotNone(page['next'])
        self.assertIsNone(page['previous'])

    def test_pages_do_not_overlap_or_skip(self):
        first = self.get(limit=10)['results']
        second = self.get(limit=10, offset=10)
        ids = [t['id'] for t in first] + [t['id'] for t in second['results']]
        self.assertEqual(len(ids), 13)
        self.assertEqual(len(set(ids)), 13)
        self.assertIsNone(second['next'])
        # Newest date first, and within one date the newest row (highest id).
        self.assertEqual(first[0]['id'], self.tie.id)
        self.assertEqual(first[1]['id'], self.rows[0].id)

    def test_category_filter(self):
        page = self.get(limit=10, category='miete')
        self.assertEqual(page['count'], 6)
        self.assertTrue(all(t['category'] == 'miete' for t in page['results']))

    def test_type_filter(self):
        page = self.get(limit=10, type='income')
        self.assertEqual(page['count'], 4)
        self.assertTrue(all(t['type'] == 'income' for t in page['results']))

    def test_search_matches_title_and_notes_case_insensitively(self):
        by_title = self.get(limit=10, search='posten 1')
        self.assertEqual(sorted(t['title'] for t in by_title['results']),
                         ['Posten 1', 'Posten 10', 'Posten 11'])
        by_notes = self.get(limit=10, search='rückerst')
        self.assertEqual([t['title'] for t in by_notes['results']], ['Posten 4'])

    def test_date_range_filters(self):
        current_month = self.get(limit=10, date_from='2026-09-01')
        self.assertEqual(current_month['count'], 6)
        last_two = self.get(limit=10, date_from='2026-08-01')
        self.assertEqual(last_two['count'], 11)
        august_only = self.get(limit=10, date_from='2026-08-01', date_to='2026-08-31')
        self.assertEqual(august_only['count'], 5)

    def test_filters_combine(self):
        page = self.get(limit=10, category='miete', type='expense', date_from='2026-09-01')
        titles = {t['title'] for t in page['results']}
        self.assertEqual(titles, {'Posten 2', 'Posten 4'})

    def test_invalid_date_is_a_400(self):
        response = self.client.get('/api/transactions/', {'date_from': '19.09.2026'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('date_from', response.json())

    def test_limit_is_capped(self):
        # 1000 is clamped to max_limit=100, which still covers all 13 rows.
        page = self.get(limit=1000)
        self.assertEqual(len(page['results']), 13)
        self.assertIsNone(page['next'])

    def test_limit_of_ten_with_period_gives_month_grouped_page(self):
        # The page the SPA renders first: newest 10 rows since 1 Aug.
        page = self.get(limit=10, offset=0, date_from='2026-08-01')
        months = [t['date'][:7] for t in page['results']]
        self.assertEqual(months, sorted(months, reverse=True))
        self.assertEqual(page['count'], 11)
        self.assertIsNotNone(page['next'])


class SocialLoginMisconfiguredTests(TestCase):
    """POST /api/<provider>/login/ without a SocialApp row must fail as JSON."""

    def test_missing_social_app_is_a_json_503(self):
        SocialApp.objects.all().delete()
        response = APIClient().post(
            '/api/github/login/', {'code': 'irrelevant'}, format='json'
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertEqual(
            response.json(),
            {'detail': 'This login provider is not configured on the server.'},
        )
