// Indoor Pricing Module - Same architecture as Outdoor
// Max dimension 160 cm. Group-based addons. Selling/Cost fully separated.

const IndoorPricing = {
    MAX_DIMENSION_CM: 160,
    LAMINATION_MAX_WIDTH_CM: 150,

    GROUPS: {
        banner: {
            id: 'banner',
            name: 'Banner Group',
            nameAr: 'مجموعة البانر',
            products: ['banner-380g', 'reflective-banner']
        },
        vinyl: {
            id: 'vinyl',
            name: 'Vinyl Group',
            nameAr: 'مجموعة الفينيل',
            products: [
                'white-vinyl',
                'transparent-vinyl',
                'frosted-vinyl-blank',
                'frosted-vinyl-printed',
                'reflective-vinyl'
            ]
        },
        flex: {
            id: 'flex',
            name: 'Flex Group',
            nameAr: 'مجموعة الفليكس',
            products: ['flex', 'flex-coated']
        },
        special: {
            id: 'special',
            name: 'Special Products',
            nameAr: 'منتجات خاصة',
            products: ['see-through', 'glitter', 'glossy', 'lamination-only']
        },
        cutterPlotter: {
            id: 'cutterPlotter',
            name: 'Cutter Plotter',
            nameAr: 'كتر بلوتر',
            products: ['cutter-plotter']
        },
        printCut: {
            id: 'printCut',
            name: 'Print and Cut',
            nameAr: 'برنت اند كات',
            products: ['print-and-cut']
        }
    },

    PRODUCTS: {
        'banner-380g': {
            id: 'banner-380g',
            name: 'Banner 380g (Heavy)',
            nameAr: 'بانر 380 جم (ثقيل)',
            groupId: 'banner'
        },
        'reflective-banner': {
            id: 'reflective-banner',
            name: 'Reflective Banner',
            nameAr: 'بانر عاكس',
            groupId: 'banner'
        },
        'white-vinyl': {
            id: 'white-vinyl',
            name: 'White Vinyl',
            nameAr: 'فينيل أبيض',
            groupId: 'vinyl'
        },
        'transparent-vinyl': {
            id: 'transparent-vinyl',
            name: 'Transparent Vinyl',
            nameAr: 'فينيل شفاف',
            groupId: 'vinyl'
        },
        'frosted-vinyl-blank': {
            id: 'frosted-vinyl-blank',
            name: 'Frosted Vinyl (Blank)',
            nameAr: 'فينيل صقيل (فارغ)',
            groupId: 'vinyl'
        },
        'frosted-vinyl-printed': {
            id: 'frosted-vinyl-printed',
            name: 'Frosted Vinyl (Printed)',
            nameAr: 'فينيل صقيل (مطبوع)',
            groupId: 'vinyl'
        },
        'reflective-vinyl': {
            id: 'reflective-vinyl',
            name: 'Reflective Vinyl',
            nameAr: 'فينيل عاكس',
            groupId: 'vinyl'
        },
        'flex': {
            id: 'flex',
            name: 'Flex',
            nameAr: 'فليكس',
            groupId: 'flex'
        },
        'flex-coated': {
            id: 'flex-coated',
            name: 'Flex Coated',
            nameAr: 'فليكس كوتيد',
            groupId: 'flex'
        },
        'see-through': {
            id: 'see-through',
            name: 'See Through',
            nameAr: 'سي ثرو',
            groupId: 'special'
        },
        'glitter': {
            id: 'glitter',
            name: 'Glitter',
            nameAr: 'جليتر',
            groupId: 'special'
        },
        'glossy': {
            id: 'glossy',
            name: 'Glossy',
            nameAr: 'لامع',
            groupId: 'special'
        },
        'lamination-only': {
            id: 'lamination-only',
            name: 'Lamination Only',
            nameAr: 'لامينيشن فقط',
            groupId: 'special'
        },
        'cutter-plotter': {
            id: 'cutter-plotter',
            name: 'Cutter Plotter',
            nameAr: 'كتر بلوتر',
            groupId: 'cutterPlotter',
            pricingUnit: 'perMeter'
        },
        'print-and-cut': {
            id: 'print-and-cut',
            name: 'Print and Cut',
            nameAr: 'برنت اند كات',
            groupId: 'printCut',
            pricingUnit: 'perMeter'
        }
    },

    // Same addon types as Outdoor; prices stored per group (Indoor-specific)
    GROUP_ADDONS: {
        banner: [
            { id: 'matte-lamination', name: 'Matte Lamination', nameAr: 'لامينيشن مط', maxWidth: 150, unit: 'perSquareMeter' },
            { id: 'glossy-lamination', name: 'Glossy Lamination', nameAr: 'لامينيشن لامع', maxWidth: 150, unit: 'perSquareMeter' },
            { id: 'wooden-frame-5cm', name: 'Wooden Frame 5 cm', nameAr: 'إطار خشبي 5 سم', maxWidth: null, unit: 'perMeter' },
            { id: 'wooden-frame-10cm', name: 'Wooden Frame 10 cm', nameAr: 'إطار خشبي 10 سم', maxWidth: null, unit: 'perMeter' },
            { id: 'aluminum-edge', name: 'Aluminum Edge', nameAr: 'حافة ألومنيوم', maxWidth: null, unit: 'perMeter' },
            { id: 'plastic-edge', name: 'Plastic Edge', nameAr: 'حافة بلاستيك', maxWidth: null, unit: 'perMeter' },
            { id: 'glue-per-meter', name: 'Glue per meter', nameAr: 'صمغ لكل متر', maxWidth: null, unit: 'perMeter' },
            { id: 'installation-per-meter', name: 'Installation per meter', nameAr: 'تركيب لكل متر', maxWidth: null, unit: 'perMeter' }
        ],
        vinyl: [
            { id: 'matte-lamination', name: 'Matte Lamination', nameAr: 'لامينيشن مط', maxWidth: 150, unit: 'perSquareMeter' },
            { id: 'glossy-lamination', name: 'Glossy Lamination', nameAr: 'لامينيشن لامع', maxWidth: 150, unit: 'perSquareMeter' },
            { id: 'glue-per-meter', name: 'Glue per meter', nameAr: 'صمغ لكل متر', maxWidth: null, unit: 'perMeter' }
        ],
        flex: [
            { id: 'matte-lamination', name: 'Matte Lamination', nameAr: 'لامينيشن مط', maxWidth: 150, unit: 'perSquareMeter' },
            { id: 'glossy-lamination', name: 'Glossy Lamination', nameAr: 'لامينيشن لامع', maxWidth: 150, unit: 'perSquareMeter' },
            { id: 'aluminum-edge', name: 'Aluminum Edge', nameAr: 'حافة ألومنيوم', maxWidth: null, unit: 'perMeter' },
            { id: 'plastic-edge', name: 'Plastic Edge', nameAr: 'حافة بلاستيك', maxWidth: null, unit: 'perMeter' },
            { id: 'full-metal-chassis-lighting', name: 'Full Metal Chassis with lighting', nameAr: 'هيكل معدني كامل مع إضاءة', maxWidth: null, unit: 'fixed' },
            { id: 'full-wooden-chassis-lighting', name: 'Full Wooden Chassis with lighting', nameAr: 'هيكل خشبي كامل مع إضاءة', maxWidth: null, unit: 'fixed' },
            { id: 'installation-per-meter', name: 'Installation per meter', nameAr: 'تركيب لكل متر', maxWidth: null, unit: 'perMeter' }
        ],
        special: {
            'see-through': [
                { id: 'installation-per-meter', name: 'Installation per meter', nameAr: 'تركيب لكل متر', maxWidth: null, unit: 'perMeter', requiresOverlap: true }
            ],
            'glitter': [
                { id: 'matte-lamination', name: 'Matte Lamination', nameAr: 'لامينيشن مط', maxWidth: 150, unit: 'perSquareMeter' },
                { id: 'glossy-lamination', name: 'Glossy Lamination', nameAr: 'لامينيشن لامع', maxWidth: 150, unit: 'perSquareMeter' },
                { id: 'wooden-frame-5cm', name: 'Wooden Frame 5 cm', nameAr: 'إطار خشبي 5 سم', maxWidth: null, unit: 'perMeter' },
                { id: 'wooden-frame-10cm', name: 'Wooden Frame 10 cm', nameAr: 'إطار خشبي 10 سم', maxWidth: null, unit: 'perMeter' },
                { id: 'aluminum-edge', name: 'Aluminum Edge', nameAr: 'حافة ألومنيوم', maxWidth: null, unit: 'perMeter' },
                { id: 'plastic-edge', name: 'Plastic Edge', nameAr: 'حافة بلاستيك', maxWidth: null, unit: 'perMeter' },
                { id: 'glue-per-meter', name: 'Glue per meter', nameAr: 'صمغ لكل متر', maxWidth: null, unit: 'perMeter' },
                { id: 'installation-per-meter', name: 'Installation per meter', nameAr: 'تركيب لكل متر', maxWidth: null, unit: 'perMeter' }
            ],
            'glossy': [
                { id: 'matte-lamination', name: 'Matte Lamination', nameAr: 'لامينيشن مط', maxWidth: 150, unit: 'perSquareMeter' },
                { id: 'glossy-lamination', name: 'Glossy Lamination', nameAr: 'لامينيشن لامع', maxWidth: 150, unit: 'perSquareMeter' },
                { id: 'glue-per-meter', name: 'Glue per meter', nameAr: 'صمغ لكل متر', maxWidth: null, unit: 'perMeter' },
                { id: 'installation-per-meter', name: 'Installation per meter', nameAr: 'تركيب لكل متر', maxWidth: null, unit: 'perMeter' }
            ],
            'lamination-only': []
        },
        cutterPlotter: [
            { id: 'magic', name: 'Magic', nameAr: 'ماجيك', maxWidth: null, unit: 'fixed' }
        ],
        printCut: [
            { id: 'matte-lamination', name: 'Matte Lamination', nameAr: 'لامينيشن مط', maxWidth: 150, unit: 'perSquareMeter' },
            { id: 'glossy-lamination', name: 'Glossy Lamination', nameAr: 'لامينيشن لامع', maxWidth: 150, unit: 'perSquareMeter' }
        ]
    },

    getAllProducts() {
        return Object.values(this.PRODUCTS);
    },

    getProduct(productId) {
        return this.PRODUCTS[productId] || null;
    },

    getGroup(groupId) {
        return this.GROUPS[groupId] || null;
    },

    getProductGroup(productId) {
        const product = this.getProduct(productId);
        if (!product) return null;
        return this.getGroup(product.groupId);
    },

    isPerMeterProduct(productId) {
        const product = this.getProduct(productId);
        return product && product.pricingUnit === 'perMeter';
    },

    getProductAddons(productId) {
        const product = this.getProduct(productId);
        if (!product) return [];
        const groupId = product.groupId;

        if (groupId === 'special') {
            const specialAddons = this.GROUP_ADDONS.special[productId];
            return specialAddons || [];
        }
        if (groupId === 'cutterPlotter') return this.GROUP_ADDONS.cutterPlotter || [];
        if (groupId === 'printCut') return this.GROUP_ADDONS.printCut || [];

        return this.GROUP_ADDONS[groupId] || [];
    },

    validateDimensions(width, height) {
        const max = this.MAX_DIMENSION_CM;
        if (width > max || height > max) {
            return { valid: false, error: `الحد الأقصى للعرض أو الطول هو ${max} سم` };
        }
        if (width <= 0 || height <= 0) {
            return { valid: false, error: 'يجب أن تكون الأبعاد أكبر من صفر' };
        }
        return { valid: true, error: null };
    },

    validateLengthMeters(lengthMeters) {
        if (lengthMeters <= 0) {
            return { valid: false, error: 'يجب أن يكون الطول أكبر من صفر' };
        }
        return { valid: true, error: null };
    },

    validateAddon(addonId, width, productId) {
        const addons = this.getProductAddons(productId);
        const addon = addons.find(a => a.id === addonId);
        if (!addon) return { valid: false, error: 'إضافة غير موجودة', requiresOverlap: false };

        if (addon.maxWidth && width > addon.maxWidth) {
            if (addon.id.includes('lamination')) {
                return {
                    valid: false,
                    error: `اللامينيشن غير مسموح به للعرض أكبر من ${addon.maxWidth} سم`,
                    requiresOverlap: false
                };
            }
            return { valid: true, error: null, requiresOverlap: true };
        }
        if (addon.requiresOverlap && width > this.LAMINATION_MAX_WIDTH_CM) {
            return { valid: true, error: null, requiresOverlap: true };
        }
        return { valid: true, error: null, requiresOverlap: false };
    },

    /**
     * Area-based calculation (standard indoor products)
     */
    calculate(productId, width, height, quantity, selectedAddons, pricePerSquareMeter, groupAddonsPrices = {}) {
        const widthM = width / 100;
        const heightM = height / 100;
        const areaM2 = widthM * heightM;
        const basePrice = areaM2 * pricePerSquareMeter;

        let addonsTotal = 0;
        const addonsDetails = [];

        selectedAddons.forEach(({ addonId, price }) => {
            const addons = this.getProductAddons(productId);
            const addon = addons.find(a => a.id === addonId);
            if (!addon) return;
            const addonPrice = price !== undefined ? price : (groupAddonsPrices[addonId] || 0);
            let cost = 0;
            if (addon.unit === 'perSquareMeter') cost = areaM2 * addonPrice;
            else if (addon.unit === 'perMeter') cost = (widthM + heightM) * 2 * addonPrice;
            else if (addon.unit === 'fixed') cost = addonPrice;
            addonsTotal += cost;
            addonsDetails.push({ addonId, name: addon.nameAr, cost, unit: addon.unit });
        });

        const itemTotal = basePrice + addonsTotal;
        const totalPrice = itemTotal * quantity;

        return {
            width,
            height,
            widthM,
            heightM,
            areaM2,
            quantity,
            pricePerSquareMeter,
            basePrice,
            addonsTotal,
            addonsDetails,
            itemTotal,
            totalPrice
        };
    },

    /**
     * Per-meter calculation (Cutter Plotter, Print & Cut)
     * widthCm used only for lamination addon validation (max 150)
     */
    calculatePerMeter(productId, lengthMeters, quantity, selectedAddons, pricePerMeter, groupAddonsPrices = {}, widthCm) {
        const basePrice = lengthMeters * pricePerMeter;
        const widthM = widthCm ? widthCm / 100 : 0;
        const heightM = 0;
        const areaM2 = widthM * lengthMeters; // for per-square-meter addons (lamination)

        let addonsTotal = 0;
        const addonsDetails = [];

        selectedAddons.forEach(({ addonId, price }) => {
            const addons = this.getProductAddons(productId);
            const addon = addons.find(a => a.id === addonId);
            if (!addon) return;
            const addonPrice = price !== undefined ? price : (groupAddonsPrices[addonId] || 0);
            let cost = 0;
            if (addon.unit === 'perSquareMeter') cost = areaM2 * addonPrice;
            else if (addon.unit === 'perMeter') cost = lengthMeters * addonPrice;
            else if (addon.unit === 'fixed') cost = addonPrice;
            addonsTotal += cost;
            addonsDetails.push({ addonId, name: addon.nameAr, cost, unit: addon.unit });
        });

        const itemTotal = basePrice + addonsTotal;
        const totalPrice = itemTotal * quantity;

        return {
            lengthMeters,
            quantity,
            pricePerMeter,
            basePrice,
            addonsTotal,
            addonsDetails,
            itemTotal,
            totalPrice
        };
    }
};

window.IndoorPricing = IndoorPricing;
