
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.OrganisationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  domain: 'domain',
  logo: 'logo',
  subscription: 'subscription',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  address: 'address',
  status: 'status',
  dailyReportTime: 'dailyReportTime',
  dailyReportEmailEnabled: 'dailyReportEmailEnabled',
  userLimit: 'userLimit',
  contactLimit: 'contactLimit',
  storageLimit: 'storageLimit',
  currency: 'currency',
  userIdCounter: 'userIdCounter',
  apiKey: 'apiKey',
  integrations: 'integrations',
  leadScoringConfig: 'leadScoringConfig',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  upsellConfig: 'upsellConfig',
  ssoConfig: 'ssoConfig',
  leadStatuses: 'leadStatuses',
  opportunityLeadStatuses: 'opportunityLeadStatuses'
};

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  userId: 'userId',
  password: 'password',
  role: 'role',
  position: 'position',
  phone: 'phone',
  profileImage: 'profileImage',
  isPlaceholder: 'isPlaceholder',
  isActive: 'isActive',
  isOffDuty: 'isOffDuty',
  lastLogin: 'lastLogin',
  integrations: 'integrations',
  metaAccessToken: 'metaAccessToken',
  metaUserId: 'metaUserId',
  notificationPreferences: 'notificationPreferences',
  resetPasswordToken: 'resetPasswordToken',
  resetPasswordExpire: 'resetPasswordExpire',
  workingHours: 'workingHours',
  timezone: 'timezone',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organisationId: 'organisationId',
  reportsToId: 'reportsToId',
  permissions: 'permissions',
  dailyLeadQuota: 'dailyLeadQuota',
  teamId: 'teamId',
  branchId: 'branchId'
};

exports.Prisma.TeamScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  managerId: 'managerId',
  createdById: 'createdById',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  title: 'title',
  message: 'message',
  type: 'type',
  relatedResource: 'relatedResource',
  relatedId: 'relatedId',
  isRead: 'isRead',
  recipientId: 'recipientId',
  organisationId: 'organisationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeadScalarFieldEnum = {
  id: 'id',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  secondaryPhone: 'secondaryPhone',
  phoneCountryCode: 'phoneCountryCode',
  country: 'country',
  countryCode: 'countryCode',
  company: 'company',
  enquiryAbout: 'enquiryAbout',
  jobTitle: 'jobTitle',
  address: 'address',
  source: 'source',
  sourceDetails: 'sourceDetails',
  leadScore: 'leadScore',
  engagementScore: 'engagementScore',
  qualityScore: 'qualityScore',
  isHotLead: 'isHotLead',
  lastScoredAt: 'lastScoredAt',
  status: 'status',
  stage: 'stage',
  customFields: 'customFields',
  activities: 'activities',
  tags: 'tags',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organisationId: 'organisationId',
  assignedToId: 'assignedToId',
  teamId: 'teamId',
  managerExplanation: 'managerExplanation',
  previousOwnerId: 'previousOwnerId',
  rotationViolation: 'rotationViolation',
  userExplanation: 'userExplanation',
  violationTime: 'violationTime',
  nextFollowUp: 'nextFollowUp',
  isReEnquiry: 'isReEnquiry',
  reEnquiryCount: 'reEnquiryCount',
  lastEnquiryDate: 'lastEnquiryDate',
  originalLeadId: 'originalLeadId',
  createdById: 'createdById',
  pipelineId: 'pipelineId',
  potentialValue: 'potentialValue',
  branchId: 'branchId'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  name: 'name',
  industry: 'industry',
  website: 'website',
  size: 'size',
  annualRevenue: 'annualRevenue',
  address: 'address',
  phone: 'phone',
  type: 'type',
  customFields: 'customFields',
  tags: 'tags',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isDeleted: 'isDeleted',
  ownerId: 'ownerId',
  organisationId: 'organisationId',
  parentAccountId: 'parentAccountId',
  leadId: 'leadId',
  branchId: 'branchId'
};

exports.Prisma.ContactScalarFieldEnum = {
  id: 'id',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phones: 'phones',
  jobTitle: 'jobTitle',
  department: 'department',
  address: 'address',
  socialProfiles: 'socialProfiles',
  doNotEmail: 'doNotEmail',
  doNotCall: 'doNotCall',
  leadSource: 'leadSource',
  customFields: 'customFields',
  tags: 'tags',
  lastActivity: 'lastActivity',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  accountId: 'accountId',
  ownerId: 'ownerId',
  organisationId: 'organisationId',
  leadId: 'leadId',
  branchId: 'branchId'
};

