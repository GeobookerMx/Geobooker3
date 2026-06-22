// src/services/notificationService.js
/**
 * Notification Service
 * Handles sending emails via Netlify functions
 */

const NOTIFICATION_ENDPOINT = '/.netlify/functions/send-notification-email';
const ADMIN_ENDPOINT = '/.netlify/functions/notify-admin-campaign';

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
        return { success: false, error: error.message };
    }
}

export async function sendWelcomeEmail(email, name) {
    return sendNotification('welcome', { email, name });
}

export async function sendBusinessApprovedEmail(email, name, businessName, businessId) {
    return sendNotification('business_approved', {
        email,
        name,
        businessName,
        businessId
    });
}

export async function sendBusinessRejectedEmail(email, name, businessName, reason) {
    return sendNotification('business_rejected', {
        email,
        name,
        businessName,
        reason
    });
}

export async function sendCampaignReceivedEmail(payload) {
    return sendNotification('campaign_received', payload);
}

export async function sendCampaignApprovedEmail(email, name, adSpace, startDate, budget, extras = {}) {
    return sendNotification('campaign_approved', {
        email,
        name,
        adSpace,
        startDate,
        budget,
        ...extras
    });
}

export async function sendCampaignRejectedEmail(email, name, adSpace, reason, extras = {}) {
    return sendNotification('campaign_rejected', {
        email,
        name,
        adSpace,
        reason,
        ...extras
    });
}

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

export async function notifyAdminNewCampaign(campaignData) {
    try {
        await fetch(ADMIN_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaign: campaignData })
        });
    } catch (error) {
        console.error('Admin notification error:', error);
    }
}

export async function notifyAdminNewBusiness(businessData) {
    return notifyAdminNewCampaign(businessData);
}

export default {
    sendWelcomeEmail,
    sendBusinessApprovedEmail,
    sendBusinessRejectedEmail,
    sendCampaignReceivedEmail,
    sendCampaignApprovedEmail,
    sendCampaignRejectedEmail,
    sendReferralBonusEmail,
    notifyAdminNewCampaign,
    notifyAdminNewBusiness
};
