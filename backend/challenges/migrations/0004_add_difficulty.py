from django.db import migrations, models
from django.core.validators import MaxValueValidator, MinValueValidator


class Migration(migrations.Migration):
    dependencies = [
        ('challenges', '0003_vote'),
    ]

    operations = [
        migrations.AddField(
            model_name='challenge',
            name='difficulty',
            field=models.PositiveSmallIntegerField(
                default=3,
                validators=[MinValueValidator(1), MaxValueValidator(5)],
            ),
        ),
    ]