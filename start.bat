@echo off
echo.
echo  ======================================================
echo   FlatFinder ^| Starting Development Server
echo  ======================================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo          Download from: https://nodejs.org
    pause
    exit /b 1
)

:: Check for node_modules
if not exist "node_modules\" (
    echo  [INFO] node_modules not found. Running npm install...
    npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed. Check your internet connection.
        pause
        exit /b 1
    )
)

:: Check for .env
if not exist ".env" (
    echo  [WARN] .env file not found. Copying from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  [WARN] Please edit .env with your real MySQL and Cloudinary credentials.
    ) else (
        echo  [ERROR] .env.example also missing. Please create a .env file manually.
        pause
        exit /b 1
    )
)

echo  [INFO] Starting server on http://localhost:3000
echo  [INFO] Press Ctrl+C to stop.
echo.

set NODE_ENV=development
node --watch server.js
pause
