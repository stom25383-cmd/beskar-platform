import { handler, ok, fail, clientIp } from "@/lib/http";
import { answer, type ChatMessage } from "@/lib/services/assistant";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(20),
  currency: z.enum(["USD", "INR"]).optional(),
});

export const POST = handler(async (req) => {
  const ip = clientIp(req);
  const rl = rateLimit(`assistant:${ip}`, 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return fail("You're sending messages too quickly. Please slow down.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Invalid request", 422);

  const reply = await answer(
    parsed.data.messages as ChatMessage[],
    parsed.data.currency ?? "USD"
  );
  return ok(reply);
});
