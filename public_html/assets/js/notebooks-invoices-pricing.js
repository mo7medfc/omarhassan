// Notebooks / Invoices — FOUR BANDS: Carbon, Original Only, Prescription, Offset
// Parent sheet 70×100 cm | Max digital 30×21 cm | Cost/Sell separated

const NotebooksInvoicesPricing = {
    CATEGORY_ID: 'notebooks_invoices',
    SELL_COLLECTION: 'notebooks_sell_prices',
    COST_COLLECTION: 'notebooks_cost_prices',

    PARENT_WIDTH: 70,
    PARENT_HEIGHT: 100,
    MAX_DIGITAL_WIDTH: 30,
    MAX_DIGITAL_HEIGHT: 21,
    WASTE_SHEETS: 3,
    PRINTABLE_PIECES_20x30: 11, // كل لوحة 70×100 تقص 20×30 → 11 قطعة للطباعة الرقمية

    BINDING_REF_AREA: 20 * 30,
    BINDING_REF_PRICE: 15,

    CONFIG_DOC_ID: 'default',

    BANDS: {
        carbon: { id: 'carbon', nameAr: 'المكربن', nameEn: 'Carbon Notebooks' },
        original_only: { id: 'original_only', nameAr: 'اصل فقط', nameEn: 'Original Only' },
        prescription: { id: 'prescription', nameAr: 'روشتة', nameEn: 'Prescription' },
        offset: { id: 'offset', nameAr: 'دفتر', nameEn: 'Offset Notebooks' }
    },

    PAPER_TYPES_CARBON: [
        { id: '1copy', nameAr: 'أصلي + نسخة واحدة', multiplier: 2 },
        { id: '2copies', nameAr: 'أصلي + نسختين', multiplier: 3 }
    ],
    PAPER_TYPES_GSM: [
        { id: '60', nameAr: '60 جم' },
        { id: '70', nameAr: '70 جم' },
        { id: '80', nameAr: '80 جم' },
        { id: '100', nameAr: '100 جم' },
        { id: '120', nameAr: '120 جم' }
    ],
    OFFSET_COPIES: [1, 2, 3, 4, 5, 6, 7, 8],
    /** صنف دفتر: أصل+صورة حتى أصل+8 صورة، ثم ورق 60–120 جرام — كل نوع له سعر للـ 100 ورقة */
    OFFSET_PAPER_TYPES: [
        { id: '1', nameAr: 'أصل وصورة' },
        { id: '2', nameAr: 'أصل وصورتين' },
        { id: '3', nameAr: 'أصل و 3 صورة' },
        { id: '4', nameAr: 'أصل و 4 صورة' },
        { id: '5', nameAr: 'أصل و 5 صورة' },
        { id: '6', nameAr: 'أصل و 6 صورة' },
        { id: '7', nameAr: 'أصل و 7 صورة' },
        { id: '8', nameAr: 'أصل و 8 صورة' },
        { id: '60', nameAr: 'ورق 60 جرام' },
        { id: '70', nameAr: 'ورق 70 جرام' },
        { id: '80', nameAr: 'ورق 80 جرام' },
        { id: '100', nameAr: 'ورق 100 جرام' },
        { id: '120', nameAr: 'ورق 120 جرام' }
    ],

    getAllProducts() {
        return [];
    },

    /**
     * Size larger than 30×21 cm → Offset band
     */
    isOffsetSize(widthCm, heightCm) {
        const w = parseFloat(widthCm) || 0;
        const h = parseFloat(heightCm) || 0;
        return w > this.MAX_DIGITAL_WIDTH || h > this.MAX_DIGITAL_HEIGHT;
    },

    getPiecesPerParentSheet(widthCm, heightCm) {
        const w = parseFloat(widthCm) || 0;
        const h = parseFloat(heightCm) || 0;
        if (w <= 0 || h <= 0) return 0;
        const a = Math.floor(this.PARENT_WIDTH / w) * Math.floor(this.PARENT_HEIGHT / h);
        const b = Math.floor(this.PARENT_WIDTH / h) * Math.floor(this.PARENT_HEIGHT / w);
        return Math.max(a, b, 1);
    },

    getBindingPriceForSize(widthCm, heightCm, bindingRefPrice) {
        const ref = parseFloat(bindingRefPrice) || this.BINDING_REF_PRICE;
        const area = (parseFloat(widthCm) || 0) * (parseFloat(heightCm) || 0);
        if (area <= 0) return ref;
        return (ref * area) / this.BINDING_REF_AREA;
    },

    getCarbonMultiplier(paperType) {
        const p = this.PAPER_TYPES_CARBON.find(x => x.id === paperType);
        return p ? p.multiplier : 2;
    },

    calcSerialCost(printedSheets, serialEnabled, pricePer1000) {
        if (!serialEnabled) return 0;
        const p = parseFloat(pricePer1000) || 0;
        const sheets = parseInt(printedSheets, 10) || 0;
        if (sheets <= 0) return p;
        return Math.ceil(sheets / 1000) * p;
    },

    /**
     * Digital bands (Carbon, Original Only, Prescription): same math
     * Carbon: printable × 11 × copyMultiplier; Original/Prescription: printable × 11 × 1
     */
    calculateDigital(params) {
        const {
            band,
            widthCm,
            heightCm,
            notebooks,
            internalPages = 50,
            paperType,
            colorOption = 'one',
            serialEnabled = false,
            pricePerParentSheet = 0,
            bindingRef20x30 = 15,
            printingOneColor = 0.15,
            printingFullColor = 0.25,
            serialPer1000 = 100
        } = params;

        const piecesPerParent = this.getPiecesPerParentSheet(widthCm, heightCm);
        if (piecesPerParent <= 0) return null;

        const bindingPerNotebook = this.getBindingPriceForSize(widthCm, heightCm, bindingRef20x30);
        const totalInternalSheets = (parseInt(notebooks, 10) || 0) * (parseInt(internalPages, 10) || 50);
        const requiredParent = Math.ceil(totalInternalSheets / piecesPerParent);
        const totalParentSheets = requiredParent + this.WASTE_SHEETS;
        const paperCost = totalParentSheets * (parseFloat(pricePerParentSheet) || 0);
        const printablePieces = totalParentSheets * this.PRINTABLE_PIECES_20x30;
        const copyMult = band === 'carbon' ? this.getCarbonMultiplier(paperType) : 1;
        const printedSheets = Math.round(printablePieces * copyMult);
        const printingCost = printedSheets * (colorOption === 'full' ? (parseFloat(printingFullColor) || 0) : (parseFloat(printingOneColor) || 0));
        const bindingCost = (parseInt(notebooks, 10) || 0) * bindingPerNotebook;
        const serialCost = this.calcSerialCost(printedSheets, serialEnabled, serialPer1000);
        const total = paperCost + printingCost + bindingCost + serialCost;

        const bandInfo = this.BANDS[band] || this.BANDS.original_only;
        const productName = band === 'prescription' ? 'Prescription' : `دفتر ${widthCm} × ${heightCm} سم`;

        return {
            band,
            bandNameAr: bandInfo.nameAr,
            totalInternalSheets,
            requiredParentSheets: requiredParent,
            totalParentSheets,
            piecesPerParentSheet: piecesPerParent,
            printablePieces,
            printedSheets,
            paperCost,
            printingCost,
            bindingCost,
            bindingPricePerNotebook: bindingPerNotebook,
            serialCost,
            total,
            productName: band === 'prescription' ? 'روشتة' : `دفتر ${widthCm}×${heightCm} سم`,
            invoiceLabel: band === 'prescription' ? 'Prescription' : bandInfo.nameAr
        };
    },

    /**
     * Offset band (دفتر): كل نوع له سعر للـ 100 ورقة — الإجمالي = (ورق أم / 100) × سعر النوع + ربط + سيريال
     */
    calculateOffset(params) {
        const {
            widthCm,
            heightCm,
            notebooks,
            internalPages = 50,
            offsetPaperTypeId = '1',
            serialEnabled = false,
            bindingRef20x30 = 15,
            serialPer1000 = 100,
            offsetPricePer100 = {}
        } = params;

        const piecesPerParent = this.getPiecesPerParentSheet(widthCm, heightCm);
        if (piecesPerParent <= 0) return null;

        const bindingPerNotebook = this.getBindingPriceForSize(widthCm, heightCm, bindingRef20x30);
        const totalInternalSheets = (parseInt(notebooks, 10) || 0) * (parseInt(internalPages, 10) || 50);
        const requiredParent = Math.ceil(totalInternalSheets / piecesPerParent);
        const totalParentSheets = requiredParent + this.WASTE_SHEETS;
        const pricePer100 = parseFloat(offsetPricePer100[offsetPaperTypeId] || offsetPricePer100[String(offsetPaperTypeId)] || 0);
        const paperCost = (totalParentSheets / 100) * pricePer100;
        const bindingCost = (parseInt(notebooks, 10) || 0) * bindingPerNotebook;
        const printedSheets = totalParentSheets;
        const serialCost = this.calcSerialCost(printedSheets, serialEnabled, serialPer1000);
        const total = paperCost + bindingCost + serialCost;

        const bandInfo = this.BANDS.offset;
        const typeOption = this.OFFSET_PAPER_TYPES.find(t => t.id === String(offsetPaperTypeId));
        const typeNameAr = typeOption ? typeOption.nameAr : offsetPaperTypeId;
        return {
            band: 'offset',
            bandNameAr: bandInfo.nameAr,
            offsetPaperTypeId,
            offsetPaperTypeNameAr: typeNameAr,
            totalInternalSheets,
            requiredParentSheets: requiredParent,
            totalParentSheets,
            piecesPerParentSheet: piecesPerParent,
            printedSheets,
            paperCost,
            printingCost: 0,
            bindingCost,
            bindingPricePerNotebook: bindingPerNotebook,
            serialCost,
            total,
            productName: `دفتر ${widthCm}×${heightCm} سم — ${typeNameAr}`,
            invoiceLabel: bandInfo.nameAr
        };
    },

    /**
     * Single entry: band + params → result
     */
    calculate(params) {
        const { band, widthCm, heightCm } = params;
        const isOffset = this.isOffsetSize(widthCm, heightCm);
        if (isOffset || band === 'offset') {
            return this.calculateOffset(params);
        }
        return this.calculateDigital(params);
    }
};

window.NotebooksInvoicesPricing = NotebooksInvoicesPricing;
