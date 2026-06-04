// Plastic Bags Pricing Module
// product_prices_sell/plastic_bags, product_prices_cost/plastic_bags
// Isolated: price per KG, min 50 KG, addons per KG

const PlasticBagsPricing = {
    CATEGORY_ID: 'plastic_bags',

    BASE_PRICE_PER_KG: 75,
    MIN_QUANTITY_KG: 50,

    ADDONS: [
        { id: 'extra_color', nameAr: 'لون إضافي', unit: 'per_kg' },
        { id: 'external_handle', nameAr: 'مقبض خارجي', unit: 'per_kg' }
    ],

    docId(productId) {
        return `${this.CATEGORY_ID}_${productId}`;
    },

    getAllProducts() {
        return [{ id: 'plastic_bag_kg', nameAr: 'شنط بلاستيك (بالكيلو)', unit: 'kg', minKg: this.MIN_QUANTITY_KG }];
    }
};

window.PlasticBagsPricing = PlasticBagsPricing;
