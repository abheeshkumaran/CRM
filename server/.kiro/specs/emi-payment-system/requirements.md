# Requirements Document: EMI Payment System

## Introduction

The EMI Payment System enables CRM users to manage flexible payment options for opportunity products. Users can mark payments as full or partial, convert partial payments into Equated Monthly Installments (EMI) with custom schedules, and receive automated notifications for upcoming payment due dates. This system enhances cash flow management and provides customers with flexible payment options while maintaining clear payment tracking.

## Glossary

- **EMI_System**: The EMI Payment System component responsible for managing installment-based payments
- **Opportunity**: A sales opportunity in the CRM that contains products and payment information
- **Product**: An item or service associated with an opportunity that has a price
- **Payment_Record**: A record tracking a single payment transaction (full, partial, or EMI installment)
- **EMI_Schedule**: A collection of planned installment payments with specific due dates and amounts
- **EMI_Installment**: A single payment within an EMI schedule with a due date, amount, and status
- **Payment_Status**: The current state of payment (pending, partial, paid)
- **Notification_Service**: The system component responsible for sending payment reminders to users
- **User**: A CRM user who manages opportunities and receives payment notifications
- **Total_Amount**: The sum of all product prices in an opportunity
- **Remaining_Amount**: The unpaid balance after partial payments
- **Due_Date**: The scheduled date when an EMI installment payment is expected

## Requirements

### Requirement 1: Record Full Payment

**User Story:** As a CRM user, I want to mark an opportunity as fully paid, so that I can track completed transactions.

#### Acceptance Criteria

1. WHEN a user marks an opportunity as fully paid, THE EMI_System SHALL set the paymentStatus to "paid"
2. WHEN a user marks an opportunity as fully paid, THE EMI_System SHALL record the payment date as the current date
3. WHEN a user marks an opportunity as fully paid, THE Payment_Record SHALL store the Total_Amount as the payment amount
4. THE EMI_System SHALL validate that the Total_Amount is greater than zero before accepting full payment
5. WHEN an opportunity is marked as fully paid, THE EMI_System SHALL prevent further payment modifications

### Requirement 2: Record Partial Payment

**User Story:** As a CRM user, I want to record partial payments for an opportunity, so that I can track incremental payments from customers.

#### Acceptance Criteria

1. WHEN a user records a partial payment, THE EMI_System SHALL set the paymentStatus to "partial"
2. WHEN a user records a partial payment, THE EMI_System SHALL validate that the payment amount is less than the Total_Amount
3. WHEN a user records a partial payment, THE EMI_System SHALL validate that the payment amount is greater than zero
4. WHEN a user records a partial payment, THE EMI_System SHALL calculate and store the Remaining_Amount
5. WHEN a user records a partial payment, THE Payment_Record SHALL store the payment amount and payment date
6. THE EMI_System SHALL allow multiple partial payments until the Total_Amount is reached

### Requirement 3: Convert Partial Payment to EMI

**User Story:** As a CRM user, I want to convert a partial payment into an EMI schedule, so that customers can pay the remaining balance in installments.

#### Acceptance Criteria

1. WHEN a user converts a partial payment to EMI, THE EMI_System SHALL create an EMI_Schedule for the Remaining_Amount
2. WHEN a user converts a partial payment to EMI, THE EMI_System SHALL validate that the paymentStatus is "partial"
3. WHEN a user converts a partial payment to EMI, THE EMI_System SHALL validate that the Remaining_Amount is greater than zero
4. IF an EMI_Schedule already exists for the opportunity, THEN THE EMI_System SHALL return an error message
5. WHEN an EMI_Schedule is created, THE EMI_System SHALL link it to the opportunity

### Requirement 4: Create EMI Schedule

**User Story:** As a CRM user, I want to define an EMI schedule with specific payment dates and amounts, so that I can customize payment plans for customers.

#### Acceptance Criteria

1. WHEN creating an EMI_Schedule, THE EMI_System SHALL accept a list of Due_Date and amount pairs
2. WHEN creating an EMI_Schedule, THE EMI_System SHALL validate that the sum of all installment amounts equals the Remaining_Amount
3. WHEN creating an EMI_Schedule, THE EMI_System SHALL validate that all Due_Date values are in the future
4. WHEN creating an EMI_Schedule, THE EMI_System SHALL validate that each installment amount is greater than zero
5. WHEN creating an EMI_Schedule, THE EMI_System SHALL create an EMI_Installment record for each date-amount pair
6. WHEN creating an EMI_Schedule, THE EMI_System SHALL set each EMI_Installment status to "pending"
7. THE EMI_System SHALL validate that an EMI_Schedule contains at least one EMI_Installment

