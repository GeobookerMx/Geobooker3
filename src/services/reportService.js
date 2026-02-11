import { supabase } from '../lib/supabase';

/**
 * Service to handle User Generated Content (UGC) reporting
 * Complies with App Store requirements for content moderation
 */
export const reportService = {
    /**
     * Report a piece of content (review, comment, post, business)
     * @param {Object} reportData 
     * @param {string} reportData.content_type - 'review', 'comment', 'post', 'business'
     * @param {string} reportData.content_id - ID of the content being reported
     * @param {string} reportData.reason - Short reason (e.g., 'spam', 'inappropriate')
     * @param {string} reportData.details - Detailed explanation
     * @returns {Promise<{success: boolean, error: any}>}
     */
    async reportContent({ content_type, content_id, reason, details }) {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('content_reports')
                .insert({
                    reporter_id: user?.id || null, // Allow anonymous reporting if config allows
                    content_type,
                    content_id,
                    reason,
                    details,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });

            if (error) {
                // Fallback to business_reports if content_reports doesn't exist yet
                // and content_type is business
                if (content_type === 'business' && error.code === '42P01') {
                    return this.reportBusinessLegacy({ content_id, reason, details });
                }
                throw error;
            }

            return { success: true };
        } catch (error) {
            console.error('Error reporting content:', error);
            return { success: false, error };
        }
    },

    /**
     * Legacy method for business reports
     */
    async reportBusinessLegacy({ content_id, reason, details }) {
        try {
            const { data, error } = await supabase
                .from('business_reports')
                .insert({
                    business_id: content_id,
                    reason,
                    details,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error reporting business (legacy):', error);
            return { success: false, error };
        }
    }
};
