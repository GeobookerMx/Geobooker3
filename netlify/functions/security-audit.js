const { createClient } = require('@supabase/supabase-js');
const { evaluateSecuritySnapshot } = require('./_security-audit-evaluator');

const CRITICAL_TABLES = [
  'international_businesses',
  'international_business_claims',
  'user_profiles',
  'ad_campaigns',
  'connect_campaigns',
  'admin_users',
];

const REQUIRED_POLICIES = {
  international_businesses: ['international_businesses_public_read_v1'],
  international_business_claims: [
    'international_claims_insert_own_v1',
    'international_claims_select_own_v1',
  ],
};

const SENSITIVE_INSERT_TABLES = [
  'ad_campaigns',
  'international_business_claims',
  'user_profiles',
];

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function postNotification(url, payload) {
  if (!url || !process.env.INTERNAL_FUNCTION_SECRET) return;

  try {
    await fetch(`${url}/.netlify/functions/send-notification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-geobooker-internal-secret': process.env.INTERNAL_FUNCTION_SECRET,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn('[security-audit] Failed to send notification:', error.message);
  }
}

exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const siteUrl = process.env.URL || '';
  const adminEmail = process.env.ADMIN_EMAIL || 'hola@geobooker.com.mx';

  if (!supabaseUrl || !supabaseKey) {
    console.error('[security-audit] Missing Supabase credentials');
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing credentials' }) };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const auditDate = new Date().toISOString();
  const findings = [];
  let checksPassed = 0;
  let checksFailed = 0;
  let auditIncomplete = false;

  try {
    const { data: snapshot, error: snapshotError } = await supabase.rpc(
      'get_security_audit_snapshot'
    );

    if (snapshotError) {
      auditIncomplete = true;
      checksFailed++;
      findings.push({
        severity: 'high',
        check: 'security_snapshot_unavailable',
        message: snapshotError.message || 'Security snapshot RPC failed',
      });
    } else {
      try {
        const evaluated = evaluateSecuritySnapshot(snapshot, {
          requiredPolicies: REQUIRED_POLICIES,
          sensitiveInsertTables: SENSITIVE_INSERT_TABLES,
        });
        checksPassed += evaluated.checksPassed;
        checksFailed += evaluated.checksFailed;
        findings.push(...evaluated.findings);
      } catch (error) {
        auditIncomplete = true;
        checksFailed++;
        findings.push({
          severity: 'high',
          check: 'security_snapshot_invalid',
          message: error.message,
        });
      }
    }

    for (const table of CRITICAL_TABLES) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (tableError) {
        checksFailed++;
        findings.push({
          severity: tableError.code === '42P01' ? 'high' : 'medium',
          check: tableError.code === '42P01' ? 'missing_table' : 'table_check_failed',
          message: `Could not verify ${table}: ${tableError.message || tableError.code}`,
        });
      } else {
        checksPassed++;
      }
    }

    const overallSeverity = findings.some((finding) => finding.severity === 'critical')
      ? 'critical'
      : findings.some((finding) => finding.severity === 'high')
        ? 'high'
        : findings.length > 0
          ? 'medium'
          : 'info';

    const auditRecord = {
      audit_date: auditDate,
      auditor: 'security-audit-cron',
      checks_passed: checksPassed,
      checks_failed: checksFailed,
      overall_severity: overallSeverity,
      findings,
      notes: auditIncomplete
        ? 'Automated monthly audit incomplete; manual review required.'
        : `Automated monthly audit. ${findings.length} finding(s).`,
    };

    const { error: eventLogError } = await supabase.from('security_events').insert({
      event_type: auditIncomplete ? 'monthly_security_audit_incomplete' : 'monthly_security_audit',
      severity: overallSeverity,
      source: 'security-audit-cron',
      route: '/.netlify/functions/security-audit',
      message: `Monthly audit: ${checksPassed} checks passed, ${checksFailed} failed`,
      metadata: auditRecord,
    });
    if (eventLogError) {
      console.warn('[security-audit] Could not write security event:', eventLogError.message);
    }

    const { error: auditLogError } = await supabase
      .from('security_audit_log')
      .insert(auditRecord);
    if (auditLogError) {
      console.warn('[security-audit] Could not write audit log:', auditLogError.message);
    }

    if (findings.length > 0) {
      const findingsList = findings
        .map((finding) => `<li><strong>[${escapeHtml(finding.severity.toUpperCase())}]</strong> ${escapeHtml(finding.check)}: ${escapeHtml(finding.message)}</li>`)
        .join('');

      await postNotification(siteUrl, {
        type: 'custom',
        data: {
          email: adminEmail,
          subject: `Geobooker Security Audit - ${checksFailed} issue(s) found`,
          html: `
            <h2>Monthly Security Audit Report</h2>
            <p><strong>Date:</strong> ${escapeHtml(auditDate)}</p>
            <p><strong>Passed:</strong> ${checksPassed} | <strong>Failed:</strong> ${checksFailed}</p>
            <h3>Findings:</h3>
            <ul>${findingsList}</ul>
            <p><a href="https://geobooker.com.mx/admin/security">Open Security Dashboard</a></p>
          `,
          preheader: `Security audit found ${checksFailed} issue(s) - review required`,
        },
      });
    }

    return {
      statusCode: auditIncomplete ? 503 : 200,
      body: JSON.stringify({
        audit_date: auditDate,
        checks_passed: checksPassed,
        checks_failed: checksFailed,
        findings_count: findings.length,
        overall_severity: overallSeverity,
        complete: !auditIncomplete,
      }),
    };
  } catch (error) {
    console.error('[security-audit] Unexpected error:', error);

    await supabase.from('security_events').insert({
      event_type: 'monthly_security_audit_error',
      severity: 'critical',
      source: 'security-audit-cron',
      message: `Audit failed with error: ${error.message}`,
      metadata: { error: error.message, audit_date: auditDate },
    }).catch(() => {});

    return { statusCode: 500, body: JSON.stringify({ error: 'Security audit failed' }) };
  }
};
