// Ruler Frames Pricing Module
// product_prices_sell/ruler_frames, product_prices_cost/ruler_frames
// Isolated: own products, cost and sell collections only

const RulerFramesPricing = {
    CATEGORY_ID: 'ruler_frames',

    PRODUCTS: [
        { id: 'black_15x20', nameAr: 'برواز مسطرة أسود 15×20', unit: 'fixed' },
        { id: 'black_20x30', nameAr: 'برواز مسطرة أسود 20×30', unit: 'fixed' },
        { id: 'black_30x40', nameAr: 'برواز مسطرة أسود 30×40', unit: 'fixed' },
        { id: 'white_15x20', nameAr: 'برواز مسطرة أبيض 15×20', unit: 'fixed' },
        { id: 'white_20x30', nameAr: 'برواز مسطرة أبيض 20×30', unit: 'fixed' },
        { id: 'white_30x40', nameAr: 'برواز مسطرة أبيض 30×40', unit: 'fixed' },
        { id: 'wall_clock_30x40', nameAr: 'ساعة حائط 30×40', unit: 'fixed' }
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

window.RulerFramesPricing = RulerFramesPricing;