### Requirement 5: Track EMI Installment Payments

**User Story:** As a CRM user, I want to mark individual EMI installments as paid, so that I can track payment progress.

#### Acceptance Criteria

1. WHEN a user marks an EMI_Installment as paid, THE EMI_System SHALL update the installment status to "paid"
2. WHEN a user marks an EMI_Installment as paid, THE EMI_System SHALL record the actual payment date
3. WHEN a user marks an EMI_Installment as paid, THE EMI_System SHALL create a Payment_Record for the installment amount
4. WHEN all EMI_Installment records in an EMI_Schedule are marked as paid, THE EMI_System SHALL update the opportunity paymentStatus to "paid"
5. THE EMI_System SHALL validate that an EMI_Installment is in "pending" status before allowing it to be marked as paid
6. WHEN an EMI_Installment is marked as paid, THE EMI_System SHALL recalculate the Remaining_Amount

### Requirement 6: Send Payment Due Notifications

**User Story:** As a CRM user, I want to receive notifications on EMI payment due dates, so that I can follow up with customers for payment collection.

#### Acceptance Criteria

1. WHEN the current date matches an EMI_Installment Due_Date, THE Notification_Service SHALL send a notification to the assigned User
2. WHEN sending a payment notification, THE Notification_Service SHALL include the opportunity name, customer name, installment amount, and Due_Date
3. THE Notification_Service SHALL send notifications only for EMI_Installment records with status "pending"
4. THE Notification_Service SHALL check for due payments at least once per day
5. WHEN an EMI_Installment is marked as paid, THE Notification_Service SHALL not send further notifications for that installment

### Requirement 7: Display EMI Schedule

**User Story:** As a CRM user, I want to view the complete EMI schedule for an opportunity, so that I can track upcoming and completed payments.

#### Acceptance Criteria

1. WHEN a user views an opportunity with an EMI_Schedule, THE EMI_System SHALL display all EMI_Installment records
2. WHEN displaying an EMI_Schedule, THE EMI_System SHALL show each installment's Due_Date, amount, and status
3. WHEN displaying an EMI_Schedule, THE EMI_System SHALL show the total number of installments and the number of paid installments
4. WHEN displaying an EMI_Schedule, THE EMI_System SHALL show the Remaining_Amount
5. THE EMI_System SHALL sort EMI_Installment records by Due_Date in ascending order

### Requirement 8: Validate Payment Amounts

**User Story:** As a CRM user, I want the system to prevent invalid payment amounts, so that payment records remain accurate.

#### Acceptance Criteria

1. WHEN a user enters a payment amount, THE EMI_System SHALL validate that the amount does not exceed the Remaining_Amount
2. WHEN a user enters a payment amount, THE EMI_System SHALL validate that the amount is a positive number
3. IF a payment amount is invalid, THEN THE EMI_System SHALL return a descriptive error message
4. WHEN calculating the Remaining_Amount, THE EMI_System SHALL ensure the result is never negative
5. FOR ALL payment operations, the sum of all Payment_Record amounts SHALL never exceed the Total_Amount (invariant property)

### Requirement 9: Handle EMI Schedule Modifications

**User Story:** As a CRM user, I want to modify an existing EMI schedule, so that I can accommodate changes in customer payment plans.

#### Acceptance Criteria

1. WHEN a user modifies an EMI_Schedule, THE EMI_System SHALL allow changes only to EMI_Installment records with status "pending"
2. WHEN a user modifies an EMI_Installment Due_Date, THE EMI_System SHALL validate that the new date is in the future
3. WHEN a user modifies EMI_Installment amounts, THE EMI_System SHALL validate that the sum of all installment amounts equals the Remaining_Amount
4. WHEN a user deletes an EMI_Installment, THE EMI_System SHALL validate that at least one installment remains in the schedule
5. IF a user attempts to modify a paid EMI_Installment, THEN THE EMI_System SHALL return an error message

### Requirement 10: Calculate Payment Summary

**User Story:** As a CRM user, I want to see a payment summary for an opportunity, so that I can quickly understand the payment status.

