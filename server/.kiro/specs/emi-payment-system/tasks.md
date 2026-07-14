# Implementation Plan: EMI Payment System

## Overview

This implementation plan breaks down the EMI Payment System into discrete coding tasks across five phases: Core Payment Operations, EMI Schedule Management, Installment Payments, Notifications, and Frontend Integration. Each task builds incrementally on previous work, with property-based tests and unit tests integrated throughout to validate correctness properties and catch errors early.

The implementation uses TypeScript for both backend (Node.js/Express) and frontend (React) components, with Prisma as the ORM for database operations and fast-check for property-based testing.

## Tasks

- [ ] 1. Set up database schema and core types
  - Create Prisma schema migration for EMISchedule, EMIInstallment, and PaymentRecord models
  - Add new fields to Opportunity model (paymentStatus, paymentDate)
  - Define TypeScript enums (EMIStatus, InstallmentStatus, PaymentType)
  - Run migration to update database schema
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 2. Implement PaymentService core functionality
  - [ ] 2.1 Create PaymentService class with validation methods
    - Implement validatePaymentAmount() to check positive amounts and not exceeding remaining
    - Implement calculateRemainingAmount() to compute unpaid balance
    - Implement getPaymentSummary() to aggregate payment data
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 10.1, 10.2, 10.3_

  - [ ]* 2.2 Write property test for payment amount validation
    - **Property 4: Payment Amount Validation**
    - **Validates: Requirements 1.4, 2.2, 2.3, 8.1, 8.2, 8.4**
    - Generate random opportunities and payment amounts
    - Verify rejection of invalid amounts (negative, zero, exceeding remaining)

  - [ ] 2.3 Implement recordFullPayment() method
    - Create PaymentRecord with full amount
    - Update Opportunity paymentStatus to "paid"
    - Record payment date
    - Wrap in database transaction
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [ ]* 2.4 Write property test for full payment completeness
    - **Property 2: Full Payment Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**
    - Generate random opportunities
    - Verify full payment creates correct records and prevents further modifications


  - [ ] 2.5 Implement recordPartialPayment() method
    - Validate payment amount is less than remaining
    - Create PaymentRecord with partial amount
    - Update Opportunity paymentStatus to "partial"
    - Calculate and update remaining amount
    - Wrap in database transaction
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 2.6 Write property test for partial payment state transition
    - **Property 3: Partial Payment State Transition**
    - **Validates: Requirements 2.1, 2.4, 2.5, 2.6**
    - Generate random opportunities and partial payment sequences
    - Verify correct state transitions and remaining amount updates

  - [ ]* 2.7 Write property test for payment amount conservation
    - **Property 1: Payment Amount Conservation (Invariant)**
    - **Validates: Requirements 8.5, 10.6**
    - Generate random payment sequences (full, partial, mixed)
    - Verify Total_Amount = Sum(payments) + Remaining_Amount at all times

  - [ ]* 2.8 Write unit tests for PaymentService
    - Test full payment happy path
    - Test partial payment sequence ($1000 → $300 → $400 → $300)
    - Test validation errors (negative amounts, exceeding remaining)
    - Test already paid opportunity rejection
    - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 8.1, 8.2_

