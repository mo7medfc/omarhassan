// Envelopes Pricing Module - Production-ready, quantity-tier based
// Isolated: envelopes_prices_sell, envelopes_prices_cost
// No global markup, no shared logic with other categories

const EnvelopesPricing = {
    CATEGORY_ID: 'envelopes',
    SELL_COLLECTION: 'envelopes_prices_sell',
    COST_COLLECTION: 'envelopes_prices_cost',

    OFFSET_MIN_QUANTITY: 500,
    PLATE_PRICE_PER_COLOR: 50,

    DEFAULT_QUANTITY_TIERS: [500, 1000, 1500, 2000, 2500, 3000, 5000, 10000],

    PRODUCTS: [
        { id: 'american_22_11', nameAr: 'American 22 × 11', supportsInkjet: true },
        { id: 'a5', nameAr: 'A5 (22.9 × 16.2)', supportsInkjet: true },
        { id: 'a4', nameAr: 'A4 (32.4 × 22.9)', supportsInkjet: false },
        { id: 'half_congratulations', nameAr: 'Half Congratulations (17 × 25)', supportsInkjet: true },
        { id: 'congratulations', nameAr: 'Congratulations (25 × 35)', supportsInkjet: false },
        { id: 'a3', nameAr: 'A3 (33 × 45)', supportsInkjet: false }
    ],

    getTierForQuantity(quantity) {
        const tiers = this.DEFAULT_QUANTITY_TIERS;
        const q = parseInt(quantity, 10) || 0;
        if (q <= 0) return tiers[0];
        for (const tier of tiers) {
            if (q <= tier) return tier;
        }
        return tiers[tiers.length - 1];
    },

    getAllProducts() {
        return this.PRODUCTS.map(p => ({
            id: p.id,
            name: p.nameAr,
            unit: 'tier',
            supportsInkjet: p.supportsInkjet
        }));
    }
};

window.EnvelopesPricing = EnvelopesPricing;
