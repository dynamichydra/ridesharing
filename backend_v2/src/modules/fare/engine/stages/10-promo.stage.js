/**
 * Stage 10: Promotions, Coupons & Rider Discounts.
 */
export async function executePromoStage(context) {
  const { request, country, taxes } = context;
  const promoCode = request.promoCode;
  const userId = request.userId || null;

  let promoDetails = null;
  let discountedFareMinor = taxes.postTaxFareMinor;
  let discountAmountMinor = 0;

  if (promoCode) {
    try {
      const { validatePromoCode } = await import('../../../promo/promo.service.js');
      const promoResult = await validatePromoCode(promoCode, taxes.postTaxFareMinor, userId, country.id);

      discountAmountMinor = promoResult.discountAmountMinor || 0;
      discountedFareMinor = promoResult.finalFareMinor;

      promoDetails = {
        promoId: promoResult.promoId,
        code: promoResult.code,
        discountType: promoResult.discountType,
        discountValue: promoResult.discountValue,
        discountAmountMinor,
      };
    } catch (error) {
      // If promo code is invalid, pass through error or return warning
      throw error;
    }
  }

  context.promo = {
    promoDetails,
    discountAmountMinor,
    discountedFareMinor,
  };

  return context;
}
