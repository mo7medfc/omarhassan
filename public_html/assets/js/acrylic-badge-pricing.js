// Acrylic & Badge (Gold/Silver) Pricing Module
// اكريلك و باغ (دهبي – فضي)
// Area-ratio pricing: (w × h) / (baseW × baseH) × sheetPrice

const AcrylicBadgePricing = {
    CATEGORY_ID: 'acrylic_badge',
    SELL_COLLECTION: 'acrylic_badge_prices_sell',
    COST_COLLECTION: 'acrylic_badge_prices_cost',

    // ─── Acrylic Sub-band ───
    ACRYLIC_BASE_WIDTH: 60,   // cm
    ACRYLIC_BASE_HEIGHT: 90,  // cm

    ACRYLIC_MATERIALS: [
        { id: 'acrylic_3mm',  nameAr: 'اكريلك 3 ملل',  thickness: 3 },
        { id: 'acrylic_4mm',  nameAr: 'اكريلك 4 ملل',  thickness: 4 },
        { id: 'acrylic_5mm',  nameAr: 'اكريلك 5 ملل',  thickness: 5 },
        { id: 'acrylic_6mm',  nameAr: 'اكريلك 6 ملل',  thickness: 6 },
        { id: 'acrylic_8mm',  nameAr: 'اكريلك 8 ملل',  thickness: 8 },
        { id: 'acrylic_10mm', nameAr: 'اكريلك 10 ملل', thickness: 10 }
    ],

    ACRYLIC_ADDITIONS: [
        { id: 'vinyl_clear_white_back', nameAr: 'فنيل شفاف مقلوب + ضهر أبيض' },
        { id: 'uv_printing',            nameAr: 'طباعة UV' },
        { id: 'laser_cutting',          nameAr: 'تقطيع ليزر' }
    ],

    // ─── Badge Sub-band ───
    BADGE_BASE_WIDTH: 60,    // cm
    BADGE_BASE_HEIGHT: 120,  // cm (includes laser engraving)

    // ─── Shared Screw Additions ───
    SCREW_TYPES: [
        { id: 'screw_protruding', nameAr: 'مسمار ديكور بارز' },
        { id: 'screw_flush',     nameAr: 'مسمار ديكور لاطش داخلي' }
    ],

    // ─── Helpers ───
    getMaterialById(id) {
        return this.ACRYLIC_MATERIALS.find(m => m.id === id) || null;
    },

    getAdditionById(id) {
        return this.ACRYLIC_ADDITIONS.find(a => a.id === id) || null;
    },

    getScrewById(id) {
        return this.SCREW_TYPES.find(s => s.id === id) || null;
    },

    getAllProducts() {
        const items = [];
        // Acrylic materials
        this.ACRYLIC_MATERIALS.forEach(m => items.push({ id: m.id, name: m.nameAr, section: 'acrylic_material' }));
        // Acrylic additions
        this.ACRYLIC_ADDITIONS.forEach(a => items.push({ id: a.id, name: a.nameAr, section: 'acrylic_addition' }));
        // Badge base
        items.push({ id: 'badge_base', name: 'باغ (دهبي – فضي) شامل حفر ليزر', section: 'badge' });
        // Screws
        this.SCREW_TYPES.forEach(s => items.push({ id: s.id, name: s.nameAr, section: 'screw' }));
        return items;
    },

    /**
     * Calculate area ratio relative to base sheet
     */
    areaRatio(w, h, baseW, baseH) {
        if (baseW <= 0 || baseH <= 0 || w <= 0 || h <= 0) return 0;
        return (w * h) / (baseW * baseH);
    },

    /**
     * Calculate acrylic order
     * @param {Object} params
     * @param {string} params.materialId - e.g. 'acrylic_5mm'
     * @param {number} params.width - cm
     * @param {number} params.height - cm
     * @param {number} params.quantity - number of pieces
     * @param {Object} params.prices - { materialId: price, additionId: price, screwId: price } from Firestore
     * @param {Array}  params.additions - ['vinyl_clear_white_back', 'uv_printing', ...]
     * @param {Object} params.screws - { screwId: count } e.g. { screw_protruding: 6 }
     * @returns {Object} breakdown
     */
    calculateAcrylic(params) {
        const {
            materialId = '',
            width = 0,
            height = 0,
            quantity = 1,
            prices = {},
            additions = [],
            screws = {}
        } = params;

        if (!materialId || width <= 0 || height <= 0 || quantity <= 0) return null;

        const ratio = this.areaRatio(width, height, this.ACRYLIC_BASE_WIDTH, this.ACRYLIC_BASE_HEIGHT);
        const material = this.getMaterialById(materialId);

        // Material cost per piece
        const sheetPrice = parseFloat(prices[materialId]) || 0;
        const materialPricePerPiece = sheetPrice * ratio;
        const materialTotal = materialPricePerPiece * quantity;

        // Additions (each priced per 60×90 sheet, scaled by area ratio)
        const additionsBreakdown = [];
        let additionsTotal = 0;
        for (const addId of additions) {
            const add = this.getAdditionById(addId);
            if (!add) continue;
            const addSheetPrice = parseFloat(prices[addId]) || 0;
            const addPricePerPiece = addSheetPrice * ratio;
            const addTotal = addPricePerPiece * quantity;
            additionsBreakdown.push({
                id: addId,
                nameAr: add.nameAr,
                sheetPrice: addSheetPrice,
                pricePerPiece: addPricePerPiece,
                total: addTotal
            });
            additionsTotal += addTotal;
        }

        // Screws (flat per-unit price × count × quantity)
        const screwsBreakdown = [];
        let screwsTotal = 0;
        for (const [screwId, count] of Object.entries(screws)) {
            if (!count || count <= 0) continue;
            const screw = this.getScrewById(screwId);
            if (!screw) continue;
            const pricePerScrew = parseFloat(prices[screwId]) || 0;
            const total = pricePerScrew * count * quantity;
            screwsBreakdown.push({
                id: screwId,
                nameAr: screw.nameAr,
                pricePerScrew,
                count,
                total
            });
            screwsTotal += total;
        }

        const grandTotal = materialTotal + additionsTotal + screwsTotal;

        return {
            subBand: 'acrylic',
            materialId,
            materialNameAr: material ? material.nameAr : materialId,
            width,
            height,
            quantity,
            ratio,
            sheetPrice,
            materialPricePerPiece,
            materialTotal,
            additionsBreakdown,
            additionsTotal,
            screwsBreakdown,
            screwsTotal,
            grandTotal,
            pricePerPiece: quantity > 0 ? grandTotal / quantity : 0
        };
    },

    /**
     * Calculate badge order
     * @param {Object} params
     * @param {number} params.width - cm
     * @param {number} params.height - cm
     * @param {number} params.quantity
     * @param {Object} params.prices - { badge_base: price, screwId: price }
     * @param {Object} params.screws - { screwId: count }
     * @returns {Object} breakdown
     */
    calculateBadge(params) {
        const {
            width = 0,
            height = 0,
            quantity = 1,
            prices = {},
            screws = {}
        } = params;

        if (width <= 0 || height <= 0 || quantity <= 0) return null;

        const ratio = this.areaRatio(width, height, this.BADGE_BASE_WIDTH, this.BADGE_BASE_HEIGHT);

        // Base price (includes laser engraving)
        const baseSheetPrice = parseFloat(prices['badge_base']) || 0;
        const basePricePerPiece = baseSheetPrice * ratio;
        const baseTotal = basePricePerPiece * quantity;

        // Screws
        const screwsBreakdown = [];
        let screwsTotal = 0;
        for (const [screwId, count] of Object.entries(screws)) {
            if (!count || count <= 0) continue;
            const screw = this.getScrewById(screwId);
            if (!screw) continue;
            const pricePerScrew = parseFloat(prices[screwId]) || 0;
            const total = pricePerScrew * count * quantity;
            screwsBreakdown.push({
                id: screwId,
                nameAr: screw.nameAr,
                pricePerScrew,
                count,
                total
            });
            screwsTotal += total;
        }

        const grandTotal = baseTotal + screwsTotal;

        return {
            subBand: 'badge',
            width,
            height,
            quantity,
            ratio,
            baseSheetPrice,
            basePricePerPiece,
            baseTotal,
            screwsBreakdown,
            screwsTotal,
            grandTotal,
            pricePerPiece: quantity > 0 ? grandTotal / quantity : 0
        };
    }
};

window.AcrylicBadgePricing = AcrylicBadgePricing;
