-- CreateTable
CREATE TABLE "ReminderProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "breakfastTime" TEXT NOT NULL DEFAULT '08:00',
    "lunchTime" TEXT NOT NULL DEFAULT '12:30',
    "dinnerTime" TEXT NOT NULL DEFAULT '19:00',
    "lastSentMeal" TEXT,
    "lastSentDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderProfile_userId_key" ON "ReminderProfile"("userId");

-- AddForeignKey
ALTER TABLE "ReminderProfile" ADD CONSTRAINT "ReminderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
