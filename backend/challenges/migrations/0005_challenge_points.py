from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('challenges', '0004_add_difficulty'),
    ]

    operations = [
        migrations.AddField(
            model_name='challenge',
            name='points',
            field=models.PositiveIntegerField(default=100),
        ),
    ]