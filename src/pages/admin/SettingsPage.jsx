import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Settings,
    Save,
    RefreshCw,
    Crown,
    Megaphone,
    Globe,
    Mail,
    AlertTriangle,
    CheckCircle2,
    Target,
    ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { PROMOTIONS, getPremiumPromoDeadlineLabel, isPremiumPromoActive } from '../../config/promotions';
import { PREMIUM_PRICING } from '../../config/premiumPricing';
import { ENTERPRISE_PROMO_DISCOUNT_PERCENT, ENTERPRISE_PROMO_END } from '../../config/enterprisePricing';
import { LOCAL_AD_PROMO } from '../../config/adPricing';

const defaultAdminSettings = {
    allowUserRegistration: true,
    requireEmailVerification: true,
    enableNotifications: true,
    enableEmailAlerts: true,
    maintenanceMode: false,
    daily_email_limit: 100,
    daily_whatsapp_limit: 50,
};

export default function SettingsPage() {
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState(defaultAdminSettings);
    const [crmSenders, setCrmSenders] = useState([]);
    const [premiumPlan, setPremiumPlan] = useState(null);
    const [adSpaces, setAdSpaces] = useState([]);
    const [enterprisePlans, setEnterprisePlans] = useState([]);

    useEffect(() => {
        loadAdminControlData();
    }, []);

    const loadAdminControlData = async () => {
        setLoading(true);
        try {
            const [
                crmSettingsResult,
                premiumResult,
                adSpacesResult,
                enterpriseResult
            ] = await Promise.all([
                supabase
                    .from('crm_settings')
                    .select('setting_key, setting_value')
                    .in('setting_key', ['campaign_limits', 'email_senders', 'system_flags']),
                supabase
                    .from('subscription_plans')
                    .select('code, name, price_mxn, stripe_product_id, stripe_price_id_mxn')
                    .eq('code', 'premium_monthly')
                    .maybeSingle(),
                supabase
                    .from('ad_spaces')
                    .select('id, name, display_name, type, price_monthly, promo_price_monthly, promo_label, promo_end_date, is_active, max_slots')
                    .order('price_monthly', { ascending: true }),
                supabase
                    .from('enterprise_pricing')
                    .select('code, name, regular_price_usd, promo_price_usd, discount_percent, promo_active, promo_ends_at, countries_included, cities_included, duration_months, is_active')
                    .eq('is_active', true)
                    .order('regular_price_usd', { ascending: true })
            ]);

            if (crmSettingsResult.error) throw crmSettingsResult.error;
            if (premiumResult.error) throw premiumResult.error;
            if (adSpacesResult.error) throw adSpacesResult.error;
            if (enterpriseResult.error) throw enterpriseResult.error;

            const crmRows = crmSettingsResult.data || [];
            const campaignLimits = crmRows.find((row) => row.setting_key === 'campaign_limits')?.setting_value || {};
            const systemFlags = crmRows.find((row) => row.setting_key === 'system_flags')?.setting_value || {};
            const senders = crmRows.find((row) => row.setting_key === 'email_senders')?.setting_value || [];

            setSettings({
                ...defaultAdminSettings,
                ...systemFlags,
                daily_email_limit: campaignLimits.daily_email_limit ?? defaultAdminSettings.daily_email_limit,
                daily_whatsapp_limit: campaignLimits.daily_whatsapp_limit ?? defaultAdminSettings.daily_whatsapp_limit,
            });
            setCrmSenders(Array.isArray(senders) ? senders : []);
            setPremiumPlan(premiumResult.data || null);
            setAdSpaces(adSpacesResult.data || []);
            setEnterprisePlans(enterpriseResult.data || []);
        } catch (error) {
            console.error('Error loading admin settings:', error);
            toast.error('No se pudo cargar el centro de control administrativo');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        const toastId = toast.loading('Guardando configuración operativa...');
        try {
            const systemFlags = {
                allowUserRegistration: settings.allowUserRegistration,
                requireEmailVerification: settings.requireEmailVerification,
                enableNotifications: settings.enableNotifications,
                enableEmailAlerts: settings.enableEmailAlerts,
                maintenanceMode: settings.maintenanceMode,
            };

            const campaignLimits = {
                daily_email_limit: Number(settings.daily_email_limit) || defaultAdminSettings.daily_email_limit,
                daily_whatsapp_limit: Number(settings.daily_whatsapp_limit) || defaultAdminSettings.daily_whatsapp_limit,
            };

            const { error } = await supabase
                .from('crm_settings')
                .upsert([
                    { setting_key: 'system_flags', setting_value: systemFlags },
                    { setting_key: 'campaign_limits', setting_value: campaignLimits },
                ], { onConflict: 'setting_key' });

            if (error) throw error;

            toast.success('Configuración guardada correctamente', { id: toastId });
            await loadAdminControlData();
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Error al guardar la configuración', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const monetizationHealth = useMemo(() => {
        const issues = [];

        if (!premiumPlan?.price_mxn || Number(premiumPlan.price_mxn) !== PREMIUM_PRICING.monthlyPriceMxn) {
            issues.push(`Premium base esperado: ${PREMIUM_PRICING.monthlyPriceMxn} MXN`);
        }

        enterprisePlans.forEach((plan) => {
            if (Number(plan.discount_percent || 0) !== ENTERPRISE_PROMO_DISCOUNT_PERCENT) {
                issues.push(`Enterprise ${plan.code} no está en ${ENTERPRISE_PROMO_DISCOUNT_PERCENT}% OFF`);
            }
        });

        return issues;
    }, [enterprisePlans, premiumPlan]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Control Admin</h1>
                    <p className="text-gray-600 mt-1">Visión operativa de CRM, monetización, campañas y promos activas</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadAdminControlData}
                        className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <SummaryCard
                    icon={Crown}
                    title="Premium Launch"
                    value={isPremiumPromoActive() ? 'Activo' : 'Inactivo'}
                    subtitle={`Gratis hasta ${getPremiumPromoDeadlineLabel('es-MX')}`}
                    tone={isPremiumPromoActive() ? 'green' : 'gray'}
                />
                <SummaryCard
                    icon={Megaphone}
                    title="Ads Launch"
                    value={LOCAL_AD_PROMO.isActive() ? `${LOCAL_AD_PROMO.discountPercent}% OFF` : 'Sin promo'}
                    subtitle={`Fin: ${LOCAL_AD_PROMO.endDate.toLocaleDateString('es-MX')}`}
                    tone={LOCAL_AD_PROMO.isActive() ? 'blue' : 'gray'}
                />
                <SummaryCard
                    icon={Globe}
                    title="Enterprise"
                    value={`${ENTERPRISE_PROMO_DISCOUNT_PERCENT}% OFF`}
                    subtitle={`Hasta ${new Date(ENTERPRISE_PROMO_END).toLocaleDateString('es-MX')}`}
                    tone="amber"
                />
                <SummaryCard
                    icon={Mail}
                    title="CRM Límites"
                    value={`${settings.daily_email_limit}/${settings.daily_whatsapp_limit}`}
                    subtitle="Email / WhatsApp diario"
                    tone="purple"
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <ControlSection title="Promos y Planes" icon={Target} description="Estado actual de Premium, Ads y Enterprise">
                    <div className="space-y-4">
                        <InfoRow label="Premium base" value={premiumPlan ? `${premiumPlan.price_mxn} MXN` : 'No encontrado'} />
                        <InfoRow label="Premium Stripe product" value={premiumPlan?.stripe_product_id || 'Pendiente'} mono />
                        <InfoRow label="Premium free until" value={PROMOTIONS.PREMIUM_FREE_UNTIL} mono />
                        <InfoRow label="Enterprise tiers activos" value={String(enterprisePlans.length)} />
                        <InfoRow label="Ads espacios activos" value={String(adSpaces.filter((space) => space.is_active).length)} />
                    </div>
                </ControlSection>

                <ControlSection title="Control CRM" icon={Settings} description="Parámetros operativos usados por marketing y CRM">
                    <div className="space-y-4">
                        <ToggleField
                            label="Permitir registro de usuarios"
                            checked={settings.allowUserRegistration}
                            onChange={(checked) => handleChange('allowUserRegistration', checked)}
                        />
                        <ToggleField
                            label="Requerir verificación email"
                            checked={settings.requireEmailVerification}
                            onChange={(checked) => handleChange('requireEmailVerification', checked)}
                        />
                        <ToggleField
                            label="Modo mantenimiento"
                            checked={settings.maintenanceMode}
                            onChange={(checked) => handleChange('maintenanceMode', checked)}
                        />
                        <InputField
                            label="Límite diario email"
                            type="number"
                            value={settings.daily_email_limit}
                            onChange={(e) => handleChange('daily_email_limit', e.target.value)}
                        />
                        <InputField
                            label="Límite diario WhatsApp"
                            type="number"
                            value={settings.daily_whatsapp_limit}
                            onChange={(e) => handleChange('daily_whatsapp_limit', e.target.value)}
                        />
                        <InfoRow label="Remitentes CRM" value={String(crmSenders.length)} />
                    </div>
                </ControlSection>

                <ControlSection title="Alertas" icon={AlertTriangle} description="Inconsistencias que conviene corregir desde admin o SQL">
                    {monetizationHealth.length === 0 ? (
                        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-800 flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 mt-0.5" />
                            <div>
                                <p className="font-semibold">Sin alertas críticas</p>
                                <p className="text-sm">La configuración principal de monetización luce consistente con la estrategia vigente.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {monetizationHealth.map((issue) => (
                                <div key={issue} className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900 text-sm">
                                    {issue}
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="mt-4 flex flex-col gap-2">
                        <QuickLink to="/admin/ads" label="Revisar campañas y espacios Ads" />
                        <QuickLink to="/admin/unified-crm" label="Revisar CRM y colas" />
                    </div>
                </ControlSection>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ControlSection title="Precios Ads" icon={Megaphone} description="Referencia de espacios publicitarios activos">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b">
                                    <th className="py-2 pr-4">Espacio</th>
                                    <th className="py-2 pr-4">Tipo</th>
                                    <th className="py-2 pr-4">Base</th>
                                    <th className="py-2 pr-4">Promo</th>
                                    <th className="py-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adSpaces.map((space) => (
                                    <tr key={space.id} className="border-b last:border-b-0">
                                        <td className="py-2 pr-4 font-medium text-gray-900">{space.display_name || space.name}</td>
                                        <td className="py-2 pr-4 text-gray-600">{space.type}</td>
                                        <td className="py-2 pr-4 text-gray-800">${Number(space.price_monthly || 0).toLocaleString('es-MX')}</td>
                                        <td className="py-2 pr-4 text-gray-800">
                                            {space.promo_price_monthly ? `$${Number(space.promo_price_monthly).toLocaleString('es-MX')}` : 'Sin promo'}
                                        </td>
                                        <td className="py-2">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${space.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {space.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ControlSection>

                <ControlSection title="Precios Enterprise" icon={Globe} description="Tiers y descuentos vigentes en administración">
                    <div className="space-y-3">
                        {enterprisePlans.map((plan) => (
                            <div key={plan.code} className="rounded-xl border border-gray-200 p-4">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                                        <p className="text-sm text-gray-600">
                                            {plan.cities_included} ciudades • {plan.countries_included} países • {plan.duration_months} meses
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500 line-through">${Number(plan.regular_price_usd || 0).toLocaleString('en-US')} USD</p>
                                        <p className="text-lg font-bold text-gray-900">${Number(plan.promo_price_usd || 0).toLocaleString('en-US')} USD</p>
                                        <p className="text-xs font-semibold text-emerald-700">{plan.discount_percent || 0}% OFF</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ControlSection>
            </div>
        </div>
    );
}

function SummaryCard({ icon: Icon, title, value, subtitle, tone = 'gray' }) {
    const tones = {
        green: 'bg-green-50 border-green-200 text-green-900',
        blue: 'bg-blue-50 border-blue-200 text-blue-900',
        amber: 'bg-amber-50 border-amber-200 text-amber-900',
        purple: 'bg-purple-50 border-purple-200 text-purple-900',
        gray: 'bg-gray-50 border-gray-200 text-gray-900',
    };

    return (
        <div className={`rounded-xl border p-5 ${tones[tone] || tones.gray}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium opacity-80">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    <p className="text-xs mt-1 opacity-80">{subtitle}</p>
                </div>
                <Icon className="w-8 h-8 opacity-80" />
            </div>
        </div>
    );
}

function ControlSection({ title, icon: Icon, description, children }) {
    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{title}</h3>
                    <p className="text-xs text-gray-600">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

function InputField({ label, type = 'text', value, onChange }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
    );
}

function ToggleField({ label, checked, onChange }) {
    return (
        <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium text-gray-700">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </label>
    );
}

function InfoRow({ label, value, mono = false }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3">
            <span className="text-sm text-gray-600">{label}</span>
            <span className={`text-sm font-semibold text-gray-900 ${mono ? 'font-mono break-all text-right' : ''}`}>{value}</span>
        </div>
    );
}

function QuickLink({ to, label }) {
    return (
        <Link
            to={to}
            className="inline-flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
            {label}
            <ArrowRight className="w-4 h-4" />
        </Link>
    );
}
