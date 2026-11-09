"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/**
 * BESKAR brand mark with a DISCREET admin-entry gesture.
 *
 * Holding the mark continuously for 20 seconds navigates to the admin sign-in
 * route. Per the brand spec, there is NO visual feedback whatsoever during the
 * hold: no ring, no timer, no pulse, no color change. To any casual user the
 * logo behaves like an ordinary, non-interactive brand mark.
 *
 * This gesture is DISCOVERY ONLY — it navigates to a page that itself requires
 * full server-side authentication. Knowing the gesture grants no access.
 */
export default function BrandMark({
  size = 40,
  withWordmark = false,
  priority = false,
  className = "",
  enableAdminGesture = true,
}: {
  size?: number;
  withWordmark?: boolean;
  priority?: boolean;
  className?: string;
  enableAdminGesture?: boolean;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);
  const startPt = useRef<{ x: number; y: number } | null>(null);

  const HOLD_MS = 20000;
  const MOVE_TOLERANCE = 14; // px — a hold, not a drag

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    startPt.current = null;
    moved.current = false;
  }, []);

  const begin = useCallback(
    (x: number, y: number) => {
      if (!enableAdminGesture) return;
      clear();
      startPt.current = { x, y };
      moved.current = false;
      timer.current = setTimeout(() => {
        if (!moved.current) router.push("/admin/login");
      }, HOLD_MS);
    },
    [clear, enableAdminGesture, router]
  );

  const track = useCallback((x: number, y: number) => {
    if (!startPt.current) return;
    const dx = Math.abs(x - startPt.current.x);
    const dy = Math.abs(y - startPt.current.y);
    if (dx > MOVE_TOLERANCE || dy > MOVE_TOLERANCE) {
      moved.current = true;
    }
  }, []);

  useEffect(() => () => clear(), [clear]);

  return (
    <span
      className={`inline-flex items-center gap-3 select-none ${className}`}
      // Pointer events cover mouse, touch, and pen uniformly.
      onPointerDown={(e) => begin(e.clientX, e.clientY)}
      onPointerMove={(e) => track(e.clientX, e.clientY)}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      // Prevent the native context menu / callout that a long-press triggers,
      // which would otherwise hint that the element is special.
      onContextMenu={(e) => enableAdminGesture && e.preventDefault()}
      style={{ WebkitTouchCallout: "none" }}
      aria-hidden={false}
    >
      <Image
        src="/brand/beskar-mark.png"
        alt="BESKAR"
        width={size}
        height={size}
        priority={priority}
        draggable={false}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
      {withWordmark && (
        <span className="titanium-text font-semibold tracking-brand text-[15px] pl-0.5">
          BESKAR
        </span>
      )}
    </span>
  );
}
