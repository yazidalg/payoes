import {
  getSettlementStreamStatus,
} from "@/lib/payments/settlement/horizon-stream";

export function GET() {
  return Response.json({
    ok: true,
    workers: {
      settlementStream: getSettlementStreamStatus(),
    },
  });
}
