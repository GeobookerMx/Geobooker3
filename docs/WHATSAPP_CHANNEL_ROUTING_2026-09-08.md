# Geobooker WhatsApp channel routing

## Official roles

| Channel | Number | Role | Public status |
| --- | --- | --- | --- |
| Human support | +52 55 2670 2368 | Sales, support, billing questions and escalations handled in WhatsApp Business App | Public |
| CRM Cloud API | +52 1 55 7405 7295 | Consented CRM notifications, approved templates, campaign attribution and automated status tracking | Registered; public activation pending |

The Cloud API number must not replace the human channel. Public activation requires
WABA subscription, a production webhook check, approved templates, consent and
suppression gates, billing and a controlled end-to-end test. Sending remains disabled.

## Public surfaces

- Website/PWA footer: human support only.
- Support page: both roles are explained; the Cloud API number is not linked as an
  operational chat while release gates remain incomplete.
- Geobooker Connect and enterprise sales: human support.
- Organization structured data: human support.
- CRM and WhatsApp Center: Cloud API production number.

## External account checklist

These changes require an authenticated owner/editor session in each external service
and are not performed from the public website deployment.

- Facebook Page action button: human support.
- Instagram contact/WhatsApp button: human support until Cloud API release is certified.
- Google Business Profile phone/WhatsApp field: human support.
- LinkedIn company contact details: human support plus hola@geobooker.com.mx.
- TikTok and YouTube descriptions: use a link to the Geobooker support page instead of
  publishing two unexplained phone numbers.

After production certification, campaigns and template replies may use the Cloud API
number, while account bios and escalation paths should continue to identify the human
support number.
