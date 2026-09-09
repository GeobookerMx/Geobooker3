# WhatsApp production phone registration

Target configuration:

- WABA: `4731600213830930`
- Phone Number ID: `1358408147344707`
- Visible phone: `+52 55 7405 7295`
- Graph API: `v26.0`
- Production sending: disabled

## Security design

The `register_phone` action is available only through `whatsapp-admin`, which
requires a valid Supabase JWT and verifies that the user is `super_admin`.
The operation additionally requires exact confirmation of the configured WABA
and Phone Number ID and refuses to run unless `WHATSAPP_SEND_ENABLED=false`.

The Meta access token and six-digit two-step PIN are read only from Supabase
Edge Function Secrets. They are not accepted in the request, returned to the
browser, stored in CRM tables or included in audit logs.

## One-time procedure

1. Set `WHATSAPP_PHONE_NUMBER_ID` to the production Phone Number ID.
2. In Supabase Dashboard, create `WHATSAPP_TWO_STEP_PIN` with the six digits
   selected by the account owner. Do not paste it into chat or source code.
3. Keep `WHATSAPP_SEND_ENABLED=false`.
4. Sign in as `super_admin` and open `/admin/whatsapp`.
5. Confirm WABA, Phone Number ID and `whatsapp_business_messaging` are correct.
6. Press **Registrar en Cloud API** and confirm the operation.
7. The backend calls `/{PHONE_NUMBER_ID}/register` with
   `messaging_product=whatsapp` and the server-side PIN.
8. The backend re-reads the phone and WABA from Graph API before marking the
   corresponding CRM phone record `active`.

The PIN secret should remain available for future two-step registration
operations, or be rotated according to the Meta account security procedure. It
must never be copied to client applications.

## Gates after registration

Registration does not authorize production messaging. Keep sending disabled
until templates, billing, webhook scope, consent/suppression, end-to-end inbound
and controlled outbound tests all pass.

