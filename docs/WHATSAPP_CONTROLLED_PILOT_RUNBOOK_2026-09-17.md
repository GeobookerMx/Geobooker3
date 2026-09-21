# Geobooker WhatsApp controlled pilot

## Scope

The first real test is an inbound-initiated service conversation between two
Geobooker-owned numbers. It is not a marketing campaign and does not authorize
contacting imported, scraped or public numbers.

- Sender/customer test number: `+52 55 2670 2368` in WhatsApp Business App.
- Geobooker Cloud API number: `+52 55 7405 7295`.
- WABA: `4731600213830930`.
- Phone Number ID: `1358408147344707`.

## Preconditions

1. `WHATSAPP_SEND_ENABLED=false` while staging database policies.
2. Geobooker and Meta Business Agent subscriptions remain present.
3. The old number is owned by Geobooker, secured with two-step verification and
   able to receive/send WhatsApp messages.
4. No campaign template is enabled.
5. Marketing and transactional policies remain kill-switched.

## Test sequence

1. From `+52 55 2670 2368`, send a new inbound message to
   `+52 55 7405 7295`: `Hola, autorizo esta prueba de servicio de Geobooker.`
2. Verify webhook HMAC, inbound message, contact point, conversation and CRM
   activity without creating marketing consent.
3. Confirm the customer-service window is open.
4. With explicit administrator authorization, temporarily set
   `WHATSAPP_SEND_ENABLED=true`.
5. Send exactly one plain-text service reply from the CRM.
6. Verify accepted/sent/delivered/read plus provider message ID, usage ledger
   cost `0`, activity and absence of duplicates.
7. From the test number, reply `BAJA`.
8. Verify opt-out and suppression; attempt a second message and require it to
   be blocked before Meta.
9. Restore `WHATSAPP_SEND_ENABLED=false` immediately after the test.

## PASS criteria

- One inbound and one outbound message only.
- HMAC valid and no scope mismatch.
- Status progression does not regress.
- CRM conversation/activity and audit events are linked.
- `BAJA` creates suppression idempotently.
- The post-opt-out attempt is blocked and creates no provider delivery.
- Marketing rates/templates remain inactive.

## Rollback

Keep `WHATSAPP_SEND_ENABLED=false`, then set all Meta budget and WhatsApp
frequency policies to `is_active=false, kill_switch=true` and retire the pilot
service rate. No messages or CRM history are deleted.

