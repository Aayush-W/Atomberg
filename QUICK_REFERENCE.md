# Deployment Quick Reference

## Your Current Setup
- ✅ Backend: HuggingFace (already deployed)
- ✅ Database: Neon PostgreSQL (already deployed)
- 🚀 ML Service: HuggingFace Spaces (deploying)
- 🚀 Frontend: Vercel (deploying)

---

## Quick Links

### Accounts & Platforms
- [HuggingFace](https://huggingface.co) - ML service hosting
- [Vercel](https://vercel.com) - Frontend hosting
- [GitHub](https://github.com) - Code repository
- [Neon](https://neon.tech) - Database (already set up)

### Your Deployments (after completion)
- ML Service: `https://YOUR_USERNAME-goalforge-ml.hf.space`
- Frontend: `https://goalforge-RANDOMNAME.vercel.app`
- API Docs (ML): `https://YOUR_USERNAME-goalforge-ml.hf.space/docs`
- Health Check (ML): `https://YOUR_USERNAME-goalforge-ml.hf.space/health`

---

## 3-Step Deployment Summary

### Step 1: Deploy ML Service (30 mins)
1. Go to https://huggingface.co/spaces
2. Create new Space: `goalforge-ml` with Docker SDK
3. Clone: `git clone https://huggingface.co/spaces/YOUR_USERNAME/goalforge-ml`
4. Copy files from `ml-service/` folder
5. Push: `git add . && git commit -m "Deploy" && git push`
6. Wait for build to complete
7. Test: Visit `/docs` endpoint

### Step 2: Deploy Frontend (20 mins)
1. Update `client/.env` with your URLs
2. Push frontend code to GitHub
3. Go to https://vercel.com
4. Import GitHub repo
5. Set root directory to `client`
6. Add environment variables
7. Deploy!

### Step 3: Verify Everything (10 mins)
1. Test frontend loads
2. Test login works
3. Check API calls in DevTools Network tab
4. Verify no console errors

**Total time: ~1 hour**

---

## Files You Need to Know About

| File | Purpose | Location |
|------|---------|----------|
| `app.py` | ML FastAPI server | `ml-service/` |
| `requirements.txt` | ML dependencies | `ml-service/` |
| `Dockerfile` | ML container config | `ml-service/` |
| `vercel.json` | Vercel configuration | `client/` |
| `.env` | Frontend env vars | `client/` |
| `vite.config.ts` | Frontend build config | `client/` |
| `package.json` | Frontend dependencies | `client/` |

---

## Environment Variables Needed

### For Frontend (in Vercel Dashboard)
```
VITE_API_URL = [your backend URL from HuggingFace]
VITE_ML_API_URL = https://YOUR_USERNAME-goalforge-ml.hf.space
VITE_APP_NAME = GoalForge
```

### Example
```
VITE_API_URL = https://aayush-backend.hf.space/api
VITE_ML_API_URL = https://aayush-goalforge-ml.hf.space
VITE_APP_NAME = GoalForge
```

---

## Common Commands

### Build & Test Locally
```bash
# Frontend
cd client
npm install
npm run build
npm run preview

# ML Service
cd ml-service
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app:app --reload --port 7860
```

### Deploy to GitHub
```bash
git add .
git commit -m "Your message"
git push
```

### Test APIs
```bash
# Frontend API
curl https://your-backend-url/api/health

# ML Service
curl https://YOUR_USERNAME-goalforge-ml.hf.space/health
curl https://YOUR_USERNAME-goalforge-ml.hf.space/docs
```

---

## Testing Checklist

After deployment:
- [ ] Frontend loads without errors
- [ ] Can log in successfully
- [ ] Dashboard displays data
- [ ] API calls work (check DevTools Network tab)
- [ ] No CORS errors in console
- [ ] ML service responds to requests

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Cannot find module" on Vercel | Check all dependencies in `package.json` |
| CORS errors | Add Vercel domain to backend CORS settings |
| Env vars not working | Verify they're set in Vercel/HF dashboard |
| Build fails | Run `npm run build` locally to see real error |
| ML service timeouts | Check if models exist in `models/saved/` |

---

## Support

- **Documentation**: See `DEPLOYMENT_GUIDE.md`
- **Checklist**: Use `DEPLOYMENT_CHECKLIST.md`
- **Scripts**: Run `deploy.sh` (Linux/Mac) or `deploy.bat` (Windows)

---

## Next Steps

1. Update your URLs in environment variables
2. Run the deployment script
3. Follow the prompts
4. Test your live site!

**Need help?** Check DEPLOYMENT_GUIDE.md for detailed steps.
