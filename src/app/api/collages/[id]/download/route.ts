import { buildCollageResponse } from "@/lib/collage-drive";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return buildCollageResponse(request, id, "attachment");
}