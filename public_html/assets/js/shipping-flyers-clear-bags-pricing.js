// Shipping Flyers & Clear Bags Pricing Module
// product_prices_sell/shipping_flyers_clear_bags, product_prices_cost/shipping_flyers_clear_bags
// Isolated: base products + optional printing add-on (quantity tiers)

const ShippingFlyersClearBagsPricing = {
    CATEGORY_ID: 'shipping_flyers_clear_bags',

    PRODUCTS: [
        { id: 'shipping_flyer_25x35', nameAr: 'فلاير شحن 25×35', unit: 'fixed' },
        { id: 'shipping_flyer_35x40', nameAr: 'فلاير شحن 35×40', unit: 'fixed' },
        { id: 'clear_zipper_bag_20x25', nameAr: 'كيس شفاف بسوستة 20×25', unit: 'fixed' },
        { id: 'clear_zipper_bag_27x35', nameAr: 'كيس شفاف بسوستة 27×35', unit: 'fixed' },
        { id: 'clear_zipper_bag_35x40', nameAr: 'كيس شفاف بسوستة 35×40', unit: 'fixed' }
    ],

    // Printing add-on: price per piece by quantity tier (stored in Firestore per product or category)
    PRINTING_TIER_DEFAULT_PER_PIECE: 0.5,

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

window.ShippingFlyersClearBagsPricing = ShippingFlyersClearBagsPricing;
