// src/services/notificationService.js
/**
 * Notification Service
 * Handles sending emails via Netlify functions
 */

const NOTIFICATION_ENDPOINT = '/.netlify/functions/send-notification-email';

/**
 * Send a notification email
 * @param {string} type - Type of notification
 * @param {object} data - Data for the email template
 */
async function sendNotification(type, data) {
    try {
        const response = await fetch(NOTIFICATION_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, data })
        });

        if (!response.ok) {
            throw new Error('Failed to send notification');
        }

        return await response.json();
    } catch (error) {
        console.error('Notification error:', error);
        // Don't throw - notifications are non-critical
        return { success: false, error: error.message };
    }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email, name) {
    return sendNotification('welcome', { email, name });
}

/**
 * Send business approved email
 */
export async function sendBusinessApprovedEmail(email, name, businessName, businessId) {
    return sendNotification('business_approved', {
        email,
        name,
        businessName,
        businessId
    });
}

/**
 * Send business rejected email
 */
export async function sendBusinessRejectedEmail(email, name, businessName, reason) {
    return sendNotification('business_rejected', {
        email,
        name,
        businessName,
        reason
    });
}

/**
 * Send campaign approved email
 */
export async function sendCampaignApprovedEmail(email, name, adSpace, startDate, budget) {
    return sendNotification('campaign_approved', {
        email,
        name,
        adSpace,
        startDate,
        budget
    });
}

/**
 * Send referral bonus email
 */
export async function sendReferralBonusEmail(email, name, referredName, reward, totalReferrals, level) {
    return sendNotification('referral_bonus', {
        email,
        name,
        referredName,
        reward,
        totalReferrals,
        level
    });
}

/**
 * Notify admin about new business pending approval
 */
export async function notifyAdminNewBusiness(businessData) {
    const ADMIN_ENDPOINT = '/.netlify/functions/notify-admin-campaign';
    try {
        await fetch(ADMIN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign: businessData })
        });
    } catch (error) {
        console.error('Admin notification error:', error);
    }
}

export default {
    sendWelcomeEmail,
    sendBusinessApprovedEmail,
    sendBusinessRejectedEmail,
    sendCampaignApprovedEmail,
    sendReferralBonusEmail,
    notifyAdminNewBusiness
};
