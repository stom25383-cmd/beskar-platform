import type { ReactNode } from "react";
import BrandMark from "./BrandMark";

export default function MaintenanceGate({
  maintenance,
  message,
  announcement,
  children,
}: {
  maintenance: boolean;
  message: string;
  announcement: string;
  children: ReactNode;
}) {
  if (maintenance) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <BrandMark size={72} enableAdminGesture={false} />
        <h1 className="mt-8 text-2xl font-semibold text-titanium-100">
          Scheduled maintenance
        </h1>
        <p className="mt-3 max-w-md text-titanium-400">{message}</p>
      </div>
    );
  }

  return (
    <>
      {announcement ? (
        <div className="border-b border-white/[0.06] bg-white/[0.02]">
          <p className="mx-auto max-w-7xl px-5 py-2.5 text-center text-xs text-titanium-300 sm:px-8">
            {announcement}
          </p>
        </div>
      ) : null}
      {children}
    </>
  );
}
