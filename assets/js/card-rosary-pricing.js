// Card with Rosary (كارت بسبحة) Pricing Module
// Tier-based pricing like ZikrMedal: 50, 100, 150 ... 10000
// 5 sub-items with variants

const CardRosaryPricing = {
    CATEGORY_ID: 'card_rosary',
    SELL_COLLECTION: 'card_rosary_prices_sell',
    COST_COLLECTION: 'card_rosary_prices_cost',

    // Sub-items
    SUB_ITEMS: [
        { id: 'card_single',              nameAr: 'كارت فقط — وش واحد',          section: 'card' },
        { id: 'card_double',              nameAr: 'كارت فقط — وش وضهر',          section: 'card' },
        { id: 'electronic_rosary',        nameAr: 'سبحة إلكترونية',               section: 'rosary' },
        { id: 'regular_rosary',           nameAr: 'سبحة عادية',                   section: 'rosary' },
        { id: 'regular_rosary_coin_wood', nameAr: 'سبحة عادية + كوين خشب',       section: 'rosary_coin' },
        { id: 'regular_rosary_coin_acrylic', nameAr: 'سبحة عادية + كوين اكريلك', section: 'rosary_coin' },
        { id: 'coin_wood',               nameAr: 'كوين فقط — خشب',               section: 'coin' },
        { id: 'coin_acrylic',            nameAr: 'كوين فقط — اكريلك',            section: 'coin' }
    ],

    // Tiers: 50, 100, 150, 200, ... 1000, then 1100..2000, then 3000..10000
    TIERS: (function() {
        const tiers = [];
        for (let q = 50; q <= 1000; q += 50) {
            tiers.push({ id: `tier_${q}`, baseQty: q });
        }
        for (let q = 1100; q <= 2000; q += 100) {
            tiers.push({ id: `tier_${q}`, baseQty: q });
        }
        for (let q = 3000; q <= 10000; q += 1000) {
            tiers.push({ id: `tier_${q}`, baseQty: q });
        }
        return tiers;
    })(),

    getSubItemById(id) {
        return this.SUB_ITEMS.find(s => s.id === id) || null;
    },

    /**
     * Get the next higher tier for given quantity
     * If qty doesn't match exactly, pick smallest tier where baseQty >= qty
     */
    getNextHigherTier(qty) {
        const n = parseInt(qty, 10) || 0;
        if (n <= 0) return null;
        return this.TIERS.find(t => t.baseQty >= n) || this.TIERS[this.TIERS.length - 1];
    },

    /**
     * Build Firestore pricing doc key: subItemId + tierId
     * e.g. 'card_single__tier_100'
     */
    priceKey(subItemId, tierId) {
        return `${subItemId}__${tierId}`;
    },

    getAllProducts() {
        const products = [];
        for (const sub of this.SUB_ITEMS) {
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
     * Calculate price for a card/rosary order
     * @param {Object} params
     * @param {string} params.subItemId - e.g. 'card_single'
     * @param {number} params.quantity - user-entered qty
     * @param {Object} params.prices - { 'subItemId__tierId': price } from Firestore
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
        const tierPrice = parseFloat(prices[key]) || 0;

        return {
            subItemId,
            subItemNameAr: subItem.nameAr,
            quantity,
            tierId: tier.id,
            tierQty: tier.baseQty,
            tierPrice,
            grandTotal: tierPrice
        };
    }
};

window.CardRosaryPricing = CardRosaryPricing;
