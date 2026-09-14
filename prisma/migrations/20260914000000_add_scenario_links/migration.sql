-- CreateTable
CREATE TABLE "ScenarioLink" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScenarioLink_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScenarioLink" ADD CONSTRAINT "ScenarioLink_scenarioId_fkey"
  FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
