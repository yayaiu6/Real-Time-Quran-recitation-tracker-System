@echo off
setlocal
cd /d "%~dp0\..\.."

echo ========================================================
echo   Building and Deploying Natlu to natlu.pages.dev
echo ========================================================

echo.
echo [1/2] Running production build...
call web\scripts\build.bat
if %errorlevel% neq 0 (
    echo [ERROR] Build failed! Aborting deployment.
    exit /b %errorlevel%
)

echo.
echo [2/2] Deploying build\web to Cloudflare Pages project: natlu ...
call npx --yes wrangler pages deploy build\web --project-name=natlu

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   Deployment Succeeded!
    echo   Live URL: https://natlu.pages.dev
    echo ========================================================
) else (
    echo.
    echo [ERROR] Deployment failed. If you are not logged in, run:
    echo   npx wrangler login
)

