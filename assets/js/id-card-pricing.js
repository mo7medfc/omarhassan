// ID Cards / Badges Pricing Module
// product_prices_sell, product_prices_cost - separate collections
// Range-based pricing + Special types + Add-ons

const IDCardPricing = {
    CATEGORY_ID: 'IDCard',

    // Quantity ranges for standard ID cards (min inclusive, max inclusive)
    RANGES: [
        { id: 'range_1_10', minQty: 1, maxQty: 10, nameAr: '1 - 10 كارنيه' },
        { id: 'range_11_20', minQty: 11, maxQty: 20, nameAr: '11 - 20 كارنيه' },
        { id: 'range_21_50', minQty: 21, maxQty: 50, nameAr: '21 - 50 كارنيه' },
        { id: 'range_51_100', minQty: 51, maxQty: 100, nameAr: '51 - 100 كارنيه' },
        { id: 'range_101_200', minQty: 101, maxQty: 200, nameAr: '101 - 200 كارنيه' },
        { id: 'range_201_400', minQty: 201, maxQty: 400, nameAr: '201 - 400 كارنيه' },
        { id: 'range_401_600', minQty: 401, maxQty: 600, nameAr: '401 - 600 كارنيه' },
        { id: 'range_601_1000', minQty: 601, maxQty: 1000, nameAr: '601 - 1000 كارنيه' },
        { id: 'range_1001_2000', minQty: 1001, maxQty: 2000, nameAr: '1001 - 2000 كارنيه' }
    ],

    SPECIAL_TYPES: [
        { id: 'encrypted_one_side', nameAr: 'كارنيه مشفر وجه واحد' },
        { id: 'encrypted_two_sides', nameAr: 'كارنيه مشفر وجهين' }
    ],

    ADDONS: [
        { id: 'plastic_holder', nameAr: 'غطاء بلاستيك' },
        { id: 'plain_lanyard', nameAr: 'خيط عادي' },
        { id: 'lanyard_printed_one_color', nameAr: 'خيط مطبوع لون واحد' },
        { id: 'lanyard_printed_full_color', nameAr: 'خيط مطبوع ألوان كاملة' }
    ],

    docId(productId) {
        return `${this.CATEGORY_ID}_${productId}`;
    },

    getRangeForQuantity(qty) {
        const n = parseInt(qty, 10) || 0;
        return this.RANGES.find(r => n >= r.minQty && n <= r.maxQty) || null;
    },

    getAllProducts() {
        const ranges = this.RANGES.map(r => ({
            id: r.id,
            name: r.nameAr,
            unit: 'per_card',
            section: 'range',
            minQty: r.minQty,
            maxQty: r.maxQty
        }));
        const special = this.SPECIAL_TYPES.map(s => ({
            id: s.id,
            name: s.nameAr,
            unit: 'per_card',
            section: 'special'
        }));
        const addons = this.ADDONS.map(a => ({
            id: a.id,
            name: a.nameAr,
            unit: 'per_unit',
            section: 'addon'
        }));
        return [...ranges, ...special, ...addons];
    }
};

window.IDCardPricing = IDCardPricing;
