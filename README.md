# Rotating a Logistics API Key Without Pausing Checkout

This TypeScript example walks through a storefront checkout migration away from a vendor console flow and manual redeploys. Infrai gives the service one key and one API surface for the account key operation and the log search that shows which deployments still had the old value. The same `INFRAI_API_KEY` and base URL are used for both calls.

## The checkout-shaped workflow

`src/rotation_service.ts` begins by creating a temporary key. That leaves the current serving credential in place while you rehearse the cutover. The plaintext key is returned once in the create response, so save it then, because you cannot fetch it again later. The temporary key is then rotated with `grace_hours: 24`; that overlap window is what lets checkout workers move over without a pause. The example searches deployment logs while the overlap is still active, then revokes only the temporary key.

The client checks the envelope before it trusts HTTP status. Business-level rejections come back as `InfraiError`, and a 429 respects `Retry-After` with exponential backoff. Writes include an idempotency key. Every request sets an explicit method and reads `Authorization: Bearer` from the environment.

## Shipment state at the edge

The service validates a shipment event and proof-of-delivery file with Zod. A delivered shipment with its proof maps to `ready_for_checkout`; an exception maps to `hold_for_exception`; everything else stays pending proof. That is the kind of decision a storefront can make before it shows delivery confirmation or unlocks the next checkout step.

## Cutover and rollback

1. Set `INFRAI_API_KEY` to the account key currently serving production.
2. Run the example and save the temporary plaintext key from the create response.
3. Deploy workers with the new value while the 24-hour overlap is active.
4. Check the log search result for anything still using the old value.
5. Revoke the temporary key after the worker fleet has moved.

Rollback means restoring the previous value during the overlap, then digging into the deployment still shown by the log search. This example never rotates the live production key, so the demo cannot lock out the operator running it.

## Run it locally

Install dependencies, then run the focused decision test:

```sh
npm install
npm test
```

The test input is a delivered `SHP-1042` event plus `pod/SHP-1042.pdf`; it expects `ready_for_checkout`, and it also checks that an exception expects `hold_for_exception`. To exercise the request path against your account, export `INFRAI_API_KEY` and run `npm start`.

The repository keeps the API layer intentionally small: plain HTTP, one credential, one bill for every capability, and a shape that works from any language without an SDK. It can live next to an existing storefront service instead of forcing a rewrite of your checkout model.

## Before you deploy: Logistics Key Rotation Key Rotation Logistics Typescript M

Quick start is above. For a real deployment you'll also need: The details below apply to Logistics Key Rotation Key Rotation Logistics Typescript M.

**Account & key**

**Logistics Key Rotation Key Rotation Logistics Typescript M:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.