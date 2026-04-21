import { exportAuctionResultsCsv } from "@/modules/shared/services/import-export-service";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const csv = await exportAuctionResultsCsv(eventId);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auction-results-${eventId}.csv"`,
    },
  });
}
