# GoalForge Deployment Guide

## Overview
- **Backend**: HuggingFace (already deployed)
- **Database**: Neon PostgreSQL (already deployed)
- **ML Service**: HuggingFace Spaces (deploying)
- **Frontend**: Vercel (deploying)

---

## Part 1: Deploy ML Service to HuggingFace Spaces

### Step 1: Prepare ML Service Files

1. Create a `app.py` file (Spaces expects this):
```python
# Copy main.py content but ensure it runs on Spaces' standard port
```

2. Ensure `requirements.txt` has all dependencies including `gradio` for web UI (optional but recommended)

3. Create a `.gitignore`:
```
__pycache__/
*.pyc
.env
models/saved/
*.pkl
*.joblib
```

### Step 2: Upload to HuggingFace Spaces

1. Go to https://huggingface.co/spaces
2. Click **"Create new Space"**
3. Fill in:
   - **Space name**: `goalforge-ml` (or your choice)
   - **License**: MIT
   - **Space SDK**: Docker (since you have a Dockerfile)
4. Clone the repo to your local machine:
```bash
git clone https://huggingface.co/spaces/YOUR_USERNAME/goalforge-ml
cd goalforge-ml
```

5. Copy your ML service files:
```bash
cp -r /path/to/ml-service/* .
```

6. Ensure your `Dockerfile` is set up correctly for HuggingFace:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

7. Push to HuggingFace:
```bash
git add .
git commit -m "Initial ML service deployment"
git push
```

**Your ML Service URL will be**: `https://YOUR_USERNAME-goalforge-ml.hf.space`

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Prepare Frontend for Deployment

1. **Update build configuration** - ensure `vite.config.ts` is optimized:
```typescript
// Should already have this, but verify
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
  },
})
```

2. **Create `.vercelignore`**:
```
node_modules
.git
.env
.env.local
dist
build
```

### Step 2: Push Code to GitHub

1. Initialize git repo (if not already):
```bash
cd client
git init
git add .
git commit -m "Initial frontend"
git remote add origin https://github.com/YOUR_USERNAME/goalforge-frontend
git branch -M main
git push -u origin main
```

### Step 3: Deploy to Vercel

1. Go to https://vercel.com and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Select the `client` folder as root directory
5. Add environment variables:
   - `VITE_API_URL`: Your HuggingFace backend URL (already hosted)
   - `VITE_ML_API_URL`: `https://YOUR_USERNAME-goalforge-ml.hf.space`
   - `VITE_APP_NAME`: `GoalForge`
6. Click **"Deploy"**

**Your Frontend URL will be**: `https://goalforge-RANDOMNAME.vercel.app` (or custom domain)

---

## Part 3: Environment Variables Summary

### Frontend (Vercel)
```env
VITE_API_URL=https://your-backend-on-huggingface.hf.space/api
VITE_ML_API_URL=https://YOUR_USERNAME-goalforge-ml.hf.space
VITE_APP_NAME=GoalForge
```

### ML Service (HuggingFace Spaces)
```env
# Usually no special env vars needed for basic model serving
# But if you need to connect to your backend, add:
BACKEND_URL=https://your-backend-on-huggingface.hf.space
```

---

## Part 4: Testing & Validation

After deployment:

1. **Test ML Service**:
   - Visit `https://YOUR_USERNAME-goalforge-ml.hf.space/docs` (FastAPI docs)
   - Test endpoints from there

2. **Test Frontend**:
   - Visit your Vercel URL
   - Check browser console for API errors
   - Test authentication flow

3. **Check CORS**:
   - Ensure backend allows requests from your Vercel domain
   - Update CORS settings in your backend if needed

---

## Part 5: Custom Domain (Optional)

### For Frontend on Vercel:
1. Go to Vercel Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### For ML Service on HuggingFace:
- Custom domains require HF Pro plan
- Alternative: Use subdomain routing from your main domain

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| CORS errors | Add `Access-Control-Allow-Origin: *` to backend |
| ML models not loading | Ensure `models/saved/` directory exists in Docker image |
| Frontend can't reach API | Check environment variables in Vercel dashboard |
| Vercel build fails | Run `npm run build` locally to debug |
| HF Spaces deployment fails | Check Docker image builds locally first |

---

## Quick Command Reference

```bash
# Test ML locally
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Test Frontend locally
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Next Steps Checklist

- [ ] ML Service uploaded to HuggingFace Spaces
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] CORS issues resolved
- [ ] Test all API endpoints
- [ ] Set up custom domain (optional)
- [ ] Monitor performance and logs
