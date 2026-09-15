@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title FairPlay B5-1 - isolated launcher

set "BACKEND_HOST=127.0.0.1"
set "BACKEND_PORT=8010"
set "FRONTEND_HOST=127.0.0.1"
set "FRONTEND_PORT=5175"
set "API_URL=http://127.0.0.1:%BACKEND_PORT%/api"
set "DATA_DIR=%LOCALAPPDATA%\FairPlayB5-1"
set "DB_PATH=%DATA_DIR%\db.sqlite3"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"

rem If this folder contains an older local database, preserve it on first run
rem instead of silently starting with an empty database.
if not exist "%DB_PATH%" if exist "backend\db.sqlite3" (
  echo [B5-1] Preserving existing project database in the persistent data folder...
  copy /Y "backend\db.sqlite3" "%DB_PATH%" >nul
)

where python >nul 2>&1 || (echo [ERROR] Python 3 is not installed or not on PATH.& pause & exit /b 1)
where npm >nul 2>&1 || (echo [ERROR] Node.js/npm is not installed or not on PATH.& pause & exit /b 1)

netstat -ano | findstr /R /C:":%BACKEND_PORT% .*LISTENING" >nul && (echo [ERROR] Port %BACKEND_PORT% is already in use. Close that program before starting B5-1.& pause & exit /b 1)
netstat -ano | findstr /R /C:":%FRONTEND_PORT% .*LISTENING" >nul && (echo [ERROR] Port %FRONTEND_PORT% is already in use. Close that program before starting B5-1.& pause & exit /b 1)

if not exist "backend\venv\Scripts\python.exe" (
  echo [B5-1] Creating Python environment...
  python -m venv backend\venv || (echo [ERROR] Could not create Python virtual environment.& pause & exit /b 1)
)

if not exist "node_modules\.bin\vite.cmd" (
  echo [B5-1] Installing frontend dependencies. This is required on first run...
  call npm install || (echo [ERROR] npm install failed.& pause & exit /b 1)
)

if not exist "backend\venv\.fairplay_deps_ready" (
  echo [B5-1] Installing backend dependencies. This is required only once...
  call "backend\venv\Scripts\python.exe" -m pip install -r backend\requirements.txt || (echo [ERROR] Backend dependency installation failed.& pause & exit /b 1)
  type nul > "backend\venv\.fairplay_deps_ready"
) else (
  echo [B5-1] Backend dependencies already installed. Skipping pip install.
)

echo [B5-1] Using persistent database: %DB_PATH%
echo [B5-1] Applying database migrations...
set "FAIRPLAY_DB_PATH=%DB_PATH%"
call "backend\venv\Scripts\python.exe" backend\manage.py migrate || (echo [ERROR] Django migration failed. Check the BACKEND window/output.& pause & exit /b 1)

set "DJANGO_DEBUG=true"
set "DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost"
set "CORS_ALLOWED_ORIGINS=http://127.0.0.1:%FRONTEND_PORT%,http://localhost:%FRONTEND_PORT%"

start "FairPlay B5-1 BACKEND (%BACKEND_PORT%)" cmd /k "cd /d %~dp0backend && set DJANGO_DEBUG=true && set DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost && set CORS_ALLOWED_ORIGINS=http://127.0.0.1:%FRONTEND_PORT%,http://localhost:%FRONTEND_PORT% && set FAIRPLAY_DB_PATH=%DB_PATH% && venv\Scripts\python.exe manage.py runserver %BACKEND_HOST%:%BACKEND_PORT%"

echo [B5-1] Waiting for Django API to become ready...
set /a ATTEMPTS=0
:WAIT_API
set /a ATTEMPTS+=1
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://%BACKEND_HOST%:%BACKEND_PORT%/api/health/'; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if %ERRORLEVEL%==0 goto API_READY
if %ATTEMPTS% GEQ 90 goto API_FAILED
timeout /t 1 /nobreak >nul
goto WAIT_API

:API_READY
echo [B5-1] Backend is ready.
start "FairPlay B5-1 FRONTEND (%FRONTEND_PORT%)" cmd /k "cd /d %~dp0 && set VITE_API_URL=%API_URL% && npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://%FRONTEND_HOST%:%FRONTEND_PORT%/"
echo.
echo [B5-1] Started successfully.
echo [B5-1] Frontend: http://%FRONTEND_HOST%:%FRONTEND_PORT%/
echo [B5-1] Backend:  %API_URL%/health/
echo.
exit /b 0

:API_FAILED
echo [ERROR] B5-1 backend did not become ready within 90 seconds.
echo Check the BACKEND window for the actual Django error.
pause
exit /b 1
