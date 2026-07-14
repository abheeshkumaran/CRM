# Test Document Upload to Database

## Quick Test Steps

### 1. Start the Server
```bash
cd server
npm run dev
```

### 2. Test Upload (using curl)
```bash
# Upload a test document
curl -X POST http://localhost:5001/api/upload/document \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "document=@/path/to/test.pdf" \
  -F "name=Test Document" \
  -F "category=brochure" \
  -F "description=Test upload"
```

Expected Response:
```json
{
  "message": "Document uploaded successfully",
  "url": "/uploads/documents/doc-1234567890.pdf",
  "originalName": "test.pdf",
  "size": 12345,
  "documentId": "uuid-here",
  "document": {
    "id": "uuid-here",
    "name": "Test Document",
    "fileUrl": "/uploads/documents/doc-1234567890.pdf",
    "fileType": "application/pdf",
    "fileSize": 12345,
    "category": "brochure",
    "createdAt": "2024-02-11T..."
  }
}
```

### 3. Verify in Database
```bash
# Connect to your database
psql -d your_database

# Check if document was saved
SELECT id, name, "fileUrl", category, "createdAt" 
FROM "Document" 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

### 4. Test Get Documents
```bash
# Get all documents
curl -X GET http://localhost:5001/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Test with Product Brochure

When creating/editing a product:
1. Upload the brochure using the upload endpoint
2. Get the `url` from the response
3. Use that URL in the product's `brochureUrl` field

The document will be:
- ✅ Saved to disk at `/uploads/documents/`
- ✅ Recorded in the database with metadata
- ✅ Accessible via static file serving
- ✅ Manageable via the documents API

## Verification Checklist

- [ ] Document file saved to disk
- [ ] Document record created in database
- [ ] Document ID returned in response
- [ ] File accessible via URL
- [ ] Document appears in GET /api/documents
- [ ] Can update document metadata
- [ ] Can filter documents by category
- [ ] Can link document to lead/contact/account/opportunity

## Common Issues

**Issue**: "Cannot find module documentController"
**Solution**: Run `npm run build` to compile TypeScript

**Issue**: "Document not saved to database"
**Solution**: Check database connection and ensure Prisma client is generated

**Issue**: "File not accessible"
**Solution**: Ensure server is running and static file middleware is configured
