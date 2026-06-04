// Brochures Pricing Module - البرشورات
// Works like Offset but with multiple sheets per brochure
// Each sheet can have different specs and repetition count
// Final = (Sum of sheet costs × brochure qty) + additions + finishing

const BrochuresPricing = {
    CATEGORY_ID: 'brochures',
    SELL_COLLECTION: 'brochures_prices_sell',
    COST_COLLECTION: 'brochures_prices_cost',

    // Paper types for brochures
    PAPER_TYPES: [
        // كوشية
        { id: 'coated_90', nameAr: 'ورق كوشية 90 جرام', group: 'كوشية' },
        { id: 'coated_115', nameAr: 'ورق كوشية 115 جرام', group: 'كوشية' },
        { id: 'coated_130', nameAr: 'ورق كوشية 130 جرام', group: 'كوشية' },
        { id: 'coated_150', nameAr: 'ورق كوشية 150 جرام', group: 'كوشية' },
        { id: 'coated_170', nameAr: 'ورق كوشية 170 جرام', group: 'كوشية' },
        { id: 'coated_200', nameAr: 'ورق كوشية 200 جرام', group: 'كوشية' },
        { id: 'coated_250', nameAr: 'ورق كوشية 250 جرام', group: 'كوشية' },
        { id: 'coated_300', nameAr: 'ورق كوشية 300 جرام', group: 'كوشية' },
        { id: 'coated_350', nameAr: 'ورق كوشية 350 جرام', group: 'كوشية' },
        // برستول كوشية
        { id: 'bristol_230', nameAr: 'برستول كوشية 230 جرام', group: 'برستول كوشية' },
        { id: 'bristol_250', nameAr: 'برستول كوشية 250 جرام', group: 'برستول كوشية' },
        { id: 'bristol_270', nameAr: 'برستول كوشية 270 جرام', group: 'برستول كوشية' },
        { id: 'bristol_300', nameAr: 'برستول كوشية 300 جرام', group: 'برستول كوشية' },
        { id: 'bristol_350', nameAr: 'برستول كوشية 350 جرام', group: 'برستول كوشية' }
    ],

    // Add-ons for brochures
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

    // Finishing options (per brochure piece)
    FINISHING_OPTIONS: [
        { id: 'staple', nameAr: 'دبوس' },
        { id: 'saddle_stitch', nameAr: 'بشر' },
        { id: 'spiral_wire', nameAr: 'سلك لولبي' }
    ],

    getPaperTypeById(id) {
        return this.PAPER_TYPES.find(p => p.id === id) || null;
    },

    getAdditionById(id) {
        return this.ADDITIONS.find(a => a.id === id) || null;
    },

    getFinishingById(id) {
        return this.FINISHING_OPTIONS.find(f => f.id === id) || null;
    },

    getAllProducts() {
        return this.PAPER_TYPES.map(p => ({ id: p.id, name: p.nameAr }));
    },

    /**
     * Calculate cost for a single sheet using offset logic
     * @param {Object} sheet - { paperTypeId, widthCm, heightCm, colors, doubleSided, repetition }
     * @param {Object} prices - pricing data from Firestore
     * @returns {Object} cost breakdown for this sheet
     */
    calculateSheetCost(sheet, prices = {}) {
        const {
            paperTypeId = '',
            widthCm = 0,
            heightCm = 0,
            colors = 4,
            doubleSided = false,
            repetition = 1
        } = sheet;

        if (widthCm <= 0 || heightCm <= 0 || repetition <= 0) {
            return { unitCost: 0, totalCost: 0, repetition, details: null };
        }

        // Use OffsetPricing if available to calculate per-sheet cost
        if (typeof OffsetPricing !== 'undefined') {
            // Get paper type info from PricingAdmin
            let paperType = null;
            if (typeof PricingAdmin !== 'undefined' && PricingAdmin.loadPaperTypes) {
                const paperTypes = PricingAdmin.loadPaperTypes();
                paperType = paperTypes.find(p => p.id.toString() === paperTypeId.toString());
            }

            // Fallback paper type
            if (!paperType) {
                const brochurePaper = this.getPaperTypeById(paperTypeId);
                paperType = {
                    name: brochurePaper ? brochurePaper.nameAr : paperTypeId,
                    baseSize: { width: 70, height: 100 },
                    price: parseFloat(prices[paperTypeId]) || 6.5
                };
            }

            // Calculate using offset logic for quantity=1 (single sheet of brochure)
            // We pass repetition as quantity since each sheet type is repeated N times
            const calc = OffsetPricing.calculate(widthCm, heightCm, repetition, colors, doubleSided, paperType, {});
            
            return {
                unitCost: calc.productionCost,
                totalCost: calc.productionCost,
                repetition,
                paperTypeName: paperType.name || paperTypeId,
                details: calc
            };
        }

        // Fallback: simple cost estimate
        const paperPrice = parseFloat(prices[paperTypeId]) || 6.5;
        const baseCost = paperPrice * repetition;
        return {
            unitCost: baseCost,
            totalCost: baseCost,
            repetition,
            paperTypeName: paperTypeId,
            details: null
        };
    },

    /**
     * Calculate additions cost for brochure
     * Uses the same AdditionsEngine/OffsetPricing logic
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
     * Main calculation for a brochure order
     * @param {Object} params
     * @param {number} params.brochureQuantity - number of brochures
     * @param {Array} params.sheets - array of sheet objects
     * @param {Object} params.additions - additions selections
     * @param {Object} params.finishing - { type: 'staple'|'saddle_stitch'|'spiral_wire', pricePerPiece: N }
     * @param {Object} params.prices - pricing data from Firestore
     * @returns {Object} full calculation breakdown
     */
    calculate(params) {
        const {
            brochureQuantity = 0,
            sheets = [],
            additions = {},
            finishing = null,
            prices = {}
        } = params;

        if (brochureQuantity <= 0 || sheets.length === 0) {
            return null;
        }

        // 1) Calculate cost for each sheet type
        const sheetResults = [];
        let totalSheetsCostPerBrochure = 0;

        for (const sheet of sheets) {
            const result = this.calculateSheetCost(sheet, prices);
            sheetResults.push({
                ...sheet,
                ...result,
                paperTypeName: result.paperTypeName || sheet.paperTypeId
            });
            totalSheetsCostPerBrochure += result.totalCost;
        }

        // 2) Sheets cost × brochure quantity
        const totalSheetsCost = totalSheetsCostPerBrochure * brochureQuantity;

        // 3) Calculate total sheets count for additions
        const totalSheetsCount = sheets.reduce((sum, s) => sum + (s.repetition || 1), 0);
        const totalPrintedSheets = totalSheetsCount * brochureQuantity;

        // 4) Additions cost (applied to total printed sheets)
        const additionsResult = this.calculateAdditionsCost(
            additions,
            totalPrintedSheets,
            sheets[0]?.widthCm || 0,
            sheets[0]?.heightCm || 0
        );
        const additionsCost = additionsResult.total;

        // 5) Finishing cost (per brochure piece)
        let finishingCost = 0;
        let finishingName = '';
        if (finishing && finishing.type) {
            const finishOption = this.getFinishingById(finishing.type);
            finishingName = finishOption ? finishOption.nameAr : finishing.type;
            const pricePerPiece = parseFloat(finishing.pricePerPiece) || 0;
            finishingCost = pricePerPiece * brochureQuantity;
        }

        // 6) Total
        const totalCost = totalSheetsCost + additionsCost + finishingCost;
        const costPerBrochure = brochureQuantity > 0 ? totalCost / brochureQuantity : 0;

        return {
            brochureQuantity,
            sheetsCount: sheets.length,
            totalSheetsPerBrochure: totalSheetsCount,
            totalPrintedSheets,
            sheetResults,
            totalSheetsCostPerBrochure,
            totalSheetsCost,
            additionsCost,
            additionsDetails: additionsResult.details || [],
            finishingType: finishing?.type || null,
            finishingName,
            finishingPricePerPiece: finishing?.pricePerPiece || 0,
            finishingCost,
            totalCost,
            costPerBrochure
        };
    }
};

window.BrochuresPricing = BrochuresPricing;
