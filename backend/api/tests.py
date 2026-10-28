"""Tests for the transaction classifier endpoint and service.

The TypeSafe client is always mocked: CI must never call the paid API, and
the tests describe our contract (fallback, caching, type mapping), not the
model's opinions.
"""

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from api.services import classifier
from api.services.classifier import Classification, classify
from api.services.date_mentions import find_dates
from api.services.quick_entry import (
    NO_DATE,
    find_amounts,
    find_words,
    parse_quick_entry,
    strip_spans,
)


def fake_response(
    category='lebensmittel',
    confidence=0.91,
    p_income=0.03,
    model='jev-test',
    amount=None,
    date=None,
):
    """Mimic SystemOneResponse closely enough for classify()."""
    answers = {
        'category': SimpleNamespace(choice=category, confidence=confidence),
        'is_income': SimpleNamespace(noul=p_income),
    }
    if amount is not None:
        answers['amount'] = SimpleNamespace(choice=amount, confidence=0.88)
    if date is not None:
        answers['date'] = SimpleNamespace(choice=date, confidence=0.77)
    return SimpleNamespace(model=model, answers=answers)


# Reference day for the parser tests, a Tuesday.
TODAY = date(2026, 10, 27)


class FakeClient:
    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.calls = 0
        self.questions = None

    def system_one(self, state, questions):
        self.calls += 1
        self.questions = questions
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

    def test_amount_question_only_with_options(self):
        client = FakeClient(fake_response())
        with patch.object(classifier, '_client', return_value=client):
            classify('Rewe')
        self.assertNotIn('amount', client.questions)

    def test_amount_choice_is_returned(self):
        options = {'800.00': '"800" (800.00 €)', '2.00': '"2" (2.00 €)'}
        client = FakeClient(fake_response('miete', amount='800.00'))
        with patch.object(classifier, '_client', return_value=client):
            result = classify('Miete 800 für 2 Monate', amount_options=options)
        self.assertEqual(client.questions['amount'].criteria, options)
        self.assertEqual((result.amount, result.amount_confidence), ('800.00', 0.88))

    def test_date_choice_is_returned(self):
        options = {'2026-10-26': '"gestern"', NO_DATE: 'no date'}
        client = FakeClient(fake_response(date='2026-10-26'))
        with patch.object(classifier, '_client', return_value=client):
            result = classify('Rewe gestern', date_options=options)
        self.assertNotIn('amount', client.questions)
        self.assertEqual((result.date, result.date_confidence), ('2026-10-26', 0.77))

    def test_same_text_with_other_date_options_is_asked_again(self):
        # "gestern" means another day tomorrow; a cached answer would be stale.
        client = FakeClient(fake_response(date=NO_DATE))
        with patch.object(classifier, '_client', return_value=client):
            classify('Rewe gestern', date_options={'2026-10-26': 'x', NO_DATE: 'y'})
            classify('Rewe gestern', date_options={'2026-10-27': 'x', NO_DATE: 'y'})
        self.assertEqual(client.calls, 2)

    def test_unknown_amount_choice_is_rejected(self):
        options = {'800.00': '"800"', '2.00': '"2"'}
        client = FakeClient(fake_response('miete', amount='5.00'))
        with patch.object(classifier, '_client', return_value=client):
            self.assertIsNone(classify('Miete 800 für 2 Monate', amount_options=options))


