"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

function SuccessContent() {
  const params = useSearchParams();
  const orderNumber = params.get("order");
  const isNewAccount = params.get("new") === "1";

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-20 text-center">
      <CheckCircle2 className="h-16 w-16 text-emerald-500" />
      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Order placed successfully!</h1>
      {orderNumber && (
        <p className="text-zinc-600">
          Your order number is <span className="font-bold text-zinc-900">{orderNumber}</span>.
          A confirmation email and SMS are on their way.
        </p>
      )}
      {isNewAccount && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-left">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <p className="text-sm text-blue-900">
            <strong>We created an account for you.</strong> Check your email for your username and a
            temporary password — you&apos;ll set a new password on first login, then you can track this
            order anytime.
          </p>
        </div>
      )}
      <div className="flex gap-3">
        <Link href="/account/orders"><Button variant="outline">Track my order</Button></Link>
        <Link href="/shop"><Button className="bg-blue-600 text-white hover:bg-blue-700">Continue shopping</Button></Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
