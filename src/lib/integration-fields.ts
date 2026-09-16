// The 28 base field names for the Integration Setup form.
// Kept in sync with prisma/schema.prisma's IntegrationSetup model and
// with the i18n keys at `integration.field.<key>`.
//
// Each field has 4 column variants in the DB:
//   <key>           — base / original
//   <key>En         — English translation
//   <key>Es         — Spanish translation
//   <key>He         — Hebrew translation
//
// This shared constant is imported by both the API route (for field
// whitelisting on PUT) and the form component (for rendering), so they
// cannot drift out of sync.

export const INTEGRATION_FIELDS = [
  'languagesToUse',
  'telNumbers',
  'queueSkills',
  'portedOrWhitelisted',
  'campaignStructure',
  'crmDbAccess',
  'integrationsNeeded',
  'waitingPriority',
  'autoDialer',
  'omniSetup',
  'reportsRequired',
  'customerDataStorage',
  'initialDataImport',
  'voiceUsersCount',
  'phoneNumberRequirements',
  'sipTrunkSetup',
  'sipTrunkConfig',
  'diallerCampaign',
  'leadsPerDay',
  'inboundVoiceQueue',
  'inboundCallsPerDay',
  'ivrFlow',
  'outOfHoursRouting',
  'emailRequirements',
  'whatsappRequirements',
  'smsRequirements',
  'facebookInstagramRequirements',
  'ticketingRequirements',
] as const

export type IntegrationFieldKey = typeof INTEGRATION_FIELDS[number]
