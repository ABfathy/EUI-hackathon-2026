import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  isInternalAuthorizationError,
  requireInternalAuth,
} from "@/server/auth/internal";

type RouteContext = { params: Promise<{ sessionId: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    await requireInternalAuth();
    const { sessionId } = await params;
    const snapshotId = req.nextUrl.searchParams.get("snapshotId");

    if (!snapshotId) {
      return NextResponse.json({ error: "snapshotId required" }, { status: 400 });
    }

    const snapshot = await prisma.briefSnapshot.findFirst({
      where: { id: snapshotId, session: { id: sessionId } },
      select: { id: true },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    const [answers, comments] = await Promise.all([
      prisma.followUpAnswer.findMany({
        where: { snapshotId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          authorName: true,
          authorEmail: true,
          reviewStatus: true,
          createdAt: true,
          question: { select: { text: true, section: true } },
        },
      }),
      prisma.briefComment.findMany({
        where: { snapshotId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          authorName: true,
          authorEmail: true,
          section: true,
          anchorType: true,
          reviewStatus: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ answers, comments });
  } catch (error) {
    if (isInternalAuthorizationError(error)) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }
    console.error({ scope: "api.sessions.feedback.get", error });
    return NextResponse.json({ error: "FETCH_FAILED" }, { status: 500 });
  }
}
