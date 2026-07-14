# Database Storage Migration - Complete

## Overview
Migrated file storage from Cloudinary/Local filesystem to PostgreSQL database storage. Files are now stored as binary data (BYTEA) directly in the database, making them persistent across deployments without needing external services.

## Changes Made

### 1. Schema Changes (`server/prisma/schema.prisma`)
```prisma
model Document {
  fileData  Bytes?   // NEW: Binary file data stored in database
  fileUrl   String?  // Changed to optional for backward compatibility
  // ... other fields
}
```

### 2. Upload Controller (`server/src/controllers/uploadController.ts`)
- **uploadDocument()**: Now stores file buffer in `fileData` field
- **uploadGenericImage()**: Now stores image buffer in `fileData` field
- Returns API endpoint URL: `/api/documents/{id}/download`

### 3. Document Controller (`server/src/controllers/documentController.ts`)
- **NEW: downloadDocument()**: Serves files from database
  - Retrieves binary data from `fileData` field
  - Sets appropriate Content-Type headers
  - Sends file with inline disposition
  - Caches for 1 year

### 4. Upload Routes (`server/src/routes/uploadRoutes.ts`)
- Removed Cloudinary configuration
- Removed local disk storage
- **NEW: Memory Storage**: Uses `multer.memoryStorage()`
  - Files stored in memory as Buffer
  - Directly saved to database
  - No temporary files on disk

### 5. Document Routes (`server/src/routes/documentRoutes.ts`)
- **NEW: GET /api/documents/:id/download**: Download file from database

### 6. Database Migration
```sql
-- Migration: 20260213_add_file_data_to_documents
ALTER TABLE "Document" ADD COLUMN "fileData" BYTEA;
ALTER TABLE "Document" ALTER COLUMN "fileUrl" DROP NOT NULL;
```

## Benefits

### ✅ Persistent Storage
- Files survive server restarts
- Files survive deployments
- No external service dependencies

### ✅ Simplified Architecture
- No Cloudinary configuration needed
- No local filesystem management
- Single source of truth (database)

### ✅ Transactional Integrity
- File and metadata in same transaction
- No orphaned files
- Atomic operations

### ✅ Easy Backup/Restore
- Files included in database backups
- Single backup process
- Easy disaster recovery

## Considerations

### Database Size
- Files stored as BYTEA in PostgreSQL
- 10MB limit per document
- 5MB limit per image
- 50MB limit per recording

### Performance
- Suitable for small to medium files
- PostgreSQL handles BYTEA efficiently
- Caching headers reduce repeated downloads
- Consider CDN for high-traffic scenarios

### Storage Limits
- Monitor database size
- PostgreSQL can handle GBs of binary data
- AWS RDS has storage limits based on plan

## API Changes

### Upload Response (Before)
```json
{
  "url": "https://res.cloudinary.com/xxx/image/upload/v123/file.pdf"
}
```

### Upload Response (After)
```json
{
  "url": "/api/documents/uuid-here/download",
  "documentId": "uuid-here"
}
```

### Download Endpoint
```
GET /api/documents/:id/download
```

Response:
- Binary file data
- Content-Type: application/pdf (or appropriate type)
- Content-Disposition: inline; filename="original.pdf"
- Cache-Control: public, max-age=31536000

## Migration Steps

### For Existing Files
Existing files with `fileUrl` pointing to local/Cloudinary paths will:
1. Still have their URLs in database
2. Return 404 if accessed (ephemeral storage cleared)
3. Need to be re-uploaded to store in database

### For New Files
All new uploads automatically:
1. Store binary data in `fileData` field
2. Set `fileUrl` to null
3. Return download API endpoint

## Testing

### Upload Document
```bash
curl -X POST http://localhost:5001/api/upload/document \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@file.pdf" \
  -F "name=Test Document"
```

Response:
```json
{
  "message": "Document uploaded successfully",
  "url": "/api/documents/abc-123/download",
  "documentId": "abc-123"
}
```

### Download Document
```bash
curl http://localhost:5001/api/documents/abc-123/download \
  -o downloaded.pdf
```

## Deployment

### Backend (Render)
1. Push changes to GitHub
2. Render auto-deploys
3. Migration runs automatically
4. Server logs show: `📁 File storage: Database (Persistent)`

### Database Migration
Migration runs automatically on deployment via Prisma:
```bash
npx prisma migrate deploy
```

## Rollback Plan

If issues occur, rollback by:
1. Revert schema changes
2. Revert controller changes
3. Re-enable Cloudinary/local storage
4. Run migration to remove `fileData` column

## Future Enhancements

### Possible Improvements
1. **Compression**: Compress files before storing
2. **Chunking**: Stream large files in chunks
3. **CDN**: Add CDN layer for frequently accessed files
4. **Thumbnails**: Generate and store thumbnails for images
5. **Virus Scanning**: Scan files before storing

### When to Consider External Storage
- Files > 50MB regularly
- Very high download traffic
- Need global CDN distribution
- Database size becomes concern

## Summary

✅ Files now stored in PostgreSQL database
✅ No external dependencies (Cloudinary, S3, etc.)
✅ Persistent across deployments
✅ Simplified architecture
✅ Easy backup/restore
✅ Transactional integrity

Files are now truly persistent and will never disappear due to ephemeral storage issues.
