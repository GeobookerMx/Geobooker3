# CRM Email Production Checklist

## 1. SQL obligatorio

Aplicar en Supabase:

- [fix_crm_email_templates_canonical.sql](C:/Users/juanpablo/Geobooker3/supabase/fix_crm_email_templates_canonical.sql:1)

Validar despues:

```sql
select id, name, template_type, is_active
from public.email_templates
where template_type in ('invitation', 'followup', 'reengagement')
order by created_at desc nulls last, id desc;
```

## 2. Secretos necesarios

En GitHub Repository Secrets:

- `CRON_SECRET`

En Netlify Environment Variables:

- `CRON_SECRET`
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_SUPABASE_URL`

## 3. Validacion de workflow

Verificar en GitHub Actions:

- workflow: `Daily CRM Automation`
- estado: enabled
- permitir `schedule`

Horarios esperados:

- `15:00 UTC`: generar colas
- `15:10 UTC`: procesar lote 1
- `15:20 UTC`: procesar lote 2
- `15:30 UTC`: procesar lote 3
- `15:40 UTC`: procesar lote 4

## 4. Validacion funcional

Preparar una prueba con 1 contacto real:

```sql
select id, email, company_name, contact_name, tier, email_status, email_sent_count, last_email_sent
from public.marketing_contacts
where email is not null
order by created_at desc
limit 10;
```

Generar cola:

```sql
select * from public.generate_daily_email_queue(10, null);
```

Ver cola:

```sql
select eq.id, eq.status, eq.email_round, mc.email, mc.company_name, mc.email_sent_count
from public.email_queue eq
join public.marketing_contacts mc on mc.id = eq.contact_id
order by eq.created_at desc
limit 20;
```

Revisar historial despues del envio:

```sql
select contact_id, campaign_type, status, sent_at, details
from public.campaign_history
where campaign_type = 'email'
order by sent_at desc
limit 20;
```

Revisar tracking del contacto:

```sql
select id, email, email_status, email_sent_at, last_email_sent, email_sent_count
from public.marketing_contacts
where email is not null
order by last_email_sent desc nulls last
limit 20;
```

## 5. Resultado esperado

- el CRM manual debe enviar con layout profesional
- el flujo automatico debe usar:
  - `invitation` para ronda 1
  - `followup` para ronda 2
  - `reengagement` para ronda 3+
- `email_sent_at`, `last_email_sent` y `email_sent_count` deben actualizarse juntos
- el workflow debe poder completar hasta 100 correos al dia en 4 lotes de 25

## 6. Riesgos residuales

- los endpoints cron quedan protegidos por `CRON_SECRET` o por origen confiable (`geobooker.com.mx` / localhost) para no romper el panel admin
- si GitHub Actions no esta habilitado, el flujo automatico no correra aunque el codigo este listo
- si faltan plantillas activas por ronda, el sistema caera a fallback por tier o primera activa