- [ ] 3. Create payment API endpoints
  - [ ] 3.1 Implement POST /api/opportunities/:id/payments/full endpoint
    - Add route handler in Express
    - Validate request body (optional paymentDate, notes)
    - Call PaymentService.recordFullPayment()
    - Return updated opportunity and payment record
    - Handle errors with proper status codes
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 3.2 Implement POST /api/opportunities/:id/payments/partial endpoint
    - Add route handler in Express
    - Validate request body (amount, optional paymentDate, notes)
    - Call PaymentService.recordPartialPayment()
    - Return updated opportunity and payment record
    - Handle errors with proper status codes
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.3 Implement GET /api/opportunities/:id/payments endpoint
    - Add route handler to fetch all payment records
    - Return array of PaymentRecord objects sorted by date
    - Include payment summary data
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 3.4 Implement GET /api/opportunities/:id/payment-summary endpoint
    - Add route handler to fetch payment summary
    - Call PaymentService.getPaymentSummary()
    - Return total, paid, remaining amounts and payment records
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 3.5 Write integration tests for payment endpoints
    - Test POST full payment → GET opportunity → verify status
    - Test POST partial payment → GET summary → verify amounts
    - Test error responses (404, 400, validation errors)
    - _Requirements: 1.1, 2.1, 8.3_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 5. Implement EMIService core functionality
  - [ ] 5.1 Create EMIService class with validation methods
    - Implement validateEMISchedule() to check installment sum equals remaining amount
    - Implement validateInstallmentDates() to ensure future dates
    - Implement validateInstallmentAmounts() to check positive amounts
    - Implement validateEMIConversionPreconditions() to check opportunity status
    - _Requirements: 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.7_

  - [ ]* 5.2 Write property test for EMI conversion preconditions
    - **Property 5: EMI Conversion Preconditions**
    - **Validates: Requirements 3.2, 3.3, 3.4**
    - Generate random opportunities with various payment statuses
    - Verify EMI conversion only succeeds for "partial" status with remaining > 0

  - [ ]* 5.3 Write property test for EMI schedule completeness
    - **Property 6: EMI Schedule Completeness (Invariant)**
    - **Validates: Requirements 4.2, 9.3**
    - Generate random remaining amounts and installment lists
    - Verify sum(installments) = remaining amount always holds

  - [ ]* 5.4 Write property test for EMI schedule validation
    - **Property 7: EMI Schedule Validation**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.7, 9.2**
    - Generate random installment inputs (valid and invalid)
    - Verify validation catches: empty lists, negative amounts, past dates, sum mismatches

  - [ ] 5.5 Implement convertToEMI() method
    - Validate opportunity has "partial" status
    - Validate no existing EMI schedule
    - Validate installment list completeness and correctness
    - Create EMISchedule record with remaining amount
    - Create EMIInstallment records for each date-amount pair
    - Set all installments to "pending" status
    - Wrap in database transaction
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 5.6 Write property test for installment creation completeness
    - **Property 8: Installment Creation Completeness**
    - **Validates: Requirements 4.5, 4.6, 3.5**
    - Generate random valid EMI schedule inputs with N installments
    - Verify exactly N installment records created with correct data

  - [ ] 5.7 Implement getEMISchedule() method
    - Fetch EMISchedule with all related installments
    - Sort installments by due date ascending
    - Return null if no schedule exists
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ]* 5.8 Write unit tests for EMIService
    - Test EMI conversion happy path (3 installments)
    - Test validation errors (already exists, wrong status, sum mismatch)
    - Test installment creation with various counts (1, 5, 12)
    - Test getEMISchedule returns sorted installments
    - _Requirements: 3.2, 3.4, 4.2, 4.7, 7.5_

