import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertCircle, BarChart3, Calendar, ChevronRight,
    Eye, FileText, MousePointer, Percent, RefreshCw, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import CampaignReport from '../../components/enterprise/CampaignReport';
import CampaignReportButton from '../../components/ads/CampaignReportButton';
import { getAdvertiserCampaigns } from '../../services/reportService';

function formatNumber(value) {
    return Number(value || 0).toLocaleString('es-MX');
}

function statusLabel(status) {
    return ({
        active: 'Activa', pending_review: 'En revisión', draft: 'Borrador',
        paused: 'Pausada', completed: 'Finalizada', pending_payment: 'Pago pendiente'
    })[status] || status || 'Sin estado';
}

function statusClasses(status) {
    return ({
        active: 'bg-emerald-500/15 text-emerald-300',
        pending_review: 'bg-amber-500/15 text-amber-300',
        draft: 'bg-slate-500/20 text-slate-300',
        paused: 'bg-orange-500/15 text-orange-300',
        completed: 'bg-blue-500/15 text-blue-300',
        pending_payment: 'bg-rose-500/15 text-rose-300'
    })[status] || 'bg-slate-500/20 text-slate-300';
}

function formatCurrency(campaign) {
    const amount = campaign.total_budget ?? campaign.budget ?? 0;
    const currency = String(campaign.currency || 'MXN').toUpperCase();
    try {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(amount) || 0);
    } catch {
        return `${Number(amount || 0).toFixed(2)} ${currency}`;
    }
}

