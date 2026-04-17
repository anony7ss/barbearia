import { type NextRequest } from "next/server";
import { availabilityRequestSchema } from "@/features/booking/schemas";
import { ApiError, getClientFingerprint, jsonError, jsonOk, parseJson } from "@/lib/server/api";
import { getAvailabilityForRequest } from "@/lib/server/booking";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(getClientFingerprint(request), "booking_availability", 80, 60);
    const body = await parseJson(request, availabilityRequestSchema);
    const slots = await getAvailabilityForRequest({
      serviceId: body.serviceId,
      barberId: body.barberId,
      date: body.date,
    });

    return jsonOk({ slots: slots.slice(0, 80) });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }
    return jsonError(error);
  }
}
