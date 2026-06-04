// DTF Printing Pricing Module - Per meter
// Width FIXED 60 cm, length user-defined
// product_prices_sell/DTF_meter, product_prices_cost/DTF_meter
// total = length_m × price_per_meter × quantity
// Default 135 EGP/meter (stored in DB)

const DTFPrintingPricing = {
    CATEGORY_ID: 'DTF',
    PRODUCT_ID: 'meter',
    FIXED_WIDTH_CM: 60,
    DEFAULT_PRICE_PER_METER: 135,
    docId() {
        return `${this.CATEGORY_ID}_${this.PRODUCT_ID}`;
    },
    calculate(lengthMeters, quantity, pricePerMeter) {
        const ppm = parseFloat(pricePerMeter) || this.DEFAULT_PRICE_PER_METER;
        const len = parseFloat(lengthMeters) || 0;
        const qty = Math.max(1, parseInt(quantity, 10) || 1);
        const total = len * ppm * qty;
        return { lengthMeters: len, quantity: qty, pricePerMeter: ppm, totalPrice: total, unitPrice: len * ppm };
    }
};
window.DTFPrintingPricing = DTFPrintingPricing;
