import { prisma } from "@/lib/prisma";
import {
  getAdminOrganizationIds,
  type AdminUser,
} from "@/lib/admin-auth";

export type AdminEventContext = {
  user: AdminUser;
  organizationIds: string[];
  event: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    couple: string;
    location: string;
    dateLabel: string;
    year: number;
  };
};

export type AdminGuardFailure = {
  status: number;
  error: string;
  message: string;
};

export async function requireAdminEvent(
  request: Request,
  slug?: string | null,
): Promise<AdminEventContext | AdminGuardFailure> {
  const ctx = await getAdminOrganizationIds(request);
  if (!ctx) {
    return {
      status: 401,
      error: "unauthorized",
      message: "Anda harus masuk sebagai penyelenggara.",
    };
  }

  const event = slug
    ? await prisma.event.findFirst({
        where: { slug, organizationId: { in: ctx.organizationIds } },
      })
    : await prisma.event.findFirst({
        where: { organizationId: { in: ctx.organizationIds } },
        orderBy: { createdAt: "asc" },
      });

  if (!event) {
    return {
      status: 403,
      error: "forbidden",
      message: "Acara tidak ditemukan atau bukan milik organisasi Anda.",
    };
  }

  return {
    user: ctx.user,
    organizationIds: ctx.organizationIds,
    event: {
      id: event.id,
      organizationId: event.organizationId,
      name: event.name,
      slug: event.slug,
      couple: event.couple,
      location: event.location,
      dateLabel: event.dateLabel,
      year: event.year,
    },
  };
}

export function isGuardFailure(
  value: AdminEventContext | AdminGuardFailure,
): value is AdminGuardFailure {
  return "status" in value && "error" in value;
}