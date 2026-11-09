import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { repo } from "@/lib/db";
import { LEGAL_DEFAULTS } from "@/lib/legalDefaults";

export const dynamic = "force-dynamic";

const VALID = ["terms", "privacy", "refund", "download-notice"];

export async function generateMetadata({
  params,
}: {
  params: { doc: string };
}): Promise<Metadata> {
  const def = LEGAL_DEFAULTS[params.doc];
  return { title: def?.title ?? "Legal" };
}

export default async function LegalPage({
  params,
}: {
  params: { doc: string };
}) {
  if (!VALID.includes(params.doc)) notFound();

  const stored = await repo.getLegal(params.doc);
  const def = LEGAL_DEFAULTS[params.doc];
  const title = stored?.title ?? def.title;
  const body = stored?.body ?? def.body;
  const updatedAt = stored?.updatedAt;

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-3xl font-semibold tracking-tight text-titanium-100">
        {title}
      </h1>
      {updatedAt && (
        <p className="mt-2 text-xs text-titanium-500">
          Last updated{" "}
          {new Date(updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
      <div className="glass mt-8 whitespace-pre-line rounded-2xl p-8 text-sm leading-relaxed text-titanium-300">
        {body}
      </div>
    </div>
  );
}