- [ ] 6. Create EMI conversion API endpoints
  - [ ] 6.1 Implement POST /api/opportunities/:id/emi/convert endpoint
    - Add route handler in Express
    - Validate request body (array of {dueDate, amount} objects)
    - Call EMIService.convertToEMI()
    - Return created EMI schedule with installments
    - Handle errors with proper status codes
    - _Requirements: 3.1, 3.2, 4.1, 4.2_

  - [ ] 6.2 Implement GET /api/opportunities/:id/emi endpoint
    - Add route handler to fetch EMI schedule
    - Call EMIService.getEMISchedule()
    - Return schedule with all installments sorted by due date
    - Return 404 if no schedule exists
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ]* 6.3 Write integration tests for EMI conversion
    - Test POST partial payment → POST EMI convert → GET EMI → verify structure
    - Test error cases (no partial payment, sum mismatch, duplicate conversion)
    - _Requirements: 3.1, 3.2, 4.2_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 8. Implement installment payment functionality
  - [ ] 8.1 Implement markInstallmentPaid() method in EMIService
    - Validate installment exists and is "pending" or "overdue"
    - Update installment status to "paid"
    - Record actual payment date
    - Create PaymentRecord with type "emi_installment"
    - Update EMISchedule paidAmount and remainingAmount
    - Check if all installments are paid
    - If all paid, update Opportunity paymentStatus to "paid" and EMISchedule status to "completed"
    - Wrap in database transaction
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 12.4_

  - [ ]* 8.2 Write property test for installment payment effects
    - **Property 9: Installment Payment Effects**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.6, 12.4**
    - Generate random EMI schedules with various installment counts
    - Pay random installments and verify all side effects occur correctly
    - Verify opportunity status updates when all installments paid

  - [ ]* 8.3 Write property test for installment payment idempotence
    - **Property 10: Installment Payment Idempotence**
    - **Validates: Requirements 5.5**
    - Generate random paid installments
    - Attempt to mark as paid again
    - Verify operation is rejected or has no additional effect

  - [ ]* 8.4 Write property test for multiple partial payments accumulation
    - **Property 17: Multiple Partial Payments Accumulation**
    - **Validates: Requirements 2.6**
    - Generate random sequences of partial payments
    - Verify all accepted until sum equals total, then status becomes "paid"

  - [ ]* 8.5 Write unit tests for installment payment
    - Test marking single installment as paid
    - Test marking all installments as paid triggers opportunity completion
    - Test validation errors (already paid, invalid status)
    - Test payment record creation with correct type
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9. Implement installment modification functionality
  - [ ] 9.1 Implement updateInstallment() method in EMIService
    - Validate installment exists and is "pending"
    - If updating due date, validate new date is in future
    - If updating amount, recalculate schedule and validate sum still equals remaining
    - Update installment record
    - Wrap in database transaction
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 9.2 Implement deleteInstallment() method in EMIService
    - Validate installment exists and is "pending"
    - Validate at least one other installment remains in schedule
    - Recalculate schedule and validate sum still equals remaining
    - Delete installment record
    - Wrap in database transaction
    - _Requirements: 9.1, 9.4, 9.5_

  - [ ]* 9.3 Write property test for installment modification constraints
    - **Property 11: Installment Modification Constraints**
    - **Validates: Requirements 9.1, 9.4**
    - Generate random EMI schedules
    - Attempt various modifications (valid and invalid)
    - Verify only pending installments can be modified
    - Verify schedule completeness invariant maintained

  - [ ]* 9.4 Write unit tests for installment modifications
    - Test updating installment due date
    - Test updating installment amount
    - Test deleting installment
    - Test validation errors (paid installment, last installment, sum mismatch)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Create installment management API endpoints
  - [ ] 10.1 Implement POST /api/opportunities/:id/emi/installments/:installmentId/pay endpoint
    - Add route handler in Express
    - Validate request body (optional paymentDate, notes)
    - Call EMIService.markInstallmentPaid()
    - Return updated installment and payment record
    - Include scheduleCompleted flag in response
    - Handle errors with proper status codes
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 10.2 Implement PUT /api/opportunities/:id/emi/installments/:installmentId endpoint
    - Add route handler in Express
    - Validate request body (optional dueDate, amount)
    - Call EMIService.updateInstallment()
    - Return updated installment
    - Handle errors with proper status codes
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 10.3 Implement DELETE /api/opportunities/:id/emi/installments/:installmentId endpoint
    - Add route handler in Express
    - Call EMIService.deleteInstallment()
    - Return success message
    - Handle errors with proper status codes
    - _Requirements: 9.1, 9.4_

  - [ ]* 10.4 Write integration tests for installment management
    - Test POST pay installment → GET EMI → verify updates
    - Test PUT update installment → GET EMI → verify changes
    - Test DELETE installment → GET EMI → verify removal
    - Test complete payment flow (pay all installments → verify opportunity paid)
    - _Requirements: 5.1, 9.1, 9.4_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 12. Implement overdue detection functionality
  - [ ] 12.1 Implement updateOverdueStatus() method in EMIService
    - Query all installments with status "pending" and dueDate < current date
    - Update status to "overdue"
    - Calculate daysOverdue as (current date - due date)
    - Batch update all overdue installments
    - _Requirements: 12.1, 12.3_

  - [ ]* 12.2 Write property test for overdue status detection
    - **Property 12: Overdue Status Detection**
    - **Validates: Requirements 12.1, 12.3**
    - Generate random installments with various due dates (past, present, future)
    - Run overdue detection
    - Verify only past-due pending installments marked as overdue with correct days

  - [ ]* 12.3 Write unit tests for overdue detection
    - Test installment with past due date becomes overdue
    - Test installment with future due date remains pending
    - Test installment with today's due date remains pending
    - Test daysOverdue calculation accuracy
    - Test paid installments are not affected
    - _Requirements: 12.1, 12.3, 12.4_

