import { NonRetriableError } from "inngest";
import { z } from "zod";

import { inngest } from "@/server/inngest/client";
import { INNGEST_EVENTS } from "@/server/inngest/events";
import {
  BriefPipelineError,
  runTextBriefGeneration,
} from "@/server/services/brief-pipeline";

const generationEventDataSchema = z.object({
  jobId: z.string().min(1),
  sessionId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedAt: z.string().datetime(),
});

const regenerationEventDataSchema = generationEventDataSchema.extend({
  sourceSnapshotId: z.string().min(1),
});

function errorCode(error: unknown) {
  if (error instanceof BriefPipelineError) {
    return error.code;
  }

  if (error instanceof z.ZodError) {
    return "INVALID_GENERATION_CONTRACT";
  }

  return "BRIEF_PIPELINE_FAILED";
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Brief generation failed.";
}

async function markPipelineFailed(jobId: string, error: unknown) {
  const { prisma } = await import("@/lib/prisma");

  await prisma.processingJob.update({
    where: {
      id: jobId,
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorCode: errorCode(error),
      errorMessage: errorMessage(error),
    },
  });
}

export const generateBriefSnapshot = inngest.createFunction(
  {
    id: "brief-generate-snapshot",
    name: "Generate brief snapshot",
    triggers: [
      {
        event: INNGEST_EVENTS.BRIEF_GENERATION_REQUESTED,
      },
    ],
  },
  async ({ event, step }) => {
    const data = generationEventDataSchema.parse(event.data);

    await step.run("mark-generation-job-running", async () => {
      const { prisma } = await import("@/lib/prisma");

      return prisma.processingJob.update({
        where: {
          id: data.jobId,
        },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          attemptCount: {
            increment: 1,
          },
        },
      });
    });

    try {
      return await step.run("run-text-first-generation-pipeline", async () =>
        runTextBriefGeneration(data),
      );
    } catch (error) {
      await step.run("mark-generation-job-failed", async () => {
        await markPipelineFailed(data.jobId, error);
      });

      throw new NonRetriableError(errorMessage(error));
    }
  },
);

export const regenerateBriefSnapshot = inngest.createFunction(
  {
    id: "brief-regenerate-snapshot",
    name: "Regenerate brief snapshot",
    triggers: [
      {
        event: INNGEST_EVENTS.BRIEF_REGENERATION_REQUESTED,
      },
    ],
  },
  async ({ event, step }) => {
    const data = regenerationEventDataSchema.parse(event.data);

    await step.run("mark-regeneration-job-running", async () => {
      const { prisma } = await import("@/lib/prisma");

      return prisma.processingJob.update({
        where: {
          id: data.jobId,
        },
        data: {
          status: "RUNNING",
          startedAt: new Date(),
          attemptCount: {
            increment: 1,
          },
        },
      });
    });

    try {
      return await step.run("run-text-first-regeneration-pipeline", async () =>
        runTextBriefGeneration(data),
      );
    } catch (error) {
      await step.run("mark-regeneration-job-failed", async () => {
        await markPipelineFailed(data.jobId, error);
      });

      throw new NonRetriableError(errorMessage(error));
    }
  },
);

export const inngestFunctions = [
  generateBriefSnapshot,
  regenerateBriefSnapshot,
];
