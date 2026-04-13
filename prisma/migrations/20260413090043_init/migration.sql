-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('WORDPRESS', 'BLOGSPOT', 'TISTORY');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "source_posts" (
    "id" TEXT NOT NULL,
    "naverUrl" TEXT NOT NULL,
    "naverBlogId" TEXT NOT NULL,
    "naverLogNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "contentText" TEXT,
    "images" TEXT[],
    "tags" TEXT[],
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewritten_versions" (
    "id" TEXT NOT NULL,
    "sourcePostId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "title" TEXT NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "metaDescription" TEXT,
    "slug" TEXT,
    "images" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rewritten_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_targets" (
    "id" TEXT NOT NULL,
    "sourcePostId" TEXT NOT NULL,
    "platformConfigId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'PENDING',
    "publishedUrl" TEXT,
    "publishedId" TEXT,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "publish_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_configs" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "name" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "username" TEXT,
    "apiKey" TEXT,
    "refreshToken" TEXT,
    "extra" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_posts_naverUrl_key" ON "source_posts"("naverUrl");

-- CreateIndex
CREATE INDEX "source_posts_naverBlogId_idx" ON "source_posts"("naverBlogId");

-- CreateIndex
CREATE INDEX "rewritten_versions_sourcePostId_idx" ON "rewritten_versions"("sourcePostId");

-- CreateIndex
CREATE INDEX "publish_targets_sourcePostId_idx" ON "publish_targets"("sourcePostId");

-- CreateIndex
CREATE INDEX "publish_targets_status_idx" ON "publish_targets"("status");

-- AddForeignKey
ALTER TABLE "rewritten_versions" ADD CONSTRAINT "rewritten_versions_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "source_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_targets" ADD CONSTRAINT "publish_targets_sourcePostId_fkey" FOREIGN KEY ("sourcePostId") REFERENCES "source_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_targets" ADD CONSTRAINT "publish_targets_platformConfigId_fkey" FOREIGN KEY ("platformConfigId") REFERENCES "platform_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
