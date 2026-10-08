-- Task 22: Demo hierarchy — Demo + DemoAccess tables, Scenario.demoId FK.
--
-- Adds:
--  - Demo table (top-level container in the demo-platform hierarchy)
--  - DemoAccess table (per-user access grants to a Demo)
--  - Scenario.demoId nullable FK (nullable for backward compat)
--  - Back-fill: every existing Scenario without a demoId gets a per-owner
--    "Default Demo" container created and assigned. This is done in pure
--    SQL using a CTE that groups scenarios by clientId.
--
-- All migrations are Postgres-compatible (Vercel deploy runs `prisma
-- migrate deploy`).

-- =========================================================================
-- 1. Demo table
-- =========================================================================
CREATE TABLE IF NOT EXISTS "Demo" (
  "id"          TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "ownerId"     TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'active',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Demo_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Demo"
  ADD CONSTRAINT "Demo_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Demo_ownerId_idx" ON "Demo"("ownerId");
CREATE INDEX IF NOT EXISTS "Demo_status_idx" ON "Demo"("status");

-- =========================================================================
-- 2. DemoAccess table
-- =========================================================================
CREATE TABLE IF NOT EXISTS "DemoAccess" (
  "id"          TEXT NOT NULL,
  "demoId"      TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "accessLevel" TEXT NOT NULL DEFAULT 'view',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoAccess_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DemoAccess"
  ADD CONSTRAINT "DemoAccess_demoId_fkey"
  FOREIGN KEY ("demoId") REFERENCES "Demo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DemoAccess"
  ADD CONSTRAINT "DemoAccess_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "DemoAccess_demoId_userId_key"
  ON "DemoAccess"("demoId", "userId");

CREATE INDEX IF NOT EXISTS "DemoAccess_userId_idx" ON "DemoAccess"("userId");

-- =========================================================================
-- 3. Scenario.demoId nullable FK
-- =========================================================================
ALTER TABLE "Scenario"
  ADD COLUMN IF NOT EXISTS "demoId" TEXT;

ALTER TABLE "Scenario"
  ADD CONSTRAINT "Scenario_demoId_fkey"
  FOREIGN KEY ("demoId") REFERENCES "Demo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Scenario_demoId_idx" ON "Scenario"("demoId");

-- =========================================================================
-- 4. Back-fill: create a "Default Demo" for each client that has scenarios
--    without a demoId, then assign those scenarios to it.
--
--    We use a DO block + cursors so we can call gen_random_uuid() per
--    client (cuid-style strings would need an app-level generator; the
--    gen_random_uuid() function is available on Postgres 13+ and returns
--    a UUID we cast to text — the cuid-style IDs in the rest of the DB
--    are TEXT so this works fine).
-- =========================================================================
DO $$
DECLARE
  client RECORD;
  demo_id TEXT;
BEGIN
  FOR client IN
    SELECT DISTINCT s."clientId" AS cid
    FROM "Scenario" s
    WHERE s."demoId" IS NULL
  LOOP
    -- Generate a cuid-style text id (use gen_random_uuid cast to text)
    demo_id := (SELECT gen_random_uuid()::text);
    INSERT INTO "Demo" ("id", "name", "description", "ownerId", "status", "createdAt", "updatedAt")
    VALUES (demo_id, 'Default Demo', 'Auto-created during the Demo hierarchy migration.', client.cid, 'active', NOW(), NOW());

    UPDATE "Scenario"
    SET "demoId" = demo_id
    WHERE "clientId" = client.cid AND "demoId" IS NULL;
  END LOOP;
END $$;
