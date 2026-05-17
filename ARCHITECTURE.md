# Architecture After Deployment

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    HTTPS (Vercel Domain)
                                 │
                                 ▼
    ┌──────────────────────────────────────────────────┐
    │         VERCEL (Frontend Hosting)                 │
    │                                                  │
    │  ┌────────────────────────────────────────┐     │
    │  │  GoalForge React + Vite App            │     │
    │  │  - Dashboard, Goals, Analytics, etc.  │     │
    │  │                                        │     │
    │  │  Environment Variables:                │     │
    │  │  - VITE_API_URL                        │     │
    │  │  - VITE_ML_API_URL                     │     │
    │  │  - VITE_APP_NAME                       │     │
    │  └────────────────────────────────────────┘     │
    └────┬──────────────────────────┬─────────────────┘
         │                          │
         │ HTTPS                    │ HTTPS
         │                          │
         ▼                          ▼
    ┌─────────────────┐      ┌───────────────────────┐
    │ HUGGINGFACE     │      │ HUGGINGFACE SPACES    │
    │ (Backend API)   │      │ (ML Service)          │
    │                 │      │                       │
    │ Express/Node    │      │ FastAPI              │
    │ - Users         │      │ - Predictions         │
    │ - Goals         │      │ - Model Serving       │
    │ - Analytics     │      │ - Anomaly Detection   │
    │ - Reports       │      │                       │
    └────────┬────────┘      └───────────┬───────────┘
             │                           │
             │ POSTGRESQL PROTOCOL       │
             │ (Connection Pool)         │ May call for
             │                           │ advanced features
             ▼                           │
        ┌─────────────────┐              │
        │ NEON            │◄─────────────┘
        │ (PostgreSQL     │
        │  Database)      │
        │                 │
        │ - User data     │
        │ - Goals         │
        │ - Performance   │
        │   metrics       │
        │ - Audit logs    │
        └─────────────────┘
```

---

## Deployment Locations

### Frontend
- **Platform**: Vercel
- **URL**: `https://goalforge-RANDOM.vercel.app`
- **Region**: CDN globally distributed
- **Auto-scaling**: Yes
- **SSL**: Yes (built-in)

### Backend API
- **Platform**: HuggingFace
- **URL**: `https://your-username-backend.hf.space/api`
- **Region**: HuggingFace infrastructure
- **Auto-scaling**: Limited (Spaces have sleep timeout)
- **SSL**: Yes (built-in)

### ML Service
- **Platform**: HuggingFace Spaces (Docker)
- **URL**: `https://your-username-goalforge-ml.hf.space`
- **Region**: HuggingFace infrastructure
- **Port**: 7860 (standard for Spaces)
- **Auto-scaling**: Limited (Spaces have sleep timeout)
- **SSL**: Yes (built-in)

### Database
- **Platform**: Neon (PostgreSQL)
- **Connection**: Pooled connection from both backend and ML service
- **Backups**: Neon handles automatically
- **SSL**: Yes (required)

---

## Data Flow

### User Login Flow
```
1. User enters credentials in Frontend (Vercel)
2. Frontend sends POST to Backend (/api/auth/login)
3. Backend validates against Neon database
4. Backend returns JWT token
5. Frontend stores token in local storage
6. Frontend makes subsequent requests with Bearer token
```

### Goal Prediction Flow
```
1. User views goal prediction in Frontend
2. Frontend fetches goal data from Backend
3. Frontend OR Backend calls ML Service prediction endpoint
4. ML Service processes request (may query database)
5. ML Service returns prediction result
6. Frontend displays result to user
```

### ML Model Training (if needed)
```
1. Scheduled job in ML Service
2. Fetches data from Neon database
3. Retrains models
4. Saves updated models to persistent storage
5. Loads models for next prediction
```

---

## Performance Considerations

### Frontend (Vercel)
- **Cold start**: None (pre-built and cached)
- **Response time**: <100ms (CDN)
- **Build time**: ~2-3 minutes
- **Deployments**: Automatic on git push

### Backend (HuggingFace)
- **Cold start**: ~30-60 seconds after inactivity
- **Response time**: 200-500ms
- **Note**: Free tier has sleep timeout

### ML Service (HuggingFace Spaces)
- **Cold start**: ~60-120 seconds after inactivity
- **Response time**: 500ms-2s (depends on model size)
- **Note**: Free tier has sleep timeout

### Database (Neon)
- **Connection pool**: Managed automatically
- **Query time**: 10-100ms (depends on query complexity)
- **Availability**: 99.99% SLA

---

## Monitoring & Logging

### Frontend Monitoring
- Vercel built-in analytics
- Browser console errors (DevTools)
- Sentry integration (optional)

### Backend Logs
- HuggingFace Space logs
- Application logs in console
- Database query logs in Neon

### ML Service Logs
- HuggingFace Space logs
- FastAPI logging
- Model load status

### Database Monitoring
- Neon dashboard
- Query performance
- Connection pool status

---

## Scaling Strategy

### If Frontend Gets Slow
1. Vercel auto-scales (no action needed)
2. Check API response times (backend issue)
3. Optimize React components (code issue)

### If Backend Gets Slow
1. Check database query performance
2. Add caching layer (Redis) - future upgrade
3. Upgrade HF Spaces instance (paid)

### If ML Service Gets Slow
1. Check model inference time
2. Upgrade to larger HF Spaces instance
3. Cache predictions (future upgrade)

### If Database Gets Slow
1. Add indexes to frequently queried fields
2. Optimize queries
3. Upgrade Neon tier

---

## Security Considerations

### Frontend
- ✅ Served over HTTPS
- ✅ No sensitive data in localStorage (JWT only)
- ✅ CORS headers configured
- ⚠️ Never expose API keys in frontend code

### Backend
- ✅ JWT authentication
- ✅ Database password in environment variables
- ✅ CORS configured
- ✅ Rate limiting (consider adding)

### ML Service
- ✅ CORS open (can be restricted)
- ✅ No authentication (consider adding JWT)
- ⚠️ Models not protected (consider encrypting)

### Database
- ✅ SSL connection required
- ✅ Connection pooling for security
- ✅ Neon managed authentication
- ⚠️ Regular backups recommended

---

## Cost Estimation

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Free | $0/month |
| HuggingFace Backend | Free | $0/month |
| HuggingFace ML Spaces | Free | $0/month (with sleep) |
| Neon Database | Free | $0/month (with limits) |
| **Total** | Free | **$0/month** |

*Note: Upgrade to paid tiers as needed for better performance/reliability*

---

## Next Steps for Production

1. **Set up custom domain** for frontend
2. **Add error tracking** (Sentry/LogRocket)
3. **Configure monitoring** and alerts
4. **Set up CI/CD** with GitHub Actions
5. **Add rate limiting** to API
6. **Implement caching** for frequently accessed data
7. **Set up database backups** policy
8. **Create incident response** playbook
