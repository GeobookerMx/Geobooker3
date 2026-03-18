// src/components/business/BusinessMetricsCard.jsx
// Muestra métricas de intención de negocio para dueños de negocios
// Datos desde business_intent_logs (WhatsApp, llamadas, direcciones, etc.)

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    MessageCircle, Phone, Navigation, Share2, Heart,
    TrendingUp, TrendingDown, Minus, BarChart3, Calendar
} from 'lucide-react';

export default function BusinessMetricsCard({ businessId, businessName }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(30); // días

    useEffect(() => {
        if (businessId) loadMetrics();
    }, [businessId, period]);

    const loadMetrics = async () => {
        setLoading(true);
        try {
            const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
            const prevStartDate = new Date(Date.now() - period * 2 * 24 * 60 * 60 * 1000).toISOString();

            // Período actual
            const { data: currentData } = await supabase
                .from('business_intent_logs')
                .select('event_name')
                .eq('business_id', businessId)
                .gte('created_at', startDate);

            // Período anterior (para tendencia)
            const { data: prevData } = await supabase
                .from('business_intent_logs')
                .select('event_name')
                .eq('business_id', businessId)
                .gte('created_at', prevStartDate)
                .lt('created_at', startDate);

            const count = (data, event) => (data || []).filter(e => e.event_name === event).length;

            const current = {
                whatsapp: count(currentData, 'tap_whatsapp'),
                calls: count(currentData, 'tap_call'),
                directions: count(currentData, 'open_directions'),
                shares: count(currentData, 'share_business'),
                favorites: count(currentData, 'save_favorite'),
                total: (currentData || []).length
            };

            const previous = {
                whatsapp: count(prevData, 'tap_whatsapp'),
                calls: count(prevData, 'tap_call'),
                directions: count(prevData, 'open_directions'),
                shares: count(prevData, 'share_business'),
                favorites: count(prevData, 'save_favorite'),
                total: (prevData || []).length
            };

            setMetrics({ current, previous });
        } catch (error) {
            console.error('Error loading business metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTrend = (current, previous) => {
        if (previous === 0 && current === 0) return { icon: Minus, color: 'text-gray-400', text: '—' };
        if (previous === 0) return { icon: TrendingUp, color: 'text-green-500', text: '+' + current };
        const change = Math.round(((current - previous) / previous) * 100);
        if (change > 0) return { icon: TrendingUp, color: 'text-green-500', text: `+${change}%` };
        if (change < 0) return { icon: TrendingDown, color: 'text-red-500', text: `${change}%` };
        return { icon: Minus, color: 'text-gray-400', text: '0%' };
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>)}
                </div>
            </div>
        );
    }

    if (!metrics || metrics.current.total === 0 && metrics.previous.total === 0) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
                <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-800">{businessName}</h3>
                </div>
                <p className="text-sm text-gray-500">
                    Aún no hay interacciones registradas. Las métricas aparecerán cuando los usuarios interactúen con tu negocio (WhatsApp, llamadas, direcciones, etc.)
                </p>
            </div>
        );
    }

    const items = [
        { label: 'WhatsApp', icon: MessageCircle, current: metrics.current.whatsapp, prev: metrics.previous.whatsapp, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Llamadas', icon: Phone, current: metrics.current.calls, prev: metrics.previous.calls, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Rutas', icon: Navigation, current: metrics.current.directions, prev: metrics.previous.directions, color: 'text-orange-600', bg: 'bg-orange-100' },
        { label: 'Compartidos', icon: Share2, current: metrics.current.shares, prev: metrics.previous.shares, color: 'text-purple-600', bg: 'bg-purple-100' },
        { label: 'Favoritos', icon: Heart, current: metrics.current.favorites, prev: metrics.previous.favorites, color: 'text-red-600', bg: 'bg-red-100' },
    ];

    const totalTrend = getTrend(metrics.current.total, metrics.previous.total);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        <h3 className="font-bold">{businessName}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 opacity-70" />
                        <select
                            value={period}
                            onChange={(e) => setPeriod(Number(e.target.value))}
                            className="bg-white/20 text-white text-sm rounded-lg px-2 py-1 border-0 appearance-none cursor-pointer"
                        >
                            <option value={7} className="text-gray-800">7 días</option>
                            <option value={30} className="text-gray-800">30 días</option>
                            <option value={90} className="text-gray-800">90 días</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold">{metrics.current.total}</span>
                    <span className="text-blue-200 text-sm">interacciones totales</span>
                    <span className={`ml-auto flex items-center gap-1 text-sm ${totalTrend.color === 'text-green-500' ? 'text-green-300' : totalTrend.color === 'text-red-500' ? 'text-red-300' : 'text-blue-200'}`}>
                        <totalTrend.icon className="w-3 h-3" />
                        {totalTrend.text}
                    </span>
                </div>
            </div>

            {/* Métricas Grid */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-0 divide-x divide-gray-100">
                {items.map((item) => {
                    const trend = getTrend(item.current, item.prev);
                    return (
                        <div key={item.label} className="p-4 text-center hover:bg-gray-50 transition">
                            <div className={`w-8 h-8 rounded-full ${item.bg} ${item.color} flex items-center justify-center mx-auto mb-2`}>
                                <item.icon className="w-4 h-4" />
                            </div>
                            <p className="text-xl font-bold text-gray-800">{item.current}</p>
                            <p className="text-xs text-gray-500">{item.label}</p>
                            <p className={`text-xs mt-1 flex items-center justify-center gap-0.5 ${trend.color}`}>
                                <trend.icon className="w-3 h-3" />
                                {trend.text}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
