// src/pages/admin/ClaimsManagement.jsx
// Panel de administración para aprobar/rechazar reclamos de negocios
// Compatible con negocios nativos, DENUE y Overture

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    CheckCircle, XCircle, Clock, Shield, MapPin,
    User, Calendar, Globe, Phone, Mail, Image,
    RefreshCw, ExternalLink, Building2, AlertCircle
} from 'lucide-react';
import { sendEmail } from '../../services/emailService';

const ClaimsManagement = () => {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('submitted');
    const [processing, setProcessing] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(null);

    const loadClaims = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('business_claims')
                .select('*, businesses(id, name, category, address, source_type, source_record_id, is_claimed)')
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setClaims(data || []);
        } catch (err) {
            console.error('Error loading claims:', err);
            toast.error('Error cargando reclamos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClaims();
    }, [filter]);

    // Aprobar claim
    const handleApprove = async (claim) => {
        setProcessing(claim.id);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // 1. Actualizar claim a aprobado
            const { error: claimError } = await supabase
                .from('business_claims')
                .update({
                    status: 'approved',
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: 'Aprobado por admin'
                })
                .eq('id', claim.id);

            if (claimError) throw claimError;

            // 2. Actualizar negocio como reclamado
            const { error: bizError } = await supabase
                .from('businesses')
                .update({
                    is_claimed: true,
                    claimed_by: claim.user_id,
                    claimed_at: new Date().toISOString(),
                    owner_id: claim.user_id, // Asignar como dueño
                })
                .eq('id', claim.business_id);

            if (bizError) throw bizError;

            // 3. Rechazar otros claims activos para el mismo negocio
            await supabase
                .from('business_claims')
                .update({
                    status: 'rejected',
                    review_notes: 'Otro reclamo fue aprobado para este negocio',
                    reviewed_at: new Date().toISOString(),
                })
                .eq('business_id', claim.business_id)
                .neq('id', claim.id)
                .in('status', ['submitted', 'under_review']);

            toast.success('✅ Reclamo aprobado — negocio asignado al usuario');

            // Enviar email de notificación al reclamante
            try {
                const bizName = claim.businesses?.name || 'tu negocio';
                await sendEmail({
                    to: claim.email,
                    subject: `✅ ¡Tu reclamo de "${bizName}" fue aprobado! — Geobooker`,
                    html: `
                        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                            <div style="background:linear-gradient(135deg,#059669,#10b981);padding:30px;text-align:center;border-radius:12px 12px 0 0">
                                <h1 style="color:#fff;margin:0;font-size:24px">🎉 ¡Reclamo Aprobado!</h1>
                            </div>
                            <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
                                <p style="color:#333;font-size:16px">Hola <strong>${claim.claimer_name}</strong>,</p>
                                <p style="color:#555;line-height:1.6">Tu solicitud de reclamo para <strong>${bizName}</strong> ha sido <span style="color:#059669;font-weight:bold">aprobada</span>.</p>
                                <p style="color:#555;line-height:1.6">Ahora puedes:</p>
                                <ul style="color:#555;line-height:1.8">
                                    <li>✏️ Editar la información de tu negocio</li>
                                    <li>📸 Subir fotos</li>
                                    <li>⭐ Recibir y responder reseñas</li>
                                    <li>📊 Ver métricas de visitas</li>
                                </ul>
                                <div style="text-align:center;margin:25px 0">
                                    <a href="https://geobooker.com.mx/dashboard" style="display:inline-block;background:#059669;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Ir a mi Dashboard</a>
                                </div>
                                <p style="color:#888;font-size:12px;text-align:center">— Equipo Geobooker</p>
                            </div>
                        </div>
                    `
                });
            } catch (emailErr) {
                console.warn('Error enviando email de aprobación:', emailErr);
            }

            loadClaims();
        } catch (err) {
            console.error('Error approving claim:', err);
            toast.error('Error al aprobar');
        } finally {
            setProcessing(null);
        }
    };

    // Rechazar claim
    const handleReject = async (claimId) => {
        setProcessing(claimId);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('business_claims')
                .update({
                    status: 'rejected',
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString(),
                    review_notes: rejectReason || 'No se pudo verificar la propiedad'
                })
                .eq('id', claimId);

            if (error) throw error;
            toast.success('❌ Reclamo rechazado');

            // Enviar email de notificación al reclamante
            try {
                const claim = claims.find(c => c.id === claimId);
                if (claim?.email) {
                    const bizName = claim.businesses?.name || 'el negocio solicitado';
                    await sendEmail({
                        to: claim.email,
                        subject: `Actualización sobre tu reclamo de "${bizName}" — Geobooker`,
                        html: `
                            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                                <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:30px;text-align:center;border-radius:12px 12px 0 0">
                                    <h1 style="color:#fff;margin:0;font-size:24px">Actualización de Reclamo</h1>
                                </div>
                                <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;border-radius:0 0 12px 12px">
                                    <p style="color:#333;font-size:16px">Hola <strong>${claim.claimer_name}</strong>,</p>
                                    <p style="color:#555;line-height:1.6">Lamentablemente, tu solicitud de reclamo para <strong>${bizName}</strong> no pudo ser verificada en este momento.</p>
                                    ${rejectReason ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:15px;margin:15px 0;border-radius:4px"><strong style="color:#dc2626">Motivo:</strong> <span style="color:#555">${rejectReason}</span></div>` : ''}
                                    <p style="color:#555;line-height:1.6">Si crees que esto es un error, puedes intentar nuevamente enviando documentación adicional que compruebe tu relación con el negocio.</p>
                                    <div style="text-align:center;margin:25px 0">
                                        <a href="https://geobooker.com.mx/claim" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Intentar de nuevo</a>
                                    </div>
                                    <p style="color:#888;font-size:12px;text-align:center">— Equipo Geobooker</p>
                                </div>
                            </div>
                        `
                    });
                }
            } catch (emailErr) {
                console.warn('Error enviando email de rechazo:', emailErr);
            }

            setShowRejectModal(null);
            setRejectReason('');
            loadClaims();
        } catch (err) {
            console.error('Error rejecting claim:', err);
            toast.error('Error al rechazar');
        } finally {
            setProcessing(null);
        }
    };

    const getSourceLabel = (sourceType) => {
        switch (sourceType) {
            case 'seed_denue': return '🇲🇽 DENUE';
            case 'seed_overture': return '🌍 Overture';
            case 'bulk_import': return '📥 Importación';
            default: return '👤 Nativo';
        }
    };

    const getStatusConfig = (status) => {
        switch (status) {
            case 'submitted': return { icon: Clock, label: 'Pendiente', color: 'bg-amber-100 text-amber-700' };
            case 'under_review': return { icon: Shield, label: 'En revisión', color: 'bg-blue-100 text-blue-700' };
            case 'approved': return { icon: CheckCircle, label: 'Aprobado', color: 'bg-green-100 text-green-700' };
            case 'rejected': return { icon: XCircle, label: 'Rechazado', color: 'bg-red-100 text-red-700' };
            default: return { icon: Clock, label: status, color: 'bg-gray-100 text-gray-700' };
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        🛡️ Reclamos de Negocios
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Aprueba o rechaza las solicitudes de propiedad de negocios
                    </p>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {['submitted', 'under_review', 'approved', 'rejected', 'all'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition text-sm ${
                                filter === status
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
                            }`}
                        >
                            {status === 'submitted' && '⏳ Pendientes'}
                            {status === 'under_review' && '🔍 En Revisión'}
                            {status === 'approved' && '✅ Aprobados'}
                            {status === 'rejected' && '❌ Rechazados'}
                            {status === 'all' && '📋 Todos'}
                        </button>
                    ))}

                    <button
                        onClick={loadClaims}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>

                {/* Lista */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full"></div>
                    </div>
                ) : claims.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <Shield className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Sin reclamos</h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            No hay reclamos con estado "{filter}"
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {claims.map((claim) => {
                            const biz = claim.businesses;
                            const statusConfig = getStatusConfig(claim.status);
                            const StatusIcon = statusConfig.icon;

                            return (
                                <div
                                    key={claim.id}
                                    className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden ${
                                        claim.status === 'approved' ? 'border-green-200 dark:border-green-800' :
                                        claim.status === 'rejected' ? 'border-red-200 dark:border-red-800' :
                                        'border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    <div className="p-6">
                                        {/* Header: negocio + estado */}
                                        <div className="flex flex-wrap gap-4 justify-between items-start mb-5">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                                                    <Building2 className="w-5 h-5 text-blue-600" />
                                                    {biz?.name || 'Negocio eliminado'}
                                                </h3>
                                                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                                    {biz?.category && (
                                                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded capitalize">
                                                            {biz.category}
                                                        </span>
                                                    )}
                                                    {biz?.source_type && (
                                                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-xs font-medium">
                                                            {getSourceLabel(biz.source_type)}
                                                        </span>
                                                    )}
                                                    {biz?.is_claimed && (
                                                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">
                                                            ✅ Ya reclamado
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${statusConfig.color}`}>
                                                <StatusIcon className="w-4 h-4" />
                                                {statusConfig.label}
                                            </div>
                                        </div>

                                        {/* Info del reclamante */}
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4">
                                            <h4 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                                <User className="w-4 h-4" /> Reclamante
                                            </h4>
                                            <div className="grid md:grid-cols-2 gap-3 text-sm">
                                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <span className="font-medium">{claim.claimer_name}</span>
                                                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                                                        {claim.claimer_role}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                    {claim.email}
                                                </div>
                                                {claim.phone && (
                                                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                        <Phone className="w-4 h-4 text-gray-400" />
                                                        {claim.phone}
                                                    </div>
                                                )}
                                                {claim.website && (
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-4 h-4 text-gray-400" />
                                                        <a href={claim.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                                                            {claim.website}
                                                        </a>
                                                        <ExternalLink className="w-3 h-3 text-gray-400" />
                                                    </div>
                                                )}
                                            </div>
                                            {claim.evidence_description && (
                                                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-600 p-3 rounded-lg">
                                                    💬 {claim.evidence_description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Foto de evidencia */}
                                        {claim.evidence_photo_url && (
                                            <div className="mb-4">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                                    <Image className="w-4 h-4" /> Evidencia adjunta
                                                </p>
                                                <img
                                                    src={claim.evidence_photo_url}
                                                    alt="Evidencia"
                                                    className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                                                />
                                            </div>
                                        )}

                                        {/* Fecha */}
                                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Enviado: {new Date(claim.created_at).toLocaleDateString('es-MX', {
                                                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                            <span className="mx-1">•</span>
                                            ID: {claim.user_id?.slice(0, 8)}
                                        </div>

                                        {/* Botones de acción */}
                                        {(claim.status === 'submitted' || claim.status === 'under_review') && (
                                            <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-600">
                                                <button
                                                    onClick={() => handleApprove(claim)}
                                                    disabled={processing === claim.id}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                    {processing === claim.id ? 'Procesando...' : 'Aprobar y Asignar'}
                                                </button>
                                                <button
                                                    onClick={() => setShowRejectModal(claim.id)}
                                                    disabled={processing === claim.id}
                                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                    Rechazar
                                                </button>
                                            </div>
                                        )}

                                        {/* Notas de revisión */}
                                        {claim.review_notes && claim.status !== 'submitted' && (
                                            <div className={`mt-4 p-3 rounded-lg text-sm ${
                                                claim.status === 'approved' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                                <strong>Nota:</strong> {claim.review_notes}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de rechazo */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Rechazar reclamo</h3>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Razón del rechazo (opcional)..."
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                disabled={processing}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                Confirmar Rechazo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClaimsManagement;
