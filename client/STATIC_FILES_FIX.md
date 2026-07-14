# Static Files Fix for Uploads

## Issue
Getting "Cannot GET /uploads/documents/doc-1770783331741-503032459.pdf" error

## Root Cause
The server needs to be rebuilt and restarted after the shareRoutes fix to ensure the static file serving is properly configured.

## Solution

### 1. Rebuild the server (already done)
```bash
cd server
npm run build
```

### 2. Restart your server
If running in development:
```bash
npm run dev
```

If running in production:
```bash
npm start
```

### 3. Access files correctly

**Development (localhost:5001):**
```
http://localhost:5001/uploads/documents/doc-1770783331741-503032459.pdf
```

**Production:**
```
https://dad-backend.onrender.com/uploads/documents/doc-1770783331741-503032459.pdf
```

## Verification

The static file serving is configured in `server/src/index.ts`:
```typescript
const staticPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(staticPath));
```

This means:
- When server runs from `dist/index.js`, `__dirname` is `dist`
- `path.join(__dirname, '../uploads')` resolves to `uploads/`
- Files are accessible at `/uploads/*`

## Frontend Integration

The `getAssetUrl()` function in `client/src/lib/utils.ts` handles this:
```typescript
export function getAssetUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;

    // In development
    if (import.meta.env.DEV) {
        return `http://localhost:5001${path}`;
    }

    // In production
    const backendUrl = import.meta.env.VITE_API_URL || 'https://dad-backend.onrender.com';
    return `${backendUrl}${path}`;
}
```

So when you call `getAssetUrl('/uploads/documents/file.pdf')`, it returns:
- Dev: `http://localhost:5001/uploads/documents/file.pdf`
- Prod: `https://dad-backend.onrender.com/uploads/documents/file.pdf`

## Important Notes

1. **Server must be running** for static files to be served
2. **CORS is configured** to allow frontend access
3. **File paths in DB** should be stored as `/uploads/documents/filename.pdf` (relative paths)
4. **Frontend uses getAssetUrl()** to convert relative paths to full URLs
