// Tableaux Pricing Module - Fixed size, straight/beveled wood
// product_prices_sell/Tableaux_{productId}, product_prices_cost/Tableaux_{productId}

const TableauPricing = {
    CATEGORY_ID: 'Tableaux',
    SIZES: [
        { id: '20x30_straight', nameAr: 'تابلوة 20×30 (خشب عدل)', unit: 'fixed' },
        { id: '20x30_beveled', nameAr: 'تابلوة 20×30 (خشب مشطوف)', unit: 'fixed' },
        { id: '30x40_straight', nameAr: 'تابلوة 30×40 (خشب عدل)', unit: 'fixed' },
        { id: '30x40_beveled', nameAr: 'تابلوة 30×40 (خشب مشطوف)', unit: 'fixed' },
        { id: '40x50_straight', nameAr: 'تابلوة 40×50 (خشب عدل)', unit: 'fixed' },
        { id: '40x50_beveled', nameAr: 'تابلوة 40×50 (خشب مشطوف)', unit: 'fixed' },
        { id: '50x60_straight', nameAr: 'تابلوة 50×60 (خشب عدل)', unit: 'fixed' },
        { id: '50x60_beveled', nameAr: 'تابلوة 50×60 (خشب مشطوف)', unit: 'fixed' },
        { id: '50x70_straight', nameAr: 'تابلوة 50×70 (خشب عدل)', unit: 'fixed' },
        { id: '50x70_beveled', nameAr: 'تابلوة 50×70 (خشب مشطوف)', unit: 'fixed' }
    ],
    docId(productId) {
        return `${this.CATEGORY_ID}_${productId}`;
    }
};
window.TableauPricing = TableauPricing;
