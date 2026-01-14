// src/pages/admin/ApifyScraper.jsx
/**
 * Global Lead Scraper using Apify
 * - Search businesses worldwide
 * - Import to CRM
 * - Send WhatsApp/Email directly
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
    Search, Globe, MapPin, Phone, Mail, ExternalLink, Download,
    Loader2, Building2, Star, MessageCircle, Send, CheckCircle,
    Users, Filter, RefreshCw, AlertCircle, Clock, Timer, FolderOpen
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const ApifyScraper = () => {
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [location, setLocation] = useState('');
    const [maxResults, setMaxResults] = useState(50);

    // Results state
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Selection state
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [importing, setImporting] = useState(false);

    // WhatsApp tracking state
    const [whatsappSent, setWhatsappSent] = useState(0);
    const [contactedPhones, setContactedPhones] = useState(new Set()); // Phones already messaged
    const [sessionPhones, setSessionPhones] = useState(new Set()); // Phones from current results (for dedup)

    // Rate limiting state
    const [cooldownSeconds, setCooldownSeconds] = useState(0);
    const [hourlyCount, setHourlyCount] = useState(0);
    const [hourlyResetTime, setHourlyResetTime] = useState(null);

    // WhatsApp Business Configuration (Default values, will be overridden by DB)
    const [whatsappSettings, setWhatsappSettings] = useState({
        phone: '525526702368',
        display_number: '+52 55 2670 2368',
        default_message: '¡Hola! Vi tu perfil en Geobooker y me gustaría platicar sobre cómo pueden ayudarte a crecer. ¿Tienes unos minutos?'
    });

    const [rateLimitConfig, setRateLimitConfig] = useState({
        cooldownMs: 45000,
        maxPerHour: 30,
        warningAt: 25
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('crm_settings')
                .select('*');

            if (error) throw error;

            data.forEach(s => {
                if (s.setting_key === 'whatsapp_business') {
                    setWhatsappSettings(s.setting_value);
                }
                if (s.setting_key === 'campaign_limits') {
                    setRateLimitConfig(prev => ({
                        ...prev,
                        maxPerHour: Math.ceil((s.setting_value.daily_whatsapp_limit || 50) / 8) // Approx per hour
                    }));
                }
            });
        } catch (err) {
            console.error('Error loading scraper settings:', err);
        }
    };

    // Categorías y subcategorías de negocios
    const businessCategories = [
        { category: '🍽️ Gastronomía', items: ['Restaurantes', 'Cafeterías', 'Bares', 'Food Trucks', 'Pastelerías', 'Pizzerías', 'Taquerías', 'Comida Rápida'] },
        { category: '💆 Belleza y Salud', items: ['Salones de Belleza', 'Spas', 'Barberías', 'Clínicas Estéticas', 'Gimnasios', 'Yoga Studios', 'Dentistas', 'Farmacias'] },
        { category: '🏥 Servicios Médicos', items: ['Hospitales', 'Clínicas', 'Laboratorios', 'Consultorios Médicos', 'Ópticas', 'Veterinarias', 'Fisioterapia'] },
        { category: '🏪 Comercio', items: ['Tiendas de Ropa', 'Zapaterías', 'Ferreterías', 'Papelerías', 'Joyerías', 'Florerías', 'Supermercados', 'Tiendas de Electrónica'] },
        { category: '🚗 Automotriz', items: ['Talleres Mecánicos', 'Refaccionarias', 'Lavados de Autos', 'Llanterías', 'Agencias de Autos', 'Grúas'] },
        { category: '💼 Servicios Profesionales', items: ['Abogados', 'Contadores', 'Arquitectos', 'Notarías', 'Agencias de Seguros', 'Consultorías', 'Agencias de Marketing'] },
        { category: '🏨 Hospedaje', items: ['Hoteles', 'Hostales', 'Airbnb', 'Moteles', 'Resorts', 'Cabañas'] },
        { category: '🎓 Educación', items: ['Escuelas', 'Universidades', 'Academias de Idiomas', 'Tutorías', 'Guarderías', 'Coworkings'] },
        { category: '🎉 Entretenimiento', items: ['Cines', 'Teatros', 'Clubs Nocturnos', 'Karaokes', 'Salones de Fiestas', 'Parques de Diversiones'] },
        { category: '🏠 Hogar', items: ['Plomeros', 'Electricistas', 'Cerrajeros', 'Limpieza', 'Jardinería', 'Mudanzas', 'Pintores'] }
    ];

    // Regiones globales organizadas por continente
    const globalRegions = [
        {
            continent: '🇲🇽 México', cities: [
                'Ciudad de México, México', 'Guadalajara, Jalisco, México', 'Monterrey, Nuevo León, México',
                'Cancún, Quintana Roo, México', 'Puebla, México', 'Tijuana, Baja California, México',
                'León, Guanajuato, México', 'Mérida, Yucatán, México', 'Querétaro, México',
                'San Luis Potosí, México', 'Aguascalientes, México', 'Hermosillo, Sonora, México'
            ]
        },
        {
            continent: '🇺🇸 Estados Unidos', cities: [
                'Miami, Florida, USA', 'Los Angeles, California, USA', 'Houston, Texas, USA',
                'New York, NY, USA', 'Chicago, Illinois, USA', 'Dallas, Texas, USA',
                'Phoenix, Arizona, USA', 'San Antonio, Texas, USA', 'San Diego, California, USA',
                'Las Vegas, Nevada, USA', 'Denver, Colorado, USA', 'Austin, Texas, USA'
            ]
        },
        {
            continent: '🇪🇺 Europa', cities: [
                'Madrid, España', 'Barcelona, España', 'London, UK', 'Paris, France',
                'Berlin, Germany', 'Rome, Italy', 'Amsterdam, Netherlands', 'Lisbon, Portugal',
                'Vienna, Austria', 'Prague, Czech Republic', 'Dublin, Ireland'
            ]
        },
        {
            continent: '🌎 Latinoamérica', cities: [
                'Buenos Aires, Argentina', 'Bogotá, Colombia', 'São Paulo, Brazil',
                'Lima, Peru', 'Santiago, Chile', 'Medellín, Colombia',
                'Cartagena, Colombia', 'Montevideo, Uruguay', 'Quito, Ecuador',
                'Panama City, Panama', 'San José, Costa Rica', 'Guatemala City, Guatemala'
            ]
        },
        {
            continent: '🌏 Asia y Oceanía', cities: [
                'Tokyo, Japan', 'Singapore', 'Sydney, Australia', 'Dubai, UAE',
                'Hong Kong', 'Bangkok, Thailand', 'Seoul, South Korea',
                'Melbourne, Australia', 'Auckland, New Zealand', 'Mumbai, India'
            ]
        },
        {
            continent: '🇨🇦 Canadá', cities: [
                'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada',
                'Calgary, Canada', 'Ottawa, Canada', 'Edmonton, Canada'
            ]
        }
    ];

    // Search businesses using Apify (async start + poll pattern)
    const handleSearch = async () => {
        if (!searchQuery.trim() || !location.trim()) {
            toast.error('Ingresa qué buscar y dónde');
            return;
        }

        setLoading(true);
        setError(null);
        setResults([]);
        setSelectedLeads(new Set());

        try {
            // PASO 1: Iniciar el job
            const startResponse = await fetch('/.netlify/functions/apify-scraper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'start',
                    searchQuery: searchQuery.trim(),
                    location: location.trim(),
                    maxResults
                })
            });

            const startData = await startResponse.json();

            if (!startResponse.ok || !startData.runId) {
                throw new Error(startData.error || 'Error iniciando scraper');
            }

            toast.success('🚀 Búsqueda iniciada, espera...');

            // PASO 2: Poll cada 5 segundos hasta que termine
            const runId = startData.runId;
            let attempts = 0;
            const maxAttempts = 40; // 40 * 5s = 200 segundos max

            const pollForResults = async () => {
                while (attempts < maxAttempts) {
                    attempts++;

                    // Esperar 5 segundos
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    const pollResponse = await fetch('/.netlify/functions/apify-scraper', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'poll',
                            runId
                        })
                    });

                    const pollData = await pollResponse.json();

                    if (pollData.status === 'completed') {
                        const businesses = pollData.businesses || [];
                        setResults(businesses);
                        toast.success(`✅ ${pollData.count} negocios encontrados`);

                        // Auto-save to scraping_history
                        if (businesses.length > 0) {
                            saveToHistory(businesses);
                        }
                        return;
                    }

                    if (pollData.status === 'failed') {
                        throw new Error('El scraping falló');
                    }

                    // Si sigue running, continuar
                    if (attempts % 4 === 0) {
                        toast.loading(`Buscando... (${attempts * 5}s)`, { id: 'search-progress' });
                    }
                }

                throw new Error('Timeout: la búsqueda tardó demasiado');
            };

            await pollForResults();
            toast.dismiss('search-progress');

        } catch (err) {
            setError(err.message);
            toast.error(err.message);
            toast.dismiss('search-progress');
        } finally {
            setLoading(false);
        }
    };

    // Auto-save results to scraping_history table
    const saveToHistory = async (businesses) => {
        try {
            const historyRecords = businesses.map(lead => ({
                name: lead.name || '',
                phone: lead.phone || null,
                email: lead.email || null,
                website: lead.website || null,
                address: lead.address || null,
                city: extractCity(lead.address),
                category: lead.category || searchQuery,
                rating: lead.rating || null,
                review_count: lead.reviewCount || 0,
                google_maps_url: lead.googleMapsUrl || null,
                search_query: searchQuery,
                search_location: location,
                tier: determineTier(lead),
                source: 'apify'
            }));

            const { error } = await supabase
                .from('scraping_history')
                .upsert(historyRecords, {
                    onConflict: 'phone,search_query,search_location',
                    ignoreDuplicates: true
                });

            if (error) {
                console.warn('Auto-save warning:', error.message);
            } else {
                console.log(`💾 ${businesses.length} leads guardados en historial`);
            }
        } catch (err) {
            console.warn('Auto-save error:', err);
        }
    };

    // Toggle selection
    const toggleSelect = (index) => {
        const newSelected = new Set(selectedLeads);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedLeads(newSelected);
    };

    // Select all
    const selectAll = () => {
        if (selectedLeads.size === results.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(results.map((_, i) => i)));
        }
    };

    // Import selected leads to CRM
    const importToCRM = async () => {
        if (selectedLeads.size === 0) {
            toast.error('Selecciona al menos un negocio');
            return;
        }

        setImporting(true);
        try {
            const leadsToImport = results
                .filter((_, i) => selectedLeads.has(i))
                .map(lead => ({
                    name: lead.name,
                    email: lead.email || null,
                    company: lead.name,
                    position: null,
                    tier: determineTier(lead),
                    phone: lead.phone || null,
                    city: extractCity(lead.address),
                    website: lead.website || null,
                    source_file: `Apify: ${searchQuery} @ ${location}`
                }));

            const { data, error } = await supabase
                .from('crm_contacts')
                .insert(leadsToImport)
                .select();

            if (error) throw error;

            toast.success(`✅ ${data.length} leads importados al CRM`);
            setSelectedLeads(new Set());

            // Marcar como importados en la UI
            const importedIndexes = new Set(selectedLeads);
            setResults(results.map((r, i) => ({
                ...r,
                _imported: importedIndexes.has(i) ? true : r._imported
            })));
        } catch (err) {
            toast.error('Error importando: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    // Determine tier based on reviews/rating
    const determineTier = (lead) => {
        if (lead.reviewCount > 500) return 'AAA';
        if (lead.reviewCount > 100) return 'AA';
        if (lead.reviewCount > 20) return 'A';
        return 'B';
    };

    // Extract city from address
    const extractCity = (address) => {
        if (!address) return null;
        const parts = address.split(',');
        return parts.length > 1 ? parts[parts.length - 2]?.trim() : parts[0]?.trim();
    };

    // Start cooldown timer
    const startCooldown = () => {
        const seconds = Math.ceil(RATE_LIMIT.cooldownMs / 1000);
        setCooldownSeconds(seconds);

        const interval = setInterval(() => {
            setCooldownSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Check and reset hourly limit
    const checkHourlyLimit = () => {
        const now = Date.now();
        if (hourlyResetTime && now > hourlyResetTime) {
            setHourlyCount(0);
            setHourlyResetTime(null);
            return true; // Reset happened, allow
        }
        return hourlyCount < rateLimitConfig.maxPerHour;
    };

    // Open WhatsApp with lead's phone and track/remove (with rate limiting)
    const openWhatsApp = (lead, index) => {
        // Check cooldown
        if (cooldownSeconds > 0) {
            toast.error(`⏱️ Espera ${cooldownSeconds}s antes del siguiente mensaje`);
            return;
        }

        // Check hourly limit
        if (!checkHourlyLimit()) {
            const resetIn = hourlyResetTime ? Math.ceil((hourlyResetTime - Date.now()) / 60000) : 0;
            toast.error(`🚫 Límite por hora alcanzado (${rateLimitConfig.maxPerHour}). Espera ${resetIn} minutos.`);
            return;
        }

        if (!lead.phone) {
            toast.error('Este negocio no tiene teléfono');
            return;
        }

        const phone = lead.phone.replace(/\D/g, '');
        const message = encodeURIComponent(whatsappSettings.default_message || `Hola, los contacto de parte de Geobooker. ¿Podemos platicar sobre cómo podemos ayudarles a conseguir más clientes?`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');

        // Track the message
        const newWhatsappCount = whatsappSent + 1;
        setWhatsappSent(newWhatsappCount);
        setContactedPhones(prev => new Set([...prev, phone]));

        // Update hourly count
        const newHourlyCount = hourlyCount + 1;
        setHourlyCount(newHourlyCount);
        if (!hourlyResetTime) {
            setHourlyResetTime(Date.now() + 3600000); // 1 hour from now
        }

        // Start cooldown
        startCooldown();

        // Remove from results list after sending
        setResults(prev => prev.filter((_, i) => i !== index));

        // Update selected leads (shift indexes)
        setSelectedLeads(prev => {
            const newSelected = new Set();
            prev.forEach(i => {
                if (i < index) newSelected.add(i);
                else if (i > index) newSelected.add(i - 1);
            });
            return newSelected;
        });

        // Show appropriate message
        if (newHourlyCount >= rateLimitConfig.warningAt) {
            toast(`⚠️ WhatsApp ${newWhatsappCount} - Cerca del límite (${newHourlyCount}/${rateLimitConfig.maxPerHour} por hora)`, { icon: '⚠️' });
        } else {
            toast.success(`✅ WhatsApp enviado (${newWhatsappCount} total) - Próximo en 45s`);
        }
    };

    // Remove duplicate phones from results
    const removeDuplicates = () => {
        const seenPhones = new Set();
        const uniqueResults = results.filter(lead => {
            if (!lead.phone) return true; // Keep leads without phone
            const phone = lead.phone.replace(/\D/g, '');
            if (seenPhones.has(phone) || contactedPhones.has(phone)) {
                return false; // Duplicate or already contacted
            }
            seenPhones.add(phone);
            return true;
        });

        const removed = results.length - uniqueResults.length;
        setResults(uniqueResults);
        setSelectedLeads(new Set());

        if (removed > 0) {
            toast.success(`🧹 ${removed} duplicados eliminados`);
        } else {
            toast('No hay duplicados', { icon: '✨' });
        }
    };

    // Export results to Excel
    const exportToExcel = () => {
        if (results.length === 0) {
            toast.error('No hay resultados para exportar');
            return;
        }

        try {
            const data = results.map(lead => ({
                'Nombre': lead.name || '',
                'Teléfono': lead.phone || '',
                'Email': lead.email || '',
                'Website': lead.website || '',
                'Dirección': lead.address || '',
                'Categoría': lead.category || '',
                'Rating': lead.rating || '',
                'Reviews': lead.reviewCount || '',
                'Google Maps URL': lead.googleMapsUrl || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

            // Generate sanitized filename
            const cleanQuery = searchQuery.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const date = new Date().toISOString().split('T')[0];
            const fileName = `Leads x Scrapping - ${cleanQuery} - ${date}.xlsx`;

            XLSX.writeFile(workbook, fileName);
            toast.success(`📥 ${results.length} leads exportados a Excel`);
        } catch (err) {
            console.error('Error exporting to Excel:', err);
            toast.error('Error exportando a Excel');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <Globe className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🌍 Lead Scraper Global</h1>
                    <p className="text-gray-500">Busca negocios en cualquier parte del mundo con Apify</p>
                </div>
            </div>

            {/* Search Form */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Search Query */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            🔍 ¿Qué buscar?
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="restaurantes, hotels, dentistas..."
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            📍 Ubicación
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ciudad, País..."
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            list="locations"
                        />
                        <datalist id="locations">
                            {globalRegions.flatMap(region =>
                                region.cities.map((city, i) => (
                                    <option key={`${region.continent}-${i}`} value={city}>{city}</option>
                                ))
                            )}
                        </datalist>
                    </div>

                    {/* Max Results */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            📊 Máximo resultados
                        </label>
                        <select
                            value={maxResults}
                            onChange={(e) => setMaxResults(parseInt(e.target.value))}
                            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500"
                        >
                            <option value={20}>20 negocios</option>
                            <option value={50}>50 negocios</option>
                            <option value={100}>100 negocios</option>
                            <option value={200}>200 negocios</option>
                        </select>
                    </div>
                </div>

                {/* Category Suggestions */}
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">📂 Categorías sugeridas:</p>
                    <div className="flex flex-wrap gap-2">
                        {businessCategories.map((cat, i) => (
                            <div key={i} className="relative group">
                                <button
                                    className="px-3 py-1.5 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                                >
                                    {cat.category}
                                </button>
                                {/* Dropdown on hover - with padding bridge to prevent gap issues */}
                                <div className="absolute left-0 top-full pt-2 z-20 hidden group-hover:block">
                                    <div className="bg-white border rounded-lg shadow-lg p-2 min-w-[180px] max-h-[280px] overflow-y-auto">
                                        {cat.items.map((item, j) => (
                                            <button
                                                key={j}
                                                onClick={() => setSearchQuery(item)}
                                                className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded cursor-pointer"
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Region Selector */}
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">🌍 Regiones populares:</p>
                    <div className="flex flex-wrap gap-2">
                        {globalRegions.map((region, i) => (
                            <div key={i} className="relative group">
                                <button
                                    className="px-3 py-1.5 rounded-full text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                                >
                                    {region.continent}
                                </button>
                                {/* Dropdown on hover - with padding bridge to prevent gap issues */}
                                <div className="absolute left-0 top-full pt-2 z-20 hidden group-hover:block">
                                    <div className="bg-white border rounded-lg shadow-lg p-2 min-w-[220px] max-h-[300px] overflow-y-auto">
                                        {region.cities.map((city, j) => (
                                            <button
                                                key={j}
                                                onClick={() => setLocation(city)}
                                                className={`block w-full text-left px-3 py-2 text-sm rounded cursor-pointer ${location === city
                                                    ? 'bg-green-100 text-green-700 font-medium'
                                                    : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                                                    }`}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Search Button */}
                <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition shadow-lg"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Buscando... (puede tomar 1-3 min)
                        </>
                    ) : (
                        <>
                            <Search className="w-6 h-6" />
                            Buscar Negocios
                        </>
                    )}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div>
                        <p className="font-medium text-red-800">{error}</p>
                        {error.includes('APIFY_API_TOKEN') && (
                            <p className="text-sm text-red-600 mt-1">
                                Configura tu token de Apify en las variables de entorno de Netlify
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    {/* Results Header */}
                    <div className="bg-gray-50 border-b px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-gray-700">
                                {results.length} negocios encontrados
                            </span>
                            <span className="text-sm text-gray-500">
                                {selectedLeads.size} seleccionados
                            </span>
                            {whatsappSent > 0 && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                                    <MessageCircle className="w-3 h-3" />
                                    {whatsappSent} WhatsApp enviados
                                </span>
                            )}
                            {cooldownSeconds > 0 && (
                                <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium animate-pulse">
                                    ⏱️ Próximo en {cooldownSeconds}s
                                </span>
                            )}
                            {hourlyCount > 0 && (
                                <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${hourlyCount >= RATE_LIMIT.warningAt
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    📊 {hourlyCount}/{RATE_LIMIT.maxPerHour} esta hora
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={removeDuplicates}
                                className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 font-medium"
                                title="Eliminar teléfonos duplicados"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Quitar duplicados
                            </button>
                            <button
                                onClick={selectAll}
                                className="text-sm text-blue-600 hover:text-blue-800"
                            >
                                {selectedLeads.size === results.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                            </button>
                            <button
                                onClick={importToCRM}
                                disabled={importing || selectedLeads.size === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                            >
                                {importing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                                Importar al CRM ({selectedLeads.size})
                            </button>
                            <button
                                onClick={exportToExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                                title="Descargar todos los resultados como Excel"
                            >
                                <Download className="w-4 h-4" />
                                Exportar Excel
                            </button>
                            <Link
                                to="/admin/scraper-history"
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium border"
                            >
                                <FolderOpen className="w-4 h-4" />
                                Leads x Scrapping
                            </Link>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeads.size === results.length}
                                            onChange={selectAll}
                                            className="w-4 h-4 rounded"
                                        />
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Negocio</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Categoría</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Contacto</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Rating</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {results.map((lead, index) => (
                                    <tr
                                        key={index}
                                        className={`hover:bg-gray-50 ${lead._imported ? 'bg-green-50' : ''
                                            } ${selectedLeads.has(index) ? 'bg-blue-50' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedLeads.has(index)}
                                                onChange={() => toggleSelect(index)}
                                                className="w-4 h-4 rounded"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div>
                                                <p className="font-medium text-gray-900 flex items-center gap-2">
                                                    {lead.name}
                                                    {lead._imported && (
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    )}
                                                </p>
                                                <p className="text-sm text-gray-500 truncate max-w-xs">{lead.address}</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-600">{lead.category || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                {lead.phone && (
                                                    <p className="text-sm flex items-center gap-1">
                                                        <Phone className="w-3 h-3" /> {lead.phone}
                                                    </p>
                                                )}
                                                {lead.website && (
                                                    <a
                                                        href={lead.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        <Globe className="w-3 h-3" /> Web
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {lead.rating ? (
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                    <span className="font-medium">{lead.rating}</span>
                                                    <span className="text-gray-400 text-sm">({lead.reviewCount})</span>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                {lead.phone && (
                                                    <button
                                                        onClick={() => openWhatsApp(lead, index)}
                                                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                                        title="Enviar WhatsApp (se eliminará de la lista)"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {lead.googleMapsUrl && (
                                                    <a
                                                        href={lead.googleMapsUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                                        title="Ver en Google Maps"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!loading && results.length === 0 && !error && (
                <div className="bg-white rounded-2xl border p-12 text-center">
                    <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">Busca negocios en cualquier parte del mundo</h3>
                    <p className="text-gray-500 mb-6">
                        Usa Apify para encontrar leads en México, USA, España, y más.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['restaurantes', 'hoteles', 'dentistas', 'gimnasios', 'salones de belleza'].map((q, i) => (
                            <button
                                key={i}
                                onClick={() => setSearchQuery(q)}
                                className="px-4 py-2 bg-gray-100 rounded-full text-gray-700 hover:bg-gray-200"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Cómo funciona:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Buscar:</strong> Ingresa qué tipo de negocio y dónde</li>
                    <li>• <strong>Seleccionar:</strong> Marca los negocios que te interesen</li>
                    <li>• <strong>Importar:</strong> Los leads se guardan en tu CRM</li>
                    <li>• <strong>Contactar:</strong> Envía WhatsApp o Email desde el CRM</li>
                    <li>• <strong>Costo:</strong> ~$0.002-0.01 por negocio (Apify)</li>
                </ul>
            </div>
        </div>
    );
};

export default ApifyScraper;
