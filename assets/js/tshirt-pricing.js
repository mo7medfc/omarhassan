// T-Shirts Pricing Module
// product_prices_sell, product_prices_cost - separate collections
// Base products + Printing add-ons + Pressing add-ons

const TShirtPricing = {
    CATEGORY_ID: 'TShirt',

    BASE_PRODUCTS: [
        { id: 'basic_short', nameAr: 'تيشرت بيزك نص كم', unit: 'fixed' },
        { id: 'basic_long', nameAr: 'تيشرت بيزك كم طويل', unit: 'fixed' },
        { id: 'polo_short', nameAr: 'تيشرت بولو نص كم', unit: 'fixed' },
        { id: 'polo_long', nameAr: 'تيشرت بولو كم طويل', unit: 'fixed' },
        { id: 'hoodie_local', nameAr: 'هودي محلي', unit: 'fixed' },
        { id: 'hoodie_imported', nameAr: 'هودي مستورد', unit: 'fixed' }
    ],

    PRINTING_OPTIONS: [
        { id: 'printing_one_side', nameAr: 'طباعة وجه واحد', unit: 'fixed' },
        { id: 'printing_front_back', nameAr: 'طباعة وجهين', unit: 'fixed' }
    ],

    PRESSING_OPTIONS: [
        { id: 'pressing_one_side', nameAr: 'كبس وجه واحد', unit: 'fixed' },
        { id: 'pressing_two_sides', nameAr: 'كبس وجهين', unit: 'fixed' }
    ],

    docId(productId) {
        return `${this.CATEGORY_ID}_${productId}`;
    }
};

window.TShirtPricing = TShirtPricing;
