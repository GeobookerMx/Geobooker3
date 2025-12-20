// src/pages/enterprise/EnterpriseEdit.jsx
/**
 * Edit Enterprise Campaign
 * Allows advertisers to edit their draft/pending campaigns
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    ArrowLeft, Save, Image as ImageIcon, Upload, Loader2,
    AlertCircle, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';

export default function EnterpriseEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [campaign, setCampaign] = useState(null);
    const [form, setForm] = useState({
        headline: '',
        description: '',
        ctaText: '',
        ctaUrl: '',
        imageUrl: ''
    });

    useEffect(() => {
        if (id && user) loadCampaign();
    }, [id, user]);

    const loadCampaign = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('ad_campaigns')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            // Verify ownership
            if (data.advertiser_email !== user.email) {
                toast.error('You do not have permission to edit this campaign');
                navigate('/advertiser/dashboard');
                return;
            }

            // Check if editable
            if (!['draft', 'pending_review', 'paused'].includes(data.status)) {
                toast.error('This campaign cannot be edited');
                navigate('/advertiser/dashboard');
                return;
            }

            setCampaign(data);
            setForm({
                headline: data.headline || '',
                description: data.description || '',
                ctaText: data.cta_text || 'Learn More',
                ctaUrl: data.cta_url || 'https://',
                imageUrl: data.creative_url || ''
            });

        } catch (error) {
            console.error('Error loading campaign:', error);
            toast.error('Campaign not found');
            navigate('/advertiser/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            toast.error('Please upload an image or video file');
            return;
        }

        const maxSize = isVideo ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File must be under ${isVideo ? '30MB' : '5MB'}`);
            return;
        }

        setUploading(true);
        const toastId = toast.loading('Uploading...');

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}_${Date.now()}.${fileExt}`;
            const filePath = `campaigns/${fileName}`;

            const { error } = await supabase.storage
                .from('ad-creatives')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('ad-creatives').getPublicUrl(filePath);
            handleChange('imageUrl', publicUrl);
            toast.success('Uploaded successfully', { id: toastId });
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Upload failed', { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        if (!form.headline || !form.imageUrl) {
            toast.error('Please fill in all required fields');
            return;
        }

        setSaving(true);
        const toastId = toast.loading('Saving changes...');

        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .update({
                    headline: form.headline,
                    description: form.description,
                    cta_text: form.ctaText,
                    cta_url: form.ctaUrl,
                    creative_url: form.imageUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            toast.success('Campaign updated!', { id: toastId });
            navigate('/advertiser/dashboard');

        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save: ' + error.message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl text-white mb-2">Campaign Not Found</h2>
                    <a href="/advertiser/dashboard" className="text-blue-400 hover:underline">
                        Back to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
            <SEO title="Edit Campaign | Geobooker Enterprise" />

            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 py-8">
                <div className="container mx-auto px-4">
                    <a
                        href="/advertiser/dashboard"
                        className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </a>
                    <h1 className="text-3xl font-bold text-white">✏️ Edit Campaign</h1>
                    <p className="text-yellow-100 mt-1">
                        {campaign.advertiser_name} • Status: {campaign.status}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="max-w-3xl mx-auto">
                    {/* Status Banner */}
                    {campaign.status === 'pending_review' && (
                        <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mb-6 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-400" />
                            <span className="text-yellow-200">
                                This campaign is pending review. Changes will require re-approval.
                            </span>
                        </div>
                    )}

                    {/* Edit Form */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
                        <h2 className="text-lg font-bold text-white mb-4">Campaign Creative</h2>

                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Ad Image/Video *
                            </label>
                            <div className="border-2 border-dashed border-gray-600 rounded-xl p-6 text-center">
                                {form.imageUrl ? (
                                    <div className="space-y-4">
                                        {form.imageUrl.match(/\.(mp4|webm)$/i) ? (
                                            <video
                                                src={form.imageUrl}
                                                className="max-h-48 mx-auto rounded-lg"
                                                controls
                                            />
                                        ) : (
                                            <img
                                                src={form.imageUrl}
                                                alt="Preview"
                                                className="max-h-48 mx-auto rounded-lg"
                                            />
                                        )}
                                        <label className="inline-block cursor-pointer bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                                            <input
                                                type="file"
                                                accept="image/*,video/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                disabled={uploading}
                                            />
                                            {uploading ? 'Uploading...' : 'Change Image'}
                                        </label>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer block">
                                        <input
                                            type="file"
                                            accept="image/*,video/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                        <Upload className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                                        <p className="text-gray-400">
                                            {uploading ? 'Uploading...' : 'Click to upload image or video'}
                                        </p>
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Headline */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Headline *
                            </label>
                            <input
                                type="text"
                                value={form.headline}
                                onChange={(e) => handleChange('headline', e.target.value)}
                                placeholder="Your attention-grabbing headline"
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                maxLength={80}
                            />
                            <p className="text-xs text-gray-500 mt-1">{form.headline.length}/80 characters</p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-2">
                                Description
                            </label>
                            <textarea
                                value={form.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Brief description of your offer"
                                rows={3}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                maxLength={150}
                            />
                            <p className="text-xs text-gray-500 mt-1">{form.description.length}/150 characters</p>
                        </div>

                        {/* CTA */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">
                                    Button Text
                                </label>
                                <input
                                    type="text"
                                    value={form.ctaText}
                                    onChange={(e) => handleChange('ctaText', e.target.value)}
                                    placeholder="Learn More"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">
                                    Button URL
                                </label>
                                <input
                                    type="url"
                                    value={form.ctaUrl}
                                    onChange={(e) => handleChange('ctaUrl', e.target.value)}
                                    placeholder="https://example.com"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="flex gap-4 pt-4 border-t border-gray-700">
                            <button
                                onClick={() => navigate('/advertiser/dashboard')}
                                className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.headline || !form.imageUrl}
                                className="flex-1 bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-500 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Campaign Info (Read Only) */}
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mt-6">
                        <h3 className="text-sm font-bold text-gray-400 mb-4">Campaign Details (Read Only)</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">Countries:</span>
                                <span className="text-white ml-2">{campaign.target_countries?.join(', ') || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Cities:</span>
                                <span className="text-white ml-2">{campaign.target_cities?.length || 0} cities</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Start:</span>
                                <span className="text-white ml-2">{campaign.start_date || 'TBD'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">End:</span>
                                <span className="text-white ml-2">{campaign.end_date || 'Ongoing'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Budget:</span>
                                <span className="text-green-400 ml-2 font-medium">${campaign.total_budget?.toLocaleString() || 0} USD</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-4">
                            To change targeting or budget, please contact enterprise@geobooker.com.mx
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