export default function AdvertiserDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);

    const loadCampaigns = useCallback(async () => {
        if (!user?.email) return;
        setLoading(true);
        try {
            const payload = await getAdvertiserCampaigns();
            setItems(payload.campaigns || []);
        } catch (error) {
            console.error('Error loading advertiser campaigns:', error);
            toast.error('No se pudieron cargar tus campañas');
        } finally {
            setLoading(false);
        }
    }, [user?.email]);

    useEffect(() => {
        if (user?.email) loadCampaigns();
    }, [loadCampaigns, user?.email]);

    const stats = useMemo(() => {
        const totals = items.reduce((acc, item) => {
            acc.impressions += Number(item.metrics?.totalImpressions || 0);
            acc.clicks += Number(item.metrics?.totalClicks || 0);
            acc.activeDays += Number(item.metrics?.activeDays || 0);
            if (item.campaign?.status === 'active') acc.active += 1;
            if (item.campaign?.status === 'completed') acc.completed += 1;
            if (item.campaign?.status === 'pending_review') acc.pending += 1;
            return acc;
        }, { impressions: 0, clicks: 0, activeDays: 0, active: 0, completed: 0, pending: 0 });
        totals.ctr = totals.impressions > 0 ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0;
        return totals;
    }, [items]);

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-center">
                <div><AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-400" /><h2 className="text-xl font-bold text-white">Inicia sesión</h2><p className="mt-2 text-slate-400">Necesitas acceder con el correo usado en tu compra publicitaria.</p><Link to="/login?redirect=/advertiser/dashboard" className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">Entrar</Link></div>
            </div>
        );
    }

    if (loading) {
        return <div className="flex min-h-screen items-center justify-center bg-slate-950"><RefreshCw className="h-8 w-8 animate-spin text-blue-400" /></div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white">
            <header className="bg-gradient-to-r from-blue-700 to-indigo-700 py-12">
                <div className="container mx-auto flex flex-wrap items-center justify-between gap-4 px-4">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm text-blue-100"><ShieldCheck className="h-4 w-4" />Portal seguro del anunciante</div>
                        <h1 className="text-3xl font-bold">Rendimiento de publicidad</h1>
                        <p className="mt-2 text-blue-100">Consulta métricas verificadas y descarga el informe de cada campaña.</p>
                    </div>
                    <button onClick={loadCampaigns} className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 font-semibold hover:bg-white/25"><RefreshCw className="h-4 w-4" />Actualizar</button>
                </div>
            </header>

            <main className="container mx-auto space-y-8 px-4 py-8">
                <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {[
                        [Eye, 'Impresiones', formatNumber(stats.impressions), 'text-blue-400'],
                        [MousePointer, 'Clics', formatNumber(stats.clicks), 'text-emerald-400'],
                        [Percent, 'CTR general', `${stats.ctr}%`, 'text-violet-400'],
                        [BarChart3, 'Campañas activas', formatNumber(stats.active), 'text-amber-400']
                    ].map(([icon, label, value, color]) => (
                        <div key={label} className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                            <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">{React.createElement(icon, { className: `h-4 w-4 ${color}` })}{label}</div>
                            <div className="text-3xl font-bold">{value}</div>
                        </div>
                    ))}
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5"><div className="text-sm text-slate-400">Campañas finalizadas</div><div className="mt-2 text-2xl font-bold text-blue-300">{stats.completed}</div></div>
                    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5"><div className="text-sm text-slate-400">Días con actividad medida</div><div className="mt-2 text-2xl font-bold text-white">{formatNumber(stats.activeDays)}</div></div>
                    <div className="rounded-xl border border-slate-700 bg-slate-800 p-5"><div className="text-sm text-slate-400">En revisión</div><div className="mt-2 text-2xl font-bold text-amber-300">{stats.pending}</div></div>
                </section>

                <section className="rounded-xl border border-blue-500/25 bg-blue-950/30 p-5 text-sm leading-6 text-blue-100">
                    <div className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5" />KPIs que sí se reportan</div>
                    <p>Impresiones visibles, clics, CTR, actividad diaria y desgloses geográficos, de dispositivo y horario cuando existen datos. Geobooker no presenta ventas ni conversiones estimadas como resultados reales.</p>
                </section>

                <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                    <div className="border-b border-slate-700 p-6"><h2 className="flex items-center gap-2 text-xl font-bold"><Calendar className="h-5 w-5 text-blue-400" />Tus campañas</h2></div>
                    {!items.length ? (
                        <div className="p-12 text-center"><FileText className="mx-auto mb-4 h-12 w-12 text-slate-600" /><h3 className="text-lg font-semibold">Aún no hay campañas asociadas</h3><p className="mt-2 text-slate-400">Usa el mismo correo con el que realizaste la compra o habla con nuestro equipo.</p><Link to="/advertise" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-semibold">Ver espacios publicitarios<ChevronRight className="h-4 w-4" /></Link></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[960px]">
                                <thead className="bg-slate-900/70 text-left text-sm text-slate-400"><tr><th className="p-4">Campaña</th><th className="p-4">Estado</th><th className="p-4">Objetivo</th><th className="p-4">Periodo</th><th className="p-4">Inversión</th><th className="p-4">KPIs</th><th className="p-4 text-right">Informe</th></tr></thead>
                                <tbody className="divide-y divide-slate-700">
                                    {items.map(({ campaign, metrics }) => (
                                        <tr key={campaign.id} className="hover:bg-slate-700/25">
                                            <td className="p-4"><div className="font-semibold">{campaign.advertiser_name || 'Campaña'}</div><div className="mt-1 max-w-xs truncate text-xs text-slate-500">{campaign.headline || campaign.campaign_type || 'Publicidad Geobooker'}</div></td>
                                            <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(campaign.status)}`}>{statusLabel(campaign.status)}</span></td>
                                            <td className="p-4 text-sm"><div>{campaign.target_countries?.length || (campaign.target_country ? 1 : 0)} país(es)</div><div className="text-xs text-slate-500">{campaign.target_cities?.length || (campaign.target_city ? 1 : 0)} ciudad(es)</div></td>
                                            <td className="p-4 text-sm"><div>{campaign.start_date || 'Por definir'}</div><div className="text-xs text-slate-500">a {campaign.end_date || 'En curso'}</div></td>
                                            <td className="p-4 text-sm font-semibold text-emerald-300">{formatCurrency(campaign)}</td>
                                            <td className="p-4 text-xs text-slate-300"><div>{formatNumber(metrics.totalImpressions)} impresiones</div><div>{formatNumber(metrics.totalClicks)} clics · {metrics.ctr}% CTR</div></td>
                                            <td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => setSelectedCampaign(campaign.id)} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500"><BarChart3 className="h-3 w-3" />Ver</button><CampaignReportButton campaignId={campaign.id} campaignName={campaign.advertiser_name} variant="icon" className="bg-slate-700 hover:bg-slate-600" /></div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                    <h3 className="text-lg font-bold">¿Necesitas ayuda con tu campaña?</h3><p className="mt-2 text-slate-400">Solicita optimización, apoyo creativo, facturación o una explicación de las métricas.</p><a href="mailto:hola@geobooker.com.mx" className="mt-3 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300">hola@geobooker.com.mx<ChevronRight className="h-4 w-4" /></a>
                </section>
            </main>

            {selectedCampaign && <CampaignReport campaignId={selectedCampaign} onClose={() => setSelectedCampaign(null)} />}
        </div>
    );
}
