/**
 * SMS layer (spec §12).
 * Provider-agnostic interface with a generic HTTP implementation matching
 * common Bangladeshi gateways (BulkSMSBD, SMS.net.bd, MimSMS style):
 * configurable base URL + api_key + senderid, number & message as params.
 *
 * Rules: per-event on/off toggles live in Settings ("sms.events");
 * sending is NEVER allowed to break a core flow (fire-and-forget with
 * logging); with no credentials configured, messages log to the console.
 * Passwords/credentials must never be sent by SMS.
 */
import { env } from "../config/env";
import { prisma } from "./prisma";

export interface SmsProvider {
  send(phone: string, message: string): Promise<void>;
}

class GenericHttpSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<void> {
    const url = new URL(env.sms.baseUrl);
    url.searchParams.set("api_key", env.sms.apiKey);
    url.searchParams.set("senderid", env.sms.senderId);
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

// Swap this line for a different gateway implementation.
const provider: SmsProvider = env.sms.baseUrl && env.sms.apiKey ? new GenericHttpSmsProvider() : new ConsoleSmsProvider();

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
