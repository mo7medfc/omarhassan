// Business Cards Pricing Module
// Separate Cost and Sell collections. Quantity-based with smart rounding. Size modifiers.
// No global markup, no fixed percentage.

const BusinessCardsPricing = {
    CATEGORY_ID: 'BusinessCard',
    SELL_COLLECTION: 'business_cards_prices_sell',
    COST_COLLECTION: 'business_cards_prices_cost',
    CONFIG_DOC: 'business_cards_config',

    // Base size for all base prices (cm)
    BASE_SIZE: { width: 9, height: 5 },

    // Default paper types (stored in config, editable by admin)
    DEFAULT_PAPER_TYPES: [
        { id: 'coated_300', nameAr: 'كوشيه 300 جرام' },
        { id: 'coated_350', nameAr: 'كوشيه 350 جرام' },
        { id: 'glossy', nameAr: 'ورق لامع' },
        { id: 'laser', nameAr: 'ورق ليزر' },
        { id: 'crystal', nameAr: 'ورق كريستال' },
        { id: 'italian', nameAr: 'ورق إيطالي' },
        { id: 'bristol_coated_350', nameAr: 'برستول كوشيه 350 جرام' }
    ],

    // Default quantity tiers (editable via config)
    DEFAULT_QUANTITIES: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000],

    // Size modifiers: { width, height, modifierPercent } — modifier applies as multiplier (1 + percent/100)
    DEFAULT_SIZE_MODIFIERS: [
        { width: 9, height: 5.5, modifierPercent: 15 },
        { width: 9.5, height: 5.5, modifierPercent: 20 }
    ],

    /**
     * Get next higher quantity from available tiers (smart rounding)
     * Input 150 → 200, 620 → 700, 1001 → 2000
     */
    getNextHigherQuantity(inputQty, quantities = null) {
        const tiers = quantities || this.DEFAULT_QUANTITIES;
        const qty = Math.ceil(parseFloat(inputQty) || 0);
        if (qty <= 0) return tiers[0] || 100;
        const found = tiers.find(t => t >= qty);
        return found != null ? found : tiers[tiers.length - 1] || 2000;
    },

    /**
     * Get size modifier (1.0 = base, 1.15 = +15%, etc.)
     * Returns 1.0 if size matches base or no modifier found
     */
    getSizeModifier(widthCm, heightCm, modifiers = null) {
        const list = modifiers || this.DEFAULT_SIZE_MODIFIERS;
        const w = parseFloat(widthCm) || 0;
        const h = parseFloat(heightCm) || 0;
        if (w <= 0 || h <= 0) return 1;
        // Check base size (no modifier)
        if (Math.abs(w - this.BASE_SIZE.width) < 0.01 && Math.abs(h - this.BASE_SIZE.height) < 0.01) return 1;
        const m = list.find(x => Math.abs(x.width - w) < 0.01 && Math.abs(x.height - h) < 0.01);
        return m ? (1 + (m.modifierPercent || 0) / 100) : 1;
    },

    /**
     * Build doc ID for a paper type's quantity/sides price
     * Structure: BusinessCard_{paperTypeId}_{quantity}_single | _double
     */
    priceDocId(paperTypeId, quantity, sides) {
        return `BusinessCard_${paperTypeId}_${quantity}_${sides}`;
    }
};

window.BusinessCardsPricing = BusinessCardsPricing;
