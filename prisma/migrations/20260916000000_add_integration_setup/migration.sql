-- IntegrationSetup table: mirrors the Scenario multi-language pattern.
-- Each text field has base + En + Es + He variants (4 columns per field).
-- Migration is handwritten Postgres-compatible (Vercel deploy runs
-- `prisma migrate deploy`, which executes this file against Neon).

CREATE TABLE "IntegrationSetup" (
    "id"                       TEXT NOT NULL,
    "clientId"                 TEXT NOT NULL,
    "name"                     TEXT NOT NULL,
    "status"                   TEXT NOT NULL DEFAULT 'draft',
    "submittedDate"            TIMESTAMP(3),
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL,

    -- 28 fields × 4 language variants = 112 text columns. All nullable.
    "languagesToUse"                    TEXT,
    "languagesToUseEn"                  TEXT,
    "languagesToUseEs"                  TEXT,
    "languagesToUseHe"                  TEXT,

    "telNumbers"                        TEXT,
    "telNumbersEn"                      TEXT,
    "telNumbersEs"                      TEXT,
    "telNumbersHe"                      TEXT,

    "queueSkills"                       TEXT,
    "queueSkillsEn"                     TEXT,
    "queueSkillsEs"                     TEXT,
    "queueSkillsHe"                     TEXT,

    "portedOrWhitelisted"               TEXT,
    "portedOrWhitelistedEn"             TEXT,
    "portedOrWhitelistedEs"             TEXT,
    "portedOrWhitelistedHe"             TEXT,

    "campaignStructure"                 TEXT,
    "campaignStructureEn"               TEXT,
    "campaignStructureEs"               TEXT,
    "campaignStructureHe"               TEXT,

    "crmDbAccess"                       TEXT,
    "crmDbAccessEn"                     TEXT,
    "crmDbAccessEs"                     TEXT,
    "crmDbAccessHe"                     TEXT,

    "integrationsNeeded"                TEXT,
    "integrationsNeededEn"              TEXT,
    "integrationsNeededEs"              TEXT,
    "integrationsNeededHe"              TEXT,

    "waitingPriority"                   TEXT,
    "waitingPriorityEn"                 TEXT,
    "waitingPriorityEs"                 TEXT,
    "waitingPriorityHe"                 TEXT,

    "autoDialer"                        TEXT,
    "autoDialerEn"                      TEXT,
    "autoDialerEs"                      TEXT,
    "autoDialerHe"                      TEXT,

    "omniSetup"                         TEXT,
    "omniSetupEn"                       TEXT,
    "omniSetupEs"                       TEXT,
    "omniSetupHe"                       TEXT,

    "reportsRequired"                   TEXT,
    "reportsRequiredEn"                 TEXT,
    "reportsRequiredEs"                 TEXT,
    "reportsRequiredHe"                 TEXT,

    "customerDataStorage"               TEXT,
    "customerDataStorageEn"             TEXT,
    "customerDataStorageEs"             TEXT,
    "customerDataStorageHe"             TEXT,

    "initialDataImport"                 TEXT,
    "initialDataImportEn"               TEXT,
    "initialDataImportEs"               TEXT,
    "initialDataImportHe"               TEXT,

    "voiceUsersCount"                   TEXT,
    "voiceUsersCountEn"                 TEXT,
    "voiceUsersCountEs"                 TEXT,
    "voiceUsersCountHe"                 TEXT,

    "phoneNumberRequirements"           TEXT,
    "phoneNumberRequirementsEn"         TEXT,
    "phoneNumberRequirementsEs"         TEXT,
    "phoneNumberRequirementsHe"         TEXT,

    "sipTrunkSetup"                     TEXT,
    "sipTrunkSetupEn"                   TEXT,
    "sipTrunkSetupEs"                   TEXT,
    "sipTrunkSetupHe"                   TEXT,

    "sipTrunkConfig"                    TEXT,
    "sipTrunkConfigEn"                  TEXT,
    "sipTrunkConfigEs"                  TEXT,
    "sipTrunkConfigHe"                  TEXT,

    "diallerCampaign"                   TEXT,
    "diallerCampaignEn"                 TEXT,
    "diallerCampaignEs"                 TEXT,
    "diallerCampaignHe"                 TEXT,

    "leadsPerDay"                       TEXT,
    "leadsPerDayEn"                     TEXT,
    "leadsPerDayEs"                     TEXT,
    "leadsPerDayHe"                     TEXT,

    "inboundVoiceQueue"                 TEXT,
    "inboundVoiceQueueEn"               TEXT,
    "inboundVoiceQueueEs"               TEXT,
    "inboundVoiceQueueHe"               TEXT,

    "inboundCallsPerDay"                TEXT,
    "inboundCallsPerDayEn"              TEXT,
    "inboundCallsPerDayEs"              TEXT,
    "inboundCallsPerDayHe"              TEXT,

    "ivrFlow"                           TEXT,
    "ivrFlowEn"                         TEXT,
    "ivrFlowEs"                         TEXT,
    "ivrFlowHe"                         TEXT,

    "outOfHoursRouting"                 TEXT,
    "outOfHoursRoutingEn"               TEXT,
    "outOfHoursRoutingEs"               TEXT,
    "outOfHoursRoutingHe"               TEXT,

    "emailRequirements"                 TEXT,
    "emailRequirementsEn"               TEXT,
    "emailRequirementsEs"               TEXT,
    "emailRequirementsHe"               TEXT,

    "whatsappRequirements"              TEXT,
    "whatsappRequirementsEn"            TEXT,
    "whatsappRequirementsEs"            TEXT,
    "whatsappRequirementsHe"            TEXT,

    "smsRequirements"                   TEXT,
    "smsRequirementsEn"                 TEXT,
    "smsRequirementsEs"                 TEXT,
    "smsRequirementsHe"                 TEXT,

    "facebookInstagramRequirements"     TEXT,
    "facebookInstagramRequirementsEn"   TEXT,
    "facebookInstagramRequirementsEs"   TEXT,
    "facebookInstagramRequirementsHe"   TEXT,

    "ticketingRequirements"             TEXT,
    "ticketingRequirementsEn"           TEXT,
    "ticketingRequirementsEs"           TEXT,
    "ticketingRequirementsHe"           TEXT,

    CONSTRAINT "IntegrationSetup_pkey" PRIMARY KEY ("id")
);

-- FK to User. We do NOT cascade on delete (a user owning integration setups
-- shouldn't have them silently disappear); instead, prevent user deletion
-- while setups exist. Use ON DELETE RESTRICT explicitly.
ALTER TABLE "IntegrationSetup"
  ADD CONSTRAINT "IntegrationSetup_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "IntegrationSetup_clientId_idx" ON "IntegrationSetup"("clientId");
