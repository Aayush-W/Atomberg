@echo off
REM GoalForge Deployment Script for Windows
REM Prerequisites: Git, Node.js, HuggingFace account, Vercel CLI

setlocal enabledelayedexpansion

echo.
echo 🚀 GoalForge Deployment Setup
echo ==============================
echo.

set /p HF_USERNAME="Enter your HuggingFace username: "
set /p GITHUB_USERNAME="Enter your GitHub username: "
set /p BACKEND_URL="Enter your backend URL (from HuggingFace): "
set /p GITHUB_TOKEN="Enter your GitHub personal access token: "

echo.
echo Step 1: Preparing ML Service
echo.

cd ml-service
if not exist ".gitignore" (
    echo Creating .gitignore for ML service
    (
        echo __pycache__/
        echo *.pyc
        echo .env
        echo models/saved/
        echo *.pkl
        echo *.joblib
    ) > .gitignore
)

if not exist ".git" (
    echo Initializing git repository
    git init
    git add .
    git commit -m "Initial ML service setup"
)

echo.
echo ✓ ML Service prepared
echo.
echo Next steps for ML Service (HuggingFace Spaces):
echo 1. Go to https://huggingface.co/spaces
echo 2. Click 'Create new Space'
echo 3. Set name: goalforge-ml
echo 4. Select SDK: Docker
echo 5. Run: git clone https://huggingface.co/spaces/%HF_USERNAME%/goalforge-ml
echo 6. Copy ml-service files into the cloned repo
echo 7. Commit and push
echo.

cd ..

echo Step 2: Preparing Frontend
echo.

cd client

echo Creating .env file
(
    echo VITE_API_URL=%BACKEND_URL%
    echo VITE_ML_API_URL=https://%HF_USERNAME%-goalforge-ml.hf.space
    echo VITE_APP_NAME=GoalForge
) > .env

echo ✓ Environment variables configured
echo.

if not exist ".git" (
    echo Initializing git repository for frontend
    git init
    git config user.email "deploy@goalforge.app"
    git config user.name "GoalForge Deploy"
)

git add .
git commit -m "Initial frontend setup"

echo.
echo ✓ Frontend prepared
echo.
echo Next steps for Frontend (Vercel):
echo 1. Go to https://vercel.com
echo 2. Click 'Add New' ^> 'Project'
echo 3. Import from GitHub: %GITHUB_USERNAME%/goalforge-frontend
echo 4. Select 'client' as root directory
echo 5. Add environment variables:
echo    - VITE_API_URL: %BACKEND_URL%
echo    - VITE_ML_API_URL: https://%HF_USERNAME%-goalforge-ml.hf.space
echo    - VITE_APP_NAME: GoalForge
echo 6. Click 'Deploy'
echo.

cd ..

echo.
echo ===============================
echo Deployment Setup Complete!
echo ===============================
echo.
echo Configuration:
echo   HF Username: %HF_USERNAME%
echo   GitHub Username: %GITHUB_USERNAME%
echo   Backend URL: %BACKEND_URL%
echo.
echo ML Service: https://%HF_USERNAME%-goalforge-ml.hf.space
echo Frontend: https://goalforge-*.vercel.app (after deployment)
echo.
echo See DEPLOYMENT_GUIDE.md for detailed instructions
echo.

endlocal
