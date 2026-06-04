// Zikr Medals (مدليات الأذكار) Pricing Module
// product_prices_sell, product_prices_cost - separate collections
// Tier-based: baseQty + giftQty, next-higher tier selection

const ZikrMedalPricing = {
    CATEGORY_ID: 'ZikrMedal',

    // Tiers: baseQty → giftQty (sorted by baseQty ascending)
    TIERS: [
        { id: 'tier_50', baseQty: 50, giftQty: 5 },
        { id: 'tier_100', baseQty: 100, giftQty: 10 },
        { id: 'tier_150', baseQty: 150, giftQty: 15 },
        { id: 'tier_200', baseQty: 200, giftQty: 20 },
        { id: 'tier_250', baseQty: 250, giftQty: 25 },
        { id: 'tier_300', baseQty: 300, giftQty: 30 },
        { id: 'tier_350', baseQty: 350, giftQty: 35 },
        { id: 'tier_400', baseQty: 400, giftQty: 40 },
        { id: 'tier_450', baseQty: 450, giftQty: 45 },
        { id: 'tier_500', baseQty: 500, giftQty: 50 },
        { id: 'tier_550', baseQty: 550, giftQty: 55 },
        { id: 'tier_600', baseQty: 600, giftQty: 60 },
        { id: 'tier_650', baseQty: 650, giftQty: 65 },
        { id: 'tier_700', baseQty: 700, giftQty: 70 },
        { id: 'tier_750', baseQty: 750, giftQty: 75 },
        { id: 'tier_800', baseQty: 800, giftQty: 80 },
        { id: 'tier_850', baseQty: 850, giftQty: 85 },
        { id: 'tier_900', baseQty: 900, giftQty: 90 },
        { id: 'tier_950', baseQty: 950, giftQty: 95 },
        { id: 'tier_1000', baseQty: 1000, giftQty: 100 },
        { id: 'tier_1100', baseQty: 1100, giftQty: 110 },
        { id: 'tier_1200', baseQty: 1200, giftQty: 120 },
        { id: 'tier_1300', baseQty: 1300, giftQty: 130 },
        { id: 'tier_1400', baseQty: 1400, giftQty: 140 },
        { id: 'tier_1500', baseQty: 1500, giftQty: 150 },
        { id: 'tier_1600', baseQty: 1600, giftQty: 160 },
        { id: 'tier_1700', baseQty: 1700, giftQty: 170 },
        { id: 'tier_1800', baseQty: 1800, giftQty: 180 },
        { id: 'tier_1900', baseQty: 1900, giftQty: 190 },
        { id: 'tier_2000', baseQty: 2000, giftQty: 200 },
        { id: 'tier_3000', baseQty: 3000, giftQty: 300 },
        { id: 'tier_4000', baseQty: 4000, giftQty: 400 },
        { id: 'tier_5000', baseQty: 5000, giftQty: 500 },
        { id: 'tier_6000', baseQty: 6000, giftQty: 600 },
        { id: 'tier_7000', baseQty: 7000, giftQty: 700 },
        { id: 'tier_8000', baseQty: 8000, giftQty: 800 },
        { id: 'tier_9000', baseQty: 9000, giftQty: 900 },
        { id: 'tier_10000', baseQty: 10000, giftQty: 1000 }
    ],

    // Add-on: ورق زيادة (Extra paper) - price per sheet
    // Total = (pricePerSheet × numExtraSheets) × medalsQuantity
    ADDONS: [
        { id: 'addon_extra_paper', nameAr: 'ورق زيادة (بالوحدة)', unit: 'per_sheet' }
    ],

    docId(productId) {
        return `${this.CATEGORY_ID}_${productId}`;
    },

    /**
     * Get the NEXT HIGHER tier for the given quantity.
     * If qty doesn't match a tier exactly, select the smallest tier where baseQty >= qty.
     */
    getNextHigherTier(qty) {
        const n = parseInt(qty, 10) || 0;
        if (n <= 0) return null;
        return this.TIERS.find(t => t.baseQty >= n) || this.TIERS[this.TIERS.length - 1];
    },

    getAllProducts() {
        const tiers = this.TIERS.map(t => ({
            id: t.id,
            name: `${t.baseQty} ميدالية + ${t.giftQty} هدية`,
            unit: 'fixed',
            section: 'tier',
            baseQty: t.baseQty,
            giftQty: t.giftQty
        }));
        const addons = this.ADDONS.map(a => ({
            id: a.id,
            name: a.nameAr,
            unit: a.unit || 'per_sheet',
            section: 'addon'
        }));
        return [...tiers, ...addons];
    }
};

window.ZikrMedalPricing = ZikrMedalPricing;
