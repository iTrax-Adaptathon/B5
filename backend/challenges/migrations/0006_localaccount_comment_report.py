from django.db import migrations, models
import uuid

class Migration(migrations.Migration):
    dependencies=[('challenges','0005_challenge_points')]
    operations=[
        migrations.CreateModel(name='LocalAccount',fields=[('id',models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),('email',models.EmailField(max_length=254,unique=True)),('username',models.CharField(max_length=80,unique=True)),('password_hash',models.CharField(max_length=128)),('created_at',models.DateTimeField(auto_now_add=True))],options={'db_table':'local_accounts'}),
        migrations.CreateModel(name='Comment',fields=[('id',models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),('user_id',models.UUIDField()),('text',models.TextField()),('created_at',models.DateTimeField(auto_now_add=True)),('submission',models.ForeignKey(on_delete=models.deletion.CASCADE,related_name='comments',to='challenges.submission'))],options={'db_table':'comments','ordering':['created_at']}),
        migrations.CreateModel(name='Report',fields=[('id',models.UUIDField(default=uuid.uuid4,editable=False,primary_key=True,serialize=False)),('reporter_id',models.UUIDField()),('reason',models.TextField()),('status',models.CharField(choices=[('pending','Pending'),('reviewed','Reviewed'),('resolved','Resolved'),('dismissed','Dismissed')],default='pending',max_length=20)),('created_at',models.DateTimeField(auto_now_add=True)),('submission',models.ForeignKey(on_delete=models.deletion.CASCADE,related_name='reports',to='challenges.submission'))],options={'db_table':'reports','ordering':['-created_at']}),
    ]
