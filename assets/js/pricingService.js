// Pricing Service Module - COMPLETE SEPARATION: Two Independent Collections
// Architecture: product_prices_sell and product_prices_cost are COMPLETELY SEPARATE
// NO shared documents, NO shared fields, NO overwriting between collections

const PricingService = {
    COLLECTION_NAME: 'pricing_config', // Legacy collection (for non-product configs)
    SELL_COLLECTION: 'product_prices_sell', // ONLY selling prices
    COST_COLLECTION: 'product_prices_cost', // ONLY cost prices
    
    // Production categories that require cost tracking
    COST_ENABLED_CATEGORIES: [
        'Offset',
        'Outdoor',
        'Indoor',
        'Stands',
        'Stamps',
        'BusinessCard',
        'Envelopes',
        'UVPrinting',
        'Tableaux',
        'DTF',
        'Flag',
        'TShirt',
        'FabricBag',
        'IDCard',
        'ZikrMedal',
        'SublimationGift',
        'promotional_gifts',
        'ruler_frames',
        'shipping_flyers_clear_bags',
        'plastic_bags',
        'inkjet_paper_printing',
        'safety_printing',
        'envelopes',
        'notebooks_invoices',
        'digital_printing',
        'paper_bags',
        'brochures',
        'catalogs',
        'acrylic_badge',
        'card_rosary',
        'annual_ads',
        'cup_quran_bags',
        'boxes',
        'cladding_letters',
        'kraft_bags'
    ],


    // Categories that use their own Firestore collection names (not product_prices_sell/cost)
    CUSTOM_COLLECTION_CATEGORIES: {
        safety_printing: {
            sell: 'safety_printing_prices_sell',
            cost: 'safety_printing_prices_cost'
        },
        envelopes: {
            sell: 'envelopes_prices_sell',
            cost: 'envelopes_prices_cost'
        },
        notebooks_invoices: {
            sell: 'notebooks_sell_prices',
            cost: 'notebooks_cost_prices'
        },
        digital_printing: {
            sell: 'digital_prices_sell',
            cost: 'digital_prices_cost'
        },
        paper_bags: {
            sell: 'paper_bags_prices_sell',
            cost: 'paper_bags_prices_cost'
        },
        brochures: {
            sell: 'brochures_prices_sell',
            cost: 'brochures_prices_cost'
        },
        catalogs: {
            sell: 'catalogs_prices_sell',
            cost: 'catalogs_prices_cost'
        },
        acrylic_badge: {
            sell: 'acrylic_badge_prices_sell',
            cost: 'acrylic_badge_prices_cost'
        },
        card_rosary: {
            sell: 'card_rosary_prices_sell',
            cost: 'card_rosary_prices_cost'
        },
        annual_ads: {
            sell: 'annual_ads_prices_sell',
            cost: 'annual_ads_prices_cost'
        },
        cup_quran_bags: {
            sell: 'cup_quran_bags_prices_sell',
            cost: 'cup_quran_bags_prices_cost'
        },
        boxes: {
            sell: 'boxes_prices_sell',
            cost: 'boxes_prices_cost'
        },
        cladding_letters: {
            sell: 'cladding_letters_prices_sell',
            cost: 'cladding_letters_prices_cost'
        },
        kraft_bags: {
            sell: 'kraft_bags_prices_sell',
            cost: 'kraft_bags_prices_cost'
        }
    },

    getCollectionNames(category) {
        const custom = this.CUSTOM_COLLECTION_CATEGORIES && this.CUSTOM_COLLECTION_CATEGORIES[category];
        if (custom) return { sell: custom.sell, cost: custom.cost };
        return { sell: this.SELL_COLLECTION, cost: this.COST_COLLECTION };
    },
    
    // Non-production sections (no cost, only selling price)
    NON_COST_SECTIONS: [
        'Shipping', 'CustomerSources', 'PaperTypes', 'Offers'
    ],
    
    _getDb() {
        if (typeof window !== 'undefined' && window.db) return window.db;
        if (typeof db !== 'undefined') return db;
        throw new Error('Firestore db instance not found.');
    },

    _getPricingRef(collectionName) {
        if (typeof Branch !== 'undefined' && Branch.getCollection) {
            return Branch.getCollection(collectionName);
        }
        return this._getDb().collection(collectionName);
    },

    /** Public: get branch-scoped collection ref for use in order-products, pricing-admin, etc. */
    getCollectionRef(collectionName) {
        return this._getPricingRef(collectionName || this.SELL_COLLECTION);
    },
    
    /**
     * Check if a category requires cost tracking
     */
    requiresCost(category) {
        return this.COST_ENABLED_CATEGORIES.includes(category);
    },
    
    /**
     * Get product pricing structure (READ ONLY - returns both for reference)
     * Reads from TWO SEPARATE collections - NO shared documents
     */
    async getProductPricing(category, productId) {
        const docId = `${category}_${productId}`;
        try {
            const [sellDoc, costDoc] = await Promise.all([
                this._getPricingRef(this.SELL_COLLECTION).doc(docId).get(),
                this.requiresCost(category) ? this._getPricingRef(this.COST_COLLECTION).doc(docId).get() : Promise.resolve({ exists: false })
            ]);
            
            return {
                sell: sellDoc.exists ? {
                    sellingPrice: sellDoc.data().sellingPrice || 0,
                    currency: sellDoc.data().currency || 'EGP',
                    updatedAt: sellDoc.data().updatedAt
                } : { sellingPrice: 0, currency: 'EGP' },
                cost: costDoc.exists ? {
                    costPrice: costDoc.data().costPrice || 0,
                    currency: costDoc.data().currency || 'EGP',
                    updatedAt: costDoc.data().updatedAt
                } : { costPrice: 0, currency: 'EGP' }
            };
        } catch (error) {
            console.error(`Error loading product pricing for ${category}/${productId}:`, error);
        }
        
        // Return default structure with COMPLETE separation
        return {
            sell: { sellingPrice: 0, currency: 'EGP' },
            cost: { costPrice: 0, currency: 'EGP' }
        };
    },
    
    /**
     * Get COST pricing ONLY (for cost management pages)
     * Reads ONLY from product_prices_cost collection - NEVER touches sell collection
     */
    async getProductCostPricing(category, productId) {
        if (!this.requiresCost(category)) {
            return { costPrice: 0, currency: 'EGP' };
        }
        
        const docId = `${category}_${productId}`;
        try {
            const doc = await this._getPricingRef(this.COST_COLLECTION).doc(docId).get();
            if (doc.exists) {
                const data = doc.data();
                return {
                    costPrice: data.costPrice || 0,
                    currency: data.currency || 'EGP',
                    updatedAt: data.updatedAt
                };
            }
        } catch (error) {
            console.error(`Error loading cost pricing for ${category}/${productId}:`, error);
        }
        
        return { costPrice: 0, currency: 'EGP' };
    },
    
    /**
     * Get SELL pricing ONLY (for sell management pages)
     * Reads ONLY from product_prices_sell collection - NEVER touches cost collection
     */
    async getProductSellPricing(category, productId) {
        const docId = `${category}_${productId}`;
        try {
            const doc = await this._getPricingRef(this.SELL_COLLECTION).doc(docId).get();
            if (doc.exists) {
                const data = doc.data();
                return {
                    sellingPrice: data.sellingPrice || 0,
                    currency: data.currency || 'EGP',
                    updatedAt: data.updatedAt
                };
            }
        } catch (error) {
            console.error(`Error loading sell pricing for ${category}/${productId}:`, error);
        }
        
        return { sellingPrice: 0, currency: 'EGP' };
    },
    
    /**
     * Save COST price ONLY
     * Writes ONLY to product_prices_cost collection - NEVER touches sell collection
     */
    async saveProductCostPrice(category, productId, costPrice) {
        if (!this.requiresCost(category)) {
            throw new Error(`Category ${category} does not support cost tracking`);
        }
        
        const docId = `${category}_${productId}`;
        const costData = {
            productId: productId,
            categoryId: category,
            costPrice: parseFloat(costPrice) || 0,
            currency: 'EGP',
            updatedAt: new Date().toISOString()
        };
        await this._getPricingRef(this.COST_COLLECTION).doc(docId).set(costData);
    },
    
    /**
     * Save SELL price ONLY
     * Writes ONLY to product_prices_sell collection - NEVER touches cost collection
     */
    async saveProductSellPrice(category, productId, sellingPrice) {
        const docId = `${category}_${productId}`;
        const sellData = {
            productId: productId,
            categoryId: category,
            sellingPrice: parseFloat(sellingPrice) || 0,
            currency: 'EGP',
            updatedAt: new Date().toISOString()
        };
        await this._getPricingRef(this.SELL_COLLECTION).doc(docId).set(sellData);
    },
    
    /**
     * Save COST base price ONLY (legacy method name - redirects to saveProductCostPrice)
     */
    async saveProductCostBasePrice(category, productId, basePrice) {
        return this.saveProductCostPrice(category, productId, basePrice);
    },
    
    /**
     * Save SELL base price ONLY (legacy method name - redirects to saveProductSellPrice)
     */
    async saveProductSellBasePrice(category, productId, basePrice) {
        return this.saveProductSellPrice(category, productId, basePrice);
    },
    
    /**
     * Save COST addon price ONLY
     * REMOVED: Addons are now product-level only, no global addon pricing
     * This method is kept for backward compatibility but does nothing
     */
    async saveProductCostAddonPrice(category, productId, addonId, price) {
        console.warn('saveProductCostAddonPrice is deprecated - addons are now product-level only');
        // Addons are handled at product level, not globally
    },
    
    /**
     * Save SELL addon price ONLY
     * REMOVED: Addons are now product-level only, no global addon pricing
     * This method is kept for backward compatibility but does nothing
     */
    async saveProductSellAddonPrice(category, productId, addonId, price) {
        console.warn('saveProductSellAddonPrice is deprecated - addons are now product-level only');
        // Addons are handled at product level, not globally
    },
    
    /**
     * Get all products pricing for a category (for cost mode)
     * Returns ONLY cost pricing from product_prices_cost collection - never reads sell
     * Supports both standard format (costPrice) and Outdoor format (costPerSquareMeter + addonsCosts)
     */
    async getCategoryProductsCostPricing(category) {
        if (!this.requiresCost(category)) {
            return {};
        }
        
        try {
            const snapshot = await this._getPricingRef(this.COST_COLLECTION)
                .where('categoryId', '==', category)
                .get();
            
            const pricing = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Support both formats: standard (costPrice), Outdoor/Indoor (costPerSquareMeter), Indoor per-meter (costPerMeter)
                if (data.costPerSquareMeter !== undefined) {
                    pricing[data.productId] = {
                        costPerSquareMeter: data.costPerSquareMeter || 0,
                        addonsCosts: data.addonsCosts || {},
                        currency: data.currency || 'EGP'
                    };
                } else if (data.costPerMeter !== undefined) {
                    pricing[data.productId] = {
                        costPerMeter: data.costPerMeter || 0,
                        addonsCosts: data.addonsCosts || {},
                        currency: data.currency || 'EGP'
                    };
                } else {
                    // Standard format
                    pricing[data.productId] = {
                        costPrice: data.costPrice || 0,
                        currency: data.currency || 'EGP'
                    };
                }
            });
            
            return pricing;
        } catch (error) {
            console.error(`Error loading category cost pricing for ${category}:`, error);
            return {};
        }
    },
    
    /**
     * Get all products pricing for a category (for sell mode)
     * Returns ONLY sell pricing from product_prices_sell collection - never reads cost
     * Supports both standard format (sellingPrice) and Outdoor format (pricePerSquareMeter + addonsPrices)
     */
    async getCategoryProductsSellPricing(category) {
        try {
            const snapshot = await this._getPricingRef(this.SELL_COLLECTION)
                .where('categoryId', '==', category)
                .get();
            
            const pricing = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // Support both formats: standard (sellingPrice), Outdoor/Indoor (pricePerSquareMeter), Indoor per-meter (pricePerMeter)
                if (data.pricePerSquareMeter !== undefined) {
                    pricing[data.productId] = {
                        pricePerSquareMeter: data.pricePerSquareMeter || 0,
                        addonsPrices: data.addonsPrices || {},
                        currency: data.currency || 'EGP'
                    };
                } else if (data.pricePerMeter !== undefined) {
                    pricing[data.productId] = {
                        pricePerMeter: data.pricePerMeter || 0,
                        addonsPrices: data.addonsPrices || {},
                        currency: data.currency || 'EGP'
                    };
                } else {
                    // Standard format
                    pricing[data.productId] = {
                        sellingPrice: data.sellingPrice || 0,
                        currency: data.currency || 'EGP'
                    };
                }
            });
            
            return pricing;
        } catch (error) {
            console.error(`Error loading category sell pricing for ${category}:`, error);
            return {};
        }
    },
    
    /**
     * Calculate profit (sellingPrice - costPrice)
     * Reads from BOTH collections but NEVER modifies either
     */
    async calculateProductProfit(category, productId) {
        const pricing = await this.getProductPricing(category, productId);
        const sellPrice = pricing.sell.sellingPrice || 0;
        const costPrice = pricing.cost.costPrice || 0;
        return Math.max(0, sellPrice - costPrice);
    },
    
    /**
     * Migrate old pricing format to new structure (TWO SEPARATE COLLECTIONS)
     * Safely migrates without mixing cost and sell values
     */
    async migrateProductPricing(category, productId, oldData) {
        const docId = `${category}_${productId}`;
        
        // Check if already migrated (check both collections)
        const [sellDoc, costDoc] = await Promise.all([
            this._getPricingRef(this.SELL_COLLECTION).doc(docId).get(),
            this.requiresCost(category) ? this._getPricingRef(this.COST_COLLECTION).doc(docId).get() : Promise.resolve({ exists: false })
        ]);
        
        if (sellDoc.exists && (costDoc.exists || !this.requiresCost(category))) {
            // Already migrated, skip
            return {
                sell: { sellingPrice: sellDoc.data().sellingPrice || 0 },
                cost: { costPrice: costDoc.exists ? costDoc.data().costPrice || 0 : 0 }
            };
        }
        
        let sellingPrice = 0;
        let costPrice = 0;
        
        // Handle old format: { costPrice: X, sellingPrice: Y }
        if (oldData.costPrice !== undefined && oldData.sellingPrice !== undefined) {
            costPrice = oldData.costPrice || 0;
            sellingPrice = oldData.sellingPrice || 0;
        }
        // Handle old format: single price (assumed to be cost, estimate sell as 1.5x)
        else if (typeof oldData === 'number' || (oldData.price && typeof oldData.price === 'number')) {
            const price = typeof oldData === 'number' ? oldData : oldData.price;
            costPrice = price || 0;
            sellingPrice = (price || 0) * 1.5; // Estimate
        }
        // Handle old format: { price: X } (assumed to be sell, estimate cost as 2/3)
        else if (oldData.price !== undefined) {
            sellingPrice = oldData.price || 0;
            costPrice = (oldData.price || 0) * 0.67; // Estimate
        }
        
        // Save to TWO SEPARATE collections
        const sellData = {
            productId: productId,
            categoryId: category,
            sellingPrice: sellingPrice,
            currency: 'EGP',
            migratedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await this._getPricingRef(this.SELL_COLLECTION).doc(docId).set(sellData);
        if (this.requiresCost(category)) {
            const costData = {
                productId: productId,
                categoryId: category,
                costPrice: costPrice,
                currency: 'EGP',
                migratedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            await this._getPricingRef(this.COST_COLLECTION).doc(docId).set(costData);
        }
        
        return {
            sell: { sellingPrice: sellingPrice },
            cost: { costPrice: costPrice }
        };
    },
    
    /**
     * Validation: Ensure cost and sell are in separate collections
     * Throws error if structure is invalid
     */
    async validatePricingStructure(category, productId) {
        const docId = `${category}_${productId}`;
        const sellDoc = await this._getPricingRef(this.SELL_COLLECTION).doc(docId).get();
        if (!sellDoc.exists) {
            throw new Error(`Selling price not found for ${category}/${productId}`);
        }
        if (this.requiresCost(category)) {
            const costDoc = await this._getPricingRef(this.COST_COLLECTION).doc(docId).get();
            if (!costDoc.exists) {
                throw new Error(`Cost price not found for ${category}/${productId}`);
            }
        }
        
        return true;
    },
    
    /**
     * Migrate all products in a category from old format to new structure (TWO SEPARATE COLLECTIONS)
     * Safe migration that preserves existing values
     */
    async migrateCategoryPricing(category) {
        try {
            // Try to load from old format (if exists)
            const oldDoc = await this._getPricingRef(this.COLLECTION_NAME).doc(category).get();
            let migratedCount = 0;
            
            if (oldDoc.exists) {
                const oldData = oldDoc.data();
                console.log(`Migrating category ${category} from old format to separate collections...`);
                
                // If category has products (like Outdoor), migrate each product
                if (category === 'Outdoor' && typeof Outdoor !== 'undefined') {
                    await Outdoor.initialize();
                    const products = await Outdoor.getProducts();
                    
                    for (const product of products) {
                        const oldPrice = oldData.products?.[product.id] || oldData.pricing?.products?.[product.id];
                        if (oldPrice !== undefined) {
                            // Migrate this product to TWO SEPARATE collections
                            await this.migrateProductPricing(category, product.id, { price: oldPrice });
                            migratedCount++;
                        }
                    }
                }
            }
            
            // Also migrate from old product_pricing collection if it exists
            try {
                const oldProductPricingSnapshot = await this._getPricingRef('product_pricing')
                    .where('category', '==', category)
                    .get();
                
                for (const doc of oldProductPricingSnapshot.docs) {
                    const data = doc.data();
                    const productId = data.productId;
                    
                    if (data.pricing) {
                        // Migrate from old structure
                        const oldPricing = data.pricing;
                        await this.migrateProductPricing(category, productId, {
                            costPrice: oldPricing.cost?.basePrice || 0,
                            sellingPrice: oldPricing.sell?.basePrice || 0
                        });
                        migratedCount++;
                    }
                }
            } catch (error) {
                console.warn(`No old product_pricing collection found for ${category}:`, error);
            }
            
            console.log(`Migration complete for ${category}: ${migratedCount} products migrated to separate collections`);
            return { success: true, migratedCount };
        } catch (error) {
            console.error(`Error migrating category ${category}:`, error);
            return { success: false, error: error.message };
        }
    },
    
    /**
     * Batch migrate all categories
     */
    async migrateAllCategories() {
        const categories = this.COST_ENABLED_CATEGORIES;
        const results = {};
        
        for (const category of categories) {
            results[category] = await this.migrateCategoryPricing(category);
        }
        
        return results;
    },
    
    /**
     * Split dual-price documents (sellingPrice + costPrice in same doc)
     * Moves sellingPrice to product_prices_sell and costPrice to product_prices_cost
     */
    async splitDualPriceDocuments() {
        const results = { processed: 0, split: 0, errors: [] };
        try {
            const oldCollection = 'product_pricing';
            const snapshot = await this._getPricingRef(oldCollection).get();
            
            for (const doc of snapshot.docs) {
                try {
                    const data = doc.data();
                    const category = data.category;
                    const productId = data.productId || doc.id.split('_')[1];
                    
                    if (!category || !productId) continue;
                    
                    // Check if document has dual prices
                    const pricing = data.pricing;
                    if (!pricing) continue;
                    
                    const hasSellPrice = pricing.sell?.basePrice !== undefined || pricing.sellingPrice !== undefined;
                    const hasCostPrice = pricing.cost?.basePrice !== undefined || pricing.costPrice !== undefined;
                    
                    if (hasSellPrice && hasCostPrice) {
                        // Extract prices
                        const sellingPrice = pricing.sell?.basePrice || pricing.sellingPrice || 0;
                        const costPrice = pricing.cost?.basePrice || pricing.costPrice || 0;
                        
                        const docId = `${category}_${productId}`;
                        
                        await this._getPricingRef(this.SELL_COLLECTION).doc(docId).set({
                            productId: productId,
                            categoryId: category,
                            sellingPrice: sellingPrice,
                            currency: 'EGP',
                            migratedAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        });
                        if (this.requiresCost(category)) {
                            await this._getPricingRef(this.COST_COLLECTION).doc(docId).set({
                                productId: productId,
                                categoryId: category,
                                costPrice: costPrice,
                                currency: 'EGP',
                                migratedAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            });
                        }
                        
                        results.split++;
                    }
                    
                    results.processed++;
                } catch (error) {
                    results.errors.push({
                        docId: doc.id,
                        error: error.message
                    });
                }
            }
            
            console.log('Dual-price document split complete:', results);
            return results;
        } catch (error) {
            console.error('Error splitting dual-price documents:', error);
            results.errors.push({ general: error.message });
            return results;
        }
    },
    
    /**
     * Get pricing (backward compatibility method)
     * Returns structure compatible with old code: { sale: { price: X }, cost: { price: Y } }
     */
    async getPricing(category, productId) {
        const pricing = await this.getProductPricing(category, productId);
        return {
            sale: {
                price: pricing.sell.sellingPrice || 0,
                currency: pricing.sell.currency || 'EGP'
            },
            cost: {
                price: pricing.cost.costPrice || 0,
                currency: pricing.cost.currency || 'EGP'
            }
        };
    },
    
    // In-memory pricing cache { 'category_mode': { data, timestamp } }
    _pricingCache: {},
    _CACHE_TTL: 5 * 60 * 1000, // 5 minutes

    /**
     * Load pricing data for custom-collection categories (catalogs, brochures, digital_printing, etc.)
     * Returns paperPrices object { paperTypeId: { priceSingle, priceDouble } }
     * Cached in memory for 5 minutes to avoid repeated Firestore calls.
     * @param {string} category - e.g. 'catalogs', 'brochures'
     * @param {string} mode - 'selling' or 'cost'
     * @returns {Object} paperPrices map
     */
    async loadPricing(category, mode) {
        const cacheKey = `${category}_${mode}`;
        const cached = this._pricingCache[cacheKey];
        if (cached && (Date.now() - cached.timestamp) < this._CACHE_TTL) {
            return cached.data;
        }

        const colls = this.getCollectionNames(category);
        const collName = mode === 'selling' ? colls.sell : colls.cost;
        const configDocId = 'default';
        try {
            const doc = await this._getPricingRef(collName).doc(configDocId).get();
            if (doc.exists) {
                const data = doc.data();
                this._pricingCache[cacheKey] = { data: data, timestamp: Date.now() };
                return data;
            }
        } catch (e) {
            console.warn(`PricingService.loadPricing(${category}, ${mode}):`, e);
        }
        return {};
    },

    /**
     * Check if user can view cost prices
     */
    canViewCostPrice(userRole) {
        return userRole === 'admin' || userRole === 'manager';
    },
    
    /**
     * Check if user can edit cost prices
     */
    canEditCostPrice(userRole) {
        return userRole === 'admin';
    }
};

// Expose globally
window.PricingService = PricingService;