- [ ] 13. Implement notification service integration
  - [ ] 13.1 Create EMINotificationService class
    - Implement checkDuePayments() to find installments due today or overdue
    - Implement sendPaymentReminder() to send notification with opportunity details
    - Implement sendOverdueAlert() for overdue installments
    - Filter to only "pending" and "overdue" status installments
    - Ensure one notification per installment per day (deduplication)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 12.5_

  - [ ]* 13.2 Write property test for payment notification targeting
    - **Property 13: Payment Notification Targeting**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Generate random installments with various due dates and statuses
    - Run notification check for specific date
    - Verify only pending/overdue installments with matching due date generate notifications
    - Verify notification content includes all required fields

  - [ ]* 13.3 Write unit tests for notification service
    - Test notification sent for installment due today
    - Test notification includes opportunity name, customer, amount, due date
    - Test no notification for paid installments
    - Test no notification for future installments
    - Test notification deduplication (one per day)
    - Mock notification delivery
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ] 13.4 Create cron job for daily notification checks
    - Set up scheduled task to run checkDuePayments() daily
    - Configure time (e.g., 9 AM daily)
    - Add error handling and logging
    - Implement retry logic for failed notifications
    - _Requirements: 6.4, 12.5_

  - [ ]* 13.5 Write integration tests for notification workflow
    - Create installment with today's due date
    - Trigger notification job
    - Verify notification sent to correct user
    - Mark installment as paid
    - Trigger notification job again
    - Verify no notification sent
    - _Requirements: 6.1, 6.3, 6.5_

- [ ] 14. Implement payment summary enhancements
  - [ ] 14.1 Enhance getPaymentSummary() to include EMI data
    - Include EMI schedule if exists
    - Calculate total installments count
    - Calculate paid installments count
    - Calculate pending installments count
    - Find next due date from pending installments
    - _Requirements: 7.3, 7.4, 10.4, 10.5_

  - [ ]* 14.2 Write property test for payment summary accuracy
    - **Property 14: Payment Summary Accuracy**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5**
    - Generate random opportunities with various payment states
    - Verify summary returns correct total, paid, remaining amounts
    - Verify EMI data included when schedule exists
    - Verify all payment records included

  - [ ]* 14.3 Write unit tests for enhanced payment summary
    - Test summary for opportunity with no payments
    - Test summary for opportunity with partial payments
    - Test summary for opportunity with EMI schedule
    - Test summary includes next due date
    - Test summary includes installment counts
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 16. Implement data persistence and referential integrity
  - [ ] 16.1 Add database indexes for performance
    - Add index on EMISchedule.opportunityId
    - Add index on EMISchedule.status
    - Add index on EMIInstallment.scheduleId
    - Add index on EMIInstallment.dueDate
    - Add index on EMIInstallment.status
    - Add index on PaymentRecord.opportunityId
    - Add index on PaymentRecord.paymentDate
    - Add index on PaymentRecord.paymentType
    - _Requirements: Performance optimization_

  - [ ] 16.2 Verify cascade deletion behavior
    - Test deleting opportunity cascades to EMI schedule
    - Test deleting opportunity cascades to installments
    - Test deleting opportunity cascades to payment records
    - Test deleting EMI schedule cascades to installments
    - _Requirements: 11.4_

  - [ ]* 16.3 Write property test for data persistence and referential integrity
    - **Property 15: Data Persistence and Referential Integrity**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 3.5**
    - Generate random EMI schedules and installments
    - Verify all records persisted with unique IDs
    - Verify referential integrity maintained
    - Test cascade deletion behavior

  - [ ]* 16.4 Write property test for non-negative amounts invariant
    - **Property 16: Non-Negative Amounts Invariant**
    - **Validates: Requirements 8.4**
    - Generate random payment operations
    - Verify all amounts (total, remaining, installment, payment) are >= 0 at all times

  - [ ]* 16.5 Write unit tests for database operations
    - Test transaction rollback on errors
    - Test concurrent payment operations
    - Test referential integrity constraints
    - Test cascade deletion
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 17. Create frontend payment dialog component
  - [ ] 17.1 Create PaymentDialog React component
    - Add form for full payment with optional date and notes
    - Add form for partial payment with amount, optional date and notes
    - Add validation for payment amounts
    - Call payment API endpoints on submit
    - Display success/error messages
    - Refresh opportunity data after successful payment
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_

  - [ ] 17.2 Add payment status display to opportunity view
    - Show payment status badge (pending, partial, paid)
    - Show total amount, paid amount, remaining amount
    - Show payment date if fully paid
    - Add "Record Payment" button to open PaymentDialog
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 17.3 Write unit tests for PaymentDialog component
    - Test form validation
    - Test API call on submit
    - Test error handling
    - Test success message display
    - Mock API responses

