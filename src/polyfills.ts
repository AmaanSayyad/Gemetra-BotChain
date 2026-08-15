/**
 * Node globals used by @solana/spl-token and other Solana libs in the browser.
 * Must load before any module that touches Buffer.
 */
import { Buffer } from "buffer";

const g = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
if (typeof g.Buffer === "undefined") {
  g.Buffer = Buffer;
}
