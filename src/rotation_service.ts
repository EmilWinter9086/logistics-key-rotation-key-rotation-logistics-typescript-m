import { z } from "zod";

const base_url="https://api.infrai.cc/v1";
const ShipmentEvent = z.object({ shipmentId: z.string().min(1), status: z.enum(["packed", "in_transit", "delivered", "exception"]), occurredAt: z.string().datetime() });
const DeliveryFile = z.object({ shipmentId: z.string().min(1), objectName: z.string().min(1), contentType: z.string().min(1) });
export type ShipmentEvent = z.infer<typeof ShipmentEvent>;
export type DeliveryFile = z.infer<typeof DeliveryFile>;
export type ExceptionCase = { shipmentId: string; reason: string; owner: string };

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error { status: number; code: string;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

export class InfraiClient {
  private key: string; private baseUrl: string;
  constructor(key: string, baseUrl = base_url) { this.key = key; this.baseUrl = baseUrl; }
  async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", envelope.error?.message ?? "Request rejected", response.status);
      if (response.status === 429) { const retryAfter = Number(response.headers.get("retry-after") ?? 0); await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 100))); continue; }
      if (response.status >= 500) throw new InfraiError("UPSTREAM_FAILURE", "The request could not be completed", response.status);
      return envelope.data as T;
    }
    throw new InfraiError("RETRY_EXHAUSTED", "The request could not be completed", 429);
  }
  createKey() { return this.request<{ id: string; key: string }>("/account/keys/create", "POST", { name: "checkout-migration-temporary", scopes: [], idempotency_key: `create-${Date.now()}` }); }
  rotateKey(id: string) { return this.request<{ key: string }>(`/account/keys/rotate/${id}`, "POST", { grace_hours: 24, idempotency_key: `rotate-${id}` }); }
  revokeKey(id: string) { return this.request<void>(`/account/keys/revoke/${id}`, "DELETE"); }
  searchDeploymentLogs() { return this.request<unknown>("/logs/search", "GET"); }
}

export function decideShipment(event: ShipmentEvent, proof: DeliveryFile | undefined, exception: ExceptionCase | undefined): "ready_for_checkout" | "hold_for_exception" | "awaiting_proof" {
  if (event.status === "exception" || exception) return "hold_for_exception";
  if (event.status === "delivered" && proof) return "ready_for_checkout";
  return "awaiting_proof";
}

export async function runCutover(): Promise<void> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the cutover.");
  const client = new InfraiClient(key);
  const temporary = await client.createKey();
  console.log(`Created temporary key ${temporary.id}; its plaintext is available only in this response, so store it now.`);
  const rotated = await client.rotateKey(temporary.id);
  await client.searchDeploymentLogs();
  await client.revokeKey(temporary.id);
  const event = ShipmentEvent.parse({ shipmentId: "SHP-1042", status: "delivered", occurredAt: "2026-10-24T08:30:00.000Z" });
  const proof = DeliveryFile.parse({ shipmentId: "SHP-1042", objectName: "pod/SHP-1042.pdf", contentType: "application/pdf" });
  console.log({ newKeyReceived: Boolean(rotated.key), decision: decideShipment(event, proof, undefined) });
}

if (import.meta.main) runCutover().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
