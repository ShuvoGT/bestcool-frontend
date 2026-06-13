import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <SearchX className="h-12 w-12 text-zinc-300" />
      <h1 className="text-3xl font-extrabold text-zinc-900">Page not found</h1>
      <p className="text-sm text-zinc-500">The page you&apos;re looking for doesn&apos;t exist or may have been moved.</p>
      <Link href="/"><Button className="bg-brand text-white hover:bg-brand-dark">Back to home</Button></Link>
    </div>
  );
}
