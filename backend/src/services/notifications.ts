/**
 * Customer notifications (spec §6, §12, §15): transactional emails + SMS for
 * order placed, account credentials, status changes, payment confirmation.
 * Everything here is fire-and-forget — a mail/SMS failure never breaks
 * order placement or status updates.
 */
import { prisma } from "../lib/prisma";
import { sendMail } from "../lib/mailer";
import { sendSms, type SmsEvent } from "../lib/sms";
import { env } from "../config/env";

async function siteName(): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key: "site.name" } }).catch(() => null);
  return (row?.value as string) ?? "Next Mart";
}

const bdt = (n: number | string) => `Tk ${Number(n).toLocaleString("en-IN")}`;

// ---------------------------------------------------------------------------
// Email templates — simple, inline-styled HTML that renders everywhere.
// ---------------------------------------------------------------------------
function shell(site: string, title: string, body: string): string {
  return `
  <div style="background:#f4f4f5;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
      <div style="background:#0f172a;padding:20px 28px">
        <span style="color:#38bdf8;font-size:20px;font-weight:bold">${site}</span>
      </div>
      <div style="padding:28px">
        <h2 style="margin:0 0 16px;color:#18181b;font-size:18px">${title}</h2>
        ${body}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #e4e4e7;color:#a1a1aa;font-size:12px">
        This is an automated message from ${site}. Please do not reply to this email.
      </div>
    </div>
  </div>`;
}

function itemsTable(items: { name: string; variantName: string | null; quantity: number; unitPrice: unknown }[]): string {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;color:#3f3f46;font-size:14px">
          ${i.name}${i.variantName ? ` <span style="color:#a1a1aa">(${i.variantName})</span>` : ""} × ${i.quantity}
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;color:#18181b;font-size:14px;text-align:right">
          ${bdt(Number(i.unitPrice) * i.quantity)}
        </td>
      </tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse">${rows}</table>`;
}

