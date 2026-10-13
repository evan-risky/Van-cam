import { NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/event";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? undefined;
  const event = await getEventBySlug(slug);
  if (!event) {
    return NextResponse.json(
      { error: "not_found", message: "Acara tidak ditemukan." },
      { status: 404 },
    );
  }
  return NextResponse.json({ event });
}