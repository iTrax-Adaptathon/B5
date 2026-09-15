import os
from pathlib import Path

import dj_database_url
from dotenv import load_dotenv
from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'development-only-change-me')
DEBUG = os.getenv('DJANGO_DEBUG', 'false').lower() == 'true'
ALLOWED_HOSTS = [host.strip() for host in os.getenv('DJANGO_ALLOWED_HOSTS', '127.0.0.1,localhost').split(',') if host.strip()]

INSTALLED_APPS = ['django.contrib.auth', 'django.contrib.contenttypes', 'django.contrib.sessions', 'corsheaders', 'rest_framework', 'challenges']
MIDDLEWARE = ['corsheaders.middleware.CorsMiddleware', 'django.middleware.security.SecurityMiddleware', 'django.contrib.sessions.middleware.SessionMiddleware', 'django.middleware.common.CommonMiddleware']
ROOT_URLCONF = 'config.urls'
TEMPLATES = []
WSGI_APPLICATION = 'config.wsgi.application'
DATABASE_URL = os.getenv('DATABASE_URL')
# For local hackathon runs, the launcher can point Django at a persistent
# per-user SQLite file outside the extracted project directory. This keeps
# accounts, challenges, submissions, and scores when the project ZIP is
# re-extracted or replaced, without changing the application's data model.
FAIRPLAY_DB_PATH = os.getenv('FAIRPLAY_DB_PATH')
if FAIRPLAY_DB_PATH:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': FAIRPLAY_DB_PATH}}
elif DATABASE_URL:
    DATABASES = {'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=not DEBUG)}
else:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': BASE_DIR / 'db.sqlite3'}}
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(',') if origin.strip()]
CORS_ALLOW_HEADERS = (*default_headers, 'x-user-id', 'x-admin-token')
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'challenges.admin_auth.AdminTokenAuthentication',
        'challenges.authentication.LocalUserAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated'],
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute', 'user': '120/minute', 'vote': '50/day',
        'submission': '5/hour', 'peer_review': '20/hour', 'user_ip': '120/hour',
    },
}
AUDIT_HASH_SALT = os.getenv('AUDIT_HASH_SALT', SECRET_KEY)
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@gmail.com').strip().lower()
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'qwerty1234')
ADMIN_TOKEN_MAX_AGE = int(os.getenv('ADMIN_TOKEN_MAX_AGE', '28800'))
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/0')
CELERY_BEAT_SCHEDULE = {
    'detect-anomalies-every-five-minutes': {
        'task': 'challenges.tasks.detect_anomalies',
        'schedule': 300,
    },
}
SCORE_COMMUNITY_CAP = float(os.getenv('SCORE_COMMUNITY_CAP', '10'))
SCORE_CONSISTENCY_BONUS_CAP = float(os.getenv('SCORE_CONSISTENCY_BONUS_CAP', '8'))
AUTO_APPROVE_SUBMISSIONS = os.getenv('AUTO_APPROVE_SUBMISSIONS', 'true').lower() == 'true'
VOTE_DAILY_LIMIT = int(os.getenv('VOTE_DAILY_LIMIT', '50'))
VOTE_CHALLENGE_LIMIT = int(os.getenv('VOTE_CHALLENGE_LIMIT', '10'))