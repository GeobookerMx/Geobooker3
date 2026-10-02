-- ============================================================
-- DIAGNÓSTICO: ¿Por qué el worker procesó 0 mensajes?
-- Ejecuta esto en Supabase SQL Editor
-- ============================================================

-- 1. Ver el estado de todos los jobs en crm.outbound_jobs
SELECT 
  id,
  job_type,
  channel,
  status,
  attempt_count,
  max_attempts,
  scheduled_at,
  next_attempt_at,
  locked_at,
  last_error_code,
  last_error_detail,
  created_at,
  updated_at
FROM crm.outbound_jobs
ORDER BY created_at DESC
LIMIT 10;

-- 2. Ver los mensajes creados recientemente
SELECT 
  id,
  conversation_id,
  direction,
  message_type,
  current_status,
  provider_message_id,
  failure_code,
  failure_detail,
  created_at
FROM crm.messages
WHERE direction = 'outbound'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Si hay un job en status 'failed', 'unknown' o 'retry', resetearlo a 'pending':
/*
UPDATE crm.outbound_jobs
SET
  status = 'pending',
  attempt_count = 0,
  locked_at = NULL,
  next_attempt_at = NOW(),
  last_error_code = NULL,
  last_error_detail = NULL,
  updated_at = NOW()
WHERE status IN ('failed', 'unknown', 'retry', 'processing')
  AND created_at > NOW() - INTERVAL '2 hours';
*/