- [ ] 18. Create frontend EMI conversion component
  - [ ] 18.1 Create EMIConversionDialog React component
    - Add form to input installment count or custom schedule
    - Add date picker for each installment due date
    - Add amount input for each installment
    - Validate sum of installments equals remaining amount
    - Validate all dates are in future
    - Call EMI conversion API endpoint on submit
    - Display success/error messages
    - _Requirements: 3.1, 4.1, 4.2, 4.3, 4.4_

  - [ ] 18.2 Add "Convert to EMI" button to opportunity view
    - Show button only when paymentStatus is "partial"
    - Open EMIConversionDialog on click
    - Refresh opportunity data after successful conversion
    - _Requirements: 3.2_

  - [ ]* 18.3 Write unit tests for EMIConversionDialog component
    - Test installment input validation
    - Test sum validation
    - Test date validation
    - Test API call on submit
    - Mock API responses


- [ ] 19. Create frontend EMI schedule display component
  - [ ] 19.1 Create EMIScheduleView React component
    - Display EMI schedule summary (total, paid, remaining)
    - Display table of all installments with columns: number, due date, amount, status, days overdue
    - Sort installments by due date ascending
    - Highlight overdue installments in red
    - Show "Mark as Paid" button for pending/overdue installments
    - Show "Edit" and "Delete" buttons for pending installments
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.2_

  - [ ] 19.2 Implement installment payment marking in UI
    - Add confirmation dialog for marking installment as paid
    - Call installment payment API endpoint
    - Refresh EMI schedule after successful payment
    - Show success message
    - Display completion message if all installments paid
    - _Requirements: 5.1, 5.2, 5.4_

  - [ ] 19.3 Implement installment editing in UI
    - Add dialog to edit installment due date and amount
    - Validate new values
    - Call installment update API endpoint
    - Refresh EMI schedule after successful update
    - _Requirements: 9.1, 9.2_

  - [ ] 19.4 Implement installment deletion in UI
    - Add confirmation dialog for deleting installment
    - Call installment delete API endpoint
    - Refresh EMI schedule after successful deletion
    - _Requirements: 9.1, 9.4_

  - [ ]* 19.5 Write unit tests for EMIScheduleView component
    - Test installment table rendering
    - Test overdue highlighting
    - Test mark as paid functionality
    - Test edit functionality
    - Test delete functionality
    - Mock API responses

- [ ] 20. Create frontend payment history component
  - [ ] 20.1 Create PaymentHistoryView React component
    - Display table of all payment records
    - Show columns: date, type, amount, notes
    - Sort by date descending (most recent first)
    - Show payment summary at top (total, paid, remaining)
    - Link EMI installment payments to their installment details
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ] 20.2 Integrate PaymentHistoryView into opportunity detail page
    - Add "Payment History" tab or section
    - Fetch payment summary and records on load
    - Refresh when payments are made
    - _Requirements: 7.1, 10.1_

  - [ ]* 20.3 Write unit tests for PaymentHistoryView component
    - Test payment records rendering
    - Test sorting by date
    - Test payment summary display
    - Mock API responses

