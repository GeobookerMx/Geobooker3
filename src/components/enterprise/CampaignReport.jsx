import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BarChart3, Calendar, Download, Eye, FileText, Loader2,
    MousePointer, Percent, RefreshCw, ShieldCheck, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadReportAsPDF, getCampaignReportData } from '../../services/reportService';
import TerritoriesTab from './TerritoriesTab';
import AudienceTab from './AudienceTab';

function formatNumber(value) {
    return Number(value || 0).toLocaleString('es-MX');
}

function formatCurrency(campaign, value) {
    const currency = String(campaign?.currency || 'MXN').toUpperCase();
    try {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value) || 0);
    } catch {
        return `${Number(value || 0).toFixed(2)} ${currency}`;
    }
}

function statusLabel(status) {
    return ({
        active: 'Activa', completed: 'Finalizada', paused: 'Pausada',
        pending_review: 'En revisión', draft: 'Borrador', pending_payment: 'Pago pendiente'
    })[status] || status || 'Sin estado';
}

export default function CampaignReport({ campaignId, onClose }) {
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [report, setReport] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    const loadReport = useCallback(async () => {
        setLoading(true);
        try {
            setReport(await getCampaignReportData(campaignId));
        } catch (error) {
            console.error('Error loading advertiser report:', error);
            toast.error('No se pudo cargar el informe');
        } finally {
            setLoading(false);
        }
    }, [campaignId]);

    useEffect(() => {
        if (campaignId) loadReport();
    }, [campaignId, loadReport]);

    const dailyMetrics = useMemo(() => (report?.daily || []).map((day) => ({
        ...day,
        views_by_country: day.viewsByCountry,
        views_by_city: day.viewsByCity,
        views_by_device: day.viewsByDevice,
        views_by_hour: day.viewsByHour
    })), [report?.daily]);

    const handleDownload = async () => {
        if (!report || downloading) return;
        setDownloading(true);
        try {
            await downloadReportAsPDF(report);
            toast.success('Informe PDF descargado');
        } catch (error) {
            console.error('PDF download error:', error);
            toast.error('No se pudo descargar el PDF');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="rounded-xl bg-slate-900 p-8 text-center text-white">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-400" />
                    <p className="mt-4 text-slate-300">Generando informe verificado...</p>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                <div className="rounded-xl bg-slate-900 p-8 text-center text-white">
                    <p>No hay datos disponibles para esta campaña.</p>
                    <button onClick={onClose} className="mt-4 text-blue-400 hover:underline">Cerrar</button>
                </div>
            </div>
        );
    }

    const { campaign, metrics } = report;
    const maxImpressions = Math.max(...dailyMetrics.map((day) => Number(day.impressions || 0)), 1);
    const investment = campaign.total_budget ?? campaign.budget ?? 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
                <header className="sticky top-0 z-20 flex flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-blue-700 to-indigo-700 p-6">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-sm text-blue-100"><ShieldCheck className="h-4 w-4" />Informe con datos registrados por Geobooker</div>
                        <h2 className="text-2xl font-bold text-white">{campaign.advertiser_name || 'Campaña publicitaria'}</h2>
                        <p className="mt-1 text-sm text-blue-100">{campaign.start_date || 'Sin fecha'} a {campaign.end_date || 'En curso'}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleDownload} disabled={downloading} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60">
                            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            Descargar PDF
                        </button>
                        <button onClick={onClose} aria-label="Cerrar informe" className="rounded-lg p-2 text-white hover:bg-white/15"><X className="h-5 w-5" /></button>
                    </div>
                </header>

                <nav className="flex overflow-x-auto border-b border-slate-700 bg-slate-800 px-5">
                    {[
                        ['overview', 'Resumen'], ['territories', 'Territorios'], ['audience', 'Audiencia']
                    ].map(([key, label]) => (
                        <button key={key} onClick={() => setActiveTab(key)} className={`border-b-2 px-5 py-4 text-sm font-semibold ${activeTab === key ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400 hover:text-white'}`}>{label}</button>
                    ))}
                </nav>

                <main className="p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                {[
                                    [Eye, 'Impresiones', formatNumber(metrics.totalImpressions), 'text-blue-400'],
                                    [MousePointer, 'Clics', formatNumber(metrics.totalClicks), 'text-emerald-400'],
                                    [Percent, 'CTR', `${metrics.ctr || 0}%`, 'text-violet-400'],
                                    [Calendar, 'Días con actividad', formatNumber(metrics.activeDays), 'text-amber-400']
                                ].map(([icon, label, value, color]) => (
                                    <div key={label} className="rounded-xl bg-slate-900 p-5">
                                        {React.createElement(icon, { className: `mb-3 h-5 w-5 ${color}` })}
                                        <div className="text-2xl font-bold text-white">{value}</div>
                                        <div className="mt-1 text-sm text-slate-400">{label}</div>
                                    </div>
                                ))}
                            </div>

                            <section className="rounded-xl border border-slate-700 bg-slate-900 p-6">
                                <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white"><BarChart3 className="h-5 w-5 text-blue-400" />Rendimiento diario</h3>
                                {dailyMetrics.length ? (
                                    <div className="space-y-3">
                                        {dailyMetrics.slice(-14).map((day) => (
                                            <div key={day.date} className="grid grid-cols-[74px_1fr_72px] items-center gap-3 text-xs">
                                                <span className="text-slate-400">{new Date(`${day.date}T00:00:00Z`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</span>
                                                <div className="h-6 overflow-hidden rounded-full bg-slate-800"><div className="flex h-full items-center justify-end rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 pr-2 text-white" style={{ width: `${Math.max((day.impressions / maxImpressions) * 100, 4)}%` }}>{formatNumber(day.impressions)}</div></div>
                                                <span className="text-right text-slate-400">{formatNumber(day.clicks)} clics</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="py-8 text-center text-slate-500">Las métricas aparecerán cuando la campaña comience a entregar anuncios.</p>}
                            </section>

                            <section className="rounded-xl border border-slate-700 bg-slate-900 p-6">
                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white"><FileText className="h-5 w-5 text-blue-400" />Datos contratados</h3>
                                <div className="grid gap-x-8 md:grid-cols-2">
                                    {[
                                        ['Estado', statusLabel(campaign.status)],
                                        ['Plan', campaign.ad_level || campaign.campaign_type || 'N/A'],
                                        ['Inversión contratada', formatCurrency(campaign, investment)],
                                        ['Promesa de impresiones', campaign.promised_impressions ? formatNumber(campaign.promised_impressions) : 'No especificada'],
                                        ['Inicio', campaign.start_date || 'Por definir'],
                                        ['Fin', campaign.end_date || 'En curso'],
                                        ['Promedio por día activo', formatNumber(metrics.avgDailyImpressions)],
                                        ['Contrato', campaign.contract_number || 'No asignado']
                                    ].map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-slate-700 py-3"><span className="text-slate-400">{label}</span><span className="text-right font-medium text-white">{value}</span></div>)}
                                </div>
                            </section>

                            <section className="rounded-xl border border-blue-500/25 bg-blue-950/30 p-5 text-sm leading-6 text-blue-100">
                                <div className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5" />Cómo leer este informe</div>
                                <p>{report.methodology}</p>
                                <p className="mt-2 text-blue-200/80">No mostramos conversiones estimadas como si fueran resultados reales. Las ventas y acciones fuera de Geobooker sólo se incorporarán cuando exista medición verificable.</p>
                            </section>

                            <div className="flex justify-end">
                                <button onClick={loadReport} className="flex items-center gap-2 text-sm text-blue-300 hover:text-blue-200"><RefreshCw className="h-4 w-4" />Actualizar datos</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'territories' && <TerritoriesTab dailyMetrics={dailyMetrics} targetRegions={campaign.target_regions} targetCountries={campaign.target_countries} />}
                    {activeTab === 'audience' && <AudienceTab dailyMetrics={dailyMetrics} />}
                </main>

                <footer className="border-t border-slate-700 px-6 py-4 text-center text-xs text-slate-500">
                    Generado {new Date(report.generatedAt).toLocaleString('es-MX')} · Registros en {report.timezone || 'UTC'} · Geobooker Ads
                </footer>
            </div>
        </div>
    );
}
