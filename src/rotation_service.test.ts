import { decideShipment } from "./rotation_service.ts";

const event = { shipmentId: "SHP-1042", status: "delivered" as const, occurredAt: "2026-10-24T08:30:00.000Z" };
const proof = { shipmentId: "SHP-1042", objectName: "pod/SHP-1042.pdf", contentType: "application/pdf" };
if (decideShipment(event, proof, undefined) !== "ready_for_checkout") throw new Error("delivered shipment with proof should be ready for checkout");
if (decideShipment({ ...event, status: "exception" }, proof, { shipmentId: event.shipmentId, reason: "address check", owner: "ops" }) !== "hold_for_exception") throw new Error("exception should hold checkout");
console.log("shipment decision test passed");
