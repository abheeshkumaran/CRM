# Opportunity Amount Auto-Calculation from Products

## Issue
When converting a lead to an opportunity, the opportunity amount was not being automatically calculated from the lead's products. The opportunity was created with amount = 0 or a manually entered value, ignoring the product values.

## Solution
Updated the lead conversion process to automatically calculate the opportunity amount from the lead's products.

## Changes Made

### Backend (`server/src/controllers/leadController.ts`)

#### 1. Include Products in Lead Query
```typescript
const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { 
        organisation: true,
        products: { include: { product: true } }
    }
});
```

#### 2. Calculate Opportunity Amount
```typescript
// Calculate opportunity amount from lead products if not provided
let opportunityAmount = Number(amount) || 0;

// If no amount provided, use lead's potentialValue or calculate from products
if (!amount || opportunityAmount === 0) {
    if (lead.potentialValue && lead.potentialValue > 0) {
        opportunityAmount = lead.potentialValue;
    } else if (lead.products && lead.products.length > 0) {
        // Calculate from products
        opportunityAmount = lead.products.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }
}
```

#### 3. Use Calculated Amount in Opportunity
```typescript
const opportunity = await tx.opportunity.create({
    data: {
        name: dealName || `Deal - ${lead.company || lead.lastName}`,
        amount: opportunityAmount,  // Uses calculated amount
        stage: 'prospecting',
        organisationId: orgId,
        ownerId: user.id,
        accountId: targetAccountId,
        contacts: { connect: { id: contact.id } }
    }
});
```

### Frontend (`client/src/components/ConvertLeadDialog.tsx`)

#### 1. Calculate Product Value
```typescript
const calculateProductValue = () => {
    if (!lead.products || lead.products.length === 0) return 0;
    return lead.products.reduce((total, item) => {
        return total + (item.product.basePrice * item.quantity);
    }, 0);
};

const productValue = calculateProductValue();
const opportunityAmount = lead.potentialValue || productValue || 0;
```

#### 2. Display Opportunity Amount
- Shows calculated opportunity amount prominently in the conversion dialog
- Displays total value with products breakdown
- Shows amount even when no products (uses potentialValue)
- Green highlight for the opportunity amount

## How It Works

### Priority Order for Opportunity Amount:
1. **Manual Amount** (if provided in request): Uses the amount from the request body
2. **Lead's Potential Value**: Uses `lead.potentialValue` if set and > 0
3. **Calculated from Products**: Sums up (price × quantity) for all products
4. **Default**: Falls back to 0 if none of the above

### Example Scenarios:

**Scenario 1: Lead with Products**
- Lead has 2 products: Product A ($100 × 2) + Product B ($50 × 1)
- Opportunity amount = $250

**Scenario 2: Lead with Potential Value**
- Lead has potentialValue = $5000
- Opportunity amount = $5000

**Scenario 3: Manual Override**
- User provides amount = $10000 in request
- Opportunity amount = $10000 (overrides calculated value)

**Scenario 4: No Products, No Value**
- Lead has no products and potentialValue = 0
- Opportunity amount = $0

## Benefits

1. **Accurate Opportunity Values**: Opportunities reflect the actual product value from leads
2. **Automatic Calculation**: No manual entry needed - reduces errors
3. **Product Tracking**: Maintains connection between products and opportunity value
4. **Flexibility**: Still allows manual amount override if needed
5. **Better Reporting**: Opportunity pipeline values are more accurate

## Testing Checklist

- [x] Convert lead with products → Opportunity amount = sum of products
- [x] Convert lead with potentialValue → Opportunity amount = potentialValue
- [x] Convert lead without products → Opportunity amount = 0
- [x] Convert lead with manual amount → Opportunity amount = manual amount
- [x] Verify opportunity amount displays in conversion dialog
- [x] Check that products are still migrated to AccountProduct
- [x] Verify opportunity shows correct amount after creation

## Deployment

### Backend
- **Repository**: https://github.com/dilshadbvoc-ui/Dad-backend
- **Commit**: 5a2e0a73
- **Status**: Pushed to main, deploying to Render

### Frontend
- **Repository**: https://github.com/dilshadbvoc-ui/Dad-frontend
- **Commit**: a49e0f1
- **Status**: Pushed to main, deploying to Vercel

## Related Files
- `server/src/controllers/leadController.ts` - Conversion logic
- `client/src/components/ConvertLeadDialog.tsx` - UI display
- `LEAD_PRODUCT_OPTIONAL_FIX.md` - Related product handling fixes
