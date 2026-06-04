// Offset Pricing Module - Isolated Offset calculation logic
const OffsetPricing = {
    // Default configuration
    config: {
        paperWeight: 150, // grams
        sheetSize: { width: 70, height: 100 }, // cm
        sheetCost: 6.5, // EGP
        cutting: {
            initialCost: 50, // EGP
            perThousandCost: 30 // EGP per 1000 pieces
        },
        machines: [
            { name: '1/8 Sheet', size: { width: 35, height: 25 }, cost: 100, oneColorCost: 100, fourColorCost: 200 },
            { name: '1/4 Sheet', size: { width: 50, height: 35 }, cost: 200, oneColorCost: 200, fourColorCost: 400 },
            { name: '1/2 Sheet', size: { width: 70, height: 50 }, cost: 300, oneColorCost: 300, fourColorCost: 600 },
            { name: 'Full Sheet', size: { width: 70, height: 100 }, cost: 400, oneColorCost: 400, fourColorCost: 800 }
        ],
        colors: {
            oneColor: 80, // EGP
            fourColor: 320 // EGP
        },
        additions: {
            specialColor: 0, // EGP per side
            matteCellophane: 0, // EGP per side
            glossyCellophane: 0, // EGP per side
            dieCutting: 0, // EGP (fixed)
            embossing: 0, // EGP per side
            debossing: 0, // EGP (fixed)
            creasing: 0, // EGP per crease
            cornering: 0, // EGP (fixed)
            perforation: 0, // EGP per perforation
            spotUV: 0 // EGP per side
        }
    },

    // Fixed size mapping reference sheet (single source of truth)
    sizeMapping: [
        // Posters / Large Sizes
        { width: 100, height: 70, pieces: 1, category: 'Poster' },
        { width: 70, height: 50, pieces: 2, category: 'Poster' },
        { width: 50, height: 35, pieces: 4, category: 'Poster' },
        { width: 35, height: 25, pieces: 8, category: 'Poster' },
        { width: 25, height: 17.5, pieces: 16, category: 'Poster' },
        { width: 17.5, height: 12.5, pieces: 32, category: 'Poster' },
        // Flyers
        { width: 42, height: 30, pieces: 5, category: 'Flyer' },
        { width: 30, height: 20, pieces: 11, category: 'Flyer' },
        { width: 20, height: 15, pieces: 22, category: 'Flyer' },
        { width: 15, height: 10, pieces: 44, category: 'Flyer' },
        // Booklets / Menus
        { width: 33, height: 23, pieces: 9, category: 'Booklet' },
        { width: 23, height: 16.5, pieces: 18, category: 'Booklet' },
        { width: 16.5, height: 11.5, pieces: 36, category: 'Booklet' },
        // CDS / Small Prints
        { width: 35, height: 23, pieces: 6, category: 'CD' },
        { width: 23, height: 17.5, pieces: 12, category: 'CD' },
        { width: 17.5, height: 12.5, pieces: 24, category: 'CD' },
        // ISO Sizes
        { width: 42, height: 29.7, pieces: 4, category: 'A3' },
        { width: 29.7, height: 21, pieces: 9, category: 'A4' },
        { width: 21, height: 14.85, pieces: 18, category: 'A5' },
        { width: 14.85, height: 10.5, pieces: 36, category: 'A6' }
    ],

    // Find matching size from reference sheet
    findMatchingSize(width, height) {
        // Normalize: ensure width >= height for consistent comparison
        const normalizedWidth = Math.max(width, height);
        const normalizedHeight = Math.min(width, height);
        
        // First, try exact match (check both orientations)
        for (const size of this.sizeMapping) {
            if ((size.width === normalizedWidth && size.height === normalizedHeight) ||
                (size.width === normalizedHeight && size.height === normalizedWidth)) {
                return {
                    ...size,
                    isExactMatch: true,
                    originalInput: { width, height }
                };
            }
        }
        
        // If no exact match, find nearest larger size
        // Calculate area of input size
        const inputArea = normalizedWidth * normalizedHeight;
        
        let bestMatch = null;
        let smallestArea = Infinity;
        
        // Find the smallest size that is larger than or equal to input
        for (const size of this.sizeMapping) {
            const sizeArea = size.width * size.height;
            // Check if this size can fit the input (width and height must be >= input)
            if (size.width >= normalizedWidth && size.height >= normalizedHeight) {
                if (sizeArea < smallestArea) {
                    smallestArea = sizeArea;
                    bestMatch = size;
                }
            }
            // Also check rotated orientation
            if (size.width >= normalizedHeight && size.height >= normalizedWidth) {
                if (sizeArea < smallestArea) {
                    smallestArea = sizeArea;
                    bestMatch = size;
                }
            }
        }
        
        // If still no match found (input is larger than all sizes), use the largest size
        if (!bestMatch) {
            bestMatch = this.sizeMapping.reduce((largest, current) => {
                const largestArea = largest.width * largest.height;
                const currentArea = current.width * current.height;
                return currentArea > largestArea ? current : largest;
            });
        }
        
        return {
            ...bestMatch,
            isExactMatch: false,
            originalInput: { width, height }
        };
    },

    // Calculate pieces per sheet based on product size and parent sheet size
    calculatePiecesPerSheet(productWidth, productHeight, parentSheetWidth, parentSheetHeight) {
        // Normalize product dimensions (ensure width >= height)
        const normalizedProductWidth = Math.max(productWidth, productHeight);
        const normalizedProductHeight = Math.min(productWidth, productHeight);
        
        // Calculate how many pieces fit in width direction
        const piecesInWidth = Math.floor(parentSheetWidth / normalizedProductWidth);
        // Calculate how many pieces fit in height direction
        const piecesInHeight = Math.floor(parentSheetHeight / normalizedProductHeight);
        
        // Total pieces per sheet (width × height)
        let piecesPerSheet = piecesInWidth * piecesInHeight;
        
        // Also check rotated orientation (product rotated 90 degrees)
        const piecesInWidthRotated = Math.floor(parentSheetWidth / normalizedProductHeight);
        const piecesInHeightRotated = Math.floor(parentSheetHeight / normalizedProductWidth);
        const piecesPerSheetRotated = piecesInWidthRotated * piecesInHeightRotated;
        
        // Use the orientation that gives more pieces
        if (piecesPerSheetRotated > piecesPerSheet) {
            piecesPerSheet = piecesPerSheetRotated;
        }
        
        // Ensure at least 1 piece per sheet
        if (piecesPerSheet < 1) {
            piecesPerSheet = 1;
        }
        
        return {
            piecesPerSheet: piecesPerSheet,
            referenceSize: {
                width: parentSheetWidth,
                height: parentSheetHeight,
                isExactMatch: false,
                originalInput: { width: productWidth, height: productHeight }
            }
        };
    },

    // Load configuration from storage or use default
    async loadConfig() {
        // Try to load from PricingAdmin (Firestore) first
        if (typeof PricingAdmin !== 'undefined') {
            try {
                const offsetConfig = await PricingAdmin.loadOffsetConfig();
                if (offsetConfig) {
                    // Merge with current config
                    this.config = {
                        ...this.config,
                        ...offsetConfig,
                        additions: offsetConfig.additions || this.config.additions || this.getDefaultAdditionsPrices()
                    };
                    return;
                }
            } catch (e) {
                console.error('Error loading offset config from PricingAdmin:', e);
            }
        }
        
        // Fallback to localStorage
        const stored = localStorage.getItem('ah_offsetConfig');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                this.config = {
                    ...this.config,
                    ...parsed,
                    additions: parsed.additions || this.config.additions || this.getDefaultAdditionsPrices()
                };
            } catch (e) {
                console.error('Error loading offset config:', e);
            }
        }
    },

    // Calculate Offset pricing
    calculate(width, height, quantity, colors, doubleSided, paperType, additions = {}) {
        // Load config synchronously (don't await)
        if (typeof PricingAdmin !== 'undefined' && PricingAdmin._configCache && PricingAdmin._configCache.offset) {
            const offsetConfig = PricingAdmin._configCache.offset;
            this.config = {
                ...this.config,
                ...offsetConfig,
                additions: offsetConfig.additions || this.config.additions || this.getDefaultAdditionsPrices()
            };
        } else {
            // Try to load from cache
            const stored = localStorage.getItem('ah_offsetConfig');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    this.config = {
                        ...this.config,
                        ...parsed,
                        additions: parsed.additions || this.config.additions || this.getDefaultAdditionsPrices()
                    };
                } catch (e) {
                    console.error('Error loading offset config:', e);
                }
            }
        }
        
        const config = this.config;
        
        // Debug: log machines and their prices
        if (config.machines && config.machines.length > 0) {
            console.log('Offset Config Machines:', config.machines.map(m => ({
                name: m.name,
                dieCuttingPrice: m.dieCuttingPrice,
                dieCuttingFormPrice: m.dieCuttingFormPrice,
                embossingPrice: m.embossingPrice,
                debossingPrice: m.debossingPrice,
                creasingPrice: m.creasingPrice,
                perforationPrice: m.perforationPrice
            })));
        }
        
        // Get paper type details
        if (!paperType) {
            // Fallback to default if no paper type provided (backward compatibility)
            paperType = {
                name: 'أوفست 150 جم',
                baseSize: { width: 70, height: 100 },
                price: config.sheetCost || 6.5
            };
        }
        
        // Ensure baseSize exists
        if (!paperType.baseSize) {
            paperType.baseSize = { width: 70, height: 100 };
        }
        
        const parentSheetWidth = paperType.baseSize?.width || 70;
        const parentSheetHeight = paperType.baseSize?.height || 100;
        const sheetPrice = paperType.price || 6.5;
        
        // Calculate pieces per sheet based on actual parent sheet size
        const piecesResult = this.calculatePiecesPerSheet(width, height, parentSheetWidth, parentSheetHeight);
        const piecesPerSheet = piecesResult.piecesPerSheet;
        const referenceSize = piecesResult.referenceSize;
        
        // Calculate total sheets needed for the quantity
        const requiredSheets = Math.ceil(quantity / piecesPerSheet);
        
        // Add +3 extra sheets for waste, errors, or damage (Safety Sheets Rule)
        const extraSheets = 3;
        const totalSheets = requiredSheets + extraSheets;
        
        // Paper cost = (required sheets + 3 extra) × sheet price
        const paperCost = totalSheets * sheetPrice;
        
        // Cutting cost
        const initialCuttingCost = config.cutting.initialCost;
        const finalCuttingCost = (quantity / 1000) * config.cutting.perThousandCost;
        const cuttingCost = initialCuttingCost + finalCuttingCost;
        
        // Find smallest possible compatible machine
        let selectedMachine = null;
        let machineCost = Infinity;
        
        // Sort machines by size (smallest first) to find smallest compatible
        const sortedMachines = [...config.machines].sort((a, b) => {
            const areaA = a.size.width * a.size.height;
            const areaB = b.size.width * b.size.height;
            return areaA - areaB;
        });
        
        for (const machine of sortedMachines) {
            // Check both orientations (normal and rotated)
            if ((width <= machine.size.width && height <= machine.size.height) ||
                (width <= machine.size.height && height <= machine.size.width)) {
                selectedMachine = machine;
                break; // Use smallest compatible machine
            }
        }
        
        // If no machine found, use the largest one
        if (!selectedMachine) {
            selectedMachine = config.machines[config.machines.length - 1];
        }
        
        // Machine cost based on colors (like zinc pricing)
        if (colors === 1) {
            machineCost = selectedMachine.oneColorCost || selectedMachine.cost || 0;
        } else {
            machineCost = selectedMachine.fourColorCost || selectedMachine.cost || 0;
        }
        
        // Debug: log selected machine and its prices
        console.log('Selected Machine:', {
            name: selectedMachine?.name,
            dieCuttingPrice: selectedMachine?.dieCuttingPrice,
            dieCuttingFormPrice: selectedMachine?.dieCuttingFormPrice,
            embossingPrice: selectedMachine?.embossingPrice,
            debossingPrice: selectedMachine?.debossingPrice,
            creasingPrice: selectedMachine?.creasingPrice,
            perforationPrice: selectedMachine?.perforationPrice,
            specialColorPrice: selectedMachine?.specialColorPrice,
            fullMachine: selectedMachine
        });
        
        // Zinc (Plate) cost - separate from printing
        let zincCost = colors === 1 ? config.colors.oneColor : config.colors.fourColor;
        
        // Apply double-sided multiplier to zinc cost
        if (doubleSided) {
            zincCost *= 2;
        }
        
        // Apply double-sided multiplier to printing machine cost
        // Double-sided printing requires running the machine twice
        if (doubleSided) {
            machineCost *= 2;
        }
        
        // Calculate additions cost (pass selected machine, width, and height for pricing)
        const additionsResult = this.calculateAdditionsCost(additions, quantity, selectedMachine, width, height);
        const additionsCost = additionsResult.total;
        const additionsDetails = additionsResult.details;
        
        // Validation: Ensure all selected additions are included in calculation
        if (typeof AdditionsEngine !== 'undefined' && additions && Object.keys(additions).length > 0) {
            const additionsPrices = this.config.additions || this.getDefaultAdditionsPrices();
            const validation = AdditionsEngine.validateAdditions(additions, {
                quantity,
                selectedMachine,
                productWidth: width,
                productHeight: height,
                additionsPrices
            });
            
            if (!validation.valid) {
                console.error('=== AdditionsEngine: VALIDATION FAILED ===', validation.issues);
                // Still proceed, but log the issues
            }
            
            // Debug: Log final state
            console.log('=== AdditionsEngine: Final Calculation ===', {
                inputAdditions: Object.keys(additions),
                calculatedTotal: additionsCost,
                breakdown: additionsDetails,
                validation: validation.valid ? 'PASSED' : 'FAILED'
            });
        }
        
        // Total production cost = Paper + Cutting + Zinc + Printing Machine + Additions
        const productionCost = paperCost + cuttingCost + zincCost + machineCost + additionsCost;
        
        return {
            piecesPerSheet,
            requiredSheets, // Sheets needed for quantity
            extraSheets, // +3 safety sheets
            totalSheets, // requiredSheets + extraSheets
            paperCost,
            sheetPrice, // Price per parent sheet
            paperType: paperType, // Selected paper type info
            parentSheetSize: { width: parentSheetWidth, height: parentSheetHeight },
            cuttingCost: {
                initial: initialCuttingCost,
                final: finalCuttingCost,
                total: cuttingCost
            },
            machine: selectedMachine,
            machineCost,
            zincCost,
            doubleSided,
            additionsCost,
            additionsDetails, // Detailed breakdown of each addition
            productionCost,
            referenceSize: referenceSize // Include reference size info
        };
    },

    // Calculate final price based on role
    getFinalPrice(productionCost, role) {
        if (role === 'sales') {
            // Sales sees production cost + 50% profit
            return productionCost * 1.5;
        } else if (role === 'worker') {
            // Worker sees only production cost
            return productionCost;
        } else {
            // Admin sees production cost (can edit)
            return productionCost;
        }
    },
    
    /**
     * Calculate additions cost with detailed breakdown
     * ALL additions use the SAME unified pattern - read directly from selectedMachine or additionsPrices
     */
    calculateAdditionsCost(additions, quantity, selectedMachine = null, productWidth = 0, productHeight = 0) {
        // Use unified AdditionsEngine if available
        if (typeof AdditionsEngine !== 'undefined') {
            const additionsPrices = this.config.additions || this.getDefaultAdditionsPrices();
            
            const context = {
                quantity,
                selectedMachine,
                productWidth,
                productHeight,
                additionsPrices
            };
            
            const result = AdditionsEngine.calculateAdditionsCost(additions, context);
            
            // Convert to expected format
            return {
                total: result.total,
                details: result.breakdown.map(item => ({
                    name: item.name,
                    cost: item.baseCost,
                    formCost: item.formCost
                }))
            };
        }
        
        // Fallback to old method if AdditionsEngine not available
        if (!additions || Object.keys(additions).length === 0) {
            return { total: 0, details: [] };
        }
        
        const additionsPrices = this.config.additions || this.getDefaultAdditionsPrices();
        let totalCost = 0;
        const details = [];
        
        const calculatePerThousand = (pricePerThousand, sides = 1) => {
            const effectiveQuantity = quantity < 1000 ? 1000 : quantity;
            return (effectiveQuantity / 1000) * pricePerThousand * sides;
        };
        
        const getAdditionName = (type) => {
            const names = {
                'specialColor': 'لون أي',
                'matteCellophane': 'سلوفان مط',
                'glossyCellophane': 'سلوفان لامع',
                'dieCutting': 'تكسير',
                'embossing': 'بصمة',
                'debossing': 'كفراج',
                'creasing': 'ريجة',
                'cornering': 'ركنة',
                'perforation': 'تخريم',
                'spotUV': 'سبوت'
            };
            return names[type] || type;
        };
        
        const getMachinePrice = (fieldName) => {
            if (!selectedMachine) return 0;
            const price = selectedMachine[fieldName];
            return (price !== undefined && price !== null) ? Number(price) : 0;
        };
        
        // Process all additions dynamically
        if (additions.specialColor) {
            const pricePerThousand = getMachinePrice('specialColorPrice');
            const sides = additions.specialColor.sides || 1;
            const cost = calculatePerThousand(pricePerThousand, sides);
            totalCost += cost;
            details.push({ name: getAdditionName('specialColor'), cost, formCost: 0 });
        }
        
        if (additions.matteCellophane) {
            const pricePerThousand = getMachinePrice('matteCellophanePrice');
            const sides = additions.matteCellophane.sides || 1;
            const cost = calculatePerThousand(pricePerThousand, sides);
            totalCost += cost;
            details.push({ name: getAdditionName('matteCellophane'), cost, formCost: 0 });
        }
        
        if (additions.glossyCellophane) {
            const pricePerThousand = getMachinePrice('glossyCellophanePrice');
            const sides = additions.glossyCellophane.sides || 1;
            const cost = calculatePerThousand(pricePerThousand, sides);
            totalCost += cost;
            details.push({ name: getAdditionName('glossyCellophane'), cost, formCost: 0 });
        }
        
        if (additions.dieCutting) {
            const pricePerThousand = getMachinePrice('dieCuttingPrice');
            const additionCost = calculatePerThousand(pricePerThousand, 1);
            totalCost += additionCost;
            
            let formCost = 0;
            if (additions.dieCutting.withForm) {
                const formPricePerSqCm = getMachinePrice('dieCuttingFormPrice') || additionsPrices.formPrice || 0;
                formCost = (productWidth * productHeight) * formPricePerSqCm;
                totalCost += formCost;
            }
            
            details.push({ name: getAdditionName('dieCutting'), cost: additionCost, formCost });
        }
        
        if (additions.embossing) {
            const pricePerThousand = getMachinePrice('embossingPrice');
            const sides = additions.embossing.sides || 1;
            const additionCost = calculatePerThousand(pricePerThousand, sides);
            totalCost += additionCost;
            
            let formCost = 0;
            if (additions.embossing.withForm) {
                const formPricePerSqCm = getMachinePrice('embossingFormPrice') || additionsPrices.formPrice || 0;
                formCost = (productWidth * productHeight) * formPricePerSqCm * sides;
                totalCost += formCost;
            }
            
            details.push({ name: getAdditionName('embossing'), cost: additionCost, formCost });
        }
        
        if (additions.debossing) {
            const pricePerThousand = getMachinePrice('debossingPrice');
            const sides = additions.debossing.sides || 1;
            const additionCost = calculatePerThousand(pricePerThousand, sides);
            totalCost += additionCost;
            
            let formCost = 0;
            if (additions.debossing.withForm) {
                const formPricePerSqCm = getMachinePrice('debossingFormPrice') || additionsPrices.formPrice || 0;
                formCost = (productWidth * productHeight) * formPricePerSqCm * sides;
                totalCost += formCost;
            }
            
            details.push({ name: getAdditionName('debossing'), cost: additionCost, formCost });
        }
        
        if (additions.creasing) {
            const pricePerCrease = getMachinePrice('creasingPrice');
            const count = additions.creasing.count || 1;
            const cost = pricePerCrease * count;
            totalCost += cost;
            details.push({ name: getAdditionName('creasing'), cost, formCost: 0 });
        }
        
        if (additions.cornering) {
            const pricePerThousand = additionsPrices.cornering || 0;
            const cost = calculatePerThousand(pricePerThousand, 1);
            totalCost += cost;
            details.push({ name: getAdditionName('cornering'), cost, formCost: 0 });
        }
        
        if (additions.perforation) {
            const pricePerThousandPerPerforation = additionsPrices.perforation || 0;
            const count = additions.perforation.count || 1;
            const effectiveQuantity = quantity < 1000 ? 1000 : quantity;
            const cost = (effectiveQuantity / 1000) * pricePerThousandPerPerforation * count;
            totalCost += cost;
            details.push({ name: getAdditionName('perforation'), cost, formCost: 0 });
        }
        
        if (additions.spotUV) {
            const price = additionsPrices.spotUV || 0;
            const sides = additions.spotUV.sides || 1;
            const cost = price * sides;
            totalCost += cost;
            details.push({ name: getAdditionName('spotUV'), cost, formCost: 0 });
        }
        
        if (additions.folderPocket) {
            const price = additionsPrices.folderPocket || 0;
            const cost = (quantity / 1000) * price;
            totalCost += cost;
            details.push({ name: 'جيب فولدر + لزق', cost, formCost: 0 });
        }
        
        if (additions.bontaGluing) {
            const price = additionsPrices.bontaGluing || 0;
            const count = additions.bontaGluing.count || 1;
            const cost = (quantity / 1000) * price * count;
            totalCost += cost;
            details.push({ name: `تلزيق بونطة (${count} بونط)`, cost, formCost: 0 });
        }
        
        if (additions.sandwichBag) {
            const price = additionsPrices.sandwichBag || 0;
            const cost = (quantity / 1000) * price;
            totalCost += cost;
            details.push({ name: 'تفصيل كيس سندوتش', cost, formCost: 0 });
        }
        
        return { total: totalCost, details };
    },
    
    /**
     * Get default additions prices
     */
    getDefaultAdditionsPrices() {
        return {
            specialColor: 0,
            matteCellophane: 0,
            glossyCellophane: 0,
            dieCutting: 0,
            embossing: 0,
            debossing: 0,
            creasing: 0,
            cornering: 0,
            perforation: 0,
            spotUV: 0,
            folderPocket: 0,
            bontaGluing: 0,
            sandwichBag: 0
        };
    }
};
