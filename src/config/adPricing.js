export const LOCAL_AD_PROMO = {
  discountPercent: 50,
  endDate: new Date('2026-08-01T23:59:59-06:00'),
  isActive() {
    return new Date() < this.endDate;
  }
};

export function getLocalAdPricing(priceMonthly) {
  const basePrice = Number(priceMonthly || 0);
  if (!basePrice || Number.isNaN(basePrice)) {
    return {
      basePrice: 0,
      discountedPrice: 0,
      finalPrice: 0,
      hasDiscount: false,
      discountPercent: 0
    };
  }

  if (!LOCAL_AD_PROMO.isActive()) {
    return {
      basePrice,
      discountedPrice: basePrice,
      finalPrice: basePrice,
      hasDiscount: false,
      discountPercent: 0
    };
  }

  const discountedPrice = Math.round(basePrice * (1 - LOCAL_AD_PROMO.discountPercent / 100));
  return {
    basePrice,
    discountedPrice,
    finalPrice: discountedPrice,
    hasDiscount: true,
    discountPercent: LOCAL_AD_PROMO.discountPercent
  };
}
