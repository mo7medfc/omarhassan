// Stands Pricing Module - Fixed base prices, Empty/Printed, optional lamination
// Same architecture as Outdoor/Indoor: cost vs selling separation, clean UI

const StandsPricing = {
    CATEGORY_ID: 'Stands',

    SUB_CATEGORIES: [
        { id: 'rollUp', name: 'Roll Up', nameAr: 'رول أب' },
        { id: 'xBanner', name: 'X-Banner', nameAr: 'اكس بانر' },
        { id: 'popUp', name: 'Pop Up', nameAr: 'بوب أب' }
    ],

    PRODUCTS: {
        // Roll Up - Banner (widthCm × heightCm = مقاس الاستند للامينيشن)
        'roll-up-80-200-banner': { id: 'roll-up-80-200-banner', name: 'Roll Up 80×200 Banner', nameAr: 'رول أب 80×200 بانر', subCategoryId: 'rollUp', hasLamination: true, widthCm: 80, heightCm: 200 },
        'roll-up-85-200-banner': { id: 'roll-up-85-200-banner', name: 'Roll Up 85×200 Banner', nameAr: 'رول أب 85×200 بانر', subCategoryId: 'rollUp', hasLamination: true, widthCm: 85, heightCm: 200 },
        'roll-up-100-200-banner': { id: 'roll-up-100-200-banner', name: 'Roll Up 100×200 Banner', nameAr: 'رول أب 100×200 بانر', subCategoryId: 'rollUp', hasLamination: true, widthCm: 100, heightCm: 200 },
        'roll-up-120-200-banner': { id: 'roll-up-120-200-banner', name: 'Roll Up 120×200 Banner', nameAr: 'رول أب 120×200 بانر', subCategoryId: 'rollUp', hasLamination: true, widthCm: 120, heightCm: 200 },
        'roll-up-150-200-banner': { id: 'roll-up-150-200-banner', name: 'Roll Up 150×200 Banner', nameAr: 'رول أب 150×200 بانر', subCategoryId: 'rollUp', hasLamination: true, widthCm: 150, heightCm: 200 },
        // Roll Up - Glossy
        'roll-up-80-200-glossy': { id: 'roll-up-80-200-glossy', name: 'Roll Up 80×200 Glossy', nameAr: 'رول أب 80×200 لامع', subCategoryId: 'rollUp', hasLamination: true, widthCm: 80, heightCm: 200 },
        'roll-up-85-200-glossy': { id: 'roll-up-85-200-glossy', name: 'Roll Up 85×200 Glossy', nameAr: 'رول أب 85×200 لامع', subCategoryId: 'rollUp', hasLamination: true, widthCm: 85, heightCm: 200 },
        'roll-up-100-200-glossy': { id: 'roll-up-100-200-glossy', name: 'Roll Up 100×200 Glossy', nameAr: 'رول أب 100×200 لامع', subCategoryId: 'rollUp', hasLamination: true, widthCm: 100, heightCm: 200 },
        'roll-up-120-200-glossy': { id: 'roll-up-120-200-glossy', name: 'Roll Up 120×200 Glossy', nameAr: 'رول أب 120×200 لامع', subCategoryId: 'rollUp', hasLamination: true, widthCm: 120, heightCm: 200 },
        'roll-up-150-200-glossy': { id: 'roll-up-150-200-glossy', name: 'Roll Up 150×200 Glossy', nameAr: 'رول أب 150×200 لامع', subCategoryId: 'rollUp', hasLamination: true, widthCm: 150, heightCm: 200 },
        // X-Banner - Banner
        'x-banner-60-160-banner': { id: 'x-banner-60-160-banner', name: 'X-Banner 60×160 Banner', nameAr: 'اكس بانر 60×160 بانر', subCategoryId: 'xBanner', hasLamination: true, widthCm: 60, heightCm: 160 },
        'x-banner-80-180-banner': { id: 'x-banner-80-180-banner', name: 'X-Banner 80×180 Banner', nameAr: 'اكس بانر 80×180 بانر', subCategoryId: 'xBanner', hasLamination: true, widthCm: 80, heightCm: 180 },
        // X-Banner - Glossy
        'x-banner-60-160-glossy': { id: 'x-banner-60-160-glossy', name: 'X-Banner 60×160 Glossy', nameAr: 'اكس بانر 60×160 لامع', subCategoryId: 'xBanner', hasLamination: true, widthCm: 60, heightCm: 160 },
        'x-banner-80-180-glossy': { id: 'x-banner-80-180-glossy', name: 'X-Banner 80×180 Glossy', nameAr: 'اكس بانر 80×180 لامع', subCategoryId: 'xBanner', hasLamination: true, widthCm: 80, heightCm: 180 },
        // Pop Up - fixed price only, no lamination
        'pop-up-2x3-straight': { id: 'pop-up-2x3-straight', name: 'Pop Up 2×3 Straight', nameAr: 'بوب أب 2×3 مستقيم', subCategoryId: 'popUp', hasLamination: false },
        'pop-up-2x3-curve': { id: 'pop-up-2x3-curve', name: 'Pop Up 2×3 Curve', nameAr: 'بوب أب 2×3 منحني', subCategoryId: 'popUp', hasLamination: false },
        'pop-up-3x3-straight': { id: 'pop-up-3x3-straight', name: 'Pop Up 3×3 Straight', nameAr: 'بوب أب 3×3 مستقيم', subCategoryId: 'popUp', hasLamination: false },
        'pop-up-3x3-curve': { id: 'pop-up-3x3-curve', name: 'Pop Up 3×3 Curve', nameAr: 'بوب أب 3×3 منحني', subCategoryId: 'popUp', hasLamination: false },
        'pop-up-3x4-straight': { id: 'pop-up-3x4-straight', name: 'Pop Up 3×4 Straight', nameAr: 'بوب أب 3×4 مستقيم', subCategoryId: 'popUp', hasLamination: false },
        'pop-up-3x4-curve': { id: 'pop-up-3x4-curve', name: 'Pop Up 3×4 Curve', nameAr: 'بوب أب 3×4 منحني', subCategoryId: 'popUp', hasLamination: false },
        'pop-up-3x5-straight': { id: 'pop-up-3x5-straight', name: 'Pop Up 3×5 Straight', nameAr: 'بوب أب 3×5 مستقيم', subCategoryId: 'popUp', hasLamination: false },
        'pop-up-3x5-curve': { id: 'pop-up-3x5-curve', name: 'Pop Up 3×5 Curve', nameAr: 'بوب أب 3×5 منحني', subCategoryId: 'popUp', hasLamination: false },
        'pop-up-counter': { id: 'pop-up-counter', name: 'Pop Up Counter', nameAr: 'بوب أب كاونتر', subCategoryId: 'popUp', hasLamination: false },
        'pop-up-promotion-table': { id: 'pop-up-promotion-table', name: 'Promotion Table', nameAr: 'طاولة ترويجية', subCategoryId: 'popUp', hasLamination: false }
    },

    // Lamination add-ons per sub-category (price per m²)
    GROUP_ADDONS: {
        rollUp: [
            { id: 'matte-lamination', name: 'Matte Lamination', nameAr: 'لامينيشن مط', unit: 'perSquareMeter' },
            { id: 'glossy-lamination', name: 'Glossy Lamination', nameAr: 'لامينيشن لامع', unit: 'perSquareMeter' }
        ],
        xBanner: [
            { id: 'matte-lamination', name: 'Matte Lamination', nameAr: 'لامينيشن مط', unit: 'perSquareMeter' },
            { id: 'glossy-lamination', name: 'Glossy Lamination', nameAr: 'لامينيشن لامع', unit: 'perSquareMeter' }
        ],
        popUp: []
    },

    getSubCategory(subCategoryId) {
        return this.SUB_CATEGORIES.find(s => s.id === subCategoryId) || null;
    },

    getProduct(productId) {
        return this.PRODUCTS[productId] || null;
    },

    getProductsBySubCategory(subCategoryId) {
        return Object.values(this.PRODUCTS).filter(p => p.subCategoryId === subCategoryId);
    },

    getSubCategoryAddons(subCategoryId) {
        return this.GROUP_ADDONS[subCategoryId] || [];
    },

    hasLamination(productId) {
        const product = this.getProduct(productId);
        return product && product.hasLamination === true;
    },

    /**
     * Calculate total: (base price + lamination) × quantity
     * variant: 'empty' | 'printed'
     * laminationAddons: [{ addonId, pricePerM2 }, ...]
     * laminationWidthCm, laminationHeightCm: dimensions in cm for lamination area
     */
    calculate(productId, variant, quantity, priceEmpty, pricePrinted, laminationAddons = [], laminationWidthCm = 0, laminationHeightCm = 0, groupAddonsPrices = {}) {
        const basePrice = variant === 'printed' ? (pricePrinted || 0) : (priceEmpty || 0);
        let laminationTotal = 0;
        const laminationDetails = [];

        if (laminationAddons.length > 0 && laminationWidthCm > 0 && laminationHeightCm > 0) {
            const areaM2 = (laminationWidthCm / 100) * (laminationHeightCm / 100);
            laminationAddons.forEach(({ addonId, pricePerM2 }) => {
                const price = pricePerM2 !== undefined ? pricePerM2 : (groupAddonsPrices[addonId] || 0);
                const cost = areaM2 * price;
                laminationTotal += cost;
                const addon = (this.GROUP_ADDONS.rollUp || []).find(a => a.id === addonId) || (this.GROUP_ADDONS.xBanner || []).find(a => a.id === addonId);
                laminationDetails.push({ addonId, nameAr: addon ? addon.nameAr : addonId, cost });
            });
        }

        const itemTotal = basePrice + laminationTotal;
        const totalPrice = itemTotal * quantity;

        return {
            variant,
            basePrice,
            laminationTotal,
            laminationDetails,
            itemTotal,
            quantity,
            totalPrice
        };
    }
};

window.StandsPricing = StandsPricing;
