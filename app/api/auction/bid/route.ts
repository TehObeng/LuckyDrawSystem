import { placeBid } from "@/modules/auction/services/auction-service";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await placeBid(body);
  return Response.json({ result });
}
