# Run via: python manage.py shell < seed_september_transactions.py
# or paste contents into `python manage.py shell`
from datetime import date
from django.contrib.auth.models import User
from api.models import Transaction

USERNAME = "eduard7"  # change this to the target username

user = User.objects.get(username=USERNAME)

transactions = [
    {"title": "Gehalt September", "notes": "Monatliches Gehalt", "amount": 3200.00, "category": "gehalt", "date": date(2026, 9, 1), "type": "income"},
    {"title": "Miete", "notes": "Miete September", "amount": 950.00, "category": "miete", "date": date(2026, 9, 2), "type": "expense"},
    {"title": "Supermarkt Rewe", "notes": "Wocheneinkauf", "amount": 62.35, "category": "lebensmittel", "date": date(2026, 9, 3), "type": "expense"},
    {"title": "Tankstelle", "notes": "Benzin", "amount": 55.00, "category": "transport", "date": date(2026, 9, 4), "type": "expense"},
    {"title": "Netflix Abo", "notes": "Monatsabo", "amount": 15.99, "category": "unterhaltung", "date": date(2026, 9, 5), "type": "expense"},
    {"title": "Kfz-Versicherung", "notes": "Monatliche Rate", "amount": 45.00, "category": "versicherung", "date": date(2026, 9, 6), "type": "expense"},
    {"title": "Restaurant Besuch", "notes": "Abendessen mit Freunden", "amount": 38.50, "category": "unterhaltung", "date": date(2026, 9, 8), "type": "expense"},
    {"title": "Supermarkt Aldi", "notes": "Wocheneinkauf", "amount": 47.80, "category": "lebensmittel", "date": date(2026, 9, 10), "type": "expense"},
    {"title": "Freelance Projekt", "notes": "Zusatzeinkommen", "amount": 450.00, "category": "gehalt", "date": date(2026, 9, 11), "type": "income"},
    {"title": "Deutschlandticket", "notes": "ÖPNV Monatsticket", "amount": 49.00, "category": "transport", "date": date(2026, 9, 12), "type": "expense"},
    {"title": "Kino", "notes": "Filmabend", "amount": 22.00, "category": "unterhaltung", "date": date(2026, 9, 14), "type": "expense"},
    {"title": "Haftpflichtversicherung", "notes": "Jährliche Rate anteilig", "amount": 12.50, "category": "versicherung", "date": date(2026, 9, 15), "type": "expense"},
    {"title": "Supermarkt Edeka", "notes": "Wocheneinkauf", "amount": 58.20, "category": "lebensmittel", "date": date(2026, 9, 18), "type": "expense"},
    {"title": "Apotheke", "notes": "Medikamente", "amount": 18.90, "category": "sonstiges", "date": date(2026, 9, 20), "type": "expense"},
    {"title": "Geburtstagsgeschenk", "notes": "Geschenk für Freund", "amount": 30.00, "category": "sonstiges", "date": date(2026, 9, 22), "type": "expense"},
]

created = Transaction.objects.bulk_create(
    [Transaction(user=user, **t) for t in transactions]
)
print(f"Created {len(created)} transactions for {user.username}")
