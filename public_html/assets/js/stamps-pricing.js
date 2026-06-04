// Stamps (Seals & Stamps) Pricing Module
// Three bands: Automatic Machine, Wooden Handle, Cliché Only
// Sell and Cost in separate Firestore collections. No markup, no +50 EGP.

const StampsPricing = {
    CATEGORY_ID: 'Stamps',

    BANDS: [
        { id: 'automatic_machine', name: 'Automatic Machine', nameAr: 'ماكينة أوتوماتيك' },
        { id: 'wooden_handle', name: 'Wooden Handle', nameAr: 'مقبض خشبي' },
        { id: 'cliche_only', name: 'Cliché Only', nameAr: 'كليشيه فقط' }
    ],

    // Default sizes preloaded WITHOUT prices (admin enters prices)
    DEFAULT_SIZES: {
        automatic_machine: [
            { sizeId: 'rect-1.5-4', productName: 'Rectangular 1.5 × 4 cm', productNameAr: 'مستطيل 1.5 × 4 سم' },
            { sizeId: 'rect-5-2', productName: 'Rectangular 5 × 2 cm', productNameAr: 'مستطيل 5 × 2 سم' },
            { sizeId: 'rect-6-3', productName: 'Rectangular 6 × 3 cm', productNameAr: 'مستطيل 6 × 3 سم' },
            { sizeId: 'rect-7-3', productName: 'Rectangular 7 × 3 cm', productNameAr: 'مستطيل 7 × 3 سم' },
            { sizeId: 'oval-5-2', productName: 'Oval 5 × 2 cm', productNameAr: 'بيضاوي 5 × 2 سم' },
            { sizeId: 'oval-5-3', productName: 'Oval 5 × 3 cm', productNameAr: 'بيضاوي 5 × 3 سم' },
            { sizeId: 'oval-6-3', productName: 'Oval 6 × 3 cm', productNameAr: 'بيضاوي 6 × 3 سم' },
            { sizeId: 'square-4-4', productName: 'Square 4 × 4 cm', productNameAr: 'مربع 4 × 4 سم' },
            { sizeId: 'round-4-4', productName: 'Round 4 × 4 cm', productNameAr: 'دائري 4 × 4 سم' },
            { sizeId: 'round-5-5', productName: 'Round 5 × 5 cm', productNameAr: 'دائري 5 × 5 سم' }
        ],
        wooden_handle: [
            { sizeId: 'rect-1.5-4', productName: 'Rectangular 1.5 × 4 cm', productNameAr: 'مستطيل 1.5 × 4 سم' },
            { sizeId: 'rect-5-2', productName: 'Rectangular 5 × 2 cm', productNameAr: 'مستطيل 5 × 2 سم' },
            { sizeId: 'rect-6-3', productName: 'Rectangular 6 × 3 cm', productNameAr: 'مستطيل 6 × 3 سم' },
            { sizeId: 'rect-7-3', productName: 'Rectangular 7 × 3 cm', productNameAr: 'مستطيل 7 × 3 سم' },
            { sizeId: 'oval-5-2', productName: 'Oval 5 × 2 cm', productNameAr: 'بيضاوي 5 × 2 سم' },
            { sizeId: 'oval-6-3', productName: 'Oval 6 × 3 cm', productNameAr: 'بيضاوي 6 × 3 سم' },
            { sizeId: 'square-4-4', productName: 'Square 4 × 4 cm', productNameAr: 'مربع 4 × 4 سم' },
            { sizeId: 'round-4-4', productName: 'Round 4 × 4 cm', productNameAr: 'دائري 4 × 4 سم' },
            { sizeId: 'square-5-5', productName: 'Square 5 × 5 cm', productNameAr: 'مربع 5 × 5 سم' },
            { sizeId: 'round-5-5', productName: 'Round 5 × 5 cm', productNameAr: 'دائري 5 × 5 سم' }
        ],
        cliche_only: [] // Formula-based: width × height × pricePerCm2
    },

    DEFAULT_CLICHE_SELL_PER_CM2: 0.015,
    DEFAULT_CLICHE_COST_PER_CM2: 0.015,

    getBand(bandId) {
        return this.BANDS.find(b => b.id === bandId) || null;
    },

    getDefaultSizes(bandId) {
        return this.DEFAULT_SIZES[bandId] || [];
    },

    /**
     * Cliché formula: Total = Width × Height × pricePerCm2 × Quantity
     */
    calculateCliche(widthCm, heightCm, quantity, pricePerCm2) {
        const area = widthCm * heightCm;
        const unitPrice = area * (pricePerCm2 || 0);
        const totalPrice = unitPrice * quantity;
        return { widthCm, heightCm, area, quantity, pricePerCm2: pricePerCm2 || 0, unitPrice, totalPrice };
    },

    docId(bandId, sizeId) {
        if (bandId === 'cliche_only') return 'Stamps_cliche';
        return `Stamps_${bandId}_${sizeId}`;
    }
};

window.StampsPricing = StampsPricing;
