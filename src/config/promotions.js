// src/config/promotions.js
// Configuración centralizada de promociones y modelo de negocio

export const PROMOTIONS = {
    // Fecha límite para Premium gratis (formato ISO)
    PREMIUM_FREE_UNTIL: '2027-01-01',

    // Requisitos para obtener 2 negocios gratis
    REFERRAL_BONUS: {
        FREE_BUSINESSES: 2,           // Número de negocios gratis
        REQUIRED_INVITATIONS: 10,     // Invitaciones enviadas necesarias
        REQUIRED_SIGNUPS: 5,          // Usuarios registrados necesarios
    },

    // Límite de negocios por plan
    BUSINESS_LIMITS: {
        FREE: 1,
        FREE_WITH_REFERRALS: 2,
        PREMIUM: 5,
    }
};

/**
 * Verifica si la promoción de Premium gratis está activa
 * @returns {boolean}
 */
export const isPremiumPromoActive = () => {
    const deadline = new Date(PROMOTIONS.PREMIUM_FREE_UNTIL);
    return new Date() < deadline;
};

/**
 * Obtiene días restantes de la promoción
 * @returns {number}
 */
export const getDaysRemaining = () => {
    const deadline = new Date(PROMOTIONS.PREMIUM_FREE_UNTIL);
    const now = new Date();
    const diffTime = deadline - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Mensaje de promoción para mostrar en UI
 * @returns {string}
 */
export const getPromoMessage = () => {
    const days = getDaysRemaining();
    if (days <= 0) return null;
    if (days <= 7) return `¡Solo ${days} días para Premium GRATIS!`;
    if (days <= 30) return `🎉 Premium GRATIS por ${days} días más`;
    return '🚀 ¡Regístrate y obtén Premium GRATIS!';
};

/**
 * Verifica si un usuario califica para negocios extra por referidos
 * @param {number} invitationsSent - Invitaciones enviadas
 * @param {number} signupsReferred - Usuarios que se registraron
 * @returns {boolean}
 */
export const qualifiesForReferralBonus = (invitationsSent, signupsReferred) => {
    return (
        invitationsSent >= PROMOTIONS.REFERRAL_BONUS.REQUIRED_INVITATIONS &&
        signupsReferred >= PROMOTIONS.REFERRAL_BONUS.REQUIRED_SIGNUPS
    );
};

/**
 * Calcula cuántos negocios puede tener un usuario
 * @param {boolean} isPremium 
 * @param {boolean} hasReferralBonus 
 * @returns {number}
 */
export const getBusinessLimit = (isPremium, hasReferralBonus) => {
    if (isPremium) return PROMOTIONS.BUSINESS_LIMITS.PREMIUM;
    if (hasReferralBonus) return PROMOTIONS.BUSINESS_LIMITS.FREE_WITH_REFERRALS;
    return PROMOTIONS.BUSINESS_LIMITS.FREE;
};