// ---------------------------------------------------------------------------
// Order placed (confirmation + optional credentials + SMS)
// ---------------------------------------------------------------------------
export async function notifyOrderPlaced(orderId: string, tempPassword: string | null): Promise<void> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, user: true } });
    if (!order) return;
    const site = await siteName();

    const summary = `
      ${itemsTable(order.items)}
      <table style="width:100%;border-collapse:collapse;margin-top:12px">
        <tr><td style="color:#71717a;font-size:14px;padding:3px 0">Subtotal</td><td style="text-align:right;font-size:14px">${bdt(Number(order.subtotal))}</td></tr>
        <tr><td style="color:#71717a;font-size:14px;padding:3px 0">Delivery (${order.deliveryZoneName})</td><td style="text-align:right;font-size:14px">${bdt(Number(order.shippingCharge))}</td></tr>
        <tr><td style="font-weight:bold;font-size:15px;padding:6px 0">Total</td><td style="text-align:right;font-weight:bold;font-size:15px">${bdt(Number(order.total))}</td></tr>
      </table>
      <p style="color:#52525b;font-size:14px;line-height:1.6">
        <strong>Delivery to:</strong> ${order.shippingName}, ${order.shippingAddress}, ${order.shippingDistrict}<br/>
        <strong>Payment:</strong> ${order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod}
      </p>`;

    // 1. Order confirmation email
    await sendMail(
      order.shippingEmail,
      `Order confirmed — ${order.orderNumber}`,
      shell(
        site,
        `Thank you! Your order ${order.orderNumber} is confirmed.`,
        `<p style="color:#52525b;font-size:14px;line-height:1.6">Hi ${order.shippingName}, we've received your order and will start processing it right away. You'll get another update when it ships.</p>${summary}`
      )
    );

    // 2. Credentials email for auto-created accounts (NEVER via SMS)
    if (tempPassword) {
      await sendMail(
        order.shippingEmail,
        `Your ${site} account is ready`,
        shell(
          site,
          "We created an account for you",
          `<p style="color:#52525b;font-size:14px;line-height:1.6">
            To let you track your order, we created an account for you:</p>
          <table style="width:100%;background:#f4f4f5;border-radius:8px;padding:8px">
            <tr><td style="padding:8px 14px;color:#71717a;font-size:13px">Username</td><td style="padding:8px 14px;font-weight:bold;font-size:13px">${order.shippingEmail}</td></tr>
            <tr><td style="padding:8px 14px;color:#71717a;font-size:13px">Temporary password</td><td style="padding:8px 14px;font-weight:bold;font-size:13px;font-family:monospace">${tempPassword}</td></tr>
          </table>
          <p style="color:#52525b;font-size:14px;line-height:1.6">
            For security you'll be asked to set a new password on first login.</p>
          <a href="${env.frontendUrl}/account/login" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold">Log in to your account</a>`
        )
      );
    }

    // 3. SMS (order number + total — no credentials, ever)
    await sendSms(
      order.shippingPhone,
      `${site}: Order ${order.orderNumber} received. Total ${bdt(Number(order.total))} (${order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod}). Thank you for shopping with us!`,
      "orderPlaced"
    );
  } catch (err) {
    console.error("notifyOrderPlaced failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Delivery status changes
// ---------------------------------------------------------------------------
const STATUS_COPY: Record<string, { title: string; line: string; smsEvent: SmsEvent | null }> = {
  CONFIRMED: {
    title: "Your order is confirmed",
    line: "Your order has been confirmed and is being prepared for shipment.",
    smsEvent: "statusConfirmed",
  },
  SHIPPED: {
    title: "Your order is on the way",
    line: "Your order has been handed to the courier and is on its way to you.",
    smsEvent: "statusShipped",
  },
  DELIVERED: {
    title: "Your order has been delivered",
    line: "Your order was delivered. We hope you love it — reviews are always appreciated!",
    smsEvent: "statusDelivered",
  },
  CANCELLED: {
    title: "Your order has been cancelled",
    line: "Your order was cancelled. If you didn't request this or have any questions, please contact our support.",
    smsEvent: null,
  },
};

export async function notifyStatusChange(orderId: string, status: string): Promise<void> {
  try {
    const copy = STATUS_COPY[status];
    if (!copy) return;
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return;
    const site = await siteName();

    const trackingHtml =
      status === "SHIPPED" && order.courierName
        ? `<p style="color:#52525b;font-size:14px;line-height:1.6"><strong>Courier:</strong> ${order.courierName}<br/><strong>Tracking ID:</strong> ${order.consignmentId ?? "—"}</p>`
        : "";

    await sendMail(
      order.shippingEmail,
      `${copy.title} — ${order.orderNumber}`,
      shell(
        site,
        copy.title,
        `<p style="color:#52525b;font-size:14px;line-height:1.6">Hi ${order.shippingName}, ${copy.line}</p>${trackingHtml}
         <p style="color:#52525b;font-size:14px">Order <strong>${order.orderNumber}</strong> · Total <strong>${bdt(Number(order.total))}</strong></p>
         <a href="${env.frontendUrl}/account/orders/${order.orderNumber}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:bold">View order</a>`
      )
    );

    if (copy.smsEvent) {
      const tracking =
        status === "SHIPPED" && order.consignmentId ? ` Tracking ID: ${order.consignmentId} (${order.courierName}).` : "";
      await sendSms(
        order.shippingPhone,
        `${site}: Order ${order.orderNumber} is ${status.toLowerCase()}.${tracking}`,
        copy.smsEvent
      );
    }
  } catch (err) {
    console.error("notifyStatusChange failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Successful payment confirmation
// ---------------------------------------------------------------------------
export async function notifyPaymentConfirmed(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    const site = await siteName();
    await sendSms(
      order.shippingPhone,
      `${site}: Payment of ${bdt(Number(order.total))} for order ${order.orderNumber} received successfully. Thank you!`,
      "paymentConfirmed"
    );
  } catch (err) {
    console.error("notifyPaymentConfirmed failed:", err);
  }
}
