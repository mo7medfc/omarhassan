// Digital Printing — Sheet-based only, sheet 31.5×46.5 cm
// Cost/Sell fully separated: digital_prices_cost, digital_prices_sell

const DigitalPrintingPricing = {
    CATEGORY_ID: 'digital_printing',
    SELL_COLLECTION: 'digital_prices_sell',
    COST_COLLECTION: 'digital_prices_cost',
    CONFIG_DOC_ID: 'default',

    SHEET_LABEL: 'فرخ الديجيتال 31.5 × 46.5 سم',
    MAX_SHEET_WIDTH: 31.5,
    MAX_SHEET_HEIGHT: 46.5,

    PAPER_TYPES: [
        { id: 'plain_100', nameAr: 'ورق طبع 100 جرام', laminationAllowed: false, cellophaneSingle: false, cellophaneDouble: false },
        { id: 'coated_150', nameAr: 'كوشيه 150 جرام', laminationAllowed: true, cellophaneSingle: true, cellophaneDouble: false },
        { id: 'coated_200', nameAr: 'كوشيه 200 جرام', laminationAllowed: true, cellophaneSingle: true, cellophaneDouble: true },
        { id: 'coated_250', nameAr: 'كوشيه 250 جرام', laminationAllowed: true, cellophaneSingle: true, cellophaneDouble: true },
        { id: 'coated_300', nameAr: 'كوشيه 300 جرام', laminationAllowed: true, cellophaneSingle: true, cellophaneDouble: true },
        { id: 'coated_350', nameAr: 'كوشيه 350 جرام', laminationAllowed: true, cellophaneSingle: true, cellophaneDouble: true },
        { id: 'canvas', nameAr: 'ورق قماش', laminationAllowed: false, cellophaneSingle: false, cellophaneDouble: false },
        { id: 'fabriano', nameAr: 'ورق فبريانو', laminationAllowed: false, cellophaneSingle: false, cellophaneDouble: false },
        { id: 'crystal', nameAr: 'ورق كريستال', laminationAllowed: false, cellophaneSingle: false, cellophaneDouble: false },
        { id: 'opaline', nameAr: 'ورق أوبالين', laminationAllowed: false, cellophaneSingle: false, cellophaneDouble: false },
        { id: 'concorde_110', nameAr: 'كونكورد 110 جرام', laminationAllowed: false, cellophaneSingle: false, cellophaneDouble: false },
        { id: 'bristol_350', nameAr: 'برستول كوشيه 350 جرام', laminationAllowed: true, cellophaneSingle: true, cellophaneDouble: false },
        { id: 'pvc', nameAr: 'PVC', laminationAllowed: false, cellophaneSingle: false, cellophaneDouble: false },
        { id: 'sticker_paper', nameAr: 'إستيكر ورق', laminationAllowed: true, cellophaneSingle: true, cellophaneDouble: false },
        { id: 'plastic_sticker', nameAr: 'استيكر بلاستيك', laminationAllowed: true, cellophaneSingle: true, cellophaneDouble: false },
        { id: 'transparent_sticker', nameAr: 'إستيكر شفاف', laminationAllowed: true, cellophaneSingle: true, cellophaneDouble: false }
    ],

    /** بنود قسم الديجيتال */
    PRODUCT_ITEMS: [
        { id: 'business_cards', nameAr: 'كروت شخصية' },
        { id: 'flyers', nameAr: 'فلايرات ومنشورات' },
        { id: 'brochures', nameAr: 'بروشورات' },
        { id: 'posters', nameAr: 'بوسترات' },
        { id: 'certificates', nameAr: 'شهادات تقدير' },
        { id: 'sticker_plastic', nameAr: 'استيكر بلاستيك' },
        { id: 'sticker_paper', nameAr: 'استيكر ورق' },
        { id: 'folders', nameAr: 'فولدرات' }
    ],

    /**
     * أسعار التكلفة الافتراضية (ج.م / ورقة) — من قائمة الصياد
     * الأسعار لأكثر من 10 ورقات
     */
    DEFAULT_COST_PAPER_PRICES: {
        plain_100:            { priceSingle: 5.00,  priceDouble: 8.50,  cellophaneSingle: null, cellophaneDouble: null },
        coated_150:           { priceSingle: 5.50,  priceDouble: 9.00,  cellophaneSingle: 6.50,  cellophaneDouble: null },
        coated_200:           { priceSingle: 6.50,  priceDouble: 10.00, cellophaneSingle: 7.50,  cellophaneDouble: 12.00 },
        coated_250:           { priceSingle: 7.00,  priceDouble: 11.00, cellophaneSingle: 8.00,  cellophaneDouble: 13.00 },
        coated_300:           { priceSingle: 7.50,  priceDouble: 11.50, cellophaneSingle: 8.50,  cellophaneDouble: 13.50 },
        coated_350:           { priceSingle: 9.00,  priceDouble: 13.00, cellophaneSingle: 10.00, cellophaneDouble: 15.00 },
        canvas:               { priceSingle: 13.00, priceDouble: 17.00, cellophaneSingle: null, cellophaneDouble: null },
        fabriano:             { priceSingle: 13.00, priceDouble: 17.00, cellophaneSingle: null, cellophaneDouble: null },
        crystal:              { priceSingle: 15.00, priceDouble: 20.00, cellophaneSingle: null, cellophaneDouble: null },
        opaline:              { priceSingle: 11.00, priceDouble: 15.00, cellophaneSingle: null, cellophaneDouble: null },
        concorde_110:         { priceSingle: 8.00,  priceDouble: 11.00, cellophaneSingle: null, cellophaneDouble: null },
        bristol_350:          { priceSingle: 10.00, priceDouble: null,  cellophaneSingle: 11.00, cellophaneDouble: null },
        pvc:                  { priceSingle: 50.00, priceDouble: 60.00, cellophaneSingle: null, cellophaneDouble: null },
        sticker_paper:        { priceSingle: 10.50, priceDouble: null,  cellophaneSingle: 11.50, cellophaneDouble: null },
        plastic_sticker:      { priceSingle: 18.00, priceDouble: null,  cellophaneSingle: 19.00, cellophaneDouble: null },
        transparent_sticker:  { priceSingle: 20.00, priceDouble: null,  cellophaneSingle: 21.00, cellophaneDouble: null }
    },

    COST_NOTE: 'الأسعار السابقة لأكثر من 10 ورقات',

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
        return !!p.cellophaneDouble;
    },

    getAllProducts() {
        return this.PAPER_TYPES.map(p => ({ id: p.id, name: p.nameAr }));
    },

    getProductItems() {
        return this.PRODUCT_ITEMS || [];
    },

    getDefaultCostPaperPrices() {
        const out = {};
        Object.keys(this.DEFAULT_COST_PAPER_PRICES || {}).forEach(id => {
            const src = this.DEFAULT_COST_PAPER_PRICES[id];
            out[id] = {
                priceSingle: src.priceSingle != null ? src.priceSingle : 0,
                priceDouble: src.priceDouble != null ? src.priceDouble : 0,
                cellophaneSingle: src.cellophaneSingle != null ? src.cellophaneSingle : 0,
                cellophaneDouble: src.cellophaneDouble != null ? src.cellophaneDouble : 0
            };
        });
        return out;
    },

    mergePaperPrices(stored) {
        const base = {};
        this.PAPER_TYPES.forEach(p => {
            const s = (stored && stored[p.id]) || {};
            const d = (this.DEFAULT_COST_PAPER_PRICES && this.DEFAULT_COST_PAPER_PRICES[p.id]) || {};
            base[p.id] = {
                priceSingle: s.priceSingle != null ? s.priceSingle : 0,
                priceDouble: s.priceDouble != null ? s.priceDouble : 0,
                cellophaneSingle: s.cellophaneSingle != null ? s.cellophaneSingle : 0,
                cellophaneDouble: s.cellophaneDouble != null ? s.cellophaneDouble : 0,
                _supportsCellophaneSingle: !!(p.cellophaneSingle || p.laminationAllowed),
                _supportsCellophaneDouble: !!p.cellophaneDouble,
                _supportsDouble: d.priceDouble != null || s.priceDouble != null
            };
        });
        return base;
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
