import { prisma } from "@/lib/prisma";

const DEFAULT_WORKSPACE_NAME = "My Workspace";

function workspaceSlugForUser(clerkUserId: string) {
  return `ws-${clerkUserId.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
}

export async function ensureWorkspaceForUser(clerkUserId: string) {
  const slug = workspaceSlugForUser(clerkUserId);
  return prisma.workspace.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      name: DEFAULT_WORKSPACE_NAME,
      createdBy: clerkUserId,
    },
  });
}

export async function listProjectsForUser(clerkUserId: string) {
  const projects = await prisma.project.findMany({
    where: {
      createdBy: clerkUserId,
      status: "ACTIVE",
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      clientName: true,
      updatedAt: true,
    },
  });
  return projects;
}

type CreateProjectParams = {
  workspaceId: string;
  name: string;
  clientName?: string;
  createdBy: string;
};

export async function createProject(params: CreateProjectParams) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        workspaceId: params.workspaceId,
        name: params.name,
        clientName: params.clientName ?? params.name,
        status: "ACTIVE",
        createdBy: params.createdBy,
      },
    });

    const session = await tx.intakeSession.create({
      data: {
        projectId: project.id,
        title: "Initial intake",
        status: "DRAFT",
        createdBy: params.createdBy,
      },
    });

    return { project, session };
  });
}
