// Cladding Facades & Letters Pricing Module
// واجهات كلادينج و حروف
// Area-ratio pricing for all items

const CladdingLettersPricing = {
    CATEGORY_ID: 'cladding_letters',
    SELL_COLLECTION: 'cladding_letters_prices_sell',
    COST_COLLECTION: 'cladding_letters_prices_cost',

    // ─── Cladding Facades ───
    CLADDING: {
        id: 'cladding',
        nameAr: 'واجهات كلادينج',
        baseWidth: 100,   // cm
        baseHeight: 100,  // cm
    },

    // ─── Letters Types ───
    LETTER_TYPES: [
        { id: 'stainless_embossed',       nameAr: 'استانلس بارز',              baseWidth: 100, baseHeight: 50, additions: ['backlight', 'transformer', 'installation'] },
        { id: 'stainless_single',         nameAr: 'استانلس طبقة واحدة',        baseWidth: 100, baseHeight: 50, additions: ['installation'] },
        { id: 'acrylic_embossed',         nameAr: 'اكريلك بارز',               baseWidth: 100, baseHeight: 50, additions: ['innerlight', 'transformer', 'installation'] },
        { id: 'acrylic_single',           nameAr: 'اكريلك طبقة واحدة',         baseWidth: 100, baseHeight: 50, additions: ['installation'] },
        { id: 'stainless_acrylic_combo',  nameAr: 'جنب استانلس وش اكريلك',     baseWidth: 100, baseHeight: 50, additions: ['innerlight', 'transformer', 'installation'] },
        { id: 'wood_single',             nameAr: 'خشب طبقة واحدة',            baseWidth: 100, baseHeight: 50, additions: ['installation'] },
    ],

    // ─── Addition Definitions ───
    ADDITIONS: {
        backlight:    { id: 'backlight',    nameAr: 'إضاءة خلفية',    type: 'per_letter', fieldLabel: 'عدد الحروف' },
        innerlight:   { id: 'innerlight',   nameAr: 'إضاءة داخلية',   type: 'per_letter', fieldLabel: 'عدد الحروف' },
        transformer:  { id: 'transformer',  nameAr: 'ترانس',          type: 'per_count',  fieldLabel: 'عدد الترانس' },
        installation: { id: 'installation', nameAr: 'تركيب',          type: 'by_area',    fieldLabel: null },
    },

    // ─── Helpers ───
    getLetterTypeById(id) {
        return this.LETTER_TYPES.find(t => t.id === id) || null;
    },

    getAdditionDef(additionId) {
        return this.ADDITIONS[additionId] || null;
    },

    // Get all priceable items for admin pricing
    getAllPriceKeys() {
        const keys = [];
        // Cladding base price
        keys.push({ id: 'cladding_base', name: 'واجهة كلادينج (100×100)', section: 'cladding' });
        // Letter types base prices
        this.LETTER_TYPES.forEach(lt => {
            keys.push({ id: lt.id + '_base', name: lt.nameAr + ' (100×50)', section: 'letters' });
        });
        // Letter additions prices
        keys.push({ id: 'backlight_per_letter',  name: 'إضاءة خلفية (سعر الحرف)',  section: 'additions' });
        keys.push({ id: 'innerlight_per_letter',  name: 'إضاءة داخلية (سعر الحرف)', section: 'additions' });
        keys.push({ id: 'transformer_per_unit',   name: 'ترانس (سعر الوحدة)',       section: 'additions' });
        keys.push({ id: 'installation_base',      name: 'تركيب (100×50)',            section: 'additions' });
        return keys;
    },

    // ─── Calculation ───

    // Calculate cladding price
    calcCladding(width, height, basePrice) {
        const area = width * height;
        const refArea = this.CLADDING.baseWidth * this.CLADDING.baseHeight;
        return (area / refArea) * basePrice;
    },

    // Calculate letter type base price
    calcLetterBase(letterTypeId, width, height, basePrice) {
        const lt = this.getLetterTypeById(letterTypeId);
        if (!lt) return 0;
        const area = width * height;
        const refArea = lt.baseWidth * lt.baseHeight;
        return (area / refArea) * basePrice;
    },

    // Calculate installation price (by area, same reference as letter type)
    calcInstallation(letterTypeId, width, height, installBasePrice) {
        const lt = this.getLetterTypeById(letterTypeId);
        if (!lt) return 0;
        const area = width * height;
        const refArea = lt.baseWidth * lt.baseHeight;
        return (area / refArea) * installBasePrice;
    },

    // Calculate per-letter addition (backlight / innerlight)
    calcPerLetter(count, pricePerLetter) {
        return count * pricePerLetter;
    },

    // Calculate per-count addition (transformer)
    calcPerCount(count, pricePerUnit) {
        return count * pricePerUnit;
    },

    // Full calculation for an order item
    calculate(params, prices) {
        // params: { subBand, letterTypeId, width, height, quantity, additions: { backlight: {count}, innerlight: {count}, transformer: {count}, installation: bool } }
        // prices: { cladding_base, stainless_embossed_base, ..., backlight_per_letter, innerlight_per_letter, transformer_per_unit, installation_base }
        const result = { items: [], total: 0 };

        if (params.subBand === 'cladding') {
            const basePrice = prices.cladding_base || 0;
            const price = this.calcCladding(params.width, params.height, basePrice);
            const lineTotal = price * (params.quantity || 1);
            result.items.push({ name: 'واجهة كلادينج', size: `${params.width}×${params.height}`, price: lineTotal });
            result.total += lineTotal;
        } else if (params.subBand === 'letters') {
            const lt = this.getLetterTypeById(params.letterTypeId);
            if (!lt) return result;

            // Base letter price
            const basePrice = prices[lt.id + '_base'] || 0;
            const letterPrice = this.calcLetterBase(lt.id, params.width, params.height, basePrice);
            const lineTotal = letterPrice * (params.quantity || 1);
            result.items.push({ name: lt.nameAr, size: `${params.width}×${params.height}`, price: lineTotal });
            result.total += lineTotal;

            const adds = params.additions || {};

            // Backlight / Innerlight
            if (adds.backlight && adds.backlight.count > 0) {
                const cost = this.calcPerLetter(adds.backlight.count, prices.backlight_per_letter || 0);
                const addTotal = cost * (params.quantity || 1);
                result.items.push({ name: 'إضاءة خلفية (' + adds.backlight.count + ' حرف)', price: addTotal });
                result.total += addTotal;
            }
            if (adds.innerlight && adds.innerlight.count > 0) {
                const cost = this.calcPerLetter(adds.innerlight.count, prices.innerlight_per_letter || 0);
                const addTotal = cost * (params.quantity || 1);
                result.items.push({ name: 'إضاءة داخلية (' + adds.innerlight.count + ' حرف)', price: addTotal });
                result.total += addTotal;
            }

            // Transformer
            if (adds.transformer && adds.transformer.count > 0) {
                const cost = this.calcPerCount(adds.transformer.count, prices.transformer_per_unit || 0);
                const addTotal = cost * (params.quantity || 1);
                result.items.push({ name: 'ترانس × ' + adds.transformer.count, price: addTotal });
                result.total += addTotal;
            }

            // Installation
            if (adds.installation) {
                const cost = this.calcInstallation(lt.id, params.width, params.height, prices.installation_base || 0);
                const addTotal = cost * (params.quantity || 1);
                result.items.push({ name: 'تركيب', size: `${params.width}×${params.height}`, price: addTotal });
                result.total += addTotal;
            }
        }

        return result;
    }
};
