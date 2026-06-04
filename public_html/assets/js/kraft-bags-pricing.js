// Kraft Bags (شنط كرافت) Pricing Module
// ~30 predefined sizes, tier-based quantity pricing
// Optional printing addon with separate tier-based pricing

const KraftBagsPricing = {
    CATEGORY_ID: 'kraft_bags',
    SELL_COLLECTION: 'kraft_bags_prices_sell',
    COST_COLLECTION: 'kraft_bags_prices_cost',

    // Predefined sizes (W×H cm)
    SIZES: [
        { id: 'size_12x15', nameAr: '12×15' },
        { id: 'size_15x20', nameAr: '15×20' },
        { id: 'size_18x22', nameAr: '18×22' },
        { id: 'size_20x25', nameAr: '20×25' },
        { id: 'size_20x30', nameAr: '20×30' },
        { id: 'size_22x28', nameAr: '22×28' },
        { id: 'size_25x30', nameAr: '25×30' },
        { id: 'size_25x35', nameAr: '25×35' },
        { id: 'size_27x35', nameAr: '27×35' },
        { id: 'size_28x28', nameAr: '28×28' },
        { id: 'size_30x30', nameAr: '30×30' },
        { id: 'size_30x35', nameAr: '30×35' },
        { id: 'size_30x40', nameAr: '30×40' },
        { id: 'size_32x45', nameAr: '32×45' },
        { id: 'size_35x35', nameAr: '35×35' },
        { id: 'size_35x40', nameAr: '35×40' },
        { id: 'size_35x45', nameAr: '35×45' },
        { id: 'size_35x50', nameAr: '35×50' },
        { id: 'size_38x50', nameAr: '38×50' },
        { id: 'size_40x40', nameAr: '40×40' },
        { id: 'size_40x45', nameAr: '40×45' },
        { id: 'size_40x50', nameAr: '40×50' },
        { id: 'size_40x55', nameAr: '40×55' },
        { id: 'size_45x50', nameAr: '45×50' },
        { id: 'size_45x55', nameAr: '45×55' },
        { id: 'size_50x50', nameAr: '50×50' },
        { id: 'size_50x60', nameAr: '50×60' },
        { id: 'size_55x65', nameAr: '55×65' },
        { id: 'size_60x70', nameAr: '60×70' },
        { id: 'size_70x80', nameAr: '70×80' }
    ],

    // Quantity tiers
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

    // Printing tiers (separate pricing per size)
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
    getSizeById(id) {
        return this.SIZES.find(s => s.id === id) || null;
    },

    getNextHigherTier(tiers, qty) {
        const n = parseInt(qty, 10) || 0;
        if (n <= 0) return null;
        return tiers.find(t => t.baseQty >= n) || tiers[tiers.length - 1];
    },

    // Firestore pricing keys
    // Bag price:     'size_25x35__tier_100'
    // Printing price: 'printing__size_25x35__tier_100'
    priceKey(sizeId, tierId) {
        return `${sizeId}__${tierId}`;
    },

    printingPriceKey(sizeId, tierId) {
        return `printing__${sizeId}__${tierId}`;
    },

    getAllProducts() {
        const products = [];
        // Bag prices per size × tier
        for (const size of this.SIZES) {
            for (const tier of this.TIERS) {
                const key = this.priceKey(size.id, tier.id);
                products.push({
                    id: key,
                    name: `شنطة كرافت ${size.nameAr} — ${tier.baseQty}`,
                    sizeId: size.id,
                    tierId: tier.id,
                    baseQty: tier.baseQty
                });
            }
        }
        // Printing prices per size × tier
        for (const size of this.SIZES) {
            for (const tier of this.PRINTING_TIERS) {
                const key = this.printingPriceKey(size.id, tier.id);
                products.push({
                    id: key,
                    name: `طباعة شنطة ${size.nameAr} — ${tier.baseQty}`,
                    sizeId: size.id,
                    tierId: tier.id,
                    baseQty: tier.baseQty,
                    isPrinting: true
                });
            }
        }
        return products;
    },

    /**
     * Calculate bag price
     * @returns {{ sizeId, sizeNameAr, quantity, tierId, tierQty, unitPrice, grandTotal }}
     */
    calculateBag(params) {
        const { sizeId = '', quantity = 0, prices = {} } = params;
        if (!sizeId || quantity <= 0) return null;

        const size = this.getSizeById(sizeId);
        if (!size) return null;

        const tier = this.getNextHigherTier(this.TIERS, quantity);
        if (!tier) return null;

        const key = this.priceKey(sizeId, tier.id);
        const unitPrice = parseFloat(prices[key]) || 0;
        const grandTotal = quantity * unitPrice;

        return {
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
     * Calculate printing addon price (per size)
     * @returns {{ sizeId, quantity, tierId, tierQty, unitPrice, grandTotal }}
     */
    calculatePrinting(params) {
        const { sizeId = '', quantity = 0, prices = {} } = params;
        if (!sizeId || quantity <= 0) return null;

        const tier = this.getNextHigherTier(this.PRINTING_TIERS, quantity);
        if (!tier) return null;

        const key = this.printingPriceKey(sizeId, tier.id);
        const unitPrice = parseFloat(prices[key]) || 0;
        const grandTotal = quantity * unitPrice;

        return {
            sizeId,
            quantity,
            tierId: tier.id,
            tierQty: tier.baseQty,
            unitPrice,
            grandTotal
        };
    }
};

window.KraftBagsPricing = KraftBagsPricing;
