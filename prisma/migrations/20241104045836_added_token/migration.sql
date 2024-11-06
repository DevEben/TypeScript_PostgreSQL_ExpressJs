/*
  Warnings:

  - A unique constraint covering the columns `[pictureId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pictureId" TEXT,
ADD COLUMN     "token" TEXT;

-- CreateTable
CREATE TABLE "pictures" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "pictures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pictures_userId_key" ON "pictures"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_pictureId_key" ON "users"("pictureId");

-- AddForeignKey
ALTER TABLE "pictures" ADD CONSTRAINT "pictures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
