# Railway Monorepo Deployment Guide

## Important: Monorepo Setup for Railway

Railway needs special configuration to handle monorepos with shared packages. Here's what you need to know:

### Will Railway detect the shared folders?
Yes, BUT you need to deploy from the repository root, not individual service folders. Railway will:
1. Clone your entire repository
2. Respect the `Root Directory` setting in each service
3. Use the nixpacks.toml to handle workspace dependencies

### Do you need to build before deploy?
No! Railway will build your services during deployment. The nixpacks.toml files handle this.

## Step-by-Step Railway Deployment

### 1. Prepare Your Repository
```bash
# Make sure you're in the root directory
cd "C:\Users\felip\OneDrive\Área de Trabalho\Innovera\Expert Database - Frank\frank"

# Initialize git if not already done
git init
git add .
git commit -m "Initial monorepo setup"

# Push to GitHub
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 2. Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository
5. Railway will detect it's a monorepo

### 3. Deploy BFF Service
1. In Railway project, click "New Service"
2. Choose "GitHub Repo" → Select your repo
3. Configure the service:
   - **Service Name**: BFF
   - **Root Directory**: `/apps/bff`
   - **Watch Paths**: `/apps/bff/**`, `/packages/**`
   
4. Environment Variables (click on service → Variables):
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
   NODE_ENV=production
   ```

5. Deploy Settings (click on service → Settings → Deploy):
   - **Build Command**: Auto-detected from nixpacks.toml
   - **Start Command**: Auto-detected from nixpacks.toml

### 4. Deploy Worker Service
1. In same Railway project, click "New Service"
2. Choose "GitHub Repo" → Select your repo
3. Configure the service:
   - **Service Name**: Worker
   - **Root Directory**: `/apps/worker`
   - **Watch Paths**: `/apps/worker/**`, `/packages/**`
   
4. Add same environment variables as BFF

### 5. Add Redis (Optional for now)
1. Click "New Service" → "Database" → "Redis"
2. Railway auto-provisions Redis
3. Copy `REDIS_URL` from Redis service
4. Add to both BFF and Worker env vars

## Alternative: Deploy via Railway CLI

### Setup
```bash
npm install -g @railway/cli
railway login
```

### Deploy BFF
```bash
# From repository root
railway link  # Select your project
railway service create bff
railway service bff
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
railway up
```

### Deploy Worker
```bash
railway service create worker
railway service worker
railway variables set SUPABASE_URL=your_url
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_key
railway up
```

## Verifying Deployment

1. **Check Build Logs**:
   - Click on service → "Build Logs"
   - Should see npm installing from root
   - Should see successful TypeScript compilation

2. **Check Deploy Logs**:
   - Click on service → "Deploy Logs"
   - Should see:
     - BFF: `[BFF] Running at...` every minute
     - Worker: `[Worker] Running at...` every minute

3. **Get Public URLs**:
   - BFF will have a public URL (e.g., `bff-production.up.railway.app`)
   - Worker typically doesn't need public access

## Common Issues & Solutions

### "Cannot find module '@frank/contracts'"
- Ensure nixpacks.toml installs from root: `cd ../.. && npm ci`
- Check Root Directory is set correctly in Railway

### Build fails with TypeScript errors
- The shared packages use .ts files directly
- This is handled by our tsconfig paths
- If issues persist, may need to build shared packages

### Service crashes immediately
- Check environment variables are set
- Look at deploy logs for specific errors
- Ensure start command is correct in package.json

## Next Steps

Once deployed:
1. Copy BFF URL from Railway
2. Update Vercel frontend env: `VITE_API_URL=https://your-bff.railway.app`
3. Configure CORS in BFF when you build it
4. Set up monitoring/alerts in Railway dashboard
