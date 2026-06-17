"use client";

/**
 * Full-screen "Under maintenance" notice shown to storefront visitors when
 * Admin → Settings → Maintenance is enabled. All content (heading, message,
 * optional logo) and the optional countdown target are admin-editable settings.
 * The admin panel (/work) lives in a separate route group, so it stays reachable.
 */
import { useEffect, useState } from "react";
import Image from "next/image";
import { Wrench } from "lucide-react";

type Props = {
  siteName: string;
  logo: string | null;
  title: string;
  message: string;
  until: string | null; // ISO datetime; when set, a live countdown is shown
};

type Remaining = { days: number; hours: number; minutes: number; seconds: number; done: boolean } | null;

function diff(target: number): Remaining {
  const ms = target - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: false,
  };
}

export function MaintenancePage({ siteName, logo, title, message, until }: Props) {
  const target = until ? new Date(until).getTime() : NaN;
  const valid = until !== null && !Number.isNaN(target);
  // Start null so SSR and the first client render match (no time-based mismatch);
  // the countdown is computed only after mount, then ticks every second.
  const [remaining, setRemaining] = useState<Remaining>(null);

  useEffect(() => {
    if (!valid) return;
    setRemaining(diff(target));
    const id = setInterval(() => setRemaining(diff(target)), 1000);
    return () => clearInterval(id);
  }, [valid, target]);

  const units = remaining
    ? [
        { label: "Days", value: remaining.days },
        { label: "Hours", value: remaining.hours },
        { label: "Minutes", value: remaining.minutes },
        { label: "Seconds", value: remaining.seconds },
      ]
    : [];

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-zinc-950 px-6 py-16 text-center text-zinc-100">
      {/* Ambient glow background */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-130 w-130 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-100 w-100 rounded-full bg-violet-600/20 blur-[140px]" />

      <div className="relative w-full max-w-xl">
        {logo ? (
          <Image src={logo} alt={siteName} width={180} height={56} unoptimized className="mx-auto mb-8 h-12 w-auto object-contain" />
        ) : (
          <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/30">
            <Wrench className="h-7 w-7 text-white" />
          </div>
        )}

        <h1 className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
          {title}
        </h1>

        {message && <p className="mx-auto mt-4 max-w-lg whitespace-pre-line text-base leading-relaxed text-zinc-400">{message}</p>}

        {remaining && !remaining.done && (
          <div className="mt-10">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">We&apos;ll be back in</p>
            <div className="flex justify-center gap-3 sm:gap-4">
              {units.map((u) => (
                <div key={u.label} className="min-w-16 rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-xl sm:min-w-20 sm:px-4">
                  <div className="text-2xl font-bold tabular-nums text-zinc-50 sm:text-3xl">{String(u.value).padStart(2, "0")}</div>
                  <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{u.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {remaining?.done && (
          <p className="mt-8 text-sm font-medium text-cyan-300">We&apos;re wrapping up — please refresh in a moment.</p>
        )}

        <p className="mt-12 text-xs text-zinc-600">© {new Date().getFullYear()} {siteName}</p>
      </div>
    </main>
  );
}
