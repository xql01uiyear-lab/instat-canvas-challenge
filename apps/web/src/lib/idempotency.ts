/**
 * An idempotency key identifies one logical create. It stays the same while we
 * retry a request whose response was lost to the network (same key + same body
 * => the server returns the already-created resource) and is replaced when a
 * genuinely new attempt starts.
 */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
