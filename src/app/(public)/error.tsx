"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-titanium-100">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm text-titanium-400">
        We hit an unexpected error. Please try again.
      </p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn-primary px-6 py-3 text-sm">
          Try again
        </button>
        <Link href="/" className="btn-ghost px-6 py-3 text-sm">
          Home
        </Link>
      </div>
    </div>
  );
}
