/*
  Warnings:

  - You are about to drop the column `description` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Task" DROP COLUMN "description";

-- CreateTable
CREATE TABLE "TaskContent" (
    "taskId" INTEGER NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskContent_pkey" PRIMARY KEY ("taskId")
);

-- AddForeignKey
ALTER TABLE "TaskContent" ADD CONSTRAINT "TaskContent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
