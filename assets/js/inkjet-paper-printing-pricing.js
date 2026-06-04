// Inkjet Paper Printing Pricing Module
// product_prices_sell/inkjet_paper_printing, product_prices_cost/inkjet_paper_printing
// Isolated: fixed price per sheet, quantity only

const InkjetPaperPrintingPricing = {
    CATEGORY_ID: 'inkjet_paper_printing',

    PRODUCTS: [
        { id: 'a4_80gsm_single_black', nameAr: 'A4 80 جرام – وجه واحد – أسود', unit: 'fixed' },
        { id: 'a4_80gsm_double_black', nameAr: 'A4 80 جرام – وجهين – أسود', unit: 'fixed' },
        { id: 'a4_80gsm_single_color', nameAr: 'A4 80 جرام – وجه واحد – ملون', unit: 'fixed' },
        { id: 'a4_80gsm_double_color', nameAr: 'A4 80 جرام – وجهين – ملون', unit: 'fixed' },
        { id: 'printing_only_single_black', nameAr: 'طباعة فقط – وجه واحد – أسود', unit: 'fixed' },
        { id: 'printing_only_double_black', nameAr: 'طباعة فقط – وجهين – أسود', unit: 'fixed' },
        { id: 'printing_only_single_color', nameAr: 'طباعة فقط – وجه واحد – ملون', unit: 'fixed' },
        { id: 'printing_only_double_color', nameAr: 'طباعة فقط – وجهين – ملون', unit: 'fixed' }
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

window.InkjetPaperPrintingPricing = InkjetPaperPrintingPricing;
