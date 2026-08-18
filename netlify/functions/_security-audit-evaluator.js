function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function evaluateSecuritySnapshot(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new Error('Invalid security audit snapshot');
  }

  const requiredPolicies = options.requiredPolicies || {};
  const sensitiveInsertTables = options.sensitiveInsertTables || [];
  const findings = [];
  let checksPassed = 0;
  let checksFailed = 0;

  const tablesWithoutRls = asArray(snapshot.tables_without_rls);
  if (tablesWithoutRls.length > 0) {
    findings.push({
      severity: 'high',
      check: 'rls_disabled',
      message: `Tables without RLS: ${tablesWithoutRls.join(', ')}`,
    });
    checksFailed++;
  } else {
    checksPassed++;
  }

  const policies = asArray(snapshot.policies);
  for (const [table, requiredNames] of Object.entries(requiredPolicies)) {
    const tablePolicyNames = new Set(
      policies
        .filter((policy) => policy.tablename === table)
        .map((policy) => policy.policyname)
    );

    for (const requiredName of requiredNames) {
      if (tablePolicyNames.has(requiredName)) {
        checksPassed++;
      } else {
        findings.push({
          severity: 'critical',
          check: 'missing_rls_policy',
          message: `Required RLS policy missing on ${table}: ${requiredName}`,
        });
        checksFailed++;
      }
    }
  }

  for (const table of sensitiveInsertTables) {
    const dangerousPolicies = policies.filter((policy) => {
      const roles = asArray(policy.roles).map(String);
      return policy.tablename === table &&
        String(policy.cmd).toUpperCase() === 'INSERT' &&
        (roles.includes('anon') || roles.includes('public'));
    });

    if (dangerousPolicies.length > 0) {
      findings.push({
        severity: 'critical',
        check: 'anon_insert_allowed',
        message: `Anonymous INSERT allowed on ${table}: ${dangerousPolicies.map((policy) => policy.policyname).join(', ')}`,
      });
      checksFailed++;
    } else {
      checksPassed++;
    }
  }

  return { checksPassed, checksFailed, findings };
}

module.exports = { evaluateSecuritySnapshot };