- [ ] 21. Implement error handling and user feedback
  - [ ] 21.1 Add comprehensive error handling to all API endpoints
    - Return consistent error response format
    - Use appropriate HTTP status codes (400, 404, 500)
    - Include error codes and descriptive messages
    - Log errors for debugging
    - _Requirements: 8.3_

  - [ ] 21.2 Add error display to frontend components
    - Show validation errors inline on forms
    - Display API errors in toast notifications or alert dialogs
    - Provide actionable error messages to users
    - _Requirements: 8.3_

  - [ ] 21.3 Add loading states to frontend components
    - Show loading spinners during API calls
    - Disable form inputs while submitting
    - Prevent duplicate submissions
    - _Requirements: User experience_

  - [ ]* 21.4 Write unit tests for error handling
    - Test validation error responses
    - Test not found error responses
    - Test server error responses
    - Test error display in UI components

- [ ] 22. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 23. Add security and permissions
  - [ ] 23.1 Implement authentication middleware for payment endpoints
    - Verify user is authenticated for all payment operations
    - Return 401 Unauthorized if not authenticated
    - _Requirements: Security_

  - [ ] 23.2 Implement authorization checks for payment operations
    - Verify user has permission to modify opportunity
    - Check user owns the opportunity or has appropriate role
    - Return 403 Forbidden if not authorized
    - _Requirements: Security_

  - [ ] 23.3 Add audit logging for payment operations
    - Log all payment record creations with user ID and timestamp
    - Log all EMI schedule creations and modifications
    - Log all installment payments
    - Include correlation IDs for tracing
    - _Requirements: Security, Audit_

  - [ ]* 23.4 Write unit tests for security middleware
    - Test authentication requirement
    - Test authorization checks
    - Test audit log creation

- [ ] 24. Implement notification templates and delivery
  - [ ] 24.1 Create notification templates
    - Create payment due reminder template with opportunity details
    - Create overdue payment alert template
    - Create payment confirmation template
    - Include opportunity name, customer name, amount, due date in templates
    - _Requirements: 6.2_

  - [ ] 24.2 Integrate with existing notification system
    - Use existing notification delivery mechanism
    - Send notifications to opportunity owner
    - Support in-app notifications
    - Add email notification support if available
    - _Requirements: 6.1, 6.2_

  - [ ] 24.3 Implement notification retry logic
    - Add exponential backoff for failed notifications (1min, 5min, 15min)
    - Log failed notifications after 3 attempts
    - Alert administrators for persistent failures
    - _Requirements: Reliability_

  - [ ]* 24.4 Write unit tests for notification templates
    - Test template rendering with various data
    - Test notification delivery
    - Test retry logic
    - Mock notification service

- [ ] 25. Add monitoring and observability
  - [ ] 25.1 Add logging for payment operations
    - Log payment record creations with amounts and types
    - Log EMI conversions with installment counts
    - Log installment payments with schedule progress
    - Use structured logging with correlation IDs
    - _Requirements: Observability_

  - [ ] 25.2 Add performance monitoring
    - Track payment operation latency
    - Track notification delivery success rate
    - Monitor database query performance
    - Set up alerts for slow operations (> 1 second)
    - _Requirements: Performance_

  - [ ] 25.3 Create payment system health dashboard
    - Display total payments processed today
    - Display EMI schedules created today
    - Display notification delivery success rate
    - Display overdue installments count
    - Display failed operations count
    - _Requirements: Monitoring_

- [ ] 26. Performance optimization
  - [ ] 26.1 Optimize database queries
    - Use eager loading for related data (opportunity, installments)
    - Add database indexes (already done in task 16.1)
    - Use pagination for payment history (if > 100 records)
    - Cache payment summaries for frequently accessed opportunities
    - _Requirements: Performance_

  - [ ] 26.2 Optimize notification job
    - Batch process due installments (100 at a time)
    - Use database query optimization for finding due installments
    - Implement parallel notification sending
    - _Requirements: Performance_

  - [ ]* 26.3 Write performance tests
    - Test payment operations with 1000+ payment records
    - Test EMI schedules with 100+ installments
    - Test notification job with 1000+ due installments
    - Verify all operations complete within acceptable time (< 1 second for single ops)


