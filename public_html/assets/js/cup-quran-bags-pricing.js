// Cup with Sticker, Qurans, Baby Shower Bags (كوباية بالاستيكر – مصاحف – شنط سبوع) Pricing Module
// 3 sub-bands with different pricing models:
//   1. cup_sticker: 3 types, total price per tier (not per-unit)
//   2. quran: tier-based, quantity × per-unit price
//   3. soboa_bags: 2 sizes, tier-based, quantity × per-unit price

const CupQuranBagsPricing = {
    CATEGORY_ID: 'cup_quran_bags',
    SELL_COLLECTION: 'cup_quran_bags_prices_sell',
    COST_COLLECTION: 'cup_quran_bags_prices_cost',

    // ========== SUB-BANDS ==========
    SUB_BANDS: [
        { id: 'cup_sticker', nameAr: 'كوباية بالاستيكر', icon: 'fa-mug-hot' },
        { id: 'quran',       nameAr: 'مصاحف',           icon: 'fa-quran' },
        { id: 'soboa_bags',  nameAr: 'شنط سبوع',        icon: 'fa-shopping-bag' }
    ],

    // ========== CUP STICKER: 3 types, total-price tiers ==========
    CUP_STICKER_TYPES: [
        { id: 'sticker_only',       nameAr: 'الاستيكر فقط' },
        { id: 'cup_only',           nameAr: 'الكوباية فقط' },
        { id: 'cup_with_sticker',   nameAr: 'الكوباية بالاستيكر' }
    ],

    CUP_STICKER_TIERS: [
        { id: 'tier_50',   baseQty: 50 },
        { id: 'tier_100',  baseQty: 100 },
        { id: 'tier_200',  baseQty: 200 },
        { id: 'tier_300',  baseQty: 300 },
        { id: 'tier_400',  baseQty: 400 },
        { id: 'tier_500',  baseQty: 500 },
        { id: 'tier_600',  baseQty: 600 },
        { id: 'tier_700',  baseQty: 700 },
        { id: 'tier_800',  baseQty: 800 },
        { id: 'tier_900',  baseQty: 900 },
        { id: 'tier_1000', baseQty: 1000 },
        { id: 'tier_1500', baseQty: 1500 },
        { id: 'tier_2000', baseQty: 2000 }
    ],

    // ========== QURAN: same medal tiers, qty × unit price ==========
    QURAN_TIERS: [
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

    // ========== SOBOA BAGS: 2 sizes, same medal tiers, qty × unit price ==========
    SOBOA_BAGS_SIZES: [
        { id: 'size_20x25', nameAr: '20×25' },
        { id: 'size_25x25', nameAr: '25×25' }
    ],

    SOBOA_BAGS_TIERS: [
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

    // ========== HELPERS ==========
    getSubBandById(id) {
        return this.SUB_BANDS.find(b => b.id === id) || null;
    },

    getTiersForSubBand(subBandId) {
        if (subBandId === 'cup_sticker') return this.CUP_STICKER_TIERS;
        if (subBandId === 'quran') return this.QURAN_TIERS;
        if (subBandId === 'soboa_bags') return this.SOBOA_BAGS_TIERS;
        return [];
    },

    getNextHigherTier(tiers, qty) {
        const n = parseInt(qty, 10) || 0;
        if (n <= 0) return null;
        return tiers.find(t => t.baseQty >= n) || tiers[tiers.length - 1];
    },

    /**
     * Build Firestore pricing key
     * cup_sticker:  'cup_sticker__sticker_only__tier_100'
     * quran:        'quran__tier_100'
     * soboa_bags:   'soboa_bags__size_20x25__tier_100'
     */
    priceKey(subBandId, variantId, tierId) {
        if (variantId) return `${subBandId}__${variantId}__${tierId}`;
        return `${subBandId}__${tierId}`;
    },

    getAllProducts() {
        const products = [];
        // Cup sticker
        for (const type of this.CUP_STICKER_TYPES) {
            for (const tier of this.CUP_STICKER_TIERS) {
                const key = this.priceKey('cup_sticker', type.id, tier.id);
                products.push({ id: key, name: `كوباية بالاستيكر — ${type.nameAr} — ${tier.baseQty}`, subBandId: 'cup_sticker', variantId: type.id, tierId: tier.id, baseQty: tier.baseQty });
            }
        }
        // Quran
        for (const tier of this.QURAN_TIERS) {
            const key = this.priceKey('quran', null, tier.id);
            products.push({ id: key, name: `مصاحف — ${tier.baseQty}`, subBandId: 'quran', variantId: null, tierId: tier.id, baseQty: tier.baseQty });
        }
        // Soboa bags
        for (const size of this.SOBOA_BAGS_SIZES) {
            for (const tier of this.SOBOA_BAGS_TIERS) {
                const key = this.priceKey('soboa_bags', size.id, tier.id);
                products.push({ id: key, name: `شنط سبوع — ${size.nameAr} — ${tier.baseQty}`, subBandId: 'soboa_bags', variantId: size.id, tierId: tier.id, baseQty: tier.baseQty });
            }
        }
        return products;
    },

    /**
     * Calculate price for cup_sticker sub-band
     * Price is TOTAL (not per-unit)
     */
    calculateCupSticker(params) {
        const { typeId = '', quantity = 0, prices = {} } = params;
        if (!typeId || quantity <= 0) return null;
        const type = this.CUP_STICKER_TYPES.find(t => t.id === typeId);
        if (!type) return null;
        const tier = this.getNextHigherTier(this.CUP_STICKER_TIERS, quantity);
        if (!tier) return null;
        const key = this.priceKey('cup_sticker', typeId, tier.id);
        const totalPrice = parseFloat(prices[key]) || 0;
        return {
            subBandId: 'cup_sticker',
            subBandNameAr: 'كوباية بالاستيكر',
            typeId,
            typeNameAr: type.nameAr,
            quantity,
            tierId: tier.id,
            tierQty: tier.baseQty,
            unitPrice: quantity > 0 ? totalPrice / quantity : 0,
            grandTotal: totalPrice,
            pricingMode: 'total'
        };
    },

    /**
     * Calculate price for quran sub-band
     * Price = quantity × unit price
     */
    calculateQuran(params) {
        const { quantity = 0, prices = {} } = params;
        if (quantity <= 0) return null;
        const tier = this.getNextHigherTier(this.QURAN_TIERS, quantity);
        if (!tier) return null;
        const key = this.priceKey('quran', null, tier.id);
        const unitPrice = parseFloat(prices[key]) || 0;
        const grandTotal = quantity * unitPrice;
        return {
            subBandId: 'quran',
            subBandNameAr: 'مصاحف',
            typeId: null,
            typeNameAr: null,
            quantity,
            tierId: tier.id,
            tierQty: tier.baseQty,
            unitPrice,
            grandTotal,
            pricingMode: 'unit'
        };
    },

    /**
     * Calculate price for soboa_bags sub-band
     * Price = quantity × unit price (per size)
     */
    calculateSoboaBags(params) {
        const { sizeId = '', quantity = 0, prices = {} } = params;
        if (!sizeId || quantity <= 0) return null;
        const size = this.SOBOA_BAGS_SIZES.find(s => s.id === sizeId);
        if (!size) return null;
        const tier = this.getNextHigherTier(this.SOBOA_BAGS_TIERS, quantity);
        if (!tier) return null;
        const key = this.priceKey('soboa_bags', sizeId, tier.id);
        const unitPrice = parseFloat(prices[key]) || 0;
        const grandTotal = quantity * unitPrice;
        return {
            subBandId: 'soboa_bags',
            subBandNameAr: 'شنط سبوع',
            typeId: sizeId,
            typeNameAr: size.nameAr,
            quantity,
            tierId: tier.id,
            tierQty: tier.baseQty,
            unitPrice,
            grandTotal,
            pricingMode: 'unit'
        };
    },

    /**
     * Unified calculate dispatcher
     */
    calculate(params) {
        const { subBandId } = params;
        if (subBandId === 'cup_sticker') return this.calculateCupSticker(params);
        if (subBandId === 'quran') return this.calculateQuran(params);
        if (subBandId === 'soboa_bags') return this.calculateSoboaBags(params);
        return null;
    }
};

window.CupQuranBagsPricing = CupQuranBagsPricing;
