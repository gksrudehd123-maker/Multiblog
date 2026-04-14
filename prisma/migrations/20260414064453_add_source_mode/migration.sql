-- CreateEnum
CREATE TYPE "SourceMode" AS ENUM ('OWN', 'REFERENCE');

-- AlterTable
ALTER TABLE "source_posts" ADD COLUMN     "mode" "SourceMode" NOT NULL DEFAULT 'OWN';
