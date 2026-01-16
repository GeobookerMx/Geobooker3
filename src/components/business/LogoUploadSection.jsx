// Componente de Upload de Logo con Extracción desde Email
// src/components/business/LogoUploadSection.jsx

import React, { useState } from 'react';
import { Upload, Mail, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const LogoUploadSection = ({ businessId, currentLogo, onLogoUpdated }) => {
    const [uploading, setUploading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [preview, setPreview] = useState(currentLogo);
    const [markerStyle, setMarkerStyle] = useState('pin');

    /**
     * Extraer logo desde email usando múltiples servicios
     */
    const extractLogoFromEmail = async (email) => {
        setExtracting(true);

        try {
            // 1. Intentar Clearbit Logo API
            const domain = email.split('@')[1];
            const clearbitUrl = `https://logo.clearbit.com/${domain}`;

            // Test if Clearbit works
            const clearbitTest = await fetch(clearbitUrl);
            if (clearbitTest.ok) {
                await updateBusinessLogo(clearbitUrl, 'clearbit');
                return clearbitUrl;
            }

            // 2. Intentar Google Favicon
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
            const faviconTest = await fetch(faviconUrl);
            if (faviconTest.ok) {
                await updateBusinessLogo(faviconUrl, 'google_favicon');
                return faviconUrl;
            }

            // 3. Generar logo con inicial
            const initial = domain.charAt(0).toUpperCase();
            const generatedUrl = await generateInitialLogo(initial);
            await updateBusinessLogo(generatedUrl, 'generated');
            return generatedUrl;

        } catch (error) {
            console.error('Error extracting logo:', error);
            toast.error('No se pudo extraer logo del email');
            return null;
        } finally {
            setExtracting(false);
        }
    };

    /**
     * Generar logo placeholder con inicial
     */
    const generateInitialLogo = async (initial) => {
        // Crear SVG con inicial
        const svg = `
            <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="200" height="200" fill="#4F46E5"/>
                <text x="50%" y="50%" font-size="100" fill="white" 
                      text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">
                    ${initial}
                </text>
            </svg>
        `;

        const blob = new Blob([svg], { type: 'image/svg+xml' });
        return URL.createObjectURL(blob);
    };

    /**
     * Subir logo desde archivo
     */
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            toast.error('Solo se permiten imágenes');
            return;
        }

        // Validar tamaño (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('El archivo es muy grande (max 2MB)');
            return;
        }

        setUploading(true);

        try {
            // Subir a Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${businessId}-${Date.now()}.${fileExt}`;
            const filePath = `business-logos/${fileName}`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('business-assets')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('business-assets')
                .getPublicUrl(filePath);

            await updateBusinessLogo(publicUrl, 'upload');

        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Error al subir logo');
        } finally {
            setUploading(false);
        }
    };

    /**
     * Actualizar logo en base de datos
     */
    const updateBusinessLogo = async (logoUrl, source) => {
        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    logo_url: logoUrl,
                    logo_source: source,
                    has_custom_logo: source === 'upload',
                    logo_uploaded_at: new Date().toISOString()
                })
                .eq('id', businessId);

            if (error) throw error;

            setPreview(logoUrl);
            toast.success('Logo actualizado exitosamente');
            onLogoUpdated && onLogoUpdated(logoUrl);

            // Recalcular trust score (+5 pts por logo)
            await supabase.rpc('calculate_trust_score', { p_business_id: businessId });

        } catch (error) {
            console.error('Update error:', error);
            toast.error('Error al actualizar logo');
        }
    };

    /**
     * Actualizar estilo de marker
     */
    const updateMarkerStyle = async (style) => {
        try {
            const { error } = await supabase
                .from('businesses')
                .update({ marker_style: style })
                .eq('id', businessId);

            if (error) throw error;

            setMarkerStyle(style);
            toast.success('Estilo de marcador actualizado');

        } catch (error) {
            console.error('Marker style error:', error);
            toast.error('Error al actualizar estilo');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold mb-2">Logo de tu Negocio</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Un logo profesional mejora tu Trust Score en +5 puntos
                </p>
            </div>

            {/* Preview del logo actual */}
            <div className="flex justify-center">
                <div className="w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                    {preview ? (
                        <img src={preview} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                    )}
                </div>
            </div>

            {/* Opciones de subida */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Opción 1: Subir archivo */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors">
                    <label className="cursor-pointer block text-center">
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml"
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploading}
                        />
                        <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="font-medium text-gray-900">Subir Archivo</p>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG, SVG (max 2MB)</p>
                        {uploading && (
                            <div className="mt-2 flex items-center justify-center gap-2 text-blue-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Subiendo...</span>
                            </div>
                        )}
                    </label>
                </div>

                {/* Opción 2: Extraer desde email */}
                <div
                    className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-green-400 transition-colors cursor-pointer"
                    onClick={async () => {
                        const email = prompt('Ingresa el email corporativo:');
                        if (email && email.includes('@')) {
                            const logo = await extractLogoFromEmail(email);
                            if (logo) setPreview(logo);
                        }
                    }}
                >
                    <Mail className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-gray-900">Usar Logo del Email</p>
                    <p className="text-xs text-gray-500 mt-1">Extrae automáticamente</p>
                    {extracting && (
                        <div className="mt-2 flex items-center justify-center gap-2 text-green-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Extrayendo...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Configuración de Marker en Mapa */}
            <div className="border-t pt-6">
                <h4 className="font-semibold mb-3">Cómo mostrar en el mapa</h4>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            name="marker"
                            value="pin"
                            checked={markerStyle === 'pin'}
                            onChange={() => updateMarkerStyle('pin')}
                        />
                        <div>
                            <p className="font-medium">📍 Pin Estándar</p>
                            <p className="text-sm text-gray-600">Color por categoría</p>
                        </div>
                    </label>

                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${!preview ? 'opacity-50' : ''}`}>
                        <input
                            type="radio"
                            name="marker"
                            value="logo_pin"
                            checked={markerStyle === 'logo_pin'}
                            onChange={() => updateMarkerStyle('logo_pin')}
                            disabled={!preview}
                        />
                        <div>
                            <p className="font-medium">🎨 Pin con Logo</p>
                            <p className="text-sm text-gray-600">
                                Tu logo en el mapa {!preview && '(requiere logo)'}
                            </p>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 opacity-50">
                        <input
                            type="radio"
                            name="marker"
                            value="logo_circle"
                            disabled
                        />
                        <div>
                            <p className="font-medium">⭕ Logo Circular Premium</p>
                            <p className="text-sm text-gray-600">Exclusivo para Premium ✨</p>
                        </div>
                    </label>
                </div>
            </div>

            {/* Info */}
            {preview && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                    <Check className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800">
                        Logo configurado • +5 puntos Trust Score • Badge "Marca Personalizada" 🎨
                    </p>
                </div>
            )}
        </div>
    );
};

export default LogoUploadSection;
