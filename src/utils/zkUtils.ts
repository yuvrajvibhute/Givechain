/**
 * GiveChain ZK Witness Utilities
 *
 * Reusable cryptographic helpers for Compact circuit witness commitment
 * generation, donor secret validation, and transaction hash formatting.
 *
 * These utilities isolate the off-chain ZK witness pipeline from the
 * dapp-connector service layer, making them independently testable.
 *
 * @module zkUtils
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WitnessCommitmentResult {
  /** Hex-encoded SHA-256 commitment of the donor secret (public) */
  commitment: string;
  /** Input length in bytes (for debug auditing) */
  inputByteLength: number;
}

export interface DonorSecretValidation {
  isValid: boolean;
  reason?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum donor secret length in characters */
export const MIN_SECRET_LENGTH = 8;

/** Expected witness commitment hex string length (SHA-256 = 32 bytes = 64 hex chars) */
export const COMMITMENT_HEX_LENGTH = 64;

/** Tx hash display format: first N chars + ellipsis + last N chars */
const TX_HASH_PREFIX_LEN = 10;
const TX_HASH_SUFFIX_LEN = 6;

// ─── Witness Commitment ───────────────────────────────────────────────────────

/**
 * Computes the SHA-256 witness commitment for a donor secret.
 *
 * Privacy guarantee: `donorSecret` never leaves the client. Only the
 * resulting `commitment` is included in the on-chain ZK proof payload.
 *
 * Implements the same hashing pipeline as `executeDonateCircuit()` in
 * `dapp-connector.ts`, extracted here for reusability and testability.
 *
 * @param donorSecret - Raw donor secret string (hex or passphrase)
 * @returns Hex-encoded SHA-256 commitment and input byte length
 */
export async function computeWitnessCommitment(
  donorSecret: string,
): Promise<WitnessCommitmentResult> {
  const fallback = 'default_donor_witness_secret_seed';
  const input = donorSecret || fallback;
  const secretBytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', secretBytes);
  const commitment = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return { commitment, inputByteLength: secretBytes.byteLength };
}

/**
 * Computes a commitment from raw Uint8Array bytes (for circuit-level testing).
 *
 * @param secretBytes - Raw 32-byte donor witness secret
 * @returns Hex-encoded SHA-256 commitment
 */
export async function computeCommitmentFromBytes(secretBytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', secretBytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── Donor Secret Validation ─────────────────────────────────────────────────

/**
 * Validates a donor secret string before circuit execution.
 *
 * Rules:
 * - Must be a non-empty string
 * - Must be at least MIN_SECRET_LENGTH characters
 * - Must not contain only whitespace
 * - If hex-prefixed (0x...), must be a valid hex string
 *
 * @param secret - The donor secret to validate
 * @returns Validation result with optional reason string
 */
export function validateDonorSecret(secret: string): DonorSecretValidation {
  if (typeof secret !== 'string' || secret.trim().length === 0) {
    return { isValid: false, reason: 'Donor secret must be a non-empty string.' };
  }
  if (secret.trim().length < MIN_SECRET_LENGTH) {
    return {
      isValid: false,
      reason: `Donor secret must be at least ${MIN_SECRET_LENGTH} characters.`,
    };
  }
  if (secret.startsWith('0x') || secret.startsWith('0X')) {
    const hexBody = secret.slice(2);
    if (!/^[0-9a-fA-F]+$/.test(hexBody)) {
      return { isValid: false, reason: 'Hex-prefixed secret contains invalid characters.' };
    }
    if (hexBody.length === 0) {
      return { isValid: false, reason: 'Hex secret body is empty.' };
    }
  }
  return { isValid: true };
}

// ─── Transaction Hash Formatting ─────────────────────────────────────────────

/**
 * Formats a full 32-byte transaction hash into a display-safe abbreviated form.
 *
 * Output format: `0x9a4f2b...e31bc7`
 *
 * @param fullHash - Full hex transaction hash (with or without 0x prefix)
 * @returns Abbreviated display hash
 */
export function formatTxHash(fullHash: string): string {
  const hash = fullHash.startsWith('0x') ? fullHash : `0x${fullHash}`;
  if (hash.length <= TX_HASH_PREFIX_LEN + TX_HASH_SUFFIX_LEN + 3) {
    return hash;
  }
  return `${hash.slice(0, TX_HASH_PREFIX_LEN)}...${hash.slice(-TX_HASH_SUFFIX_LEN)}`;
}

/**
 * Generates a pseudo-random hex donor secret for demo/testing purposes.
 * Uses 16 random bytes encoded as hex, prefixed with `0x`.
 *
 * @returns Random 16-byte hex string (0x-prefixed, 34 chars total)
 */
export function generateDemoSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Public Output Sanitization ──────────────────────────────────────────────

/**
 * Returns a JSON-safe representation of public circuit outputs.
 * Converts BigInt values to strings to prevent JSON serialization errors.
 *
 * @param outputs - Raw public output object that may contain BigInt values
 * @returns JSON-safe object with BigInt values stringified
 */
export function sanitizePublicOutputs(
  outputs: Record<string, unknown>,
): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(outputs).map(([k, v]) => [
      k,
      typeof v === 'bigint' ? v.toString() : (v as string | number | boolean | null),
    ]),
  );
}
