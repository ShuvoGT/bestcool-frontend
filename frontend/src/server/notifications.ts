/**
 * Order notifications — TEMPORARY stub. Step 6 of the consolidation ports
 * backend/src/services/notifications.ts (order confirmation email + SMS +
 * auto-account credentials email) on top of the real nodemailer transport.
 *
 * Fire-and-forget by contract: must never throw into the order flow.
 */
export async function notifyOrderPlaced(orderId: string, tempPassword: string | null): Promise<void> {
  console.log(`[notifications:stub] order placed ${orderId}${tempPassword ? " (auto-account created)" : ""}`);
}

export async function notifyStatusChange(orderId: string, status: string): Promise<void> {
  console.log(`[notifications:stub] order ${orderId} → status ${status}`);
}

export async function notifyPaymentConfirmed(orderId: string): Promise<void> {
  console.log(`[notifications:stub] order ${orderId} payment confirmed`);
}
