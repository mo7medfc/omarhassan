// Digital Printing — Sheet-based only, max 32×47 cm
// Cost/Sell fully separated: digital_prices_cost, digital_prices_sell

const DigitalPrintingPricing = {
    CATEGORY_ID: 'digital_printing',
    SELL_COLLECTION: 'digital_prices_sell',
    COST_COLLECTION: 'digital_prices_cost',
    CONFIG_DOC_ID: 'default',

    MAX_SHEET_WIDTH: 32,
    MAX_SHEET_HEIGHT: 47,

    PAPER_TYPES: [
        { id: 'plain_100', nameAr: 'ورق طبع 100 جرام', nameEn: 'Plain Paper 100 gsm', laminationAllowed: false, laminationSingleOnly: false },
        { id: 'coated_150', nameAr: 'كوشيه 150 جرام', nameEn: 'Coated Paper 150 gsm', laminationAllowed: true, laminationSingleOnly: false },
        { id: 'coated_200', nameAr: 'كوشيه 200 جرام', nameEn: 'Coated Paper 200 gsm', laminationAllowed: true, laminationSingleOnly: false },
        { id: 'coated_250', nameAr: 'كوشيه 250 جرام', nameEn: 'Coated Paper 250 gsm', laminationAllowed: true, laminationSingleOnly: false },
        { id: 'coated_300', nameAr: 'كوشيه 300 جرام', nameEn: 'Coated Paper 300 gsm', laminationAllowed: true, laminationSingleOnly: false },
        { id: 'coated_350', nameAr: 'كوشيه 350 جرام', nameEn: 'Coated Paper 350 gsm', laminationAllowed: true, laminationSingleOnly: false },
        { id: 'canvas', nameAr: 'ورق قماش', nameEn: 'Canvas Paper', laminationAllowed: false, laminationSingleOnly: false },
        { id: 'fabriano', nameAr: 'ورق فبريانو', nameEn: 'Fabriano Paper', laminationAllowed: false, laminationSingleOnly: false },
        { id: 'crystal', nameAr: 'ورق كريستال', nameEn: 'Crystal Paper', laminationAllowed: false, laminationSingleOnly: false },
        { id: 'opaline', nameAr: 'ورق أوبالين', nameEn: 'Opaline Paper', laminationAllowed: false, laminationSingleOnly: false },
        { id: 'bristol_350', nameAr: 'برستول كوشيه 350 جرام', nameEn: 'Bristol Coated 350 gsm', laminationAllowed: true, laminationSingleOnly: false },
        { id: 'sticker_paper', nameAr: 'إستيكر ورق', nameEn: 'Sticker Paper', laminationAllowed: false, laminationSingleOnly: false },
        { id: 'plastic_sticker', nameAr: 'استيكر بلاستيك', nameEn: 'Plastic Sticker', laminationAllowed: false, laminationSingleOnly: false },
        { id: 'transparent_sticker', nameAr: 'إستيكر شفاف', nameEn: 'Transparent Sticker', laminationAllowed: false, laminationSingleOnly: false }
    ],

    PRINTING_SIDES: [
        { id: 'single', nameAr: 'وجه واحد', nameEn: 'Single Side' },
        { id: 'double', nameAr: 'وجهين', nameEn: 'Double Side' }
    ],

    /** بكرة ستان — 3 مقاسات ثابتة، كل مقاس بسعر (باللفة/البكرة) */
    STAN_ROLL_SIZES: [
        { id: '1_5_25', nameAr: 'ارتفاع 1.5 سم × 25 متر عرض', heightCm: 1.5, widthM: 25 },
        { id: '2_5_25', nameAr: 'ارتفاع 2.5 سم × 25 متر عرض', heightCm: 2.5, widthM: 25 },
        { id: '5_25', nameAr: 'ارتفاع 5 سم × 25 متر عرض', heightCm: 5, widthM: 25 }
    ],

    getStanRollSizeById(id) {
        return this.STAN_ROLL_SIZES.find(s => s.id === id) || null;
    },

    isSizeAllowed(widthCm, heightCm) {
        const w = parseFloat(widthCm) || 0;
        const h = parseFloat(heightCm) || 0;
        return w > 0 && h > 0 && w <= this.MAX_SHEET_WIDTH && h <= this.MAX_SHEET_HEIGHT;
    },

    getPiecesPerSheet(widthCm, heightCm) {
        const w = parseFloat(widthCm) || 0;
        const h = parseFloat(heightCm) || 0;
        if (w <= 0 || h <= 0 || w > this.MAX_SHEET_WIDTH || h > this.MAX_SHEET_HEIGHT) return 0;
        const a = Math.floor(this.MAX_SHEET_WIDTH / w) * Math.floor(this.MAX_SHEET_HEIGHT / h);
        const b = Math.floor(this.MAX_SHEET_WIDTH / h) * Math.floor(this.MAX_SHEET_HEIGHT / w);
        return Math.max(a, b, 1);
    },

    getSheetsNeeded(quantity, piecesPerSheet) {
        const q = parseInt(quantity, 10) || 0;
        const p = parseInt(piecesPerSheet, 10) || 1;
        if (q <= 0) return 0;
        return Math.ceil(q / p);
    },

    getPaperTypeById(id) {
        return this.PAPER_TYPES.find(p => p.id === id) || null;
    },

    canLaminationDouble(paperTypeId) {
        const p = this.getPaperTypeById(paperTypeId);
        if (!p || !p.laminationAllowed) return false;
        return !p.laminationSingleOnly;
    },

    getAllProducts() {
        return this.PAPER_TYPES.map(p => ({ id: p.id, name: p.nameAr, nameEn: p.nameEn }));
    },

    /**
     * Full calculation: base (sheets × sheet price) + lamination + extras
     */
    calculate(params) {
        const {
            quantity = 0,
            widthCm = 0,
            heightCm = 0,
            paperTypeId = '',
            printingSide = 'single',
            // Sheet prices (include printing) — from Firestore per paper type
            priceSingle = 0,
            priceDouble = 0,
            // Lamination per sheet
            laminationMatteSingle = 0,
            laminationMatteDouble = 0,
            laminationGlossySingle = 0,
            laminationGlossyDouble = 0,
            laminationType = null, // 'matte' | 'glossy' | null
            laminationSide = null, // 'single' | 'double' (side of sheet)
            // Extras
            specialColorCount = 0,
            specialColorPricePerColor = 0,
            stickerCutting = 0,
            dieCutting = 0,
            creasingCount = 0,
            creasingPricePer1000 = 0,
            perforationCount = 0,
            perforationPricePer1000 = 0,
            cornerRoundingPricePer1000 = 0,
            folderPocketQty = 0,
            folderPocketPricePerPiece = 0,
            bagAssemblyQty = 0,
            bagAssemblyPricePerBag = 0,
            paperCuttingCount = 0,
            paperCuttingPricePer1000 = 0
        } = params;

        if (!this.isSizeAllowed(widthCm, heightCm)) return null;
        const piecesPerSheet = this.getPiecesPerSheet(widthCm, heightCm);
        if (piecesPerSheet <= 0) return null;

        const qty = parseInt(quantity, 10) || 0;
        if (qty <= 0) return null;

        const sheetsNeeded = this.getSheetsNeeded(qty, piecesPerSheet);
        const sheetPrice = printingSide === 'double' ? (parseFloat(priceDouble) || 0) : (parseFloat(priceSingle) || 0);
        let total = sheetsNeeded * sheetPrice;

        let laminationCost = 0;
        if (laminationType && (laminationType === 'matte' || laminationType === 'glossy')) {
            const paper = this.getPaperTypeById(paperTypeId);
            if (paper && paper.laminationAllowed) {
                const lamSingle = laminationType === 'matte' ? laminationMatteSingle : laminationGlossySingle;
                const lamDouble = laminationType === 'matte' ? laminationMatteDouble : laminationGlossyDouble;
                if (laminationSide === 'double' && this.canLaminationDouble(paperTypeId))
                    laminationCost = sheetsNeeded * (parseFloat(lamDouble) || 0);
                else
                    laminationCost = sheetsNeeded * (parseFloat(lamSingle) || 0);
            }
        }
        total += laminationCost;

        const specialColorCost = sheetsNeeded * (parseInt(specialColorCount, 10) || 0) * (parseFloat(specialColorPricePerColor) || 0);
        total += specialColorCost;

        total += sheetsNeeded * (parseFloat(stickerCutting) || 0);
        total += sheetsNeeded * (parseFloat(dieCutting) || 0);

        const creasingCost = Math.ceil(qty / 1000) * (parseInt(creasingCount, 10) || 0) * (parseFloat(creasingPricePer1000) || 0);
        total += creasingCost;

        const perforationCost = Math.ceil(qty / 1000) * (parseInt(perforationCount, 10) || 0) * (parseFloat(perforationPricePer1000) || 0);
        total += perforationCost;

        const cornerCost = Math.ceil(qty / 1000) * (parseFloat(cornerRoundingPricePer1000) || 0);
        total += cornerCost;

        total += (parseInt(folderPocketQty, 10) || 0) * (parseFloat(folderPocketPricePerPiece) || 0);
        total += (parseInt(bagAssemblyQty, 10) || 0) * (parseFloat(bagAssemblyPricePerBag) || 0);

        const paperCuttingCost = Math.ceil(qty / 1000) * (parseInt(paperCuttingCount, 10) || 0) * (parseFloat(paperCuttingPricePer1000) || 0);
        total += paperCuttingCost;

        const paper = this.getPaperTypeById(paperTypeId);
        return {
            quantity: qty,
            widthCm,
            heightCm,
            piecesPerSheet,
            sheetsNeeded,
            sheetPrice,
            basePrice: sheetsNeeded * sheetPrice,
            laminationCost,
            specialColorCost,
            stickerCuttingCost: sheetsNeeded * (parseFloat(stickerCutting) || 0),
            dieCuttingCost: sheetsNeeded * (parseFloat(dieCutting) || 0),
            creasingCost,
            perforationCost,
            cornerRoundingCost: cornerCost,
            folderPocketCost: (parseInt(folderPocketQty, 10) || 0) * (parseFloat(folderPocketPricePerPiece) || 0),
            bagAssemblyCost: (parseInt(bagAssemblyQty, 10) || 0) * (parseFloat(bagAssemblyPricePerBag) || 0),
            paperCuttingCost,
            total,
            paperTypeNameAr: paper ? paper.nameAr : paperTypeId,
            printingSideLabel: printingSide === 'double' ? 'وجهين' : 'وجه واحد'
        };
    }
};

window.DigitalPrintingPricing = DigitalPrintingPricing;
