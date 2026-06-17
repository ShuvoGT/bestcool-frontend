/**
 * SMS layer (ported from backend/src/lib/sms.ts). Provider-agnostic HTTP
 * implementation matching common Bangladeshi gateways. Per-event toggles live
 * in Settings ("sms.events"); fire-and-forget (never breaks a core flow); with
 * no credentials configured, messages log to the console. Never send passwords.
 */
import { prisma } from "@/lib/prisma";

const sms = {
  baseUrl: process.env.SMS_API_BASE_URL || "",
  apiKey: process.env.SMS_API_KEY || "",
  senderId: process.env.SMS_SENDER_ID || "",
};

interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

class GenericHttpSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<void> {
    const url = new URL(sms.baseUrl);
    url.searchParams.set("api_key", sms.apiKey);
    url.searchParams.set("senderid", sms.senderId);
    url.searchParams.set("number", phone);
    url.searchParams.set("message", message);
    const res = await fetch(url.toString(), { method: "POST" });
    if (!res.ok) throw new Error(`SMS gateway responded ${res.status}`);
  }
}

class ConsoleSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<void> {
    console.log(`\n[SMS → console] To: ${phone}\n${message}\n`);
  }
}

const provider: SmsProvider = sms.baseUrl && sms.apiKey ? new GenericHttpSmsProvider() : new ConsoleSmsProvider();

export type SmsEvent = "orderPlaced" | "statusConfirmed" | "statusShipped" | "statusDelivered" | "paymentConfirmed";

async function isEventEnabled(event: SmsEvent): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key: "sms.events" } });
    const events = (row?.value ?? {}) as Record<string, boolean>;
    return events[event] !== false; // default on
  } catch {
    return true;
  }
}

/** Fire-and-forget SMS: checks the admin toggle, never throws. */
export async function sendSms(phone: string | null | undefined, message: string, event: SmsEvent): Promise<void> {
  if (!phone) return;
  try {
    if (!(await isEventEnabled(event))) return;
    await provider.send(phone, message);
  } catch (err) {
    console.error(`SMS (${event}) to ${phone} failed:`, err);
  }
}
