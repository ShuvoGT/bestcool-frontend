"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function FailedContent() {
  const params = useSearchParams();
  const orderNumber = params.get("order");
  const reason = params.get("reason");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-20 text-center">
      <XCircle className="h-16 w-16 text-rose-500" />
      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
        {reason === "cancelled" ? "Payment cancelled" : "Payment failed"}
      </h1>
      <p className="text-zinc-600">
        {orderNumber ? (
          <>Your order <span className="font-bold text-zinc-900">{orderNumber}</span> is saved, but the payment didn&apos;t go through. </>
        ) : (
          "The payment didn't go through. "
        )}
        You can try paying again from your orders, or contact us for help.
      </p>
      <div className="flex gap-3">
        <Link href="/account/orders"><Button variant="outline">Go to my orders</Button></Link>
        <Link href="/shop"><Button className="bg-brand text-white hover:bg-brand-dark">Continue shopping</Button></Link>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense>
      <FailedContent />
    </Suspense>
  );
}
