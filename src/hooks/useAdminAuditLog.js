// src/hooks/useAdminAuditLog.js
/**
 * Hook para registrar acciones administrativas en admin_audit_logs
 * Uso: const { logAction } = useAdminAuditLog();
 * await logAction('approve_business', 'business', business.id, business.name);
 */
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useAdminAuditLog() {
    const { user } = useAuth();

    const logAction = useCallback(async (
        action,
        targetType = null,
        targetId = null,
        targetName = null,
        details = {}
    ) => {
        if (!user?.id) return;

        try {
            await supabase.from('admin_audit_logs').insert({
                admin_user_id:  user.id,
                admin_email:    user.email,
                action,
                target_type:    targetType,
                target_id:      targetId,
                target_name:    targetName,
                details,
            });
        } catch (err) {
            // Silencioso: el audit log nunca debe bloquear la acción principal
            console.warn('[AuditLog] Error al registrar:', err?.message);
        }
    }, [user]);

    const fetchAuditLogs = useCallback(async (limit = 50) => {
        try {
            const { data, error } = await supabase
                .from('admin_audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.warn('[AuditLog] Error leyendo logs:', err?.message);
            return [];
        }
    }, []);

    return { logAction, fetchAuditLogs };
}
