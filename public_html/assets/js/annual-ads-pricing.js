// Annual Advertising (دعاية سنوية) Pricing Module
// Tier-based pricing: quantity × per-unit price from matching tier
// 13 default sub-items + dynamic custom sub-items from Firestore

const AnnualAdsPricing = {
    CATEGORY_ID: 'annual_ads',
    SELL_COLLECTION: 'annual_ads_prices_sell',
    COST_COLLECTION: 'annual_ads_prices_cost',

    // Default sub-items
    DEFAULT_SUB_ITEMS: [
        { id: 'wall_calendar_digital',       nameAr: 'نتيجة حائط ورقية ديجيتال' },
        { id: 'wall_calendar_offset',        nameAr: 'نتيجة حائط ورقية أوفست' },
        { id: 'wall_calendar_wood_laser',    nameAr: 'نتيجة حائط خشب حفر ليزر' },
        { id: 'pyramid_digital_7',           nameAr: 'نتيجة هرمية ديجيتال 7 ورقات' },
        { id: 'pyramid_digital_13',          nameAr: 'نتيجة هرمية ديجيتال 13 ورقة' },
        { id: 'pyramid_offset_7',            nameAr: 'نتيجة هرمية أوفست 7 ورقات' },
        { id: 'pyramid_offset_13',           nameAr: 'نتيجة هرمية أوفست 13 ورقة' },
        { id: 'block_regular',               nameAr: 'بلوك عادي' },
        { id: 'block_mottaheda',             nameAr: 'بلوك المتحدة' },
        { id: 'block_etihad',               nameAr: 'بلوك الاتحاد' },
        { id: 'agenda_regular',              nameAr: 'أجندة عادية' },
        { id: 'agenda_medium',               nameAr: 'أجندة وسط' },
        { id: 'agenda_vip',                  nameAr: 'أجندة VIP' }
    ],

    // Custom sub-items loaded from Firestore (populated at runtime)
    _customSubItems: [],

    // Tiers: 50, 100, 150, 200, 300, 500, 1000, 2000, 3000, 5000, 10000
    TIERS: [
        { id: 'tier_50',    baseQty: 50 },
        { id: 'tier_100',   baseQty: 100 },
        { id: 'tier_150',   baseQty: 150 },
        { id: 'tier_200',   baseQty: 200 },
        { id: 'tier_300',   baseQty: 300 },
        { id: 'tier_500',   baseQty: 500 },
        { id: 'tier_1000',  baseQty: 1000 },
        { id: 'tier_2000',  baseQty: 2000 },
        { id: 'tier_3000',  baseQty: 3000 },
        { id: 'tier_5000',  baseQty: 5000 },
        { id: 'tier_10000', baseQty: 10000 }
    ],

    /** Get all sub-items (default + custom) */
    getSubItems() {
        return [...this.DEFAULT_SUB_ITEMS, ...this._customSubItems];
    },

    /** Set custom sub-items loaded from Firestore */
    setCustomSubItems(items) {
        this._customSubItems = Array.isArray(items) ? items : [];
    },

    getSubItemById(id) {
        return this.getSubItems().find(s => s.id === id) || null;
    },

    /**
     * Get the next higher tier for given quantity.
     * If qty doesn't match exactly, pick smallest tier where baseQty >= qty.
     */
    getNextHigherTier(qty) {
        const n = parseInt(qty, 10) || 0;
        if (n <= 0) return null;
        return this.TIERS.find(t => t.baseQty >= n) || this.TIERS[this.TIERS.length - 1];
    },

    /**
     * Build Firestore pricing doc key: subItemId + tierId
     * e.g. 'wall_calendar_digital__tier_100'
     */
    priceKey(subItemId, tierId) {
        return `${subItemId}__${tierId}`;
    },

    getAllProducts() {
        const products = [];
        for (const sub of this.getSubItems()) {
            for (const tier of this.TIERS) {
                products.push({
                    id: this.priceKey(sub.id, tier.id),
                    name: `${sub.nameAr} — ${tier.baseQty}`,
                    subItemId: sub.id,
                    tierId: tier.id,
                    baseQty: tier.baseQty
                });
            }
        }
        return products;
    },

    /**
     * Calculate price for an annual ads order
     * @param {Object} params
     * @param {string} params.subItemId - e.g. 'wall_calendar_digital'
     * @param {number} params.quantity - user-entered qty
     * @param {Object} params.prices - { 'subItemId__tierId': perUnitPrice } from Firestore
     * @returns {Object} breakdown
     */
    calculate(params) {
        const { subItemId = '', quantity = 0, prices = {} } = params;
        if (!subItemId || quantity <= 0) return null;

        const subItem = this.getSubItemById(subItemId);
        if (!subItem) return null;

        const tier = this.getNextHigherTier(quantity);
        if (!tier) return null;

        const key = this.priceKey(subItemId, tier.id);
        const unitPrice = parseFloat(prices[key]) || 0;
        const grandTotal = quantity * unitPrice;

        return {
            subItemId,
            subItemNameAr: subItem.nameAr,
            quantity,
            tierId: tier.id,
            tierQty: tier.baseQty,
            unitPrice,
            grandTotal
        };
    }
};

window.AnnualAdsPricing = AnnualAdsPricing;
