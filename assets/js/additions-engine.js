// Unified Additions Engine - Single source of truth for all additions
const AdditionsEngine = {
    // Unified additions registry
    additionsRegistry: {
        // Offset additions
        'specialColor': {
            id: 'specialColor',
            name: 'لون أي',
            priceType: 'per_thousand_sheets',
            requiresMachine: true,
            priceField: 'specialColorPrice',
            supportsSides: true,
            defaultSides: 1
        },
        'matteCellophane': {
            id: 'matteCellophane',
            name: 'سلوفان مط',
            priceType: 'per_thousand_sheets',
            requiresMachine: true,
            priceField: 'matteCellophanePrice',
            supportsSides: true,
            defaultSides: 1
        },
        'glossyCellophane': {
            id: 'glossyCellophane',
            name: 'سلوفان لامع',
            priceType: 'per_thousand_sheets',
            requiresMachine: true,
            priceField: 'glossyCellophanePrice',
            supportsSides: true,
            defaultSides: 1
        },
        'dieCutting': {
            id: 'dieCutting',
            name: 'تكسير',
            priceType: 'per_thousand_sheets',
            requiresMachine: true,
            priceField: 'dieCuttingPrice',
            supportsForm: true,
            formPriceField: 'dieCuttingFormPrice',
            supportsSides: false,
            defaultSides: 1
        },
        'embossing': {
            id: 'embossing',
            name: 'بصمة',
            priceType: 'per_thousand_sheets',
            requiresMachine: true,
            priceField: 'embossingPrice',
            supportsForm: true,
            formPriceField: 'embossingFormPrice',
            supportsSides: true,
            defaultSides: 1
        },
        'debossing': {
            id: 'debossing',
            name: 'كفراج',
            priceType: 'per_thousand_sheets',
            requiresMachine: true,
            priceField: 'debossingPrice',
            supportsForm: true,
            formPriceField: 'debossingFormPrice',
            supportsSides: true,
            defaultSides: 1
        },
        'creasing': {
            id: 'creasing',
            name: 'ريجة',
            priceType: 'per_crease',
            requiresMachine: true,
            priceField: 'creasingPrice',
            supportsCount: true,
            defaultCount: 1
        },
        'cornering': {
            id: 'cornering',
            name: 'ركنة',
            priceType: 'per_thousand_sheets',
            requiresMachine: false,
            priceField: 'cornering',
            supportsSides: false,
            defaultSides: 1
        },
        'perforation': {
            id: 'perforation',
            name: 'تخريم',
            priceType: 'per_thousand_sheets_per_perforation',
            requiresMachine: false,
            priceField: 'perforation',
            supportsCount: true,
            defaultCount: 1
        },
        'spotUV': {
            id: 'spotUV',
            name: 'سبوت',
            priceType: 'fixed_per_side',
            requiresMachine: false,
            priceField: 'spotUV',
            supportsSides: true,
            defaultSides: 1
        },
        'folderPocket': {
            id: 'folderPocket',
            name: 'جيب فولدر + لزق',
            priceType: 'per_thousand_pieces',
            requiresMachine: false,
            priceField: 'folderPocket',
            supportsSides: false,
            defaultSides: 1
        },
        'bontaGluing': {
            id: 'bontaGluing',
            name: 'تلزيق بونطة',
            priceType: 'per_thousand_pieces_per_count',
            requiresMachine: false,
            priceField: 'bontaGluing',
            supportsCount: true,
            defaultCount: 1
        },
        'sandwichBag': {
            id: 'sandwichBag',
            name: 'تفصيل كيس سندوتش',
            priceType: 'per_thousand_pieces',
            requiresMachine: false,
            priceField: 'sandwichBag',
            supportsSides: false,
            defaultSides: 1
        }
    },
    
    /**
     * Normalize additions object to unified format
     * Converts UI state to calculation-ready format
     */
    normalizeAdditions(additionsObj) {
        if (!additionsObj || typeof additionsObj !== 'object') {
            return [];
        }
        
        const normalized = [];
        
        // Process each addition type
        for (const [key, value] of Object.entries(additionsObj)) {
            const registry = this.additionsRegistry[key];
            if (!registry) {
                console.warn(`Unknown addition type: ${key}`);
                continue;
            }
            
            // Skip if addition is not selected (falsy or empty object)
            if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
                continue;
            }
            
            // Create normalized addition
            const addition = {
                id: registry.id,
                name: registry.name,
                priceType: registry.priceType,
                requiresMachine: registry.requiresMachine,
                priceField: registry.priceField,
                selected: true,
                // Extract parameters from value
                sides: registry.supportsSides ? (value.sides || registry.defaultSides) : registry.defaultSides,
                count: registry.supportsCount ? (value.count || registry.defaultCount) : 1,
                withForm: registry.supportsForm ? (value.withForm || false) : false,
                formPriceField: registry.formPriceField || null,
                // Store original value for reference
                originalValue: value
            };
            
            normalized.push(addition);
        }
        
        return normalized;
    },
    
    /**
     * Calculate cost for a single addition
     */
    calculateAdditionCost(addition, context) {
        const {
            quantity = 0,
            selectedMachine = null,
            productWidth = 0,
            productHeight = 0,
            additionsPrices = {}
        } = context;
        
        let baseCost = 0;
        let formCost = 0;
        
        // Get price based on source
        let price = 0;
        if (addition.requiresMachine && selectedMachine) {
            price = selectedMachine[addition.priceField] || 0;
        } else {
            price = additionsPrices[addition.priceField] || 0;
        }
        
        // Calculate base cost based on price type
        switch (addition.priceType) {
            case 'per_thousand_sheets':
                const effectiveQuantity = quantity < 1000 ? 1000 : quantity;
                baseCost = (effectiveQuantity / 1000) * price * addition.sides;
                break;
                
            case 'per_thousand_sheets_per_perforation':
                const effectiveQty = quantity < 1000 ? 1000 : quantity;
                baseCost = (effectiveQty / 1000) * price * addition.count;
                break;
                
            case 'per_crease':
                baseCost = price * addition.count;
                break;
                
            case 'fixed_per_side':
                baseCost = price * addition.sides;
                break;
                
            case 'fixed':
                baseCost = price;
                break;
                
            case 'per_thousand_pieces':
                baseCost = (quantity / 1000) * price;
                break;
                
            case 'per_thousand_pieces_per_count':
                baseCost = (quantity / 1000) * price * addition.count;
                break;
                
            default:
                console.warn(`Unknown price type: ${addition.priceType} for addition ${addition.id}`);
                baseCost = 0;
        }
        
        // Calculate form cost if applicable
        if (addition.withForm && addition.formPriceField) {
            let formPricePerSqCm = 0;
            if (addition.requiresMachine && selectedMachine) {
                formPricePerSqCm = selectedMachine[addition.formPriceField] || 0;
            }
            if (!formPricePerSqCm) {
                formPricePerSqCm = additionsPrices.formPrice || 0;
            }
            
            if (formPricePerSqCm > 0) {
                formCost = (productWidth * productHeight) * formPricePerSqCm;
                // For embossing/debossing, multiply by sides
                if (addition.supportsSides && addition.sides > 1) {
                    formCost *= addition.sides;
                }
            }
        }
        
        return {
            baseCost: Number(baseCost.toFixed(2)),
            formCost: Number(formCost.toFixed(2)),
            totalCost: Number((baseCost + formCost).toFixed(2))
        };
    },
    
    /**
     * Calculate total additions cost - UNIFIED PIPELINE
     */
    calculateAdditionsCost(additionsObj, context) {
        // Step 1: Normalize additions
        const normalizedAdditions = this.normalizeAdditions(additionsObj);
        
        // Debug: Log normalized additions
        console.log('=== AdditionsEngine: Normalized Additions ===', {
            input: additionsObj,
            normalized: normalizedAdditions,
            context: {
                quantity: context.quantity,
                machine: context.selectedMachine?.name,
                dimensions: `${context.productWidth}×${context.productHeight}`
            }
        });
        
        // Step 2: Calculate cost for each addition
        const breakdown = [];
        let totalCost = 0;
        const appliedAdditions = [];
        
        for (const addition of normalizedAdditions) {
            const cost = this.calculateAdditionCost(addition, context);
            
            if (cost.totalCost > 0 || addition.selected) {
                breakdown.push({
                    id: addition.id,
                    name: addition.name,
                    baseCost: cost.baseCost,
                    formCost: cost.formCost,
                    totalCost: cost.totalCost,
                    parameters: {
                        sides: addition.sides,
                        count: addition.count,
                        withForm: addition.withForm
                    }
                });
                
                totalCost += cost.totalCost;
                appliedAdditions.push({
                    ...addition,
                    calculatedCost: cost
                });
            }
        }
        
        // Debug: Log calculation results
        console.log('=== AdditionsEngine: Calculation Results ===', {
            totalCost,
            breakdown,
            appliedAdditions: appliedAdditions.map(a => ({
                id: a.id,
                name: a.name,
                cost: a.calculatedCost.totalCost
            }))
        });
        
        // Validation: Ensure all selected additions are included
        const selectedCount = normalizedAdditions.length;
        const calculatedCount = appliedAdditions.length;
        
        if (selectedCount !== calculatedCount) {
            console.error('=== AdditionsEngine: VALIDATION ERROR ===', {
                selectedCount,
                calculatedCount,
                missing: normalizedAdditions
                    .filter(a => !appliedAdditions.find(applied => applied.id === a.id))
                    .map(a => a.id)
            });
        }
        
        return {
            total: Number(totalCost.toFixed(2)),
            breakdown,
            appliedAdditions,
            selectedCount,
            calculatedCount
        };
    },
    
    /**
     * Validate additions state
     */
    validateAdditions(additionsObj, context) {
        const normalized = this.normalizeAdditions(additionsObj);
        const result = this.calculateAdditionsCost(additionsObj, context);
        
        const issues = [];
        
        // Check if all selected additions are calculated
        for (const addition of normalized) {
            const found = result.appliedAdditions.find(a => a.id === addition.id);
            if (!found) {
                issues.push({
                    type: 'missing_calculation',
                    addition: addition.id,
                    message: `Addition ${addition.name} is selected but not calculated`
                });
            } else if (found.calculatedCost.totalCost === 0 && !addition.withForm) {
                issues.push({
                    type: 'zero_cost',
                    addition: addition.id,
                    message: `Addition ${addition.name} has zero cost but is selected`
                });
            }
        }
        
        return {
            valid: issues.length === 0,
            issues,
            summary: result
        };
    }
};

// Expose globally
window.AdditionsEngine = AdditionsEngine;
