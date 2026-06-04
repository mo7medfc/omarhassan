// باند الشنط الورقية — جميع الأسعار بالـ 1000 شنطة
// ملاحظة ثابتة: الشنطة تُحسب وهي مفرودة، مش وهي مقفولة
// Cost/Sell: paper_bags_prices_sell, paper_bags_prices_cost

const PaperBagsPricing = {
    CATEGORY_ID: 'paper_bags',
    SELL_COLLECTION: 'paper_bags_prices_sell',
    COST_COLLECTION: 'paper_bags_prices_cost',
    CONFIG_DOC_ID: 'default',

    /** مراحل التشغيل: ورق، قص مبدئي، زنجات، طباعة، تقفيل، يد الشنطة */

    /** أنواع الورق */
    PAPER_TYPES: [
        { id: 'kraft_80', nameAr: 'كرافت 80 جم', nameEn: 'Kraft 80 gsm' },
        { id: 'kraft_100', nameAr: 'كرافت 100 جم', nameEn: 'Kraft 100 gsm' },
        { id: 'white_80', nameAr: 'أبيض 80 جم', nameEn: 'White 80 gsm' },
        { id: 'white_100', nameAr: 'أبيض 100 جم', nameEn: 'White 100 gsm' }
    ],

    /** عدد الورق: ورقة واحدة / ورقتين */
    SHEETS_PER_BAG: [
        { id: 1, nameAr: 'ورقة واحدة', nameEn: 'One sheet' },
        { id: 2, nameAr: 'ورقتين', nameEn: 'Two sheets' }
    ],

    /** الأوجه: وجه واحد / وجه وظهر */
    SIDES: [
        { id: 1, nameAr: 'وجه واحد', nameEn: 'One side' },
        { id: 2, nameAr: 'وجه وظهر', nameEn: 'Two sides' }
    ],

    /** يد الشنطة */
    HANDLE_TYPES: [
        { id: 'kapsula', nameAr: 'يد كبسولة', nameEn: 'Capsule handle' },
        { id: 'dabara', nameAr: 'يد دبارة', nameEn: 'Dabara handle' }
    ],

    /** الإضافات (لكل ورقة على حدة) */
    ADDITIONS: [
        { id: 'matteCellophane', nameAr: 'سلوفان مط', nameEn: 'Matte cellophane' },
        { id: 'glossyCellophane', nameAr: 'سلوفان لامع', nameEn: 'Glossy cellophane' },
        { id: 'spotUV', nameAr: 'سبوط', nameEn: 'Spot UV' },
        { id: 'debossing', nameAr: 'كفراج', nameEn: 'Debossing' },
        { id: 'embossing', nameAr: 'بصمة', nameEn: 'Embossing' },
        { id: 'specialColor', nameAr: 'إضافة لون اسبيشيال', nameEn: 'Special color' }
    ],

    getPaperTypeById(id) {
        return this.PAPER_TYPES.find(p => p.id === id) || null;
    },

    getHandleTypeById(id) {
        return this.HANDLE_TYPES.find(h => h.id === id) || null;
    },

    getAdditionById(id) {
        return this.ADDITIONS.find(a => a.id === id) || null;
    },

    getAllProducts() {
        return this.PAPER_TYPES.map(p => ({ id: p.id, name: p.nameAr, nameEn: p.nameEn }));
    },

    /**
     * حساب تكلفة إضافة واحدة للورقة
     * @param {Object} ctx - { quantity, widthCm, heightCm, additionId, sides, additionsPrices }
     */
    _calcAdditionCost(ctx) {
        const { quantity, widthCm = 0, heightCm = 0, additionId, sides = 1, additionsPrices = {} } = ctx;
        const q = Math.max(quantity, 1000);
        const price = parseFloat(additionsPrices[additionId] || additionsPrices[additionId + 'Price'] || 0) || 0;
        if (!price) return 0;
        // per_thousand_sheets
        return (q / 1000) * price * sides;
    },

    /**
     * الحساب الكامل بالـ 1000 شنطة
     * @param {Object} params
     * @param {number} params.quantity1000 - الكمية بالآلاف
     * @param {number} params.sheetsPerBag - 1 أو 2
     * @param {Object} params.sheet1 - { paperTypeId, widthCm, heightCm, sides, colors, additions: {} }
     * @param {Object} [params.sheet2] - نفس structure لو ورقتين
     * @param {string} params.handleTypeId - كبسولة أو دبارة
     * @param {Object} params.prices - من Firestore
     */
    calculate(params) {
        const {
            quantity1000 = 0,
            sheetsPerBag = 1,
            sheet1 = {},
            sheet2 = {},
            handleTypeId = '',
            // أسعار من Firestore
            paperPrices = {},
            handlesPricePer1000 = 0,
            printingPricePerSheet = 0,
            assemblyPricePer1000_1sheet = 0,
            assemblyPricePer1000_2sheets = 0,
            handleTypePricePer1000 = 0,
            additionsPrices = {},
            prices = {}
        } = params;
        const allPrices = prices && typeof prices === 'object' ? prices : {};
        const addPrices = additionsPrices && Object.keys(additionsPrices).length ? additionsPrices : (allPrices.additionsPrices || allPrices.additions || {});

        const q = parseFloat(quantity1000) || 0;
        if (q <= 0) return null;

        const sheets = parseInt(sheetsPerBag, 10) || 1;
        const totalSheets = q * 1000 * sheets;

        // 1) الورق والقص المبدئي — كل ورقة لها سعر حسب نوع الورق
        let paperCost = 0;
        const s1Paper = parseFloat(paperPrices[sheet1.paperTypeId]) || 0;
        paperCost += q * s1Paper;
        if (sheets === 2 && sheet2.paperTypeId) {
            const s2Paper = parseFloat(paperPrices[sheet2.paperTypeId]) || 0;
            paperCost += q * s2Paper;
        }

        // 2) الزنجات — حسب عدد الأوراق
        const handlesCost = q * (parseFloat(handlesPricePer1000) || 0) * sheets;

        // 3) الطباعة — لكل ورقة على حدة
        const printBase = parseFloat(printingPricePerSheet) || 0;
        const printingCost = totalSheets * printBase;

        // 4) الإضافات — لكل ورقة على حدة
        let additionsCost = 0;
        const addForSheet = (sheet, sheetQty) => {
            if (!sheet.additions || typeof sheet.additions !== 'object') return;
            const sides = sheet.sides || 1;
            const qty = sheetQty * 1000;
            for (const [addId, enabled] of Object.entries(sheet.additions)) {
                if (enabled) {
                    additionsCost += this._calcAdditionCost({
                        quantity: qty,
                        widthCm: sheet.widthCm || 0,
                        heightCm: sheet.heightCm || 0,
                        additionId: addId,
                        sides,
                        additionsPrices: addPrices
                    });
                }
            }
        };
        addForSheet(sheet1, q);
        if (sheets === 2) addForSheet(sheet2, q);

        // 5) التقفيل — بالـ 1000 شنطة، العنصر الوحيد خارج حسبة الورق
        const assemblyPer1000 = sheets === 2
            ? (parseFloat(assemblyPricePer1000_2sheets) || 0)
            : (parseFloat(assemblyPricePer1000_1sheet) || 0);
        const assemblyCost = q * assemblyPer1000;

        // 6) يد الشنطة — بالـ 1000 قطعة
        const handleTypeCost = q * (parseFloat(handleTypePricePer1000) || 0);

        const total = paperCost + handlesCost + printingCost + additionsCost + assemblyCost + handleTypeCost;

        const paper1 = this.getPaperTypeById(sheet1.paperTypeId);
        const paper2 = sheets === 2 ? this.getPaperTypeById(sheet2.paperTypeId) : null;
        const handleType = this.getHandleTypeById(handleTypeId);

        return {
            quantity1000: q,
            quantityBags: q * 1000,
            sheetsPerBag: sheets,
            sheet1: { ...sheet1, paperTypeNameAr: paper1 ? paper1.nameAr : sheet1.paperTypeId },
            sheet2: sheets === 2 ? { ...sheet2, paperTypeNameAr: paper2 ? paper2.nameAr : sheet2.paperTypeId } : null,
            paperCost,
            handlesCost,
            printingCost,
            additionsCost,
            assemblyCost,
            handleTypeCost,
            total,
            handleTypeNameAr: handleType ? handleType.nameAr : handleTypeId,
            paperTypeId: sheet1.paperTypeId,
            paperTypeNameAr: paper1 ? paper1.nameAr : sheet1.paperTypeId
        };
    }
};

window.PaperBagsPricing = PaperBagsPricing;
