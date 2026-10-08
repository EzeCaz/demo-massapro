-- Task 21: Demo Platform, Hierarchical User Management, Support Tickets
--
-- Adds:
--  - User profile fields (companyId, teamId, jobTitle, phone, linkedinUrl,
--    country, city, avatarUrl, bio, status, approvedBy, approvedAt)
--  - Company model (top-level hierarchy unit)
--  - Team model (sub-unit of a Company)
--  - SupportTicket model (with CC emails stored as JSON, priority, status)
--  - SupportTicketAttachment (file content in DB for serverless)
--  - TicketComment (threaded replies, internal notes)
--  - SOWSnapshot (persisted SOW state — owner, company, team, status, payload JSON)
--
-- All migrations are Postgres-compatible (Vercel deploy runs `prisma
-- migrate deploy`). Tables are created with the Prisma-standard naming
-- (PascalCase model → PascalCase table) and primary keys are TEXT
-- (cuid strings).

-- =========================================================================
-- 1. User profile columns (additive — all nullable, all default to NULL
--    or 'active' for status)
-- =========================================================================
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "companyId"   TEXT,
  ADD COLUMN IF NOT EXISTS "teamId"      TEXT,
  ADD COLUMN IF NOT EXISTS "jobTitle"    TEXT,
  ADD COLUMN IF NOT EXISTS "phone"       TEXT,
  ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "country"     TEXT,
  ADD COLUMN IF NOT EXISTS "city"        TEXT,
  ADD COLUMN IF NOT EXISTS "avatarUrl"   TEXT,
  ADD COLUMN IF NOT EXISTS "bio"         TEXT,
  ADD COLUMN IF NOT EXISTS "status"      TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

-- =========================================================================
-- 2. Company table
-- =========================================================================
CREATE TABLE IF NOT EXISTS "Company" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "status"      TEXT NOT NULL DEFAULT 'active',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Company_name_key" ON "Company"("name");

-- =========================================================================
-- 3. Team table
-- =========================================================================
CREATE TABLE IF NOT EXISTS "Team" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "companyId"   TEXT NOT NULL,
  "description" TEXT,
  "status"      TEXT NOT NULL DEFAULT 'active',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Team_companyId_name_key" ON "Team"("companyId", "name");

-- FK Team → Company (CASCADE on delete — deleting a company removes its teams)
ALTER TABLE "Team"
  ADD CONSTRAINT "Team_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================================
-- 4. User FKs to Company and Team
-- =========================================================================
-- RESTRICT on delete: must remove users from a Company/Team before deleting it
ALTER TABLE "User"
  ADD CONSTRAINT "User_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for filtering users by company/team
CREATE INDEX IF NOT EXISTS "User_companyId_idx" ON "User"("companyId");
CREATE INDEX IF NOT EXISTS "User_teamId_idx" ON "User"("teamId");
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");

-- =========================================================================
-- 5. SupportTicket table
-- =========================================================================
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id"            TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "subject"       TEXT NOT NULL,
  "description"   TEXT NOT NULL,
  "priority"      TEXT NOT NULL DEFAULT 'normal',
  "status"        TEXT NOT NULL DEFAULT 'open',
  "category"      TEXT,
  "submittedById" TEXT NOT NULL,
  "assignedToId"  TEXT,
  "ccEmails"      JSONB,
  "resolvedAt"    TIMESTAMP(3),
  "closedAt"       TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_submittedById_fkey"
  FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SupportTicket_submittedById_idx" ON "SupportTicket"("submittedById");
CREATE INDEX IF NOT EXISTS "SupportTicket_assignedToId_idx" ON "SupportTicket"("assignedToId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_priority_idx" ON "SupportTicket"("priority");
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- =========================================================================
-- 6. SupportTicketAttachment table
-- =========================================================================
CREATE TABLE IF NOT EXISTS "SupportTicketAttachment" (
  "id"        TEXT NOT NULL,
  "ticketId"  TEXT NOT NULL,
  "fileName"  TEXT NOT NULL,
  "fileType"  TEXT,
  "fileSize"  INTEGER,
  "data"      BYTEA,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportTicketAttachment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SupportTicketAttachment"
  ADD CONSTRAINT "SupportTicketAttachment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SupportTicketAttachment_ticketId_idx" ON "SupportTicketAttachment"("ticketId");

-- =========================================================================
-- 7. TicketComment table
-- =========================================================================
CREATE TABLE IF NOT EXISTS "TicketComment" (
  "id"         TEXT NOT NULL,
  "ticketId"   TEXT NOT NULL,
  "authorId"   TEXT NOT NULL,
  "content"    TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TicketComment"
  ADD CONSTRAINT "TicketComment_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketComment"
  ADD CONSTRAINT "TicketComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "TicketComment_ticketId_idx" ON "TicketComment"("ticketId");

-- =========================================================================
-- 8. SOWSnapshot table
-- =========================================================================
CREATE TABLE IF NOT EXISTS "SOWSnapshot" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "ownerId"     TEXT NOT NULL,
  "companyId"   TEXT,
  "teamId"      TEXT,
  "status"      TEXT NOT NULL DEFAULT 'draft',
  "payload"     JSONB NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "approvedAt"  TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SOWSnapshot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SOWSnapshot"
  ADD CONSTRAINT "SOWSnapshot_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SOWSnapshot_ownerId_idx" ON "SOWSnapshot"("ownerId");
CREATE INDEX IF NOT EXISTS "SOWSnapshot_companyId_idx" ON "SOWSnapshot"("companyId");
CREATE INDEX IF NOT EXISTS "SOWSnapshot_status_idx" ON "SOWSnapshot"("status");
