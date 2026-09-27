"""Try the transaction classifier from the shell, without the UI.

    python manage.py classify "Rewe Wocheneinkauf"
    python manage.py classify "Gehalt September" --notes "Monatliches Gehalt"
    python manage.py classify --file samples.txt      # one title per line

Prints category, type and the model's confidence for each input, which is the
quickest way to see how the criteria in api/services/classifier.py behave on
real phrasings before tuning them.
"""

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from api.services.classifier import classify


class Command(BaseCommand):
    help = 'Classify one or more transaction titles with the System One model.'

    def add_arguments(self, parser):
        parser.add_argument('title', nargs='?', help='Transaction title to classify')
        parser.add_argument('--notes', default='', help='Optional notes for the single title')
        parser.add_argument('--file', help='Text file with one title per line')

    def handle(self, *args, **options):
        if options['file']:
            lines = Path(options['file']).read_text(encoding='utf-8').splitlines()
            inputs = [(line.strip(), '') for line in lines if line.strip()]
        elif options['title']:
            inputs = [(options['title'], options['notes'])]
        else:
            raise CommandError('Pass a title or --file.')

        self.stdout.write(f'{"title":<40} {"category":<14} {"type":<8} {"cat%":>5} {"type%":>6}')
        for title, notes in inputs:
            result = classify(title, notes)
            if result is None:
                self.stdout.write(f'{title:<40} {self.style.WARNING("no answer (key missing or API error)")}')
                continue
            self.stdout.write(
                f'{title:<40} {result.category:<14} {result.type:<8} '
                f'{result.category_confidence * 100:>4.0f}% {result.type_confidence * 100:>5.0f}%'
            )
