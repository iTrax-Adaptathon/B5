import secrets
import uuid

from django.conf import settings
from django.core import signing
from rest_framework import authentication, permissions
from rest_framework.exceptions import AuthenticationFailed


ADMIN_TOKEN_SALT = 'community-challenge-admin'


class AdminUser:
    is_authenticated = True
    is_admin = True

    def __init__(self, email):
        self.email = email
        self.username = email
        self.id = uuid.uuid5(uuid.NAMESPACE_DNS, f'community-challenge-admin:{email}')
        self.pk = self.id

    def __str__(self):
        return self.username


class AdminTokenAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        token = request.headers.get('X-Admin-Token')
        if not token:
            return None
        try:
            username = signing.loads(token, salt=ADMIN_TOKEN_SALT, max_age=settings.ADMIN_TOKEN_MAX_AGE)
        except signing.BadSignature as error:
            raise AuthenticationFailed('Invalid or expired admin session.') from error
        return AdminUser(username), token


class IsAdmin(permissions.BasePermission):
    message = 'Administrator access is required.'

    def has_permission(self, request, view):
        return bool(getattr(request.user, 'is_admin', False))


def authenticate_admin(email, password):
    email = str(email or '').strip().lower()
    expected_email = settings.ADMIN_EMAIL
    expected_password = settings.ADMIN_PASSWORD
    if not expected_email or not expected_password:
        return None
    if secrets.compare_digest(email, expected_email) and secrets.compare_digest(password, expected_password):
        return signing.dumps(email, salt=ADMIN_TOKEN_SALT)
    return None
