// ============================================================================
// BESKAR Assistant — a support/discovery chatbot grounded in the live catalog.
//
// Design:
//  - We ALWAYS build a factual context from the real published catalog + legal
//    docs (retrieval), so answers reflect actual data, never hallucinated apps.
//  - If an AI provider is configured (BESKAR_AI_API_KEY, OpenAI-compatible),
//    we call it with that grounded context and strict system instructions.
//  - If NOT configured, we use a deterministic, catalog-driven responder that
//    still answers the most common questions (find apps, price, is it free,
//    how to install, refunds, etc.). This is real logic over real data — not a
//    canned fake — so the feature works out of the box and improves with a key.
// ============================================================================

import "server-only";
import { env } from "../env";
import { repo } from "../db";
import { priceForDisplay } from "../money";
import type { Application, Currency } from "../types";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantReply {
  reply: string;
  suggestions: { label: string; slug: string }[];
  grounded: boolean;
  usedAI: boolean;
}

function appFacts(app: Application, currency: Currency): string {
  const price = priceForDisplay(app.pricing, currency, env.fx());
  const rel =
    app.releases.find((r) => r.id === app.currentReleaseId) ??
    app.releases.filter((r) => r.status === "published").slice(-1)[0];
  const priceStr =
    app.pricing.model === "free"
      ? "Free"
      : app.pricing.model === "freemium"
      ? `Free to install (premium in-app: ${price.price.formatted})`
      : `${price.price.formatted}${app.pricing.lifetime ? " lifetime" : ""}`;
  return [
    `- ${app.name} (/apps/${app.slug})`,
    `  category: ${app.category}`,
    `  model: ${app.pricing.model}; price: ${priceStr}`,
    rel ? `  version: ${rel.versionName}; min Android ${rel.minAndroid}+; size ${(rel.fileSizeBytes / 1048576).toFixed(1)} MB` : "  version: (no published release)",
    `  tagline: ${app.tagline}`,
  ].join("\n");
}

async function buildContext(currency: Currency): Promise<{
  apps: Application[];
  context: string;
}> {
  const apps = await repo.listApps({ includeHidden: false });
  const legal = await repo.listLegal();
  const catalog = apps.map((a) => appFacts(a, currency)).join("\n");
  const legalNote = legal.length
    ? `\nLegal documents available at /legal/{terms|privacy|refund|download-notice}.`
    : "";
  const context = `BESKAR is a curated distribution platform for BESKAR's own Android apps (APKs), outside the Play Store. Currencies: USD and INR. Every release has a server-computed SHA-256 checksum shown on each app's Integrity tab.\n\nCATALOG (${apps.length} published apps):\n${catalog}${legalNote}`;
  return { apps, context };
}

const SYSTEM_PROMPT = `You are the BESKAR Assistant, a concise, precise support and discovery guide for the BESKAR Android app platform.
Rules:
- Only discuss BESKAR, its apps, pricing, downloads, installation, trust/integrity, and policies.
- Use ONLY the provided catalog/context for facts about apps, prices, and versions. If something isn't in context, say you don't have that info and suggest browsing /apps or contacting support.
- Never invent apps, prices, versions, or guarantees. Never claim an app is "100% malware-free" or "Google-approved".
- When recommending apps, reference them by name and their /apps/{slug} path.
- Keep answers short (2-5 sentences) and helpful. Be calm and premium in tone.`;

