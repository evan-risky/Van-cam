import { prisma } from "@/lib/prisma";
import { DEFAULT_EVENT_SLUG } from "@/lib/config";

export type PublicEvent = {
  id: string;
  name: string;
  slug: string;
  couple: string;
  location: string;
  dateLabel: string;
  year: number;
};

export async function getEventBySlug(
  slug: string = DEFAULT_EVENT_SLUG,
): Promise<PublicEvent | null> {
  return prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      couple: true,
      location: true,
      dateLabel: true,
      year: true,
    },
  });
}