// Flags & Media Pricing Module
// product_prices_sell, product_prices_cost - separate collections
// Fixed products: Flag_{productId}
// Trigal Stand: Flag_trigal_meter (price per square meter)

const FlagsPricing = {
    CATEGORY_ID: 'Flag',

    // Fixed price products
    FIXED_PRODUCTS: [
        { id: 'flag_2.5_feather', nameAr: 'علم 2.5 متر (ريشة)', unit: 'fixed' },
        { id: 'stand_only_2.5_feather', nameAr: 'ستان فقط 2.5 متر (ريشة)', unit: 'fixed' },
        { id: 'flag_4_feather', nameAr: 'علم 4 متر (ريشة)', unit: 'fixed' },
        { id: 'stand_only_4_feather', nameAr: 'ستان فقط 4 متر (ريشة)', unit: 'fixed' },
        { id: 'flag_pole', nameAr: 'علم سارى', unit: 'fixed' },
        { id: 'flag_wave', nameAr: 'علم تلويح', unit: 'fixed' },
        { id: 'flag_desk_single', nameAr: 'علم مكتب فردى', unit: 'fixed' },
        { id: 'flag_desk_double', nameAr: 'علم مكتب مجوز', unit: 'fixed' },
        { id: 'flag_desk_large', nameAr: 'علم مكتب كبير', unit: 'fixed' },
        { id: 'base_feather_only', nameAr: 'قاعدة علم ريشة فقط', unit: 'fixed' },
        { id: 'pole_feather_only', nameAr: 'سارى علم ريشة فقط', unit: 'fixed' }
    ],

    // Trigal Stand - size-based: Length × Width × Price per sqm × Quantity
    TRIGAL_PRODUCT_ID: 'trigal_meter',

    docId(productId) {
        return `${this.CATEGORY_ID}_${productId}`;
    },

    calculateTrigal(lengthM, widthM, quantity, pricePerSqm) {
        const len = parseFloat(lengthM) || 0;
        const wid = parseFloat(widthM) || 0;
        const qty = Math.max(1, parseInt(quantity, 10) || 1);
        const pps = parseFloat(pricePerSqm) || 0;
        const area = len * wid;
        const total = area * pps * qty;
        return { lengthM, widthM, quantity: qty, area, pricePerSqm: pps, totalPrice: total, unitPrice: area * pps };
    }
};

window.FlagsPricing = FlagsPricing;
