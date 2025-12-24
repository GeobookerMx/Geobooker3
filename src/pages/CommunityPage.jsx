// src/pages/CommunityPage.jsx
/**
 * Community page - Admin-only blog/news
 * Displays articles from admin, no user posts (for now)
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Newspaper, Calendar, ChevronRight, User, Tag,
    Sparkles, ArrowRight, MessageCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';

// Categories with icons and colors
const CATEGORIES = {
    noticias: { label: 'Noticias', labelEn: 'News', color: 'blue', icon: '📰' },
    tips: { label: 'Tips & Consejos', labelEn: 'Tips & Advice', color: 'green', icon: '💡' },
    actualizaciones: { label: 'Actualizaciones', labelEn: 'Updates', color: 'purple', icon: '🚀' },
    historias: { label: 'Historias de Éxito', labelEn: 'Success Stories', color: 'yellow', icon: '⭐' },
    general: { label: 'General', labelEn: 'General', color: 'gray', icon: '📝' }
};

export default function CommunityPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const { i18n } = useTranslation();
    const isSpanish = i18n.language?.startsWith('es');

    useEffect(() => {
        loadPosts();
    }, [selectedCategory]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('community_posts')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (selectedCategory !== 'all') {
                query = query.eq('category', selectedCategory);
            }

            const { data, error } = await query.limit(20);

            if (error) throw error;
            setPosts(data || []);
        } catch (err) {
            console.error('Error loading posts:', err);
            // Show demo posts if table doesn't exist yet
            setPosts([
                {
                    id: 'demo-1',
                    title: isSpanish ? '¡Bienvenidos a la Comunidad Geobooker!' : 'Welcome to Geobooker Community!',
                    content: isSpanish
                        ? 'Este es tu espacio para estar al día con las últimas noticias, tips para hacer crecer tu negocio, y actualizaciones de la plataforma.'
                        : 'This is your space to stay up to date with the latest news, tips to grow your business, and platform updates.',
                    category: 'noticias',
                    created_at: new Date().toISOString(),
                    author_name: 'Equipo Geobooker'
                },
                {
                    id: 'demo-2',
                    title: isSpanish ? '5 Tips para Destacar tu Negocio en el Mapa' : '5 Tips to Make Your Business Stand Out',
                    content: isSpanish
                        ? 'Aprende cómo optimizar tu perfil de negocio para atraer más clientes...'
                        : 'Learn how to optimize your business profile to attract more customers...',
                    category: 'tips',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    author_name: 'Equipo Geobooker'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString(isSpanish ? 'es-MX' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white py-16">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            {isSpanish ? 'Blog & Noticias' : 'Blog & News'}
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black mb-4">
                        {isSpanish ? 'Comunidad Geobooker' : 'Geobooker Community'}
                    </h1>
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">
                        {isSpanish
                            ? 'Noticias, tips y actualizaciones para hacer crecer tu negocio'
                            : 'News, tips, and updates to grow your business'}
                    </p>
                </div>
            </section>

            {/* Category Filter */}
            <section className="py-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition ${selectedCategory === 'all'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {isSpanish ? 'Todos' : 'All'}
                        </button>
                        {Object.entries(CATEGORIES).map(([key, cat]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedCategory(key)}
                                className={`flex-shrink-0 px-4 py-2 rounded-full font-medium transition flex items-center gap-2 ${selectedCategory === key
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <span>{cat.icon}</span>
                                {isSpanish ? cat.label : cat.labelEn}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Posts Grid */}
            <section className="py-12">
                <div className="max-w-6xl mx-auto px-4">
                    {loading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl p-6 shadow-lg animate-pulse">
                                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                                    <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                </div>
                            ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-16">
                            <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">
                                {isSpanish ? 'Próximamente' : 'Coming Soon'}
                            </h3>
                            <p className="text-gray-500">
                                {isSpanish
                                    ? 'Estamos preparando contenido increíble para ti'
                                    : 'We are preparing amazing content for you'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {posts.map(post => {
                                const category = CATEGORIES[post.category] || CATEGORIES.general;
                                return (
                                    <article
                                        key={post.id}
                                        className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
                                    >
                                        {/* Category Header */}
                                        <div className={`bg-${category.color}-100 px-4 py-2 flex items-center gap-2`}>
                                            <span>{category.icon}</span>
                                            <span className={`text-sm font-medium text-${category.color}-700`}>
                                                {isSpanish ? category.label : category.labelEn}
                                            </span>
                                        </div>

                                        <div className="p-6">
                                            <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-purple-600 transition">
                                                {post.title}
                                            </h3>

                                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                                {post.content}
                                            </p>

                                            <div className="flex items-center justify-between text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-4 h-4" />
                                                    <span>{post.author_name || 'Geobooker'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{formatDate(post.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <MessageCircle className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        {isSpanish ? '¿Tienes una historia para compartir?' : 'Have a story to share?'}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        {isSpanish
                            ? 'Si tu negocio tiene una historia de éxito que quieras compartir, contáctanos'
                            : 'If your business has a success story you want to share, contact us'}
                    </p>
                    <a
                        href="mailto:comunidad@geobooker.com.mx"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition"
                    >
                        {isSpanish ? 'Escríbenos' : 'Write to Us'}
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </section>
        </div>
    );
}
