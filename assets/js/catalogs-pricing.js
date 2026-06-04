// Catalogs Pricing Module - الكتالوجات
// Structure like البرشورات but calculation engine = الديجيتال
// Fixed base sheet size: 32×64
// Paper types from الديجيتال category
// Final = (Sum of sheet costs × catalog qty) + additions + finishing

const CatalogsPricing = {
    CATEGORY_ID: 'catalogs',
    SELL_COLLECTION: 'catalogs_prices_sell',
    COST_COLLECTION: 'catalogs_prices_cost',

    // Fixed base sheet size for catalogs
    BASE_WIDTH: 32,
    BASE_HEIGHT: 64,

    // Reuse digital printing paper types
    getPaperTypes() {
        if (typeof DigitalPrintingPricing !== 'undefined') {
            return DigitalPrintingPricing.PAPER_TYPES;
        }
        return [];
    },

    getPaperTypeById(id) {
        const types = this.getPaperTypes();
        return types.find(p => p.id === id) || null;
    },

    getAllProducts() {
        return this.getPaperTypes().map(p => ({ id: p.id, name: p.nameAr }));
    },

    // Add-ons (same structure as brochures)
    ADDITIONS: [
        { id: 'specialColor', nameAr: 'لون اسبشيال (دهبى / فضى / أبيض)', supportsSides: true },
        { id: 'matteCellophane', nameAr: 'سلوفان مط', supportsSides: true },
        { id: 'glossyCellophane', nameAr: 'سلوفان لامع', supportsSides: true },
        { id: 'dieCutting', nameAr: 'تكسرير + فورمة', supportsSides: false, hasForm: true },
        { id: 'embossing', nameAr: 'بصمة + فورمة', supportsSides: true, hasForm: true },
        { id: 'debossing', nameAr: 'كفراج + فورمة', supportsSides: false, hasForm: true },
        { id: 'creasing', nameAr: 'ريجة', supportsCount: true },
        { id: 'cornering', nameAr: 'ركنة', supportsSides: false },
        { id: 'perforation', nameAr: 'تخريم', supportsCount: true },
        { id: 'spotUV', nameAr: 'سبوت', supportsSides: true }
    ],

    // Finishing options (per catalog piece)
    FINISHING_OPTIONS: [
        { id: 'staple', nameAr: 'دبوس' },
        { id: 'saddle_stitch', nameAr: 'بشر' },
        { id: 'spiral_wire', nameAr: 'سلك لولبي' }
    ],

    getAdditionById(id) {
        return this.ADDITIONS.find(a => a.id === id) || null;
    },

    getFinishingById(id) {
        return this.FINISHING_OPTIONS.find(f => f.id === id) || null;
    },

    /**
     * Calculate pieces per sheet for the fixed 32×64 base
     */
    getPiecesPerSheet(widthCm, heightCm) {
        const w = parseFloat(widthCm) || 0;
        const h = parseFloat(heightCm) || 0;
        if (w <= 0 || h <= 0) return 0;
        const a = Math.floor(this.BASE_WIDTH / w) * Math.floor(this.BASE_HEIGHT / h);
        const b = Math.floor(this.BASE_WIDTH / h) * Math.floor(this.BASE_HEIGHT / w);
        return Math.max(a, b, 1);
    },

    /**
     * Calculate cost for a single sheet type using digital pricing logic
     * @param {Object} sheet - { paperTypeId, printingSide, repetition }
     * @param {Object} prices - { paperTypeId: { single: N, double: N } } from Firestore
     * @returns {Object} cost breakdown
     */
    calculateSheetCost(sheet, prices = {}) {
        const {
            paperTypeId = '',
            printingSide = 'single',
            repetition = 1
        } = sheet;

        if (!paperTypeId || repetition <= 0) {
            return { sheetPrice: 0, sheetsNeeded: 0, totalCost: 0, repetition, details: null };
        }

        // Fixed size: each catalog sheet uses 32×64 base
        // 1 piece per sheet (full sheet = 1 catalog page)
        const piecesPerSheet = 1;
        const sheetsNeeded = repetition; // each repetition = 1 sheet

        // Get price per sheet from Firestore prices
        const paperPrices = prices[paperTypeId] || {};
        const sheetPrice = printingSide === 'double'
            ? (parseFloat(paperPrices.double || paperPrices.priceDouble || paperPrices.sellingPrice || 0))
            : (parseFloat(paperPrices.single || paperPrices.priceSingle || paperPrices.sellingPrice || 0));

        const totalCost = sheetsNeeded * sheetPrice;
        const paper = this.getPaperTypeById(paperTypeId);

        return {
            sheetPrice,
            piecesPerSheet,
            sheetsNeeded,
            totalCost,
            repetition,
            paperTypeName: paper ? paper.nameAr : paperTypeId,
            printingSide,
            details: {
                baseWidth: this.BASE_WIDTH,
                baseHeight: this.BASE_HEIGHT,
                sheetsNeeded,
                sheetPrice,
                totalCost
            }
        };
    },

    /**
     * Calculate additions cost
     * Uses OffsetPricing additions engine if available
     */
    calculateAdditionsCost(additions, totalQuantity, widthCm, heightCm) {
        if (!additions || Object.keys(additions).length === 0) {
            return { total: 0, details: [] };
        }

        if (typeof OffsetPricing !== 'undefined') {
            return OffsetPricing.calculateAdditionsCost(additions, totalQuantity, null, widthCm, heightCm);
        }

        return { total: 0, details: [] };
    },

    /**
     * Main calculation for a catalog order
     * @param {Object} params
     * @param {number} params.catalogQuantity - number of catalogs
     * @param {Array} params.sheets - array of sheet objects { paperTypeId, printingSide, repetition }
     * @param {Object} params.additions - additions selections
     * @param {Object} params.finishing - { type, pricePerPiece }
     * @param {Object} params.prices - pricing data from Firestore { paperTypeId: { single, double } }
     * @returns {Object} full calculation breakdown
     */
    calculate(params) {
        const {
            catalogQuantity = 0,
            sheets = [],
            additions = {},
            finishing = null,
            prices = {}
        } = params;

        if (catalogQuantity <= 0 || sheets.length === 0) {
            return null;
        }

        // 1) Calculate cost for each sheet type
        const sheetResults = [];
        let totalSheetsCostPerCatalog = 0;

        for (const sheet of sheets) {
            const result = this.calculateSheetCost(sheet, prices);
            sheetResults.push({
                ...sheet,
                ...result
            });
            totalSheetsCostPerCatalog += result.totalCost;
        }

        // 2) Total sheets cost × catalog quantity
        const totalSheetsCost = totalSheetsCostPerCatalog * catalogQuantity;

        // 3) Total printed sheets for additions calc
        const totalSheetsCount = sheets.reduce((sum, s) => sum + (s.repetition || 1), 0);
        const totalPrintedSheets = totalSheetsCount * catalogQuantity;

        // 4) Additions cost
        const additionsResult = this.calculateAdditionsCost(
            additions,
            totalPrintedSheets,
            this.BASE_WIDTH,
            this.BASE_HEIGHT
        );
        const additionsCost = additionsResult.total;

        // 5) Finishing cost (per catalog piece)
        let finishingCost = 0;
        let finishingName = '';
        if (finishing && finishing.type) {
            const finishOption = this.getFinishingById(finishing.type);
            finishingName = finishOption ? finishOption.nameAr : finishing.type;
            const pricePerPiece = parseFloat(finishing.pricePerPiece) || 0;
            finishingCost = pricePerPiece * catalogQuantity;
        }

        // 6) Total
        const totalCost = totalSheetsCost + additionsCost + finishingCost;
        const costPerCatalog = catalogQuantity > 0 ? totalCost / catalogQuantity : 0;

        return {
            catalogQuantity,
            sheetsCount: sheets.length,
            totalSheetsPerCatalog: totalSheetsCount,
            totalPrintedSheets,
            sheetResults,
            totalSheetsCostPerCatalog,
            totalSheetsCost,
            additionsCost,
            additionsDetails: additionsResult.details || [],
            finishingType: finishing?.type || null,
            finishingName,
            finishingPricePerPiece: finishing?.pricePerPiece || 0,
            finishingCost,
            totalCost,
            costPerCatalog,
            baseSize: { width: this.BASE_WIDTH, height: this.BASE_HEIGHT }
        };
    }
};

window.CatalogsPricing = CatalogsPricing;
