// Fabric Bags Pricing Module
// product_prices_sell, product_prices_cost - separate collections
// Base bag sizes + Printing add-ons (per size)

const FabricBagPricing = {
    CATEGORY_ID: 'FabricBag',

    BASE_SIZES: [
        { id: '16x22', nameAr: 'شنطة 16×22 سم', width: 16, height: 22, unit: 'fixed' },
        { id: '20x25', nameAr: 'شنطة 20×25 سم', width: 20, height: 25, unit: 'fixed' },
        { id: '25x30', nameAr: 'شنطة 25×30 سم', width: 25, height: 30, unit: 'fixed' },
        { id: '30x35', nameAr: 'شنطة 30×35 سم', width: 30, height: 35, unit: 'fixed' },
        { id: '30x40', nameAr: 'شنطة 30×40 سم', width: 30, height: 40, unit: 'fixed' },
        { id: '35x40', nameAr: 'شنطة 35×40 سم', width: 35, height: 40, unit: 'fixed' },
        { id: '40x40', nameAr: 'شنطة 40×40 سم', width: 40, height: 40, unit: 'fixed' },
        { id: '40x45', nameAr: 'شنطة 40×45 سم', width: 40, height: 45, unit: 'fixed' },
        { id: '40x50', nameAr: 'شنطة 40×50 سم', width: 40, height: 50, unit: 'fixed' },
        { id: '50x50', nameAr: 'شنطة 50×50 سم', width: 50, height: 50, unit: 'fixed' },
        { id: '50x60', nameAr: 'شنطة 50×60 سم', width: 50, height: 60, unit: 'fixed' },
        { id: '60x60', nameAr: 'شنطة 60×60 سم', width: 60, height: 60, unit: 'fixed' },
        { id: 'tote_25x30', nameAr: 'توتي باج 25×30 سم', width: 25, height: 30, unit: 'fixed' },
        { id: 'tote_30x35', nameAr: 'توتي باج 30×35 سم', width: 30, height: 35, unit: 'fixed' },
        { id: 'tote_35x40', nameAr: 'توتي باج 35×40 سم', width: 35, height: 40, unit: 'fixed' }
    ],

    // Printing options (same 4 types, prices may differ per size)
    PRINTING_OPTIONS: [
        { id: 'silk_one_side_one_color', nameAr: 'سكرين وجه واحد لون واحد', method: 'silk', sides: 1 },
        { id: 'silk_two_sides_one_color', nameAr: 'سكرين وجهين لون واحد', method: 'silk', sides: 2 },
        { id: 'dtf_one_side_full_colors', nameAr: 'DTF وجه واحد ألوان كاملة', method: 'dtf', sides: 1 },
        { id: 'dtf_two_sides_full_colors', nameAr: 'DTF وجهين ألوان كاملة', method: 'dtf', sides: 2 }
    ],

    docId(productId) {
        return `${this.CATEGORY_ID}_${productId}`;
    },

    getPrintingProductId(sizeId, optionId) {
        return `${sizeId}_${optionId}`;
    },

    getAllProducts() {
        const base = this.BASE_SIZES.map(s => ({ id: s.id, name: s.nameAr, unit: s.unit || 'fixed', section: 'base' }));
        const printing = [];
        this.BASE_SIZES.forEach(size => {
            this.PRINTING_OPTIONS.forEach(opt => {
                printing.push({
                    id: this.getPrintingProductId(size.id, opt.id),
                    name: `${size.nameAr} - ${opt.nameAr}`,
                    unit: 'fixed',
                    section: 'printing',
                    sizeId: size.id,
                    optionId: opt.id
                });
            });
        });
        return [...base, ...printing];
    }
};

window.FabricBagPricing = FabricBagPricing;
