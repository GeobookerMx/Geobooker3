// src/pages/admin/PostsManagement.jsx
/**
 * Admin panel for managing community blog posts
 * - Create new posts
 * - Edit existing posts
 * - Publish/Unpublish posts
 * - Delete posts
 */
import React, { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, Eye, EyeOff, Save, X,
    Newspaper, Calendar, Tag, User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const CATEGORIES = [
    { value: 'noticias', label: '📰 Noticias' },
    { value: 'tips', label: '💡 Tips & Consejos' },
    { value: 'actualizaciones', label: '🚀 Actualizaciones' },
    { value: 'historias', label: '⭐ Historias de Éxito' },
    { value: 'general', label: '📝 General' }
];

export default function PostsManagement() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [summary, setSummary] = useState('');
    const [category, setCategory] = useState('tips');
    const [isPublished, setIsPublished] = useState(true);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('community_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPosts(data || []);
        } catch (err) {
            console.error('Error loading posts:', err);
            toast.error('Error al cargar posts');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setSummary('');
        setCategory('tips');
        setIsPublished(true);
        setEditingPost(null);
    };

    const openEditor = (post = null) => {
        if (post) {
            setEditingPost(post);
            setTitle(post.title || '');
            setContent(post.content || '');
            setSummary(post.summary || '');
            setCategory(post.category || 'tips');
            setIsPublished(post.is_published);
        } else {
            resetForm();
        }
        setShowEditor(true);
    };

    const closeEditor = () => {
        setShowEditor(false);
        resetForm();
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            toast.error('Título y contenido son requeridos');
            return;
        }

        setSaving(true);
        try {
            const postData = {
                title: title.trim(),
                content: content.trim(),
                summary: summary.trim() || title.substring(0, 100),
                category,
                is_published: isPublished,
                author_name: 'Equipo Geobooker',
                published_at: isPublished ? new Date().toISOString() : null
            };

            if (editingPost) {
                // Update existing
                const { error } = await supabase
                    .from('community_posts')
                    .update(postData)
                    .eq('id', editingPost.id);

                if (error) throw error;
                toast.success('Post actualizado');
            } else {
                // Create new
                const { error } = await supabase
                    .from('community_posts')
                    .insert([postData]);

                if (error) throw error;
                toast.success('Post creado');
            }

            closeEditor();
            loadPosts();
        } catch (err) {
            console.error('Error saving post:', err);
            toast.error('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const togglePublish = async (post) => {
        try {
            const { error } = await supabase
                .from('community_posts')
                .update({
                    is_published: !post.is_published,
                    published_at: !post.is_published ? new Date().toISOString() : null
                })
                .eq('id', post.id);

            if (error) throw error;
            toast.success(post.is_published ? 'Post ocultado' : 'Post publicado');
            loadPosts();
        } catch (err) {
            console.error('Error toggling publish:', err);
            toast.error('Error al cambiar estado');
        }
    };

    const handleDelete = async (post) => {
        if (!window.confirm(`¿Eliminar "${post.title}"?`)) return;

        try {
            const { error } = await supabase
                .from('community_posts')
                .delete()
                .eq('id', post.id);

            if (error) throw error;
            toast.success('Post eliminado');
            loadPosts();
        } catch (err) {
            console.error('Error deleting post:', err);
            toast.error('Error al eliminar');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Newspaper className="w-7 h-7 text-purple-600" />
                        Gestión de Blog
                    </h1>
                    <p className="text-gray-500">Administra los posts de la Comunidad Geobooker</p>
                </div>
                <button
                    onClick={() => openEditor()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                    <Plus className="w-5 h-5" />
                    Nuevo Post
                </button>
            </div>

            {/* Posts Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Cargando...</div>
                ) : posts.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No hay posts. ¡Crea el primero!
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Título</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Categoría</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
                                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Fecha</th>
                                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {posts.map(post => {
                                const cat = CATEGORIES.find(c => c.value === post.category) || CATEGORIES[4];
                                return (
                                    <tr key={post.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900 line-clamp-1">{post.title}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{cat.label}</td>
                                        <td className="px-4 py-3">
                                            {post.is_published ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    <Eye className="w-3 h-3" /> Publicado
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                    <EyeOff className="w-3 h-3" /> Borrador
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(post.created_at)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => togglePublish(post)}
                                                    className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                                    title={post.is_published ? 'Ocultar' : 'Publicar'}
                                                >
                                                    {post.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => openEditor(post)}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(post)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Editor Modal */}
            {showEditor && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold">
                                {editingPost ? 'Editar Post' : 'Nuevo Post'}
                            </h2>
                            <button onClick={closeEditor} className="p-1 hover:bg-white/20 rounded">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej: 💡 5 Tips para tu Negocio"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                <select
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Summary */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Resumen (opcional)</label>
                                <input
                                    type="text"
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    placeholder="Breve descripción para la lista"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contenido *</label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Escribe el contenido del post...

Usa ## para títulos
Usa - para listas
Usa **texto** para negritas
Usa > para citas"
                                    rows={12}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                                />
                            </div>

                            {/* Publish Toggle */}
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isPublished}
                                    onChange={(e) => setIsPublished(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-gray-700">Publicar inmediatamente</span>
                            </label>
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t p-4 flex justify-end gap-3">
                            <button
                                onClick={closeEditor}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? 'Guardando...' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
