"use client";

/** Live D:H:M:S countdown to a deadline. Calls nothing — purely visual;
 *  flash pricing always reverts server-side when the campaign ends. */
import { useEffect, useState } from "react";

function diff(endsAt: string) {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  return {
    days: Math.floor(ms / 86_400_000),
    hours: Math.floor(ms / 3_600_000) % 24,
    minutes: Math.floor(ms / 60_000) % 60,
    seconds: Math.floor(ms / 1000) % 60,
    ended: ms === 0,
  };
}

export function Countdown({ endsAt, size = "md" }: { endsAt: string; size?: "sm" | "md" }) {
  const [time, setTime] = useState<ReturnType<typeof diff> | null>(null);

  useEffect(() => {
    setTime(diff(endsAt));
    const interval = setInterval(() => setTime(diff(endsAt)), 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (!time) return null; // avoid SSR/client mismatch
  if (time.ended) return <span className="text-sm font-semibold text-zinc-400">Sale ended</span>;

  const box =
    size === "sm"
      ? "min-w-9 rounded-md px-1.5 py-1 text-sm"
      : "min-w-12 rounded-lg px-2 py-1.5 text-xl";
  const cells: [number, string][] = [
    [time.days, "Days"],
    [time.hours, "Hrs"],
    [time.minutes, "Min"],
    [time.seconds, "Sec"],
  ];

  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label="Sale ends in">
      {cells.map(([value, label], i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className="text-center">
            <div className={`${box} bg-zinc-900 text-center font-bold tabular-nums text-white`}>
              {String(value).padStart(2, "0")}
            </div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
          </div>
          {i < 3 && <span className="-mt-4 font-bold text-zinc-400">:</span>}
        </div>
      ))}
    </div>
  );
}
