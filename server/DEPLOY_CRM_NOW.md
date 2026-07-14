# Deploy Your CRM App to Vercel - Step by Step

## Current Situation

✅ **Backend API:** Working perfectly at `https://dad-backend.onrender.com`
✅ **Your CRM Code:** Ready in your local `client/` folder
❌ **Vercel Deployment:** Showing wrong app (sweepstakes)
❌ **Network Error:** Because wrong app is trying to connect to wrong API

## The Solution

Deploy YOUR CRM app to Vercel (it's not deployed yet!)

---

## Option 1: Deploy to New Vercel Project (Recommended - 5 minutes)

### Step 1: Push Your Code to GitHub (if not already)

```bash
cd client
git status
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Create New Vercel Project

1. Go to: https://vercel.com/new
2. Click **"Import Git Repository"**
3. Select your repository: **`dilshadbvoc-ui/Dad-frontend`**
4. Click **"Import"**

### Step 3: Configure Project

**Project Name:** `dad-crm` (or any name you want)

**Framework Preset:** Select **"Vite"** from dropdown

**Root Directory:** 
- If your repo has `client/` folder: Enter `client`
- If your repo IS the client folder: Leave blank

**Build Command:** `npm run build` (should auto-fill)

**Output Directory:** `dist` (should auto-fill)

**Environment Variables:** Click "Add" and enter:
```
Name: VITE_API_URL
Value: https://dad-backend.onrender.com
```

### Step 4: Deploy

Click **"Deploy"** button

Wait 2-3 minutes for build to complete.

### Step 5: Get Your URL

After deployment, you'll get a URL like:
```
https://dad-crm.vercel.app
```

Or:
```
https://dad-frontend-xxxxx.vercel.app
```

### Step 6: Test

Visit your new URL:
```
https://your-new-url.vercel.app/shared-product/iw9imwd6
```

Should now show your CRM product page!

### Step 7: Update Backend

Update your backend's `CLIENT_URL` environment variable:

1. Go to: https://render.com (or wherever your backend is hosted)
2. Find your `dad-backend` service
3. Go to Environment Variables
4. Update `CLIENT_URL` to your new Vercel URL
5. Save (backend will redeploy)

---

## Option 2: Fix Existing Project (If You Know Which One)

### Step 1: Find the Correct Project

1. Go to: https://vercel.com/dashboard
2. Look at ALL your projects
3. Find the one that should be your CRM

### Step 2: Check Git Connection

1. Click on the project
2. Go to **Settings** → **Git**
3. Check "Connected Git Repository"
4. If wrong, click "Disconnect" then reconnect correct repo

### Step 3: Force Clean Deploy

1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. **UNCHECK** "Use existing Build Cache"
5. Click **"Redeploy"**

### Step 4: Verify Build

Watch the build logs. Should see:
```
> vite build
✓ 1847 modules transformed.
dist/index.html
dist/assets/index-xxxxx.js
✓ built in 12s
```

NOT:
```
> next build
```

---

## Option 3: Delete Everything and Start Fresh (Nuclear Option)

### Step 1: Delete All Vercel Projects

1. Go to Vercel Dashboard
2. For each project showing wrong content:
   - Click project → Settings → General
   - Scroll to bottom → "Delete Project"
   - Confirm deletion

### Step 2: Create Fresh Project

Follow Option 1 steps above.

---

## Verification

After deployment, test these:

### Test 1: Homepage
```bash
curl -s https://your-vercel-url.vercel.app/ | grep "root"
```

Should show: `<div id="root"></div>`

### Test 2: API Connection
```bash
curl -I https://your-vercel-url.vercel.app/shared-product/iw9imwd6
```

Should return: `HTTP/2 200 OK`

### Test 3: In Browser

1. Visit: `https://your-vercel-url.vercel.app/`
2. Should see CRM login page
3. Visit: `https://your-vercel-url.vercel.app/shared-product/iw9imwd6`
4. Should see product details with YouTube video
5. Open DevTools (F12) → Console
6. Should see no "Network Error"

---

## Common Issues

### Issue: Build fails with "command not found"
**Solution:** Make sure `package.json` has:
```json
{
  "scripts": {
    "build": "tsc -b && vite build"
  }
}
```

### Issue: "Cannot find module"
**Solution:** Make sure all dependencies are in `package.json`, not just `devDependencies`

### Issue: Environment variable not working
**Solution:** 
- Variable name MUST start with `VITE_`
- Redeploy after adding variables
- Check in code: `import.meta.env.VITE_API_URL`

### Issue: Still showing sweepstakes
**Solution:** You're looking at the wrong project. Create a NEW project.

---

## Expected Build Output

### Correct Vite Build
```
Running "npm run build"
> client@0.0.0 build
> tsc -b && vite build

vite v5.4.11 building for production...
✓ 1847 modules transformed.
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-DcVIL6eh.js   678.19 kB │ gzip: 196.45 kB
✓ built in 12.34s

Build Completed in /vercel/output [15s]
Deploying outputs...
Deployment completed
```

### Wrong Next.js Build
```
Running "next build"
Creating an optimized production build...
Compiled successfully
```

---

## After Successful Deployment

1. **Save your new URL:**
   ```
   https://dad-crm.vercel.app/shared-product/iw9imwd6
   ```

2. **Update backend CLIENT_URL:**
   ```
   CLIENT_URL=https://dad-crm.vercel.app
   ```

3. **Test shareable links:**
   - Product details load ✓
   - YouTube video displays ✓
   - Seller contact shows ✓
   - No network errors ✓

4. **Share with customers!**

---

## Quick Start Commands

```bash
# 1. Make sure code is pushed
cd client
git push origin main

# 2. Go to Vercel
open https://vercel.com/new

# 3. Import repository
# 4. Select "Vite" framework
# 5. Add environment variable: VITE_API_URL=https://dad-backend.onrender.com
# 6. Deploy

# 7. Test
curl https://your-new-url.vercel.app/shared-product/iw9imwd6
```

---

## Summary

**Problem:** Wrong app deployed, causing network errors
**Solution:** Deploy YOUR CRM app to Vercel
**Time:** 5 minutes
**Result:** Working shareable links with product details

**Action:** Go to https://vercel.com/new and import your repository NOW!

---

**Last Updated:** February 12, 2026
**Backend:** ✅ Working at https://dad-backend.onrender.com
**Frontend:** ⏳ Needs deployment
