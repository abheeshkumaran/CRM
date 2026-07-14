# Custom Fields & CRM Customization System

## Overview
A comprehensive customization system that allows organization admins to add, remove, and configure custom fields for all CRM entities (Leads, Contacts, Accounts, Opportunities, etc.).

## Scope

### Phase 1: Custom Fields (Immediate)
- Add custom fields to Leads
- Add custom fields to Contacts
- Add custom fields to Accounts
- Add custom fields to Opportunities

### Phase 2: Field Configuration (Future)
- Make standard fields optional/required
- Reorder fields
- Hide/show fields
- Field dependencies

### Phase 3: Complete Customization (Future)
- Custom entities
- Custom workflows
- Custom layouts
- Custom validation rules

---

## Database Schema

### CustomField Model

```prisma
model CustomField {
  id             String   @id @default(uuid())
  organisationId String
  entityType     String   // 'Lead', 'Contact', 'Account', 'Opportunity', etc.
  fieldName      String   // Internal name (e.g., 'custom_industry')
  fieldLabel     String   // Display name (e.g., 'Industry')
  fieldType      String   // 'text', 'number', 'date', 'select', 'multiselect', 'boolean', 'textarea', 'email', 'phone', 'url'
  options        Json?    // For select/multiselect: ["Option 1", "Option 2"]
  isRequired     Boolean  @default(false)
  isActive       Boolean  @default(true)
  defaultValue   String?
  placeholder    String?
  helpText       String?
  validation     Json?    // Validation rules: { min: 0, max: 100, pattern: "regex" }
  order          Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  organisation   Organisation @relation(fields: [organisationId], references: [id])
  
  @@unique([organisationId, entityType, fieldName])
  @@index([organisationId, entityType])
}
```

### Existing Models Update

All existing models (Lead, Contact, Account, Opportunity) already have:
```prisma
customFields Json? // Stores custom field values
```

---

## API Endpoints

### Custom Field Management

```typescript
// Get all custom fields for an entity type
GET /api/custom-fields?entityType=Lead

// Get a specific custom field
GET /api/custom-fields/:id

// Create a new custom field
POST /api/custom-fields
Body: {
  entityType: 'Lead',
  fieldName: 'industry',
  fieldLabel: 'Industry',
  fieldType: 'select',
  options: ['Technology', 'Healthcare', 'Finance'],
  isRequired: false,
  order: 1
}

// Update a custom field
PUT /api/custom-fields/:id
Body: { fieldLabel: 'Industry Type', isRequired: true }

// Delete a custom field
DELETE /api/custom-fields/:id

// Reorder custom fields
PUT /api/custom-fields/reorder
Body: { fieldIds: ['id1', 'id2', 'id3'] }
```

---

## Field Types

### 1. Text
- Single line text input
- Max length validation
- Pattern validation (regex)

### 2. Textarea
- Multi-line text input
- Max length validation

### 3. Number
- Numeric input
- Min/max validation
- Decimal places

### 4. Date
- Date picker
- Min/max date validation

### 5. Select (Dropdown)
- Single selection
- Predefined options
- Custom options

### 6. Multi-Select
- Multiple selections
- Predefined options
- Custom options

### 7. Boolean (Checkbox)
- Yes/No
- True/False
- On/Off

### 8. Email
- Email validation
- Unique validation (optional)

### 9. Phone
- Phone number validation
- Format validation

### 10. URL
- URL validation
- Auto-format

---

## UI Components

### Settings Page: Custom Fields Management

```
Settings → Custom Fields → [Entity Type]

┌─────────────────────────────────────────────────┐
│ Custom Fields - Leads                           │
├─────────────────────────────────────────────────┤
│                                                  │
│ [+ Add Custom Field]                            │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Industry                          [Edit] [×] │ │
│ │ Type: Select                                 │ │
│ │ Required: Yes                                │ │
│ │ Options: Technology, Healthcare, Finance     │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Company Size                      [Edit] [×] │ │
│ │ Type: Number                                 │ │
│ │ Required: No                                 │ │
│ │ Range: 1-10000                               │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Add/Edit Custom Field Dialog

```
┌─────────────────────────────────────────────────┐
│ Add Custom Field                                │
├─────────────────────────────────────────────────┤
│                                                  │
│ Field Label: [Industry                       ]  │
│ Field Name:  [industry                       ]  │
│              (auto-generated, can edit)          │
│                                                  │
│ Field Type:  [Select ▼]                         │
│                                                  │
│ Options:     [Technology                     ]  │
│              [Healthcare                     ]  │
│              [Finance                        ]  │
│              [+ Add Option]                     │
│                                                  │
│ ☑ Required Field                                │
│ ☐ Show in List View                             │
│                                                  │
│ Placeholder: [Select an industry...          ]  │
│ Help Text:   [Choose the primary industry    ]  │
│                                                  │
│              [Cancel]  [Save Custom Field]      │
└─────────────────────────────────────────────────┘
```

### Lead Form with Custom Fields

```
┌─────────────────────────────────────────────────┐
│ Create New Lead                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│ Standard Fields:                                │
│ First Name: [John                            ]  │
│ Last Name:  [Doe                             ]  │
│ Email:      [john@example.com                ]  │
│ Phone:      [+1234567890                     ]  │
│                                                  │
│ Custom Fields:                                  │
│ Industry:   [Technology ▼]                      │
│ Company Size: [50                            ]  │
│ Budget:     [$10,000                         ]  │
│                                                  │
│              [Cancel]  [Create Lead]            │
└─────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Step 1: Database Migration
```bash
# Create CustomField table
npx prisma migrate dev --name add_custom_fields
```

