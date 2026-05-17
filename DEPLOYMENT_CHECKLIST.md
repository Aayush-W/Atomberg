# GoalForge Deployment Checklist

## Pre-Deployment Setup
- [ ] Have HuggingFace account created
- [ ] Have Vercel account created
- [ ] Have Neon database URL ready
- [ ] Have backend URL from HuggingFace ready
- [ ] Have GitHub account for frontend repo

## ML Service Deployment (HuggingFace Spaces)

### Local Preparation
- [ ] Copy all files from `ml-service/` directory
- [ ] Verify `app.py` exists (or rename `main.py` to `app.py`)
- [ ] Check `requirements.txt` includes all dependencies
- [ ] Verify `models/saved/` directory exists or will be created at runtime
- [ ] Review `Dockerfile` - should expose port 7860

### HuggingFace Spaces Setup
- [ ] Create new Space on https://huggingface.co/spaces
  - Name: `goalforge-ml`
  - SDK: Docker
  - Visibility: Public or Private (your choice)
- [ ] Clone the Space: `git clone https://huggingface.co/spaces/YOUR_USERNAME/goalforge-ml`
- [ ] Copy ML service files into the cloned directory
- [ ] Create `.gitignore` with model files excluded
- [ ] Commit: `git add . && git commit -m "Initial ML service"`
- [ ] Push: `git push`
- [ ] Wait for Space to build (check logs)
- [ ] Test health endpoint: `https://YOUR_USERNAME-goalforge-ml.hf.space/health`
- [ ] Test API docs: `https://YOUR_USERNAME-goalforge-ml.hf.space/docs`

### ML Service Verification
- [ ] Health check returns 200
- [ ] FastAPI docs page loads
- [ ] Models load or report not found (gracefully)
- [ ] Test a sample prediction endpoint

**ML Service URL**: `https://YOUR_USERNAME-goalforge-ml.hf.space`

---

## Frontend Deployment (Vercel)

### Local Preparation
- [ ] Navigate to `client/` directory
- [ ] Run `npm install` (if not already done)
- [ ] Create `.env` file with:
  ```
  VITE_API_URL=<your-backend-url>
  VITE_ML_API_URL=https://YOUR_USERNAME-goalforge-ml.hf.space
  VITE_APP_NAME=GoalForge
  ```
- [ ] Test build: `npm run build`
- [ ] Verify `dist/` folder is created
- [ ] Initialize git: `git init` (if needed)
- [ ] Add all files: `git add .`
- [ ] Commit: `git commit -m "Initial frontend"`
- [ ] Create GitHub repo: `https://github.com/YOUR_USERNAME/goalforge-frontend`
- [ ] Push to GitHub with token:
  ```bash
  git remote add origin https://YOUR_USERNAME:GITHUB_TOKEN@github.com/YOUR_USERNAME/goalforge-frontend.git
  git push -u origin main
  ```

### Vercel Deployment
- [ ] Go to https://vercel.com and sign in
- [ ] Click "Add New" → "Project"
- [ ] Import from GitHub (authorize if first time)
- [ ] Select repository: `goalforge-frontend`
- [ ] Configure project:
  - Root Directory: `client`
  - Framework Preset: Vite
  - Build Command: `npm run build` (auto-detected)
  - Output Directory: `dist`
- [ ] Add Environment Variables:
  - `VITE_API_URL` = Your backend URL
  - `VITE_ML_API_URL` = `https://YOUR_USERNAME-goalforge-ml.hf.space`
  - `VITE_APP_NAME` = `GoalForge`
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete (usually 1-2 minutes)

### Frontend Verification
- [ ] Visit your Vercel deployment URL
- [ ] Check browser console for errors
- [ ] Test login flow
- [ ] Verify API calls reach the backend
- [ ] Check that ML endpoints are reachable

**Frontend URL**: `https://goalforge-RANDOM.vercel.app`

---

## Post-Deployment Testing

### API Connectivity
- [ ] Frontend can reach backend: Check network tab in DevTools
- [ ] Frontend can reach ML service: Verify ML API calls work
- [ ] No CORS errors in console

### Functionality
- [ ] User authentication works
- [ ] Dashboard loads
- [ ] Goals page displays data
- [ ] ML predictions work (if applicable)
- [ ] Reports generate correctly

### Performance
- [ ] Frontend loads in < 5 seconds
- [ ] API responses are reasonably fast
- [ ] No console errors or warnings

### Error Handling
- [ ] Test with backend down (error message shows)
- [ ] Test with ML service down (graceful fallback)
- [ ] Invalid login shows proper error

---

## Custom Domain Setup (Optional)

### For Frontend (Vercel)
- [ ] Go to Vercel Project Settings → Domains
- [ ] Add your custom domain
- [ ] Update DNS records as instructed
- [ ] Wait for DNS propagation (usually < 24 hours)
- [ ] Verify domain works: `https://yourdomain.com`

### For ML Service (HuggingFace)
- [ ] Note: Standard HF Spaces don't support custom domains
- [ ] Alternative: Use Vercel proxy or subdomain routing

---

## Environment Variables Reference

### Frontend (.env in `client/`)
```env
VITE_API_URL=https://your-backend-url.hf.space/api
VITE_ML_API_URL=https://your-username-goalforge-ml.hf.space
VITE_APP_NAME=GoalForge
```

### ML Service (if needed in HF Spaces secrets)
```env
BACKEND_URL=https://your-backend-url.hf.space/api
FRONTEND_URL=https://your-domain.vercel.app
```

---

## Troubleshooting

### Build Fails on Vercel
- [ ] Check build logs: Click on deployment → Logs
- [ ] Common issues:
  - Missing `.env` variables → Add in Vercel dashboard
  - TypeScript errors → Run `npm run build` locally
  - Missing dependencies → Check `package.json`

### ML Service Not Loading
- [ ] Check HF Spaces build logs
- [ ] Verify `Dockerfile` is correct
- [ ] Ensure models directory exists
- [ ] Check Python version compatibility

### CORS Errors
- [ ] Verify backend allows your Vercel domain
- [ ] Check ML service CORS middleware settings
- [ ] Ensure backend is accessible from the internet

### Frontend Can't Connect to API
- [ ] Check environment variables in Vercel
- [ ] Verify backend is still running
- [ ] Check browser DevTools Network tab
- [ ] Confirm URLs are correct

---

## Final Verification

- [ ] All checklists above are complete
- [ ] Frontend deploys and loads without errors
- [ ] API connections work properly
- [ ] ML predictions work (if applicable)
- [ ] No sensitive data exposed in frontend code
- [ ] Logs don't show authentication failures

---

## Support Resources

- HuggingFace Spaces Docs: https://huggingface.co/docs/hub/spaces
- Vercel Docs: https://vercel.com/docs
- FastAPI Docs: https://fastapi.tiangolo.com/
- Neon Docs: https://neon.tech/docs/introduction

---

## Next Steps After Deployment

1. **Monitor**: Set up error tracking (Sentry, LogRocket)
2. **Analytics**: Add analytics to understand usage
3. **Backup**: Set up regular database backups
4. **CI/CD**: Consider GitHub Actions for automated deployments
5. **Documentation**: Create user guide for the application
