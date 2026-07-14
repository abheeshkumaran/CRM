# Cloudinary Setup for Persistent File Storage

## Problem
Render uses ephemeral storage, meaning all uploaded files (images, documents, recordings) are deleted when the server restarts. This causes 404 errors for user profile images and other uploaded content.

## Solution
We've integrated Cloudinary for persistent cloud storage with automatic fallback to local storage.

## Setup Instructions

### 1. Create Cloudinary Account
1. Go to https://cloudinary.com/users/register/free
2. Sign up for a free account (25GB storage, 25GB bandwidth/month)
3. Verify your email

### 2. Get API Credentials
1. Log in to Cloudinary dashboard
2. Go to Dashboard → Account Details
3. Copy these values:
   - Cloud Name
   - API Key
   - API Secret

### 3. Add Environment Variables to Render

Go to your Render dashboard → Backend service → Environment:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Deploy
Once you add the environment variables, Render will automatically redeploy. The system will detect Cloudinary configuration and use it for all uploads.

## How It Works

### Automatic Detection
The system automatically detects if Cloudinary is configured:
- ✅ If configured: All uploads go to Cloudinary (persistent)
- ❌ If not configured: Falls back to local storage (ephemeral)

### File Types Supported
- **Images**: Profile pictures, product images (5MB limit)
- **Documents**: PDFs, brochures (10MB limit)
- **Recordings**: Call recordings (50MB limit)

### Storage Locations
When using Cloudinary, files are organized in folders:
- `crm/images/` - User avatars, product images
- `crm/documents/` - PDFs, brochures
- `crm/recordings/` - Call recordings

### URL Format
- **Cloudinary**: `https://res.cloudinary.com/your_cloud_name/image/upload/v1234567890/crm/images/abc123.jpg`
- **Local**: `/uploads/images/img-1234567890-123456789.jpg`

The frontend automatically handles both formats.

## Benefits

1. **Persistent Storage**: Files survive server restarts
2. **CDN Delivery**: Fast global content delivery
3. **Image Optimization**: Automatic resizing and format conversion
4. **Free Tier**: 25GB storage, 25GB bandwidth/month
5. **Automatic Fallback**: Works without configuration (local storage)

## Verification

After setup, check the server logs on startup:
```
📁 File storage: Cloudinary (Cloud)
```

If not configured, you'll see:
```
📁 File storage: Local (Ephemeral)
```

## Migration

Existing files in local storage won't be automatically migrated. New uploads will use Cloudinary. To migrate existing files:

1. Download files from database records
2. Re-upload through the API
3. Update database records with new URLs

## Free Tier Limits

Cloudinary Free Tier includes:
- 25 GB storage
- 25 GB bandwidth/month
- 25,000 transformations/month
- Unlimited image and video transformations

This is sufficient for most small to medium CRM deployments.

## Troubleshooting

### Images still showing 404
1. Check environment variables are set in Render
2. Verify Cloudinary credentials are correct
3. Check server logs for "Cloudinary (Cloud)" message
4. Re-upload images after configuration

### Upload fails
1. Check file size limits
2. Verify Cloudinary account is active
3. Check API credentials are correct
4. Review server logs for error messages
