-- CreateTable
CREATE TABLE "FishProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "rodLevel" INTEGER NOT NULL DEFAULT 1,
    "rodHealth" INTEGER NOT NULL DEFAULT 10,
    "totalCaught" INTEGER NOT NULL DEFAULT 0,
    "totalTrash" INTEGER NOT NULL DEFAULT 0,
    "totalSold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FishProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FishInventory" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "fishKey" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "tankQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FishInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FishProfile_userId_key" ON "FishProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FishInventory_profileId_fishKey_key" ON "FishInventory"("profileId", "fishKey");

-- AddForeignKey
ALTER TABLE "FishProfile" ADD CONSTRAINT "FishProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FishInventory" ADD CONSTRAINT "FishInventory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "FishProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
