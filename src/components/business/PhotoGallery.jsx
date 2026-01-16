// Galería de Fotos con Lightbox
// src/components/business/PhotoGallery.jsx

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, CheckCircle, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const PhotoGallery = ({ businessId, isOwner = false }) => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadPhotos();
    }, [businessId]);

    const loadPhotos = async () => {
        try {
            const { data, error } = await supabase
                .from('business_photos')
                .select('*')
                .eq('business_id', businessId)
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPhotos(data || []);
        } catch (error) {
            console.error('Error loading photos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // Validar max 5 fotos
        if (files.length > 5) {
            toast.error('Máximo 5 fotos a la vez');
            return;
        }

        setUploading(true);

        try {
            const uploadPromises = files.map(async (file) => {
                // Validar tipo
                if (!file.type.startsWith('image/')) {
                    throw new Error('Solo imágenes permitidas');
                }

                // Validar tamaño (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    throw new Error('Imagen muy grande (max 5MB)');
                }

                // Subir a Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${businessId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `business-photos/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('business-assets')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // Obtener URL pública
                const { data: { publicUrl } } = supabase.storage
                    .from('business-assets')
                    .getPublicUrl(filePath);

                // Guardar en DB
                const { error: dbError } = await supabase
                    .from('business_photos')
                    .insert({
                        business_id: businessId,
                        uploaded_by: (await supabase.auth.getUser()).data.user.id,
                        photo_url: publicUrl,
                        photo_type: 'other'
                    });

                if (dbError) throw dbError;
            });

            await Promise.all(uploadPromises);

            toast.success(`${files.length} foto(s) subida(s)`);
            loadPhotos();

        } catch (error) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Error al subir fotos');
        } finally {
            setUploading(false);
        }
    };

    const openLightbox = (index) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };

    const closeLightbox = () => {
        setLightboxOpen(false);
    };

    const nextPhoto = () => {
        setCurrentIndex((prev) => (prev + 1) % photos.length);
    };

    const prevPhoto = () => {
        setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!lightboxOpen) return;

            if (e.key === 'Escape') closeLightbox();
            else if (e.key === 'ArrowRight') nextPhoto();
            else if (e.key === 'ArrowLeft') prevPhoto();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxOpen, photos.length]);

    if (loading) {
        return <div className="text-center py-8">Cargando fotos...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Galería de Fotos ({photos.length})
                </h3>
                {isOwner && (
                    <label className="px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Subiendo...' : 'Subir Fotos'}
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                )}
            </div>

            {/* Grid de fotos */}
            {photos.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">
                        {isOwner ? 'Sube las primeras fotos de tu negocio' : 'Sin fotos aún'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {photos.map((photo, index) => (
                        <div
                            key={photo.id}
                            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => openLightbox(index)}
                        >
                            <img
                                src={photo.photo_url}
                                alt={photo.caption || `Foto ${index + 1}`}
                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                            {photo.is_verified && (
                                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                                    <CheckCircle className="w-4 h-4" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity" />
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {lightboxOpen && photos.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
                    {/* Close button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-lg z-10"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {/* Previous button */}
                    {photos.length > 1 && (
                        <button
                            onClick={prevPhoto}
                            className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-lg"
                        >
                            <ChevronLeft className="w-8 h-8" />
                        </button>
                    )}

                    {/* Image */}
                    <div className="max-w-5xl max-h-[90vh] p-4">
                        <img
                            src={photos[currentIndex].photo_url}
                            alt={photos[currentIndex].caption || `Foto ${currentIndex + 1}`}
                            className="max-w-full max-h-full object-contain"
                        />

                        {/* Caption */}
                        {photos[currentIndex].caption && (
                            <p className="text-white text-center mt-4">
                                {photos[currentIndex].caption}
                            </p>
                        )}

                        {/* Counter */}
                        <p className="text-white text-center mt-2 text-sm">
                            {currentIndex + 1} / {photos.length}
                        </p>
                    </div>

                    {/* Next button */}
                    {photos.length > 1 && (
                        <button
                            onClick={nextPhoto}
                            className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-lg"
                        >
                            <ChevronRight className="w-8 h-8" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PhotoGallery;
