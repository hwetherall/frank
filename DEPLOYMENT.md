# Deployment Guide

## Frontend - Vercel Deployment

### Via Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to frontend: `cd apps/frontend`
3. Run: `vercel`
4. Follow prompts:
   - Set up and deploy: Yes
   - Which scope: Your account
   - Link to existing project: No (first time)
   - Project name: frank-expert-frontend
   - Directory: ./ (current directory)
   - Build command: `npm run build`
   - Output directory: `dist`
   - Development command: `npm run dev`

### Environment Variables (Vercel)
Add these in Vercel dashboard:
- `VITE_GROQ_API_KEY`: Your Groq API keyll it deteche

## Backend - Railway Deployment

### Prerequisites
1. Create Railway account: https://railway.app
2. Install Railway CLI: `npm i -g @railway/cli`

### Deploy BFF Service
1. Create new project in Railway dashboard
2. Add service → Empty Service → Name it "BFF"
3. In service settings:
   - Root Directory: `/apps/bff`
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. Add environment variables:
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
   - `PORT`: 3000 (Railway will override with its own)
5. Deploy:
   ```bash
   cd apps/bff
   railway link
   railway up
   ```

### Deploy Worker Service
1. In same Railway project, add another service
2. Add service → Empty Service → Name it "Worker"
3. In service settings:
   - Root Directory: `/apps/worker`
   - Build Command: `npm run build`
   - Start Command: `npm start`
4. Add same environment variables as BFF
5. Deploy:
   ```bash
   cd apps/worker
   railway link
   railway up
   ```

### Deploy Redis (for future use)
1. In Railway project, add service → Database → Redis
2. Railway will automatically provision and configure Redis
3. Copy the `REDIS_URL` from Redis service
4. Add `REDIS_URL` to both BFF and Worker environment variables

## Testing Deployments

### Frontend (Vercel)
- Visit the URL provided by Vercel
- Should see your React app running

### BFF (Railway)
- Check logs in Railway dashboard
- Should see: "[BFF] Running at..." every minute
- Railway provides a public URL if needed

### Worker (Railway)
- Check logs in Railway dashboard
- Should see: "[Worker] Running at..." every minute

## Post-Deployment

### Update Frontend API URL
Once BFF is deployed:
1. Copy the Railway BFF URL
2. Add to Vercel environment variables:
   - `VITE_API_URL`: https://your-bff.railway.app

### Monitor Services
- Vercel: https://vercel.com/dashboard
- Railway: https://railway.app/dashboard
- Check logs for both services

## Troubleshooting

### Frontend Build Fails
- Check Node version compatibility
- Ensure all dependencies are in package.json
- Check for TypeScript errors: `npm run type-check`

### Backend Services Don't Start
- Check Railway logs for errors
- Ensure environment variables are set
- Verify nixpacks.toml is correct
- Check package.json scripts

### Connection Issues
- Verify environment variables
- Check CORS settings (will need to add in BFF)
- Ensure services are in same Railway project
