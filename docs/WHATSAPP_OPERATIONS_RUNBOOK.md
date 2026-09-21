# WhatsApp operations runbook

## Daily checks

1. Open `/admin/whatsapp`.
2. Confirm Meta API, System User Token, WABA, Phone Number and Webhook are PASS.
3. Confirm `WHATSAPP_SEND_ENABLED=false` until production certification.
4. Review failed webhooks, failed messages, retry jobs and dead letters.
5. Review template approval status before preparing campaigns.

## Production activation checklist

Do not enable sends until all are PASS:

- WABA subscribed app.
- `messages` webhook field subscribed.
- HMAC verified on POST.
- Real inbound message persisted.
- Status webhooks persisted.
- Approved templates synced.
- Consent by purpose recorded.
- Suppression/opt-out blocks verified.
- Worker deployed and observable.
- Budget policy active.
- Billing confirmed.
- App Secret rotated if used during setup.

## Incident response

For webhook failures:

1. Check `crm.webhook_events`.
2. Confirm signature validation.
3. Confirm WABA and Phone Number scope.
4. Review function logs without printing payloads or secrets.
5. Keep outbound sends disabled until root cause is closed.

For quality or policy risk:

1. Pause affected campaigns.
2. Keep global kill switch closed if risk is unclear.
3. Review opt-outs, failures and recipient source.
4. Do not retry invalid numbers, opt-outs, policy violations or rejected templates.

