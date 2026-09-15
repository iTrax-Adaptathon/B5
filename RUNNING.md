# Running FairPlay B5-1

## Recommended: one-click startup

Double-click **`RUN.bat`**.

The launcher intentionally uses dedicated ports so another project cannot be silently used:

- Frontend: `http://127.0.0.1:5175/`
- Backend health: `http://127.0.0.1:8010/api/health/`

The launcher will **not open the browser until the Django health endpoint returns HTTP 200**. This prevents the common initial `Failed to fetch` race where Vite loads before Django is ready.

If an old B5-1 instance is still running, use **`STOP.bat`** and then run `RUN.bat` again.

## Important

Do not use `http://localhost:5173` for this version. That is a different Vite project/instance. B5-1 is intentionally isolated on port **5175**.

If `RUN.bat` reports that port 8010 or 5175 is occupied, stop the program using that port or use `STOP.bat` if it is an old B5-1 process.

## First run

The launcher automatically:

1. Creates `backend\\venv` if necessary.
2. Installs backend Python dependencies.
3. Installs frontend npm dependencies if Vite is missing.
4. Applies Django migrations.
5. Starts Django.
6. Waits for `/api/health/` to become ready.
7. Starts Vite.
8. Opens only the B5-1 URL on port 5175.

## If you still see `Failed to fetch`

Open this address directly:

`http://127.0.0.1:8010/api/health/`

It must display JSON containing `"status": "ok"`.

If it does not, the problem is in the backend window, not the React frontend. Send the complete backend-window error before changing project files.


## Persistence and startup-speed correction

The launcher now keeps the local SQLite database in `%LOCALAPPDATA%\FairPlayB5-1\db.sqlite3` instead of tying application data to the extracted project folder. This means accounts, profiles, challenges, participations, submissions, votes, reviews, and scores survive restarting the application and re-extracting an updated project ZIP.

The launcher also installs backend Python dependencies only on the first setup. Later runs reuse the existing virtual environment instead of running `pip install -r requirements.txt` every time. Frontend dependencies are likewise reused once Vite is installed.

**Do not delete `%LOCALAPPDATA%\FairPlayB5-1\db.sqlite3` unless you intentionally want to reset all local application data.**
