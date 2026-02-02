@echo off
REM Theme1 Overlay Server Stop Script (Windows)
REM Safely stops the Node.js server running on port 3000

echo 🛑 Stopping Theme1 Overlay Server...

echo    Killing Node.js server processes...
taskkill /f /im node.exe 2>nul

echo    Freeing up port 3000...
FOR /F "tokens=5" %%i in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%i 2>nul

echo    Waiting for processes to terminate...
timeout /t 2 /nobreak >nul

echo    Verifying server is stopped...
curl -s --max-time 2 http://localhost:3000 >nul 2>&1
if %errorlevel%==0 (
    echo ❌ Server may still be running on port 3000
    echo    Try restarting your computer or check Task Manager
) else (
    echo ✅ Server successfully stopped!
    echo    Port 3000 is now free
)

echo.
echo 📝 Server Log Location: ./server.log
echo 🚀 To restart server: npm start
echo.
pause