import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <BrandMark size={64} enableAdminGesture={false} />
      <p className="mt-8 text-sm uppercase tracking-wider2 text-titanium-500">
        404
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-titanium-100">
        Page not found
      </h1>
      <p className="mt-2 max-w-sm text-titanium-400">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link href="/" className="btn-primary mt-8 px-6 py-3 text-sm">
        Back to home
      </Link>
    </div>
  );
}
