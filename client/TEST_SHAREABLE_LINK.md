# Test Shareable Link - Complete Verification Guide

## Prerequisites

Before testing, ensure:
1. ✅ Backend server is running on port 5001
2. ✅ Frontend dev server is running on port 5173
3. ✅ Database is connected and has test data
4. ✅ `.env.development` has correct API URL: `VITE_API_URL=http://localhost:5001`

## Step 1: Start the Servers

### Terminal 1 - Backend Server
```bash
cd server
npm run dev
```

Wait for: `Server running on port 5001`

### Terminal 2 - Frontend Server
```bash
cd client
npm run dev
```

Wait for: `Local: http://localhost:5173/`

## Step 2: Create Test Data (If Needed)

If you don't have a test share link yet:

```bash
cd server
npx ts-node scripts/createTestProductShare.ts
```

This will output a slug like: `kr8h3l87`

## Step 3: Test the API Endpoint

### Test 1: Check API Response
```bash
curl http://localhost:5001/api/share/kr8h3l87
```

**Expected Response:**
```json
{
  "product": {
    "id": "...",
    "name": "Lovely Professional University",
    "description": "Customer Relationship Management",
    "basePrice": 12000,
    "currency": "INR",
    "category": "education",
    "brochureUrl": "/uploads/documents/test-brochure-xxxxx.pdf",
    ...
  },
  "seller": {
    "firstName": "IITS",
    "lastName": "RPS",
    "id": "...",
    "email": "iits@iitseducation.org"
  },
  "shareConfig": {
    "youtubeUrl": "https://youtu.be/dQw4w9WgXcQ",
    "customTitle": "Amazing Test Product",
    "customDescription": "This is a test product with both brochure and video..."
  }
}
```

### Test 2: Check Brochure File Access
```bash
curl -I http://localhost:5001/uploads/documents/test-brochure-xxxxx.pdf
```

**Expected:** `HTTP/1.1 200 OK`

## Step 4: Test the Frontend

### Open the Shareable Link
Visit: http://localhost:5173/shared-product/kr8h3l87

### Verification Checklist

#### Page Load
- [ ] Page loads without errors
- [ ] No 404 error
- [ ] No console errors (check browser DevTools)

#### Header Section
- [ ] "DadCRM" logo displays
- [ ] Header is sticky on scroll

#### YouTube Video Section
- [ ] YouTube video is embedded and visible
- [ ] Video is in 16:9 aspect ratio
- [ ] Video plays when clicked
- [ ] Video URL: https://youtu.be/dQw4w9WgXcQ

#### Product Information
- [ ] Custom title displays: "Amazing Test Product"
- [ ] Seller name displays: "IITS RPS"
- [ ] Price displays: ₹12,000.00 (INR format)
- [ ] Custom description displays correctly

#### Brochure Section
- [ ] "Product Brochure" heading displays
- [ ] PDF preview iframe loads
- [ ] Hover shows "Download Full PDF" button
- [ ] Download button works (opens PDF in new tab)
- [ ] PDF URL is correct: http://localhost:5001/uploads/documents/test-brochure-xxxxx.pdf

#### Contact Seller Section
- [ ] Seller initials avatar displays: "IR"
- [ ] Seller name displays: "IITS RPS"
- [ ] "Sales Representative" label shows
- [ ] "Send Email" button displays
- [ ] "Request Call" button displays

#### Responsive Design
- [ ] Layout works on desktop (1920px)
- [ ] Layout works on tablet (768px)
- [ ] Layout works on mobile (375px)
- [ ] Video maintains aspect ratio on all sizes
- [ ] Brochure is readable on all sizes

## Step 5: Test with Lead Tracking

### Create a Lead-Specific Link
1. Go to: http://localhost:5173/products
2. Click "Share" on a product
3. Select a lead from the dropdown
4. Click "Generate Link"
5. Copy the link (it will have `?leadId=xxx`)

### Test Lead Tracking
```bash
# Visit the link with leadId
http://localhost:5173/shared-product/kr8h3l87?leadId=LEAD_UUID
```

**Expected:**
- Page loads normally
- Seller receives notification: "Lead Name viewed your product..."
- View count increments

## Step 6: Browser Console Verification

Open browser DevTools (F12) and check:

### Console Logs
```
Fetching shared product: /share/kr8h3l87
API Base URL: http://localhost:5001/api
Full URL: http://localhost:5001/api/share/kr8h3l87
Shared product response: {product: {...}, seller: {...}, shareConfig: {...}}
Product brochure URL: /uploads/documents/test-brochure-xxxxx.pdf
Constructed brochure URL: http://localhost:5001/uploads/documents/test-brochure-xxxxx.pdf
```

### Network Tab
- [ ] GET `/api/share/kr8h3l87` returns 200 OK
- [ ] GET `/uploads/documents/test-brochure-xxxxx.pdf` returns 200 OK
- [ ] YouTube iframe loads successfully
- [ ] No 404 errors

## Step 7: Test Different Scenarios

### Scenario 1: Product with Only Brochure (No Video)
1. Create a product without YouTube URL
2. Generate share link
3. Verify:
   - [ ] Product image/name shows at top (no video)
   - [ ] Brochure section displays correctly
   - [ ] Layout adjusts properly

### Scenario 2: Product with Only Video (No Brochure)
1. Create a product with YouTube URL but no brochure
2. Generate share link
3. Verify:
   - [ ] Video displays at top
   - [ ] No brochure section shows
   - [ ] No errors in console

