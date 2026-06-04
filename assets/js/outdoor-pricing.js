// Outdoor Pricing Module - Clean, Group-Based Structure
// Products belong to groups, addons belong to groups (not individual products)

const OutdoorPricing = {
    // Product Groups
    GROUPS: {
        banner: {
            id: 'banner',
            name: 'Banner Group',
            nameAr: 'مجموعة البانر',
            products: [
                'banner-280g',
                'banner-380g',
                'banner-coated-400g',
                'reflective-banner',
                'election-banner-light'
            ]
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
            products: [
                'flex',
                'flex-coated'
            ]
        },
        special: {
            id: 'special',
            name: 'Special Products',
            nameAr: 'منتجات خاصة',
            products: [
                'see-through',
                'glitter',
                'glossy',
                'lamination-only'
            ]
        }
    },

    // All Products
    PRODUCTS: {
        // Banner Group
        'banner-280g': {
            id: 'banner-280g',
            name: 'Banner 280g (Light)',
            nameAr: 'بانر 280 جم (خفيف)',
            groupId: 'banner'
        },
        'banner-380g': {
            id: 'banner-380g',
            name: 'Banner 380g (Heavy)',
            nameAr: 'بانر 380 جم (ثقيل)',
            groupId: 'banner'
        },
        'banner-coated-400g': {
            id: 'banner-coated-400g',
            name: 'Banner Coated 400g',
            nameAr: 'بانر كوتيد 400 جم',
            groupId: 'banner'
        },
        'reflective-banner': {
            id: 'reflective-banner',
            name: 'Reflective Banner',
            nameAr: 'بانر عاكس',
            groupId: 'banner'
        },
        'election-banner-light': {
            id: 'election-banner-light',
            name: 'Election Banner (No ground frame)',
            nameAr: 'بانر انتخابات (بدون إطار أرضي)',
            groupId: 'banner'
        },
        // Vinyl Group
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
        // Flex Group
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
        // Special Products
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
        }
    },

    // Addons by Group (NOT per product)
    GROUP_ADDONS: {
        banner: [
            {
                id: 'matte-lamination',
                name: 'Matte Lamination',
                nameAr: 'لامينيشن مط',
                maxWidth: 150,
                unit: 'perSquareMeter'
            },
            {
                id: 'glossy-lamination',
                name: 'Glossy Lamination',
                nameAr: 'لامينيشن لامع',
                maxWidth: 150,
                unit: 'perSquareMeter'
            },
            {
                id: 'wooden-frame-5cm',
                name: 'Wooden Frame 5 cm',
                nameAr: 'إطار خشبي 5 سم',
                maxWidth: null,
                unit: 'perMeter'
            },
            {
                id: 'wooden-frame-10cm',
                name: 'Wooden Frame 10 cm',
                nameAr: 'إطار خشبي 10 سم',
                maxWidth: null,
                unit: 'perMeter'
            },
            {
                id: 'aluminum-edge',
                name: 'Aluminum Edge',
                nameAr: 'حافة ألومنيوم',
                maxWidth: null,
                unit: 'perMeter'
            },
            {
                id: 'plastic-edge',
                name: 'Plastic Edge',
                nameAr: 'حافة بلاستيك',
                maxWidth: null,
                unit: 'perMeter'
            },
            {
                id: 'glue-per-meter',
                name: 'Glue per meter',
                nameAr: 'صمغ لكل متر',
                maxWidth: null,
                unit: 'perMeter'
            },
            {
                id: 'installation-per-meter',
                name: 'Installation per meter',
                nameAr: 'تركيب لكل متر',
                maxWidth: null,
                unit: 'perMeter'
            }
        ],
        vinyl: [
            {
                id: 'matte-lamination',
                name: 'Matte Lamination',
                nameAr: 'لامينيشن مط',
                maxWidth: 150,
                unit: 'perSquareMeter'
            },
            {
                id: 'glossy-lamination',
                name: 'Glossy Lamination',
                nameAr: 'لامينيشن لامع',
                maxWidth: 150,
                unit: 'perSquareMeter'
            },
            {
                id: 'glue-per-meter',
                name: 'Glue per meter',
                nameAr: 'صمغ لكل متر',
                maxWidth: null,
                unit: 'perMeter'
            }
        ],
        flex: [
            {
                id: 'matte-lamination',
                name: 'Matte Lamination',
                nameAr: 'لامينيشن مط',
                maxWidth: 150,
                unit: 'perSquareMeter'
            },
            {
                id: 'glossy-lamination',
                name: 'Glossy Lamination',
                nameAr: 'لامينيشن لامع',
                maxWidth: 150,
                unit: 'perSquareMeter'
            },
            {
                id: 'aluminum-edge',
                name: 'Aluminum Edge',
                nameAr: 'حافة ألومنيوم',
                maxWidth: null,
                unit: 'perMeter'
            },
            {
                id: 'plastic-edge',
                name: 'Plastic Edge',
                nameAr: 'حافة بلاستيك',
                maxWidth: null,
                unit: 'perMeter'
            },
            {
                id: 'full-metal-chassis-lighting',
                name: 'Full Metal Chassis with lighting',
                nameAr: 'هيكل معدني كامل مع إضاءة',
                maxWidth: null,
                unit: 'fixed'
            },
            {
                id: 'full-wooden-chassis-lighting',
                name: 'Full Wooden Chassis with lighting',
                nameAr: 'هيكل خشبي كامل مع إضاءة',
                maxWidth: null,
                unit: 'fixed'
            },
            {
                id: 'installation-per-meter',
                name: 'Installation per meter',
                nameAr: 'تركيب لكل متر',
                maxWidth: null,
                unit: 'perMeter'
            }
        ],
        special: {
            'see-through': [
                {
                    id: 'installation-per-meter',
                    name: 'Installation per meter',
                    nameAr: 'تركيب لكل متر',
                    maxWidth: null,
                    unit: 'perMeter',
                    requiresOverlap: true // If width > 150 cm
                }
            ],
            'glitter': [
                // Same as Banner Group
                {
                    id: 'matte-lamination',
                    name: 'Matte Lamination',
                    nameAr: 'لامينيشن مط',
                    maxWidth: 150,
                    unit: 'perSquareMeter'
                },
                {
                    id: 'glossy-lamination',
                    name: 'Glossy Lamination',
                    nameAr: 'لامينيشن لامع',
                    maxWidth: 150,
                    unit: 'perSquareMeter'
                },
                {
                    id: 'wooden-frame-5cm',
                    name: 'Wooden Frame 5 cm',
                    nameAr: 'إطار خشبي 5 سم',
                    maxWidth: null,
                    unit: 'perMeter'
                },
                {
                    id: 'wooden-frame-10cm',
                    name: 'Wooden Frame 10 cm',
                    nameAr: 'إطار خشبي 10 سم',
                    maxWidth: null,
                    unit: 'perMeter'
                },
                {
                    id: 'aluminum-edge',
                    name: 'Aluminum Edge',
                    nameAr: 'حافة ألومنيوم',
                    maxWidth: null,
                    unit: 'perMeter'
                },
                {
                    id: 'plastic-edge',
                    name: 'Plastic Edge',
                    nameAr: 'حافة بلاستيك',
                    maxWidth: null,
                    unit: 'perMeter'
                },
                {
                    id: 'glue-per-meter',
                    name: 'Glue per meter',
                    nameAr: 'صمغ لكل متر',
                    maxWidth: null,
                    unit: 'perMeter'
                },
                {
                    id: 'installation-per-meter',
                    name: 'Installation per meter',
                    nameAr: 'تركيب لكل متر',
                    maxWidth: null,
                    unit: 'perMeter'
                }
            ],
            'glossy': [
                {
                    id: 'matte-lamination',
                    name: 'Matte Lamination',
                    nameAr: 'لامينيشن مط',
                    maxWidth: 150,
                    unit: 'perSquareMeter'
                },
                {
                    id: 'glossy-lamination',
                    name: 'Glossy Lamination',
                    nameAr: 'لامينيشن لامع',
                    maxWidth: 150,
                    unit: 'perSquareMeter'
                },
                {
                    id: 'glue-per-meter',
                    name: 'Glue per meter',
                    nameAr: 'صمغ لكل متر',
                    maxWidth: null,
                    unit: 'perMeter'
                },
                {
                    id: 'installation-per-meter',
                    name: 'Installation per meter',
                    nameAr: 'تركيب لكل متر',
                    maxWidth: null,
                    unit: 'perMeter'
                }
            ],
            'lamination-only': [] // No addons
        }
    },

    /**
     * Get all products
     */
    getAllProducts() {
        return Object.values(this.PRODUCTS);
    },

    /**
     * Get product by ID
     */
    getProduct(productId) {
        return this.PRODUCTS[productId] || null;
    },

    /**
     * Get group by ID
     */
    getGroup(groupId) {
        return this.GROUPS[groupId] || null;
    },

    /**
     * Get product's group
     */
    getProductGroup(productId) {
        const product = this.getProduct(productId);
        if (!product) return null;
        return this.getGroup(product.groupId);
    },

    /**
     * Get addons for a product (based on its group)
     */
    getProductAddons(productId) {
        const product = this.getProduct(productId);
        if (!product) return [];

        const groupId = product.groupId;

        // Special handling for special products
        if (groupId === 'special') {
            const specialAddons = this.GROUP_ADDONS.special[productId];
            return specialAddons || [];
        }

        // Regular groups
        return this.GROUP_ADDONS[groupId] || [];
    },

    /**
     * Validate dimensions
     * @param {number} width - Width in cm
     * @param {number} height - Height in cm
     * @returns {Object} { valid: boolean, error: string }
     */
    validateDimensions(width, height) {
        const maxDimension = 310; // cm
        
        if (width > maxDimension || height > maxDimension) {
            return {
                valid: false,
                error: `الحد الأقصى للعرض أو الطول هو ${maxDimension} سم`
            };
        }
        
        if (width <= 0 || height <= 0) {
            return {
                valid: false,
                error: 'يجب أن تكون الأبعاد أكبر من صفر'
            };
        }
        
        return { valid: true, error: null };
    },

    /**
     * Validate addon compatibility
     * @param {string} addonId - Addon ID
     * @param {number} width - Width in cm
     * @returns {Object} { valid: boolean, error: string, requiresOverlap: boolean }
     */
    validateAddon(addonId, width, productId) {
        const addons = this.getProductAddons(productId);
        const addon = addons.find(a => a.id === addonId);
        
        if (!addon) {
            return { valid: false, error: 'إضافة غير موجودة', requiresOverlap: false };
        }

        // Check max width for lamination
        if (addon.maxWidth && width > addon.maxWidth) {
            if (addon.id.includes('lamination')) {
                return {
                    valid: false,
                    error: `اللامينيشن غير مسموح به للعرض أكبر من ${addon.maxWidth} سم`,
                    requiresOverlap: false
                };
            }
            // For other addons with max width, allow but mark as overlap
            return {
                valid: true,
                error: null,
                requiresOverlap: true
            };
        }

        // Check if addon requires overlap
        if (addon.requiresOverlap && width > 150) {
            return {
                valid: true,
                error: null,
                requiresOverlap: true
            };
        }

        return { valid: true, error: null, requiresOverlap: false };
    },

    /**
     * Calculate total price
     * @param {string} productId - Product ID
     * @param {number} width - Width in cm
     * @param {number} height - Height in cm
     * @param {number} quantity - Quantity
     * @param {Array} selectedAddons - Array of { addonId, price }
     * @param {number} pricePerSquareMeter - Price per square meter
     * @param {Object} groupAddonsPrices - Object with group addon prices { addonId: price }
     * @returns {Object} Calculation result
     */
    calculate(productId, width, height, quantity, selectedAddons, pricePerSquareMeter, groupAddonsPrices = {}) {
        // Convert cm to meters
        const widthM = width / 100;
        const heightM = height / 100;
        const areaM2 = widthM * heightM;

        // Base price: (width × height × quantity) × pricePerSquareMeter
        const basePrice = areaM2 * pricePerSquareMeter;

        // Calculate addons (using group prices)
        let addonsTotal = 0;
        const addonsDetails = [];

        selectedAddons.forEach(({ addonId, price }) => {
            const addons = this.getProductAddons(productId);
            const addon = addons.find(a => a.id === addonId);
            if (!addon) return;

            // Use price from selectedAddons if provided, otherwise use groupAddonsPrices
            const addonPrice = price !== undefined ? price : (groupAddonsPrices[addonId] || 0);
            let addonCost = 0;

            if (addon.unit === 'perSquareMeter') {
                addonCost = areaM2 * addonPrice;
            } else if (addon.unit === 'perMeter') {
                // Calculate perimeter
                const perimeter = (widthM + heightM) * 2;
                addonCost = perimeter * addonPrice;
            } else if (addon.unit === 'fixed') {
                addonCost = addonPrice;
            }

            addonsTotal += addonCost;
            addonsDetails.push({
                addonId,
                name: addon.nameAr,
                cost: addonCost,
                unit: addon.unit
            });
        });

        // Total for one item
        const itemTotal = basePrice + addonsTotal;

        // Total for all quantity
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
    }
};

