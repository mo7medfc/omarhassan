// Promotional Gifts Pricing Module
// product_prices_sell/promotional_gifts, product_prices_cost/promotional_gifts
// Isolated: own products, cost and sell collections only

const PromotionalGiftsPricing = {
    CATEGORY_ID: 'promotional_gifts',

    PRODUCTS: [
        { id: 'enamel_name_tag', nameAr: 'إنامل نيم تاج', unit: 'fixed' },
        { id: 'gold_silver_name_tag_pin', nameAr: 'نيم تاج دهبي/فضي (دبوس)', unit: 'fixed' },
        { id: 'gold_silver_name_tag_magnet', nameAr: 'نيم تاج دهبي/فضي (مغناطيس)', unit: 'fixed' },
        { id: 'acrylic_medal_custom_shapes', nameAr: 'ميدالية اكريلك (أشكال مخصصة)', unit: 'fixed' },
        { id: 'wooden_medal_custom_shapes', nameAr: 'ميدالية خشب (أشكال مخصصة)', unit: 'fixed' },
        { id: 'acrylic_coaster_velvet_back', nameAr: 'كوستر اكريلك (ضهر قطيفة)', unit: 'fixed' },
        { id: 'acrylic_coaster_double_layer', nameAr: 'كوستر اكريلك (طبقتين)', unit: 'fixed' },
        { id: 'wooden_coaster_laser_engraved', nameAr: 'كوستر خشب (حفر ليزر)', unit: 'fixed' },
        { id: 'acrylic_stand_a5', nameAr: 'استاند اكريلك A5', unit: 'fixed' },
        { id: 'acrylic_stand_a4', nameAr: 'استاند اكريلك A4', unit: 'fixed' },
        { id: 'balloon_min_500', nameAr: 'بالون (أقل كمية 500 قطعة)', unit: 'fixed', minQuantity: 500 },
        { id: 'wristbands', nameAr: 'أساور', unit: 'fixed' },
        { id: 'swimming_pool_wristbands', nameAr: 'أساور حمام سباحة', unit: 'fixed' }
    ],

    docId(productId) {
        return `${this.CATEGORY_ID}_${productId}`;
    },

    getAllProducts() {
        return this.PRODUCTS.map(p => ({
            id: p.id,
            name: p.nameAr,
            unit: p.unit || 'fixed',
            minQuantity: p.minQuantity
        }));
    }
};

window.PromotionalGiftsPricing = PromotionalGiftsPricing;