exports.Prisma.OpportunityScalarFieldEnum = {
  id: 'id',
  name: 'name',
  amount: 'amount',
  stage: 'stage',
  probability: 'probability',
  closeDate: 'closeDate',
  leadSource: 'leadSource',
  description: 'description',
  customFields: 'customFields',
  tags: 'tags',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  accountId: 'accountId',
  ownerId: 'ownerId',
  organisationId: 'organisationId',
  paymentStatus: 'paymentStatus',
  paymentDate: 'paymentDate',
  leadId: 'leadId',
  pipelineId: 'pipelineId',
  leadStatus: 'leadStatus',
  lostReason: 'lostReason',
  type: 'type',
  branchId: 'branchId'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  name: 'name',
  sku: 'sku',
  description: 'description',
  basePrice: 'basePrice',
  currency: 'currency',
  taxRate: 'taxRate',
  category: 'category',
  tags: 'tags',
  unit: 'unit',
  minQuantity: 'minQuantity',
  maxQuantity: 'maxQuantity',
  imageUrl: 'imageUrl',
  isActive: 'isActive',
  brochureUrl: 'brochureUrl',
  validFrom: 'validFrom',
  validUntil: 'validUntil',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdById: 'createdById',
  organisationId: 'organisationId'
};

exports.Prisma.LeadProductScalarFieldEnum = {
  id: 'id',
  leadId: 'leadId',
  productId: 'productId',
  quantity: 'quantity',
  price: 'price'
};

exports.Prisma.AccountProductScalarFieldEnum = {
  id: 'id',
  quantity: 'quantity',
  purchaseDate: 'purchaseDate',
  serialNumber: 'serialNumber',
  status: 'status',
  notes: 'notes',
  accountId: 'accountId',
  productId: 'productId',
  organisationId: 'organisationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.QuoteScalarFieldEnum = {
  id: 'id',
  quoteNumber: 'quoteNumber',
  title: 'title',
  description: 'description',
  subtotal: 'subtotal',
  totalDiscount: 'totalDiscount',
  totalTax: 'totalTax',
  grandTotal: 'grandTotal',
  currency: 'currency',
  validUntil: 'validUntil',
  paymentTerms: 'paymentTerms',
  termsAndConditions: 'termsAndConditions',
  notes: 'notes',
  status: 'status',
  version: 'version',
  sentAt: 'sentAt',
  viewedAt: 'viewedAt',
  respondedAt: 'respondedAt',
  pdfUrl: 'pdfUrl',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  opportunityId: 'opportunityId',
  accountId: 'accountId',
  contactId: 'contactId',
  assignedToId: 'assignedToId',
  createdById: 'createdById',
  organisationId: 'organisationId'
};

exports.Prisma.QuoteLineItemScalarFieldEnum = {
  id: 'id',
  productName: 'productName',
  description: 'description',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  discount: 'discount',
  discountType: 'discountType',
  taxRate: 'taxRate',
  total: 'total',
  quoteId: 'quoteId',
  productId: 'productId'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  subject: 'subject',
  description: 'description',
  status: 'status',
  priority: 'priority',
  dueDate: 'dueDate',
  leadId: 'leadId',
  contactId: 'contactId',
  accountId: 'accountId',
  opportunityId: 'opportunityId',
  assignedToId: 'assignedToId',
  createdById: 'createdById',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  branchId: 'branchId'
};

exports.Prisma.InteractionScalarFieldEnum = {
  id: 'id',
  type: 'type',
  direction: 'direction',
  subject: 'subject',
  description: 'description',
  date: 'date',
  duration: 'duration',
  recordingUrl: 'recordingUrl',
  recordingDuration: 'recordingDuration',
  callStatus: 'callStatus',
  phoneNumber: 'phoneNumber',
  callerId: 'callerId',
  leadId: 'leadId',
  contactId: 'contactId',
  accountId: 'accountId',
  opportunityId: 'opportunityId',
  createdById: 'createdById',
  organisationId: 'organisationId',
  documentId: 'documentId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  branchId: 'branchId'
};

