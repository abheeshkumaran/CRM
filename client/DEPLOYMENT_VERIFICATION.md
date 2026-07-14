# Deployment Verification & Troubleshooting

## Current Issue
Still seeing 404 errors and `_next` references (which shouldn't exist in a Vite app).

## Possible Causes

1. **Deployment hasn't completed yet** - Wait 2-5 minutes
2. **Browser cache** - Old version cached
3. **CDN cache** - Vercel CDN hasn't updated
4. **Build configuration issue** - Vercel might be detecting wrong framework

## Immediate Steps

### 1. Check Deployment Status

Visit your Vercel dashboard:
```
https://vercel.com/dashboard
```

Look for:
- ✅ "Ready" status (green checkmark)
- ⏳ "Building" status (wait for it to complete)
- ❌ "Error" status (check build logs)

### 2. Force Clear Cache

**In Browser:**
```
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"
```

**Or use Incognito/Private Window:**
```
Ctrl+Shift+N (Windows)
Cmd+Shift+N (Mac)
```

### 3. Check Build Logs

1. Go to Vercel dashboard
2. Click on your project
3. Click "Deployments"
4. Click on the latest deployment
5. Check "Build Logs" for errors

## Verify Vercel Configuration

### Check Framework Detection

Vercel should detect: **Vite**

If it's detecting Next.js, that's the problem!

**To fix:**
1. Go to Vercel dashboard
2. Project Settings → General
3. Framework Preset: Select "Vite"
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Install Command: `npm install`

### Check Environment Variables

Ensure this is set:
```
VITE_API_URL=https://dad-backend.onrender.com
```

## Force New Deployment

If the issue persists, force a new deployment:

### Method 1: Trigger via Git (Recommended)

```bash
cd client

# Make a small change to force rebuild
echo "# Deployment trigger" >> README.md

git add README.md
git commit -m "Force Vercel rebuild"
git push origin main
```

### Method 2: Redeploy from Vercel Dashboard

1. Go to Vercel dashboard
2. Click on your project
3. Go to "Deployments"
4. Click "..." on latest deployment
5. Click "Redeploy"
6. Select "Use existing Build Cache: No"

### Method 3: Use Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd client
vercel --prod --force
```

## Verify Build Output

After deployment completes, check:

### 1. Test the URL
```
https://dad-frontend.vercel.app/shared-product/kr8h3l87
```

### 2. Check Network Tab
Open DevTools → Network tab:
- Should see `index.html` loaded (200 OK)
- Should see Vite assets (not `_next` assets)
- Should see API calls to backend

### 3. Check Console
Should NOT see:
- ❌ 404 errors for `_next` files
- ❌ "Failed to load resource" errors

Should see:
- ✅ "Fetching shared product" log
- ✅ "Shared product response" log
- ✅ Product data in console

## Common Issues & Solutions

### Issue: Still seeing `_next` references
**Cause:** Vercel thinks it's a Next.js app
**Solution:** 
1. Check Framework Preset in Vercel settings
2. Ensure it's set to "Vite" not "Next.js"
3. Redeploy

### Issue: 404 on shared-product route
**Cause:** Routing configuration not applied
**Solution:**
1. Verify `vercel.json` is in repository root
2. Check file is committed: `git ls-files | grep vercel.json`
3. Redeploy

### Issue: Deployment succeeds but still 404
**Cause:** CDN cache
**Solution:**
1. Wait 5-10 minutes for CDN to update
2. Clear browser cache
3. Try different browser/incognito

### Issue: Build fails
**Cause:** Build errors
**Solution:**
1. Check build logs in Vercel dashboard
2. Test build locally: `npm run build`
3. Fix any errors
4. Push and redeploy

## Test Locally First

Before debugging Vercel, ensure it works locally:

```bash
cd client

# Build production version
npm run build

# Preview production build
npm run preview

# Test the URL
# Should open: http://localhost:4173
# Visit: http://localhost:4173/shared-product/kr8h3l87
```

If it works locally but not on Vercel, it's a deployment configuration issue.

## Vercel Configuration Files

Ensure these files exist and are committed:

### `vercel.json` (in client root)
```json
{
    "rewrites": [
        {
            "source": "/shared-product/:slug",
            "destination": "/index.html"
        },
        {
            "source": "/((?!api|_next|static|favicon.ico|.*\\..*).*)",
            "destination": "/index.html"
        }
    ]
}
```

### `public/_redirects` (in client/public)
```
/*    /index.html   200
```

### Verify files are committed:
```bash
cd client
git ls-files | grep -E "(vercel.json|_redirects)"
```

Should show:
```
vercel.json
public/_redirects
```

## Check Vercel Project Settings

1. **Framework Preset:** Vite
2. **Build Command:** `npm run build` or `vite build`
3. **Output Directory:** `dist`
4. **Install Command:** `npm install`
5. **Node Version:** 18.x or 20.x

## Debug Checklist

- [ ] Deployment shows "Ready" status
- [ ] Framework is set to "Vite" (not Next.js)
- [ ] `vercel.json` exists and is committed
- [ ] `public/_redirects` exists and is committed
- [ ] Environment variables are set
- [ ] Build logs show no errors
- [ ] Tested in incognito/private window
- [ ] Waited 5+ minutes for CDN cache
- [ ] Tested local production build

## Get Help

If still not working:

1. **Check build logs** in Vercel dashboard
2. **Share the error** from build logs
3. **Verify framework detection** in project settings
4. **Try manual deployment** with Vercel CLI

## Expected Behavior

When working correctly:

1. Visit: `https://dad-frontend.vercel.app/shared-product/kr8h3l87`
2. Browser requests: `/shared-product/kr8h3l87`
3. Vercel rewrites to: `/index.html`
4. React app loads
5. React Router handles: `/shared-product/:slug`
6. SharedProductPage component renders
7. API call to backend: `https://dad-backend.onrender.com/api/share/kr8h3l87`
8. Product data displays

## Quick Fix Command

Run this to force a fresh deployment:

```bash
cd client
echo "# Force rebuild $(date)" >> README.md
git add README.md
git commit -m "Force Vercel rebuild - $(date)"
git push origin main
```

Then wait 2-3 minutes and test again.
