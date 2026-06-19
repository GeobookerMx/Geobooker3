// src/pages/admin/Security.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield, Search, Filter, ArrowLeft, CheckCircle, Clock,
    Lock, Database, User, Eye, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useAdminAuditLog } from '../../hooks/useAdminAuditLog';
import toast from 'react-hot-toast';

export default function Security() {
    const navigate = useNavigate();
    const { fetchAuditLogs } = useAdminAuditLog();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [selectedLog, setSelectedLog] = useState(null);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAuditLogs(100);
            setLogs(data || []);
        } catch (err) {
            toast.error('Error al cargar logs de seguridad');
        } finally {
            setLoading(false);
        }
    }, [fetchAuditLogs]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Filtered logs
    const filteredLogs = logs.filter(log => {
        const matchesSearch = (log.admin_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.target_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.target_id || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesAction = actionFilter === 'all' || log.action === actionFilter;

        return matchesSearch && matchesAction;
    });

    // Unique actions list for filter
    const uniqueActions = [...new Set(logs.map(log => log.action))];

    // Helper functions for action text & styling
    const getActionLabel = (action) => {
        const actions = {
            approve_business: 'Aprobó negocio',
            reject_business: 'Rechazó negocio',
            edit_business: 'Modificó negocio',
            create_ad: 'Creó anuncio',
            delete_user: 'Eliminó usuario',
            import_contacts: 'Importó contactos',
            send_campaign: 'Lanzó campaña CRM',
            save_settings: 'Cambió configuración',
        };
        return actions[action] || action;
    };

    const getActionColor = (action) => {
        if (action.includes('approve') || action.includes('create') || action.includes('send')) {
            return 'bg-green-50 text-green-700 border-green-200';
        }
        if (action.includes('reject') || action.includes('delete')) {
            return 'bg-red-50 text-red-700 border-red-200';
        }
        return 'bg-blue-50 text-blue-700 border-blue-200';
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-500 hover:text-gray-900"
                        title="Volver al Dashboard"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="w-8 h-8 text-indigo-600" />
                            Seguridad y Auditoría
                        </h1>
                        <p className="text-gray-600 mt-1">Control de acceso administrativo y auditoría de eventos</p>
                    </div>
                </div>

                <button
                    onClick={loadLogs}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm font-semibold text-gray-700 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar Logs
                </button>
            </div>

            {/* Checklist de Seguridad */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Security Checklist Widget */}
                <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-indigo-600" />
                        Checklist de Seguridad
                    </h3>
                    <div className="space-y-3">
                        <SecurityCheckItem
                            title="Políticas RLS en Supabase"
                            desc="Restricción de lectura/escritura en tablas críticas."
                            status="pass"
                        />
                        <SecurityCheckItem
                            title="Content Security Policy (CSP)"
                            desc="Protección contra inyecciones XSS y frames no autorizados."
                            status="pass"
                        />
                        <SecurityCheckItem
                            title="SSL Forzado en Conexiones"
                            desc="Toda la comunicación de datos va cifrada por HTTPS."
                            status="pass"
                        />
                        <SecurityCheckItem
                            title="Registro de Auditoría de Admin"
                            desc="Logs en base de datos para acciones de control."
                            status="pass"
                        />
                        <SecurityCheckItem
                            title="Autenticación MFA (2FA) Admin"
                            desc="Doble factor opcional en cuentas administrativas."
                            status="warning"
                        />
                    </div>
                </div>

                {/* Audit stats summary */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Total de Eventos"
                        value={logs.length}
                        desc="Eventos en la base de datos"
                        icon={Database}
                        color="blue"
                    />
                    <StatCard
                        title="Administradores Activos"
                        value={new Set(logs.map(l => l.admin_email)).size}
                        desc="Usuarios con acciones registradas"
                        icon={User}
                        color="purple"
                    />
                    <StatCard
                        title="Último Suceso"
                        value={logs.length > 0 ? new Date(logs[0].created_at).toLocaleTimeString() : 'N/A'}
                        desc={logs.length > 0 ? new Date(logs[0].created_at).toLocaleDateString() : 'Ninguno registrado'}
                        icon={Clock}
                        color="green"
                    />
                </div>
            </div>

            {/* Audit Logs Table Panel */}
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 md:p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50">
                    <h3 className="font-bold text-gray-800 text-lg">Registro de Auditoría Administrativa</h3>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        {/* Search Input */}
                        <div className="relative flex-1 sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar administrador o destino..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl focus:border-indigo-500 focus:ring-0"
                            />
                        </div>

                        {/* Action Filter */}
                        <div className="relative">
                            <select
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                                className="w-full pl-3 pr-8 py-2 text-sm border rounded-xl bg-white focus:border-indigo-500 focus:ring-0"
                            >
                                <option value="all">Todas las Acciones</option>
                                {uniqueActions.map(action => (
                                    <option key={action} value={action}>{getActionLabel(action)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 space-y-2">
                            <p className="text-lg font-medium">No se encontraron registros de auditoría</p>
                            <p className="text-sm">Esto puede deberse a que no se ha ejecutado el SQL en Supabase o a los filtros aplicados.</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-left text-sm text-gray-700">
                            <thead className="bg-gray-100/70 border-b font-semibold text-gray-600">
                                <tr>
                                    <th className="p-4">Administrador</th>
                                    <th className="p-4">Acción</th>
                                    <th className="p-4">Destino (Target)</th>
                                    <th className="p-4">Fecha y Hora</th>
                                    <th className="p-4 text-right">Detalles</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition">
                                        <td className="p-4 font-medium text-gray-900">{log.admin_email}</td>
                                        <td className="p-4">
                                            <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${getActionColor(log.action)}`}>
                                                {getActionLabel(log.action)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {log.target_type ? (
                                                <div className="space-y-0.5">
                                                    <span className="text-xs text-gray-400 block uppercase font-bold tracking-wider">{log.target_type}</span>
                                                    <span className="text-gray-800 font-medium">{log.target_name || log.target_id}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-gray-500">
                                            {new Date(log.created_at).toLocaleString('es-MX', {
                                                year: 'numeric', month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                                            })}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-indigo-600 transition"
                                                title="Ver metadatos completos"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal de Detalles del Log */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-950 text-lg flex items-center gap-2">
                                    🔎 Detalle de Auditoría
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">ID: {selectedLog.id}</p>
                            </div>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-gray-200 rounded-xl transition text-gray-500 hover:text-gray-900"
                            >
                                <span className="font-bold">✕</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Administrador</p>
                                    <p className="font-medium text-gray-800 mt-0.5">{selectedLog.admin_email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Fecha y Hora</p>
                                    <p className="font-medium text-gray-800 mt-0.5">{new Date(selectedLog.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Acción</p>
                                    <p className="font-medium text-gray-800 mt-0.5">{getActionLabel(selectedLog.action)} ({selectedLog.action})</p>
                                </div>
                                {selectedLog.target_type && (
                                    <div>
                                        <p className="text-xs text-gray-400 font-bold uppercase">Destino ({selectedLog.target_type})</p>
                                        <p className="font-medium text-gray-800 mt-0.5">{selectedLog.target_name || selectedLog.target_id}</p>
                                    </div>
                                )}
                            </div>

                            <div className="border-t pt-4">
                                <p className="text-xs text-gray-400 font-bold uppercase mb-2">Metadatos de la Acción (JSON)</p>
                                <pre className="bg-gray-950 text-green-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60">
                                    {JSON.stringify(selectedLog.details || {}, null, 2)}
                                </pre>
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-5 py-2 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-900 transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Subcomponents
function SecurityCheckItem({ title, desc, status }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-xl border hover:bg-gray-50 transition">
            {status === 'pass' ? (
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            ) : (
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="min-w-0">
                <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

function StatCard({ title, value, desc, icon, color }) {
    const Icon = icon;
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
        green: 'bg-green-50 text-green-600 border-green-100',
    };

    return (
        <div className="bg-white border rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition">
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">{title}</span>
                <div className={`p-2.5 rounded-xl border ${colors[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <div className="mt-4">
                <span className="text-3xl font-extrabold text-gray-900">{value}</span>
                <p className="text-xs text-gray-400 mt-1">{desc}</p>
            </div>
        </div>
    );
}
