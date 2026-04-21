export const dynamic = "force-dynamic";

const message = "Signed uploads are not used in local mode. Upload files with POST /api/uploads/local instead.";

export async function GET() {
  return Response.json({ error: message }, { status: 410 });
}

export async function POST() {
  return Response.json({ error: message }, { status: 410 });
}
