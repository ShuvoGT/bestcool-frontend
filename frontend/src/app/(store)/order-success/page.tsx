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
  const paid = params.get("paid") === "1";
  const pending = params.get("pending") === "1";

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-20 text-center">
      <CheckCircle2 className="h-16 w-16 text-emerald-500" />
      <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">
        {paid ? "Payment received — order confirmed!" : "Order placed successfully!"}
      </h1>
      {orderNumber && (
        <p className="text-zinc-600">
          Your order number is <span className="font-bold text-zinc-900">{orderNumber}</span>.
          {paid ? " Your payment was verified successfully." : " A confirmation email and SMS are on their way."}
        </p>
      )}
      {pending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800">
          Your order is saved, but online payment couldn&apos;t start. You can pay later from
          <strong> My Orders</strong>, or our team will reach out to arrange payment.
        </div>
      )}
      {isNewAccount && (
        <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand-soft p-4 text-left">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <p className="text-sm text-ink">
            <strong>We created an account for you.</strong> Check your email for your username and a
            temporary password — you&apos;ll set a new password on first login, then you can track this
            order anytime.
          </p>
        </div>
      )}
      <div className="flex gap-3">
        <Link href="/account/orders"><Button variant="outline">Track my order</Button></Link>
        <Link href="/shop"><Button className="bg-brand text-white hover:bg-brand-dark">Continue shopping</Button></Link>
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
