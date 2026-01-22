// src/pages/admin/ScanInvitePage.jsx
/**
 * Scan & Invite - Herramienta de captura de leads
 * Solo para administradores
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useJsApiLoader } from '@react-google-maps/api';
import {
    Search, MapPin, Phone, Mail, Globe, ExternalLink,
    Play, Pause, CheckCircle, XCircle, MessageCircle,
    Filter, RefreshCw, Ban, Clock, Users, Building2, Loader2, Trash2, AlertCircle
} from 'lucide-react';
import WhatsAppService from '../../services/whatsappService';

// Libraries needed for Places API
const libraries = ['places'];

const ScanInvitePage = () => {
    // Load Google Maps API
    const { isLoaded: googleMapsLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: libraries,
    });

    // Estados
    const [scanning, setScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, paused, done
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, today: 0 });
    const [userLocation, setUserLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dailyLimit, setDailyLimit] = useState(WhatsAppService.config.dailyLimit);
    const [dailyCount, setDailyCount] = useState(0);
    const [sessionLeadIds, setSessionLeadIds] = useState(new Set()); // Leads añadidos en esta sesión
    const [hiddenLeadIds, setHiddenLeadIds] = useState(new Set()); // Leads ocultados tras contactar

    // ✅ NUEVO: Estado para agregar teléfonos manualmente
    const [manualPhoneInputs, setManualPhoneInputs] = useState({}); // { leadId: phoneValue }

    // Predefined Cities & High-Density Colonias
    const predefinedCities = [
        // Current Location
        { id: 'auto', name: '📍 Mi ubicación actual', lat: null, lng: null, group: 'actual' },

        // CDMX - Colonias de Alta Densidad
        { id: 'cdmx_centro', name: 'CDMX - Centro Histórico', lat: 19.4326, lng: -99.1332, group: 'cdmx' },
        { id: 'cdmx_roma', name: 'CDMX - Roma Norte (Alta densidad)', lat: 19.4195, lng: -99.1617, group: 'cdmx' },
        { id: 'cdmx_condesa', name: 'CDMX - Condesa (Alta densidad)', lat: 19.4111, lng: -99.1747, group: 'cdmx' },
        { id: 'cdmx_polanco', name: 'CDMX - Polanco', lat: 19.4335, lng: -99.1917, group: 'cdmx' },
        { id: 'cdmx_del_valle', name: 'CDMX - Del Valle (Alta densidad)', lat: 19.3908, lng: -99.1614, group: 'cdmx' },
        { id: 'cdmx_narvarte', name: 'CDMX - Narvarte (Alta densidad)', lat: 19.3989, lng: -99.1499, group: 'cdmx' },
        { id: 'cdmx_coyoacan', name: 'CDMX - Coyoacán Centro', lat: 19.3467, lng: -99.1617, group: 'cdmx' },
        { id: 'cdmx_santa_fe', name: 'CDMX - Santa Fe', lat: 19.3590, lng: -99.2594, group: 'cdmx' },
        { id: 'cdmx_doctores', name: 'CDMX - Doctores (Alta densidad)', lat: 19.4167, lng: -99.1417, group: 'cdmx' },
        { id: 'cdmx_napoles', name: 'CDMX - Nápoles (Alta densidad)', lat: 19.3944, lng: -99.1778, group: 'cdmx' },
        { id: 'cdmx_insurgentes', name: 'CDMX - Insurgentes Sur', lat: 19.3800, lng: -99.1789, group: 'cdmx' },

        // Otras Ciudades Grandes
        { id: 'guadalajara', name: 'Guadalajara - Centro', lat: 20.6597, lng: -103.3496, group: 'grandes' },
        { id: 'guadalajara_chapu', name: 'Guadalajara - Chapalita', lat: 20.6700, lng: -103.4025, group: 'grandes' },
        { id: 'monterrey', name: 'Monterrey - Centro', lat: 25.6866, lng: -100.3161, group: 'grandes' },
        { id: 'monterrey_sanpedro', name: 'Monterrey - San Pedro', lat: 25.6580, lng: -100.4029, group: 'grandes' },
        { id: 'puebla', name: 'Puebla - Centro', lat: 19.0414, lng: -98.2063, group: 'grandes' },
        { id: 'queretaro', name: 'Querétaro - Centro', lat: 20.5888, lng: -100.3899, group: 'grandes' },

        // Ciudades Turísticas
        { id: 'cancun', name: 'Cancún - Zona Hotelera', lat: 21.1619, lng: -86.8515, group: 'turisticas' },
        { id: 'playa_carmen', name: 'Playa del Carmen - Quinta Av', lat: 20.6296, lng: -87.0739, group: 'turisticas' },
        { id: 'merida', name: 'Mérida - Centro', lat: 20.9674, lng: -89.5926, group: 'turisticas' },
        { id: 'vallarta', name: 'Puerto Vallarta - Centro', lat: 20.6534, lng: -105.2253, group: 'turisticas' },
        { id: 'los_cabos', name: 'Los Cabos - San José', lat: 23.0548, lng: -109.6975, group: 'turisticas' },

        // Norte de México
        { id: 'tijuana', name: 'Tijuana - Centro', lat: 32.5149, lng: -117.0382, group: 'norte' },
        { id: 'chihuahua', name: 'Chihuahua - Centro', lat: 28.6353, lng: -106.0889, group: 'norte' },
        { id: 'hermosillo', name: 'Hermosillo - Centro', lat: 29.0729, lng: -110.9559, group: 'norte' },

        // Bajío
        { id: 'leon', name: 'León - Centro', lat: 21.1221, lng: -101.6860, group: 'bajio' },
        { id: 'aguascalientes', name: 'Aguascalientes - Centro', lat: 21.8853, lng: -102.2916, group: 'bajio' },
        { id: 'san_luis', name: 'San Luis Potosí - Centro', lat: 22.1565, lng: -100.9855, group: 'bajio' },
        { id: 'morelia', name: 'Morelia - Centro', lat: 19.7059, lng: -101.1949, group: 'bajio' },

        // Manual
        { id: 'custom', name: '✏️ Ingresar coordenadas manualmente', lat: null, lng: null, group: 'manual' },
    ];

    const [selectedCity, setSelectedCity] = useState('auto');
    const [manualLat, setManualLat] = useState('');
    const [manualLng, setManualLng] = useState('');
    const [scanRadius, setScanRadius] = useState(3); // km


    // Business Categories (expanded list)
    const allCategories = [
        { id: 'restaurant', label: '🍽️ Restaurantes', checked: true },
        { id: 'store', label: '🏪 Tiendas', checked: true },
        { id: 'cafe', label: '☕ Cafeterías', checked: true },
        { id: 'pharmacy', label: '💊 Farmacias', checked: true },
        { id: 'hair_care', label: '💇 Salones de Belleza', checked: true },
        { id: 'car_repair', label: '🔧 Talleres Mecánicos', checked: true },
        { id: 'gym', label: '🏋️ Gimnasios', checked: false },
        { id: 'dentist', label: '🦷 Dentistas', checked: false },
        { id: 'doctor', label: '🏥 Clínicas/Doctores', checked: false },
        { id: 'veterinary_care', label: '🐾 Veterinarias', checked: false },
        { id: 'hotel', label: '🏨 Hoteles', checked: false },
        { id: 'bar', label: '🍺 Bares', checked: false },
        { id: 'bakery', label: '🥐 Panaderías', checked: false },
        { id: 'laundry', label: '🧺 Lavanderías', checked: false },
        { id: 'real_estate_agency', label: '🏠 Inmobiliarias', checked: false },
        { id: 'insurance_agency', label: '📋 Aseguradoras', checked: false },
    ];
    const [selectedCategories, setSelectedCategories] = useState(
        allCategories.filter(c => c.checked).map(c => c.id)
    );

    // Filtros
    const [filters, setFilters] = useState({
        contactType: 'all', // all, phone, email
        status: 'all', // all, new, contacted, etc. - Changed to 'all' to show all leads by default
        category: 'all'
    });



    // Mensaje de WhatsApp precargado
    const whatsappMessage = `Hola 👋 Soy del equipo de *Geobooker*. Estamos sumando negocios para que la gente los encuentre cerca de ellos en minutos (WhatsApp, llamadas y rutas).

📍 Conoce nuestra plataforma: geobooker.com.mx
#cercadeti

¿Te puedo mandar info rápida? Si prefieres que no te contacte, dime NO y listo.`;

    // Cargar datos iniciales
    useEffect(() => {
        loadLeads();
        loadStats();
        getUserLocation();
    }, []);

    // Obtener ubicación del usuario
    const getUserLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Error obteniendo ubicación:', error);
                    toast.error('No se pudo obtener tu ubicación');
                }
            );
        }
    };

    // Cargar leads de la base de datos
    const loadLeads = async () => {
        try {
            console.log('📥 loadLeads() called...');
            const { data, error } = await supabase
                .from('scan_leads')
                .select(`
          *,
          scan_lead_contacts (*)
        `)
                .order('captured_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('❌ loadLeads error:', error);
                throw error;
            }

            console.log('✅ loadLeads result:', data?.length || 0, 'leads');
            console.log('📋 Sample lead:', data?.[0]);
            setLeads(data || []);
        } catch (error) {
            console.error('Error cargando leads:', error);
        } finally {
            setLoading(false);
        }
    };


    // Cargar estadísticas
    const loadStats = async () => {
        try {
            // Total leads
            const { count: total } = await supabase
                .from('scan_leads')
                .select('*', { count: 'exact', head: true });

            // Nuevos (sin contactar)
            const { count: newCount } = await supabase
                .from('scan_leads')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'new');

            // Contactados
            const { count: contacted } = await supabase
                .from('scan_leads')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'contacted');

            // Invitaciones hoy - SOLO de scan_invite (nacionales)
            // Usando hora de México (UTC-6) para sincronizar contadores
            const getTodayMexico = () => {
                const now = new Date();
                const mexicoOffset = -6 * 60;
                const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
                const mexicoTime = new Date(utcTime + (mexicoOffset * 60000));
                return mexicoTime.toISOString().split('T')[0];
            };
            const today = getTodayMexico();
            const { count: todayCount } = await supabase
                .from('unified_whatsapp_outreach')
                .select('*', { count: 'exact', head: true })
                .gte('sent_at', today)
                .eq('source', 'scan_invite');  // Solo nacionales

            setStats({
                total: total || 0,
                new: newCount || 0,
                contacted: contacted || 0,
                today: todayCount || 0
            });
            setDailyCount(todayCount || 0);
            // Usar límite específico para scan_invite (nacionales)
            setDailyLimit(WhatsAppService.config.limits?.scan_invite || 10);
        } catch (error) {
            console.error('Error cargando stats:', error);
        }
    };

    // Iniciar escaneo REAL con Google Places API
    const startScan = async () => {
        // Determine location to use based on city selection
        let scanLocation = null;
        const cityConfig = predefinedCities.find(c => c.id === selectedCity);

        if (selectedCity === 'auto') {
            scanLocation = userLocation;
        } else if (selectedCity === 'custom') {
            const lat = parseFloat(manualLat);
            const lng = parseFloat(manualLng);
            if (isNaN(lat) || isNaN(lng)) {
                toast.error('Coordenadas manuales inválidas. Usa formato: 19.4326, -99.1332');
                return;
            }
            scanLocation = { lat, lng };
        } else if (cityConfig) {
            scanLocation = { lat: cityConfig.lat, lng: cityConfig.lng };
        }

        const cityName = cityConfig?.name || 'Ubicación actual';
        console.log('🔍 startScan called');
        console.log('🔍 scanLocation:', scanLocation);
        console.log('🔍 selectedCity:', selectedCity, cityName);
        console.log('🔍 selectedCategories:', selectedCategories);
        console.log('🔍 scanRadius:', scanRadius);

        if (!scanLocation) {
            console.log('❌ No location');
            toast.error('Primero necesito tu ubicación o ingresa coordenadas manuales');
            getUserLocation();
            return;
        }

        if (!googleMapsLoaded || !window.google?.maps) {
            console.log('❌ Google Maps no está listo');
            toast.error('Google Maps está cargando... espera un momento');
            return;
        }

        if (selectedCategories.length === 0) {
            toast.error('Selecciona al menos una categoría de negocio');
            return;
        }

        console.log('✅ Iniciando escaneo...');
        setScanning(true);
        setScanStatus('scanning');
        toast.success(`Escaneo iniciado: ${selectedCategories.length} categorías, ${scanRadius}km de radio`);

        try {
            const user = (await supabase.auth.getUser()).data.user;
            console.log('👤 User:', user?.id);

            // Crear registro de scan
            const { data: scanRun, error: scanError } = await supabase
                .from('scan_runs')
                .insert({
                    user_id: user.id,
                    latitude: scanLocation.lat,
                    longitude: scanLocation.lng,
                    radius_km: scanRadius,
                    status: 'running',
                    filters: { categories: selectedCategories, manual: selectedCity === 'custom' }
                })
                .select()
                .single();

            if (scanError) throw scanError;

            // Crear servicio de Places
            const service = new window.google.maps.places.PlacesService(
                document.createElement('div')
            );

            // Buscar negocios cercanos (usando categorías seleccionadas)
            const types = selectedCategories;
            let allPlaces = [];
            let scannedCount = 0;
            let newCount = 0;
            let duplicateCount = 0;

            for (const type of types) {

                try {
                    const places = await new Promise((resolve, reject) => {
                        service.nearbySearch({
                            location: new window.google.maps.LatLng(scanLocation.lat, scanLocation.lng),
                            radius: scanRadius * 1000, // Convert km to meters
                            type: type,
                            language: 'es'
                        }, (results, status) => {
                            if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                                resolve(results || []);
                            } else {
                                resolve([]); // No error, just empty
                            }
                        });
                    });


                    // Procesar cada negocio
                    for (const place of places.slice(0, 5)) { // Limitar a 5 por tipo
                        scannedCount++;

                        // Verificar si ya existe
                        const { data: existing } = await supabase
                            .from('scan_leads')
                            .select('id')
                            .eq('place_id', place.place_id)
                            .maybeSingle();

                        if (existing) {
                            duplicateCount++;
                            continue;
                        }

                        // 🔍 Obtener detalles (incluye teléfono, website, URL)
                        let phone = null;
                        let website = null;
                        let googleMapsUrl = null;
                        let detailsStatus = 'success'; // Track API status

                        try {
                            const details = await new Promise((resolve, reject) => {
                                service.getDetails({
                                    placeId: place.place_id,
                                    fields: ['formatted_phone_number', 'international_phone_number', 'website', 'url']
                                }, (result, status) => {
                                    if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                                        resolve({ result, status: 'OK' });
                                    } else {
                                        // ✅ MEJORADO: Log específico del error
                                        console.warn(`⚠️ Google Places getDetails failed for "${place.name}":`, {
                                            status,
                                            placeId: place.place_id,
                                            reason: status === 'OVER_QUERY_LIMIT' ? 'Cuota agotada' :
                                                status === 'REQUEST_DENIED' ? 'API key sin permisos' :
                                                    status === 'INVALID_REQUEST' ? 'Request inválido' :
                                                        'Error desconocido'
                                        });

                                        // Mostrar toast UNA VEZ por sesión
                                        if (status === 'OVER_QUERY_LIMIT' && !sessionStorage.getItem('places-quota-warning')) {
                                            sessionStorage.setItem('places-quota-warning', 'true');
                                            toast.error('⚠️ Cuota de Google Places agotada. Algunos teléfonos no estarán disponibles.', {
                                                duration: 6000,
                                                icon: '📱'
                                            });
                                        }

                                        resolve({ result: null, status });
                                    }
                                });
                            });

                            if (details.result) {
                                phone = details.result.international_phone_number || details.result.formatted_phone_number;
                                website = details.result.website;
                                googleMapsUrl = details.result.url;
                                detailsStatus = 'success';
                            } else {
                                // ✅ FALLBACK: Aunque no tengamos detalles, construimos el link de Google Maps
                                detailsStatus = details.status || 'failed';
                                googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
                                console.log(`📍 Lead sin teléfono: ${place.name} - Link: ${googleMapsUrl}`);
                            }
                        } catch (e) {
                            console.error('❌ Error obteniendo detalles de:', place.name, e);
                            detailsStatus = 'error';
                            // Construir link de emergencia
                            googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`;
                        }

                        // Calcular distancia
                        const distance = calculateDistance(
                            userLocation.lat, userLocation.lng,
                            place.geometry.location.lat(), place.geometry.location.lng()
                        );

                        // ✅ GUARDAR LEAD (SIEMPRE, incluso sin teléfono)
                        const { data: newLead, error: leadError } = await supabase
                            .from('scan_leads')
                            .insert({
                                scan_run_id: scanRun.id,
                                place_id: place.place_id,
                                name: place.name,
                                category: place.types?.[0] || type,
                                address: place.vicinity,
                                latitude: place.geometry.location.lat(),
                                longitude: place.geometry.location.lng(),
                                distance_km: distance.toFixed(2),
                                website: website,
                                google_maps_url: googleMapsUrl,
                                status: 'new',
                                // ✅ NUEVO: Agregar notas si falta teléfono
                                notes: !phone ? `⚠️ Teléfono no disponible (Google Places: ${detailsStatus}). Agregar manualmente desde Google Maps.` : null
                            })
                            .select()
                            .single();

                        if (leadError) {
                            console.error('Error guardando lead:', leadError);
                            continue;
                        }

                        // ✅ Guardar contacto si hay teléfono
                        if (phone && newLead) {
                            await supabase.from('scan_lead_contacts').insert({
                                lead_id: newLead.id,
                                type: 'phone',
                                value: phone,
                                normalized_value: normalizePhone(phone),
                                source: 'google_places'
                            });
                        }

                        newCount++;
                        allPlaces.push(place);
                    }
                } catch (e) {
                    console.error('Error buscando tipo:', type, e);
                }
            }

            // Actualizar scan_run
            await supabase
                .from('scan_runs')
                .update({
                    status: 'completed',
                    total_found: scannedCount,
                    total_new: newCount,
                    total_duplicates: duplicateCount,
                    completed_at: new Date().toISOString()
                })
                .eq('id', scanRun.id);

            setScanStatus('done');
            setScanning(false);
            toast.success(`✅ Escaneo completado: ${newCount} nuevos leads, ${duplicateCount} duplicados`);
            loadLeads();
            loadStats();

        } catch (error) {
            console.error('Error en scan:', error);
            toast.error('Error al escanear: ' + error.message);
            setScanning(false);
            setScanStatus('idle');
        }
    };

    // Normalizar teléfono mexicano
    const normalizePhone = (phone) => {
        const clean = phone.replace(/\D/g, '');
        if (clean.length === 10) return '+52' + clean;
        if (clean.length === 12 && clean.startsWith('52')) return '+' + clean;
        return phone;
    };

    // Calcular distancia en km
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Pausar escaneo
    const pauseScan = () => {
        setScanning(false);
        setScanStatus('paused');
        toast('Escaneo pausado', { icon: '⏸️' });
    };

    // Enviar invitación por WhatsApp (usando sistema unificado)
    const sendWhatsAppInvite = async (lead, contact) => {
        try {
            const result = await WhatsAppService.sendMessage({
                phone: contact.value,
                name: lead.name,
                company: lead.name,
                language: 'es'
            }, 'scan_invite');

            if (result.success) {
                // Actualizar estado del lead en tabla scan_leads
                await supabase
                    .from('scan_leads')
                    .update({ status: 'contacted', updated_at: new Date().toISOString() })
                    .eq('id', lead.id);

                // Ocultar lead de la lista visual
                setHiddenLeadIds(prev => new Set([...prev, lead.id]));

                // Recargar stats
                loadStats();
                loadLeads();
            }
        } catch (error) {
            console.error('Error al enviar WhatsApp:', error);
        }
    };

    // Opción A: Ocultar solo los contactados/blacklisted (deja visibles los nuevos)
    const hideContactedLeads = () => {
        const contactedIds = leads
            .filter(l => l.status === 'contacted' || l.status === 'blacklisted')
            .map(l => l.id);
        setHiddenLeadIds(new Set([...hiddenLeadIds, ...contactedIds]));
        toast.success(`${contactedIds.length} leads contactados/blacklisted ocultados. Solo quedan los nuevos.`);
    };

    // Opción B: Eliminar de la DB los contactados (⚠️ IRREVERSIBLE)
    const deleteContactedLeads = async () => {
        const contactedLeads = leads.filter(l => l.status === 'contacted' || l.status === 'blacklisted');
        const count = contactedLeads.length;

        if (count === 0) {
            toast.error('No hay leads contactados para eliminar');
            return;
        }

        const confirmed = window.confirm(
            `⚠️ ATENCIÓN: Vas a ELIMINAR PERMANENTEMENTE ${count} leads de la base de datos.\n\n` +
            `Esto incluye leads con status 'contacted' o 'blacklisted'.\n\n` +
            `Esta acción NO se puede deshacer. ¿Estás seguro?`
        );

        if (!confirmed) return;

        try {
            const idsToDelete = contactedLeads.map(l => l.id);

            const { error } = await supabase
                .from('scan_leads')
                .delete()
                .in('id', idsToDelete);

            if (error) throw error;

            toast.success(`✅ ${count} leads eliminados permanentemente`);
            loadLeads();
            loadStats();
        } catch (error) {
            console.error('Error eliminando leads:', error);
            toast.error('Error al eliminar: ' + error.message);
        }
    };

    // Limpiar lista visual completa (oculta todos los visibles)
    const clearVisibleList = () => {
        const allVisibleIds = filteredLeads.map(l => l.id);
        setHiddenLeadIds(new Set(allVisibleIds));
        toast.success('Lista visual limpiada. Los leads siguen en la base de datos.');
    };

    // Resetear vista (mostrar todos los leads de nuevo)
    const resetHiddenLeads = () => {
        setHiddenLeadIds(new Set());
        toast('Vista restaurada', { icon: '🔄' });
    };


    // ✅ NUEVO: Agregar teléfono manualmente a un lead
    const addPhoneManually = async (leadId, phoneValue) => {
        if (!phoneValue || phoneValue.trim() === '') {
            toast.error('Ingresa un teléfono válido');
            return;
        }

        try {
            const normalized = normalizePhone(phoneValue.trim());

            // Guardar en scan_lead_contacts
            const { error } = await supabase.from('scan_lead_contacts').insert({
                lead_id: leadId,
                type: 'phone',
                value: phoneValue.trim(),
                normalized_value: normalized,
                source: 'manual_input'
            });

            if (error) throw error;

            toast.success('✅ Teléfono agregado');

            // Limpiar input
            setManualPhoneInputs(prev => {
                const newInputs = { ...prev };
                delete newInputs[leadId];
                return newInputs;
            });

            // Recargar leads
            loadLeads();
        } catch (error) {
            console.error('Error agregando teléfono:', error);
            toast.error('Error: ' + error.message);
        }
    };

    // Agregar a blacklist
    const addToBlacklist = async (lead) => {
        try {
            const phoneContact = lead.scan_lead_contacts?.find(c => c.type === 'phone');

            await supabase.from('scan_blacklist').insert({
                place_id: lead.place_id,
                phone: phoneContact?.value,
                reason: 'No contactar - marcado manualmente',
                added_by: (await supabase.auth.getUser()).data.user.id
            });

            await supabase
                .from('scan_leads')
                .update({ status: 'blacklisted' })
                .eq('id', lead.id);

            toast.success('Agregado a lista de no contactar');
            loadLeads();
        } catch (error) {
            console.error('Error en blacklist:', error);
            toast.error('Error al agregar a blacklist');
        }
    };

    // Filtrar leads (con exclusión de ocultos)
    const filteredLeads = leads.filter(lead => {
        // Excluir leads ocultos manualmente
        if (hiddenLeadIds.has(lead.id)) return false;
        if (filters.status !== 'all' && lead.status !== filters.status) return false;
        if (filters.contactType === 'phone') {
            return lead.scan_lead_contacts?.some(c => c.type === 'phone');
        }
        if (filters.contactType === 'email') {
            return lead.scan_lead_contacts?.some(c => c.type === 'email');
        }
        return true;
    });

    // DEBUG: Log filter results
    console.log('🔍 Filter debug:', {
        totalLeads: leads.length,
        hiddenCount: hiddenLeadIds.size,
        filterStatus: filters.status,
        filteredCount: filteredLeads.length,
        sampleStatus: leads[0]?.status
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Search className="w-8 h-8 text-blue-600" />
                        Scan & Invite
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Captura leads de negocios cercanos y envía invitaciones por WhatsApp
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-sm text-gray-500">Total Leads</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.new}</p>
                                <p className="text-sm text-gray-500">Nuevos</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <MessageCircle className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.contacted}</p>
                                <p className="text-sm text-gray-500">Contactados</p>
                            </div>
                        </div>
                    </div>
                    <div className={`bg-white rounded-xl p-4 shadow-sm border ${dailyCount >= dailyLimit ? 'ring-2 ring-red-500' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${dailyCount >= dailyLimit ? 'bg-red-100' : 'bg-orange-100'}`}>
                                <Clock className={`w-5 h-5 ${dailyCount >= dailyLimit ? 'text-red-600' : 'text-orange-600'}`} />
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${dailyCount >= dailyLimit ? 'text-red-600' : ''}`}>{dailyCount}/{dailyLimit}</p>
                                <p className="text-sm text-gray-500">WhatsApp Local</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alert Banner when limit reached */}
                {dailyCount >= dailyLimit && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-6 h-6 text-red-500" />
                            <div>
                                <p className="font-bold text-red-800">¡Límite diario alcanzado!</p>
                                <p className="text-red-700 text-sm">
                                    Has enviado {dailyCount} de {dailyLimit} WhatsApp locales hoy.
                                    El contador se reinicia a medianoche.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Control Panel */}
                <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
                    {/* Location Section */}
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-red-500" />
                            Ubicación de Escaneo
                        </h3>
                        <div className="flex flex-wrap items-center gap-4">
                            {/* City Selector */}
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="border rounded px-3 py-2 text-sm min-w-[280px]"
                            >
                                <optgroup label="📍 Actual">
                                    <option value="auto">Mi ubicación actual</option>
                                </optgroup>
                                <optgroup label="🏙️ CDMX - Colonias Alta Densidad">
                                    {predefinedCities.filter(c => c.group === 'cdmx').map(city => (
                                        <option key={city.id} value={city.id}>{city.name.replace('CDMX - ', '')}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="🏛️ Ciudades Grandes">
                                    {predefinedCities.filter(c => c.group === 'grandes').map(city => (
                                        <option key={city.id} value={city.id}>{city.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="🏖️ Turísticas">
                                    {predefinedCities.filter(c => c.group === 'turisticas').map(city => (
                                        <option key={city.id} value={city.id}>{city.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="🌵 Norte de México">
                                    {predefinedCities.filter(c => c.group === 'norte').map(city => (
                                        <option key={city.id} value={city.id}>{city.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="🌾 Bajío">
                                    {predefinedCities.filter(c => c.group === 'bajio').map(city => (
                                        <option key={city.id} value={city.id}>{city.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="✏️ Manual">
                                    <option value="custom">Ingresar coordenadas</option>
                                </optgroup>
                            </select>

                            {/* Manual Coordinates (only if custom selected) */}
                            {selectedCity === 'custom' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Latitud (ej: 19.4326)"
                                        value={manualLat}
                                        onChange={(e) => setManualLat(e.target.value)}
                                        className="border rounded px-3 py-1 text-sm w-36"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Longitud (ej: -99.1332)"
                                        value={manualLng}
                                        onChange={(e) => setManualLng(e.target.value)}
                                        className="border rounded px-3 py-1 text-sm w-36"
                                    />
                                </div>
                            )}

                            {/* Show current location if auto */}
                            {selectedCity === 'auto' && (
                                <span className="text-sm text-gray-600">
                                    {userLocation
                                        ? `📍 ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                                        : 'Obteniendo ubicación...'
                                    }
                                </span>
                            )}

                            {/* Radius Selector */}
                            <select
                                value={scanRadius}
                                onChange={(e) => setScanRadius(parseInt(e.target.value))}
                                className="border rounded px-3 py-2 text-sm"
                            >
                                <option value={1}>1 km</option>
                                <option value={2}>2 km</option>
                                <option value={3}>3 km</option>
                                <option value={5}>5 km</option>
                                <option value={10}>10 km</option>
                            </select>
                        </div>
                    </div>


                    {/* Categories Section */}
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-800 mb-3">📂 Categorías de Negocio</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {allCategories.map((cat) => (
                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm p-2 rounded hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(cat.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedCategories([...selectedCategories, cat.id]);
                                            } else {
                                                setSelectedCategories(selectedCategories.filter(c => c !== cat.id));
                                            }
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <span>{cat.label}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {selectedCategories.length} categorías seleccionadas
                        </p>
                    </div>

                    {/* Scan Button */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <button
                            onClick={scanning ? pauseScan : startScan}
                            disabled={selectedCity === 'auto' && !userLocation}

                            className={`
                flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all
                ${scanning
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
                        >
                            {scanning ? (
                                <>
                                    <Pause className="w-6 h-6" />
                                    Pausar Escaneo
                                </>
                            ) : (
                                <>
                                    <Play className="w-6 h-6" />
                                    ESCANEAR ({scanRadius} km)
                                </>
                            )}
                        </button>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                            <span className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${scanStatus === 'idle' ? 'bg-gray-100 text-gray-600' : ''}
                ${scanStatus === 'scanning' ? 'bg-blue-100 text-blue-600 animate-pulse' : ''}
                ${scanStatus === 'paused' ? 'bg-orange-100 text-orange-600' : ''}
                ${scanStatus === 'done' ? 'bg-green-100 text-green-600' : ''}
              `}>
                                {scanStatus === 'idle' && '⚪ Listo'}
                                {scanStatus === 'scanning' && '🔵 Escaneando...'}
                                {scanStatus === 'paused' && '🟠 Pausado'}
                                {scanStatus === 'done' && '🟢 Completado'}
                            </span>
                        </div>
                    </div>
                </div>


                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Filtros:</span>
                        </div>

                        <select
                            value={filters.contactType}
                            onChange={(e) => setFilters({ ...filters, contactType: e.target.value })}
                            className="px-3 py-1.5 border rounded-lg text-sm"
                        >
                            <option value="all">Todos los contactos</option>
                            <option value="phone">Solo teléfonos</option>
                            <option value="email">Solo emails</option>
                        </select>

                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="px-3 py-1.5 border rounded-lg text-sm"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="new">🆕 Nuevos</option>
                            <option value="contacted">📞 Contactados</option>
                            <option value="replied">✅ Respondieron</option>
                            <option value="not_interested">❌ No interesados</option>
                            <option value="converted">🎉 Convertidos</option>
                        </select>

                        <button
                            onClick={() => { loadLeads(); loadStats(); }}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualizar
                        </button>

                        <button
                            onClick={clearVisibleList}
                            className="flex items-center gap-1 text-orange-600 hover:text-orange-800 text-sm"
                            title="Ocultar todos los visibles (no borra de DB)"
                        >
                            <Trash2 className="w-4 h-4" />
                            Ocultar Todo
                        </button>

                        <button
                            onClick={hideContactedLeads}
                            className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm"
                            title="Ocultar solo contactados/blacklisted (quedan nuevos)"
                        >
                            👁️ Ocultar Contactados
                        </button>


                        {hiddenLeadIds.size > 0 && (
                            <button
                                onClick={resetHiddenLeads}
                                className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm"
                            >
                                🔄 Mostrar {hiddenLeadIds.size} ocultos
                            </button>
                        )}
                    </div>
                </div>


                {/* Leads Table */}
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    {/* Scrollbar at top - uses CSS rotate trick */}
                    <div className="overflow-x-auto" style={{ transform: 'rotateX(180deg)' }}>
                        <table className="w-full min-w-[900px]" style={{ transform: 'rotateX(180deg)' }}>
                            <thead className="bg-gray-50 border-b">

                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Negocio</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contacto</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Distancia</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                            Cargando leads...
                                        </td>
                                    </tr>
                                ) : filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                            No hay leads aún. ¡Inicia un escaneo!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map((lead) => {
                                        const phoneContact = lead.scan_lead_contacts?.find(c => c.type === 'phone');
                                        const emailContact = lead.scan_lead_contacts?.find(c => c.type === 'email');

                                        return (
                                            <tr key={lead.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{lead.name}</p>
                                                        <p className="text-sm text-gray-500 truncate max-w-xs">{lead.address}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-600">{lead.category || '-'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        {phoneContact ? (
                                                            <span className="flex items-center gap-1 text-sm">
                                                                <Phone className="w-3 h-3 text-green-600" /> {phoneContact.value}
                                                                {phoneContact.source === 'manual_input' && (
                                                                    <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded" title="Agregado manualmente">✏️</span>
                                                                )}
                                                            </span>
                                                        ) : (
                                                            /* ✅ NUEVO: Input inline para agregar teléfono manualmente */
                                                            <div className="flex items-center gap-1">
                                                                <Phone className="w-3 h-3 text-orange-400" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Agregar teléfono..."
                                                                    value={manualPhoneInputs[lead.id] || ''}
                                                                    onChange={(e) => setManualPhoneInputs(prev => ({
                                                                        ...prev,
                                                                        [lead.id]: e.target.value
                                                                    }))}
                                                                    onKeyPress={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            addPhoneManually(lead.id, manualPhoneInputs[lead.id]);
                                                                        }
                                                                    }}
                                                                    className="text-xs border border-orange-200 rounded px-2 py-1 w-32 focus:ring-1 focus:ring-orange-400 focus:border-orange-400"
                                                                />
                                                                <button
                                                                    onClick={() => addPhoneManually(lead.id, manualPhoneInputs[lead.id])}
                                                                    className="text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded"
                                                                    title="Guardar teléfono"
                                                                >
                                                                    ✓
                                                                </button>
                                                            </div>
                                                        )}
                                                        {emailContact && (
                                                            <span className="flex items-center gap-1 text-sm text-gray-500">
                                                                <Mail className="w-3 h-3" /> {emailContact.value}
                                                            </span>
                                                        )}
                                                        {!phoneContact && lead.notes && (
                                                            <span className="text-xs text-orange-600 flex items-center gap-1" title={lead.notes}>
                                                                ⚠️ Sin teléfono
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-600">
                                                        {lead.distance_km ? `${lead.distance_km} km` : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`
                            px-2 py-1 rounded-full text-xs font-medium
                            ${lead.status === 'new' ? 'bg-blue-100 text-blue-700' : ''}
                            ${lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${lead.status === 'replied' ? 'bg-green-100 text-green-700' : ''}
                            ${lead.status === 'converted' ? 'bg-purple-100 text-purple-700' : ''}
                            ${lead.status === 'blacklisted' ? 'bg-red-100 text-red-700' : ''}
                          `}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {phoneContact && lead.status !== 'blacklisted' && (
                                                            <button
                                                                onClick={() => sendWhatsAppInvite(lead, phoneContact)}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
                                                                title="Invitar por WhatsApp"
                                                            >
                                                                <MessageCircle className="w-4 h-4" />
                                                                WA
                                                            </button>
                                                        )}
                                                        {!phoneContact && lead.google_maps_url && (
                                                            /* ✅ Botón destacado para abrir Google Maps y copiar teléfono */
                                                            <a
                                                                href={lead.google_maps_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded text-xs font-medium transition"
                                                                title="Abrir en Maps para copiar teléfono"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                                Ver Maps
                                                            </a>
                                                        )}
                                                        {phoneContact && lead.google_maps_url && (
                                                            <a
                                                                href={lead.google_maps_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 text-gray-500 hover:text-blue-600 transition"
                                                                title="Ver en Google Maps"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => addToBlacklist(lead)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 transition"
                                                            title="No contactar"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📋 Notas importantes:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• El escaneo usa Google Places API (requiere API Key configurada)</li>
                        <li>• Límite diario: {dailyLimit} invitaciones por WhatsApp</li>
                        <li>• Los mensajes se envían manualmente - tú presionas "Enviar" en WhatsApp</li>
                        <li>• Usa "No contactar" para agregar a la lista negra</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ScanInvitePage;
