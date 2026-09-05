from django.db import models
from django.contrib.auth.models import User

def profile_path(instance, filename):
    return f"user_{instance.user.id}/{filename}"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    avatar = models.ImageField(default='media/user.png', upload_to=profile_path)
    bio = models.TextField(blank=True)

    def __str__(self):
        return self.user.username


class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        INCOME = 'income', 'Income'
        EXPENSE = 'expense', 'Expense'

    class Category(models.TextChoices):
        GEHALT = 'gehalt', 'Gehalt'
        MIETE = 'miete', 'Miete'
        LEBENSMITTEL = 'lebensmittel', 'Lebensmittel'
        TRANSPORT = 'transport', 'Transport'
        UNTERHALTUNG = 'unterhaltung', 'Unterhaltung'
        VERSICHERUNG = 'versicherung', 'Versicherung'
        SONSTIGES = 'sonstiges', 'Sonstiges'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='transactions')
    title = models.CharField(max_length=255)
    notes = models.TextField(blank=True, default='')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=50, choices=Category.choices)
    date = models.DateField()
    type = models.CharField(max_length=10, choices=TransactionType.choices)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f'{self.user.email} | {self.type} | {self.title} ({self.amount})'

