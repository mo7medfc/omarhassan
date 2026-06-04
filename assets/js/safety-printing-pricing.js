// Safety Printing Pricing Module
// Isolated: safety_printing_prices_sell, safety_printing_prices_cost
// NO shared logic, NO global markup, NO automatic profit

const SafetyPrintingPricing = {
    CATEGORY_ID: 'safety_printing',
    SELL_COLLECTION: 'safety_printing_prices_sell',
    COST_COLLECTION: 'safety_printing_prices_cost',

    PRODUCTS: [
        { id: 'worker_vest', nameAr: 'فيست عمال', unit: 'fixed' },
        { id: 'engineer_vest', nameAr: 'فيست مهندسين', unit: 'fixed' },
        { id: 'safety_helmet', nameAr: 'خوذة', unit: 'fixed' },
        { id: 'vip_helmet', nameAr: 'خوذة VIP', unit: 'fixed' }
    ],

    PRINTING_OPTIONS: [
        { id: 'front_only', nameAr: 'طباعة وجه واحد' },
        { id: 'front_back', nameAr: 'طباعة وجهين' }
    ],

    getAllProducts() {
        return this.PRODUCTS.map(p => ({
            id: p.id,
            name: p.nameAr,
            unit: p.unit || 'fixed'
        }));
    }
};

window.SafetyPrintingPricing = SafetyPrintingPricing;
