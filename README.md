# B5
## Critical integration repair — September 15, 2026

The earlier runnable builds could display FairPlay but still send API requests to the wrong development server. The root cause was allowing the browser bundle to use an absolute `VITE_API_URL`; a stale Windows/Vite environment variable could override the project's `.env` and cause requests to another application's port, producing HTML/404/`Unexpected token '<'` errors.

This build fixes that at the application level:

- Frontend API calls use the same-origin `/api` path.
- Vite proxies `/api/*` to the isolated Django backend at `127.0.0.1:8010`.
- Authentication uses the same proxy, so signup/signin cannot accidentally hit another Vite app.
- Admin API calls use the same proxy.
- The frontend remains isolated on `127.0.0.1:5175` with `strictPort` enabled.
- The launcher waits for Django's `/api/health/` endpoint before starting Vite.
- A stale `VITE_API_URL` environment variable no longer redirects application requests to another project.
- A missing username-profile endpoint used by the frontend was added.

### Expected local URLs

- FairPlay frontend: `http://127.0.0.1:5175/`
- FairPlay API through frontend proxy: `http://127.0.0.1:5175/api/`
- Direct backend health check: `http://127.0.0.1:8010/api/health/`

Do not use `localhost:5173` for this project; that is the default port commonly used by another Vite application.


## Persistence and startup-speed correction

The launcher now keeps the local SQLite database in `%LOCALAPPDATA%\FairPlayB5-1\db.sqlite3` instead of tying application data to the extracted project folder. This means accounts, profiles, challenges, participations, submissions, votes, reviews, and scores survive restarting the application and re-extracting an updated project ZIP.

The launcher also installs backend Python dependencies only on the first setup. Later runs reuse the existing virtual environment instead of running `pip install -r requirements.txt` every time. Frontend dependencies are likewise reused once Vite is installed.

**Do not delete `%LOCALAPPDATA%\FairPlayB5-1\db.sqlite3` unless you intentionally want to reset all local application data.**

## Submission correction

Submitting proof is idempotent for a participant: if that participant already has a submission, submitting again updates the existing submission instead of creating a second row or exposing a database uniqueness error.

Older challenges with legacy/incomplete submission schemas are normalized according to their declared submission type (text, numeric, quiz, checklist) before validation.
