import uuid

from django.test import TestCase, override_settings
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from challenges.models import Challenge, Participation, Submission
from challenges.serializers import SubmissionSerializer
from challenges.services import compute_merit_score


class SubmissionSchemaValidationTests(TestCase):
    def setUp(self):
        self.challenge = Challenge.objects.create(
            creator_id=uuid.uuid4(),
            title='Typed challenge',
            difficulty=3,
            submission_schema={
                'type': 'object',
                'properties': {
                    'distance': {'type': 'number'},
                    'note': {'type': 'string'},
                },
                'required': ['distance'],
                'additionalProperties': False,
            },
            scoring_method=Challenge.ScoringMethod.NUMERIC_THRESHOLD,
        )
        self.participation = Participation.objects.create(user_id=uuid.uuid4(), challenge=self.challenge)

    def test_accepts_payload_matching_dynamic_schema(self):
        serializer = SubmissionSerializer(data={
            'participation': self.participation.pk,
            'payload': {'distance': 12.5, 'note': 'done'},
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_rejects_missing_or_wrong_fields(self):
        serializer = SubmissionSerializer(data={
            'participation': self.participation.pk,
            'payload': {'distance': 'twelve'},
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('payload', serializer.errors)

    def test_scoring_is_delegated_to_service(self):
        submission = Submission.objects.create(
            participation=self.participation,
            payload={'distance': 42},
        )
        compute_merit_score(submission)
        submission.refresh_from_db()
        self.assertEqual(float(submission.merit_score), 42.0)


@override_settings(ADMIN_USERNAME='admin', ADMIN_PASSWORD='test-password')
class AdminAccessTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.normal_user_id = uuid.uuid4()
        self.challenge_payload = {
            'title': 'Admin challenge',
            'category': 'Coding',
            'difficulty_tier': 'Medium',
            'submission_type': 'numeric',
            'evaluation_criteria': {},
        }

    def test_normal_user_cannot_create_challenge(self):
        response = self.client.post(
            '/api/challenges/', self.challenge_payload,
            format='json', HTTP_X_USER_ID=str(self.normal_user_id),
        )
        self.assertEqual(response.status_code, 403)

    def test_admin_can_login_and_create_challenge(self):
        login = self.client.post('/api/admin/login/', {'username': 'admin', 'password': 'test-password'}, format='json')
        self.assertEqual(login.status_code, 200)
        create = self.client.post(
            '/api/challenges/', self.challenge_payload,
            format='json', HTTP_X_ADMIN_TOKEN=login.data['token'],
        )
        self.assertEqual(create.status_code, 201)

    def test_invalid_admin_login_is_rejected(self):
        response = self.client.post('/api/admin/login/', {'username': 'admin', 'password': 'wrong'}, format='json')
        self.assertEqual(response.status_code, 401)
