# EMI Payment System - Quick Start Guide

## Overview
The EMI Payment System allows you to manage flexible payment options for opportunities. You can record full payments, partial payments, and convert partial payments into installment plans (EMI).

## Basic Workflow

### 1. Record a Partial Payment
When a customer makes a partial payment:

```bash
POST /api/opportunities/{opportunityId}/payments/partial
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 5000,
  "paymentDate": "2024-02-24T10:00:00Z",
  "notes": "First payment received"
}
```

### 2. Convert to EMI
After receiving a partial payment, convert the remaining balance to EMI:

```bash
POST /api/opportunities/{opportunityId}/emi/convert
Authorization: Bearer {token}
Content-Type: application/json

{
  "installments": [
    {
      "dueDate": "2024-03-24T00:00:00Z",
      "amount": 2500
    },
    {
      "dueDate": "2024-04-24T00:00:00Z",
      "amount": 2500
    }
  ]
}
```

**Important**: The sum of all installment amounts must equal the remaining balance.

### 3. View EMI Schedule
Check the EMI schedule and installment status:

```bash
GET /api/opportunities/{opportunityId}/emi
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "emiSchedule": {
    "id": "schedule-id",
    "totalAmount": 5000,
    "paidAmount": 0,
    "remainingAmount": 5000,
    "status": "active",
    "installments": [
      {
        "id": "installment-1-id",
        "installmentNumber": 1,
        "amount": 2500,
        "dueDate": "2024-03-24T00:00:00.000Z",
        "status": "pending",
        "paidDate": null
      },
      {
        "id": "installment-2-id",
        "installmentNumber": 2,
        "amount": 2500,
        "dueDate": "2024-04-24T00:00:00.000Z",
        "status": "pending",
        "paidDate": null
      }
    ]
  }
}
```

### 4. Mark Installment as Paid
When a customer pays an installment:

```bash
POST /api/emi/installments/{installmentId}/pay
Authorization: Bearer {token}
Content-Type: application/json

{
  "paymentDate": "2024-03-24T10:00:00Z",
  "notes": "Second installment received"
}
```

### 5. Check Payment Summary
View complete payment history and status:

```bash
GET /api/opportunities/{opportunityId}/payment-summary
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "summary": {
    "totalAmount": 10000,
    "paidAmount": 7500,
    "remainingAmount": 2500,
    "paymentStatus": "partial",
    "paymentRecords": [
      {
        "id": "payment-1",
        "amount": 5000,
        "paymentType": "partial",
        "paymentDate": "2024-02-24T10:00:00.000Z"
      },
      {
        "id": "payment-2",
        "amount": 2500,
        "paymentType": "installment",
        "paymentDate": "2024-03-24T10:00:00.000Z"
      }
    ],
    "emiSchedule": {
      "totalAmount": 5000,
      "paidAmount": 2500,
      "remainingAmount": 2500,
      "installments": [...]
    }
  }
}
```

## Common Scenarios

### Scenario 1: Full Payment Upfront
Customer pays the entire amount immediately:

```bash
POST /api/opportunities/{opportunityId}/payments/full
Authorization: Bearer {token}
Content-Type: application/json

{
  "paymentDate": "2024-02-24T10:00:00Z",
  "notes": "Full payment received"
}
```

Result: Opportunity status becomes "paid"

### Scenario 2: Multiple Partial Payments
Customer makes several partial payments:

```bash
# First payment
POST /api/opportunities/{opportunityId}/payments/partial
{ "amount": 3000 }

# Second payment
POST /api/opportunities/{opportunityId}/payments/partial
{ "amount": 2000 }

# Third payment (completes the payment)
POST /api/opportunities/{opportunityId}/payments/partial
{ "amount": 5000 }
```

Result: When total payments equal opportunity amount, status becomes "paid"

### Scenario 3: Partial Payment + EMI
Customer pays 50% upfront, rest in 3 installments:

```bash
# Step 1: Record 50% payment
POST /api/opportunities/{opportunityId}/payments/partial
{ "amount": 5000 }

# Step 2: Convert remaining 50% to 3 EMI
POST /api/opportunities/{opportunityId}/emi/convert
{
  "installments": [
    { "dueDate": "2024-03-24", "amount": 1666.67 },
    { "dueDate": "2024-04-24", "amount": 1666.67 },
    { "dueDate": "2024-05-24", "amount": 1666.66 }
  ]
}

# Step 3: Mark installments as paid when received
POST /api/emi/installments/{installment1Id}/pay
POST /api/emi/installments/{installment2Id}/pay
POST /api/emi/installments/{installment3Id}/pay
```

## Validation Rules

### Payment Validation
- ✅ Amount must be positive
- ✅ Amount cannot exceed remaining balance
- ✅ Cannot add payments to fully paid opportunities

### EMI Validation
- ✅ Can only convert opportunities with "partial" status
- ✅ Sum of installments must equal remaining amount
- ✅ All due dates must be in the future
- ✅ At least one installment required
- ✅ Cannot create EMI if one already exists

### Installment Modification
- ✅ Can only modify/delete "pending" installments
- ✅ Cannot delete the last installment
- ✅ After modification, sum must still equal total
- ✅ New due date must be in the future

## Status Flow

```
Opportunity Status:
pending → partial → paid
   ↓         ↓
  paid    EMI (partial) → paid

Installment Status:
pending → paid
   ↓
overdue → paid
```

## Error Handling

### Common Errors

**Payment exceeds remaining balance:**
```json
{
  "success": false,
  "error": "Payment amount ($6000) exceeds remaining balance ($5000)"
}
```

**EMI sum mismatch:**
```json
{
  "success": false,
  "error": "Sum of installment amounts ($4500) does not equal remaining amount ($5000)"
}
```

**Already has EMI:**
```json
{
  "success": false,
  "error": "An EMI schedule already exists for this opportunity"
}
```

**Invalid status for EMI:**
```json
{
  "success": false,
  "error": "EMI conversion requires opportunity status to be 'partial', current status is 'pending'"
}
```

## Tips

1. **Always check payment summary** before converting to EMI to know the exact remaining amount
2. **Use future dates** for installments - system validates dates are in future
3. **Sum must be exact** - use calculator to ensure installments sum equals remaining amount
4. **Mark installments promptly** - helps track payment status accurately
5. **Add notes** to payment records for better tracking and audit trail

## Next Steps

- Frontend UI components are being developed
- Notification system for payment reminders will be added
- Reporting and analytics for payment tracking coming soon

## Support

For issues or questions:
1. Check the full documentation: `EMI_IMPLEMENTATION_COMPLETE.md`
2. Review API specifications: `server/.kiro/specs/emi-payment-system/`
3. Contact development team

---

**Last Updated**: February 24, 2024
