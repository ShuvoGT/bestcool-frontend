/**
 * RSA helpers for Nagad (spec §5).
 * Nagad signs requests with the merchant private key (SHA256withRSA) and
 * encrypts the sensitive payload with Nagad's PG public key (RSA/PKCS1).
 * Responses are encrypted with the merchant public key, so we decrypt with
 * the merchant private key.
 *
 * Keys in .env may be supplied either as raw base64 (DER) or full PEM — both
 * are normalised here.
 */
import crypto from "crypto";

function toPem(key: string, type: "PUBLIC" | "PRIVATE"): string {
  const trimmed = key.trim();
  if (trimmed.includes("-----BEGIN")) return trimmed;
  const header = type === "PUBLIC" ? "PUBLIC KEY" : "PRIVATE KEY";
  const body = trimmed.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? trimmed;
  return `-----BEGIN ${header}-----\n${body}\n-----END ${header}-----`;
}

/** Encrypt plaintext JSON with Nagad's PG public key → base64. */
export function encryptWithPgPublicKey(plaintext: string, pgPublicKey: string): string {
  return crypto
    .publicEncrypt(
      { key: toPem(pgPublicKey, "PUBLIC"), padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(plaintext, "utf8")
    )
    .toString("base64");
}

/** Decrypt a Nagad response (base64) with the merchant private key → string. */
export function decryptWithMerchantPrivateKey(encryptedBase64: string, merchantPrivateKey: string): string {
  return crypto
    .privateDecrypt(
      { key: toPem(merchantPrivateKey, "PRIVATE"), padding: crypto.constants.RSA_PKCS1_PADDING },
      Buffer.from(encryptedBase64, "base64")
    )
    .toString("utf8");
}

/** SHA256withRSA signature of plaintext with the merchant private key → base64. */
export function signWithMerchantPrivateKey(plaintext: string, merchantPrivateKey: string): string {
  const signer = crypto.createSign("SHA256");
  signer.update(plaintext);
  signer.end();
  return signer.sign(toPem(merchantPrivateKey, "PRIVATE"), "base64");
}

/**
 * Verify Nagad's response signature (SHA256withRSA) over the decrypted
 * sensitiveData string, using Nagad's PG public key. Returns false on any
 * error so callers fail closed.
 */
export function verifyNagadSignature(plaintext: string, signatureBase64: string, pgPublicKey: string): boolean {
  try {
    const verifier = crypto.createVerify("SHA256");
    verifier.update(plaintext);
    verifier.end();
    return verifier.verify(toPem(pgPublicKey, "PUBLIC"), signatureBase64, "base64");
  } catch {
    return false;
  }
}

/** Random alphanumeric challenge string required by Nagad's init payload. */
export function randomChallenge(length = 40): string {
  return crypto.randomBytes(length).toString("base64url").slice(0, length);
}
