# Deployment Guide - Render

This guide walks you through deploying the Bitespeed Identity Reconciliation API to Render.

## Prerequisites

1. **GitHub Account** - Code must be on GitHub
2. **Render Account** - Free at [render.com](https://render.com)
3. **Git Knowledge** - Basic git commands

## Step-by-Step Deployment

### Step 1: Prepare Your Code

1. Ensure all code is committed and pushed to GitHub:

```bash
git add .
git commit -m "Initial commit: Bitespeed Identity Reconciliation API"
git push origin main
```

2. Verify `.env` is in `.gitignore` (it should be):

```bash
cat .gitignore | grep "^.env$"
```

### Step 2: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **PostgreSQL**

3. Fill in the form:

   ```
   Name: bitespeed-postgres
   Database: bitespeed_prod
   User: postgres
   Region: Your preferred region (e.g., Ohio, Frankfurt)
   ```

4. Note these details for later:
   - **Host**: Usually in format `dpg-xxxxx.render.com`
   - **Port**: 5432
   - **Database**: bitespeed_prod
   - **User**: postgres
   - **Password**: (copy it now!)
   - **Internal Database URL**: Copy this full URL

5. Click **Create Database** and wait for it to be ready (2-3 minutes)

### Step 3: Create Web Service

1. Click **New +** → **Web Service**

2. Select your GitHub repository

3. Fill in the service details:

   ```
   Name: bitespeed-api
   Environment: Node
   Build Command: npm install && npm run prisma:push && npm run build
   Start Command: node dist/index.js
   Plan: Free (or Starter for better performance)
   ```

4. Click **Create Web Service**

### Step 4: Add Environment Variables

1. While the service is building, scroll down to **Environment**

2. Add these variables:

   ```
   NODE_ENV = production
   DATABASE_URL = postgresql://postgres:<password>@<host>:5432/bitespeed_prod
   PORT = 10000
   CORS_ORIGIN = https://<your-app-name>.onrender.com
   ```

   Replace:
   - `<password>` with your PostgreSQL password
   - `<host>` with PostgreSQL host
   - `<your-app-name>` with your Render service name

3. Click **Save Changes**

### Step 5: Monitor Deployment

1. Watch the **Logs** tab during build
2. Wait for "Your service is live" message
3. Service will be available at: `https://<your-app-name>.onrender.com`

## Testing Deployment

Once deployed, test the API:

```bash
# Health check
curl https://<your-app-name>.onrender.com/health

# Create contact
curl -X POST https://<your-app-name>.onrender.com/identify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Updating Your Deployment

### Code Changes

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Bug fix: ..."
   git push origin main
   ```
3. Render auto-deploys on push (can be disabled in settings)

### Database Schema Changes

1. Update `prisma/schema.prisma`
2. Commit code change
3. Push to GitHub - auto-deployment runs:
   - Runs: `npm run prisma:push`
   - Applies schema changes automatically

### Manual Redeploy

If needed, click **Manual Deploy** → **Deploy Latest Commit** in Render dashboard.

## Scaling & Performance

### For Higher Traffic

Upgrade from Free to Starter/Standard plan:

1. Go to service details
2. Click **Settings** → **Plan**
3. Select higher tier

### Database Performance

If database is slow:

1. Add readonly replicas (Render Premium feature)
2. Optimize queries and indexes
3. Monitor in Logs tab

## Monitoring & Logs

### View Live Logs

In Render Dashboard → Service → **Logs** tab

### Common Issues

**Service keeps crashing after build:**

```
Error: connect ECONNREFUSED
```

→ Check DATABASE_URL is correct

**Port binding error:**

```
Error: listen EADDRINUSE
```

→ Render uses port 10000, update Start Command

**Out of memory:**
→ Upgrade to Starter plan with more RAM

## Environment-Specific Notes

### Render Limitations

- Free tier: 0.5 CPU, 512MB RAM (suitable for low traffic)
- Spins down after 15 minutes inactivity
- For always-on, use Starter plan ($7/month)

### Database

- Free PostgreSQL has 100MB limits
- Automatic backups included
- Access PostgreSQL externally using psql:

```bash
psql "postgresql://postgres:<password>@<host>:5432/bitespeed_prod"
```

## Disaster Recovery

### Backup Database

1. Render auto-backups PostgreSQL
2. Access backups in PostgreSQL service → **Backups** tab
3. Download or restore from backups

### Restore from Backup

1. Go to PostgreSQL service
2. Click **Backups**
3. Click **Restore From Backup**
4. Select backup point and confirm

## Cost Breakdown

| Component   | Free                 | Starter       |
| ----------- | -------------------- | ------------- |
| Web Service | Free (spinning down) | $7/month      |
| PostgreSQL  | Free (100MB)         | $7/month      |
| **Total**   | **Free**             | **$14/month** |

## Continuous Deployment (Auto-Deploy)

Render auto-deploys on GitHub push. To disable:

1. Service Settings
2. **Deploy On Push**: Toggle OFF
3. Manually deploy via "Manual Deploy" button

## Production Checklist

- [ ] DATABASE_URL set correctly
- [ ] NODE_ENV = production
- [ ] CORS_ORIGIN configured for your domain
- [ ] Health check endpoint responding
- [ ] Test /identify endpoint works
- [ ] Database backups enabled
- [ ] Logs monitoring configured
- [ ] Custom domain (optional) configured

## Getting Help

- **Render Docs**: https://render.com/docs
- **Deployment Issues**: Check Logs tab in Render
- **Local Testing First**: Run `docker-compose up` locally before deploying

---

**Happy Deploying! 🚀**
