# Vercel Deployment Fix - Shared Product Routes

## Issue
Getting 404 errors when accessing shared product links on Vercel:
```
https://dad-frontend.vercel.app/shared-product/kr8h3l87?leadId=xxx
404 (Not Found)
```

## Root Cause
Vercel wasn't properly configured to handle client-side routing for React Router. When users directly access a route like `/shared-product/:slug`, Vercel tries to find that file on the server, which doesn't exist because it's a client-side route.

## Solution Applied

### 1. Updated `vercel.json`
Added explicit rewrite rules to handle all client-side routes:

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

This tells Vercel:
- Route `/shared-product/:slug` to `index.html`
- Route all other non-static paths to `index.html`
- Exclude API calls, Next.js assets, static files, and files with extensions

### 2. Added `public/_redirects`
Created a fallback redirect file for additional routing support:

```
/*    /index.html   200
```

This ensures all routes are handled by the React app.

## Deployment Steps

### 1. Push Changes to GitHub
```bash
cd client
git add vercel.json public/_redirects
git commit -m "Fix Vercel routing for shared product pages"
git push origin main
```

### 2. Vercel Will Auto-Deploy
Vercel is connected to your GitHub repository and will automatically:
1. Detect the push
2. Build the project
3. Deploy with the new configuration

### 3. Wait for Deployment
- Check Vercel dashboard: https://vercel.com/dashboard
- Wait for deployment to complete (usually 1-2 minutes)
- Look for "Deployment Complete" status

### 4. Test the Fix
Once deployed, test the shared product link:
```
https://dad-frontend.vercel.app/shared-product/kr8h3l87?leadId=bc363dc4-6c8a-43b3-80bb-068215616817
```

Should now work! ✅

## Verification Checklist

After deployment completes:

- [ ] Visit shared product link directly
- [ ] Check browser console for errors
- [ ] Verify product information loads
- [ ] Verify YouTube video displays
- [ ] Verify brochure displays
- [ ] Test with different slugs
- [ ] Test with and without leadId parameter

## Common Issues

### Issue: Still getting 404 after deployment
**Solution:** 
1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Wait a few minutes for CDN to update
3. Try in incognito/private window

### Issue: CSS not loading warning
**Solution:** This is a Vercel preload warning and doesn't affect functionality. Can be ignored.

### Issue: API calls failing
**Solution:** Check that backend URL is correct in `.env.production`:
```env
VITE_API_URL=https://dad-backend.onrender.com
```

## Testing Different Routes

All these should now work:

1. **Home page:**
   ```
   https://dad-frontend.vercel.app/
   ```

2. **Login page:**
   ```
   https://dad-frontend.vercel.app/login
   ```

3. **Shared product (without leadId):**
   ```
   https://dad-frontend.vercel.app/shared-product/kr8h3l87
   ```

4. **Shared product (with leadId):**
   ```
   https://dad-frontend.vercel.app/shared-product/kr8h3l87?leadId=xxx
   ```

5. **Privacy policy:**
   ```
   https://dad-frontend.vercel.app/privacy
   ```

## How It Works

### Before Fix:
```
User visits: /shared-product/kr8h3l87
    ↓
Vercel looks for: /shared-product/kr8h3l87.html
    ↓
Not found → 404 Error ❌
```

### After Fix:
```
User visits: /shared-product/kr8h3l87
    ↓
Vercel rewrites to: /index.html
    ↓
React Router handles: /shared-product/:slug
    ↓
SharedProductPage component renders ✅
```

## Vercel Configuration Explained

### `vercel.json` Rewrites
```json
{
    "source": "/shared-product/:slug",
    "destination": "/index.html"
}
```
- `source`: The URL pattern to match
- `:slug`: Dynamic parameter (matches any value)
- `destination`: Where to route the request

### Exclusion Pattern
```json
{
    "source": "/((?!api|_next|static|favicon.ico|.*\\..*).*)",
    "destination": "/index.html"
}
```
- `(?!...)`: Negative lookahead (exclude these patterns)
- `api`: Don't rewrite API calls
- `_next`: Don't rewrite Next.js assets
- `static`: Don't rewrite static files
- `.*\\..*`: Don't rewrite files with extensions (e.g., .js, .css, .png)

## Manual Deployment (If Needed)

If auto-deployment doesn't work:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd client
   vercel --prod
   ```

## Environment Variables

Ensure these are set in Vercel dashboard:

1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add:
   ```
   VITE_API_URL=https://dad-backend.onrender.com
   ```
3. Redeploy if you add/change variables

## Monitoring

### Check Deployment Status
```bash
vercel ls
```

### View Deployment Logs
```bash
vercel logs [deployment-url]
```

### Check Build Logs
Go to Vercel dashboard → Your project → Deployments → Click on deployment → View logs

## Success Indicators

✅ Deployment shows "Ready" status in Vercel dashboard
✅ Shared product link loads without 404
✅ Product information displays correctly
✅ YouTube video embeds and plays
✅ PDF brochure displays
✅ No console errors (except preload warning which is harmless)

## Next Steps

1. **Wait for auto-deployment** (1-2 minutes)
2. **Clear browser cache** and test
3. **Share the link** with your team/customers
4. **Monitor** for any issues

The fix has been pushed to GitHub and Vercel will automatically deploy it!
