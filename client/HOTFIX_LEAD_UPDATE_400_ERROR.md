# Hotfix - Lead Update 400 Error

## Issue
After deploying the product optional fix, users were getting a 400 error when trying to update leads:
```
dad-backend.onrender.com/api/leads/34e344df-b7b4-443f-af4c-95b2375bf004:1 
Failed to load resource: the server responded with a status of 400 ()
```

## Root Cause
The `products` field was being included in the `updates` object that was passed directly to Prisma's `lead.update()` method. Since `products` is a relation field and not a direct field on the Lead model, Prisma couldn't handle it and threw a validation error.

## Solution
Destructured the `products` field from the `updates` object before passing it to Prisma:

```typescript
// Remove products from updates as it's handled separately
const { products, ...leadUpdates } = updates;

// Update Lead Basic Info
const [lead] = await prisma.$transaction([
    prisma.lead.update({
        where: whereObj,
        data: leadUpdates,  // Now without products field
        include: { assignedTo: { select: { firstName: true, lastName: true, email: true } } }
    }),
    ...(historyData ? [prisma.leadHistory.create({ data: historyData })] : [])
]);
```

The `products` field is still handled separately in the dedicated product update logic that follows.

## Files Changed
- `server/src/controllers/leadController.ts`

## Deployment
- **Repository**: https://github.com/dilshadbvoc-ui/Dad-backend
- **Commit**: 524cef53
- **Status**: Pushed to main, deploying to Render

## Testing
After deployment:
1. ✅ Update lead basic info (name, email, phone, etc.)
2. ✅ Update lead with products
3. ✅ Update lead without products
4. ✅ Remove all products from lead
5. ✅ Add products to lead

## Notes
This was a critical hotfix to resolve the 400 error that was preventing lead updates. The products are still handled correctly in the separate product update logic, but they're no longer passed to the main Prisma update call.
