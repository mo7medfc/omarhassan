// Boxes (البوكسات) Pricing Module
// 2 types: brown (بني) and white (أبيض), 16 predefined sizes
// Tier-based pricing: quantity × per-unit price
// Optional printing addon with separate tier-based pricing

const BoxesPricing = {
    CATEGORY_ID: 'boxes',
    SELL_COLLECTION: 'boxes_prices_sell',
    COST_COLLECTION: 'boxes_prices_cost',

    // Box types
    BOX_TYPES: [
        { id: 'brown', nameAr: 'بوكس بني' },
        { id: 'white', nameAr: 'بوكس أبيض' }
    ],

    // Predefined sizes (L×W×H) — shared by both types
    SIZES: [
        { id: 'size_30x25x9',      nameAr: '30×25×9' },
        { id: 'size_35x23x7',      nameAr: '35×23×7' },
        { id: 'size_30x30x6',      nameAr: '30×30×6' },
        { id: 'size_24x20x10_5',   nameAr: '24×20×10.5' },
        { id: 'size_40x30x10',     nameAr: '40×30×10' },
        { id: 'size_20x20x6',      nameAr: '20×20×6' },
        { id: 'size_13x13x13',     nameAr: '13×13×13' },
        { id: 'size_13x13x10',     nameAr: '13×13×10' },
        { id: 'size_12x9x10',      nameAr: '12×9×10' },
        { id: 'size_35x25x8',      nameAr: '35×25×8' },
        { id: 'size_40x40x8',      nameAr: '40×40×8' },
        { id: 'size_35x35x7',      nameAr: '35×35×7' },
        { id: 'size_20x15x5',      nameAr: '20×15×5' },
        { id: 'size_10x10x5',      nameAr: '10×10×5' },
        { id: 'size_25x25x8',      nameAr: '25×25×8' },
        { id: 'size_25x25x5_5',    nameAr: '25×25×5.5' }
    ],

    // Quantity tiers (same as medals pattern)
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

    // Printing tiers (separate pricing, same tier structure)
    PRINTING_TIERS: [
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
    getBoxTypeById(id) {
        return this.BOX_TYPES.find(t => t.id === id) || null;
    },

    getSizeById(id) {
        return this.SIZES.find(s => s.id === id) || null;
    },

    getNextHigherTier(tiers, qty) {
        const n = parseInt(qty, 10) || 0;
        if (n <= 0) return null;
        return tiers.find(t => t.baseQty >= n) || tiers[tiers.length - 1];
    },

    /**
     * Build Firestore pricing key
     * Box price:      'brown__size_30x25x9__tier_100'
     * Printing price:  'printing__tier_100'
     */
    priceKey(typeId, sizeId, tierId) {
        return `${typeId}__${sizeId}__${tierId}`;
    },

    printingPriceKey(tierId) {
        return `printing__${tierId}`;
    },

    getAllProducts() {
        const products = [];
        // Box prices per type × size × tier
        for (const type of this.BOX_TYPES) {
            for (const size of this.SIZES) {
                for (const tier of this.TIERS) {
                    const key = this.priceKey(type.id, size.id, tier.id);
                    products.push({
                        id: key,
                        name: `${type.nameAr} ${size.nameAr} — ${tier.baseQty}`,
                        typeId: type.id,
                        sizeId: size.id,
                        tierId: tier.id,
                        baseQty: tier.baseQty
                    });
                }
            }
        }
        // Printing prices per tier
        for (const tier of this.PRINTING_TIERS) {
            const key = this.printingPriceKey(tier.id);
            products.push({
                id: key,
                name: `طباعة بوكس — ${tier.baseQty}`,
                typeId: 'printing',
                sizeId: null,
                tierId: tier.id,
                baseQty: tier.baseQty
            });
        }
        return products;
    },

    /**
     * Calculate box price
     * @returns {{ typeId, typeNameAr, sizeId, sizeNameAr, quantity, tierId, tierQty, unitPrice, grandTotal }}
     */
    calculateBox(params) {
        const { typeId = '', sizeId = '', quantity = 0, prices = {} } = params;
        if (!typeId || !sizeId || quantity <= 0) return null;

        const type = this.getBoxTypeById(typeId);
        const size = this.getSizeById(sizeId);
        if (!type || !size) return null;

        const tier = this.getNextHigherTier(this.TIERS, quantity);
        if (!tier) return null;

        const key = this.priceKey(typeId, sizeId, tier.id);
        const unitPrice = parseFloat(prices[key]) || 0;
        const grandTotal = quantity * unitPrice;

        return {
            typeId,
            typeNameAr: type.nameAr,
            sizeId,
            sizeNameAr: size.nameAr,
            quantity,
            tierId: tier.id,
            tierQty: tier.baseQty,
            unitPrice,
            grandTotal
        };
    },

    /**
     * Calculate printing addon price
     * @returns {{ quantity, tierId, tierQty, unitPrice, grandTotal }}
     */
    calculatePrinting(params) {
        const { quantity = 0, prices = {} } = params;
        if (quantity <= 0) return null;

        const tier = this.getNextHigherTier(this.PRINTING_TIERS, quantity);
        if (!tier) return null;

        const key = this.printingPriceKey(tier.id);
        const unitPrice = parseFloat(prices[key]) || 0;
        const grandTotal = quantity * unitPrice;

        return {
            quantity,
            tierId: tier.id,
            tierQty: tier.baseQty,
            unitPrice,
            grandTotal
        };
    }
};

window.BoxesPricing = BoxesPricing;
