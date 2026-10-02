function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function suppressionTable(supabase) {
  return supabase.schema('crm').from('suppressions');
}

async function loadActiveEmailSuppressions(supabase, emails) {
  const normalizedEmails = [...new Set((emails || []).map(normalizeEmail).filter(Boolean))];
  if (normalizedEmails.length === 0) return new Set();

  const { data, error } = await suppressionTable(supabase)
    .select('normalized_identifier')
    .eq('identifier_type', 'email')
    .eq('status', 'active')
    .in('normalized_identifier', normalizedEmails)
    .or('channel.is.null,channel.eq.email');

  if (error) {
    const lookupError = new Error('global_email_suppression_lookup_failed');
    lookupError.cause = error;
    throw lookupError;
  }

  return new Set((data || []).map((row) => normalizeEmail(row.normalized_identifier)));
}

async function isEmailSuppressed(supabase, email) {
  const suppressed = await loadActiveEmailSuppressions(supabase, [email]);
  return suppressed.has(normalizeEmail(email));
}

async function recordEmailSuppression(supabase, {
  email,
  reason,
  source,
  sourceMetadata = {}
}) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error('email_required_for_suppression');

  const allowedReasons = new Set([
    'opt_out',
    'hard_bounce',
    'soft_bounce',
    'complaint',
    'invalid',
    'manual_block',
    'legal_hold'
  ]);
  if (!allowedReasons.has(reason)) throw new Error('invalid_email_suppression_reason');

  const { data: existing, error: lookupError } = await suppressionTable(supabase)
    .select('id')
    .eq('identifier_type', 'email')
    .eq('normalized_identifier', normalizedEmail)
    .eq('status', 'active')
    .or('channel.is.null,channel.eq.email')
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return { id: existing.id, alreadyActive: true };

  const { data, error } = await suppressionTable(supabase)
    .insert({
      identifier_type: 'email',
      normalized_identifier: normalizedEmail,
      channel: 'email',
      reason,
      status: 'active',
      source: String(source || 'crm_email').slice(0, 100),
      source_metadata: sourceMetadata
    })
    .select('id')
    .single();

  if (error?.code === '23505') return { id: null, alreadyActive: true };
  if (error) throw error;
  return { id: data.id, alreadyActive: false };
}

module.exports = {
  isEmailSuppressed,
  loadActiveEmailSuppressions,
  normalizeEmail,
  recordEmailSuppression
};
