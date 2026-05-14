import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";

type RouteContext = { params: Promise<{ sessionId: string }> };

const FeedbackReviewSchema = z.object({
  items: z.array(
    z.object({
      type: z.enum(["comment", "answer"]),
      id: z.string().uuid(),
      status: z.enum(["PENDING", "ACCEPTED", "DECLINED"]),
    }),
  ).min(1),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { sessionId } = await params;

    const body = await req.json();
    const parsed = FeedbackReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const commentItems = parsed.data.items.filter((i) => i.type === "comment");
    const answerItems = parsed.data.items.filter((i) => i.type === "answer");

    if (commentItems.length > 0) {
      const commentIds = commentItems.map((i) => i.id);
      const validComments = await prisma.briefComment.findMany({
        where: { id: { in: commentIds }, snapshot: { session: { id: sessionId } } },
        select: { id: true },
      });
      const validIds = new Set(validComments.map((c) => c.id));

      await Promise.all(
        commentItems
          .filter((i) => validIds.has(i.id))
          .map((i) =>
            prisma.briefComment.update({
              where: { id: i.id },
              data: { reviewStatus: i.status },
            }),
          ),
      );
    }

    if (answerItems.length > 0) {
      const answerIds = answerItems.map((i) => i.id);
      const validAnswers = await prisma.followUpAnswer.findMany({
        where: { id: { in: answerIds }, snapshot: { session: { id: sessionId } } },
        select: { id: true },
      });
      const validIds = new Set(validAnswers.map((a) => a.id));

      await Promise.all(
        answerItems
          .filter((i) => validIds.has(i.id))
          .map((i) =>
            prisma.followUpAnswer.update({
              where: { id: i.id },
              data: { reviewStatus: i.status },
            }),
          ),
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error({ scope: "api.sessions.feedback-review.patch", error });
    return NextResponse.json({ error: "UPDATE_FAILED" }, { status: 500 });
  }
}
