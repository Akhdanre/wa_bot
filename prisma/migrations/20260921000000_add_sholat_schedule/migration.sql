-- AlterTable
ALTER TABLE "ReminderProfile" ADD COLUMN "sholatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "provinsi" TEXT DEFAULT 'DKI Jakarta',
ADD COLUMN "kabkota" TEXT DEFAULT 'Kota Jakarta Pusat',
ADD COLUMN "lastSentSholat" TEXT,
ADD COLUMN "lastSholatDate" TEXT;

-- CreateTable
CREATE TABLE "SholatSchedule" (
    "id" SERIAL NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kabkota" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "subuh" TEXT NOT NULL,
    "dzuhur" TEXT NOT NULL,
    "ashar" TEXT NOT NULL,
    "maghrib" TEXT NOT NULL,
    "isya" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SholatSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SholatSchedule_provinsi_kabkota_date_key" ON "SholatSchedule"("provinsi", "kabkota", "date");

-- CreateIndex
CREATE INDEX "SholatSchedule_provinsi_kabkota_year_month_idx" ON "SholatSchedule"("provinsi", "kabkota", "year", "month");
