

## 2026-09-15 Follow-up fixes

- **Request throttling:** removed global DRF anonymous/user throttles that were causing normal dashboard/leaderboard fetches to return `Request was throttled`; feature-specific throttles remain available for sensitive actions.
- **Port collision:** B5-1 now runs frontend on `5175` and backend on `8010` with `--strictPort`, preventing another project's Vite/Django process from being mistaken for this project.
- **Sign-in/sign-up:** replaced browser-only fake UUID sessions with backend-persisted local accounts and password verification.
- **Post-auth navigation:** successful sign-in/sign-up now automatically redirects to Dashboard.
- **Leaderboard:** added the missing global leaderboard endpoint and completed challenge leaderboard response fields expected by the frontend.
- **Friend joining:** added an Invite Friends button that copies a challenge-specific link. Friends opening the link land on the challenge and can join it.
- **Participant status/leave:** added compatible status and DELETE leave endpoint.
- **Submissions:** GET compatibility endpoint and `submission_payload`/`payload` normalization.
- **Votes/comments/reports:** added missing compatibility endpoints and persistence.
- **Moderation/verification:** added the missing report and verification API paths expected by the existing UI.


## Follow-up corrections (final integration pass)

### Create Challenge was still admin-only
The previous compatibility pass accidentally retained `IsAdmin` for challenge creation. This conflicted with the frontend feature intended for normal authenticated users. Challenge creation is now available to authenticated users; moderation/admin-only endpoints remain protected.

### Public Leaderboard was still blocked by the React router
The leaderboard API was public, but `App.tsx` redirected every unauthenticated page other than Home/Auth to the Auth page, and `LeaderboardPage.tsx` itself rendered a sign-in gate. Both gates have been removed for the leaderboard.

### Dedicated-port collision handling
`RUN.bat` now checks ports 8010 and 5175 before starting. It fails with a clear message instead of allowing a different process/project to make the B5-1 UI appear to work against the wrong server.

### Base-code rule
These changes are compatibility fixes around the supplied application. The existing challenge model, serializer, scoring service, pages and component structure remain in place.

## Final runtime/startup repair pass

- Added an unauthenticated `/api/health/` endpoint.
- `RUN.bat` now installs frontend dependencies before starting Vite.
- `RUN.bat` now starts Django first and waits for the health endpoint before starting/opening the frontend.
- Added transient network retry logic to the frontend API client to reduce startup race failures.
- Vite is explicitly pinned to `127.0.0.1:5175` with `strictPort: true`.
- B5-1 backend remains isolated on `127.0.0.1:8010`.
- Added `STOP.bat` for stopping stale B5-1 processes on the dedicated ports.
- Removed the leaderboard page's silent error swallowing so backend failures are visible.
- Replaced the frontend no-op score recomputation call with a protected backend endpoint.
- Removed hard-coded `:8000` admin API URLs in favor of `VITE_API_URL`.

## Final startup fault found during Windows test

### Django migration crashed before the server could start

The launcher correctly waited for `/api/health/`, but the backend could never reach that endpoint because `challenges/urls.py` referenced `HealthView` and `RecomputeScoresView` without importing them. Django therefore failed during URL configuration checks, and migrations stopped before the server started.

### Correction

Both view classes are now explicitly imported in `challenges/urls.py`. Python compilation was rerun successfully after the correction.

### Result

The startup sequence is now:

1. Check Python and Node/npm.
2. Create the backend virtual environment if needed.
3. Install frontend dependencies if Vite is missing.
4. Install backend dependencies.
5. Run Django migrations.
6. Start Django on `127.0.0.1:8010`.
7. Wait for `http://127.0.0.1:8010/api/health/` to return HTTP 200.
8. Start Vite on `127.0.0.1:5175` with `--strictPort`.
9. Open only the B5-1 frontend at `http://127.0.0.1:5175/`.

The runner does not use port 5173, so an unrelated Vite project already running on 5173 cannot be mistaken for B5-1.


## Enrollment Flow Fix

The challenge detail page previously treated the creator as a special case and displayed only “You created this challenge”, so the creator had no visible way to enroll. The action bar now allows the creator to enroll as a participant using the existing join endpoint. Other authenticated users continue to see “Join Challenge”.

