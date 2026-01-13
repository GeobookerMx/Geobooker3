// src/pages/admin/ApifyScraper.jsx
/**
 * Global Lead Scraper using Apify
 * - Search businesses worldwide
 * - Import to CRM
 * - Send WhatsApp/Email directly
 */
import React, { useState, useCallback } from 'react';
import {
    Search, Globe, MapPin, Phone, Mail, ExternalLink, Download,
    Loader2, Building2, Star, MessageCircle, Send, CheckCircle,
    Users, Filter, RefreshCw, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

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

    // Pre-defined locations for quick access
    const popularLocations = [
        { label: '🇲🇽 Ciudad de México', value: 'Ciudad de México, México' },
        { label: '🇲🇽 Guadalajara', value: 'Guadalajara, Jalisco, México' },
        { label: '🇲🇽 Monterrey', value: 'Monterrey, Nuevo León, México' },
        { label: '🇺🇸 Miami, FL', value: 'Miami, Florida, USA' },
        { label: '🇺🇸 Los Angeles', value: 'Los Angeles, California, USA' },
        { label: '🇺🇸 Houston, TX', value: 'Houston, Texas, USA' },
        { label: '🇪🇸 Madrid', value: 'Madrid, España' },
        { label: '🇪🇸 Barcelona', value: 'Barcelona, España' },
        { label: '🇬🇧 London', value: 'London, UK' },
        { label: '🇨🇦 Toronto', value: 'Toronto, Canada' },
        { label: '🇦🇷 Buenos Aires', value: 'Buenos Aires, Argentina' },
        { label: '🇨🇴 Bogotá', value: 'Bogotá, Colombia' },
    ];

    // Search businesses using Apify
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
            const response = await fetch('/.netlify/functions/apify-scraper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    searchQuery: searchQuery.trim(),
                    location: location.trim(),
                    maxResults
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en el scraping');
            }

            if (data.success) {
                setResults(data.businesses || []);
                toast.success(`✅ ${data.count} negocios encontrados`);
            } else {
                setError(data.message || 'No se encontraron resultados');
            }
        } catch (err) {
            console.error('Search error:', err);
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
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
            console.error('Import error:', err);
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

    // Open WhatsApp with lead's phone
    const openWhatsApp = (lead) => {
        if (!lead.phone) {
            toast.error('Este negocio no tiene teléfono');
            return;
        }
        const phone = lead.phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Hola, los contacto de parte de Geobooker. ¿Podemos platicar sobre cómo podemos ayudarles a conseguir más clientes?`);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
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
                            {popularLocations.map((loc, i) => (
                                <option key={i} value={loc.value}>{loc.label}</option>
                            ))}
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

                {/* Quick Location Buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {popularLocations.slice(0, 6).map((loc, i) => (
                        <button
                            key={i}
                            onClick={() => setLocation(loc.value)}
                            className={`px-3 py-1.5 rounded-full text-sm transition ${location === loc.value
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {loc.label}
                        </button>
                    ))}
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
                    <div className="bg-gray-50 border-b px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-gray-700">
                                {results.length} negocios encontrados
                            </span>
                            <span className="text-sm text-gray-500">
                                {selectedLeads.size} seleccionados
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
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
                                                        onClick={() => openWhatsApp(lead)}
                                                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                                        title="WhatsApp"
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