// Expose globally
window.OutdoorPricing = OutdoorPricing;

// Outdoor adapter for pricing-admin.js compatibility
const Outdoor = {
    COLLECTION_NAME: 'outdoor_config',
    ADDONS_COLLECTION: 'outdoor_addons',
    _initialized: false,
    _addonsCache: [],
    _pricingCache: null,

    defaultAddons: (function() {
        const seen = {};
        const all = [];
        Object.values(OutdoorPricing.GROUP_ADDONS).forEach(groupAddons => {
            const list = Array.isArray(groupAddons) ? groupAddons : Object.values(groupAddons).flat();
            list.forEach(a => { if (!seen[a.id]) { seen[a.id] = true; all.push(a); } });
        });
        return all;
    })(),

    async initialize() {
        if (this._initialized) return;
        this._initialized = true;
    },

    async getProducts() {
        return OutdoorPricing.getAllProducts();
    },

    async getAddons() {
        if (this._addonsCache.length > 0) return this._addonsCache;
        this._addonsCache = this.defaultAddons;
        return this._addonsCache;
    },

    async saveAddonPrice(addonId, price) {
        if (typeof PricingService !== 'undefined') {
            await PricingService.saveProductSellPrice('Outdoor', addonId, price);
        }
    }
};
window.Outdoor = Outdoor;