- [ ] 27. Integration and end-to-end testing
  - [ ]* 27.1 Write comprehensive integration tests
    - Test full payment workflow: create opportunity → add products → mark as paid → verify
    - Test partial payment workflow: create opportunity → partial payment → verify status
    - Test EMI workflow: partial payment → convert to EMI → pay installments → verify completion
    - Test notification workflow: create due installment → trigger job → verify notification
    - Test modification workflow: create EMI → modify installment → verify schedule integrity
    - _Requirements: All requirements_

  - [ ]* 27.2 Write property-based integration tests
    - Generate random complete payment workflows
    - Verify all invariants hold throughout workflow
    - Test with various opportunity amounts and payment patterns
    - _Requirements: All invariant properties_

  - [ ] 27.3 Manual testing checklist
    - Test full payment flow in UI
    - Test partial payment flow in UI
    - Test EMI conversion in UI
    - Test installment payment in UI
    - Test installment modification in UI
    - Test payment history display
    - Test overdue highlighting
    - Test notification delivery
    - Test error handling and validation messages
    - Test with various user roles and permissions

- [ ] 28. Documentation and deployment preparation
  - [ ] 28.1 Update API documentation
    - Document all payment endpoints with request/response examples
    - Document all EMI endpoints with request/response examples
    - Document error codes and messages
    - Add authentication and authorization requirements
    - _Requirements: Documentation_

  - [ ] 28.2 Create user guide
    - Document how to record full payments
    - Document how to record partial payments
    - Document how to convert to EMI
    - Document how to manage installments
    - Document how to view payment history
    - Add screenshots and examples
    - _Requirements: Documentation_

  - [ ] 28.3 Create deployment checklist
    - Run database migrations
    - Verify indexes created
    - Set up cron job for notification checks
    - Configure notification templates
    - Set up monitoring and alerts
    - Verify environment variables configured
    - Run smoke tests in staging environment
    - _Requirements: Deployment_

  - [ ] 28.4 Create rollback plan
    - Document how to revert database migrations
    - Document how to disable EMI features
    - Document how to handle in-flight EMI schedules
    - _Requirements: Deployment_

- [ ] 29. Final checkpoint - Ensure all tests pass
  - Run all unit tests and verify 100% pass rate
  - Run all property-based tests with minimum 100 iterations each
  - Run all integration tests and verify success
  - Verify no linting or type errors
  - Verify all correctness properties validated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests use fast-check with minimum 100 iterations per test
- All property tests must include feature tag: "Feature: emi-payment-system, Property N: [name]"
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- Implementation uses TypeScript for both backend (Node.js/Express/Prisma) and frontend (React)
- All payment operations use database transactions to ensure atomicity
- Security and audit logging are critical for payment systems
- Performance optimization is important for scalability with large datasets

## Testing Summary

**Property-Based Tests (17 properties):**
1. Payment Amount Conservation (Invariant)
2. Full Payment Completeness
3. Partial Payment State Transition
4. Payment Amount Validation
5. EMI Conversion Preconditions
6. EMI Schedule Completeness (Invariant)
7. EMI Schedule Validation
8. Installment Creation Completeness
9. Installment Payment Effects
10. Installment Payment Idempotence
11. Installment Modification Constraints
12. Overdue Status Detection
13. Payment Notification Targeting
14. Payment Summary Accuracy
15. Data Persistence and Referential Integrity
16. Non-Negative Amounts Invariant
17. Multiple Partial Payments Accumulation

**Unit Tests:**
- PaymentService operations
- EMIService operations
- API endpoint behavior
- Frontend component behavior
- Error handling and validation
- Security and authorization
- Notification templates and delivery

**Integration Tests:**
- Complete payment workflows
- EMI conversion and management workflows
- Notification delivery workflows
- End-to-end user scenarios

