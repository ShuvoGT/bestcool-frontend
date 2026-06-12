// Phase 1 placeholder — replaced by the CMS-driven home page in Phase 4.
async function getApiHealth(): Promise<{ status: string; database: string } | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/health`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getApiHealth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Next Mart</h1>
      <p className="text-muted-foreground">
        Phase 1 scaffold — storefront coming in Phase 4.
      </p>
      <div className="rounded-lg border px-6 py-4 text-sm">
        <p>
          API:{" "}
          {health ? (
            <span className="font-medium text-green-600">
              {health.status} (database {health.database})
            </span>
          ) : (
            <span className="font-medium text-red-600">
              unreachable — start the backend with `npm run dev` in /backend
            </span>
          )}
        </p>
      </div>
    </main>
  );
}
