/** RFC 4122 v4 UUID. Matches Postgres `uuid` columns, so local and cloud records share an ID format. */
export function createId(): string {
  return globalThis.crypto.randomUUID();
}
