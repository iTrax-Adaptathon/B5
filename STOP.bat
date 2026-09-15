@echo off
setlocal
for %%P in (8010 5175) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
    echo Stopping process %%A on port %%P...
    taskkill /PID %%A /T /F >nul 2>&1
  )
)
echo FairPlay B5-1 processes on ports 8010/5175 have been stopped.
pause
