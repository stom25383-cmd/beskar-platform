export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="flex gap-6">
        <div className="skeleton h-28 w-28 rounded-3xl" />
        <div className="flex-1 space-y-3 py-2">
          <div className="skeleton h-6 w-2/3 rounded-lg" />
          <div className="skeleton h-4 w-1/2 rounded-lg" />
          <div className="skeleton h-4 w-1/3 rounded-lg" />
        </div>
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="skeleton h-96 rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    </div>
  );
}
