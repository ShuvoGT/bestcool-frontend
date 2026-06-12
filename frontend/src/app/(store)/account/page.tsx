/** Placeholder — the customer dashboard ships with the checkout phase. */
import Link from "next/link";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <UserRound className="h-12 w-12 text-blue-300" />
      <h1 className="text-2xl font-extrabold text-zinc-900">My Account is coming soon</h1>
      <p className="text-sm text-zinc-500">
        Customer login, order history, address book and profile arrive in the next build phase —
        an account is created automatically with your first order.
      </p>
      <Link href="/shop"><Button variant="outline">Continue shopping</Button></Link>
    </div>
  );
}
