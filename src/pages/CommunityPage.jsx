// src/pages/CommunityPage.jsx
/**
 * Community page - Admin-only blog/news with comments
 * Features:
 * - Blog posts from Supabase
 * - Expandable post content with markdown
 * - Comments section for each post
 */
import React, { useState, useEffect } from 'react';
import {
    Newspaper, Calendar, User, ChevronDown, ChevronUp,
    Sparkles, ArrowRight, MessageCircle, Send, ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Categories with icons and colors
const CATEGORIES = {
    noticias: { label: 'Noticias', labelEn: 'News', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-700', icon: '📰' },
    tips: { label: 'Tips & Consejos', labelEn: 'Tips & Advice', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-700', icon: '💡' },
    actualizaciones: { label: 'Actualizaciones', labelEn: 'Updates', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-700', icon: '🚀' },
    historias: { label: 'Historias de Éxito', labelEn: 'Success Stories', color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', icon: '⭐' },
    general: { label: 'General', labelEn: 'General', color: 'gray', bgColor: 'bg-gray-100', textColor: 'text-gray-700', icon: '📝' }
};

// Simple markdown-like renderer
function renderContent(content) {
    if (!content) return null;

    return content.split('\n').map((line, i) => {
        // Headers
        if (line.startsWith('## ')) {
            return <h2 key={i} className="text-xl font-bold text-gray-900 mt-6 mb-3">{line.replace('## ', '')}</h2>;
        }
        if (line.startsWith('### ')) {
            return <h3 key={i} className="text-lg font-semibold text-gray-800 mt-4 mb-2">{line.replace('### ', '')}</h3>;
        }
        // Blockquote
        if (line.startsWith('> ')) {
            return <blockquote key={i} className="border-l-4 border-purple-500 pl-4 italic text-gray-600 my-4">{line.replace('> ', '')}</blockquote>;
        }
        // List items
        if (line.startsWith('- ')) {
            const linkMatch = line.match(/\*\*\[(.*?)\]\((.*?)\)\*\*/);
            if (linkMatch) {
                return (
                    <li key={i} className="ml-4 flex items-start gap-2 my-1">
                        <span className="text-purple-500 mt-1">•</span>
                        <span>
                            <a href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-purple-600 font-bold hover:underline">
                                {linkMatch[1]}
                            </a>
                            {line.split(')**')[1]}
                        </span>
                    </li>
                );
            }
            return <li key={i} className="ml-4 flex items-start gap-2 my-1"><span className="text-purple-500 mt-1">•</span><span>{formatBold(line.replace('- ', ''))}</span></li>;
        }
        // Horizontal rule
        if (line === '---') {
            return <hr key={i} className="my-6 border-gray-200" />;
        }
        // Empty line
        if (line.trim() === '') {
            return <div key={i} className="h-2" />;
        }
        // Regular paragraph with bold
        return <p key={i} className="text-gray-700 my-2">{formatBold(line)}</p>;
    });
}

function formatBold(text) {
    const parts = text.split(/\*\*(.*?)\*\*/);
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-bold">{part}</strong> : part
    );
}

// Comment Component
function CommentSection({ postId, isSpanish }) {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [showComments, setShowComments] = useState(false);

    useEffect(() => {
        if (showComments) {
            loadComments();
        }
    }, [showComments, postId]);

    const loadComments = async () => {
        try {
            console.log('Loading comments for post:', postId);
            const { data, error } = await supabase
                .from('community_comments')
                .select('*')
                .eq('post_id', postId)
                .order('created_at', { ascending: false });

            console.log('Comments loaded:', data, 'Error:', error);

            if (error) throw error;
            // Filter approved comments (or show all for now to debug)
            const approvedComments = data?.filter(c => c.is_approved !== false) || [];
            setComments(approvedComments);
        } catch (err) {
            console.error('Error loading comments:', err);
        }
    };

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        if (!user) {
            toast.error(isSpanish ? 'Inicia sesión para comentar' : 'Login to comment');
            return;
        }

        setLoading(true);
        try {
            console.log('Sending comment to post:', postId);
            const { data, error } = await supabase.rpc('add_community_comment', {
                p_post_id: postId,
                p_content: newComment.trim()
            });

            console.log('Comment RPC response DATA:', JSON.stringify(data, null, 2));
            console.log('Comment RPC response ERROR:', error);

            if (error) {
                console.error('Supabase RPC error:', error);
                throw error;
            }

            // Handle different response types
            if (data === null || data === undefined) {
                // Function returned nothing - might be old version returning UUID
                toast.success(isSpanish ? '¡Comentario publicado!' : 'Comment posted!');
                setNewComment('');
                loadComments();
            } else if (typeof data === 'object') {
                // New JSONB response format
                if (data.blocked) {
                    toast.error(data.error || (isSpanish ? 'Comentario bloqueado' : 'Comment blocked'));
                } else if (data.pending_review) {
                    toast.success(isSpanish ? 'Tu comentario será revisado antes de publicarse' : 'Your comment will be reviewed');
                    setNewComment('');
                } else if (data.success) {
                    toast.success(data.message || (isSpanish ? '¡Comentario publicado!' : 'Comment posted!'));
                    setNewComment('');
                    loadComments();
                } else if (data.error) {
                    toast.error(data.error);
                } else {
                    // Unknown response, assume success
                    toast.success(isSpanish ? '¡Comentario publicado!' : 'Comment posted!');
                    setNewComment('');
                    loadComments();
                }
            } else {
                // UUID returned (old function)
                toast.success(isSpanish ? '¡Comentario publicado!' : 'Comment posted!');
                setNewComment('');
                loadComments();
            }
        } catch (err) {
            console.error('Error posting comment:', err);
            toast.error((isSpanish ? 'Error: ' : 'Error: ') + (err.message || err.toString()));
        } finally {
            setLoading(false);
        }
    };

    const formatCommentDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return isSpanish ? 'Ahora' : 'Now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return date.toLocaleDateString();
    };

    return (
        <div className="border-t border-gray-100 pt-4 mt-4">
            <button
                onClick={() => setShowComments(!showComments)}
                className="flex items-center gap-2 text-purple-600 font-medium hover:text-purple-700"
            >
                <MessageCircle className="w-5 h-5" />
                {showComments ? (isSpanish ? 'Ocultar comentarios' : 'Hide comments') : (isSpanish ? 'Ver comentarios' : 'View comments')}
                {comments.length > 0 && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-sm">{comments.length}</span>}
            </button>

            {showComments && (
                <div className="mt-4 space-y-4">
                    {/* New Comment Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder={isSpanish ? 'Escribe tu opinión...' : 'Write your opinion...'}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !newComment.trim()}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition flex items-center gap-2"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Comments List */}
                    {comments.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">
                            {isSpanish ? 'Sé el primero en comentar' : 'Be the first to comment'}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {comments.map(comment => (
                                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-900">{comment.user_name}</span>
                                        <span className="text-gray-400 text-sm">{formatCommentDate(comment.created_at)}</span>
                                    </div>
                                    <p className="text-gray-700">{comment.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function CommunityPage() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [expandedPost, setExpandedPost] = useState(null);
    const { i18n } = useTranslation();
    const isSpanish = i18n.language?.startsWith('es') ?? true;

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
            setPosts([]);
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

    const togglePost = (postId) => {
        setExpandedPost(expandedPost === postId ? null : postId);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
            {/* Hero Section */}
            <section className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 text-white py-12 md:py-16 relative overflow-hidden">
                {/* Background decorative elements */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 left-10 text-8xl">📰</div>
                    <div className="absolute bottom-10 right-10 text-8xl">💡</div>
                    <div className="absolute top-1/2 left-1/4 text-6xl">⭐</div>
                </div>

                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Text content */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-sm font-medium">
                                    {isSpanish ? 'Blog & Noticias' : 'Blog & News'}
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-5xl font-black mb-4">
                                {isSpanish ? 'Comunidad Geobooker' : 'Geobooker Community'}
                            </h1>
                            <p className="text-xl text-white/90 max-w-xl">
                                {isSpanish
                                    ? 'Noticias, tips, recursos y actualizaciones para hacer crecer tu negocio'
                                    : 'News, tips, resources and updates to grow your business'}
                            </p>
                        </div>

                        {/* Illustration area - Geobooker workers */}
                        <div className="hidden md:flex items-center justify-center">
                            <div className="relative">
                                {/* Worker illustration placeholder */}
                                <div className="w-48 h-48 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <div className="text-center">
                                        <div className="text-6xl mb-2">👷‍♂️👩‍🍳🧑‍💼</div>
                                        <p className="text-sm text-white/80">Comunidad</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Community Showcase - Professional Images */}
            <section className="py-12 bg-white">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            {isSpanish ? 'Negocios que confían en Geobooker' : 'Businesses that trust Geobooker'}
                        </h2>
                        <p className="text-gray-600">
                            {isSpanish ? 'Profesionales verificados en nuestra plataforma' : 'Verified professionals on our platform'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {/* Barbero */}
                        <div className="group relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg cursor-pointer">
                            <img
                                src="/images/community/barbero.jpg"
                                alt="Barbero"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">💈 Barbero</p>
                            </div>
                        </div>

                        {/* Estilista */}
                        <div className="group relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg cursor-pointer">
                            <img
                                src="/images/community/estilista.jpg"
                                alt="Estilista"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">✂️ Estilista</p>
                            </div>
                        </div>

                        {/* Veterinaria */}
                        <div className="group relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg cursor-pointer">
                            <img
                                src="/images/community/veterinaria-corgi.jpg"
                                alt="Veterinaria"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">🐕 Veterinaria</p>
                            </div>
                        </div>

                        {/* Mecánico */}
                        <div className="group relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg cursor-pointer">
                            <img
                                src="/images/community/mecanico-taller.jpg"
                                alt="Mecánico"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">🔧 Mecánico</p>
                            </div>
                        </div>

                        {/* Maquillista */}
                        <div className="group relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg cursor-pointer">
                            <img
                                src="/images/community/maquillista.jpg"
                                alt="Maquillista"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">💄 Maquillista</p>
                            </div>
                        </div>

                        {/* Electricista */}
                        <div className="group relative aspect-[3/4] rounded-xl overflow-hidden shadow-lg cursor-pointer">
                            <img
                                src="/images/community/electricista.jpg"
                                alt="Electricista"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                            <div className="absolute bottom-3 left-3 text-white">
                                <p className="font-bold text-sm">⚡ Electricista</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Category Filter */}
            <section className="py-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4">
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

            {/* Posts List */}
            <section className="py-8">
                <div className="max-w-4xl mx-auto px-4">
                    {loading ? (
                        <div className="space-y-6">
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
                        <div className="space-y-6">
                            {posts.map(post => {
                                const category = CATEGORIES[post.category] || CATEGORIES.general;
                                const isExpanded = expandedPost === post.id;

                                return (
                                    <article
                                        key={post.id}
                                        className="bg-white rounded-2xl shadow-lg overflow-hidden"
                                    >
                                        {/* Category Header */}
                                        <div className={`${category.bgColor} px-4 py-2 flex items-center gap-2`}>
                                            <span>{category.icon}</span>
                                            <span className={`text-sm font-medium ${category.textColor}`}>
                                                {isSpanish ? category.label : category.labelEn}
                                            </span>
                                        </div>

                                        <div className="p-6">
                                            {/* Title and Toggle */}
                                            <button
                                                onClick={() => togglePost(post.id)}
                                                className="w-full text-left"
                                            >
                                                <h2 className="text-xl font-bold text-gray-900 mb-2 hover:text-purple-600 transition flex items-center justify-between">
                                                    <span>{post.title}</span>
                                                    {isExpanded ? <ChevronUp className="w-5 h-5 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 flex-shrink-0" />}
                                                </h2>
                                            </button>

                                            {/* Meta */}
                                            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-4 h-4" />
                                                    <span>{post.author_name || 'Geobooker'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{formatDate(post.created_at)}</span>
                                                </div>
                                            </div>

                                            {/* Summary or Full Content */}
                                            {isExpanded ? (
                                                <div className="prose max-w-none">
                                                    {renderContent(post.content)}
                                                </div>
                                            ) : (
                                                <p className="text-gray-600 line-clamp-2">
                                                    {post.summary || post.content?.substring(0, 150) + '...'}
                                                </p>
                                            )}

                                            {/* Comments Section */}
                                            {isExpanded && (
                                                <CommentSection postId={post.id} isSpanish={isSpanish} />
                                            )}
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
                        href="mailto:geobookerr@gmail.com"
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
