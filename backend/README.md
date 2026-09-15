# Challenge Platform API

This Django REST API stores heterogeneous challenge submissions in JSON fields. It uses SQLite by default and keeps scoring in a separate service module so request handling stays independent from business rules.

## Local setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py runserver
```

The API is available at `http://127.0.0.1:8000/api/`. The frontend can target it with `VITE_API_URL`.

## Dynamic submissions

Create a challenge with a schema such as:

```json
{
	"title": "Run a 5K",
	"difficulty": 3,
	"scoring_method": "numeric_threshold",
	"submission_schema": {
		"type": "object",
		"properties": {
			"distance_km": {"type": "number"},
			"notes": {"type": "string"}
		},
		"required": ["distance_km"],
		"additionalProperties": false
	}
}
```

The main endpoints are `POST /api/challenges/`, `POST /api/challenges/<id>/join/`,
`POST /api/challenges/<id>/submit/`, `POST /api/peer-reviews/`, and
`GET /api/leaderboard/<challenge-id>/`. Submission payloads are validated against
the stored schema by the server before they are saved.

## Fairness defenses

- Submissions, reviews, and votes use separate per-user/IP DRF throttles.
- New submissions receive randomized review assignments. Reviewers can only access
	assigned submissions, and assignment responses contain no author profile fields.
- `AuditEvent` stores event type, timestamp, salted IP hash, optional device-fingerprint
	hash, and minimal metadata. Raw IP addresses and raw fingerprint values are not stored.
- `challenges.tasks.detect_anomalies` runs every five minutes through Celery Beat and
	creates `AnomalyFlag` records for manual audit. It detects vote bursts, new-account
	vote bursts, and reciprocal review patterns without auto-banning users.
- Open anomaly flags reduce the reviewer's `reviewer_trust_weight`, and that snapshot is
	used by the scoring service when calculating the Merit Score.

Run workers in development with a Redis broker:

```bash
celery -A config worker --loglevel=INFO
celery -A config beat --loglevel=INFO
```