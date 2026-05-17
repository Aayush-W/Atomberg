#!/bin/bash
# GoalForge Deployment Script
# Prerequisites: Git, HuggingFace account, Vercel account

set -e

echo "🚀 GoalForge Deployment Setup"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Get user inputs
echo -e "${BLUE}Step 1: Gathering Information${NC}"
echo ""

read -p "Enter your HuggingFace username: " HF_USERNAME
read -p "Enter your GitHub username (for frontend): " GITHUB_USERNAME
read -p "Enter your backend URL (from HuggingFace): " BACKEND_URL
read -p "Enter your GitHub personal access token: " GITHUB_TOKEN

echo ""
echo -e "${BLUE}Step 2: Preparing ML Service${NC}"
echo ""

# Navigate to ML service directory
cd ml-service || { echo "ml-service directory not found!"; exit 1; }

# Create .gitignore if it doesn't exist
if [ ! -f ".gitignore" ]; then
    echo -e "${YELLOW}Creating .gitignore for ML service${NC}"
    cat > .gitignore << 'EOF'
__pycache__/
*.pyc
.env
models/saved/
*.pkl
*.joblib
*.egg-info/
dist/
build/
.DS_Store
EOF
fi

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing git repository${NC}"
    git init
    git add .
    git commit -m "Initial ML service setup"
fi

# Create HuggingFace Spaces repo instructions
echo ""
echo -e "${GREEN}✓ ML Service prepared${NC}"
echo ""
echo "Next steps for ML Service (HuggingFace Spaces):"
echo "1. Go to https://huggingface.co/spaces"
echo "2. Click 'Create new Space'"
echo "3. Set name: goalforge-ml"
echo "4. Select SDK: Docker"
echo "5. Run: git clone https://huggingface.co/spaces/$HF_USERNAME/goalforge-ml"
echo "6. Copy ml-service files into the cloned repo"
echo "7. Commit and push"
echo ""

# Navigate back to root
cd ..

# 2. Frontend preparation
echo -e "${BLUE}Step 3: Preparing Frontend${NC}"
echo ""

cd client || { echo "client directory not found!"; exit 1; }

# Create environment variables file
echo -e "${YELLOW}Creating .env file${NC}"
cat > .env << EOF
VITE_API_URL=$BACKEND_URL
VITE_ML_API_URL=https://$HF_USERNAME-goalforge-ml.hf.space
VITE_APP_NAME=GoalForge
EOF

echo -e "${GREEN}✓ Environment variables configured${NC}"
echo ""

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing git repository for frontend${NC}"
    git init
    git config user.email "deploy@goalforge.app"
    git config user.name "GoalForge Deploy"
fi

# Add all files
git add .
git commit -m "Initial frontend setup" || echo "Nothing new to commit"

echo ""
echo -e "${GREEN}✓ Frontend prepared${NC}"
echo ""
echo "Next steps for Frontend (Vercel):"
echo "1. Go to https://vercel.com"
echo "2. Click 'Add New' > 'Project'"
echo "3. Import from GitHub: $GITHUB_USERNAME/goalforge-frontend"
echo "4. Select 'client' as root directory"
echo "5. Add environment variables:"
echo "   - VITE_API_URL: $BACKEND_URL"
echo "   - VITE_ML_API_URL: https://$HF_USERNAME-goalforge-ml.hf.space"
echo "   - VITE_APP_NAME: GoalForge"
echo "6. Click 'Deploy'"
echo ""

cd ..

# 3. Summary
echo ""
echo -e "${GREEN}=============================${NC}"
echo -e "${GREEN}Deployment Setup Complete!${NC}"
echo -e "${GREEN}=============================${NC}"
echo ""
echo "Configuration:"
echo "  HF Username: $HF_USERNAME"
echo "  GitHub Username: $GITHUB_USERNAME"
echo "  Backend URL: $BACKEND_URL"
echo ""
echo "ML Service: https://$HF_USERNAME-goalforge-ml.hf.space"
echo "Frontend: https://goalforge-*.vercel.app (after deployment)"
echo ""
echo "See DEPLOYMENT_GUIDE.md for detailed instructions"
echo ""