/** Deterministic fallback responder over the real catalog (no AI key needed). */
function deterministicReply(
  message: string,
  apps: Application[],
  currency: Currency
): AssistantReply {
  const q = message.toLowerCase();
  const priced = (a: Application) =>
    priceForDisplay(a.pricing, currency, env.fx()).price.formatted;

  const suggest = (list: Application[]) =>
    list.slice(0, 4).map((a) => ({ label: a.name, slug: a.slug }));

  // Intent: install / how to
  if (/(install|apk|how do i|setup|side ?load)/.test(q)) {
    return {
      reply:
        "To install a BESKAR app: open its page, review the Integrity tab (version, size, SHA-256), accept the Download Notice, then download the APK and open it on your Android device. You may need to allow installs from this source. See /legal/download-notice for details.",
      suggestions: suggest(apps),
      grounded: true,
      usedAI: false,
    };
  }
  // Intent: refund / policy
  if (/(refund|money back|cancel|policy|privacy|terms)/.test(q)) {
    return {
      reply:
        "You can review our policies at /legal/terms, /legal/privacy, /legal/refund, and /legal/download-notice. For a specific purchase issue, contact support with your purchase reference.",
      suggestions: [],
      grounded: true,
      usedAI: false,
    };
  }
  // Intent: free apps
  if (/(free|no cost|gratis)/.test(q)) {
    const free = apps.filter(
      (a) => a.pricing.model === "free" || a.pricing.model === "freemium"
    );
    return {
      reply: free.length
        ? `These apps are free to install: ${free
            .map((a) => a.name)
            .join(", ")}. Open any of them to download.`
        : "There are no free apps in the catalog right now. Browse /apps to see all titles.",
      suggestions: suggest(free.length ? free : apps),
      grounded: true,
      usedAI: false,
    };
  }
  // Intent: price of a specific app / cheapest
  if (/(price|cost|how much|cheap|expensive|pay)/.test(q)) {
    const named = apps.find((a) => q.includes(a.name.toLowerCase()));
    if (named) {
      return {
        reply: `${named.name} is ${
          named.pricing.model === "free" ? "free" : priced(named) + (named.pricing.lifetime ? " for lifetime access" : "")
        }. See /apps/${named.slug} for full details.`,
        suggestions: suggest([named]),
        grounded: true,
        usedAI: false,
      };
    }
    return {
      reply: `Prices (shown in ${currency}): ${apps
        .map((a) => `${a.name} — ${a.pricing.model === "free" ? "Free" : priced(a)}`)
        .join("; ")}.`,
      suggestions: suggest(apps),
      grounded: true,
      usedAI: false,
    };
  }
  // Intent: category / recommendation / find
  const byName = apps.find((a) => q.includes(a.name.toLowerCase()));
  if (byName) {
    return {
      reply: `${byName.name}: ${byName.tagline} It's ${
        byName.pricing.model === "free" ? "free" : priced(byName)
      }. Details and download at /apps/${byName.slug}.`,
      suggestions: suggest([byName]),
      grounded: true,
      usedAI: false,
    };
  }
  const byCategory = apps.filter((a) =>
    q.includes(a.category.toLowerCase())
  );
  if (byCategory.length) {
    return {
      reply: `In ${byCategory[0].category}: ${byCategory
        .map((a) => a.name)
        .join(", ")}. Open any to learn more.`,
      suggestions: suggest(byCategory),
      grounded: true,
      usedAI: false,
    };
  }
  // Default
  return {
    reply: `I can help you find BESKAR apps, explain pricing, or guide installation. We currently have ${apps.length} apps${
      apps.length ? `: ${apps.map((a) => a.name).join(", ")}` : ""
    }. What are you looking for?`,
    suggestions: suggest(apps),
    grounded: true,
    usedAI: false,
  };
}

export async function answer(
  history: ChatMessage[],
  currency: Currency
): Promise<AssistantReply> {
  const message = history.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
  const { apps, context } = await buildContext(currency);

  const ai = env.ai();
  if (!ai.configured) {
    return deterministicReply(message, apps, currency);
  }

  // Call the OpenAI-compatible chat completions API with grounded context.
  try {
    const res = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ai.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: `CONTEXT:\n${context}` },
          ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`AI provider error ${res.status}`);
    const json = (await res.json()) as any;
    const reply: string =
      json?.choices?.[0]?.message?.content?.trim() ||
      "I'm not sure how to help with that. Try browsing /apps.";

    // Suggest apps mentioned by name in the reply (grounded linking).
    const lower = reply.toLowerCase();
    const suggestions = apps
      .filter((a) => lower.includes(a.name.toLowerCase()))
      .slice(0, 4)
      .map((a) => ({ label: a.name, slug: a.slug }));

    return { reply, suggestions, grounded: true, usedAI: true };
  } catch (e) {
    // Provider failure → fall back to deterministic (never error the user out).
    console.error("[beskar] assistant AI error:", e);
    return deterministicReply(message, apps, currency);
  }
}
