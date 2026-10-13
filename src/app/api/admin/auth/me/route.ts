import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const user = await getAdminUser(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}