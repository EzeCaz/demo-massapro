-- IntegrationSetupShare table: magic-link shares of a single Integration
-- Setup with an external user (by email). The recipient signs in by
-- visiting /s/[token]; no password or prior account is required.

CREATE TABLE "IntegrationSetupShare" (
    "id"          TEXT NOT NULL,
    "setupId"     TEXT NOT NULL,
    "email"       TEXT NOT NULL,
    "token"       TEXT NOT NULL,
    "accessLevel" TEXT NOT NULL DEFAULT 'view',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSetupShare_pkey" PRIMARY KEY ("id")
);

-- One active share per (setup, email) pair — prevents creating duplicate
-- magic links for the same recipient on the same setup.
CREATE UNIQUE INDEX "IntegrationSetupShare_setupId_email_key"
  ON "IntegrationSetupShare"("setupId", "email");

-- The magic-link token must be globally unique (it's the secret that
-- identifies the share regardless of which setup it belongs to).
CREATE UNIQUE INDEX "IntegrationSetupShare_token_key"
  ON "IntegrationSetupShare"("token");

-- FK to IntegrationSetup. Cascade on delete — if the setup is deleted,
-- all its shares become invalid (the magic links stop working).
ALTER TABLE "IntegrationSetupShare"
  ADD CONSTRAINT "IntegrationSetupShare_setupId_fkey"
  FOREIGN KEY ("setupId") REFERENCES "IntegrationSetup"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "IntegrationSetupShare_setupId_idx" ON "IntegrationSetupShare"("setupId");
CREATE INDEX "IntegrationSetupShare_email_idx" ON "IntegrationSetupShare"("email");
