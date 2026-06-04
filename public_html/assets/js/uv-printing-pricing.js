// UV Printing Pricing Module - Area-ratio pricing
// Reference size: 60 × 90 cm, base price set in admin
// unitPrice = (width × height) / (60 × 90) × basePrice
// total = unitPrice × quantity

const UVPrintingPricing = {
    CATEGORY_ID: 'UVPrinting',
    PRODUCT_ID: 'area_base',
    BASE_WIDTH: 60,   // cm
    BASE_HEIGHT: 90,  // cm

    docId() {
        return `${this.CATEGORY_ID}_${this.PRODUCT_ID}`;
    },

    calculate(widthCm, heightCm, quantity, basePrice) {
        const w = parseFloat(widthCm) || 0;
        const h = parseFloat(heightCm) || 0;
        const qty = Math.max(1, parseInt(quantity, 10) || 1);
        const bp = parseFloat(basePrice) || 0;
        const refArea = this.BASE_WIDTH * this.BASE_HEIGHT;
        const unitPrice = (w * h) / refArea * bp;
        const totalPrice = unitPrice * qty;
        return { widthCm: w, heightCm: h, quantity: qty, basePrice: bp, unitPrice, totalPrice };
    }
};
window.UVPrintingPricing = UVPrintingPricing;
