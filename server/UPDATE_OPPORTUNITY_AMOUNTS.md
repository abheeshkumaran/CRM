# Update Opportunity Amounts - Fix Existing Data

## Issue

Opportunities that were converted from leads BEFORE the auto-calculation fix show ₹0.00 in the opportunities list, even though they have products associated with them.

### Why This Happened

1. **Before the fix**: Opportunities were created with `amount: 0` during lead conversion
2. **After the fix**: New conversions calculate amount from products automatically
3. **Existing data**: Old opportunities still have `amount: 0` in the database

## Solution

Two approaches to fix this:

### Option 1: Run Database Update Script (Recommended)

This script will automatically update all opportunities that have ₹0.00 but have products.

#### Steps:

1. **SSH into your Render backend** or run locally with production database connection

2. **Run the script**:
   ```bash
   cd server
   npx ts-node scripts/updateOpportunityAmounts.ts
   ```

3. **What it does**:
   - Finds all opportunities with `amount = 0`
   - Checks if they have associated account products
   - Calculates total from products (quantity × price)
   - Updates the opportunity amount
   - Shows summary of updates

#### Expected Output:

```
🔍 Finding opportunities with zero amount that have products...

Found 5 opportunities with zero amount

✅ Updated Deal - IITS (ebd86dc8-4a00-488d-9c8e-f8bd6f14ce80)
   Old Amount: ₹0.00
   New Amount: ₹50000.00
   Products: 1

✅ Updated Deal - Acme Corp (abc123...)
   Old Amount: ₹0.00
   New Amount: ₹125000.00
   Products: 3

⏭️  Skipping Deal - Test (xyz789...) - No products

📊 Summary:
   Total opportunities checked: 5
   Updated: 2
   Skipped: 3

✅ Done!
```

### Option 2: Manual Update via Database

If you can't run the script, update manually:

```sql
-- Find opportunities with zero amount that have products
SELECT 
    o.id,
    o.name,
    o.amount,
    COUNT(ap.id) as product_count,
    SUM(ap.quantity * p."basePrice") as calculated_amount
FROM "Opportunity" o
JOIN "Account" a ON o."accountId" = a.id
LEFT JOIN "AccountProduct" ap ON a.id = ap."accountId"
LEFT JOIN "Product" p ON ap."productId" = p.id
WHERE o.amount = 0 
  AND o."isDeleted" = false
GROUP BY o.id, o.name, o.amount
HAVING COUNT(ap.id) > 0;

-- Update each opportunity (replace ID and amount)
UPDATE "Opportunity"
SET amount = 50000  -- Replace with calculated amount
WHERE id = 'ebd86dc8-4a00-488d-9c8e-f8bd6f14ce80';  -- Replace with opportunity ID
```

### Option 3: Re-convert Leads (Not Recommended)

You could delete the opportunities and re-convert the leads, but this would lose:
- Opportunity history
- Stage changes
- Notes and interactions
- Time tracking

**Not recommended unless absolutely necessary.**

## Running the Script on Render

### Method 1: Via Render Shell (If Available)

1. Go to Render Dashboard
2. Select your backend service
3. Click "Shell" tab
4. Run:
   ```bash
   cd /opt/render/project/src
   npx ts-node scripts/updateOpportunityAmounts.ts
   ```

### Method 2: Via One-Time Job

1. Create a new "Background Worker" or "Cron Job" in Render
2. Set command: `npx ts-node scripts/updateOpportunityAmounts.ts`
3. Run once
4. Delete the job after completion

### Method 3: Locally with Production Database

1. **Get DATABASE_URL** from Render environment variables
2. **Set locally**:
   ```bash
   export DATABASE_URL="postgresql://..."
   ```
3. **Run script**:
   ```bash
   cd server
   npx ts-node scripts/updateOpportunityAmounts.ts
   ```

## Verification

After running the script:

1. **Check Opportunities List**:
   - Go to Opportunities page
   - Find opportunities that were showing ₹0.00
   - Should now show correct amounts

2. **Check Opportunity Details**:
   - Click "View Details" on an opportunity
   - Amount should match total product value
   - Products should be listed

3. **Check Database**:
   ```sql
   SELECT id, name, amount 
   FROM "Opportunity" 
   WHERE amount > 0 
   ORDER BY "createdAt" DESC 
   LIMIT 10;
   ```

## Prevention

This issue won't happen for NEW conversions because:

1. ✅ Lead conversion now calculates amount from products
2. ✅ Priority: Manual amount → potentialValue → calculated from products → 0
3. ✅ Products are included in lead query during conversion
4. ✅ Amount is set before opportunity creation

## Script Safety

The script is safe because:

- ✅ Only updates opportunities with `amount = 0`
- ✅ Only updates if products exist
- ✅ Only updates if calculated amount > 0
- ✅ Doesn't delete or modify products
- ✅ Doesn't affect other opportunity fields
- ✅ Shows preview before updating
- ✅ Can be run multiple times safely (idempotent)

## Rollback

If you need to rollback (unlikely):

```sql
-- Reset specific opportunity
UPDATE "Opportunity"
SET amount = 0
WHERE id = 'opportunity-id-here';

-- Or reset all updated opportunities (if needed)
UPDATE "Opportunity"
SET amount = 0
WHERE amount > 0 
  AND "createdAt" < '2026-02-13';  -- Adjust date as needed
```

## Files

- **Script**: `server/scripts/updateOpportunityAmounts.ts`
- **Backend Logic**: `server/src/controllers/leadController.ts` (convertLead function)
- **Frontend Display**: `client/src/pages/opportunities/columns.tsx`

## Summary

**Problem**: Existing opportunities show ₹0.00 even though they have products
**Cause**: Created before auto-calculation fix was implemented
**Solution**: Run update script to recalculate amounts from products
**Impact**: All opportunities will show correct amounts in list and detail views
**Safety**: Script only updates zero-amount opportunities with products
**Time**: Takes ~1 second per 100 opportunities

---

**Created**: February 13, 2026
**Status**: Script ready to run
**Action Required**: Run script on Render or locally with production database
**Expected Result**: All opportunities show correct amounts based on products

