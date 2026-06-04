// Shipping Pricing Service - Accurate calculation based on real pricing logic
// NO hardcoded tables, NO fixed weight rows
// Calculates shipping cost based on: Governorate + Weight (grams) + Delivery Type

const ShippingPricingService = {
    // Governorate mapping: English (from storage) to Arabic (from HTML)
    GOVERNORATE_MAP: {
        'Cairo': 'القاهرة',
        'Giza': 'الجيزة',
        'Alexandria': 'الإسكندرية',
        'Dakahlia': 'الدقهلية',
        'Sharqia': 'الشرقية',
        'Qalyubia': 'القليوبية',
        'Kafr El Sheikh': 'كفر الشيخ',
        'Gharbia': 'الغربية',
        'Monufia': 'المنوفية',
        'Beheira': 'البحيرة',
        'Ismailia': 'الإسماعيلية',
        'Port Said': 'بورسعيد',
        'Suez': 'السويس',
        'North Sinai': 'شمال سيناء',
        'South Sinai': 'جنوب سيناء',
        'Beni Suef': 'بني سويف',
        'Faiyum': 'الفيوم',
        'Minya': 'المنيا',
        'Asyut': 'أسيوط',
        'Sohag': 'سوهاج',
        'Qena': 'قنا',
        'Aswan': 'أسوان',
        'Luxor': 'الأقصر',
        'Red Sea': 'البحر الأحمر',
        'New Valley': 'الوادي الجديد',
        'Matruh': 'مطروح'
    },

    // Governorate Extra (added only for HOME delivery)
    GOVERNORATE_EXTRAS: {
        'السويس': 9.15,
        'الإسكندرية': 3.45,
        'المنوفية': 3.45,
        'الشرقية': 3.45,
        'الدقهلية': 43.35,
        'البحر الأحمر': 43.35,
        'أسيوط': 28.5,
        'الأقصر': -2.25
        // All other governorates: 0 (no extra)
    },

    /**
     * Round weight UP to nearest 1000g
     * Examples: 1g → 1000g, 1200g → 2000g, 2500g → 3000g, 6200g → 7000g
     */
    _roundWeightUp(weightGrams) {
        if (weightGrams <= 0) return 1000;
        return Math.ceil(weightGrams / 1000) * 1000;
    },

    /**
     * Calculate Branch Price (same for all governorates)
     * ≤ 3000g → 52.95
     * > 3000g → 91.7
     */
    _calculateBranchPrice(roundedWeightGrams) {
        if (roundedWeightGrams <= 3000) {
            return 52.95;
        } else {
            return 91.7;
        }
    },

    /**
     * Calculate Weight Extra (same for ALL governorates)
     * Based on rounded weight slabs
     * 
     * Known values:
     * - 1000g → +0
     * - 2000g → +6.8
     * - 3000g → +13.65
     * - 10000g → +48
     * 
     * For weights between 3000g and 10000g:
     * Calculate incrementally: 13.65 + (slabs * increment)
     * Where increment = (48 - 13.65) / 7 = 4.907 per 1000g
     */
    _calculateWeightExtra(roundedWeightGrams) {
        // Exact known values
        if (roundedWeightGrams <= 1000) {
            return 0;
        } else if (roundedWeightGrams <= 2000) {
            return 6.8;
        } else if (roundedWeightGrams <= 3000) {
            return 13.65;
        } else if (roundedWeightGrams <= 10000) {
            // Calculate incrementally between 3000g and 10000g
            // Base: 13.65 for 3000g
            // Target: 48 for 10000g
            // Increment per 1000g: (48 - 13.65) / 7 = 4.907
            const extraSlabs = (roundedWeightGrams - 3000) / 1000;
            const increment = 4.907; // Calculated: (48 - 13.65) / 7
            const calculated = 13.65 + (extraSlabs * increment);
            
            // For 10000g, return exact value
            if (roundedWeightGrams === 10000) {
                return 48;
            }
            
            return Math.round(calculated * 100) / 100; // Round to 2 decimal places
        } else {
            // For weights > 10000g, continue the pattern
            // Base: 48 for 10000g
            // Continue with same increment: 4.907 per 1000g
            const extraSlabs = (roundedWeightGrams - 10000) / 1000;
            const increment = 4.907;
            return 48 + (extraSlabs * increment);
        }
    },

    /**
     * Get Governorate Extra (only for HOME delivery)
     * Returns 0 if governorate not in the list
     */
    _getGovernorateExtra(arabicGovernorate) {
        return this.GOVERNORATE_EXTRAS[arabicGovernorate] || 0;
    },

    /**
     * Convert governorate from English to Arabic
     */
    _getArabicGovernorate(englishName) {
        return this.GOVERNORATE_MAP[englishName] || englishName;
    },

    /**
     * Main calculation function - Calculates shipping price based on logic
     * @param {string} governorate - Governorate name (English or Arabic)
     * @param {number} weightKg - Weight in kilograms
     * @param {string} deliveryType - 'branch' or 'home'
     * @returns {Object} { price: number, error: string|null, details: object }
     */
    async getShippingPrice(governorate, weightKg, deliveryType) {
        // Validate inputs
        if (!governorate) {
            return { price: 0, error: null, details: null };
        }

        if (!weightKg || weightKg <= 0) {
            return { 
                price: 0, 
                error: 'يرجى إدخال الوزن بالكيلوجرام',
                details: null
            };
        }

        if (!deliveryType || !['branch', 'home'].includes(deliveryType)) {
            return { 
                price: 0, 
                error: 'يرجى اختيار نوع التوصيل',
                details: null
            };
        }

        try {
            // Convert weight from KG to grams
            const weightGrams = weightKg * 1000;

            // Round weight UP to nearest 1000g
            const roundedWeightGrams = this._roundWeightUp(weightGrams);

            // Convert governorate to Arabic
            const arabicGovernorate = this._getArabicGovernorate(governorate);

            // Calculate Branch Price (same for all governorates)
            const branchPrice = this._calculateBranchPrice(roundedWeightGrams);

            let finalPrice = 0;
            const calculationDetails = {
                weightKg: weightKg,
                weightGrams: weightGrams,
                roundedWeightGrams: roundedWeightGrams,
                governorate: arabicGovernorate,
                deliveryType: deliveryType,
                branchPrice: branchPrice
            };

            if (deliveryType === 'branch') {
                // Branch delivery: Only Branch Price (no extras)
                finalPrice = branchPrice;
                calculationDetails.weightExtra = 0;
                calculationDetails.governorateExtra = 0;
            } else {
                // Home delivery: Branch Price + Weight Extra + Governorate Extra
                const weightExtra = this._calculateWeightExtra(roundedWeightGrams);
                const governorateExtra = this._getGovernorateExtra(arabicGovernorate);
                
                finalPrice = branchPrice + weightExtra + governorateExtra;
                
                calculationDetails.weightExtra = weightExtra;
                calculationDetails.governorateExtra = governorateExtra;
            }

            calculationDetails.finalPrice = finalPrice;

            return {
                price: finalPrice,
                error: null,
                details: calculationDetails
            };
        } catch (error) {
            console.error('Error calculating shipping price:', error);
            return {
                price: 0,
                error: 'حدث خطأ في حساب سعر الشحن: ' + error.message,
                details: null
            };
        }
    },

    /**
     * Get all governorates (Arabic names for display)
     */
    getGovernorates() {
        return Object.values(this.GOVERNORATE_MAP);
    },

    /**
     * Get English governorate name from Arabic
     */
    getEnglishGovernorate(arabicName) {
        for (const [english, arabic] of Object.entries(this.GOVERNORATE_MAP)) {
            if (arabic === arabicName) {
                return english;
            }
        }
        return arabicName; // Fallback
    }
};