### Scenario 3: Product with Neither
1. Create a product without video or brochure
2. Generate share link
3. Verify:
   - [ ] Product name shows in header area
   - [ ] Description displays
   - [ ] No errors

### Scenario 4: Invalid Slug
Visit: http://localhost:5173/shared-product/invalid-slug-123

**Expected:**
- [ ] Shows "Product Not Found" error page
- [ ] Error message displays
- [ ] No console errors

## Step 8: Test YouTube URL Formats

The page should support multiple YouTube URL formats:

```javascript
// Test these URLs in share config:
https://youtu.be/dQw4w9WgXcQ
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://www.youtube.com/embed/dQw4w9WgXcQ
```

All should embed correctly as: `https://www.youtube.com/embed/dQw4w9WgXcQ`

## Step 9: Test PDF Brochure Features

### PDF Preview
- [ ] PDF loads in iframe
- [ ] PDF is readable (not too small)
- [ ] PDF toolbar is hidden (`#toolbar=0`)

### PDF Download
- [ ] Hover over PDF shows overlay
- [ ] "Download Full PDF" button appears
- [ ] Click opens PDF in new tab
- [ ] PDF downloads correctly

### Image Brochure (Alternative)
If brochure is an image (.jpg, .png):
- [ ] Image displays inline
- [ ] "Download Image" button shows
- [ ] Download works correctly

## Step 10: Performance Check

### Load Time
- [ ] Page loads in < 2 seconds
- [ ] API response in < 500ms
- [ ] Brochure loads in < 1 second
- [ ] YouTube embed loads smoothly

### Optimization
- [ ] Images are optimized
- [ ] No unnecessary re-renders
- [ ] Smooth scrolling
- [ ] No layout shifts

## Common Issues & Solutions

### Issue 1: 404 Error on Share Link
**Symptoms:** Page shows "Product Not Found"

**Solutions:**
1. Check server is running: `curl http://localhost:5001/health`
2. Verify API URL in `.env.development`: `VITE_API_URL=http://localhost:5001`
3. Restart frontend dev server
4. Check slug exists in database

### Issue 2: Brochure Not Loading
**Symptoms:** Brochure section shows but PDF doesn't load

**Solutions:**
1. Check file exists: `ls server/uploads/documents/`
2. Test direct access: `curl -I http://localhost:5001/uploads/documents/filename.pdf`
3. Verify static file serving in `server/src/index.ts`
4. Check file permissions

### Issue 3: YouTube Video Not Showing
**Symptoms:** Video section is blank or shows error

**Solutions:**
1. Check YouTube URL format in database
2. Verify `getEmbedUrl()` function extracts video ID correctly
3. Check browser console for iframe errors
4. Test video ID directly: `https://www.youtube.com/embed/VIDEO_ID`

### Issue 4: CORS Errors
**Symptoms:** Console shows CORS policy errors

**Solutions:**
1. Check `server/src/index.ts` CORS configuration
2. Verify `http://localhost:5173` is in allowed origins
3. Restart backend server
4. Clear browser cache

### Issue 5: Seller Info Not Showing
**Symptoms:** Contact section is empty or shows errors

**Solutions:**
1. Check API response includes `seller` object
2. Verify seller user exists in database
3. Check `seller.firstName` and `seller.lastName` are not null

## Production Testing

After fixing development, test on production:

### Vercel Deployment
1. Ensure Framework Preset is "Vite" (not Next.js)
2. Deploy to Vercel
3. Test: `https://dad-frontend.vercel.app/shared-product/SLUG`

### Production Checklist
- [ ] Share link works on production
- [ ] Brochure loads from production server
- [ ] YouTube video embeds correctly
- [ ] Seller contact info displays
- [ ] Lead tracking works
- [ ] Notifications are sent
- [ ] Mobile responsive
- [ ] No console errors

## Debug Commands

### Check Database
```bash
cd server
npx prisma studio
# Navigate to ProductShare table
# Verify slug, youtubeUrl, customTitle exist
```

### Check Server Logs
```bash
cd server
npm run dev
# Watch for API requests and errors
```

### Check Frontend Logs
```bash
cd client
npm run dev
# Open browser DevTools → Console
# Watch for API calls and responses
```

### Test API Directly
```bash
# Get share data
curl http://localhost:5001/api/share/SLUG | jq

# Check brochure
curl -I http://localhost:5001/uploads/documents/FILENAME.pdf

# Test with leadId
curl "http://localhost:5001/api/share/SLUG?leadId=LEAD_UUID" | jq
```

## Success Criteria

The shareable link is working correctly when:

✅ Page loads without errors
✅ YouTube video embeds and plays
✅ PDF brochure displays and can be downloaded
✅ Product information shows correctly
✅ Seller contact section displays
✅ Custom title and description override defaults
✅ Lead tracking works (when leadId provided)
✅ Notifications are sent to seller
✅ View count increments
✅ Responsive on all devices
✅ No console errors
✅ Works in production

## Next Steps

After verification:
1. Test with real product data
2. Share link with actual customers
3. Monitor view counts and notifications
4. Gather feedback on UX
5. Optimize performance if needed

---

**Last Updated:** February 12, 2026
**Test Environment:** Development (localhost)
**Test Slug:** kr8h3l87