### Step 2: Backend Implementation

**Files to Create/Modify**:
1. `server/src/controllers/customFieldController.ts` - CRUD operations
2. `server/src/routes/customFieldRoutes.ts` - API routes
3. `server/src/services/CustomFieldValidationService.ts` - Validation logic
4. `server/src/middleware/validateCustomFields.ts` - Middleware for validation

**Key Functions**:
- `getCustomFields(entityType, organisationId)` - Fetch fields
- `createCustomField(data)` - Create new field
- `updateCustomField(id, data)` - Update field
- `deleteCustomField(id)` - Delete field (soft delete)
- `validateCustomFieldValue(field, value)` - Validate field value
- `reorderCustomFields(fieldIds)` - Reorder fields

### Step 3: Frontend Implementation

**Files to Create**:
1. `client/src/pages/settings/custom-fields/index.tsx` - Main page
2. `client/src/pages/settings/custom-fields/[entityType].tsx` - Entity-specific page
3. `client/src/components/settings/CustomFieldManager.tsx` - Field list
4. `client/src/components/settings/CustomFieldDialog.tsx` - Add/Edit dialog
5. `client/src/components/forms/DynamicCustomFields.tsx` - Render custom fields
6. `client/src/services/customFieldService.ts` - API calls

**Key Components**:
- `CustomFieldManager` - List and manage fields
- `CustomFieldDialog` - Add/edit field configuration
- `DynamicCustomFields` - Render custom fields in forms
- `CustomFieldInput` - Individual field input component

### Step 4: Integration

**Update Existing Forms**:
1. `CreateLeadDialog` - Add custom fields section
2. `EditLeadDialog` - Add custom fields section
3. `CreateContactDialog` - Add custom fields section
4. `CreateAccountDialog` - Add custom fields section
5. `CreateOpportunityDialog` - Add custom fields section

**Update List Views**:
1. Add custom field columns (optional)
2. Filter by custom fields
3. Sort by custom fields

---

## Validation Rules

### Field Name Validation
- Must be unique per entity type per organization
- Alphanumeric and underscores only
- Cannot start with number
- Reserved names: id, createdAt, updatedAt, organisationId, etc.

### Field Type Validation
- Text: maxLength, pattern
- Number: min, max, decimals
- Date: minDate, maxDate
- Select: must have options
- Email: email format
- Phone: phone format
- URL: URL format

### Custom Field Value Validation
```typescript
interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  options?: string[];
  minDate?: string;
  maxDate?: string;
}
```

---

## Security Considerations

### Access Control
- Only admins can create/edit/delete custom fields
- Users can only view and fill custom fields
- Custom fields scoped to organization

### Data Validation
- Server-side validation for all custom field values
- Sanitize input to prevent XSS
- Validate against field type and rules

### Data Migration
- When deleting a custom field, data is preserved in customFields JSON
- Option to permanently delete field data
- Export custom field data before deletion

---

## User Experience

### For Admins
1. Go to Settings → Custom Fields
2. Select entity type (Lead, Contact, etc.)
3. Click "Add Custom Field"
4. Configure field properties
5. Save and activate
6. Field appears in all forms immediately

### For Users
1. Open create/edit form
2. See custom fields below standard fields
3. Fill in custom fields
4. Validation happens on submit
5. Custom field values saved with record

---

## Benefits

### 1. Flexibility
- Each organization can customize CRM to their needs
- No code changes required
- Instant updates

### 2. Scalability
- Add unlimited custom fields
- Support any data type
- Easy to extend

### 3. Data Integrity
- Validation rules ensure data quality
- Required fields prevent incomplete data
- Type checking prevents errors

### 4. User Adoption
- Familiar fields increase adoption
- Industry-specific terminology
- Relevant data capture

---

## Future Enhancements

### Phase 2: Field Configuration
- Make standard fields optional
- Hide/show standard fields
- Reorder all fields
- Field dependencies (show field B if field A = X)
- Conditional required fields

### Phase 3: Advanced Features
- Calculated fields (formula-based)
- Lookup fields (reference other entities)
- Roll-up fields (aggregate from related records)
- Field history tracking
- Field-level permissions

### Phase 4: Complete Customization
- Custom entities (beyond Lead, Contact, etc.)
- Custom relationships
- Custom page layouts
- Custom workflows
- Custom reports based on custom fields

---

## Estimated Effort

### Backend (2-3 days)
- Database migration: 2 hours
- Controller & routes: 4 hours
- Validation service: 4 hours
- Testing: 4 hours

### Frontend (3-4 days)
- Settings page: 8 hours
- Custom field dialog: 6 hours
- Dynamic field rendering: 8 hours
- Form integration: 6 hours
- Testing: 4 hours

### Total: 5-7 days for Phase 1

---

## Priority

**High Priority**:
- Custom fields for Leads (most requested)
- Basic field types (text, number, select, date)
- Settings UI for field management

**Medium Priority**:
- Custom fields for Contacts, Accounts, Opportunities
- Advanced field types (multi-select, URL, etc.)
- Field validation rules

**Low Priority**:
- Field dependencies
- Calculated fields
- Custom entities

---

## Next Steps

1. **Review & Approve** this specification
2. **Create database migration** for CustomField model
3. **Implement backend** API endpoints
4. **Create frontend** settings UI
5. **Integrate** with existing forms
6. **Test** thoroughly
7. **Deploy** to production
8. **Document** for users

---

**Status**: Specification Complete - Ready for Implementation
**Estimated Timeline**: 1-2 weeks for Phase 1
**Complexity**: High
**Impact**: Very High - Major feature enhancement

