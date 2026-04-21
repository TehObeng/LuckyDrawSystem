export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      error: "Legacy realtime SSE has been retired. Use /api/display hydration with local polling-based display updates.",
    },
    { status: 410 },
  );
}