exports.Prisma.CalendarEventScalarFieldEnum = {
  id: 'id',
  title: 'title',
  description: 'description',
  type: 'type',
  startTime: 'startTime',
  endTime: 'endTime',
  allDay: 'allDay',
  timezone: 'timezone',
  recurrence: 'recurrence',
  location: 'location',
  virtualMeeting: 'virtualMeeting',
  attendees: 'attendees',
  reminders: 'reminders',
  externalSync: 'externalSync',
  status: 'status',
  outcome: 'outcome',
  leadId: 'leadId',
  contactId: 'contactId',
  accountId: 'accountId',
  opportunityId: 'opportunityId',
  createdById: 'createdById',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmailListScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdById: 'createdById',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  subject: 'subject',
  content: 'content',
  status: 'status',
  scheduledAt: 'scheduledAt',
  sentAt: 'sentAt',
  stats: 'stats',
  customFields: 'customFields',
  emailListId: 'emailListId',
  createdById: 'createdById',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  triggerEntity: 'triggerEntity',
  triggerEvent: 'triggerEvent',
  conditions: 'conditions',
  actions: 'actions',
  executionCount: 'executionCount',
  lastExecutedAt: 'lastExecutedAt',
  createdById: 'createdById',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WorkflowQueueScalarFieldEnum = {
  id: 'id',
  workflowId: 'workflowId',
  entityId: 'entityId',
  organisationId: 'organisationId',
  nextActionIndex: 'nextActionIndex',
  executeAt: 'executeAt',
  status: 'status',
  data: 'data'
};

exports.Prisma.WorkflowRuleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  triggerEntity: 'triggerEntity',
  triggerEvent: 'triggerEvent',
  triggerField: 'triggerField',
  conditions: 'conditions',
  actions: 'actions',
  executionCount: 'executionCount',
  lastExecutedAt: 'lastExecutedAt',
  createdById: 'createdById',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DocumentTemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  type: 'type',
  content: 'content',
  mergeFields: 'mergeFields',
  styling: 'styling',
  version: 'version',
  isActive: 'isActive',
  isDefault: 'isDefault',
  stats: 'stats',
  createdById: 'createdById',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SMSTemplateScalarFieldEnum = {
  id: 'id',
  name: 'name',
  content: 'content',
  variables: 'variables',
  category: 'category',
  language: 'language',
  dltTemplateId: 'dltTemplateId',
  senderId: 'senderId',
  isActive: 'isActive',
  createdById: 'createdById',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionPlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  features: 'features',
  price: 'price',
  billingType: 'billingType',
  pricingModel: 'pricingModel',
  pricePerUser: 'pricePerUser',
  currency: 'currency',
  durationDays: 'durationDays',
  maxUsers: 'maxUsers',
  maxLeads: 'maxLeads',
  maxContacts: 'maxContacts',
  maxStorage: 'maxStorage',
  isActive: 'isActive',
  discount: 'discount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LicenseScalarFieldEnum = {
  id: 'id',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  maxUsers: 'maxUsers',
  currentUsers: 'currentUsers',
  paymentDetails: 'paymentDetails',
  autoRenew: 'autoRenew',
  renewalReminders: 'renewalReminders',
  cancellationReason: 'cancellationReason',
  cancelledAt: 'cancelledAt',
  organisationId: 'organisationId',
  planId: 'planId',
  activatedById: 'activatedById',
  cancelledById: 'cancelledById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AssignmentRuleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  priority: 'priority',
  entity: 'entity',
  distributionType: 'distributionType',
  distributionScope: 'distributionScope',
  targetRole: 'targetRole',
  targetManagerId: 'targetManagerId',
  lastAssignedUserId: 'lastAssignedUserId',
  ruleType: 'ruleType',
  criteria: 'criteria',
  assignTo: 'assignTo',
  organisationId: 'organisationId',
  createdById: 'createdById',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  enableRotation: 'enableRotation',
  rotationPool: 'rotationPool',
  rotationType: 'rotationType',
  timeLimitMinutes: 'timeLimitMinutes',
  branchId: 'branchId',
  companySize: 'companySize',
  leadScore: 'leadScore',
  dealValue: 'dealValue'
};

exports.Prisma.SalesTargetScalarFieldEnum = {
  id: 'id',
  targetValue: 'targetValue',
  achievedValue: 'achievedValue',
  period: 'period',
  startDate: 'startDate',
  endDate: 'endDate',
  status: 'status',
  metric: 'metric',
  autoDistributed: 'autoDistributed',
  lastNotifiedDate: 'lastNotifiedDate',
  organisationId: 'organisationId',
  assignedToId: 'assignedToId',
  teamId: 'teamId',
  assignedById: 'assignedById',
  parentTargetId: 'parentTargetId',
  productId: 'productId',
  scope: 'scope',
  opportunityType: 'opportunityType',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.GoalScalarFieldEnum = {
  id: 'id',
  description: 'description',
  type: 'type',
  targetValue: 'targetValue',
  currentValue: 'currentValue',
  period: 'period',
  achievementPercent: 'achievementPercent',
  startDate: 'startDate',
  endDate: 'endDate',
  completedAt: 'completedAt',
  status: 'status',
  organisationId: 'organisationId',
  assignedToId: 'assignedToId',
  createdById: 'createdById',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CaseScalarFieldEnum = {
  id: 'id',
  caseNumber: 'caseNumber',
  subject: 'subject',
  description: 'description',
  status: 'status',
  priority: 'priority',
  type: 'type',
  resolvedAt: 'resolvedAt',
  resolution: 'resolution',
  contactId: 'contactId',
  accountId: 'accountId',
  assignedToId: 'assignedToId',
  createdById: 'createdById',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CheckInScalarFieldEnum = {
  id: 'id',
  type: 'type',
  address: 'address',
  latitude: 'latitude',
  longitude: 'longitude',
  notes: 'notes',
  photoUrl: 'photoUrl',
  userId: 'userId',
  organisationId: 'organisationId',
  leadId: 'leadId',
  contactId: 'contactId',
  accountId: 'accountId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ApiKeyScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  keyHash: 'keyHash',
  keyPrefix: 'keyPrefix',
  permissions: 'permissions',
  rateLimit: 'rateLimit',
  allowedIPs: 'allowedIPs',
  usage: 'usage',
  status: 'status',
  expiresAt: 'expiresAt',
  organisationId: 'organisationId',
  createdById: 'createdById',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SearchHistoryScalarFieldEnum = {
  id: 'id',
  query: 'query',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.CustomFieldScalarFieldEnum = {
  id: 'id',
  name: 'name',
  label: 'label',
  entityType: 'entityType',
  fieldType: 'fieldType',
  options: 'options',
  isRequired: 'isRequired',
  defaultValue: 'defaultValue',
  placeholder: 'placeholder',
  order: 'order',
  isActive: 'isActive',
  showInList: 'showInList',
  showInForm: 'showInForm',
  organisationId: 'organisationId',
  createdById: 'createdById',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TerritoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  region: 'region',
  country: 'country',
  states: 'states',
  cities: 'cities',
  managerId: 'managerId',
  memberIds: 'memberIds',
  isActive: 'isActive',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebhookScalarFieldEnum = {
  id: 'id',
  name: 'name',
  url: 'url',
  events: 'events',
  secret: 'secret',
  headers: 'headers',
  isActive: 'isActive',
  lastTriggeredAt: 'lastTriggeredAt',
  successCount: 'successCount',
  failureCount: 'failureCount',
  lastError: 'lastError',
  organisationId: 'organisationId',
  createdById: 'createdById',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserLeadQuotaTrackerScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  date: 'date',
  leadCount: 'leadCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CallSettingsScalarFieldEnum = {
  id: 'id',
  autoRecordOutbound: 'autoRecordOutbound',
  autoRecordInbound: 'autoRecordInbound',
  recordingQuality: 'recordingQuality',
  storageType: 'storageType',
  retentionDays: 'retentionDays',
  autoDeleteEnabled: 'autoDeleteEnabled',
  popupOnIncoming: 'popupOnIncoming',
  autoFollowupReminder: 'autoFollowupReminder',
  followupDelayMinutes: 'followupDelayMinutes',
  organisationId: 'organisationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeadHistoryScalarFieldEnum = {
  id: 'id',
  leadId: 'leadId',
  oldOwnerId: 'oldOwnerId',
  newOwnerId: 'newOwnerId',
  changedById: 'changedById',
  reason: 'reason',
  fieldName: 'fieldName',
  oldValue: 'oldValue',
  newValue: 'newValue',
  createdAt: 'createdAt'
};

exports.Prisma.ImportJobScalarFieldEnum = {
  id: 'id',
  status: 'status',
  progress: 'progress',
  total: 'total',
  successCount: 'successCount',
  failureCount: 'failureCount',
  errors: 'errors',
  fileUrl: 'fileUrl',
  mapping: 'mapping',
  metadata: 'metadata',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  createdById: 'createdById',
  organisationId: 'organisationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PipelineScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  stages: 'stages',
  isDefault: 'isDefault',
  isActive: 'isActive',
  organisationId: 'organisationId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isDeleted: 'isDeleted'
};

exports.Prisma.WebFormScalarFieldEnum = {
  id: 'id',
  name: 'name',
  code: 'code',
  fields: 'fields',
  settings: 'settings',
  isActive: 'isActive',
  organisationId: 'organisationId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isDeleted: 'isDeleted'
};

exports.Prisma.SMSCampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  message: 'message',
  status: 'status',
  scheduledAt: 'scheduledAt',
  sentAt: 'sentAt',
  recipientCount: 'recipientCount',
  stats: 'stats',
  organisationId: 'organisationId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isDeleted: 'isDeleted'
};

exports.Prisma.WhatsAppCampaignScalarFieldEnum = {
  id: 'id',
  name: 'name',
  message: 'message',
  templateId: 'templateId',
  status: 'status',
  scheduledAt: 'scheduledAt',
  sentAt: 'sentAt',
  recipients: 'recipients',
  testNumber: 'testNumber',
  customFields: 'customFields',
  stats: 'stats',
  organisationId: 'organisationId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isDeleted: 'isDeleted'
};

exports.Prisma.WhatsAppMessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  phoneNumber: 'phoneNumber',
  direction: 'direction',
  messageType: 'messageType',
  content: 'content',
  status: 'status',
  waMessageId: 'waMessageId',
  errorCode: 'errorCode',
  errorMessage: 'errorMessage',
  sentAt: 'sentAt',
  deliveredAt: 'deliveredAt',
  readAt: 'readAt',
  organisationId: 'organisationId',
  leadId: 'leadId',
  contactId: 'contactId',
  agentId: 'agentId',
  campaignId: 'campaignId',
  isReadByAgent: 'isReadByAgent',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isDeleted: 'isDeleted'
};

exports.Prisma.CommissionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  type: 'type',
  description: 'description',
  dealId: 'dealId',
  date: 'date',
  organisationId: 'organisationId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isDeleted: 'isDeleted'
};

exports.Prisma.LandingPageScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  content: 'content',
  html: 'html',
  status: 'status',
  publishedAt: 'publishedAt',
  views: 'views',
  conversions: 'conversions',
  organisationId: 'organisationId',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isDeleted: 'isDeleted'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  action: 'action',
  entity: 'entity',
  entityId: 'entityId',
  actorId: 'actorId',
  details: 'details',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  organisationId: 'organisationId',
  createdAt: 'createdAt'
};

exports.Prisma.DocumentScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  fileKey: 'fileKey',
  fileUrl: 'fileUrl',
  fileData: 'fileData',
  fileType: 'fileType',
  fileSize: 'fileSize',
  category: 'category',
  tags: 'tags',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  organisationId: 'organisationId',
  createdById: 'createdById',
  leadId: 'leadId',
  contactId: 'contactId',
  accountId: 'accountId',
  opportunityId: 'opportunityId'
};

exports.Prisma.ProductShareScalarFieldEnum = {
  id: 'id',
  slug: 'slug',
  views: 'views',
  notificationsEnabled: 'notificationsEnabled',
  productId: 'productId',
  createdById: 'createdById',
  organisationId: 'organisationId',
  youtubeUrl: 'youtubeUrl',
  customTitle: 'customTitle',
  customDescription: 'customDescription',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BranchScalarFieldEnum = {
  id: 'id',
  name: 'name',
  location: 'location',
  contactEmail: 'contactEmail',
  contactPhone: 'contactPhone',
  managerId: 'managerId',
  organisationId: 'organisationId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SystemSettingScalarFieldEnum = {
  id: 'id',
  key: 'key',
  value: 'value',
  group: 'group',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  roleKey: 'roleKey',
  name: 'name',
  description: 'description',
  permissions: 'permissions',
  isSystemRole: 'isSystemRole',
  organisationId: 'organisationId',
  updatedAt: 'updatedAt'
};

exports.Prisma.EMIScheduleScalarFieldEnum = {
  id: 'id',
  totalAmount: 'totalAmount',
  paidAmount: 'paidAmount',
  remainingAmount: 'remainingAmount',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  opportunityId: 'opportunityId',
  organisationId: 'organisationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EMIInstallmentScalarFieldEnum = {
  id: 'id',
  scheduleId: 'scheduleId',
  installmentNumber: 'installmentNumber',
  amount: 'amount',
  dueDate: 'dueDate',
  status: 'status',
  paidAmount: 'paidAmount',
  paidDate: 'paidDate',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.LeadSource = exports.$Enums.LeadSource = {
  website: 'website',
  referral: 'referral',
  social: 'social',
  paid_ad: 'paid_ad',
  import: 'import',
  api: 'api',
  manual: 'manual',
  whatsapp: 'whatsapp',
  meta_leadgen: 'meta_leadgen',
  meta_ads: 'meta_ads',
  cold_call: 'cold_call',
  social_media: 'social_media',
  email_campaign: 'email_campaign',
  google_ads: 'google_ads',
  other: 'other',
  unassigned: 'unassigned'
};

exports.OpportunityType = exports.$Enums.OpportunityType = {
  NEW_BUSINESS: 'NEW_BUSINESS',
  UPSALE: 'UPSALE'
};

exports.TaskStatus = exports.$Enums.TaskStatus = {
  not_started: 'not_started',
  in_progress: 'in_progress',
  completed: 'completed',
  deferred: 'deferred'
};

exports.TaskPriority = exports.$Enums.TaskPriority = {
  high: 'high',
  medium: 'medium',
  low: 'low'
};

exports.InteractionType = exports.$Enums.InteractionType = {
  call: 'call',
  email: 'email',
  meeting: 'meeting',
  note: 'note',
  other: 'other'
};

exports.InteractionDirection = exports.$Enums.InteractionDirection = {
  inbound: 'inbound',
  outbound: 'outbound'
};

exports.PricingModel = exports.$Enums.PricingModel = {
  per_user: 'per_user',
  flat_rate: 'flat_rate'
};

exports.TargetScope = exports.$Enums.TargetScope = {
  INDIVIDUAL: 'INDIVIDUAL',
  HIERARCHY: 'HIERARCHY'
};

exports.Prisma.ModelName = {
  Organisation: 'Organisation',
  User: 'User',
  Team: 'Team',
  Notification: 'Notification',
  Lead: 'Lead',
  Account: 'Account',
  Contact: 'Contact',
  Opportunity: 'Opportunity',
  Product: 'Product',
  LeadProduct: 'LeadProduct',
  AccountProduct: 'AccountProduct',
  Quote: 'Quote',
  QuoteLineItem: 'QuoteLineItem',
  Task: 'Task',
  Interaction: 'Interaction',
  CalendarEvent: 'CalendarEvent',
  EmailList: 'EmailList',
  Campaign: 'Campaign',
  Workflow: 'Workflow',
  WorkflowQueue: 'WorkflowQueue',
  WorkflowRule: 'WorkflowRule',
  DocumentTemplate: 'DocumentTemplate',
  SMSTemplate: 'SMSTemplate',
  SubscriptionPlan: 'SubscriptionPlan',
  License: 'License',
  AssignmentRule: 'AssignmentRule',
  SalesTarget: 'SalesTarget',
  Goal: 'Goal',
  Case: 'Case',
  CheckIn: 'CheckIn',
  ApiKey: 'ApiKey',
  SearchHistory: 'SearchHistory',
  CustomField: 'CustomField',
  Territory: 'Territory',
  Webhook: 'Webhook',
  UserLeadQuotaTracker: 'UserLeadQuotaTracker',
  CallSettings: 'CallSettings',
  LeadHistory: 'LeadHistory',
  ImportJob: 'ImportJob',
  Pipeline: 'Pipeline',
  WebForm: 'WebForm',
  SMSCampaign: 'SMSCampaign',
  WhatsAppCampaign: 'WhatsAppCampaign',
  WhatsAppMessage: 'WhatsAppMessage',
  Commission: 'Commission',
  LandingPage: 'LandingPage',
  AuditLog: 'AuditLog',
  Document: 'Document',
  ProductShare: 'ProductShare',
  Branch: 'Branch',
  SystemSetting: 'SystemSetting',
  Role: 'Role',
  EMISchedule: 'EMISchedule',
  EMIInstallment: 'EMIInstallment'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
