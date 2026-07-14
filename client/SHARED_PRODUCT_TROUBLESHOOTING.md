# Shared Product Troubleshooting Guide

## Issue: Brochure and Video Not Showing

### Root Cause Analysis

The shared product page isn't showing brochures or videos because:

1. **Database has file references** - ProductShare records exist with brochureUrl and youtubeUrl
2. **Files don't exist locally** - The referenced files are on the production server, not in local development
3. **Environment mismatch** - You're viewing production database data but files are stored on production server

### Verification Steps

#### 1. Check Database Records
```bash
cd server
npx ts-node scripts/checkProductShare.ts
```

This shows:
- Which products have shares
- What brochure URLs are stored
- What YouTube URLs are configured

#### 2. Check File Existence
```bash
ls -lh uploads/documents/
```

If files are missing, they're on the production server.

#### 3. Check Browser Console
Open the shared product page and check console for:
- API response data
- Brochure URL construction
- Any 404 errors for missing files

### Solutions

#### Solution 1: Use Production Environment (Recommended for Testing)

Access the shared product link on production:
```
https://your-frontend-domain.com/shared-product/SLUG
```

The production server has the actual files.

#### Solution 2: Create Test Data Locally

1. **Upload a new product with brochure:**
```bash
# In your app, create a new product
# Upload a brochure file
# Generate a share link
```

2. **Or manually create test file:**
```bash
cd server/uploads/documents
echo "Test PDF content" > test-brochure.pdf
```

3. **Update product in database:**
```sql
UPDATE "Product" 
SET "brochureUrl" = '/uploads/documents/test-brochure.pdf'
WHERE id = 'YOUR_PRODUCT_ID';
```

4. **Generate new share link** for that product

#### Solution 3: Download Production Files (For Development)

If you need the actual files locally:

1. **From production server:**
```bash
# SSH into production
cd /path/to/server/uploads/documents
tar -czf documents.tar.gz *.pdf *.jpg *.png

# Download to local
scp user@production:/path/to/documents.tar.gz ./
```

2. **Extract locally:**
```bash
cd server/uploads/documents
tar -xzf documents.tar.gz
```

#### Solution 4: Fix Missing Files in Production

If files are missing in production too:

1. **Check if files were deleted:**
```bash
# On production server
ls -lh uploads/documents/
```

2. **Re-upload brochures:**
- Go to Products page
- Edit each product
- Re-upload the brochure
- Regenerate share links

### Testing the Fix

#### Test 1: Check API Response
```bash
# Get share data
curl http://localhost:5001/api/share/SLUG

# Should return:
{
  "product": {
    "name": "Product Name",
    "brochureUrl": "/uploads/documents/file.pdf",
    ...
  },
  "shareConfig": {
    "youtubeUrl": "https://youtu.be/...",
    "customTitle": "...",
    "customDescription": "..."
  }
}
```

#### Test 2: Check File Access
```bash
# Try to access the file directly
curl http://localhost:5001/uploads/documents/file.pdf

# Should return file content or 404 if missing
```

#### Test 3: Check Frontend
1. Open: `http://localhost:5173/shared-product/SLUG`
2. Open browser console
3. Check for:
   - API response logged
   - Brochure URL construction
   - Any 404 errors

### Common Issues

#### Issue: "Cannot GET /uploads/documents/..."
**Cause:** File doesn't exist on disk
**Fix:** Upload the file or use production environment

#### Issue: Video not showing
**Cause:** YouTube URL not saved or invalid format
**Fix:** 
- Check database: `SELECT "youtubeUrl" FROM "ProductShare" WHERE slug = 'SLUG'`
- Ensure URL format: `https://youtu.be/VIDEO_ID` or `https://www.youtube.com/watch?v=VIDEO_ID`

#### Issue: Brochure shows but video doesn't
**Cause:** YouTube URL is null or empty
**Fix:** Edit the share configuration and add a YouTube URL

#### Issue: Video shows but brochure doesn't
**Cause:** File missing or brochureUrl is null
**Fix:** Upload a brochure for the product

### Debug Checklist

- [ ] Database has ProductShare record with correct slug
- [ ] Product has brochureUrl set (not null)
- [ ] File exists at the brochureUrl path
- [ ] Static file serving is configured (`app.use('/uploads', express.static(...))`)
- [ ] Server is running
- [ ] Frontend is making request to correct API endpoint
- [ ] CORS is configured to allow frontend domain
- [ ] YouTube URL is in correct format (if using video)

### Quick Test Script

Create a test product with all features:

```typescript
// In your app or via API
const formData = new FormData();
formData.append('document', pdfFile);

// 1. Upload brochure
const uploadRes = await fetch('/api/upload/document', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
const { url: brochureUrl } = await uploadRes.json();

// 2. Create product
const productRes = await fetch('/api/products', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Test Product',
    basePrice: 999,
    brochureUrl: brochureUrl
  })
});
const { product } = await productRes.json();

// 3. Generate share link
const shareRes = await fetch(`/api/products/${product.id}/share`, {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
    customTitle: 'Amazing Product',
    customDescription: 'Check out this amazing product!'
  })
});
const { url: shareUrl } = await shareRes.json();

console.log('Share URL:', shareUrl);
// Visit this URL to test
```

### Production Deployment Checklist

When deploying to production:

- [ ] Ensure `uploads/` directory exists and is writable
- [ ] Configure persistent storage (not ephemeral filesystem)
- [ ] Set correct `CLIENT_URL` environment variable
- [ ] Verify static file serving is enabled
- [ ] Test file upload and access
- [ ] Test share link generation
- [ ] Test shared product page rendering

### Environment Variables

Ensure these are set correctly:

```env
# Backend (.env)
CLIENT_URL=https://your-frontend-domain.com
DATABASE_URL=postgresql://...

# Frontend (.env.production)
VITE_API_URL=https://your-backend-domain.com
```