## Latest functional repair — submission and challenge editing

### Submission: `Method "POST" not allowed`
The challenge submission compatibility route previously handled only GET. The frontend posts submissions to the same `/api/challenges/<id>/submit/` URL, so Django returned HTTP 405. POST handling was added to that compatibility view and now creates the submission using the existing participation/submission/scoring flow.

### Edit Challenge
The challenge detail page now shows **Edit challenge** to the creator. A new edit page loads the existing challenge, allows the creator to update its supported fields, and saves with PATCH. Backend update permission is restricted to the challenge creator, and the serializer translates the frontend's legacy/display fields back into the original database representation.


## Final submission/crash and scoring repair

The post-submission crash was traced to a frontend/backend data-shape mismatch: Django returned `participation` and `payload`, while the React submission card expected `user_id`, `challenge_id`, `submission_payload`, `file_url`, `file_hash`, `raw_performance_score`, and `verification_status`. The submission serializer now exposes the frontend-compatible representation without replacing the underlying model.

The score endpoint was also missing. `/api/submissions/<id>/score/` now returns the complete breakdown consumed by the Score Breakdown component. Challenge leaderboards return the latest score audit breakdown instead of `null`.

The scoring service was replaced with a deterministic, bounded scoring calculation for numeric, quiz, checklist, and peer-reviewed submissions. It records performance, difficulty, completion, verification, consistency, and capped community components in `ScoreAuditLog`. Numeric benchmarks are stored in the challenge schema so the benchmark selected in Create Challenge is available to scoring.

Submission metadata is normalized so proof information and verification status survive the submit/reload cycle. Participation responses now expose `challenge_id`, which fixes Dashboard challenge lookup.


## Persistence and startup-speed correction

The launcher now keeps the local SQLite database in `%LOCALAPPDATA%\FairPlayB5-1\db.sqlite3` instead of tying application data to the extracted project folder. This means accounts, profiles, challenges, participations, submissions, votes, reviews, and scores survive restarting the application and re-extracting an updated project ZIP.

The launcher also installs backend Python dependencies only on the first setup. Later runs reuse the existing virtual environment instead of running `pip install -r requirements.txt` every time. Frontend dependencies are likewise reused once Vite is installed.

**Do not delete `%LOCALAPPDATA%\FairPlayB5-1\db.sqlite3` unless you intentionally want to reset all local application data.**

## 2026-09-15 Submission 400 / resubmission repair
- The submit compatibility endpoint could return a generic HTTP 400 when a participant already had a submission because the original model intentionally enforces one submission per participation.
- The endpoint now treats a second submission as an update to the participant's existing submission instead of exposing the database uniqueness constraint as an unexplained 400.
- Friendly frontend payloads are normalized by the challenge's declared submission type so older challenge records with incomplete JSON schemas remain usable.
- Validation failures now return structured JSON details rather than a generic error message.
- Existing scoring, verification and audit logic is retained and is rerun after an update.


## Submission 400 — stale schema validation (final repair)

The compatibility submission endpoint was normalizing the frontend payload correctly but then passing it through the original dynamic JSON-schema validator. Existing challenges created with older/stale schemas could require fields that the current challenge form never sends, causing valid text submissions such as `{"text":"hehe"}` to return HTTP 400.

The compatibility endpoint now treats the challenge's declared `submission_type` as authoritative, validates/normalizes that supported type itself, and writes the normalized payload directly through the existing `Submission` model. The original `SubmissionSerializer` and schema validator remain available for other API paths. This preserves the base model and avoids breaking old challenges.


## Final Demo Authentication and Submission Approval

- Admin login now accepts **email only** (`admin@gmail.com`) rather than an admin username.
- Default local admin password is `qwerty1234`.
- For the hackathon/demo configuration, `AUTO_APPROVE_SUBMISSIONS=true` is enabled.
- New and resubmitted submissions are immediately marked verified and receive the challenge's full configured points.
- The scoring audit records `demo_auto_approval` so this behavior is explicit rather than silently pretending that peer review occurred.
- This mode is intended for the local hackathon demo; it can be disabled later with `AUTO_APPROVE_SUBMISSIONS=false`.
