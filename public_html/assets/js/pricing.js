// Pricing Module - Banner, Flex, Vinyl pricing logic
// NOTE: This module handles ONLY sale prices (customer-facing)
// Cost prices are managed separately via PricingService
const Pricing = {
    // Get shipping cost using the shipping pricing service (calculation-based, not database)
    // Returns: { price: number, error: string|null, details: object }
    async getShippingCost(governorate, weightKg, deliveryType) {
        if (!governorate || !weightKg || !deliveryType) {
            return { price: 0, error: null, details: null };
        }

        // Use ShippingPricingService for accurate calculation-based pricing
        if (typeof ShippingPricingService !== 'undefined') {
            try {
                const result = await ShippingPricingService.getShippingPrice(governorate, weightKg, deliveryType);
                // Log calculation details for debugging
                if (result.details) {
                    console.log('📦 Shipping calculation:', {
                        weightKg: result.details.weightKg,
                        roundedWeightGrams: result.details.roundedWeightGrams,
                        governorate: result.details.governorate,
                        deliveryType: result.details.deliveryType,
                        branchPrice: result.details.branchPrice,
                        weightExtra: result.details.weightExtra || 0,
                        governorateExtra: result.details.governorateExtra || 0,
                        finalPrice: result.price
                    });
                }
                return result;
            } catch (error) {
                console.error('Error calculating shipping price:', error);
                return { price: 0, error: 'حدث خطأ في حساب سعر الشحن', details: null };
            }
        }

        // Fallback (should not happen if service is loaded)
        return { price: 0, error: 'خدمة حساب الشحن غير متاحة', details: null };
    },
    
    // Load product sale prices only (no cost calculations)
    async loadProductConfig() {
        // Use PricingService for new structure - ONLY selling prices
        if (typeof PricingService !== 'undefined') {
            try {
                const bannerPricing = await PricingService.getProductSellPricing('Outdoor', 'Banner');
                const flexPricing = await PricingService.getProductSellPricing('Outdoor', 'Flex');
                const vinylPricing = await PricingService.getProductSellPricing('Outdoor', 'Vinyl');
                
                return {
                    Banner: { salePrice: bannerPricing.sellingPrice || 150 },
                    Flex: { salePrice: flexPricing.sellingPrice || 270 },
                    Vinyl: { salePrice: vinylPricing.sellingPrice || 300 }
                    // Lamination is now product-level only, no global addon
                };
            } catch (error) {
                console.error('Error loading product selling prices from PricingService:', error);
            }
        }
        
        // Fallback: try localStorage (legacy support)
        const stored = localStorage.getItem('ah_productConfig');
        if (stored) {
            try {
                const config = JSON.parse(stored);
                // Migration: convert old format to sale price only
                if (config.Banner && typeof config.Banner === 'number' && !config.Banner.cost) {
                    // Old format: single price (assumed cost, estimate sale as 1.5x)
                    return {
                        Banner: { salePrice: config.Banner * 1.5 },
                        Flex: { salePrice: config.Flex * 1.5 },
                        Vinyl: { salePrice: config.Vinyl * 1.5 }
                        // Lamination is now product-level only
                    };
                }
                // Old format with cost/sellingPrice
                if (config.Banner && config.Banner.sellingPrice) {
                    return {
                        Banner: { salePrice: config.Banner.sellingPrice },
                        Flex: { salePrice: config.Flex.sellingPrice },
                        Vinyl: { salePrice: config.Vinyl.sellingPrice }
                        // Lamination is now product-level only
                    };
                }
                return config;
            } catch (e) {
                console.error('Error loading product config:', e);
            }
        }
        
        // Default sale prices (no cost here, no global addons)
        return {
            Banner: { salePrice: 150 },
            Flex: { salePrice: 270 },
            Vinyl: { salePrice: 300 }
            // Lamination is now product-level only
        };
    },
    // Update product pricing UI
    updateProductPricing() {
        const product = document.getElementById('productSelect').value;
        const laminationSection = document.getElementById('laminationSection');
        
        if (product === 'Vinyl') {
            laminationSection.classList.remove('hidden-section');
        } else {
            laminationSection.classList.add('hidden-section');
            document.getElementById('laminationCheck').checked = false;
        }
        
        // Call async calculatePrice
        this.calculatePrice().catch(err => console.error('Error calculating price:', err));
    },

    // Calculate sale price based on product type and dimensions
    // NOTE: This calculates ONLY sale price (customer-facing), not cost
    async calculatePrice() {
        const product = document.getElementById('productSelect').value;
        const length = parseFloat(document.getElementById('lengthInput').value) || 0;
        const width = parseFloat(document.getElementById('widthInput').value) || 0;
        const lamination = document.getElementById('laminationCheck')?.checked || false;
        
        // Outdoor products max width constraint: 310 cm = 3.1 meters
        const MAX_WIDTH_CM = 310;
        const MAX_WIDTH_M = 3.1;
        
        // Check if this is an Outdoor product (Banner, Flex, Vinyl)
        const isOutdoorProduct = ['Banner', 'Flex', 'Vinyl'].includes(product);
        
        if (length <= 0 || width <= 0) {
            document.getElementById('priceCalculation').innerText = 'أدخل الأبعاد';
            document.getElementById('calculatedPrice').innerText = '0';
            document.getElementById('totalPriceInput').value = '';
            return;
        }
        
        // Hard constraint for Outdoor products: width must be ≤ 310 cm
        if (isOutdoorProduct) {
            const widthCm = width * 100; // Convert to cm
            if (widthCm > MAX_WIDTH_CM) {
                document.getElementById('priceCalculation').innerText = `خطأ: أقصى عرض مسموح هو ${MAX_WIDTH_CM} سم`;
                document.getElementById('calculatedPrice').innerText = '0';
                document.getElementById('totalPriceInput').value = '';
                
                // Show error message
                Swal.fire({
                    icon: 'error',
                    title: 'خطأ في المقاس',
                    text: `أقصى عرض مسموح للطباعة هو ${MAX_WIDTH_CM} سم — يرجى تعديل المقاس`,
                    confirmButtonText: 'حسناً'
                });
                return;
            }
        }

        let basePrice = 0;
        let pricePerSqm = 0;
        
        // Load product sale prices only (no cost calculations)
        const productConfig = await this.loadProductConfig();
        
        switch(product) {
            case 'Vinyl':
                const vinylConfig = productConfig.Vinyl || { salePrice: 300 };
                pricePerSqm = vinylConfig.salePrice || 300;
                basePrice = length * width * pricePerSqm;
                // Lamination is now product-level only - no global addition
                // If lamination is needed, it should be part of the product's selling price
                break;
            case 'Flex':
                const flexConfig = productConfig.Flex || { salePrice: 270 };
                pricePerSqm = flexConfig.salePrice || 270;
                basePrice = length * width * pricePerSqm;
                break;
            case 'Banner':
                const bannerConfig = productConfig.Banner || { salePrice: 150 };
                pricePerSqm = bannerConfig.salePrice || 150;
                basePrice = length * width * pricePerSqm;
                break;
        }

        const area = (length * width).toFixed(2);
        let calculationText = `${length} × ${width} × ${pricePerSqm}`;
        // No global additions - lamination is product-level only
        
        const priceCalcEl = document.getElementById('priceCalculation');
        const calculatedPriceEl = document.getElementById('calculatedPrice');
        const totalPriceInputEl = document.getElementById('totalPriceInput');
        
        if (priceCalcEl) priceCalcEl.innerText = calculationText;
        if (calculatedPriceEl) calculatedPriceEl.innerText = basePrice.toFixed(2);
        if (totalPriceInputEl) totalPriceInputEl.value = basePrice.toFixed(2);
    },

    // Toggle shipping options
    toggleShipping() {
        const chk = document.getElementById('shippingCheck').checked;
        document.getElementById('shippingOptions').classList.toggle('hidden-section', !chk);
        const deliveryTypeSelection = document.getElementById('shippingDeliveryTypeSelection');
        if (deliveryTypeSelection) {
            deliveryTypeSelection.classList.add('hidden-section');
        }
        if (!chk) {
            document.getElementById('governorateSelect').value = '';
            const weightInput = document.getElementById('shippingWeight');
            if (weightInput) weightInput.value = '';
            // Reset prices
            const branchPriceDisplay = document.getElementById('shippingBranchPrice');
            const homePriceDisplay = document.getElementById('shippingHomePrice');
            if (branchPriceDisplay) branchPriceDisplay.innerText = '0.00';
            if (homePriceDisplay) homePriceDisplay.innerText = '0.00';
            // Uncheck delivery type radios
            const deliveryTypeRadios = document.querySelectorAll('input[name="deliveryType"]');
            deliveryTypeRadios.forEach(radio => radio.checked = false);
            // Clear stored prices
            window._lastShippingPrices = null;
            this.calcShipping();
        }
    },

    // Calculate shipping cost - calculates BOTH branch and home prices
    async calcShipping() {
        const gov = document.getElementById('governorateSelect')?.value || '';
        const weightInput = document.getElementById('shippingWeight');
        const weightKg = weightInput ? parseFloat(weightInput.value) || 0 : 0;
        
        const branchPriceDisplay = document.getElementById('shippingBranchPrice');
        const homePriceDisplay = document.getElementById('shippingHomePrice');
        const errorDisplay = document.getElementById('shippingError');
        
        // Clear previous error
        if (errorDisplay) {
            errorDisplay.textContent = '';
            errorDisplay.classList.add('hidden-section');
        }
        
        // Reset displays
        if (branchPriceDisplay) branchPriceDisplay.innerText = '0.00';
        if (homePriceDisplay) homePriceDisplay.innerText = '0.00';
        
        if (!gov || !weightKg) {
            if (!gov && !weightKg) {
                // Both empty - just reset
                return { branchPrice: 0, homePrice: 0, error: null };
            }
            // Show validation error
            if (errorDisplay) {
                errorDisplay.textContent = 'يرجى إدخال المحافظة والوزن';
                errorDisplay.classList.remove('hidden-section');
            }
            return { branchPrice: 0, homePrice: 0, error: 'يرجى إدخال المحافظة والوزن' };
        }
        
        // Calculate BOTH branch and home prices
        const branchResult = await this.getShippingCost(gov, weightKg, 'branch');
        const homeResult = await this.getShippingCost(gov, weightKg, 'home');
        
        if (branchResult.error || homeResult.error) {
            const errorMsg = branchResult.error || homeResult.error;
            if (errorDisplay) {
                errorDisplay.textContent = errorMsg;
                errorDisplay.classList.remove('hidden-section');
            }
            // Show error notification
            Swal.fire({
                icon: 'error',
                title: 'خطأ في حساب الشحن',
                text: errorMsg,
                timer: 3000,
                showConfirmButton: false
            });
            return { branchPrice: 0, homePrice: 0, error: errorMsg };
        }
        
        // Display both prices
        if (branchPriceDisplay) branchPriceDisplay.innerText = branchResult.price.toFixed(2);
        if (homePriceDisplay) homePriceDisplay.innerText = homeResult.price.toFixed(2);
        
        // Update delivery type selection prices
        const branchPriceText = document.getElementById('deliveryBranchPriceText');
        const homePriceText = document.getElementById('deliveryHomePriceText');
        const deliveryTypeSelection = document.getElementById('shippingDeliveryTypeSelection');
        
        if (branchPriceText) branchPriceText.innerText = branchResult.price.toFixed(2) + ' ج.م';
        if (homePriceText) homePriceText.innerText = homeResult.price.toFixed(2) + ' ج.م';
        
        // Show delivery type selection after calculation
        if (deliveryTypeSelection) {
            deliveryTypeSelection.classList.remove('hidden-section');
        }
        
        if (errorDisplay) {
            errorDisplay.classList.add('hidden-section');
        }
        
        // Store prices for order submission
        window._lastShippingPrices = {
            branch: branchResult.price,
            home: homeResult.price
        };
        
        // Update order total when delivery type is selected
        const deliveryTypeRadios = document.querySelectorAll('input[name="deliveryType"]');
        deliveryTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (typeof OrderProducts !== 'undefined' && OrderProducts.updateOrderTotal) {
                    OrderProducts.updateOrderTotal();
                }
            });
        });
        
        return { 
            branchPrice: branchResult.price, 
            homePrice: homeResult.price, 
            error: null 
        };
    }
};





