// src/components/business/ClaimBusinessForm.jsx
// Modal para que un usuario reclame un negocio existente en Geobooker
// Compatible con negocios nativos, importados del DENUE o de Overture

import React, { useState } from 'react';
import { X, Shield, Upload, Send, AlertCircle, Building2, User, Mail, Phone, Globe, Instagram } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ROLES = [
    { value: 'owner', label: 'Propietario(a)' },
    { value: 'manager', label: 'Encargado(a) / Gerente' },
    { value: 'representative', label: 'Representante Legal' },
];

const ClaimBusinessForm = ({ isOpen, onClose, business, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1 = info, 2 = evidencia, 3 = confirmación
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [evidencePreview, setEvidencePreview] = useState(null);

    const [formData, setFormData] = useState({
        claimer_name: user?.user_metadata?.full_name || '',
        claimer_role: 'owner',
        email: user?.email || '',
        phone: '',
        website: '',
        social_media: '',
        evidence_description: '',
    });

    if (!isOpen || !business) return null;

    const isSeeded = business.source_type && business.source_type !== 'native';
    const sourceName = business.source_type === 'seed_denue' ? 'INEGI DENUE'
        : business.source_type === 'seed_overture' ? 'Overture Places'
        : business.source_type === 'bulk_import' ? 'importación masiva'
        : null;

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleEvidenceChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error('La imagen debe ser menor a 10MB');
                return;
            }
            setEvidenceFile(file);
            setEvidencePreview(URL.createObjectURL(file));
        }
    };

    const uploadEvidence = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `claims/${user.id}/${business.id}_${Date.now()}.${fileExt}`;

        const { error } = await supabase.storage
            .from('business-images')
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('business-images')
            .getPublicUrl(fileName);

        return publicUrl;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user?.id) {
            toast.error('Debes iniciar sesión para reclamar un negocio');
            return;
        }

        if (!formData.claimer_name || !formData.email) {
            toast.error('Completa los campos requeridos');
            return;
        }

        setLoading(true);

        try {
            let evidenceUrl = null;

            if (evidenceFile) {
                evidenceUrl = await uploadEvidence(evidenceFile);
            }

            const { error } = await supabase
                .from('business_claims')
                .insert({
                    business_id: business.id,
                    user_id: user.id,
                    claimer_name: formData.claimer_name.trim(),
                    claimer_role: formData.claimer_role,
                    email: formData.email.trim(),
                    phone: formData.phone.trim() || null,
                    website: formData.website.trim() || null,
                    social_media: formData.social_media.trim() || null,
                    evidence_description: formData.evidence_description.trim() || null,
                    evidence_photo_url: evidenceUrl,
                    status: 'submitted',
                });

            if (error) {
                if (error.code === '23505') {
                    toast.error('Ya tienes una solicitud activa para este negocio');
                } else {
                    throw error;
                }
                return;
            }

            toast.success('¡Solicitud enviada! Nuestro equipo la revisará pronto.');
            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error submitting claim:', err);
            toast.error('Error al enviar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Shield className="w-6 h-6" />
                                Reclamar Negocio
                            </h2>
                            <p className="text-amber-100 text-sm mt-1">
                                Verifica que eres dueño(a) de <strong>{business.name}</strong>
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Paso actual */}
                    <div className="flex gap-2 mt-4">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`flex-1 h-1.5 rounded-full transition-all ${
                                    s <= step ? 'bg-white' : 'bg-white/30'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Info del negocio + fuente */}
                <div className="mx-6 mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 truncate">{business.name}</h3>
                            <p className="text-sm text-gray-500 truncate">{business.address || business.category}</p>
                            {isSeeded && sourceName && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Listado desde: {sourceName}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* === PASO 1: Información personal === */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-800 mb-1">Tu información</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Necesitamos verificar tu identidad como responsable del negocio.
                            </p>

                            {/* Nombre */}
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                                    <User className="w-4 h-4" /> Nombre completo *
                                </label>
                                <input
                                    type="text"
                                    value={formData.claimer_name}
                                    onChange={(e) => handleChange('claimer_name', e.target.value)}
                                    placeholder="Tu nombre completo"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    required
                                />
                            </div>

                            {/* Rol */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Tu relación con el negocio *
                                </label>
                                <div className="grid grid-cols-1 gap-2">
                                    {ROLES.map((role) => (
                                        <button
                                            key={role.value}
                                            type="button"
                                            onClick={() => handleChange('claimer_role', role.value)}
                                            className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${
                                                formData.claimer_role === role.value
                                                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-semibold'
                                                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                            }`}
                                        >
                                            {role.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                                    <Mail className="w-4 h-4" /> Correo electrónico *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    placeholder="tu@negocio.com"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                    required
                                />
                            </div>

                            {/* Teléfono */}
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                                    <Phone className="w-4 h-4" /> Teléfono / WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="+52 55 1234 5678"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                disabled={!formData.claimer_name || !formData.email}
                                className="w-full py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Siguiente →
                            </button>
                        </div>
                    )}

                    {/* === PASO 2: Evidencia === */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-800 mb-1">Evidencia de propiedad</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Esto nos ayuda a verificar tu relación con el negocio más rápido.
                                Puedes aportar cualquiera de estos elementos (todos son opcionales).
                            </p>

                            {/* Website */}
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                                    <Globe className="w-4 h-4" /> Sitio web del negocio
                                </label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => handleChange('website', e.target.value)}
                                    placeholder="https://www.minegocio.com"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            {/* Red social */}
                            <div>
                                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                                    <Instagram className="w-4 h-4" /> Red social oficial
                                </label>
                                <input
                                    type="url"
                                    value={formData.social_media}
                                    onChange={(e) => handleChange('social_media', e.target.value)}
                                    placeholder="https://instagram.com/minegocio"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                                />
                            </div>

                            {/* Foto de evidencia */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Foto de evidencia
                                </label>
                                <p className="text-xs text-gray-400 mb-2">
                                    Foto dentro del local, fachada, constancia fiscal, identificación, recibo de luz, etc.
                                </p>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition border border-dashed border-gray-300">
                                        <Upload className="w-5 h-5 text-gray-600" />
                                        <span className="text-sm text-gray-700">Subir imagen</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleEvidenceChange}
                                            className="hidden"
                                        />
                                    </label>
                                    {evidencePreview && (
                                        <img
                                            src={evidencePreview}
                                            alt="Evidencia"
                                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Descripción adicional */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Información adicional
                                </label>
                                <textarea
                                    value={formData.evidence_description}
                                    onChange={(e) => handleChange('evidence_description', e.target.value)}
                                    placeholder="Cualquier dato adicional que nos ayude a verificar que eres responsable de este negocio..."
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                                >
                                    ← Atrás
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="flex-1 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition"
                                >
                                    Revisar →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* === PASO 3: Confirmación === */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-800 mb-1">Confirma tu solicitud</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Revisa que la información sea correcta antes de enviar.
                            </p>

                            <div className="bg-gray-50 rounded-xl p-4 space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Nombre</span>
                                    <span className="font-medium text-gray-800">{formData.claimer_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Relación</span>
                                    <span className="font-medium text-gray-800">
                                        {ROLES.find(r => r.value === formData.claimer_role)?.label}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Email</span>
                                    <span className="font-medium text-gray-800">{formData.email}</span>
                                </div>
                                {formData.phone && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Teléfono</span>
                                        <span className="font-medium text-gray-800">{formData.phone}</span>
                                    </div>
                                )}
                                {formData.website && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Website</span>
                                        <span className="font-medium text-blue-600 truncate ml-4">{formData.website}</span>
                                    </div>
                                )}
                                {evidencePreview && (
                                    <div className="pt-2 border-t border-gray-200">
                                        <span className="text-gray-500 block mb-2">Evidencia adjunta:</span>
                                        <img src={evidencePreview} alt="Evidencia" className="w-full max-w-[200px] rounded-lg" />
                                    </div>
                                )}
                            </div>

                            {/* Aviso legal */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
                                <strong>⚠️ Importante:</strong> Al enviar esta solicitud, confirmas que eres
                                propietario(a) o representante autorizado(a) de <strong>{business.name}</strong>.
                                Nuestro equipo revisará la información y te contactará para completar la verificación.
                                {isSeeded && (
                                    <span className="block mt-2">
                                        Este negocio fue listado originalmente desde <strong>{sourceName}</strong>.
                                        Al aprobarse tu reclamo, podrás editar y enriquecer la información del perfil.
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
                                >
                                    ← Atrás
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-xl hover:from-amber-700 hover:to-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Enviar Solicitud
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default ClaimBusinessForm;
