# Vercel Redeploy Steps - Force Clean Build

## Current Situation

✅ Framework is set to Vite in Vercel dashboard
✅ vercel.json is configured correctly
❌ Deployment is still serving old Next.js build (cached)

## The Problem

Even though you've changed the framework to Vite, Vercel is still serving the old Next.js build from cache. You need to force a completely clean rebuild.

## Solution: Force Clean Redeploy

### Method 1: Redeploy Without Cache (Recommended)

1. Go to Vercel Dashboard: https://vercel.com
2. Click on **"dad-frontend"** project
3. Click **"Deployments"** tab
4. Find the **latest deployment**
5. Click the **"..."** (three dots) menu on the right
6. Click **"Redeploy"**
7. **CRITICAL:** In the popup, **UNCHECK** "Use existing Build Cache"
8. Click **"Redeploy"** button
9. Wait 2-3 minutes for build to complete

### Method 2: Delete .vercel Cache and Redeploy

If Method 1 doesn't work:

1. Go to Vercel Dashboard
2. Click on **"dad-frontend"** project
3. Click **"Settings"** tab
4. Click **"General"** in sidebar
5. Scroll to **"Build & Development Settings"**
6. Click **"Clear Build Cache"** button
7. Go to **"Deployments"** tab
8. Click **"Redeploy"** on latest deployment
9. Uncheck "Use existing Build Cache"
10. Click **"Redeploy"**

### Method 3: Trigger New Deployment from Git

If Methods 1 & 2 don't work:

1. Make a small change to trigger new deployment:
   ```bash
   cd client
   echo "# Force rebuild" >> README.md
   git add README.md
   git commit -m "Force Vercel rebuild"
   git push origin main
   ```

2. Vercel will auto-deploy
3. Watch the build logs to ensure it uses Vite

### Method 4: Delete and Recreate Deployment (Last Resort)

If nothing else works:

1. Go to Vercel Dashboard
2. Click on **"dad-frontend"** project
3. Click **"Settings"** tab
4. Click **"General"** in sidebar
5. Scroll to bottom
6. Click **"Delete Project"**
7. Confirm deletion
8. Click **"Add New"** → **"Project"**
9. Import from GitHub: **"Dad-frontend"**
10. Vercel should auto-detect Vite (since vercel.json exists)
11. Add environment variable: `VITE_API_URL=https://dad-backend.onrender.com`
12. Click **"Deploy"**

## Verification

After redeployment, check:

### 1. Check Build Logs
Look for:
```
✅ vite v5.x.x building for production...
✅ dist/index.html
✅ dist/assets/index-xxxxx.js
```

NOT:
```
❌ next build
❌ .next directory
```

### 2. Test Homepage
```bash
curl -s https://dad-frontend.vercel.app/ | grep -o "type=\"module\"\|_next/static" | head -5
```

**Expected:** `type="module"` (Vite)
**NOT:** `_next/static` (Next.js)

### 3. Test Shareable Link
```bash
curl -I https://dad-frontend.vercel.app/shared-product/iw9imwd6
```

**Expected:** `HTTP/2 200` (not 404)

### 4. Test in Browser
Visit: https://dad-frontend.vercel.app/shared-product/iw9imwd6

**Expected:**
- Page loads (no 404)
- Product details display
- YouTube video shows
- No console errors

## Why This Happens

Vercel caches builds aggressively for performance. When you change the framework, the cache isn't automatically cleared. You must explicitly:
1. Uncheck "Use existing Build Cache" when redeploying, OR
2. Clear the build cache manually, OR
3. Trigger a completely new deployment

## Common Issues

### Issue: Still seeing Next.js after redeploy
**Solution:** Make sure you unchecked "Use existing Build Cache"

### Issue: Build fails with Vite
**Solution:** Check build logs for errors. Ensure `package.json` has correct build script:
```json
{
  "scripts": {
    "build": "vite build"
  }
}
```

### Issue: Environment variables not working
**Solution:** Add in Vercel dashboard:
- Settings → Environment Variables
- Add: `VITE_API_URL` = `https://dad-backend.onrender.com`
- Redeploy

## Expected Build Output

### Correct Vite Build
```
Running "npm run build"
> vite build

vite v5.4.11 building for production...
✓ 1847 modules transformed.
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-DcVIL6eh.js   678.19 kB │ gzip: 196.45 kB

✓ built in 12.34s
Build Completed in /vercel/output [15s]
```

### Wrong Next.js Build (What you're seeing now)
```
Running "next build"
Creating an optimized production build...
Compiled successfully
Linting and checking validity of types...
Creating an optimized production build...
✓ Compiled successfully
```

## Timeline

- **Redeploy:** 2-3 minutes
- **Build:** 1-2 minutes
- **Deployment:** 30 seconds
- **Total:** ~3-5 minutes

## Checklist

- [ ] Went to Vercel Dashboard
- [ ] Opened dad-frontend project
- [ ] Clicked Deployments tab
- [ ] Found latest deployment
- [ ] Clicked "..." menu
- [ ] Clicked "Redeploy"
- [ ] **UNCHECKED "Use existing Build Cache"** ← CRITICAL
- [ ] Clicked "Redeploy" button
- [ ] Waited for build to complete
- [ ] Checked build logs show "vite build"
- [ ] Tested homepage (no _next/static)
- [ ] Tested shareable link (returns 200)
- [ ] Cleared browser cache (Ctrl+Shift+R)
- [ ] Verified in browser

## Next Steps

After successful redeploy:

1. Test shareable link: https://dad-frontend.vercel.app/shared-product/iw9imwd6
2. Verify product details load
3. Check YouTube video displays
4. Test with lead tracking: `?leadId=bc363dc4-6c8a-43b3-80bb-068215616817`
5. Share with customers

---

**Status:** ⚠️ Waiting for clean redeploy
**Action Required:** Redeploy WITHOUT build cache
**Time Required:** 3-5 minutes
**Critical Step:** UNCHECK "Use existing Build Cache"

---

**Last Updated:** February 12, 2026
