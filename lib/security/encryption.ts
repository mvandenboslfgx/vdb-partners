import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "@/lib/env";

function key() {
  if (!env.ENCRYPTION_KEY) throw new Error("ENCRYPTION_KEY is required to encrypt bank details");
  const value = Buffer.from(env.ENCRYPTION_KEY, /^[0-9a-f]{64}$/i.test(env.ENCRYPTION_KEY) ? "hex" : "base64");
  if (value.length !== 32) throw new Error("ENCRYPTION_KEY must encode exactly 32 bytes");
  return value;
}
export function encrypt(plaintext: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}
export function decrypt(payload: string) {
  const bytes = Buffer.from(payload, "base64url");
  if (bytes.length < 29) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", key(), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8");
}
