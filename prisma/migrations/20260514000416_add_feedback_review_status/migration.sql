-- CreateEnum
CREATE TYPE "FeedbackReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "BriefComment" ADD COLUMN     "reviewStatus" "FeedbackReviewStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "FollowUpAnswer" ADD COLUMN     "reviewStatus" "FeedbackReviewStatus" NOT NULL DEFAULT 'PENDING';
