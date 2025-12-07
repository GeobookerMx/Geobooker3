// src/pages/admin/SettingsPage.jsx
import React, { useState } from 'react';
import {
    Settings,
    Globe,
    Bell,
    Shield,
    Mail,
    Palette,
    Database,
    Save
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
    const [settings, setSettings] = useState({
        siteName: 'Geobooker',
        siteTagline: 'Encuentra negocios cerca de ti',
        defaultLanguage: 'es',
        defaultCurrency: 'MXN',
        enableNotifications: true,
        enableEmailAlerts: true,
        maintenanceMode: false,
        allowUserRegistration: true,
        requireEmailVerification: true,
        primaryColor: '#3B82F6',
        maxUploadSize: '5',
        sessionTimeout: '30'
    });

    const [saving, setSaving] = useState(false);

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Aquí iría la lógica para guardar en Supabase
            // Por ahora solo simulamos
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success('Configuración guardada correctamente');
            setSaving(false);
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Error al guardar la configuración');
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
                    <p className="text-gray-600 mt-1">Administra la configuración del sistema</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                    <Save className="w-5 h-5" />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            {/* Settings Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <SettingsSection
                    title="General"
                    icon={Settings}
                    description="Configuración básica del sitio"
                >
                    <InputField
                        label="Nombre del Sitio"
                        value={settings.siteName}
                        onChange={(e) => handleChange('siteName', e.target.value)}
                    />
                    <InputField
                        label="Descripción"
                        value={settings.siteTagline}
                        onChange={(e) => handleChange('siteTagline', e.target.value)}
                    />
                </SettingsSection>

                {/* Regional */}
                <SettingsSection
                    title="Regional"
                    icon={Globe}
                    description="Configuración de idioma y moneda"
                >
                    <SelectField
                        label="Idioma por Defecto"
                        value={settings.defaultLanguage}
                        onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                        options={[
                            { value: 'es', label: 'Español' },
                            { value: 'en', label: 'English' },
                        ]}
                    />
                    <SelectField
                        label="Moneda por Defecto"
                        value={settings.defaultCurrency}
                        onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                        options={[
                            { value: 'MXN', label: 'MXN - Peso Mexicano' },
                            { value: 'USD', label: 'USD - Dólar' },
                            { value: 'EUR', label: 'EUR - Euro' },
                        ]}
                    />
                </SettingsSection>

                {/* Notifications */}
                <SettingsSection
                    title="Notificaciones"
                    icon={Bell}
                    description="Configuración de alertas y notificaciones"
                >
                    <ToggleField
                        label="Habilitar Notificaciones"
                        checked={settings.enableNotifications}
                        onChange={(checked) => handleChange('enableNotifications', checked)}
                    />
                    <ToggleField
                        label="Alertas por Email"
                        checked={settings.enableEmailAlerts}
                        onChange={(checked) => handleChange('enableEmailAlerts', checked)}
                    />
                </SettingsSection>

                {/* Security */}
                <SettingsSection
                    title="Seguridad"
                    icon={Shield}
                    description="Configuración de seguridad y acceso"
                >
                    <ToggleField
                        label="Permitir Registro de Usuarios"
                        checked={settings.allowUserRegistration}
                        onChange={(checked) => handleChange('allowUserRegistration', checked)}
                    />
                    <ToggleField
                        label="Requerir Verificación de Email"
                        checked={settings.requireEmailVerification}
                        onChange={(checked) => handleChange('requireEmailVerification', checked)}
                    />
                    <InputField
                        label="Tiempo de Sesión (minutos)"
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => handleChange('sessionTimeout', e.target.value)}
                    />
                </SettingsSection>

                {/* Appearance */}
                <SettingsSection
                    title="Apariencia"
                    icon={Palette}
                    description="Personalización visual"
                >
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Color Principal
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={settings.primaryColor}
                                onChange={(e) => handleChange('primaryColor', e.target.value)}
                                className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                            />
                            <input
                                type="text"
                                value={settings.primaryColor}
                                onChange={(e) => handleChange('primaryColor', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </SettingsSection>

                {/* System */}
                <SettingsSection
                    title="Sistema"
                    icon={Database}
                    description="Configuración técnica"
                >
                    <ToggleField
                        label="Modo Mantenimiento"
                        checked={settings.maintenanceMode}
                        onChange={(checked) => handleChange('maintenanceMode', checked)}
                        description="Desactiva el acceso público al sitio"
                    />
                    <InputField
                        label="Tamaño Máximo de Archivo (MB)"
                        type="number"
                        value={settings.maxUploadSize}
                        onChange={(e) => handleChange('maxUploadSize', e.target.value)}
                    />
                </SettingsSection>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                <h3 className="text-lg font-bold text-red-900 mb-2">Zona de Peligro</h3>
                <p className="text-sm text-red-700 mb-4">
                    Acciones irreversibles que pueden afectar el sistema
                </p>
                <div className="flex gap-3">
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                        Limpiar Caché
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                        Reiniciar Base de Datos (Demo)
                    </button>
                </div>
            </div>
        </div>
    );
}

function SettingsSection({ title, icon: Icon, description, children }) {
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
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
}

function InputField({ label, type = 'text', value, onChange }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
        </div>
    );
}

function SelectField({ label, value, onChange, options }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>
            <select
                value={value}
                onChange={onChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
}

function ToggleField({ label, checked, onChange, description }) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="font-medium text-gray-900">{label}</p>
                {description && <p className="text-xs text-gray-600">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${checked ? 'translate-x-6' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    );
}
