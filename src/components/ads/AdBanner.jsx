// src/components/ads/AdBanner.jsx
/**
 * Enterprise Ad Banner Component
 * Features:
 * - Video support (max 15s, skip after 7s)
 * - Rotation between multiple ads
 * - Impression tracking
 * - Mobile optimized
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Ad display rules
const AD_RULES = {
    videoMaxDuration: 15,      // seconds
    skipAfterSeconds: 7,       // show skip button after 7s
    rotationInterval: 8000,    // ms - rotate ads every 8 seconds
    impressionThreshold: 0.5,  // 50% visible = impression
    minVisibleTime: 1000,      // 1 second minimum to count
};

export default function AdBanner({
    position = 'hero', // 'hero', 'sidebar', 'native', 'footer'
    campaigns = [],
    className = '',
    showLabel = true
}) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [videoTime, setVideoTime] = useState(0);
    const [canSkip, setCanSkip] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isVisible, setIsVisible] = useState(false);
    const [impressionRecorded, setImpressionRecorded] = useState(false);
    const videoRef = useRef(null);
    const bannerRef = useRef(null);

    const currentAd = campaigns[currentIndex];

    // Rotation logic
    useEffect(() => {
        if (campaigns.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % campaigns.length);
            setVideoTime(0);
            setCanSkip(false);
            setImpressionRecorded(false);
        }, AD_RULES.rotationInterval);

        return () => clearInterval(interval);
    }, [campaigns.length]);

    // Video time tracking
    useEffect(() => {
        if (!currentAd?.isVideo) return;

        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setVideoTime(Math.floor(video.currentTime));
            if (video.currentTime >= AD_RULES.skipAfterSeconds) {
                setCanSkip(true);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [currentAd]);

    // Impression tracking with Intersection Observer
    useEffect(() => {
        if (!bannerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    setIsVisible(entry.isIntersecting);

                    // Record impression when visible
                    if (entry.isIntersecting && !impressionRecorded && currentAd?.id) {
                        setTimeout(() => {
                            recordImpression(currentAd.id);
                            setImpressionRecorded(true);
                        }, AD_RULES.minVisibleTime);
                    }
                });
            },
            { threshold: AD_RULES.impressionThreshold }
        );

        observer.observe(bannerRef.current);
        return () => observer.disconnect();
    }, [currentAd?.id, impressionRecorded]);

    const recordImpression = async (campaignId) => {
        try {
            // Get user location for analytics
            const country = localStorage.getItem('userCountry') || 'unknown';
            const city = localStorage.getItem('userCity') || 'unknown';
            const device = window.innerWidth < 768 ? 'mobile' : 'desktop';

            await supabase.rpc('record_ad_impression', {
                p_campaign_id: campaignId,
                p_country: country,
                p_city: city,
                p_device: device
            });
        } catch (e) {
            console.warn('Impression tracking error:', e);
        }
    };

    const handleClick = async () => {
        if (!currentAd?.ctaUrl) return;

        // Record click
        if (currentAd.id) {
            try {
                await supabase.rpc('record_ad_click', { p_campaign_id: currentAd.id });
            } catch (e) {
                console.warn('Click tracking error:', e);
            }
        }

        // Open URL
        window.open(currentAd.ctaUrl, '_blank', 'noopener,noreferrer');
    };

    const handleSkip = () => {
        // Move to next ad or hide
        if (campaigns.length > 1) {
            setCurrentIndex(prev => (prev + 1) % campaigns.length);
            setVideoTime(0);
            setCanSkip(false);
        }
    };

    if (!campaigns.length || !currentAd) return null;

    // Position-based styles
    const positionStyles = {
        hero: 'w-full max-h-[400px] rounded-xl overflow-hidden shadow-xl',
        sidebar: 'w-full max-w-[300px] rounded-lg overflow-hidden shadow-lg',
        native: 'w-full rounded-lg overflow-hidden shadow-md border border-gray-200',
        footer: 'w-full max-h-[90px] rounded-lg overflow-hidden'
    };

    return (
        <div
            ref={bannerRef}
            className={`relative bg-gray-100 ${positionStyles[position]} ${className}`}
        >
            {/* Ad Label */}
            {showLabel && (
                <div className="absolute top-2 left-2 z-20 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    SPONSORED
                </div>
            )}

            {/* Media: Video or Image */}
            {currentAd.isVideo ? (
                <div className="relative">
                    <video
                        ref={videoRef}
                        src={currentAd.imageUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted={isMuted}
                        loop={currentAd.duration <= 6}
                        playsInline
                    />

                    {/* Video Controls */}
                    <div className="absolute bottom-2 right-2 flex gap-2 z-20">
                        {/* Mute toggle */}
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                        >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>

                        {/* Skip button (after 7s) */}
                        {canSkip && campaigns.length > 1 && (
                            <button
                                onClick={handleSkip}
                                className="bg-black/50 text-white px-3 py-2 rounded-full hover:bg-black/70 text-xs flex items-center gap-1"
                            >
                                Skip <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Time indicator */}
                    {!canSkip && (
                        <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-20">
                            Skip in {AD_RULES.skipAfterSeconds - videoTime}s
                        </div>
                    )}
                </div>
            ) : (
                <img
                    src={currentAd.imageUrl}
                    alt={currentAd.headline || 'Advertisement'}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={handleClick}
                />
            )}

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <h4 className="text-white font-bold text-lg truncate">
                    {currentAd.headline || currentAd.advertiser}
                </h4>
                {currentAd.description && (
                    <p className="text-white/80 text-sm line-clamp-2">{currentAd.description}</p>
                )}

                {currentAd.ctaText && (
                    <button
                        onClick={handleClick}
                        className="mt-2 bg-white text-gray-900 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100 flex items-center gap-1"
                    >
                        {currentAd.ctaText}
                        <ExternalLink className="w-3 h-3" />
                    </button>
                )}
            </div>

            {/* Rotation indicators */}
            {campaigns.length > 1 && (
                <div className="absolute top-2 right-2 flex gap-1 z-20">
                    {campaigns.map((_, idx) => (
                        <div
                            key={idx}
                            className={`w-2 h-2 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/40'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// Helper component for ad preview (in checkout)
export function AdPreview({ ad, className = '' }) {
    return (
        <div className={`bg-white rounded-xl shadow-lg overflow-hidden max-w-sm ${className}`}>
            <div className="relative">
                {ad.isVideo ? (
                    <video
                        src={ad.imageUrl}
                        className="w-full h-40 object-cover"
                        muted
                        autoPlay
                        loop
                    />
                ) : ad.imageUrl ? (
                    <img src={ad.imageUrl} alt="Preview" className="w-full h-40 object-cover" />
                ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                        <span className="text-gray-400">Your image here</span>
                    </div>
                )}
                <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-medium">
                    SPONSORED
                </span>
            </div>
            <div className="p-4">
                <h4 className="font-bold text-gray-900">
                    {ad.headline || 'Your headline here'}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                    {ad.description || 'Your description will appear here...'}
                </p>
                <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-gray-400">{ad.companyName || 'Company'}</span>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                        {ad.ctaText || 'Learn More'}
                    </button>
                </div>
            </div>

            {/* Helper tips */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                    💡 Tip: Videos of 6-15 seconds work best. Skip button appears at 7s.
                </p>
            </div>
        </div>
    );
}