#### Acceptance Criteria

1. WHEN a user views an opportunity, THE EMI_System SHALL display the Total_Amount
2. WHEN a user views an opportunity, THE EMI_System SHALL display the total amount paid to date
3. WHEN a user views an opportunity, THE EMI_System SHALL display the Remaining_Amount
4. WHERE an EMI_Schedule exists, THE EMI_System SHALL display the number of pending installments
5. WHERE an EMI_Schedule exists, THE EMI_System SHALL display the next Due_Date
6. FOR ALL opportunities, the equation (Total_Amount = Amount_Paid + Remaining_Amount) SHALL always be true (invariant property)

### Requirement 11: Persist EMI Data

**User Story:** As a system administrator, I want EMI data to be stored reliably in the database, so that payment information is not lost.

#### Acceptance Criteria

1. THE EMI_System SHALL store EMI_Schedule records in the database with a unique identifier
2. THE EMI_System SHALL store EMI_Installment records in the database linked to their EMI_Schedule
3. THE EMI_System SHALL store Payment_Record entries in the database with timestamps
4. WHEN an opportunity is deleted, THE EMI_System SHALL cascade delete all associated EMI_Schedule and EMI_Installment records
5. THE EMI_System SHALL maintain referential integrity between Opportunity, EMI_Schedule, and EMI_Installment records

### Requirement 12: Handle Overdue Payments

**User Story:** As a CRM user, I want to identify overdue EMI payments, so that I can prioritize collection efforts.

#### Acceptance Criteria

1. WHEN the current date is after an EMI_Installment Due_Date, THE EMI_System SHALL mark the installment as "overdue"
2. WHEN displaying an EMI_Schedule, THE EMI_System SHALL highlight overdue installments
3. THE EMI_System SHALL calculate the number of days overdue for each overdue installment
4. WHEN an overdue EMI_Installment is marked as paid, THE EMI_System SHALL update the status to "paid" and record the actual payment date
5. THE Notification_Service SHALL send reminder notifications for overdue installments at configurable intervals

## Correctness Properties

### Property 1: Payment Amount Conservation (Invariant)
FOR ALL opportunities, at any point in time:
```
Total_Amount = Sum(all Payment_Record amounts) + Remaining_Amount
```
This invariant ensures that money is neither created nor lost in the system.

### Property 2: EMI Schedule Completeness (Invariant)
FOR ALL EMI_Schedule records:
```
Sum(all EMI_Installment amounts) = Remaining_Amount at time of EMI creation
```
This ensures that the installment plan covers exactly the remaining balance.

### Property 3: Payment Status Consistency (State Invariant)
FOR ALL opportunities:
- IF paymentStatus = "paid" THEN Remaining_Amount = 0
- IF paymentStatus = "partial" THEN 0 < Remaining_Amount < Total_Amount
- IF paymentStatus = "pending" THEN Remaining_Amount = Total_Amount

### Property 4: Idempotent Payment Marking
FOR ALL EMI_Installment records:
```
mark_as_paid(mark_as_paid(installment)) = mark_as_paid(installment)
```
Marking an already-paid installment as paid should have no additional effect.

### Property 5: Monotonic Payment Progress
FOR ALL opportunities, the Remaining_Amount SHALL only decrease or stay the same over time, never increase (unless a refund operation is explicitly performed).

### Property 6: Date Ordering Constraint
FOR ALL EMI_Schedule records:
```
All Due_Date values SHALL be >= EMI_Schedule creation date
All Due_Date values for pending installments SHALL be >= current date (at creation time)
```

### Property 7: Non-Negative Amounts
FOR ALL payment-related amounts (Total_Amount, Remaining_Amount, installment amounts, payment amounts):
```
amount >= 0
```

### Property 8: Notification Uniqueness (Per Day)
FOR ALL EMI_Installment records with status "pending":
```
The Notification_Service SHALL send at most one notification per installment per day
```

## Notes

- The system should support both manual EMI schedule creation (user specifies each date and amount) and automatic schedule generation (equal installments over a period)
- Consider implementing a payment history log for audit purposes
- Future enhancement: Support for early payment discounts or late payment penalties
- Future enhancement: Support for payment reminders before the due date (e.g., 3 days before)
- The notification system should be extensible to support multiple channels (email, SMS, in-app)
