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
                setEnterpriseCampaigns(campaigns);
            } catch (error) {
                console.error('Error loading Enterprise campaigns:', error);
                setEnterpriseCampaigns([]);
            } finally {
                setEnterpriseLoading(false);
            }
        };
        loadEnterprise();
    }, []);

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
