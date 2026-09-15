import uuid
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from .models import LocalAccount

class LocalUser:
    is_authenticated = True
    def __init__(self, user_id):
        self.id = user_id
        self.pk = user_id
    def __str__(self): return str(self.id)

class LocalUserAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        value = request.headers.get('X-User-ID')
        if not value: return None
        try: uid = uuid.UUID(value)
        except ValueError as error: raise AuthenticationFailed('X-User-ID must be a UUID.') from error
        if not LocalAccount.objects.filter(id=uid).exists():
            raise AuthenticationFailed('User session is invalid. Please sign in again.')
        return LocalUser(uid), None
