// Sublimation Gifts Pricing Module
// product_prices_sell, product_prices_cost - separate collections
// Fixed-price products only

const SublimationGiftPricing = {
    CATEGORY_ID: 'SublimationGift',

    PRODUCTS: [
        { id: 'mug_white_printed', nameAr: 'ماج أبيض (مطبوع)', unit: 'fixed' },
        { id: 'mug_colored_printed', nameAr: 'ماج ملون (مطبوع)', unit: 'fixed' },
        { id: 'mug_magic', nameAr: 'ماج سحري', unit: 'fixed' },
        { id: 'coaster_wood', nameAr: 'كوستر خشب', unit: 'fixed' },
        { id: 'cap', nameAr: 'كاب', unit: 'fixed' },
        { id: 'medallion_wood_4x6_single', nameAr: 'مادلية خشب 4×6 وجه واحد', unit: 'fixed' },
        { id: 'medallion_wood_4x6_double', nameAr: 'مادلية خشب 4×6 وجهين', unit: 'fixed' },
        { id: 'mouse_pad', nameAr: 'بادة ماوس', unit: 'fixed' },
        { id: 'puzzle_small', nameAr: 'بازل صغير', unit: 'fixed' },
        { id: 'puzzle_large', nameAr: 'بازل كبير', unit: 'fixed' },
        { id: 'sublimation_paper', nameAr: 'ورق سبلميشن', unit: 'fixed' },
        { id: 'single_press', nameAr: 'كبسة واحدة', unit: 'fixed' },
        { id: 'car_sun_visor', nameAr: 'شماسة سيارة', unit: 'fixed' }
    ],

    docId(productId) {
        return `${this.CATEGORY_ID}_${productId}`;
    },

    getAllProducts() {
        return this.PRODUCTS.map(p => ({
            id: p.id,
            name: p.nameAr,
            unit: p.unit || 'fixed'
        }));
    }
};

window.SublimationGiftPricing = SublimationGiftPricing;
