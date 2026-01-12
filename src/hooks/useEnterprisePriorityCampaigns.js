// src/hooks/useEnterprisePriorityCampaigns.js
/**
 * Hook that combines Enterprise and Local campaigns with Enterprise Priority
 * 
 * PRIORITY LOGIC:
 * - If Enterprise campaigns exist for user's location → show ONLY Enterprise
 * - If NO Enterprise campaigns → show Local campaigns as fallback
 * 
 * This ensures:
 * - Enterprise clients ($1,250-$25,000) always get priority visibility
 * - Local ads only show when no Enterprise competition
 */
import { useState, useEffect } from 'react';
import { loadEnterpriseCampaigns } from '../services/adService';
import useActiveCampaigns from './useActiveCampaigns';

export default function useEnterprisePriorityCampaigns(localSpaceName, options = {}) {
    const [enterpriseCampaigns, setEnterpriseCampaigns] = useState([]);
    const [enterpriseLoading, setEnterpriseLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    const {
        rotationInterval = 8000,
        autoRotate = true,
        ...localOptions
    } = options;

    // Load Enterprise campaigns with geo-targeting
    useEffect(() => {
        const loadEnterprise = async () => {
            setEnterpriseLoading(true);
            try {
                const country = localStorage.getItem('userCountry') || 'unknown';
                const city = localStorage.getItem('userCity') || 'unknown';
                const campaigns = await loadEnterpriseCampaigns({ country, city });

                // loadEnterpriseCampaigns ya transforma los datos y crea ad_creatives
                // Solo necesitamos procesar URLs de YouTube para thumbnails
                const processedCampaigns = campaigns.map(campaign => {
                    const creative = campaign.ad_creatives?.[0];
                    if (!creative) return campaign;

                    let imageUrl = creative.image_url;
                    const isYouTube = imageUrl?.includes('youtube.com') || imageUrl?.includes('youtu.be');

                    if (isYouTube) {
                        // Extract video ID and use YouTube thumbnail
                        const videoId = extractYouTubeId(imageUrl);
                        if (videoId) {
                            imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                        }
                    }

                    // DEBUG: Log campaign image info
                    console.log(`🖼️ [Campaign] ${campaign.advertiser_name}: image_url=${imageUrl?.substring(0, 50)}`);

                    return {
                        ...campaign,
                        ad_creatives: [{
                            ...creative,
                            image_url: imageUrl,
                            is_youtube: isYouTube,
                            youtube_url: isYouTube ? creative.image_url : null
                        }]
                    };
                });

                setEnterpriseCampaigns(processedCampaigns);
            } catch (error) {
                console.error('Error loading Enterprise campaigns:', error);
                setEnterpriseCampaigns([]);
            } finally {
                setEnterpriseLoading(false);
            }
        };
        loadEnterprise();
    }, []);

    // Helper to extract YouTube video ID
    function extractYouTubeId(url) {
        if (!url) return null;

        // Handle youtube.com/shorts/ID
        const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
        if (shortsMatch) return shortsMatch[1];

        // Handle youtube.com/watch?v=ID
        const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
        if (watchMatch) return watchMatch[1];

        // Handle youtu.be/ID
        const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (shortMatch) return shortMatch[1];

        // Handle youtube.com/embed/ID
        const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
        if (embedMatch) return embedMatch[1];

        return null;
    }

    // Load Local campaigns from ad_spaces
    const {
        campaigns: localCampaigns,
        currentCampaign: localCurrentCampaign,
        hasCampaigns: hasLocal,
        loading: localLoading,
        goToCampaign
    } = useActiveCampaigns(localSpaceName, {
        autoRotate: false, // We handle rotation ourselves
        ...localOptions
    });

    // PRIORITY: Enterprise first, Local only as fallback
    const hasEnterprise = enterpriseCampaigns.length > 0;
    const activeCampaigns = hasEnterprise ? enterpriseCampaigns : localCampaigns;

    // Current campaign based on index
    const currentCampaign = activeCampaigns[currentIndex] || localCurrentCampaign;
    const hasCampaigns = activeCampaigns.length > 0 || hasLocal;
    const loading = enterpriseLoading || localLoading;

    // Auto-rotation
    useEffect(() => {
        if (!autoRotate || activeCampaigns.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % activeCampaigns.length);
        }, hasEnterprise ? rotationInterval : rotationInterval + 2000); // Local rotates slower

        return () => clearInterval(interval);
    }, [activeCampaigns.length, autoRotate, rotationInterval, hasEnterprise]);

    // Navigation functions
    const nextCampaign = () => {
        if (activeCampaigns.length === 0) return;
        setCurrentIndex(prev => (prev + 1) % activeCampaigns.length);
    };

    const prevCampaign = () => {
        if (activeCampaigns.length === 0) return;
        setCurrentIndex(prev => (prev - 1 + activeCampaigns.length) % activeCampaigns.length);
    };

    const goToIndex = (index) => {
        if (index >= 0 && index < activeCampaigns.length) {
            setCurrentIndex(index);
        }
    };

    return {
        // Campaign data
        campaigns: activeCampaigns,
        currentCampaign,
        currentIndex,

        // Status
        loading,
        hasCampaigns,
        hasEnterprise,
        hasLocal,

        // Info about source
        source: hasEnterprise ? 'enterprise' : 'local',
        enterpriseCount: enterpriseCampaigns.length,
        localCount: localCampaigns.length,

        // Navigation
        nextCampaign,
        prevCampaign,
        goToIndex
    };
}