class ClassifyEndpointTests(APITestCase):
    url = reverse('transaction_classify')

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user('alice', password='x')
        self.client.force_authenticate(self.user)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(self.url, {'title': 'Rewe'}).status_code, 401)

    def test_text_is_required(self):
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, 400)
        self.assertIn('text', response.data)

    def test_text_without_amount_is_rejected(self):
        with patch('api.services.quick_entry.classify') as mocked:
            response = self.client.post(self.url, {'text': 'Rewe'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('text', response.data)
        mocked.assert_not_called()

    def test_amount_without_title_is_rejected(self):
        response = self.client.post(self.url, {'text': '23,50 €'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('text', response.data)

    def test_returns_parsed_entry_and_model_verdict(self):
        verdict = Classification('lebensmittel', 'expense', 0.91, 0.97, 'jev-test')
        with patch('api.services.quick_entry.classify', return_value=verdict) as mocked:
            response = self.client.post(self.url, {'text': 'Rewe 23,50 €'})
        # The amount is stripped before the text reaches the model.
        mocked.assert_called_once_with('Rewe')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                'title': 'Rewe',
                'amount': Decimal('23.50'),
                'date': timezone.localdate(),
                'category': 'lebensmittel',
                'type': 'expense',
                'confidence': {'category': 0.91, 'type': 0.97},
                'source': 'ai',
                'model': 'jev-test',
            },
        )

    def test_lets_model_pick_among_several_amounts(self):
        verdict = Classification(
            'miete', 'expense', 0.9, 0.95, 'jev-test', '800.00', 0.88, title='Miete'
        )
        with patch('api.services.quick_entry.classify', return_value=verdict) as mocked:
            response = self.client.post(self.url, {'text': 'Miete 800 für 2 Monate'})
        # The model sees the full text, both numbers and every word as options.
        mocked.assert_called_once_with(
            'Miete 800 für 2 Monate',
            amount_options={'800.00': '"800" (800.00 €)', '2.00': '"2" (2.00 €)'},
            title_options={'Miete': '"Miete"', 'für': '"für"', 'Monate': '"Monate"'},
        )
        self.assertEqual(response.data['title'], 'Miete')
        self.assertEqual(response.data['amount'], Decimal('800.00'))
        self.assertEqual(response.data['confidence']['amount'], 0.88)

    def test_date_phrase_resolves_against_the_users_today(self):
        verdict = Classification(
            'lebensmittel', 'expense', 0.9, 0.9, 'jev-test', date='2026-10-26', date_confidence=0.8
        )
        with patch('api.services.quick_entry.classify', return_value=verdict) as mocked:
            response = self.client.post(
                self.url, {'text': 'Rewe 23,50 gestern', 'today': '2026-10-27'}
            )
        mocked.assert_called_once_with(
            'Rewe gestern',
            date_options={
                '2026-10-26': '"gestern" (Monday, 26 October 2026)',
                NO_DATE: 'The text does not say on which day the payment happened',
            },
        )
        self.assertEqual(response.data['title'], 'Rewe')
        self.assertEqual(response.data['date'], date(2026, 10, 26))
        self.assertEqual(response.data['confidence']['date'], 0.8)

    def test_description_beside_amount_and_date_is_required(self):
        response = self.client.post(self.url, {'text': 'gestern 23,50'})
        self.assertEqual(response.status_code, 400)
        self.assertIn('text', response.data)

    def test_falls_back_when_model_has_no_opinion(self):
        with patch('api.services.quick_entry.classify', return_value=None):
            response = self.client.post(self.url, {'text': 'Rewe 12'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                'title': 'Rewe',
                'amount': Decimal('12.00'),
                'date': timezone.localdate(),
                'category': 'sonstiges',
                'type': 'expense',
                'confidence': None,
                'source': 'fallback',
            },
        )


class FindAmountsTests(SimpleTestCase):
    def split(self, text):
        """Title and value when ``text`` holds exactly one number."""
        (candidate,) = find_amounts(text)
        return strip_spans(text, candidate), candidate.value

    def test_extracts_amount_in_common_notations(self):
        cases = {
            'Rewe 23,50': ('Rewe', '23.50'),
            'Rewe 23.5': ('Rewe', '23.50'),
            'Gehalt 2.500,00 €': ('Gehalt', '2500.00'),
            'Miete 1.200': ('Miete', '1200.00'),
            '€ 9,99 Netflix': ('Netflix', '9.99'),
            'Tanken 60 EUR': ('Tanken', '60.00'),
            'Miete - 800': ('Miete', '800.00'),
        }
        for text, (title, amount) in cases.items():
            with self.subTest(text=text):
                self.assertEqual(self.split(text), (title, Decimal(amount)))

    def test_finds_every_number_in_order(self):
        values = [c.value for c in find_amounts('Miete 800 für 2 Monate')]
        self.assertEqual(values, [Decimal('800.00'), Decimal('2.00')])

    def test_repeated_value_is_offered_once(self):
        self.assertEqual(len(find_amounts('5 Brötchen für 5')), 1)

    def test_numbers_inside_date_phrases_are_skipped(self):
        text = 'Tanken 60 vor 4 Tagen'
        values = [c.value for c in find_amounts(text, find_dates(text, TODAY))]
        self.assertEqual(values, [Decimal('60.00')])

    def test_date_numbers_count_when_nothing_else_is_left(self):
        text = 'Geschenk für Jan 20'
        values = [c.value for c in find_amounts(text, find_dates(text, TODAY))]
        self.assertEqual(values, [Decimal('20.00')])

    def test_zero_and_missing_amounts_are_ignored(self):
        self.assertEqual(find_amounts('Rewe'), [])
        self.assertEqual(find_amounts('Rewe 0,00'), [])


class FindWordsTests(SimpleTestCase):
    def words(self, text):
        dates = find_dates(text, TODAY)
        return find_words(text, *find_amounts(text, dates), *dates)

    def test_numbers_and_date_phrases_are_not_words(self):
        words = self.words('Rewe Wocheneinkauf 23,50 € vor 4 Tagen')
        self.assertEqual(words, ['Rewe', 'Wocheneinkauf'])

    def test_punctuation_is_trimmed_and_duplicates_dropped(self):
        self.assertEqual(self.words('(Rewe), rewe: H&M 12'), ['Rewe', 'H&M'])



class FindDatesTests(SimpleTestCase):
    def resolve(self, text):
        return [(c.raw, c.value) for c in find_dates(text, TODAY)]

    def test_relative_and_explicit_phrases(self):
        cases = {
            'Rewe yesterday': ('yesterday', date(2026, 10, 26)),
            'Rewe gestern': ('gestern', date(2026, 10, 26)),
            'Kino the day before yesterday': ('the day before yesterday', date(2026, 10, 25)),
            'Kino vorgestern': ('vorgestern', date(2026, 10, 25)),
            'Tanken 4 days ago': ('4 days ago', date(2026, 10, 23)),
            'Tanken vor 4 Tagen': ('vor 4 Tagen', date(2026, 10, 23)),
            'Kaffee vor einer Woche': ('vor einer Woche', date(2026, 10, 20)),
            'Pizza last Friday': ('last Friday', date(2026, 10, 23)),
            'Pizza am Montag': ('am Montag', date(2026, 10, 26)),
            'Bäcker am 25.10.': ('am 25.10.', date(2026, 10, 25)),
            'Gehalt am 23. Oktober': ('am 23. Oktober', date(2026, 10, 23)),
            'Miete October 1st': ('October 1st', date(2026, 10, 1)),
            'Kino 3rd of May 2025': ('3rd of May 2025', date(2025, 5, 3)),
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                self.assertEqual(self.resolve(text), [expected])

    def test_day_without_year_is_never_in_the_future(self):
        self.assertEqual(
            self.resolve('Geschenk 23th of November'), [('23th of November', date(2025, 11, 23))]
        )

    def test_same_weekday_as_today_means_a_week_ago(self):
        # TODAY is a Tuesday.
        self.assertEqual(self.resolve('Kino am Dienstag'), [('am Dienstag', date(2026, 10, 20))])

    def test_decimal_amount_is_not_a_date(self):
        self.assertEqual(self.resolve('Rewe 23.11'), [])

    def test_impossible_day_is_ignored(self):
        self.assertEqual(self.resolve('Rewe 30. Februar'), [])


class ParseQuickEntryTests(SimpleTestCase):
    def parse(self, text, verdict):
        dates = find_dates(text, TODAY)
        with patch('api.services.quick_entry.classify', return_value=verdict) as mocked:
            entry = parse_quick_entry(text, find_amounts(text, dates), dates, TODAY)
        return entry, mocked

    def verdict(self, **picks):
        return Classification('lebensmittel', 'expense', 0.9, 0.9, 'jev-test', **picks)

    def test_single_amount_is_not_shown_to_the_model(self):
        entry, mocked = self.parse('Rewe 23,50', None)
        mocked.assert_called_once_with('Rewe')
        self.assertEqual((entry.title, entry.amount), ('Rewe', Decimal('23.50')))

    def test_no_date_phrase_means_today(self):
        entry, _ = self.parse('Rewe 23,50', None)
        self.assertEqual(entry.date, TODAY)

    def test_model_choice_decides_the_amount(self):
        entry, _ = self.parse('2x Kaffee 7,80', self.verdict(amount='7.80', amount_confidence=0.8))
        # "2x" holds an amount candidate, so "Kaffee" is the only title word.
        self.assertEqual((entry.title, entry.amount), ('Kaffee', Decimal('7.80')))

    def test_model_picks_the_title_word(self):
        entry, mocked = self.parse(
            'Rewe Wocheneinkauf 23,50', self.verdict(title='Rewe', title_confidence=0.9)
        )
        mocked.assert_called_once_with(
            'Rewe Wocheneinkauf',
            title_options={'Rewe': '"Rewe"', 'Wocheneinkauf': '"Wocheneinkauf"'},
        )
        self.assertEqual(entry.title, 'Rewe')

    def test_whole_rest_is_the_title_without_model(self):
        entry, _ = self.parse('Rewe Wocheneinkauf 23,50 gestern', None)
        self.assertEqual(entry.title, 'Rewe Wocheneinkauf')

    def test_last_number_wins_without_model(self):
        entry, _ = self.parse('Miete 800 für 2 Monate', None)
        self.assertEqual((entry.title, entry.amount), ('Miete 800 für Monate', Decimal('2.00')))

    def test_model_choice_decides_the_date(self):
        verdict = self.verdict(date='2026-10-26', date_confidence=0.9)
        entry, _ = self.parse('Rewe 23,50 gestern', verdict)
        self.assertEqual((entry.title, entry.date), ('Rewe', date(2026, 10, 26)))

    def test_model_can_reject_the_date_phrase(self):
        # The birthday is not when the gift was paid.
        verdict = self.verdict(date=NO_DATE, date_confidence=0.9, title='Geschenk')
        entry, _ = self.parse('Geschenk Geburtstag 23. Oktober 30 €', verdict)
        self.assertEqual((entry.title, entry.date), ('Geschenk', TODAY))

    def test_date_phrase_is_trusted_without_model(self):
        entry, _ = self.parse('Tanken 60 vor 4 Tagen', None)
        self.assertEqual((entry.title, entry.date), ('Tanken', date(2026, 10, 23)))
