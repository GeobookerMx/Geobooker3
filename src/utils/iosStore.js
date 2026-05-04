/**
 * Utilidad central para detección de iOS nativo App Store
 * Guideline 3.1.1 & 4 compliance
 */
import { Capacitor } from '@capacitor/core';

/** true cuando corre en la app nativa de iOS (App Store build) */
export const IS_IOS_NATIVE = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

/** true en cualquier entorno nativo (iOS o Android) */
export const IS_NATIVE = Capacitor.isNativePlatform();
