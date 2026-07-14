# Run Database Migration on Render

## Error
```
Invalid `prisma_1.default.document.create()` invocation:
Column `fileData` does not exist in the current database.
```

## Cause
The database migration hasn't run on the production database yet. Render needs to execute the migration.

## Solution: Run Migration Manually on Render

### Option 1: Via Render Dashboard (Recommended)

1. Go to Render Dashboard: https://dashboard.render.com
2. Select your backend service (Dad-backend)
3. Go to **Shell** tab
4. Run this command:
   ```bash
   npx prisma migrate deploy
   ```
5. Wait for migration to complete
6. Restart the service if needed

### Option 2: Via Build Command

1. Go to Render Dashboard
2. Select your backend service
3. Go to **Settings** tab
4. Find **Build Command**
5. Update to:
   ```bash
   npm install && npx prisma generate && npx prisma migrate deploy
   ```
6. Click **Save Changes**
7. Trigger manual deploy

### Option 3: Add to package.json (Best for Future)

Update `server/package.json` to include migration in build:

```json
{
  "scripts": {
    "build": "tsc && npx prisma generate && npx prisma migrate deploy",
    "start": "node dist/index.js"
  }
}
```

Then redeploy.

## Verification

After running migration, check:

1. **In Render Shell:**
   ```bash
   npx prisma db execute --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'Document' AND column_name = 'fileData';"
   ```

2. **Test Upload:**
   - Upload a document in the CRM
   - Should succeed without 500 error
   - File should be accessible

## Migration SQL

The migration adds:
```sql
ALTER TABLE "Document" ADD COLUMN "fileData" BYTEA;
ALTER TABLE "Document" ALTER COLUMN "fileUrl" DROP NOT NULL;
```

## Quick Fix (Immediate)

If you need immediate access, run this in Render Shell:

```bash
# Connect to database and run migration
npx prisma migrate deploy

# Or manually run SQL
npx prisma db execute --stdin <<< "ALTER TABLE \"Document\" ADD COLUMN IF NOT EXISTS \"fileData\" BYTEA; ALTER TABLE \"Document\" ALTER COLUMN \"fileUrl\" DROP NOT NULL;"
```

## After Migration

1. Restart the Render service
2. Test file upload
3. Verify no more 500 errors
4. Check that files are accessible

## Prevention

To prevent this in future, ensure Render build command includes:
```bash
npm install && npx prisma generate && npx prisma migrate deploy && npm run build
```

This ensures migrations run automatically on every deployment.
