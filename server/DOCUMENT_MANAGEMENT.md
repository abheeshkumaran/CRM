# Document Management System

## Overview
Documents uploaded through the `/api/upload/document` endpoint are now automatically saved to the database with full metadata tracking and relationship management.

## Features

### 1. Automatic Database Storage
When a document is uploaded, it is:
- Saved to disk at `/uploads/documents/`
- Recorded in the database with full metadata
- Linked to the organization and user
- Optionally linked to leads, contacts, accounts, or opportunities

### 2. Document Metadata
Each document stores:
- **name**: Document name (defaults to original filename)
- **description**: Optional description
- **fileKey**: Unique filename on disk
- **fileUrl**: Relative URL path (e.g., `/uploads/documents/doc-xxx.pdf`)
- **fileType**: MIME type (e.g., `application/pdf`)
- **fileSize**: Size in bytes
- **category**: Document category (default: "other")
- **tags**: Array of tags for organization
- **Relationships**: Can be linked to leads, contacts, accounts, or opportunities

### 3. API Endpoints

#### Upload Document
```
POST /api/upload/document
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- document: File (required)
- name: string (optional, defaults to filename)
- description: string (optional)
- category: string (optional, default: "other")
- leadId: string (optional)
- contactId: string (optional)
- accountId: string (optional)
- opportunityId: string (optional)

Response:
{
  "message": "Document uploaded successfully",
  "url": "/uploads/documents/doc-1234567890.pdf",
  "originalName": "brochure.pdf",
  "size": 12345,
  "documentId": "uuid",
  "document": {
    "id": "uuid",
    "name": "Product Brochure",
    "fileUrl": "/uploads/documents/doc-1234567890.pdf",
    "fileType": "application/pdf",
    "fileSize": 12345,
    "category": "other",
    "createdAt": "2024-02-11T..."
  }
}
```

#### Get All Documents
```
GET /api/documents
Authorization: Bearer <token>

Query Parameters:
- leadId: Filter by lead
- contactId: Filter by contact
- accountId: Filter by account
- opportunityId: Filter by opportunity
- category: Filter by category
- search: Search in name and description

Response:
{
  "documents": [...],
  "total": 10
}
```

#### Get Single Document
```
GET /api/documents/:id
Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "name": "Document Name",
  "description": "...",
  "fileUrl": "/uploads/documents/...",
  "fileType": "application/pdf",
  "fileSize": 12345,
  "category": "other",
  "tags": [],
  "createdAt": "...",
  "createdBy": { ... },
  "lead": { ... },
  ...
}
```

#### Update Document
```
PUT /api/documents/:id
Authorization: Bearer <token>

Body:
{
  "name": "Updated Name",
  "description": "Updated description",
  "category": "contract",
  "tags": ["important", "2024"],
  "leadId": "uuid",
  "contactId": null,
  "accountId": null,
  "opportunityId": null
}

Response:
{
  "message": "Document updated successfully",
  "document": { ... }
}
```

#### Delete Document
```
DELETE /api/documents/:id
Authorization: Bearer <token>

Response:
{
  "message": "Document deleted successfully"
}
```

Note: This is a soft delete. The document is marked as deleted but not removed from disk.

## Usage Examples

### Upload a Product Brochure
```javascript
const formData = new FormData();
formData.append('document', file);
formData.append('name', 'Product Brochure 2024');
formData.append('description', 'Latest product catalog');
formData.append('category', 'brochure');

const response = await fetch('/api/upload/document', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
// Use data.url for the product brochureUrl field
```

### Link Document to a Lead
```javascript
const formData = new FormData();
formData.append('document', file);
formData.append('name', 'Contract');
formData.append('leadId', leadId);
formData.append('category', 'contract');

await fetch('/api/upload/document', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

### Get All Documents for a Lead
```javascript
const response = await fetch(`/api/documents?leadId=${leadId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

const { documents } = await response.json();
```

## Categories
Common document categories:
- `brochure` - Product brochures
- `contract` - Contracts and agreements
- `invoice` - Invoices and receipts
- `proposal` - Sales proposals
- `report` - Reports and analytics
- `presentation` - Presentation files
- `other` - Miscellaneous documents

## Integration with Products

When uploading a product brochure:
1. Upload the document via `/api/upload/document`
2. Get the `url` from the response
3. Use that URL in the product's `brochureUrl` field

The product doesn't need to store the document ID - it just stores the URL path, which is served by the static file middleware.

## Security

- All endpoints require authentication
- Documents are scoped to organizations
- Users can only access documents from their organization
- Soft delete prevents accidental data loss
- File uploads are validated by multer middleware

## Storage

- Physical files: `server/uploads/documents/`
- Database records: `Document` table in PostgreSQL
- Static file serving: `/uploads/*` routes
