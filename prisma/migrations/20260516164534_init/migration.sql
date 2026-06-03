-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'BAANKNET',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "propertyType" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "reservePrice" REAL NOT NULL,
    "emdAmount" REAL,
    "estimatedFmv" REAL,
    "discountPct" REAL,
    "builtUpArea" REAL,
    "carpetArea" REAL,
    "bedrooms" INTEGER,
    "auctionDate" DATETIME,
    "possessionType" TEXT,
    "auctionStatus" TEXT NOT NULL DEFAULT 'UPCOMING',
    "dhScore" INTEGER,
    "scoreSignals" TEXT,
    "pipelineStage" TEXT NOT NULL DEFAULT 'INGESTED',
    "notes" TEXT,
    "imageUrls" TEXT NOT NULL DEFAULT '[]',
    "sourceUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "type" TEXT NOT NULL,
    "ticketSize" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InvestorInterest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "propertyId" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestorInterest_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvestorInterest_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_externalId_key" ON "Property"("externalId");

-- CreateIndex
CREATE INDEX "Property_city_propertyType_idx" ON "Property"("city", "propertyType");

-- CreateIndex
CREATE INDEX "Property_dhScore_idx" ON "Property"("dhScore");

-- CreateIndex
CREATE INDEX "Property_auctionDate_idx" ON "Property"("auctionDate");

-- CreateIndex
CREATE INDEX "Property_pipelineStage_idx" ON "Property"("pipelineStage");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_email_key" ON "Investor"("email");

-- CreateIndex
CREATE INDEX "InvestorInterest_propertyId_idx" ON "InvestorInterest"("propertyId");

-- CreateIndex
CREATE INDEX "InvestorInterest_investorId_idx" ON "InvestorInterest"("investorId");
