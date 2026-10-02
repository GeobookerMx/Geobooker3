import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://dllckokqkgcraxyxsfqc.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGNrb2txa2djcmF4eXhzZnFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIzODk4NiwiZXhwIjoyMDU1ODE0OTg2fQ.secret';

const supabase = createClient(url, serviceKey);

async function run() {
  console.log('Resetting queued member for test...');
  await supabase.rpc('exec_sql', { sql: `
    UPDATE crm.campaign_members 
    SET queued_job_id = NULL, provider_message_id = NULL, eligibility_status = 'eligible' 
    WHERE campaign_id IN (SELECT id FROM crm.campaigns WHERE channel = 'whatsapp');
  ` }).catch(() => {});

  // Reset outbound_jobs status back to pending if any are queued
  const { data: updatedJobs, error: updateErr } = await supabase
    .schema('crm')
    .from('outbound_jobs')
    .update({ status: 'pending', scheduled_at: new Date().toISOString() })
    .eq('status', 'queued');
  
  console.log('Triggering whatsapp-worker Edge Function...');
  const res = await fetch(`${url}/functions/v1/whatsapp-worker`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ limit: 10 })
  });

  const body = await res.json();
  console.log('Worker Result:', JSON.stringify(body, null, 2));
}

run();
