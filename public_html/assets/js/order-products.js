// Local store for design files — IndexedDB for large files, keeps Firestore docs small
const DesignFileStore = {
    KEY_PREFIX: 'oh_design_',
    DB_NAME: 'oh_design_files_v1',
    STORE: 'files',
    _cache: new Map(),
    _dbPromise: null,

    _key(ref) { return this.KEY_PREFIX + ref; },

    makeRef(orderId, productId) { return `${orderId}_${productId}`; },

    makeDraftRef(productId) { return `draft_${productId}`; },

    _record(dataUrl, name, mime) {
        return { url: dataUrl, name: name || 'design-file', mime: mime || '', at: Date.now() };
    },

    _openDb() {
        if (this._dbPromise) return this._dbPromise;
        this._dbPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) { resolve(null); return; }
            const req = indexedDB.open(this.DB_NAME, 1);
            req.onupgradeneeded = () => { req.result.createObjectStore(this.STORE); };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }).catch(() => null);
        return this._dbPromise;
    },

    async _idbPut(ref, record) {
        const db = await this._openDb();
        if (!db) return false;
        return new Promise((resolve) => {
            const tx = db.transaction(this.STORE, 'readwrite');
            tx.objectStore(this.STORE).put(record, ref);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        });
    },

    async _idbGet(ref) {
        const db = await this._openDb();
        if (!db) return null;
        return new Promise((resolve) => {
            const tx = db.transaction(this.STORE, 'readonly');
            const req = tx.objectStore(this.STORE).get(ref);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        });
    },

    async _idbDelete(ref) {
        const db = await this._openDb();
        if (!db) return;
        return new Promise((resolve) => {
            const tx = db.transaction(this.STORE, 'readwrite');
            tx.objectStore(this.STORE).delete(ref);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
    },

    save(ref, dataUrl, name, mime) {
        if (!ref || !dataUrl) return false;
        const record = this._record(dataUrl, name, mime);
        this._cache.set(ref, record);
        if (dataUrl.length < 3_500_000) {
            try {
                localStorage.setItem(this._key(ref), JSON.stringify(record));
            } catch (e) { /* large file — IndexedDB only */ }
        }
        this._idbPut(ref, record);
        return true;
    },

    get(ref) {
        if (!ref) return null;
        if (this._cache.has(ref)) return this._cache.get(ref);
        try {
            const raw = localStorage.getItem(this._key(ref));
            if (raw) {
                const data = JSON.parse(raw);
                this._cache.set(ref, data);
                return data;
            }
        } catch (e) { /* ignore */ }
        return null;
    },

    async getAsync(ref) {
        const cached = this.get(ref);
        if (cached?.url) return cached;
        const fromDb = await this._idbGet(ref);
        if (fromDb?.url) {
            this._cache.set(ref, fromDb);
            return fromDb;
        }
        return null;
    },

    remove(ref) {
        if (!ref) return;
        this._cache.delete(ref);
        try { localStorage.removeItem(this._key(ref)); } catch (e) { /* ignore */ }
        this._idbDelete(ref);
    },

    migrateDraftToOrder(draftRef, orderRef) {
        const data = this.get(draftRef);
        if (!data) return false;
        if (this.save(orderRef, data.url, data.name, data.mime)) {
            this.remove(draftRef);
            return true;
        }
        return false;
    },

    _applyStored(product, ref, stored) {
        if (!stored?.url) return product;
        product.designFileUrl = stored.url;
        product.designFileName = product.designFileName || stored.name;
        product.designFileMime = product.designFileMime || stored.mime;
        product.designFileRef = ref;
        product.hasDesignFile = true;
        return product;
    },

    hydrateProduct(product, orderId) {
        if (!product || typeof product !== 'object') return product;
        if (product.designFileUrl && /^https?:\/\//i.test(product.designFileUrl)) {
            product.hasDesignFile = true;
            return product;
        }
        if (product.designFileUrl || product.designFileData) {
            product.hasDesignFile = true;
            return product;
        }
        const ref = product.designFileRef
            || (orderId && product.id ? this.makeRef(orderId, product.id) : (product.id ? this.makeDraftRef(product.id) : null));
        if (!ref) return product;
        return this._applyStored(product, ref, this.get(ref));
    },

    async hydrateProductAsync(product, orderId) {
        if (!product || typeof product !== 'object') return product;
        if (product.designFileUrl && /^https?:\/\//i.test(product.designFileUrl)) {
            product.hasDesignFile = true;
            return product;
        }
        if (product.designFileUrl || product.designFileData) {
            product.hasDesignFile = true;
            return product;
        }
        const ref = product.designFileRef
            || (orderId && product.id ? this.makeRef(orderId, product.id) : (product.id ? this.makeDraftRef(product.id) : null));
        if (!ref) return product;
        const stored = await this.getAsync(ref);
        return this._applyStored(product, ref, stored);
    }
};

function productHasDesignFile(product) {
    return !!(product && (product.hasDesignFile || product.designFileUrl || product.designFileData || product.designFileRef || product.designStoragePath));
}

function resolveProductDesignUrl(product) {
    if (!product) return '';
    if (product.designFileUrl && /^https?:\/\//i.test(product.designFileUrl)) return product.designFileUrl;
    if (product.designFileUrl) return product.designFileUrl;
    if (product.designFileData) return product.designFileData;
    if (product.designFileRef) {
        const stored = DesignFileStore.get(product.designFileRef);
        if (stored?.url) return stored.url;
    }
    if (product.id) {
        const stored = DesignFileStore.get(DesignFileStore.makeDraftRef(product.id));
        if (stored?.url) return stored.url;
    }
    return '';
}

async function resolveProductDesignUrlAsync(product) {
    const sync = resolveProductDesignUrl(product);
    if (sync) return sync;
    if (product?.designFileRef) {
        const stored = await DesignFileStore.getAsync(product.designFileRef);
        if (stored?.url) return stored.url;
    }
    if (product?.id) {
        const stored = await DesignFileStore.getAsync(DesignFileStore.makeDraftRef(product.id));
        if (stored?.url) return stored.url;
    }
    return '';
}

// تخزين سحابي مزدوج: Supabase (أساسي 1GB) → Cloudflare R2 (احتياطي 10GB)
const DesignCloudStore = {
    PREFER_R2_KEY: 'oh_design_prefer_r2',

    _bucket() {
        return window.supabaseConfig?.bucket || 'designs';
    },

    getClient() {
        return window.supabaseClient || null;
    },

    _apiKey() {
        const cfg = window.supabaseConfig || {};
        return cfg.publishableKey || cfg.anonKey || '';
    },

    _r2WorkerUrl() {
        const url = (window.r2Config?.workerUrl || '').trim();
        return url ? url.replace(/\/$/, '') : '';
    },

    isSupabaseReady() {
        return !!(this.getClient() && window.supabaseConfig?.url && this._apiKey());
    },

    isR2Ready() {
        return !!this._r2WorkerUrl();
    },

    isReady() {
        return this.isSupabaseReady() || this.isR2Ready();
    },

    getStorage() {
        return this.isReady() ? this : null;
    },

    _preferR2() {
        try { return localStorage.getItem(this.PREFER_R2_KEY) === '1'; } catch (e) { return false; }
    },

    _setPreferR2() {
        try { localStorage.setItem(this.PREFER_R2_KEY, '1'); } catch (e) { /* ignore */ }
    },

    _isQuotaError(msg) {
        return /quota|limit exceeded|storage full|storage quota|exceeded.*limit|413|too large|maximum.*size|507|bucket.*full/i.test(msg || '');
    },

    _sanitizeFileName(name) {
        return (name || 'design-file').replace(/[^\w.\-()\u0600-\u06FF]+/g, '_').slice(0, 120);
    },

    draftPath(productId, fileName) {
        return `drafts/${productId}/${Date.now()}_${this._sanitizeFileName(fileName)}`;
    },

    orderPath(orderId, productId, fileName) {
        return `orders/${orderId}/${productId}_${this._sanitizeFileName(fileName)}`;
    },

    _applyUploadToProduct(product, result, meta) {
        product.designFileUrl = result.url;
        product.designStoragePath = result.storagePath;
        product.designStorageProvider = result.provider || 'supabase';
        product.designFileName = meta?.name || product.designFileName || 'design-file';
        product.designFileMime = meta?.mime || product.designFileMime || '';
        product.hasDesignFile = true;
        delete product.designFileRef;
        return product;
    },

    _edgeFunctionUrl() {
        const base = window.supabaseConfig?.url || '';
        return base ? `${base.replace(/\/$/, '')}/functions/v1/design-files` : '';
    },

    async _uploadViaEdgeFunction(blob, storagePath, mime) {
        const endpoint = this._edgeFunctionUrl();
        const apiKey = this._apiKey();
        if (!endpoint || !apiKey) throw new Error('Edge Function غير متاح');
        const form = new FormData();
        form.append('path', storagePath);
        form.append('file', blob, blob.name || 'design-file');
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
            body: form
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || 'فشل رفع الملف عبر Edge Function');
        return { url: payload.url, storagePath: payload.storagePath || storagePath, provider: 'supabase' };
    },

    async _uploadSupabase(blob, storagePath, mime) {
        const client = this.getClient();
        if (!client) throw new Error('Supabase غير مُعدّ');
        const bucket = this._bucket();
        const { error } = await client.storage.from(bucket).upload(storagePath, blob, {
            contentType: mime || blob.type || 'application/octet-stream',
            upsert: true
        });
        if (error) {
            const msg = error.message || '';
            if (/row-level security|policy/i.test(msg)) {
                return this._uploadViaEdgeFunction(blob, storagePath, mime);
            }
            throw new Error(msg);
        }
        const { data } = client.storage.from(bucket).getPublicUrl(storagePath);
        return { url: data.publicUrl, storagePath, provider: 'supabase' };
    },

    async _uploadR2(blob, storagePath, mime) {
        const worker = this._r2WorkerUrl();
        if (!worker) throw new Error('Cloudflare R2 غير مُعدّ — ضع workerUrl في r2Config');
        const form = new FormData();
        form.append('path', storagePath);
        form.append('file', blob, blob.name || 'design-file');
        const res = await fetch(`${worker}/upload`, { method: 'POST', body: form });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || 'فشل رفع الملف إلى R2');
        let url = payload.url || '';
        if (!url && window.r2Config?.publicBaseUrl) {
            url = `${window.r2Config.publicBaseUrl.replace(/\/$/, '')}/${storagePath}`;
        }
        return { url, storagePath: payload.storagePath || storagePath, provider: 'r2' };
    },

    async uploadBlob(blob, storagePath, mime) {
        const useR2First = this._preferR2();
        const canSupabase = this.isSupabaseReady();
        const canR2 = this.isR2Ready();

        if (!canSupabase && !canR2) {
            throw new Error('التخزين السحابي غير مُعدّ (Supabase أو R2)');
        }

        const trySupabaseThenR2 = async () => {
            if (!canSupabase) return this._uploadR2(blob, storagePath, mime);
            try {
                return await this._uploadSupabase(blob, storagePath, mime);
            } catch (e) {
                if (canR2 && this._isQuotaError(e.message)) {
                    this._setPreferR2();
                    return this._uploadR2(blob, storagePath, mime);
                }
                throw e;
            }
        };

        if (useR2First && canR2) {
            try {
                return await this._uploadR2(blob, storagePath, mime);
            } catch (e) {
                if (canSupabase) return trySupabaseThenR2();
                throw e;
            }
        }
        return trySupabaseThenR2();
    },

    async dataUrlToBlob(dataUrl) {
        const res = await fetch(dataUrl);
        return res.blob();
    },

    async uploadDataUrl(dataUrl, fileName, mime, storagePath) {
        const blob = await this.dataUrlToBlob(dataUrl);
        return this.uploadBlob(blob, storagePath, mime);
    },

    async uploadFileForProduct(product, file, orderId) {
        if (!product?.id) throw new Error('معرّف الصنف غير موجود');
        const path = orderId
            ? this.orderPath(orderId, product.id, file.name)
            : this.draftPath(product.id, file.name);
        const result = await this.uploadBlob(file, path, file.type || '');
        return this._applyUploadToProduct(product, result, { name: file.name, mime: file.type || '' });
    },

    _isCloudUrl(url) {
        return !!(url && /^https?:\/\//i.test(url) && !url.startsWith('data:'));
    },

    async ensureProductCloud(product, orderId) {
        if (!product || !productHasDesignFile(product)) return product;
        if (this._isCloudUrl(product.designFileUrl)) {
            product.hasDesignFile = true;
            return product;
        }

        let dataUrl = product.designFileUrl || product.designFileData || '';
        let name = product.designFileName || 'design-file';
        let mime = product.designFileMime || '';

        if (!dataUrl || !dataUrl.startsWith('data:')) {
            dataUrl = await resolveProductDesignUrlAsync(product);
            if (!name || name === 'design-file') {
                const stored = product.designFileRef
                    ? await DesignFileStore.getAsync(product.designFileRef)
                    : (product.id ? await DesignFileStore.getAsync(DesignFileStore.makeDraftRef(product.id)) : null);
                if (stored) {
                    name = stored.name || name;
                    mime = stored.mime || mime;
                }
            }
        }

        if (!dataUrl) return product;
        if (this._isCloudUrl(dataUrl)) {
            product.designFileUrl = dataUrl;
            product.hasDesignFile = true;
            return product;
        }

        const path = orderId && product.id
            ? this.orderPath(orderId, product.id, name)
            : this.draftPath(product.id, name);
        const result = await this.uploadDataUrl(dataUrl, name, mime, path);
        return this._applyUploadToProduct(product, result, { name, mime });
    },

    async ensureProductsCloud(products, orderId) {
        const out = [];
        for (const p of (products || [])) {
            out.push(await this.ensureProductCloud({ ...p }, orderId));
        }
        return out;
    },

    async deletePath(storagePath, provider) {
        if (!storagePath) return;
        const p = provider || 'supabase';
        try {
            if (p === 'r2' && this.isR2Ready()) {
                await fetch(`${this._r2WorkerUrl()}/delete?path=${encodeURIComponent(storagePath)}`, { method: 'DELETE' });
                return;
            }
            const client = this.getClient();
            if (client) await client.storage.from(this._bucket()).remove([storagePath]);
        } catch (e) { console.warn('DesignCloudStore delete:', e); }
    }
};

// Order Products Module - Manages products in an order
const OrderProducts = {
    currentProducts: [], // Array of products in current order
    currentProductType: null, // Product type being configured
    DESIGN_ALLOWED_EXT: ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'psd', 'ai', 'cdr', 'eps', 'tif', 'tiff', 'zip', 'rar', 'doc', 'docx'],
    DESIGN_MAX_BYTES: 50 * 1024 * 1024,
    DESIGN_ACCEPT: '.pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.psd,.ai,.cdr,.eps,.tif,.tiff,.zip,.rar,.doc,.docx,image/*,application/pdf',

    _findProduct(productId) {
        if (typeof Orders !== 'undefined' && Orders.isEditingOrder && Array.isArray(Orders.editingProducts)) {
            const p = Orders.editingProducts.find(x => x.id == productId);
            if (p) return p;
        }
        return this.currentProducts.find(p => p.id == productId);
    },

    _isDesignExtAllowed(filename) {
        const ext = (filename || '').split('.').pop().toLowerCase();
        return this.DESIGN_ALLOWED_EXT.includes(ext);
    },

    _readDesignFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({
                url: e.target.result,
                name: file.name,
                mime: file.type || ''
            });
            reader.onerror = () => reject(new Error('فشل قراءة الملف'));
            reader.readAsDataURL(file);
        });
    },

    async uploadProductDesign(productId, input) {
        const file = input?.files?.[0];
        if (input) input.value = '';
        if (!file) return;
        if (!this._isDesignExtAllowed(file.name)) {
            Swal.fire('خطأ', 'نوع الملف غير مدعوم. المسموح: PDF، صور، PSD، AI، CDR، ZIP وغيرها', 'error');
            return;
        }
        if (file.size > this.DESIGN_MAX_BYTES) {
            Swal.fire('تنبيه', 'حجم الملف كبير (الحد 50 ميجا). جرّب ملف أصغر.', 'warning');
            return;
        }
        const product = this._findProduct(productId);
        if (!product) return;
        Swal.fire({ title: 'جاري رفع التصميم...', text: 'يتم حفظ الملف في السحابة', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
        try {
            if (typeof DesignCloudStore !== 'undefined' && DesignCloudStore.getStorage()) {
                await DesignCloudStore.uploadFileForProduct(product, file, null);
            } else {
                const data = await this._readDesignFile(file);
                const draftRef = DesignFileStore.makeDraftRef(productId);
                DesignFileStore.save(draftRef, data.url, data.name, data.mime);
                product.designFileUrl = data.url;
                product.designFileName = data.name;
                product.designFileMime = data.mime;
                product.designFileRef = draftRef;
                product.hasDesignFile = true;
            }
            Swal.close();
            this.renderProductsList();
            if (typeof Orders !== 'undefined' && Orders.isEditingOrder && typeof Orders.renderEditProducts === 'function') {
                Orders.renderEditProducts();
            }
        } catch (e) {
            Swal.fire('خطأ', e.message || 'فشل رفع الملف', 'error');
        }
    },

    async removeProductDesign(productId) {
        const product = this._findProduct(productId);
        if (!product) return;
        if (product.designStoragePath && typeof DesignCloudStore !== 'undefined') {
            await DesignCloudStore.deletePath(product.designStoragePath, product.designStorageProvider);
        }
        if (product.designFileRef) DesignFileStore.remove(product.designFileRef);
        DesignFileStore.remove(DesignFileStore.makeDraftRef(productId));
        product.designFileUrl = '';
        product.designFileName = '';
        product.designFileMime = '';
        product.designFileRef = '';
        product.designStoragePath = '';
        product.designStorageProvider = '';
        product.hasDesignFile = false;
        this.renderProductsList();
        if (typeof Orders !== 'undefined' && Orders.isEditingOrder && typeof Orders.renderEditProducts === 'function') {
            Orders.renderEditProducts();
        }
    },

    renderProductDesignControls(product) {
        const hasDesign = productHasDesignFile(product);
        const name = product.designFileName || '';
        const inputId = `designInput_${product.id}`;
        const downloadBtn = hasDesign
            ? `<button type="button" onclick="openProductDesignFile(OrderProducts._findProduct(${product.id}))" class="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold hover:bg-emerald-100 transition"><i class="fas fa-download ml-1"></i> تحميل التصميم</button>`
            : '';
        const removeBtn = hasDesign
            ? `<button type="button" onclick="OrderProducts.removeProductDesign(${product.id})" class="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-lg font-bold hover:bg-red-100 transition"><i class="fas fa-trash ml-1"></i> حذف</button>`
            : '';
        const safeName = (name || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        const nameHtml = hasDesign && name
            ? `<span class="text-[10px] text-gray-500 truncate max-w-[10rem]" title="${safeName}"><i class="fas fa-paperclip ml-1 text-accent"></i>${safeName}</span>`
            : '';
        return `<div class="mt-2 flex flex-wrap items-center gap-2">
            <label class="cursor-pointer text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold hover:bg-blue-100 transition inline-flex items-center gap-1">
                <i class="fas fa-cloud-arrow-up"></i> ${hasDesign ? 'تغيير الملف' : 'رفع تصميم'}
                <input type="file" id="${inputId}" class="hidden" accept="${this.DESIGN_ACCEPT}" onchange="OrderProducts.uploadProductDesign(${product.id}, this)">
            </label>
            ${downloadBtn}
            ${removeBtn}
            ${nameHtml}
        </div>`;
    },

    // Initialize
    init() {
        this.currentProducts = [];
        this.renderProductsList();
    },

    // Clear products list
    clear() {
        this.currentProducts = [];
        this.currentProductType = null;
        this.renderProductsList();
    },

    // Open product selection modal
    openProductSelection() {
        // Load and display offers in the modal
        this.renderProductSelectionModal();
        openModal('productSelectionModal');
    },

    // Render product selection modal with offers
    renderProductSelectionModal() {
        const modalGrid = document.getElementById('productSelectionGrid');
        if (!modalGrid) return;

        // Remove existing offer cards (to avoid duplicates)
        const existingOffers = modalGrid.querySelectorAll('[data-offer-card]');
        existingOffers.forEach(card => card.remove());

        // Load offers synchronously from cache first
        const cachedOffers = this.loadOffersSync();
        this._insertOfferCards(modalGrid, cachedOffers);

        // Then load async in background and update if needed
        this.loadOffers().then(offers => {
            if (offers && offers.length > 0) {
                const existing = modalGrid.querySelectorAll('[data-offer-card]');
                existing.forEach(card => card.remove());
                this._insertOfferCards(modalGrid, offers);
            }
        }).catch(e => console.warn('Failed to load offers:', e));
    },

    _insertOfferCards(modalGrid, offers) {
        if (!offers || !Array.isArray(offers) || offers.length === 0) return;
        const offersHTML = offers.map(offer => `
            <div data-offer-card onclick="OrderProducts.selectOffer(${offer.id})" class="product-card cursor-pointer bg-gradient-to-br from-yellow-50 to-orange-100 border-2 border-yellow-300 hover:border-yellow-500 p-6 rounded-xl transition-all hover:shadow-lg">
                <div class="text-center">
                    <i class="fas fa-tags text-5xl text-yellow-600 mb-4"></i>
                    <h4 class="font-bold text-lg text-gray-800 mb-2">${offer.name}</h4>
                    <p class="text-sm text-gray-600 mb-2">عرض</p>
                    <p class="text-sm font-bold text-brandGold">${(offer.sellingPrice || offer.price || 0).toFixed(2)} ج.م</p>
                </div>
            </div>
        `).join('');
        modalGrid.insertAdjacentHTML('afterbegin', offersHTML);
    },

    // Load offers from cache (sync) - returns array immediately
    loadOffersSync() {
        if (typeof PricingAdmin !== 'undefined' && PricingAdmin._offersCache) {
            return PricingAdmin._offersCache;
        }
        return [];
    },

    // Load offers from storage (async)
    async loadOffers() {
        if (typeof PricingAdmin !== 'undefined' && PricingAdmin.loadOffers) {
            return await PricingAdmin.loadOffers();
        }
        return [];
    },

    // Timeout utility for async calls
    _withTimeout(promise, ms) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
        ]);
    },

    // Route product type to its config opener
    _openConfigByType(productType) {
        const map = {
            'Offset': () => this.openOffsetConfig(),
            'Outdoor': () => this.openOutdoorConfig(),
            'Indoor': () => this.openIndoorConfig(),
            'Stands': () => this.openStandsConfig(),
            'Stamps': () => this.openStampsConfig(),
            'BusinessCard': () => this.openBusinessCardsConfig(),
            'Envelopes': () => this.openEnvelopesConfig(),
            'UVPrinting': () => this.openUVPrintingConfig(),
            'Tableaux': () => this.openTableauxConfig(),
            'DTF': () => this.openDTFConfig(),
            'Flag': () => this.openFlagsConfig(),
            'TShirt': () => this.openTShirtConfig(),
            'FabricBag': () => this.openFabricBagConfig(),
            'IDCard': () => this.openIDCardConfig(),
            'ZikrMedal': () => this.openZikrMedalConfig(),
            'SublimationGift': () => this.openSublimationGiftConfig(),
            'promotional_gifts': () => this.openPromotionalGiftsConfig(),
            'ruler_frames': () => this.openRulerFramesConfig(),
            'shipping_flyers_clear_bags': () => this.openShippingFlyersClearBagsConfig(),
            'plastic_bags': () => this.openPlasticBagsConfig(),
            'inkjet_paper_printing': () => this.openInkjetPaperPrintingConfig(),
            'safety_printing': () => this.openSafetyPrintingConfig(),
            'digital_printing': () => this.openDigitalPrintingConfig(),
            'paper_bags': () => this.openPaperBagsConfig(),
            'brochures': () => this.openBrochuresConfig(),
            'catalogs': () => this.openCatalogsConfig(),
            'acrylic_badge': () => this.openAcrylicBadgeConfig(),
            'card_rosary': () => this.openCardRosaryConfig(),
            'annual_ads': () => this.openAnnualAdsConfig(),
            'cup_quran_bags': () => this.openCupQuranBagsConfig(),
            'boxes': () => this.openBoxesConfig(),
            'cladding_letters': () => this.openCladdingLettersConfig(),
            'kraft_bags': () => this.openKraftBagsConfig()
        };
        const opener = map[productType];
        if (opener) return opener();
        return Promise.resolve();
    },

    // Select a product type - shows loading immediately
    async selectProduct(productType) {
        this.currentProductType = productType;
        closeModal('productSelectionModal');
        
        // Show loading immediately so user sees feedback
        Swal.fire({
            title: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a...',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });
        
        try {
            await this._withTimeout(this._openConfigByType(productType), 15000);
            Swal.close();
        } catch(err) {
            Swal.close();
            if (err.message === 'timeout') {
                console.error('Config open timeout for:', productType);
                Swal.fire('\u062a\u0646\u0628\u064a\u0647', '\u0627\u0633\u062a\u063a\u0631\u0642 \u0627\u0644\u062a\u062d\u0645\u064a\u0644 \u0648\u0642\u062a\u0627\u064b \u0637\u0648\u064a\u0644\u0627\u064b. \u064a\u0631\u062c\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.', 'warning');
            } else {
                console.error('Config open error:', productType, err);
                Swal.fire('\u062e\u0637\u0623', '\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c: ' + (err.message || ''), 'error');
            }
        }
    },

    // Select an offer
    async selectOffer(offerId) {
        let offers = this.loadOffersSync();
        let offer = offers.find(o => o.id == offerId);
        
        // If not found in cache, try async load
        if (!offer) {
            try {
                offers = await this.loadOffers();
                offer = offers.find(o => o.id == offerId);
            } catch(e) { console.error('loadOffers error:', e); }
        }
        
        if (!offer) {
            Swal.fire('خطأ', 'العرض غير موجود', 'error');
            return;
        }

        closeModal('productSelectionModal');

        // Add offer as a product with fixed price
        const product = {
            id: Date.now(),
            type: 'Offer',
            offerId: offer.id,
            offerName: offer.name,
            offerItems: offer.items,
            price: offer.sellingPrice || offer.price, // Use selling price if available
            sellingPrice: offer.sellingPrice || offer.price, // Store selling price snapshot
            isOffer: true
        };

        this.addProduct(product);
        Swal.fire('تم', 'تم إضافة العرض بنجاح', 'success');
    },

    // Open Offset configuration
    _offsetSellMarginPercent: 50,
    async openOffsetConfig() {
        const content = document.getElementById('offsetConfigContent');
        
        // Load sell margin from offset config
        try {
            const offsetCfg = await PricingAdmin.loadOffsetConfig();
            this._offsetSellMarginPercent = offsetCfg?.sellMarginPercent || 50;
        } catch(e) { this._offsetSellMarginPercent = 50; }
        
        if (content) {
            content.innerHTML = `
                <form id="offsetConfigForm" class="space-y-4">
                    <!-- Paper Type Selection (Required) -->
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">نوع الورق <span class="text-red-500">*</span></label>
                        <select id="offsetPaperType" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                            <option value="">اختر نوع الورق</option>
                        </select>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">الطول (سم)</label>
                            <input type="number" id="offsetWidth" step="0.01" min="0" placeholder="0.00" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">العرض (سم)</label>
                            <input type="number" id="offsetHeight" step="0.01" min="0" placeholder="0.00" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">الكمية</label>
                            <input type="number" id="offsetQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">عدد الألوان</label>
                            <select id="offsetColors" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                                <option value="1">لون واحد</option>
                                <option value="4">أربع ألوان</option>
                            </select>
                        </div>
                    </div>
                    <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <label class="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" id="offsetDoubleSided" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700">طباعة على الوجهين (التكلفة × 2)</span>
                        </label>
                    </div>
                    
                    <!-- Offset Additions -->
                    <div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                        <label class="flex items-center gap-3 cursor-pointer mb-3" onclick="OrderProducts.toggleAdditionsSection()">
                            <input type="checkbox" id="offsetAdditionsToggle" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-800 text-lg">الإضافات</span>
                        </label>
                        <div id="offsetAdditionsContent" class="hidden-section space-y-3">
                            <!-- Special Color -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetSpecialColor" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('specialColor')">
                                    <span class="font-bold text-gray-700">لون اسبشيال</span>
                                </label>
                                <div id="offsetSpecialColorOptions" class="hidden-section space-y-2 mr-8">
                                    <select id="offsetSpecialColorType" class="w-full border border-gray-300 p-2 rounded text-sm">
                                        <option value="gold">دهبي</option>
                                        <option value="silver">فضي</option>
                                        <option value="white">أبيض</option>
                                    </select>
                                    <select id="offsetSpecialColorSides" class="w-full border border-gray-300 p-2 rounded text-sm">
                                        <option value="1">وجه واحد</option>
                                        <option value="2">وجهين</option>
                                    </select>
                                    <div id="offsetSpecialColorMachineInfo" class="bg-blue-50 p-2 rounded border border-blue-200 text-xs text-blue-800 mt-2">
                                        <i class="fas fa-info-circle ml-1"></i>
                                        <span>سيتم اختيار الآلة تلقائياً حسب المقاس</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Matte Cellophane -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetMatteCellophane" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('matteCellophane')">
                                    <span class="font-bold text-gray-700">سلوفان مط</span>
                                </label>
                                <div id="offsetMatteCellophaneOptions" class="hidden-section mr-8">
                                    <select id="offsetMatteCellophaneSides" class="w-full border border-gray-300 p-2 rounded text-sm">
                                        <option value="1">وجه واحد</option>
                                        <option value="2">وجهين</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Glossy Cellophane -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetGlossyCellophane" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('glossyCellophane')">
                                    <span class="font-bold text-gray-700">سلوفان لامع</span>
                                </label>
                                <div id="offsetGlossyCellophaneOptions" class="hidden-section mr-8">
                                    <select id="offsetGlossyCellophaneSides" class="w-full border border-gray-300 p-2 rounded text-sm">
                                        <option value="1">وجه واحد</option>
                                        <option value="2">وجهين</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Die Cutting -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetDieCutting" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('dieCutting')">
                                    <span class="font-bold text-gray-700">تكسير</span>
                                </label>
                                <div id="offsetDieCuttingOptions" class="hidden-section mr-8">
                                    <div class="flex items-center gap-2 mb-2">
                                        <label class="flex items-center gap-2 cursor-pointer flex-1">
                                            <input type="checkbox" id="offsetDieCuttingWithForm" class="w-4 h-4 text-brandGold rounded focus:ring-brandGold">
                                            <span class="text-sm text-gray-700">+ فورمة</span>
                                        </label>
                                        <button type="button" onclick="OrderProducts.toggleFormInfo('dieCutting')" class="text-blue-500 hover:text-blue-700 text-sm">
                                            <i class="fas fa-question-circle"></i>
                                        </button>
                                    </div>
                                    <div id="offsetDieCuttingFormInfo" class="hidden bg-blue-50 p-2 rounded border border-blue-200 text-xs text-gray-700 mb-2">
                                        <strong>حساب الفورمة:</strong><br>
                                        سعر الفورمة = (طول المنتج × عرض المنتج) × سعر السنتيمتر المربع<br>
                                        <span class="text-gray-600">مثال: إذا كان المنتج 10×15 سم وسعر السنتيمتر المربع 0.5 ج.م<br>
                                        الفورمة = (10 × 15) × 0.5 = 75 ج.م</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Embossing -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetEmbossing" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('embossing')">
                                    <span class="font-bold text-gray-700">بصمة</span>
                                </label>
                                <div id="offsetEmbossingOptions" class="hidden-section space-y-2 mr-8">
                                    <div class="flex items-center gap-2">
                                        <label class="flex items-center gap-2 cursor-pointer flex-1">
                                            <input type="checkbox" id="offsetEmbossingWithForm" class="w-4 h-4 text-brandGold rounded focus:ring-brandGold">
                                            <span class="text-sm text-gray-700">+ فورمة</span>
                                        </label>
                                        <button type="button" onclick="OrderProducts.toggleFormInfo('embossing')" class="text-blue-500 hover:text-blue-700 text-sm">
                                            <i class="fas fa-question-circle"></i>
                                        </button>
                                    </div>
                                    <div id="offsetEmbossingFormInfo" class="hidden bg-blue-50 p-2 rounded border border-blue-200 text-xs text-gray-700 mb-2">
                                        <strong>حساب الفورمة:</strong><br>
                                        سعر الفورمة = (طول المنتج × عرض المنتج) × سعر السنتيمتر المربع × عدد الأوجه<br>
                                        <span class="text-gray-600">مثال: إذا كان المنتج 10×15 سم وسعر السنتيمتر المربع 0.5 ج.م ووجهين<br>
                                        الفورمة = (10 × 15) × 0.5 × 2 = 150 ج.م</span>
                                    </div>
                                    <select id="offsetEmbossingSides" class="w-full border border-gray-300 p-2 rounded text-sm">
                                        <option value="1">وجه واحد</option>
                                        <option value="2">وجهين</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Debossing -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetDebossing" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('debossing')">
                                    <span class="font-bold text-gray-700">كفراج</span>
                                </label>
                                <div id="offsetDebossingOptions" class="hidden-section space-y-2 mr-8">
                                    <div class="flex items-center gap-2">
                                        <label class="flex items-center gap-2 cursor-pointer flex-1">
                                            <input type="checkbox" id="offsetDebossingWithForm" class="w-4 h-4 text-brandGold rounded focus:ring-brandGold">
                                            <span class="text-sm text-gray-700">+ فورمة</span>
                                        </label>
                                        <button type="button" onclick="OrderProducts.toggleFormInfo('debossing')" class="text-blue-500 hover:text-blue-700 text-sm">
                                            <i class="fas fa-question-circle"></i>
                                        </button>
                                    </div>
                                    <div id="offsetDebossingFormInfo" class="hidden bg-blue-50 p-2 rounded border border-blue-200 text-xs text-gray-700 mb-2">
                                        <strong>حساب الفورمة:</strong><br>
                                        سعر الفورمة = (طول المنتج × عرض المنتج) × سعر السنتيمتر المربع × عدد الأوجه<br>
                                        <span class="text-gray-600">مثال: إذا كان المنتج 10×15 سم وسعر السنتيمتر المربع 0.5 ج.م ووجهين<br>
                                        الفورمة = (10 × 15) × 0.5 × 2 = 150 ج.م</span>
                                    </div>
                                    <select id="offsetDebossingSides" class="w-full border border-gray-300 p-2 rounded text-sm">
                                        <option value="1">وجه واحد</option>
                                        <option value="2">وجهين</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Creasing -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetCreasing" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('creasing')">
                                    <span class="font-bold text-gray-700">ريجة</span>
                                </label>
                                <div id="offsetCreasingOptions" class="hidden-section mr-8">
                                    <input type="number" id="offsetCreasingCount" step="1" min="1" value="1" placeholder="عدد الريجات" class="w-full border border-gray-300 p-2 rounded text-sm">
                                </div>
                            </div>
                            
                            <!-- Cornering -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" id="offsetCornering" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                                    <span class="font-bold text-gray-700">ركنة</span>
                                </label>
                            </div>
                            
                            <!-- Perforation -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetPerforation" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('perforation')">
                                    <span class="font-bold text-gray-700">تخريم</span>
                                </label>
                                <div id="offsetPerforationOptions" class="hidden-section mr-8">
                                    <input type="number" id="offsetPerforationCount" step="1" min="1" value="1" placeholder="عدد التخريمن" class="w-full border border-gray-300 p-2 rounded text-sm">
                                </div>
                            </div>
                            
                            <!-- Spot UV -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetSpotUV" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('spotUV')">
                                    <span class="font-bold text-gray-700">سبوت</span>
                                </label>
                                <div id="offsetSpotUVOptions" class="hidden-section mr-8">
                                    <select id="offsetSpotUVSides" class="w-full border border-gray-300 p-2 rounded text-sm">
                                        <option value="1">وجه واحد</option>
                                        <option value="2">وجهين</option>
                                    </select>
                                </div>
                            </div>
                            
                            <!-- Folder Pocket -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetFolderPocket" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('folderPocket')">
                                    <span class="font-bold text-gray-700">جيب فولدر + لزق</span>
                                </label>
                                <div id="offsetFolderPocketOptions" class="hidden-section mr-8">
                                    <p class="text-xs text-gray-500">(الكمية ÷ 1000) × سعر الـ1000</p>
                                </div>
                            </div>
                            
                            <!-- Bonta Gluing -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetBontaGluing" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('bontaGluing')">
                                    <span class="font-bold text-gray-700">تلزيق بونطة</span>
                                </label>
                                <div id="offsetBontaGluingOptions" class="hidden-section mr-8 space-y-2">
                                    <div>
                                        <label class="block text-xs text-gray-600 mb-1">عدد البونط</label>
                                        <input type="number" id="offsetBontaCount" step="1" min="1" value="1" class="w-full border border-gray-300 p-2 rounded text-sm">
                                    </div>
                                    <p class="text-xs text-gray-500">(الكمية ÷ 1000) × سعر الـ1000 × عدد البونط</p>
                                </div>
                            </div>
                            
                            <!-- Sandwich Bag -->
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <label class="flex items-center gap-3 cursor-pointer mb-2">
                                    <input type="checkbox" id="offsetSandwichBag" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.toggleOffsetAddition('sandwichBag')">
                                    <span class="font-bold text-gray-700">تفصيل كيس سندوتش</span>
                                </label>
                                <div id="offsetSandwichBagOptions" class="hidden-section mr-8">
                                    <p class="text-xs text-gray-500">(الكمية ÷ 1000) × سعر الـ1000</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="offsetCalculationDisplay" class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                        <div class="text-center text-gray-500">أدخل الأبعاد والكمية لحساب السعر</div>
                    </div>
                    
                    <!-- Cost Price Input -->
                    <div class="mt-4">
                        <label class="block text-sm font-bold text-gray-700 mb-1">سعر التكلفة (ج.م) <span class="text-red-500">*</span></label>
                        <input type="number" id="offsetCostPrice" step="0.01" min="0" placeholder="0.00" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <p class="text-xs text-gray-500 mt-1">سيتم ملء هذا الحقل تلقائياً - يمكنك تعديله</p>
                    </div>
                    
                    <div class="flex gap-3 mt-4">
                        <button type="button" onclick="closeModal('offsetConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                        <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                    </div>
                </form>
            `;
            
            // Load and populate paper types
            const paperTypeSelect = document.getElementById('offsetPaperType');
            if (paperTypeSelect && typeof PricingAdmin !== 'undefined') {
                const paperTypes = PricingAdmin.loadPaperTypes();
                paperTypes.forEach(paper => {
                    const option = document.createElement('option');
                    option.value = paper.id;
                    option.textContent = `${paper.name} (${paper.size} - ${paper.price.toFixed(2)} ج.م/لوحة)`;
                    paperTypeSelect.appendChild(option);
                });
            }
            
            // Add calculation logic
            const form = document.getElementById('offsetConfigForm');
            const widthInput = document.getElementById('offsetWidth');
            const heightInput = document.getElementById('offsetHeight');
            const quantityInput = document.getElementById('offsetQuantity');
            const colorsInput = document.getElementById('offsetColors');
            const doubleSidedInput = document.getElementById('offsetDoubleSided');
            const paperTypeSelectInput = document.getElementById('offsetPaperType');
            
            const calculateOffset = () => {
                const width = parseFloat(widthInput?.value) || 0;
                const height = parseFloat(heightInput?.value) || 0;
                const quantity = parseFloat(quantityInput?.value) || 1;
                const colors = parseInt(colorsInput?.value) || 1;
                const doubleSided = doubleSidedInput?.checked || false;
                const paperTypeId = paperTypeSelectInput?.value;
                
                // Update special color machine info if enabled
                const specialColorCheck = document.getElementById('offsetSpecialColor');
                if (specialColorCheck && specialColorCheck.checked) {
                    OrderProducts.updateSpecialColorMachineInfo();
                }
                
                // Get additions
                const additions = OrderProducts.getOffsetAdditions();
                
                if (width > 0 && height > 0 && quantity > 0 && paperTypeId) {
                    // Get selected paper type
                    const paperTypes = (typeof PricingAdmin !== 'undefined' && PricingAdmin.loadPaperTypes) 
                        ? PricingAdmin.loadPaperTypes() 
                        : [];
                    const selectedPaper = paperTypes.find(p => p.id.toString() === paperTypeId);
                    
                    if (!selectedPaper) {
                        const display = document.getElementById('offsetCalculationDisplay');
                        if (display) {
                            display.innerHTML = '<div class="text-center text-red-500">يرجى اختيار نوع الورق</div>';
                        }
                        return;
                    }
                    
                    const calc = OffsetPricing.calculate(width, height, quantity, colors, doubleSided, selectedPaper, additions);
                    const userRole = AppState.currentUser?.role;
                    
                    // Auto-fill cost price with calculated production cost
                    const costPriceInput = document.getElementById('offsetCostPrice');
                    if (costPriceInput && !costPriceInput.value) {
                        costPriceInput.value = calc.productionCost.toFixed(2);
                    }
                    
                    const display = document.getElementById('offsetCalculationDisplay');
                    if (display) {
                        // Admin & Worker see full details, Sales sees only final price
                        const detailsSection = (userRole === 'admin' || userRole === 'worker') ? `
                            <div class="bg-indigo-50 p-2 rounded border border-indigo-200 mb-2">
                                <strong>نوع الورق المختار:</strong> ${selectedPaper.name}
                                <div class="text-xs mt-1">اللوحة الأساسية: ${calc.parentSheetSize.width} × ${calc.parentSheetSize.height} سم | السعر: ${calc.sheetPrice.toFixed(2)} ج.م/لوحة</div>
                            </div>
                            <div class="bg-blue-50 p-2 rounded border border-blue-200">
                                <strong>عدد القطع في اللوحة الواحدة (${calc.parentSheetSize.width}×${calc.parentSheetSize.height}):</strong> ${calc.piecesPerSheet} قطعة
                            </div>
                            <div class="bg-green-50 p-2 rounded border border-green-200">
                                <div class="flex justify-between items-center">
                                    <div>
                                        <strong>اللوحات المطلوبة للكمية:</strong> ${calc.requiredSheets} لوحة
                                    </div>
                                </div>
                                <div class="flex justify-between items-center mt-1 text-sm">
                                    <span class="text-orange-700">+ ${calc.extraSheets} لوحة إضافية (للنفايات والأخطاء):</span>
                                    <span class="font-bold text-orange-700">${calc.extraSheets} لوحة</span>
                                </div>
                                <div class="flex justify-between items-center mt-2 pt-2 border-t border-green-300">
                                    <strong>إجمالي اللوحات:</strong>
                                    <strong class="text-lg">${calc.totalSheets} لوحة</strong>
                                </div>
                            </div>
                            <div class="bg-purple-50 p-2 rounded border border-purple-200">
                                <strong>الطباعة ستتم على:</strong> ${calc.machine.name}
                            </div>
                            <div class="bg-gray-50 p-3 rounded border border-gray-200">
                                <strong class="block mb-2">تفاصيل التكلفة:</strong>
                                <div class="space-y-1 text-xs text-gray-700">
                                    <div class="flex justify-between">
                                        <span>تكلفة الورق (${calc.requiredSheets} لوحة × ${calc.sheetPrice.toFixed(2)} ج.م):</span>
                                        <span class="font-bold">${(calc.requiredSheets * calc.sheetPrice).toFixed(2)} ج.م</span>
                                    </div>
                                    <div class="flex justify-between text-orange-700">
                                        <span>+ ${calc.extraSheets} لوحة إضافية (${calc.extraSheets} × ${calc.sheetPrice.toFixed(2)} ج.م):</span>
                                        <span class="font-bold">${(calc.extraSheets * calc.sheetPrice).toFixed(2)} ج.م</span>
                                    </div>
                                    <div class="flex justify-between border-t pt-1 mt-1">
                                        <span class="font-bold">إجمالي تكلفة الورق:</span>
                                        <span class="font-bold">${calc.paperCost.toFixed(2)} ج.م</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>قطع الورق الأولي:</span>
                                        <span class="font-bold">${calc.cuttingCost.initial.toFixed(2)} ج.م</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>القطع النهائي (${quantity} قطعة):</span>
                                        <span class="font-bold">${calc.cuttingCost.final.toFixed(2)} ج.م</span>
                                    </div>
                                    <div class="flex justify-between border-t pt-1 mt-1">
                                        <span>إجمالي القطع:</span>
                                        <span class="font-bold">${calc.cuttingCost.total.toFixed(2)} ج.م</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>تكلفة الزنك (${colors === 1 ? 'لون واحد' : 'أربع ألوان'}${doubleSided ? ' × 2 (وجهين)' : ''}):</span>
                                        <span class="font-bold">${calc.zincCost.toFixed(2)} ج.م</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>تكلفة آلة الطباعة (${calc.machine.name} - ${colors === 1 ? 'لون واحد' : 'ألوان'}${doubleSided ? ' × 2 وجهين' : ''}):</span>
                                        <span class="font-bold">${calc.machineCost.toFixed(2)} ج.م</span>
                                    </div>
                                    ${calc.additionsCost > 0 && calc.additionsDetails && calc.additionsDetails.length > 0 ? `
                                    <div class="border-t pt-2 mt-2">
                                        <div class="font-bold mb-2">تكلفة الإضافات:</div>
                                        ${calc.additionsDetails.map(detail => {
                                            if (detail.formCost > 0) {
                                                return `
                                                    <div class="mb-2 pb-2 border-b border-gray-200">
                                                        <div class="flex justify-between text-xs">
                                                            <span>${detail.name}:</span>
                                                            <span class="font-bold">${detail.cost.toFixed(2)} ج.م</span>
                                                        </div>
                                                        <div class="flex justify-between text-xs text-gray-600 mr-4">
                                                            <span>فورمة ${detail.name}:</span>
                                                            <span class="font-bold">${detail.formCost.toFixed(2)} ج.م</span>
                                                        </div>
                                                    </div>
                                                `;
                                            } else {
                                                return `
                                                    <div class="flex justify-between text-xs mb-1">
                                                        <span>${detail.name}:</span>
                                                        <span class="font-bold">${detail.cost.toFixed(2)} ج.م</span>
                                                    </div>
                                                `;
                                            }
                                        }).join('')}
                                        <div class="flex justify-between border-t pt-1 mt-1 font-bold">
                                            <span>إجمالي الإضافات:</span>
                                            <span class="text-purple-600">${calc.additionsCost.toFixed(2)} ج.م</span>
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="bg-yellow-50 p-2 rounded border border-yellow-200">
                                <div class="text-xs font-bold">تكلفة الإنتاج الكاملة: ${calc.productionCost.toFixed(2)} ج.م</div>
                            </div>
                        ` : '';
                        
                        display.innerHTML = `
                            <div class="space-y-2 text-sm">
                                ${detailsSection}
                                ${userRole === 'sales' ? `
                                <div class="bg-blue-50 p-3 rounded border border-blue-200 text-center">
                                    <p class="text-sm text-gray-600 mb-2">السعر النهائي</p>
                                </div>
                                ` : ''}
                                ${(() => {
                                    const costPrice = parseFloat(document.getElementById('offsetCostPrice')?.value || calc.productionCost);
                                    const marginPct = OrderProducts._offsetSellMarginPercent || 50;
                                    const sellingPrice = costPrice + (costPrice * marginPct / 100);
                                    return `
                                        <div class="bg-green-50 p-3 rounded border border-green-200 mt-2">
                                            <div class="flex justify-between items-center mb-2">
                                                <span class="font-bold text-gray-700">سعر التكلفة:</span>
                                                <span class="text-lg font-bold text-gray-800">${costPrice.toFixed(2)} ج.م</span>
                                            </div>
                                            <div class="flex justify-between items-center text-sm text-gray-600 mb-1">
                                                <span>نسبة البيع (من الإعدادات):</span>
                                                <span class="font-bold">${marginPct}%</span>
                                            </div>
                                            <div class="flex justify-between items-center border-t-2 border-brandGold pt-2 mt-2">
                                                <span class="font-bold text-gray-700 text-lg">سعر البيع:</span>
                                                <span class="text-2xl font-bold text-brandGold">${sellingPrice.toFixed(2)} ج.م</span>
                                            </div>
                                        </div>
                                    `;
                                })()}
                            </div>
                        `;
                    }
                } else {
                    const display = document.getElementById('offsetCalculationDisplay');
                    if (display) {
                        let message = 'أدخل الأبعاد والكمية واختر نوع الورق لحساب السعر';
                        if (!paperTypeId) {
                            message = 'يرجى اختيار نوع الورق أولاً';
                        } else if (width <= 0 || height <= 0) {
                            message = 'أدخل الأبعاد (الطول والعرض)';
                        } else if (quantity <= 0) {
                            message = 'أدخل الكمية';
                        }
                        display.innerHTML = `<div class="text-center text-gray-500">${message}</div>`;
                    }
                }
            };
            
            // Add event listener for additions toggle
            const additionsToggleEl = document.getElementById('offsetAdditionsToggle');
            if (additionsToggleEl && !additionsToggleEl.hasAttribute('data-listener-added')) {
                additionsToggleEl.setAttribute('data-listener-added', 'true');
                additionsToggleEl.addEventListener('change', () => {
                    if (typeof OrderProducts !== 'undefined' && OrderProducts.toggleAdditionsSection) {
                        OrderProducts.toggleAdditionsSection();
                    }
                });
            }
            
            // Add event listeners for additions
            const additionCheckboxes = [
                'offsetSpecialColor', 'offsetMatteCellophane', 'offsetGlossyCellophane',
                'offsetDieCutting', 'offsetEmbossing', 'offsetDebossing',
                'offsetCreasing', 'offsetCornering', 'offsetPerforation', 'offsetSpotUV',
                'offsetFolderPocket', 'offsetBontaGluing', 'offsetSandwichBag'
            ];
            additionCheckboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.addEventListener('change', calculateOffset);
                }
            });
            
            // Add event listeners for addition options
            const additionInputs = [
                'offsetSpecialColorType', 'offsetSpecialColorSides',
                'offsetMatteCellophaneSides', 'offsetGlossyCellophaneSides',
                'offsetEmbossingSides', 'offsetEmbossingWithForm',
                'offsetDieCuttingWithForm', 'offsetDebossingWithForm',
                'offsetCreasingCount', 'offsetPerforationCount', 'offsetSpotUVSides',
                'offsetBontaCount'
            ];
            additionInputs.forEach(id => {
                const input = document.getElementById(id);
                if (input) {
                    input.addEventListener('change', calculateOffset);
                    input.addEventListener('input', calculateOffset);
                }
            });
            
            if (widthInput) widthInput.addEventListener('input', calculateOffset);
            if (heightInput) heightInput.addEventListener('input', calculateOffset);
            if (quantityInput) quantityInput.addEventListener('input', calculateOffset);
            if (colorsInput) colorsInput.addEventListener('change', calculateOffset);
            if (doubleSidedInput) doubleSidedInput.addEventListener('change', calculateOffset);
            if (paperTypeSelectInput) paperTypeSelectInput.addEventListener('change', calculateOffset);
            
            // Add event listener for cost price input to update display
            const costPriceInput = document.getElementById('offsetCostPrice');
            if (costPriceInput) {
                costPriceInput.addEventListener('input', calculateOffset);
            }
            
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const width = parseFloat(widthInput.value);
                    const height = parseFloat(heightInput.value);
                    const quantity = parseFloat(quantityInput.value);
                    const colors = parseInt(colorsInput.value);
                    const doubleSided = doubleSidedInput.checked;
                    const paperTypeId = paperTypeSelectInput.value;
                
                if (width > 0 && height > 0 && quantity > 0 && paperTypeId) {
                    // Get selected paper type
                    const paperTypes = PricingAdmin ? PricingAdmin.loadPaperTypes() : [];
                    const selectedPaper = paperTypes.find(p => p.id.toString() === paperTypeId);
                    
                    if (!selectedPaper) {
                        Swal.fire('خطأ', 'يرجى اختيار نوع الورق', 'error');
                        return;
                    }
                    
                    // Get additions
                    const additions = this.getOffsetAdditions();
                    
                    const calc = OffsetPricing.calculate(width, height, quantity, colors, doubleSided, selectedPaper, additions);
                    
                    // Get cost price from input
                    const costPrice = parseFloat(document.getElementById('offsetCostPrice').value) || calc.productionCost;
                    
                    if (costPrice <= 0) {
                        Swal.fire('خطأ', 'يرجى إدخال سعر التكلفة', 'error');
                        return;
                    }
                    
                    // Calculate selling price using stored margin %
                    const marginPct = this._offsetSellMarginPercent || 50;
                    const sellingPrice = costPrice + (costPrice * marginPct / 100);
                    
                    const product = {
                        id: Date.now(),
                        type: 'Offset',
                        width: width,
                        height: height,
                        quantity: quantity,
                        colors: colors,
                        doubleSided: doubleSided,
                        paperTypeId: paperTypeId,
                        paperType: selectedPaper,
                        calculation: calc,
                        productionCost: calc.productionCost,
                        costPrice: costPrice, // Cost price (manual input)
                        sellMarginPercent: marginPct, // Sell margin % from settings
                        sellingPrice: sellingPrice, // Selling price (calculated: cost + cost × margin%)
                        price: sellingPrice, // Use selling price as the main price
                        additions: additions // Store additions
                    };
                    
                    this.addProduct(product);
                    closeModal('offsetConfigModal');
                } else {
                    Swal.fire('خطأ', 'يرجى إدخال جميع البيانات بشكل صحيح', 'error');
                }
                });
            }
        }
        
        openModal('offsetConfigModal');
    },

    // Render products list (for order form) - updates #orderProductsList
    renderProductsList() {
        const container = document.getElementById('orderProductsList');
        if (!container) return;

        const productNames = {
            'Banner': 'بانر',
            'Flex': 'فليكس',
            'Vinyl': 'فينيل',
            'Offset': 'أوفست',
            'Outdoor': 'أوت دور',
            'Indoor': 'إندور',
            'Stands': 'استندات',
            'Stamps': 'الأختام والختم',
            'BusinessCard': 'كروت شخصية',
            'Envelopes': 'المظاريف',
            'UVPrinting': 'طباعة UV',
            'Tableaux': 'تابلوةات',
            'DTF': 'طباعة DTF',
            'Flag': 'أعلام',
            'TShirt': 'تيشرتات',
            'FabricBag': 'شنط قماش',
            'IDCard': 'الكارنيهات',
            'ZikrMedal': 'مدليات الأذكار',
            'SublimationGift': 'هدايا سبلميشن',
            'promotional_gifts': 'هدايا ترويجية',
            'ruler_frames': 'برواز مسطرة',
            'shipping_flyers_clear_bags': 'فلاير شحن وأكياس شفافة',
            'plastic_bags': 'شنط بلاستيك',
            'inkjet_paper_printing': 'طباعة إنك جيت ورق',
            'safety_printing': 'السيفتي بالطباعة',
            'digital_printing': 'قسم الدجيتال',
            'paper_bags': 'باند الشنط الورقية',
            'brochures': 'البرشورات',
            'catalogs': 'الكتالوجات',
            'acrylic_badge': 'اكريلك و باغ',
            'card_rosary': 'كارت بسبحة',
            'annual_ads': 'دعاية سنوية',
            'cup_quran_bags': 'كوباية–مصاحف–شنط سبوع',
            'boxes': 'بوكسات',
            'cladding_letters': 'واجهات كلادينج و حروف',
            'kraft_bags': 'شنط كرافت',
            'Offer': 'عرض',
            'custom': 'صنف مخصص',
            'catalog': 'كتالوج'
        };

        if (this.currentProducts.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-8 text-sm">
                    <i class="fas fa-box-open text-2xl mb-2 block"></i>
                    لا توجد منتجات. اضغط على "إضافة منتج" للبدء
                </div>
            `;
            const totalSection = document.getElementById('orderTotalPrice');
            if (totalSection) totalSection.classList.add('hidden-section');
            const discountSection = document.getElementById('orderDiscountSection');
            if (discountSection) discountSection.classList.add('hidden-section');
            return;
        }

        container.innerHTML = this.currentProducts.map((product, index) => {
          try {
            let details = '';
            if (product.type === 'catalog') {
                const parts = [];
                if (product.catalogGroupName) {
                    parts.push('القسم: ' + product.catalogGroupName);
                    if (product.catalogSubcategoryName) parts.push('فرعي: ' + product.catalogSubcategoryName);
                    parts.push('المنتج: ' + (product.productName || ''));
                } else {
                    parts.push(product.productName || product.catalogName || 'منتج كتالوج');
                    if (product.catalogSpecsText) parts.push(product.catalogSpecsText);
                    else if (product.catalogSpecs) parts.push(Object.values(product.catalogSpecs).map(s => s.display || s.value).join('، '));
                }
                parts.push('الكمية: ' + (product.quantity || 1));
                if (product.pendingPricing) parts.push('السعر: حسب المقاس');
                else if (product.unitPrice) parts.push((product.unitLabel || 'سعر الوحدة') + ': ' + Number(product.unitPrice).toFixed(2) + ' ج.م');
                if (product.stampDesignText) parts.push('نص الختم: ' + product.stampDesignText);
                details = parts.join(' | ');
            } else if (product.type === 'custom' || product.isCustom) {
                const parts = [product.productName || 'صنف مخصص'];
                if (product.size) parts.push(product.size);
                if (product.quantity > 1) parts.push('الكمية: ' + product.quantity);
                if (product.pricingMode === 'meter') parts.push('بالمتر المربع');
                else if (product.pricingMode === 'cm') parts.push('بالسنتيمتر');
                else if (product.pricingMode === 'unit') parts.push('سعر القطعة: ' + (product.unitPrice || 0).toFixed(2) + ' ج.م');
                details = parts.join(' | ');
            } else if (product.type === 'Offset') {
                details = `${product.width} × ${product.height} سم | الكمية: ${product.quantity} | ${product.colors === 1 ? 'لون واحد' : 'أربع ألوان'}${product.doubleSided ? ' | وجهين' : ''}`;
            } else if (product.type === 'Offer' || product.isOffer) {
                details = product.offerName || 'عرض';
            } else if (product.type === 'Stamps') {
                details = product.band === 'cliche_only' ? `كليشيه ${product.widthCm || 0} × ${product.heightCm || 0} سم | ${product.quantity || 1}` : `${product.productName || ''} | الكمية: ${product.quantity || 1}`;
            } else if (product.type === 'Outdoor') {
                details = product.width != null && product.height != null ? `${product.width} × ${product.height} سم` : `${product.length} × ${product.width} م`;
            } else if (product.type === 'Indoor') {
                details = product.lengthMeters != null ? `${product.productName || ''} | ${product.lengthMeters} م` : `${product.productName || ''} | ${product.width || 0} × ${product.height || 0} سم`;
            } else if (product.type === 'Stands') {
                details = product.productName || product.subCategoryName || 'استند';
            } else if (product.type === 'BusinessCard') {
                details = `${product.paperTypeName || product.paperTypeId || 'ورق'} | ${product.quantity || 0} كارت | ${product.sidesLabel || (product.sides === 'double' ? 'وجهين' : 'وجه واحد')} | ${product.widthCm || 9} × ${product.heightCm || 5} سم`;
            } else if (product.type === 'Envelopes') {
                const pt = product.printingType === 'inkjet' ? 'إنك جيت' : 'أوفست';
                const col = product.colorOption === 'full' ? 'ملون' : 'لون واحد';
                details = `${product.productName || product.productId || ''} | ${pt} | ${col} | الكمية: ${product.quantity || 1}`;
            } else if (product.type === 'UVPrinting') {
                details = `مقاس: ${product.widthCm || 0}×${product.heightCm || 0} سم | الكمية: ${product.quantity || 1} | سعر القطعة: ${(product.unitPrice || 0).toFixed(2)} ج.م`;
            } else if (product.type === 'Tableaux') {
                details = `${product.productName || product.productId || ''} | الكمية: ${product.quantity || 1}`;
            } else if (product.type === 'DTF') {
                details = `الطول: ${product.lengthMeters || 0} م | الكمية: ${product.quantity || 1} (عرض 60 سم)`;
            } else if (product.type === 'Flag') {
                details = product.productId === 'trigal_meter'
                    ? `ستان ترجال | ${product.lengthM || 0} × ${product.widthM || 0} م | الكمية: ${product.quantity || 1}`
                    : `${product.productName || product.productId || ''} | الكمية: ${product.quantity || 1}`;
            } else if (product.type === 'TShirt') {
                const parts = [product.productName || product.productId || '', `الكمية: ${product.quantity || 1}`];
                if (product.printingName) parts.push(product.printingName);
                if (product.pressingName) parts.push(product.pressingName);
                details = parts.filter(Boolean).join(' | ');
            } else if (product.type === 'FabricBag') {
                const parts = [product.productName || product.productId || '', `الكمية: ${product.quantity || 1}`];
                if (product.printingName) parts.push(product.printingName);
                details = parts.filter(Boolean).join(' | ');
            } else if (product.type === 'IDCard') {
                const parts = [product.productName || product.productId || '', `الكمية: ${product.quantity || 1}`];
                if (product.addons && product.addons.length > 0) {
                    parts.push(product.addons.map(a => a.addonName).join('، '));
                }
                details = parts.filter(Boolean).join(' | ');
            } else if (product.type === 'ZikrMedal') {
                details = product.productName || `${product.baseQty || 0} ميدالية + ${product.giftQty || 0} هدية`;
            } else if (product.type === 'SublimationGift') {
                details = `${product.productName || product.productId || ''} | الكمية: ${product.quantity || 1}`;
            } else if (product.type === 'promotional_gifts') {
                details = `${product.productName || product.productId || ''} | الكمية: ${product.quantity || 1}`;
            } else if (product.type === 'ruler_frames') {
                details = `${product.productName || product.productId || ''} | الكمية: ${product.quantity || 1}`;
            } else if (product.type === 'shipping_flyers_clear_bags') {
                details = `${product.productName || product.productId || ''} | الكمية: ${product.quantity || 1}${product.printingAddon ? ' | + طباعة' : ''}`;
            } else if (product.type === 'plastic_bags') {
                details = `${product.productName || 'شنط بلاستيك'} | ${product.quantityKg || 0} كجم${product.addons && product.addons.length ? ' | ' + product.addons.map(a => a.nameAr || a.id).join('، ') : ''}`;
            } else if (product.type === 'inkjet_paper_printing') {
                details = `${product.productName || product.productId || ''} | الكمية: ${product.quantity || 1}`;
            } else if (product.type === 'safety_printing') {
                details = `${product.productName || product.productId || ''} | الكمية: ${product.quantity || 1}${product.printingOption ? ' | ' + (product.printingOption === 'front_only' ? 'طباعة وجه واحد' : 'طباعة وجهين') : ''}`;
            } else if (product.type === 'paper_bags') {
                details = `باند الشنط الورقية | ${product.paperTypeNameAr || product.paperTypeId || ''} | ${product.quantity1000 || 0} ألف شنطة | ${product.sheetsPerBag || 1} ورقة | ${product.handleTypeNameAr || product.handleTypeId || ''}`;
            } else if (product.type === 'brochures') {
                details = `برشور | ${product.brochureQuantity || 0} برشور | ${product.sheets?.length || 0} ورقة${product.sheetsSummary ? ' | ' + product.sheetsSummary : ''}`;
            } else if (product.type === 'catalogs') {
                details = `كتالوج | ${product.catalogQuantity || 0} كتالوج | ${product.sheets?.length || 0} ورقة${product.sheetsSummary ? ' | ' + product.sheetsSummary : ''}`;
            } else if (product.type === 'digital_printing') {
                if (product.band === 'stan_roll') {
                    details = `بكرة ستان | ${product.stanRollSizeNameAr || product.stanRollSizeId || ''} | الكمية: ${product.quantity || 0}`;
                } else {
                    details = `${product.paperTypeNameAr || product.productName || 'قسم الدجيتال'} | ${product.widthCm || 0}×${product.heightCm || 0} سم | ${product.quantity || 0} قطعة | ${product.printingSideLabel || (product.printingSide === 'double' ? 'وجهين' : 'وجه واحد')} | ${product.sheetsNeeded || 0} ورقة`;
                }
            } else if (product.type === 'acrylic_badge') {
                const calc = product.calculation || {};
                let parts = [`${product.productName || (product.subBand === 'badge' ? 'باغ' : 'اكريلك')}`, `${product.width || 0}×${product.height || 0} سم`, `الكمية: ${product.quantity || 1}`];
                if (calc.additionsBreakdown && calc.additionsBreakdown.length > 0) parts.push(calc.additionsBreakdown.map(a => a.nameAr).join('، '));
                if (calc.screwsBreakdown && calc.screwsBreakdown.length > 0) parts.push(calc.screwsBreakdown.map(s => `${s.nameAr} ×${s.count}`).join('، '));
                details = parts.join(' | ');
            } else if (product.type === 'card_rosary') {
                const calc = product.calculation || {};
                details = `${product.subItemNameAr || product.subItemId || ''} | الكمية: ${product.quantity || 0} | شريحة: ${calc.tierQty || '—'}`;
            } else if (product.type === 'annual_ads') {
                const calc = product.calculation || {};
                details = `${product.subItemNameAr || product.subItemId || ''} | الكمية: ${product.quantity || 0} | سعر القطعة: ${(calc.unitPrice || 0).toFixed(2)} ج.م | شريحة: ${calc.tierQty || '—'}`;
            } else if (product.type === 'cup_quran_bags') {
                const calc = product.calculation || {};
                const label = calc.subBandNameAr || '';
                const variant = calc.typeNameAr ? ` (${calc.typeNameAr})` : '';
                if (calc.pricingMode === 'total') {
                    details = `${label}${variant} | الكمية: ${product.quantity || 0} | شريحة: ${calc.tierQty || '—'}`;
                } else {
                    details = `${label}${variant} | الكمية: ${product.quantity || 0} | سعر القطعة: ${(calc.unitPrice || 0).toFixed(2)} ج.م | شريحة: ${calc.tierQty || '—'}`;
                }
            } else if (product.type === 'boxes') {
                const calc = product.boxCalc || {};
                const printCalc = product.printCalc || null;
                let parts = [`${calc.typeNameAr || ''} ${calc.sizeNameAr || ''}`, `الكمية: ${product.quantity || 0}`, `سعر القطعة: ${(calc.unitPrice || 0).toFixed(2)} ج.م`];
                if (printCalc) parts.push(`طباعة: ${(printCalc.unitPrice || 0).toFixed(2)} ج.م/قطعة`);
                details = parts.join(' | ');
            } else if (product.type === 'cladding_letters') {
                const calc = product.calculation || {};
                let parts = [product.productName || ''];
                parts.push(`${product.width || 0}×${product.height || 0} سم`);
                parts.push(`الكمية: ${product.quantity || 1}`);
                if (calc.items && calc.items.length > 1) {
                    calc.items.slice(1).forEach(it => parts.push(it.name));
                }
                details = parts.join(' | ');
            } else if (product.type === 'kraft_bags') {
                const bagCalc = product.bagCalc || {};
                const printCalc = product.printCalc || null;
                let parts = [`شنطة كرافت ${bagCalc.sizeNameAr || product.subItemNameAr || ''}`, `الكمية: ${product.quantity || 0}`, `سعر القطعة: ${(bagCalc.unitPrice || 0).toFixed(2)} ج.م`];
                if (printCalc) parts.push(`طباعة: ${(printCalc.unitPrice || 0).toFixed(2)} ج.م/قطعة`);
                details = parts.join(' | ');
            } else {
                // Fallback for unknown types
                const parts = [];
                if (product.productName) parts.push(product.productName);
                if (product.length && product.width) parts.push(`${product.length} × ${product.width} م`);
                if (product.quantity) parts.push('الكمية: ' + product.quantity);
                if (product.lamination) parts.push('لامينيشن');
                details = parts.length > 0 ? parts.join(' | ') : (product.type || 'منتج');
            }

            const sellingPrice = (product.sellingPrice != null ? product.sellingPrice : product.price) || 0;
            const costPrice = product.productionCost != null ? product.productionCost : (product.calculation && product.calculation.productionCost != null ? product.calculation.productionCost : 0);
            const isAdmin = typeof App !== 'undefined' && AppState.currentUser && AppState.currentUser.role === 'admin';
            const displayName = (product.type === 'custom' || product.isCustom)
                ? (product.productName || 'صنف مخصص')
                : (product.type === 'catalog' ? (product.productName || product.catalogName) : (productNames[product.type] || product.productName || product.type));
            const designControls = this.renderProductDesignControls(product);
            const priceBlock = isAdmin
                ? `<div class="text-sm space-y-1 mt-2"><div class="flex justify-between"><span class="text-gray-600">سعر التكلفة:</span><span class="font-bold text-blue-600">${Number(costPrice).toFixed(2)} ج.م</span></div><div class="flex justify-between"><span class="text-gray-600">سعر البيع:</span><span class="font-bold text-brandGold">${Number(sellingPrice).toFixed(2)} ج.م</span></div></div>`
                : `<div class="font-bold text-brandGold text-lg mt-1">${Number(sellingPrice).toFixed(2)} ج.م</div>`;
            return `
                <div class="bg-white border border-gray-200 rounded-xl p-4">
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="font-bold text-gray-800">${displayName}</span>
                                <span class="text-xs bg-gray-100 px-2 py-1 rounded">#${index + 1}</span>
                            </div>
                            <div class="text-sm text-gray-600 mb-2">${details}</div>
                            ${priceBlock}
                            ${designControls}
                        </div>
                        <button type="button" onclick="OrderProducts.removeProduct(${product.id})" class="text-red-500 hover:text-red-700 p-2">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
          } catch(err) {
            console.error('Error rendering product:', product, err);
            return `<div class="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">خطأ في عرض المنتج #${index+1}</div>`;
          }
        }).join('');

        const totalSection = document.getElementById('orderTotalPrice');
        if (totalSection) totalSection.classList.remove('hidden-section');
        const discountSection = document.getElementById('orderDiscountSection');
        if (discountSection) discountSection.classList.remove('hidden-section');
        this.updateOrderTotal();
    },

    // Remove product from order list
    removeProduct(productId) {
        this.currentProducts = this.currentProducts.filter(p => p.id != productId);
        this.renderProductsList();
    },

    // Get current products array
    getProducts() {
        return this.currentProducts;
    },

    _getModalShippingCost() {
        const orderIsShipping = document.getElementById('orderIsShipping');
        if (orderIsShipping && orderIsShipping.value === '1') {
            return parseFloat(document.getElementById('orderShippingCost')?.value) || 0;
        }
        const shippingCheck = document.getElementById('shippingCheck');
        if (shippingCheck && shippingCheck.checked) {
            return parseFloat(document.getElementById('shippingCostInput')?.value) || 0;
        }
        return 0;
    },

    _getDiscountInfo(productsTotal) {
        let discountPct = 0;
        let discountValue = 0;
        const discountCheck = document.getElementById('discountCheck');
        if (discountCheck && discountCheck.checked) {
            discountPct = parseFloat(document.getElementById('discountPercentage')?.value) || 0;
            if (discountPct > 0) {
                discountValue = (productsTotal * discountPct) / 100;
                if (discountValue > productsTotal) discountValue = productsTotal;
            }
        }
        return { discountPct, discountValue };
    },

    // Get order total (products + shipping + design fee - discount)
    getOrderTotal() {
        const productsTotal = this.currentProducts.reduce((sum, p) => sum + (p.sellingPrice != null ? p.sellingPrice : p.price || 0), 0);
        const shipCost = this._getModalShippingCost();
        const designFeeCheck = document.getElementById('designFeeCheck');
        const designFee = (designFeeCheck && designFeeCheck.checked) ? (parseFloat(document.getElementById('designFeeAmount')?.value) || 0) : 0;
        
        const { discountValue } = this._getDiscountInfo(productsTotal);
        const productsAfterDiscount = Math.max(0, productsTotal - discountValue);
        return Math.max(0, productsAfterDiscount + shipCost + designFee);
    },

    // Update order total display and pricing summary
    async updateOrderTotal() {
        const total = this.getOrderTotal();
        const totalEl = document.getElementById('orderTotalPriceValue');
        if (totalEl) totalEl.textContent = total.toFixed(2);

        const summarySection = document.getElementById('orderPricingSummary');
        const contentEl = document.getElementById('orderPricingContent');
        if (summarySection && contentEl) {
            const productsTotal = this.currentProducts.reduce((sum, p) => sum + (p.sellingPrice != null ? p.sellingPrice : p.price || 0), 0);
            const { discountPct, discountValue } = this._getDiscountInfo(productsTotal);
            let html = `<div class="flex justify-between"><span>إجمالي المنتجات:</span><span class="font-bold">${productsTotal.toFixed(2)} ج.م</span></div>`;
            
            const designFeeCheck = document.getElementById('designFeeCheck');
            const designFee = (designFeeCheck && designFeeCheck.checked) ? (parseFloat(document.getElementById('designFeeAmount')?.value) || 0) : 0;
            if (designFee > 0) html += `<div class="flex justify-between"><span>تكلفة التصميم:</span><span class="font-bold">${designFee.toFixed(2)} ج.م</span></div>`;
            
            const shipCost = this._getModalShippingCost();
            if (shipCost > 0) {
                const govSelect = document.getElementById('governorateSelect');
                const govName = govSelect ? govSelect.options[govSelect.selectedIndex]?.text : '';
                const shipLabel = govName ? `الشحن (${govName})` : 'تكلفة الشحن';
                html += `<div class="flex justify-between"><span>${shipLabel}:</span><span class="font-bold">${shipCost.toFixed(2)} ج.م</span></div>`;
            }
            
            if (discountValue > 0) {
                html += `<div class="flex justify-between text-red-600"><span>الخصم (${discountPct}%):</span><span class="font-bold">- ${discountValue.toFixed(2)} ج.م</span></div>`;
            }
            
            html += `<div class="flex justify-between pt-2 border-t border-gray-300"><span class="font-bold">الإجمالي:</span><span class="font-bold text-brandGold">${total.toFixed(2)} ج.م</span></div>`;
            contentEl.innerHTML = html;
            summarySection.classList.remove('hidden-section');
        }

        const discountPreview = document.getElementById('discountAmountPreview');
        if (discountPreview) {
            const productsTotal = this.currentProducts.reduce((sum, p) => sum + (p.sellingPrice != null ? p.sellingPrice : p.price || 0), 0);
            const { discountPct, discountValue } = this._getDiscountInfo(productsTotal);
            discountPreview.textContent = discountValue > 0
                ? `يُخصم ${discountValue.toFixed(2)} ج.م من الإجمالي (${discountPct}%)`
                : '';
        }

        const depositInput = document.querySelector('input[name="deposit"]');
        const depositDisplay = document.getElementById('depositDisplay');
        const remainingDisplay = document.getElementById('remainingBalanceDisplay');
        const depositRemainingSection = document.getElementById('depositRemainingSection');
        if (depositDisplay && remainingDisplay && depositRemainingSection) {
            const deposit = parseFloat(depositInput?.value) || 0;
            depositDisplay.textContent = deposit.toFixed(2) + ' ج.م';
            remainingDisplay.textContent = Math.max(0, total - deposit).toFixed(2) + ' ج.م';
            depositRemainingSection.classList.remove('hidden-section');
        }
    },

    // Add product to current order (or to edit-order list when editing, or to quotation)
    addProduct(product) {
        try {
            if (typeof Quotation !== 'undefined' && Quotation.isQuotationMode) {
                Quotation.isQuotationMode = false;
                Quotation.addProductToQuotation(product);
            } else if (typeof Orders !== 'undefined' && Orders.isEditingOrder) {
                Orders.editingProducts = Orders.editingProducts || [];
                Orders.editingProducts.push(product);
                if (typeof Orders.renderEditProducts === 'function') Orders.renderEditProducts();
            } else {
                this.currentProducts.push(product);
                this.renderProductsList();
            }
            console.log('✅ Product added:', product.type, '| Total:', this.currentProducts.length);
        } catch(err) {
            console.error('❌ addProduct error:', err, product);
            // Ensure product is at least added even if render fails
            if (!this.currentProducts.includes(product)) {
                this.currentProducts.push(product);
            }
            try { this.renderProductsList(); } catch(e) { console.error('renderProductsList error:', e); }
        }
    },

    // Get offset additions from form
    getOffsetAdditions() {
        const additions = {};
        
        // Special Color
        const specialColor = document.getElementById('offsetSpecialColor');
        if (specialColor && specialColor.checked) {
            additions.specialColor = {
                type: document.getElementById('offsetSpecialColorType')?.value || 'gold',
                sides: parseInt(document.getElementById('offsetSpecialColorSides')?.value || '1')
            };
        }
        
        // Matte Cellophane
        const matteCellophane = document.getElementById('offsetMatteCellophane');
        if (matteCellophane && matteCellophane.checked) {
            additions.matteCellophane = {
                sides: parseInt(document.getElementById('offsetMatteCellophaneSides')?.value || '1')
            };
        }
        
        // Glossy Cellophane
        const glossyCellophane = document.getElementById('offsetGlossyCellophane');
        if (glossyCellophane && glossyCellophane.checked) {
            additions.glossyCellophane = {
                sides: parseInt(document.getElementById('offsetGlossyCellophaneSides')?.value || '1')
            };
        }
        
        // Die Cutting
        const dieCutting = document.getElementById('offsetDieCutting');
        if (dieCutting && dieCutting.checked) {
            additions.dieCutting = {
                withForm: document.getElementById('offsetDieCuttingWithForm')?.checked || false
            };
        }
        
        // Embossing
        const embossing = document.getElementById('offsetEmbossing');
        if (embossing && embossing.checked) {
            additions.embossing = {
                sides: parseInt(document.getElementById('offsetEmbossingSides')?.value || '1'),
                withForm: document.getElementById('offsetEmbossingWithForm')?.checked || false
            };
        }
        
        // Debossing
        const debossing = document.getElementById('offsetDebossing');
        if (debossing && debossing.checked) {
            additions.debossing = {
                sides: parseInt(document.getElementById('offsetDebossingSides')?.value || '1'),
                withForm: document.getElementById('offsetDebossingWithForm')?.checked || false
            };
        }
        
        // Creasing
        const creasing = document.getElementById('offsetCreasing');
        if (creasing && creasing.checked) {
            additions.creasing = {
                count: parseInt(document.getElementById('offsetCreasingCount')?.value || '1')
            };
        }
        
        // Cornering
        const cornering = document.getElementById('offsetCornering');
        if (cornering && cornering.checked) {
            additions.cornering = true;
        }
        
        // Perforation
        const perforation = document.getElementById('offsetPerforation');
        if (perforation && perforation.checked) {
            additions.perforation = {
                count: parseInt(document.getElementById('offsetPerforationCount')?.value || '1')
            };
        }
        
        // Spot UV
        const spotUV = document.getElementById('offsetSpotUV');
        if (spotUV && spotUV.checked) {
            additions.spotUV = {
                sides: parseInt(document.getElementById('offsetSpotUVSides')?.value || '1')
            };
        }
        
        // Folder Pocket
        const folderPocket = document.getElementById('offsetFolderPocket');
        if (folderPocket && folderPocket.checked) {
            additions.folderPocket = true;
        }
        
        // Bonta Gluing
        const bontaGluing = document.getElementById('offsetBontaGluing');
        if (bontaGluing && bontaGluing.checked) {
            additions.bontaGluing = {
                count: parseInt(document.getElementById('offsetBontaCount')?.value || '1')
            };
        }
        
        // Sandwich Bag
        const sandwichBag = document.getElementById('offsetSandwichBag');
        if (sandwichBag && sandwichBag.checked) {
            additions.sandwichBag = true;
        }
        
        return additions;
    },

    // Toggle additions section visibility
    toggleAdditionsSection() {
        const content = document.getElementById('offsetAdditionsContent');
        const toggle = document.getElementById('offsetAdditionsToggle');
        if (content && toggle) {
            if (toggle.checked) {
                content.classList.remove('hidden-section');
            } else {
                content.classList.add('hidden-section');
            }
        }
    },

    // Toggle offset addition options visibility
    toggleOffsetAddition(additionType) {
        const checkbox = document.getElementById(`offset${additionType.charAt(0).toUpperCase() + additionType.slice(1)}`);
        const options = document.getElementById(`offset${additionType.charAt(0).toUpperCase() + additionType.slice(1)}Options`);
        if (checkbox && options) {
            if (checkbox.checked) {
                options.classList.remove('hidden-section');
            } else {
                options.classList.add('hidden-section');
            }
        }
    },

    // Update special color machine info
    updateSpecialColorMachineInfo() {
        const info = document.getElementById('offsetSpecialColorMachineInfo');
        if (info) {
            // Machine selection is automatic based on size, so just show info
            info.style.display = 'block';
        }
    },

    // Toggle form info visibility
    toggleFormInfo(additionType) {
        const info = document.getElementById(`offset${additionType.charAt(0).toUpperCase() + additionType.slice(1)}FormInfo`);
        if (info) {
            if (info.classList.contains('hidden')) {
                info.classList.remove('hidden');
            } else {
                info.classList.add('hidden');
            }
        }
    },

    // Open Outdoor configuration
    async openOutdoorConfig() {
        if (typeof OutdoorPricing === 'undefined') {
            Swal.fire('خطأ', 'وحدة OutdoorPricing غير متاحة', 'error');
            return;
        }

        const content = document.getElementById('outdoorConfigContent');
        if (!content) {
            Swal.fire('خطأ', 'عنصر واجهة المستخدم غير موجود', 'error');
            return;
        }

        const products = OutdoorPricing.getAllProducts();
        const groups = Object.values(OutdoorPricing.GROUPS);
        
        // Group products by groupId (new structure)
        const productsByGroup = {};
        groups.forEach(group => {
            productsByGroup[group.id] = group.products
                .map(id => OutdoorPricing.getProduct(id))
                .filter(p => p !== null);
        });

        content.innerHTML = `
            <form id="outdoorConfigForm" class="space-y-4">
                <!-- Product Selection -->
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">اختر المنتج <span class="text-red-500">*</span></label>
                    <select id="outdoorProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المنتج</option>
                        ${groups.map(group => {
                            const groupProducts = productsByGroup[group.id] || [];
                            if (groupProducts.length === 0) return '';
                            return `
                                <optgroup label="${group.nameAr}">
                                    ${groupProducts.map(p => `<option value="${p.id}">${p.nameAr} (${p.name})</option>`).join('')}
                                </optgroup>
                            `;
                        }).filter(html => html !== '').join('')}
                    </select>
                </div>

                <!-- Dimensions -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">العرض (سم) <span class="text-red-500">*</span></label>
                        <input type="number" id="outdoorWidth" step="0.01" min="0" max="310" placeholder="0.00" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <p class="text-xs text-gray-500 mt-1">الحد الأقصى: 310 سم</p>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">الطول (سم) <span class="text-red-500">*</span></label>
                        <input type="number" id="outdoorHeight" step="0.01" min="0" max="310" placeholder="0.00" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <p class="text-xs text-gray-500 mt-1">الحد الأقصى: 310 سم</p>
                    </div>
                </div>

                <!-- Quantity -->
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="outdoorQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>

                <!-- Addons Section -->
                <div id="outdoorAddonsSection" class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 hidden-section">
                    <label class="flex items-center gap-3 cursor-pointer mb-3" onclick="OrderProducts.toggleOutdoorAddonsSection()">
                        <input type="checkbox" id="outdoorAddonsToggle" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                        <span class="font-bold text-gray-800 text-lg">الإضافات</span>
                    </label>
                    <div id="outdoorAddonsContent" class="hidden-section space-y-3">
                        <!-- Addons will be populated dynamically -->
                    </div>
                </div>

                <!-- Calculation Display -->
                <div id="outdoorCalculationDisplay" class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div class="text-center text-gray-500">أدخل الأبعاد والكمية واختر المنتج لحساب السعر</div>
                </div>

                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('outdoorConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;

        // Add event listeners
        const productSelect = document.getElementById('outdoorProduct');
        const widthInput = document.getElementById('outdoorWidth');
        const heightInput = document.getElementById('outdoorHeight');
        const quantityInput = document.getElementById('outdoorQuantity');
        const form = document.getElementById('outdoorConfigForm');

        // Update addons when product changes (Group-Based)
        const updateAddons = async () => {
            const productId = productSelect.value;
            const addonsSection = document.getElementById('outdoorAddonsSection');
            const addonsContent = document.getElementById('outdoorAddonsContent');
            
            if (!productId) {
                addonsSection.classList.add('hidden-section');
                return;
            }

            const product = OutdoorPricing.getProduct(productId);
            if (!product) {
                addonsSection.classList.add('hidden-section');
                return;
            }

            const applicableAddons = OutdoorPricing.getProductAddons(productId);
            
            if (applicableAddons.length === 0) {
                addonsSection.classList.add('hidden-section');
                return;
            }

            addonsSection.classList.remove('hidden-section');

            // Load group addon prices
            const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
            if (!db) {
                addonsContent.innerHTML = '<p class="text-sm text-red-500">خطأ: قاعدة البيانات غير متاحة</p>';
                return;
            }

            try {
                let groupAddonsPrices = {};
                const groupId = product.groupId;

                // Load group addons (for regular groups)
                if (groupId !== 'special') {
                    const groupDocId = `Outdoor_Group_${groupId}`;
                    const groupDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(groupDocId).get();
                    if (groupDoc.exists) {
                        groupAddonsPrices = groupDoc.data().addonsPrices || {};
                    }
                } else {
                    // Load special product addons
                    const specialDocId = `Outdoor_Group_special_${productId}`;
                    const specialDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(specialDocId).get();
                    if (specialDoc.exists) {
                        groupAddonsPrices = specialDoc.data().addonsPrices || {};
                    }
                }

                addonsContent.innerHTML = applicableAddons.map(addon => {
                    const addonPrice = groupAddonsPrices[addon.id] || 0;
                    const maxWidthText = addon.maxWidth ? ` (حد أقصى ${addon.maxWidth} سم)` : '';
                    const unitText = addon.unit === 'perSquareMeter' ? 'لكل متر مربع' : 
                                    addon.unit === 'perMeter' ? 'لكل متر' : 'ثابت';
                    
                    return `
                        <div class="bg-white p-3 rounded-lg border border-gray-200">
                            <label class="flex items-center gap-3 cursor-pointer mb-2">
                                <input type="checkbox" 
                                       id="outdoor_addon_${addon.id}" 
                                       class="w-5 h-5 text-brandGold rounded focus:ring-brandGold"
                                       onchange="OrderProducts.updateOutdoorCalculation()"
                                       data-addon-price="${addonPrice}">
                                <span class="font-bold text-gray-700">${addon.nameAr}</span>
                            </label>
                            <div class="text-xs text-gray-600 mr-8">${maxWidthText} - ${unitText}</div>
                            ${addonPrice > 0 ? `<div class="text-xs text-green-600 mr-8 mt-1">السعر: ${addonPrice.toFixed(2)} ج.م</div>` : ''}
                        </div>
                    `;
                }).join('');
            } catch (error) {
                console.error('Error loading addons prices:', error);
                addonsContent.innerHTML = '<p class="text-sm text-red-500">خطأ في تحميل أسعار الإضافات</p>';
            }
        };

        // Calculate price (Group-Based)
        const calculateOutdoor = async () => {
            const productId = productSelect.value;
            const width = parseFloat(widthInput?.value) || 0;
            const height = parseFloat(heightInput?.value) || 0;
            const quantity = parseFloat(quantityInput?.value) || 1;

            const display = document.getElementById('outdoorCalculationDisplay');
            if (!display) return;

            // Validate dimensions
            const validation = OutdoorPricing.validateDimensions(width, height);
            if (!validation.valid) {
                display.innerHTML = `<div class="text-center text-red-500">${validation.error}</div>`;
                return;
            }

            if (!productId) {
                display.innerHTML = '<div class="text-center text-gray-500">يرجى اختيار المنتج</div>';
                return;
            }

            // Load selling price
            const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
            if (!db) {
                display.innerHTML = '<div class="text-center text-red-500">خطأ: قاعدة البيانات غير متاحة</div>';
                return;
            }

            try {
                // Load product price
                const productDocId = `Outdoor_${productId}`;
                const productDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(productDocId).get();
                
                if (!productDoc.exists) {
                    display.innerHTML = '<div class="text-center text-red-500">سعر البيع غير محدد لهذا المنتج</div>';
                    return;
                }

                const productData = productDoc.data();
                const pricePerSquareMeter = productData.pricePerSquareMeter || 0;

                if (pricePerSquareMeter <= 0) {
                    display.innerHTML = '<div class="text-center text-red-500">سعر البيع غير محدد لهذا المنتج</div>';
                    return;
                }

                // Load group addon prices
                const product = OutdoorPricing.getProduct(productId);
                let groupAddonsPrices = {};
                const groupId = product.groupId;

                if (groupId !== 'special') {
                    const groupDocId = `Outdoor_Group_${groupId}`;
                    const groupDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(groupDocId).get();
                    if (groupDoc.exists) {
                        groupAddonsPrices = groupDoc.data().addonsPrices || {};
                    }
                } else {
                    const specialDocId = `Outdoor_Group_special_${productId}`;
                    const specialDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(specialDocId).get();
                    if (specialDoc.exists) {
                        groupAddonsPrices = specialDoc.data().addonsPrices || {};
                    }
                }

                // Get selected addons
                const selectedAddons = [];
                const applicableAddons = OutdoorPricing.getProductAddons(productId);
                let hasOverlapWarning = false;

                for (const addon of applicableAddons) {
                    const checkbox = document.getElementById(`outdoor_addon_${addon.id}`);
                    if (checkbox && checkbox.checked) {
                        // Validate addon
                        const addonValidation = OutdoorPricing.validateAddon(addon.id, width, productId);
                        if (!addonValidation.valid) {
                            display.innerHTML = `<div class="text-center text-red-500">${addonValidation.error}</div>`;
                            checkbox.checked = false;
                            continue;
                        }
                        if (addonValidation.requiresOverlap) {
                            hasOverlapWarning = true;
                        }
                        const addonPrice = parseFloat(checkbox.getAttribute('data-addon-price')) || (groupAddonsPrices[addon.id] || 0);
                        selectedAddons.push({
                            addonId: addon.id,
                            price: addonPrice
                        });
                    }
                }

                // Calculate
                const calc = OutdoorPricing.calculate(productId, width, height, quantity, selectedAddons, pricePerSquareMeter, groupAddonsPrices);

                const overlapWarning = hasOverlapWarning ? `
                    <div class="bg-orange-50 p-2 rounded border border-orange-200 text-xs text-orange-800 mb-2">
                        <i class="fas fa-exclamation-triangle ml-1"></i>
                        <span>تنبيه: بعض الإضافات تتطلب تداخل بسبب الأبعاد.</span>
                    </div>
                ` : '';

                display.innerHTML = `
                    <div class="space-y-2 text-sm">
                        ${overlapWarning}
                        <div class="bg-green-50 p-3 rounded border border-green-200">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-bold text-gray-700">المساحة:</span>
                                <span class="font-bold text-gray-800">${calc.areaM2.toFixed(2)} م²</span>
                            </div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-bold text-gray-700">السعر لكل متر مربع:</span>
                                <span class="font-bold text-gray-800">${calc.pricePerSquareMeter.toFixed(2)} ج.م</span>
                            </div>
                            <div class="flex justify-between items-center border-t pt-2 mt-2">
                                <span class="font-bold text-gray-700">السعر الأساسي:</span>
                                <span class="font-bold text-gray-800">${calc.basePrice.toFixed(2)} ج.م</span>
                            </div>
                        </div>
                        ${calc.addonsTotal > 0 ? `
                            <div class="bg-purple-50 p-3 rounded border border-purple-200">
                                <div class="font-bold mb-2">الإضافات:</div>
                                ${calc.addonsDetails.map(detail => `
                                    <div class="flex justify-between text-xs mb-1">
                                        <span>${detail.name}:</span>
                                        <span class="font-bold">${detail.cost.toFixed(2)} ج.م</span>
                                    </div>
                                `).join('')}
                                <div class="flex justify-between border-t pt-1 mt-1 font-bold">
                                    <span>إجمالي الإضافات:</span>
                                    <span class="text-purple-600">${calc.addonsTotal.toFixed(2)} ج.م</span>
                                </div>
                            </div>
                        ` : ''}
                        <div class="bg-yellow-50 p-3 rounded border border-yellow-200">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-bold text-gray-700">سعر القطعة الواحدة:</span>
                                <span class="font-bold text-gray-800">${calc.itemTotal.toFixed(2)} ج.م</span>
                            </div>
                            <div class="flex justify-between items-center border-t-2 border-brandGold pt-2 mt-2">
                                <span class="font-bold text-gray-700 text-lg">السعر الإجمالي (${quantity} قطعة):</span>
                                <span class="text-2xl font-bold text-brandGold">${calc.totalPrice.toFixed(2)} ج.م</span>
                            </div>
                        </div>
                    </div>
                `;
            } catch (error) {
                console.error('Error calculating Outdoor price:', error);
                display.innerHTML = '<div class="text-center text-red-500">خطأ في حساب السعر</div>';
            }
        };

        // Event listeners
        productSelect.addEventListener('change', async () => {
            await updateAddons();
            calculateOutdoor();
        });

        widthInput.addEventListener('input', calculateOutdoor);
        heightInput.addEventListener('input', calculateOutdoor);
        quantityInput.addEventListener('input', calculateOutdoor);

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const productId = productSelect.value;
            const width = parseFloat(widthInput.value);
            const height = parseFloat(heightInput.value);
            const quantity = parseFloat(quantityInput.value);

            // Validate
            const validation = OutdoorPricing.validateDimensions(width, height);
            if (!validation.valid) {
                Swal.fire('خطأ', validation.error, 'error');
                return;
            }

            if (!productId) {
                Swal.fire('خطأ', 'يرجى اختيار المنتج', 'error');
                return;
            }

            // Load selling price
            const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
            if (!db) {
                Swal.fire('خطأ', 'قاعدة البيانات غير متاحة', 'error');
                return;
            }

            try {
                // Load product price
                const productDocId = `Outdoor_${productId}`;
                const productDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(productDocId).get();
                
                if (!productDoc.exists) {
                    Swal.fire('خطأ', 'سعر البيع غير محدد لهذا المنتج', 'error');
                    return;
                }

                const productData = productDoc.data();
                const pricePerSquareMeter = productData.pricePerSquareMeter || 0;

                if (pricePerSquareMeter <= 0) {
                    Swal.fire('خطأ', 'سعر البيع غير محدد لهذا المنتج', 'error');
                    return;
                }

                // Load group addon prices
                const product = OutdoorPricing.getProduct(productId);
                let groupAddonsPrices = {};
                const groupId = product.groupId;

                if (groupId !== 'special') {
                    const groupDocId = `Outdoor_Group_${groupId}`;
                    const groupDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(groupDocId).get();
                    if (groupDoc.exists) {
                        groupAddonsPrices = groupDoc.data().addonsPrices || {};
                    }
                } else {
                    const specialDocId = `Outdoor_Group_special_${productId}`;
                    const specialDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(specialDocId).get();
                    if (specialDoc.exists) {
                        groupAddonsPrices = specialDoc.data().addonsPrices || {};
                    }
                }

                // Get selected addons
                const selectedAddons = [];
                const applicableAddons = OutdoorPricing.getProductAddons(productId);
                for (const addon of applicableAddons) {
                    const checkbox = document.getElementById(`outdoor_addon_${addon.id}`);
                    if (checkbox && checkbox.checked) {
                        const addonValidation = OutdoorPricing.validateAddon(addon.id, width, productId);
                        if (!addonValidation.valid && !addonValidation.requiresOverlap) {
                            Swal.fire('خطأ', addonValidation.error, 'error');
                            return;
                        }
                        const addonPrice = parseFloat(checkbox.getAttribute('data-addon-price')) || (groupAddonsPrices[addon.id] || 0);
                        selectedAddons.push({
                            addonId: addon.id,
                            price: addonPrice
                        });
                    }
                }

                // Calculate
                const calc = OutdoorPricing.calculate(productId, width, height, quantity, selectedAddons, pricePerSquareMeter, groupAddonsPrices);

                const orderProduct = {
                    id: Date.now(),
                    type: 'Outdoor',
                    productId: productId,
                    productName: product.nameAr,
                    width: width,
                    height: height,
                    quantity: quantity,
                    calculation: calc,
                    price: calc.totalPrice,
                    sellingPrice: calc.totalPrice,
                    addons: selectedAddons.map(a => {
                        const addon = applicableAddons.find(ad => ad.id === a.addonId);
                        return {
                            addonId: a.addonId,
                            name: addon ? addon.nameAr : a.addonId
                        };
                    })
                };

                this.addProduct(orderProduct);
                closeModal('outdoorConfigModal');
                Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
            } catch (error) {
                console.error('Error adding Outdoor product:', error);
                Swal.fire('خطأ', 'فشل إضافة المنتج', 'error');
            }
        });

        // Initial calculation
        calculateOutdoor();
        
        openModal('outdoorConfigModal');
    },

    // Toggle outdoor addons section
    toggleOutdoorAddonsSection() {
        const content = document.getElementById('outdoorAddonsContent');
        const toggle = document.getElementById('outdoorAddonsToggle');
        if (content && toggle) {
            if (toggle.checked) {
                content.classList.remove('hidden-section');
            } else {
                content.classList.add('hidden-section');
            }
        }
    },

    // Update outdoor calculation (called from addon checkboxes)
    updateOutdoorCalculation() {
        const widthInput = document.getElementById('outdoorWidth');
        if (widthInput) widthInput.dispatchEvent(new Event('input'));
    },

    // Open Indoor configuration (same architecture as Outdoor, max 160 cm)
    async openIndoorConfig() {
        if (typeof IndoorPricing === 'undefined') {
            Swal.fire('خطأ', 'وحدة IndoorPricing غير متاحة', 'error');
            return;
        }
        const content = document.getElementById('indoorConfigContent');
        if (!content) {
            Swal.fire('خطأ', 'عنصر واجهة المستخدم غير موجود', 'error');
            return;
        }

        const products = IndoorPricing.getAllProducts();
        const groups = Object.values(IndoorPricing.GROUPS);
        const productsByGroup = {};
        groups.forEach(group => {
            productsByGroup[group.id] = group.products
                .map(id => IndoorPricing.getProduct(id))
                .filter(p => p !== null);
        });

        content.innerHTML = `
            <form id="indoorConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">اختر المنتج <span class="text-red-500">*</span></label>
                    <select id="indoorProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المنتج</option>
                        ${groups.map(group => {
                            const groupProducts = productsByGroup[group.id] || [];
                            if (groupProducts.length === 0) return '';
                            return `<optgroup label="${group.nameAr}">${groupProducts.map(p => `<option value="${p.id}">${p.nameAr} (${p.name})</option>`).join('')}</optgroup>`;
                        }).filter(html => html !== '').join('')}
                    </select>
                </div>
                <div id="indoorAreaFields" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">العرض (سم) <span class="text-red-500">*</span></label>
                        <input type="number" id="indoorWidth" step="0.01" min="0" max="160" placeholder="0.00" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <p class="text-xs text-gray-500 mt-1">الحد الأقصى: 160 سم</p>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">الطول (سم) <span class="text-red-500">*</span></label>
                        <input type="number" id="indoorHeight" step="0.01" min="0" max="160" placeholder="0.00" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <p class="text-xs text-gray-500 mt-1">الحد الأقصى: 160 سم</p>
                    </div>
                </div>
                <div id="indoorLengthFields" class="hidden-section">
                    <label class="block text-sm font-bold text-gray-700 mb-1">الطول (متر) <span class="text-red-500">*</span></label>
                    <input type="number" id="indoorLengthMeters" step="0.01" min="0" placeholder="0.00" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="indoorWidthForLamination" class="hidden-section">
                    <label class="block text-sm font-bold text-gray-700 mb-1">العرض (سم) - للامينيشن</label>
                    <input type="number" id="indoorWidthLamination" step="0.01" min="0" max="160" placeholder="0" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                    <p class="text-xs text-gray-500 mt-1">حد أقصى للامينيشن: 150 سم</p>
                </div>
                <div id="indoorColorField" class="hidden-section bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <label class="block text-sm font-bold text-gray-700 mb-2"><i class="fas fa-palette text-brandGold ml-1"></i> اختيار اللون</label>
                    <input type="hidden" id="indoorColor" value="">
                    <div id="indoorColorChips" class="flex flex-wrap gap-2">
                        <!-- Color chips rendered by JS below -->
                    </div>
                    <p class="text-xs text-gray-500 mt-2">اللون حسب اختيار العميل — انقر على اللون</p>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="indoorQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="indoorAddonsSection" class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 hidden-section">
                    <label class="flex items-center gap-3 cursor-pointer mb-3" onclick="OrderProducts.toggleIndoorAddonsSection()">
                        <input type="checkbox" id="indoorAddonsToggle" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                        <span class="font-bold text-gray-800 text-lg">الإضافات</span>
                    </label>
                    <div id="indoorAddonsContent" class="hidden-section space-y-3"></div>
                </div>
                <div id="indoorCalculationDisplay" class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div class="text-center text-gray-500">أدخل البيانات واختر المنتج لحساب السعر</div>
                </div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('indoorConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;

        const productSelect = document.getElementById('indoorProduct');
        const widthInput = document.getElementById('indoorWidth');
        const heightInput = document.getElementById('indoorHeight');
        const lengthInput = document.getElementById('indoorLengthMeters');
        const quantityInput = document.getElementById('indoorQuantity');
        const areaFields = document.getElementById('indoorAreaFields');
        const lengthFields = document.getElementById('indoorLengthFields');
        const widthLaminationField = document.getElementById('indoorWidthForLamination');
        const colorField = document.getElementById('indoorColorField');
        const form = document.getElementById('indoorConfigForm');

        // ألوان الكاتر بلوتر — كل لون بلونه
        const indoorColorOptions = [
            { id: 'red', nameAr: 'أحمر', hex: '#dc2626' },
            { id: 'blue', nameAr: 'أزرق', hex: '#2563eb' },
            { id: 'green', nameAr: 'أخضر', hex: '#16a34a' },
            { id: 'yellow', nameAr: 'أصفر', hex: '#ca8a04' },
            { id: 'orange', nameAr: 'برتقالي', hex: '#ea580c' },
            { id: 'purple', nameAr: 'بنفسجي', hex: '#7c3aed' },
            { id: 'pink', nameAr: 'وردي', hex: '#db2777' },
            { id: 'brown', nameAr: 'بني', hex: '#78350f' },
            { id: 'black', nameAr: 'أسود', hex: '#171717' },
            { id: 'white', nameAr: 'أبيض', hex: '#fafafa' },
            { id: 'gray', nameAr: 'رمادي', hex: '#525252' },
            { id: 'turquoise', nameAr: 'تركواز', hex: '#0d9488' },
            { id: 'gold', nameAr: 'ذهبي', hex: '#b45309' },
            { id: 'silver', nameAr: 'فضي', hex: '#737373' },
            { id: 'navy', nameAr: 'كحلي', hex: '#1e3a8a' },
            { id: 'beige', nameAr: 'بيج', hex: '#a8a29e' }
        ];
        const colorChipsEl = document.getElementById('indoorColorChips');
        if (colorChipsEl) {
            colorChipsEl.innerHTML = indoorColorOptions.map(c => {
                const isLight = ['white', 'beige', 'yellow', 'silver'].includes(c.id);
                const textColor = isLight ? '#1f2937' : c.hex;
                const bgColor = isLight ? c.hex : 'transparent';
                return `<button type="button" class="indoor-color-chip px-3 py-2 rounded-xl border-2 font-bold text-sm transition hover:scale-105 min-w-[4rem]" data-color-id="${c.id}" data-color-name="${c.nameAr}" style="color: ${textColor}; border-color: ${c.hex}; background: ${bgColor}">${c.nameAr}</button>`;
            }).join('');
            colorChipsEl.querySelectorAll('.indoor-color-chip').forEach(btn => {
                btn.addEventListener('click', function () {
                    colorChipsEl.querySelectorAll('.indoor-color-chip').forEach(b => b.classList.remove('ring-2', 'ring-offset-2', 'ring-brandGold'));
                    this.classList.add('ring-2', 'ring-offset-2', 'ring-brandGold');
                    document.getElementById('indoorColor').value = this.dataset.colorId;
                    if (typeof OrderProducts.updateIndoorCalculation === 'function') OrderProducts.updateIndoorCalculation();
                });
            });
        }

        const updateIndoorFieldsVisibility = () => {
            const productId = productSelect.value;
            const product = productId ? IndoorPricing.getProduct(productId) : null;
            const isPerMeter = product && IndoorPricing.isPerMeterProduct(productId);
            if (areaFields) areaFields.classList.toggle('hidden-section', isPerMeter);
            if (lengthFields) lengthFields.classList.toggle('hidden-section', !isPerMeter);
            if (colorField) colorField.classList.toggle('hidden-section', productId !== 'cutter-plotter');
            if (widthLaminationField) widthLaminationField.classList.toggle('hidden-section', productId !== 'print-and-cut');
        };

        const updateAddons = async () => {
            const productId = productSelect.value;
            const addonsSection = document.getElementById('indoorAddonsSection');
            const addonsContent = document.getElementById('indoorAddonsContent');
            if (!productId) { addonsSection.classList.add('hidden-section'); return; }
            const product = IndoorPricing.getProduct(productId);
            if (!product) { addonsSection.classList.add('hidden-section'); return; }
            const applicableAddons = IndoorPricing.getProductAddons(productId);
            if (applicableAddons.length === 0) { addonsSection.classList.add('hidden-section'); return; }
            addonsSection.classList.remove('hidden-section');
            const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
            if (!db) { addonsContent.innerHTML = '<p class="text-sm text-red-500">خطأ: قاعدة البيانات غير متاحة</p>'; return; }
            try {
                let groupAddonsPrices = {};
                const groupId = product.groupId;
                if (groupId === 'special') {
                    const doc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_Group_special_${productId}`).get();
                    if (doc.exists) groupAddonsPrices = doc.data().addonsPrices || {};
                } else if (groupId === 'cutterPlotter') {
                    const doc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc('Indoor_Group_cutterPlotter').get();
                    if (doc.exists) groupAddonsPrices = doc.data().addonsPrices || {};
                } else if (groupId === 'printCut') {
                    const doc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc('Indoor_Group_printCut').get();
                    if (doc.exists) groupAddonsPrices = doc.data().addonsPrices || {};
                } else {
                    const doc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_Group_${groupId}`).get();
                    if (doc.exists) groupAddonsPrices = doc.data().addonsPrices || {};
                }
                addonsContent.innerHTML = applicableAddons.map(addon => {
                    const addonPrice = groupAddonsPrices[addon.id] || 0;
                    const maxWidthText = addon.maxWidth ? ` (حد أقصى ${addon.maxWidth} سم)` : '';
                    const unitText = addon.unit === 'perSquareMeter' ? 'لكل متر مربع' : addon.unit === 'perMeter' ? 'لكل متر' : 'ثابت';
                    return `<div class="bg-white p-3 rounded-lg border border-gray-200">
                        <label class="flex items-center gap-3 cursor-pointer mb-2">
                            <input type="checkbox" id="indoor_addon_${addon.id}" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts.updateIndoorCalculation()" data-addon-price="${addonPrice}">
                            <span class="font-bold text-gray-700">${addon.nameAr}</span>
                        </label>
                        <div class="text-xs text-gray-600 mr-8">${maxWidthText} - ${unitText}</div>
                        ${addonPrice > 0 ? `<div class="text-xs text-green-600 mr-8 mt-1">السعر: ${addonPrice.toFixed(2)} ج.م</div>` : ''}
                    </div>`;
                }).join('');
            } catch (e) {
                console.error(e);
                addonsContent.innerHTML = '<p class="text-sm text-red-500">خطأ في تحميل أسعار الإضافات</p>';
            }
        };

        const calculateIndoor = async () => {
            const productId = productSelect.value;
            const display = document.getElementById('indoorCalculationDisplay');
            if (!display) return;
            const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
            if (!db) { display.innerHTML = '<div class="text-center text-red-500">خطأ: قاعدة البيانات غير متاحة</div>'; return; }

            const product = productId ? IndoorPricing.getProduct(productId) : null;
            if (!productId || !product) {
                display.innerHTML = '<div class="text-center text-gray-500">يرجى اختيار المنتج</div>';
                return;
            }

            const isPerMeter = IndoorPricing.isPerMeterProduct(productId);
            if (isPerMeter) {
                const lengthMeters = parseFloat(lengthInput?.value) || 0;
                const quantity = parseFloat(quantityInput?.value) || 1;
                const widthLamination = parseFloat(document.getElementById('indoorWidthLamination')?.value) || 0;
                const lengthValidation = IndoorPricing.validateLengthMeters(lengthMeters);
                if (!lengthValidation.valid) {
                    display.innerHTML = `<div class="text-center text-red-500">${lengthValidation.error}</div>`;
                    return;
                }
                try {
                    const productDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_${productId}`).get();
                    if (!productDoc.exists) {
                        display.innerHTML = '<div class="text-center text-red-500">سعر البيع غير محدد لهذا المنتج</div>';
                        return;
                    }
                    const pricePerMeter = productDoc.data().pricePerMeter || 0;
                    if (pricePerMeter <= 0) {
                        display.innerHTML = '<div class="text-center text-red-500">سعر البيع غير محدد لهذا المنتج</div>';
                        return;
                    }
                    let groupAddonsPrices = {};
                    if (product.groupId === 'cutterPlotter') {
                        const g = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc('Indoor_Group_cutterPlotter').get();
                        if (g.exists) groupAddonsPrices = g.data().addonsPrices || {};
                    } else if (product.groupId === 'printCut') {
                        const g = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc('Indoor_Group_printCut').get();
                        if (g.exists) groupAddonsPrices = g.data().addonsPrices || {};
                    }
                    const applicableAddons = IndoorPricing.getProductAddons(productId);
                    const selectedAddons = [];
                    let hasOverlapWarning = false;
                    for (const addon of applicableAddons) {
                        const cb = document.getElementById(`indoor_addon_${addon.id}`);
                        if (!cb || !cb.checked) continue;
                        const widthForValidation = productId === 'print-and-cut' ? widthLamination : 0;
                        const addonValidation = IndoorPricing.validateAddon(addon.id, widthForValidation || 999, productId);
                        if (!addonValidation.valid) {
                            display.innerHTML = `<div class="text-center text-red-500">${addonValidation.error}</div>`;
                            return;
                        }
                        if (addonValidation.requiresOverlap) hasOverlapWarning = true;
                        selectedAddons.push({ addonId: addon.id, price: parseFloat(cb.getAttribute('data-addon-price')) || groupAddonsPrices[addon.id] || 0 });
                    }
                    const widthCm = productId === 'print-and-cut' ? widthLamination : 0;
                    const calc = IndoorPricing.calculatePerMeter(productId, lengthMeters, quantity, selectedAddons, pricePerMeter, groupAddonsPrices, widthCm);
                    const overlapWarn = hasOverlapWarning ? '<div class="bg-orange-50 p-2 rounded border border-orange-200 text-xs text-orange-800 mb-2"><i class="fas fa-exclamation-triangle ml-1"></i> تنبيه: بعض الإضافات تتطلب تداخل بسبب الأبعاد.</div>' : '';
                    display.innerHTML = `<div class="space-y-2 text-sm">${overlapWarn}
                        <div class="bg-green-50 p-3 rounded border border-green-200">
                            <div class="flex justify-between items-center mb-2"><span class="font-bold text-gray-700">الطول:</span><span class="font-bold text-gray-800">${calc.lengthMeters} م</span></div>
                            <div class="flex justify-between items-center mb-2"><span class="font-bold text-gray-700">السعر لكل متر:</span><span class="font-bold text-gray-800">${calc.pricePerMeter.toFixed(2)} ج.م</span></div>
                            <div class="flex justify-between items-center border-t pt-2 mt-2"><span class="font-bold text-gray-700">السعر الأساسي:</span><span class="font-bold text-gray-800">${calc.basePrice.toFixed(2)} ج.م</span></div>
                        </div>
                        ${calc.addonsTotal > 0 ? `<div class="bg-purple-50 p-3 rounded border border-purple-200"><div class="font-bold mb-2">الإضافات:</div>${calc.addonsDetails.map(d => `<div class="flex justify-between text-xs mb-1"><span>${d.name}:</span><span class="font-bold">${d.cost.toFixed(2)} ج.م</span></div>`).join('')}<div class="flex justify-between border-t pt-1 mt-1 font-bold"><span>إجمالي الإضافات:</span><span class="text-purple-600">${calc.addonsTotal.toFixed(2)} ج.م</span></div></div>` : ''}
                        <div class="bg-yellow-50 p-3 rounded border border-yellow-200">
                            <div class="flex justify-between items-center mb-2"><span class="font-bold text-gray-700">سعر القطعة الواحدة:</span><span class="font-bold text-gray-800">${calc.itemTotal.toFixed(2)} ج.م</span></div>
                            <div class="flex justify-between items-center border-t-2 border-brandGold pt-2 mt-2"><span class="font-bold text-gray-700 text-lg">السعر الإجمالي (${quantity} قطعة):</span><span class="text-2xl font-bold text-brandGold">${calc.totalPrice.toFixed(2)} ج.م</span></div>
                        </div></div>`;
                } catch (err) {
                    console.error(err);
                    display.innerHTML = '<div class="text-center text-red-500">خطأ في حساب السعر</div>';
                }
                return;
            }

            const width = parseFloat(widthInput?.value) || 0;
            const height = parseFloat(heightInput?.value) || 0;
            const quantity = parseFloat(quantityInput?.value) || 1;
            const validation = IndoorPricing.validateDimensions(width, height);
            if (!validation.valid) {
                display.innerHTML = `<div class="text-center text-red-500">${validation.error}</div>`;
                return;
            }
            try {
                const productDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_${productId}`).get();
                if (!productDoc.exists) {
                    display.innerHTML = '<div class="text-center text-red-500">سعر البيع غير محدد لهذا المنتج</div>';
                    return;
                }
                const pricePerSquareMeter = productDoc.data().pricePerSquareMeter || 0;
                if (pricePerSquareMeter <= 0) {
                    display.innerHTML = '<div class="text-center text-red-500">سعر البيع غير محدد لهذا المنتج</div>';
                    return;
                }
                let groupAddonsPrices = {};
                if (product.groupId === 'special') {
                    const g = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_Group_special_${productId}`).get();
                    if (g.exists) groupAddonsPrices = g.data().addonsPrices || {};
                } else {
                    const g = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_Group_${product.groupId}`).get();
                    if (g.exists) groupAddonsPrices = g.data().addonsPrices || {};
                }
                const applicableAddons = IndoorPricing.getProductAddons(productId);
                const selectedAddons = [];
                let hasOverlapWarning = false;
                for (const addon of applicableAddons) {
                    const cb = document.getElementById(`indoor_addon_${addon.id}`);
                    if (!cb || !cb.checked) continue;
                    const addonValidation = IndoorPricing.validateAddon(addon.id, width, productId);
                    if (!addonValidation.valid) {
                        display.innerHTML = `<div class="text-center text-red-500">${addonValidation.error}</div>`;
                        return;
                    }
                    if (addonValidation.requiresOverlap) hasOverlapWarning = true;
                    selectedAddons.push({ addonId: addon.id, price: parseFloat(cb.getAttribute('data-addon-price')) || groupAddonsPrices[addon.id] || 0 });
                }
                const calc = IndoorPricing.calculate(productId, width, height, quantity, selectedAddons, pricePerSquareMeter, groupAddonsPrices);
                const overlapWarn = hasOverlapWarning ? '<div class="bg-orange-50 p-2 rounded border border-orange-200 text-xs text-orange-800 mb-2"><i class="fas fa-exclamation-triangle ml-1"></i> تنبيه: بعض الإضافات تتطلب تداخل.</div>' : '';
                display.innerHTML = `<div class="space-y-2 text-sm">${overlapWarn}
                    <div class="bg-green-50 p-3 rounded border border-green-200">
                        <div class="flex justify-between items-center mb-2"><span class="font-bold text-gray-700">المساحة:</span><span class="font-bold text-gray-800">${calc.areaM2.toFixed(2)} م²</span></div>
                        <div class="flex justify-between items-center mb-2"><span class="font-bold text-gray-700">السعر لكل متر مربع:</span><span class="font-bold text-gray-800">${calc.pricePerSquareMeter.toFixed(2)} ج.م</span></div>
                        <div class="flex justify-between items-center border-t pt-2 mt-2"><span class="font-bold text-gray-700">السعر الأساسي:</span><span class="font-bold text-gray-800">${calc.basePrice.toFixed(2)} ج.م</span></div>
                    </div>
                    ${calc.addonsTotal > 0 ? `<div class="bg-purple-50 p-3 rounded border border-purple-200"><div class="font-bold mb-2">الإضافات:</div>${calc.addonsDetails.map(d => `<div class="flex justify-between text-xs mb-1"><span>${d.name}:</span><span class="font-bold">${d.cost.toFixed(2)} ج.م</span></div>`).join('')}<div class="flex justify-between border-t pt-1 mt-1 font-bold"><span>إجمالي الإضافات:</span><span class="text-purple-600">${calc.addonsTotal.toFixed(2)} ج.م</span></div></div>` : ''}
                    <div class="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <div class="flex justify-between items-center mb-2"><span class="font-bold text-gray-700">سعر القطعة الواحدة:</span><span class="font-bold text-gray-800">${calc.itemTotal.toFixed(2)} ج.م</span></div>
                        <div class="flex justify-between items-center border-t-2 border-brandGold pt-2 mt-2"><span class="font-bold text-gray-700 text-lg">السعر الإجمالي (${quantity} قطعة):</span><span class="text-2xl font-bold text-brandGold">${calc.totalPrice.toFixed(2)} ج.م</span></div>
                    </div></div>`;
            } catch (err) {
                console.error(err);
                display.innerHTML = '<div class="text-center text-red-500">خطأ في حساب السعر</div>';
            }
        };

        productSelect.addEventListener('change', () => {
            updateIndoorFieldsVisibility();
            updateAddons();
            calculateIndoor();
        });
        if (widthInput) widthInput.addEventListener('input', calculateIndoor);
        if (heightInput) heightInput.addEventListener('input', calculateIndoor);
        if (lengthInput) lengthInput.addEventListener('input', calculateIndoor);
        quantityInput.addEventListener('input', calculateIndoor);
        document.getElementById('indoorWidthLamination')?.addEventListener('input', calculateIndoor);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = productSelect.value;
            const product = IndoorPricing.getProduct(productId);
            if (!productId || !product) {
                Swal.fire('خطأ', 'يرجى اختيار المنتج', 'error');
                return;
            }
            const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
            if (!db) {
                Swal.fire('خطأ', 'قاعدة البيانات غير متاحة', 'error');
                return;
            }
            const isPerMeter = IndoorPricing.isPerMeterProduct(productId);
            if (isPerMeter) {
                const lengthMeters = parseFloat(lengthInput?.value) || 0;
                const quantity = parseFloat(quantityInput?.value) || 1;
                const widthLamination = parseFloat(document.getElementById('indoorWidthLamination')?.value) || 0;
                if (!IndoorPricing.validateLengthMeters(lengthMeters).valid) {
                    Swal.fire('خطأ', 'يرجى إدخال الطول بشكل صحيح', 'error');
                    return;
                }
                const productDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_${productId}`).get();
                if (!productDoc.exists) { Swal.fire('خطأ', 'سعر البيع غير محدد لهذا المنتج', 'error'); return; }
                const pricePerMeter = productDoc.data().pricePerMeter || 0;
                if (pricePerMeter <= 0) { Swal.fire('خطأ', 'سعر البيع غير محدد لهذا المنتج', 'error'); return; }
                let groupAddonsPrices = {};
                if (product.groupId === 'cutterPlotter') {
                    const g = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc('Indoor_Group_cutterPlotter').get();
                    if (g.exists) groupAddonsPrices = g.data().addonsPrices || {};
                } else {
                    const g = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc('Indoor_Group_printCut').get();
                    if (g.exists) groupAddonsPrices = g.data().addonsPrices || {};
                }
                const applicableAddons = IndoorPricing.getProductAddons(productId);
                const selectedAddons = [];
                for (const addon of applicableAddons) {
                    const cb = document.getElementById(`indoor_addon_${addon.id}`);
                    if (!cb || !cb.checked) continue;
                    const widthForVal = productId === 'print-and-cut' ? widthLamination : 999;
                    const val = IndoorPricing.validateAddon(addon.id, widthForVal, productId);
                    if (!val.valid) { Swal.fire('خطأ', val.error, 'error'); return; }
                    selectedAddons.push({ addonId: addon.id, price: parseFloat(cb.getAttribute('data-addon-price')) || groupAddonsPrices[addon.id] || 0 });
                }
                const calc = IndoorPricing.calculatePerMeter(productId, lengthMeters, quantity, selectedAddons, pricePerMeter, groupAddonsPrices, productId === 'print-and-cut' ? widthLamination : 0);
                const colorValue = document.getElementById('indoorColor')?.value || '';
                const selectedChip = colorChipsEl && colorChipsEl.querySelector('.indoor-color-chip.ring-2');
                const colorNameAr = selectedChip ? selectedChip.dataset.colorName : (indoorColorOptions.find(c => c.id === colorValue)?.nameAr || colorValue);
                const orderProduct = { id: Date.now(), type: 'Indoor', productId, productName: product.nameAr, lengthMeters, quantity, calculation: calc, price: calc.totalPrice, sellingPrice: calc.totalPrice, addons: selectedAddons.map(a => ({ addonId: a.addonId, name: (IndoorPricing.getProductAddons(productId).find(ad => ad.id === a.addonId) || {}).nameAr || a.addonId })) };
                if (productId === 'cutter-plotter') {
                    orderProduct.color = colorValue;
                    orderProduct.colorNameAr = colorNameAr;
                }
                this.addProduct(orderProduct);
                closeModal('indoorConfigModal');
                Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
                return;
            }
            const width = parseFloat(widthInput?.value) || 0;
            const height = parseFloat(heightInput?.value) || 0;
            const quantity = parseFloat(quantityInput?.value) || 1;
            if (!IndoorPricing.validateDimensions(width, height).valid) {
                Swal.fire('خطأ', IndoorPricing.validateDimensions(width, height).error, 'error');
                return;
            }
            const productDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_${productId}`).get();
            if (!productDoc.exists) { Swal.fire('خطأ', 'سعر البيع غير محدد لهذا المنتج', 'error'); return; }
            const pricePerSquareMeter = productDoc.data().pricePerSquareMeter || 0;
            if (pricePerSquareMeter <= 0) { Swal.fire('خطأ', 'سعر البيع غير محدد لهذا المنتج', 'error'); return; }
            let groupAddonsPrices = {};
            if (product.groupId === 'special') {
                const g = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_Group_special_${productId}`).get();
                if (g.exists) groupAddonsPrices = g.data().addonsPrices || {};
            } else {
                const g = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Indoor_Group_${product.groupId}`).get();
                if (g.exists) groupAddonsPrices = g.data().addonsPrices || {};
            }
            const applicableAddons = IndoorPricing.getProductAddons(productId);
            const selectedAddons = [];
            for (const addon of applicableAddons) {
                const cb = document.getElementById(`indoor_addon_${addon.id}`);
                if (!cb || !cb.checked) continue;
                const val = IndoorPricing.validateAddon(addon.id, width, productId);
                if (!val.valid) { Swal.fire('خطأ', val.error, 'error'); return; }
                selectedAddons.push({ addonId: addon.id, price: parseFloat(cb.getAttribute('data-addon-price')) || groupAddonsPrices[addon.id] || 0 });
            }
            const calc = IndoorPricing.calculate(productId, width, height, quantity, selectedAddons, pricePerSquareMeter, groupAddonsPrices);
            const orderProduct = { id: Date.now(), type: 'Indoor', productId, productName: product.nameAr, width, height, quantity, calculation: calc, price: calc.totalPrice, sellingPrice: calc.totalPrice, addons: selectedAddons.map(a => ({ addonId: a.addonId, name: (IndoorPricing.getProductAddons(productId).find(ad => ad.id === a.addonId) || {}).nameAr || a.addonId })) };
            this.addProduct(orderProduct);
            closeModal('indoorConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });

        updateIndoorFieldsVisibility();
        updateAddons();
        calculateIndoor();
        openModal('indoorConfigModal');
    },

    toggleIndoorAddonsSection() {
        const content = document.getElementById('indoorAddonsContent');
        const toggle = document.getElementById('indoorAddonsToggle');
        if (content && toggle) {
            if (toggle.checked) content.classList.remove('hidden-section');
            else content.classList.add('hidden-section');
        }
    },

    updateIndoorCalculation() {
        const lengthInput = document.getElementById('indoorLengthMeters');
        if (lengthInput) lengthInput.dispatchEvent(new Event('input'));
        const widthInput = document.getElementById('indoorWidth');
        if (widthInput) widthInput.dispatchEvent(new Event('input'));
    },

    async openStandsConfig() {
        if (typeof StandsPricing === 'undefined') {
            Swal.fire('خطأ', 'وحدة StandsPricing غير متاحة', 'error');
            return;
        }
        const content = document.getElementById('standsConfigContent');
        if (!content) {
            Swal.fire('خطأ', 'عنصر واجهة المستخدم غير موجود', 'error');
            return;
        }

        const subCats = StandsPricing.SUB_CATEGORIES;
        const productsBySub = {};
        subCats.forEach(s => { productsBySub[s.id] = StandsPricing.getProductsBySubCategory(s.id); });

        content.innerHTML = `
            <form id="standsConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">نوع الاستند <span class="text-red-500">*</span></label>
                    <select id="standsSubCategory" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر النوع</option>
                        ${subCats.map(s => `<option value="${s.id}">${s.nameAr} (${s.name})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">المنتج <span class="text-red-500">*</span></label>
                    <select id="standsProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المنتج</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">النوع</label>
                    <div class="flex gap-4">
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="standsVariant" value="empty" checked class="text-brandGold"> <span>فارغ (استند فقط)</span></label>
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="standsVariant" value="printed" class="text-brandGold"> <span>مطبوع (استند + طباعة)</span></label>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="standsQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="standsLaminationSection" class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 hidden-section">
                    <p class="text-sm font-bold text-gray-700 mb-2">اللامينيشن (اختياري) — يُحسب تلقائياً حسب مقاس الاستند المختار</p>
                    <p id="standsLamSizeDisplay" class="text-xs text-gray-600 mb-3 hidden-section"></p>
                    <div id="standsLaminationAddons" class="space-y-2"></div>
                </div>
                <div id="standsCalculationDisplay" class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div class="text-center text-gray-500">اختر المنتج والنوع والكمية</div>
                </div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('standsConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;

        const subSelect = document.getElementById('standsSubCategory');
        const productSelect = document.getElementById('standsProduct');
        const quantityInput = document.getElementById('standsQuantity');
        const laminationSection = document.getElementById('standsLaminationSection');
        const laminationAddonsEl = document.getElementById('standsLaminationAddons');
        const form = document.getElementById('standsConfigForm');
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;

        const fillProducts = () => {
            const subId = subSelect.value;
            productSelect.innerHTML = '<option value="">اختر المنتج</option>';
            if (!subId) return;
            const products = productsBySub[subId] || [];
            products.forEach(p => {
                productSelect.innerHTML += `<option value="${p.id}">${p.nameAr} (${p.name})</option>`;
            });
        };

        const updateLaminationSection = async () => {
            const productId = productSelect.value;
            const product = productId ? StandsPricing.getProduct(productId) : null;
            const hasLam = product && StandsPricing.hasLamination(productId);
            laminationSection.classList.toggle('hidden-section', !hasLam);
            const sizeDisplay = document.getElementById('standsLamSizeDisplay');
            if (sizeDisplay) {
                if (hasLam && product.widthCm && product.heightCm) {
                    sizeDisplay.textContent = `مقاس الاستند: ${product.widthCm} × ${product.heightCm} سم = ${((product.widthCm / 100) * (product.heightCm / 100)).toFixed(2)} م²`;
                    sizeDisplay.classList.remove('hidden-section');
                } else {
                    sizeDisplay.classList.add('hidden-section');
                }
            }
            if (!hasLam) return;
            const subId = product.subCategoryId;
            const addons = StandsPricing.getSubCategoryAddons(subId);
            if (!db || addons.length === 0) { laminationAddonsEl.innerHTML = ''; return; }
            const groupDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Stands_Group_${subId}`).get();
            const prices = groupDoc.exists ? (groupDoc.data().addonsPrices || {}) : {};
            laminationAddonsEl.innerHTML = addons.map(addon => {
                const price = prices[addon.id] || 0;
                return `<label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="stands_addon_${addon.id}" class="w-5 h-5 text-brandGold rounded" onchange="OrderProducts.updateStandsCalculation()" data-price="${price}"> <span>${addon.nameAr}</span> (${price.toFixed(2)} ج.م/م²)</label>`;
            }).join('');
        };

        const calculateStands = async () => {
            const display = document.getElementById('standsCalculationDisplay');
            if (!display) return;
            const subId = subSelect.value;
            const productId = productSelect.value;
            const variant = document.querySelector('input[name="standsVariant"]:checked')?.value || 'empty';
            const quantity = parseFloat(quantityInput?.value) || 1;
            const product = productId ? StandsPricing.getProduct(productId) : null;

            if (!productId || !product) {
                display.innerHTML = '<div class="text-center text-gray-500">اختر نوع الاستند والمنتج</div>';
                return;
            }
            if (!db) {
                display.innerHTML = '<div class="text-center text-red-500">قاعدة البيانات غير متاحة</div>';
                return;
            }

            try {
                const productDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Stands_${subId}_${productId}`).get();
                if (!productDoc.exists) {
                    display.innerHTML = '<div class="text-center text-red-500">سعر البيع غير محدد لهذا المنتج</div>';
                    return;
                }
                const data = productDoc.data();
                const priceEmpty = data.priceEmpty || 0;
                const pricePrinted = data.pricePrinted || 0;

                let groupAddonsPrices = {};
                const laminationAddons = [];
                const lamW = (product.widthCm != null && product.heightCm != null) ? product.widthCm : 0;
                const lamH = (product.widthCm != null && product.heightCm != null) ? product.heightCm : 0;
                if (StandsPricing.hasLamination(productId)) {
                    const groupDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc(`Stands_Group_${subId}`).get();
                    if (groupDoc.exists) groupAddonsPrices = groupDoc.data().addonsPrices || {};
                    const addons = StandsPricing.getSubCategoryAddons(subId);
                    addons.forEach(addon => {
                        const cb = document.getElementById(`stands_addon_${addon.id}`);
                        if (cb && cb.checked) laminationAddons.push({ addonId: addon.id, pricePerM2: parseFloat(cb.getAttribute('data-price')) || groupAddonsPrices[addon.id] || 0 });
                    });
                }

                const calc = StandsPricing.calculate(productId, variant, quantity, priceEmpty, pricePrinted, laminationAddons, lamW, lamH, groupAddonsPrices);

                let laminationHtml = '';
                if (calc.laminationTotal > 0) {
                    laminationHtml = `<div class="bg-purple-50 p-3 rounded border border-purple-200 mt-2"><div class="font-bold mb-1">اللامينيشن:</div>${calc.laminationDetails.map(d => `<div class="flex justify-between text-xs"><span>${d.nameAr}</span><span>${d.cost.toFixed(2)} ج.م</span></div>`).join('')}<div class="flex justify-between border-t pt-1 mt-1 font-bold"><span>إجمالي اللامينيشن:</span><span>${calc.laminationTotal.toFixed(2)} ج.م</span></div></div>`;
                }
                display.innerHTML = `
                    <div class="space-y-2 text-sm">
                        <div class="bg-green-50 p-3 rounded border border-green-200">
                            <div class="flex justify-between items-center"><span class="font-bold text-gray-700">السعر الأساسي (${variant === 'printed' ? 'مطبوع' : 'فارغ'}):</span><span class="font-bold text-gray-800">${calc.basePrice.toFixed(2)} ج.م</span></div>
                            ${laminationHtml}
                            <div class="flex justify-between border-t pt-2 mt-2"><span class="font-bold text-gray-700">سعر القطعة:</span><span class="font-bold text-gray-800">${calc.itemTotal.toFixed(2)} ج.م</span></div>
                        </div>
                        <div class="bg-yellow-50 p-3 rounded border border-yellow-200">
                            <div class="flex justify-between items-center border-t-2 border-brandGold pt-2 mt-2"><span class="font-bold text-gray-700 text-lg">السعر الإجمالي (${quantity} قطعة):</span><span class="text-2xl font-bold text-brandGold">${calc.totalPrice.toFixed(2)} ج.م</span></div>
                        </div>
                    </div>
                `;
            } catch (err) {
                console.error(err);
                display.innerHTML = '<div class="text-center text-red-500">خطأ في حساب السعر</div>';
            }
        };

        subSelect.addEventListener('change', () => { fillProducts(); updateLaminationSection(); calculateStands(); });
        productSelect.addEventListener('change', () => { updateLaminationSection(); calculateStands(); });
        form.querySelectorAll('input[name="standsVariant"]').forEach(r => r.addEventListener('change', calculateStands));
        quantityInput.addEventListener('input', calculateStands);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const subId = subSelect.value;
            const productId = productSelect.value;
            const variant = document.querySelector('input[name="standsVariant"]:checked')?.value || 'empty';
            const quantity = parseFloat(quantityInput?.value) || 1;
            const product = StandsPricing.getProduct(productId);
            if (!productId || !product) {
                Swal.fire('خطأ', 'يرجى اختيار المنتج', 'error');
                return;
            }
            if (!db) {
                Swal.fire('خطأ', 'قاعدة البيانات غير متاحة', 'error');
                return;
            }
            try {
                const sellColl = PricingService.SELL_COLLECTION;
                const costColl = (typeof PricingService !== 'undefined' && PricingService.COST_COLLECTION) ? PricingService.COST_COLLECTION : 'product_prices_cost';

                const productDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(sellColl) : db.collection(sellColl)).doc(`Stands_${subId}_${productId}`).get();
                if (!productDoc.exists) { Swal.fire('خطأ', 'سعر البيع غير محدد لهذا المنتج', 'error'); return; }
                const data = productDoc.data();
                const priceEmpty = data.priceEmpty || 0;
                const pricePrinted = data.pricePrinted || 0;

                let groupAddonsPrices = {};
                const laminationAddons = [];
                const lamW = (product.widthCm != null && product.heightCm != null) ? product.widthCm : 0;
                const lamH = (product.widthCm != null && product.heightCm != null) ? product.heightCm : 0;
                if (StandsPricing.hasLamination(productId)) {
                    const groupDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(sellColl) : db.collection(sellColl)).doc(`Stands_Group_${subId}`).get();
                    if (groupDoc.exists) groupAddonsPrices = groupDoc.data().addonsPrices || {};
                    const addons = StandsPricing.getSubCategoryAddons(subId);
                    addons.forEach(addon => {
                        const cb = document.getElementById(`stands_addon_${addon.id}`);
                        if (cb && cb.checked) laminationAddons.push({ addonId: addon.id, pricePerM2: parseFloat(cb.getAttribute('data-price')) || groupAddonsPrices[addon.id] || 0 });
                    });
                }
                const calc = StandsPricing.calculate(productId, variant, quantity, priceEmpty, pricePrinted, laminationAddons, lamW, lamH, groupAddonsPrices);

                // جلب أسعار التكلفة وحساب التكلفة الفعلية
                let productionCostTotal = 0;
                try {
                    const costProductDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(costColl) : db.collection(costColl)).doc(`Stands_${subId}_${productId}`).get();
                    const costEmpty = costProductDoc.exists ? (costProductDoc.data().costEmpty || 0) : 0;
                    const costPrinted = costProductDoc.exists ? (costProductDoc.data().costPrinted || 0) : 0;
                    let groupAddonsCosts = {};
                    const costGroupDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(costColl) : db.collection(costColl)).doc(`Stands_Group_${subId}`).get();
                    if (costGroupDoc.exists) groupAddonsCosts = costGroupDoc.data().addonsCosts || {};
                    const costLaminationAddons = [];
                    if (StandsPricing.hasLamination(productId)) {
                        const addons = StandsPricing.getSubCategoryAddons(subId);
                        addons.forEach(addon => {
                            const cb = document.getElementById(`stands_addon_${addon.id}`);
                            if (cb && cb.checked) costLaminationAddons.push({ addonId: addon.id, pricePerM2: groupAddonsCosts[addon.id] || 0 });
                        });
                    }
                    const costCalc = StandsPricing.calculate(productId, variant, quantity, costEmpty, costPrinted, costLaminationAddons, lamW, lamH, groupAddonsCosts);
                    productionCostTotal = costCalc.totalPrice;
                } catch (costErr) {
                    console.warn('Stands cost not loaded, productionCost will be 0:', costErr);
                }

                const orderProduct = {
                    id: Date.now(),
                    type: 'Stands',
                    subCategoryId: subId,
                    productId,
                    productName: product.nameAr,
                    variant,
                    quantity,
                    calculation: calc,
                    price: calc.totalPrice,
                    sellingPrice: calc.totalPrice,
                    productionCost: productionCostTotal,
                    addons: (calc.laminationDetails || []).map(d => ({ addonId: d.addonId, name: d.nameAr }))
                };
                this.addProduct(orderProduct);
                closeModal('standsConfigModal');
                Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
            } catch (err) {
                console.error(err);
                Swal.fire('خطأ', 'فشل إضافة المنتج', 'error');
            }
        });

        fillProducts();
        updateLaminationSection();
        calculateStands();
        openModal('standsConfigModal');
    },

    updateStandsCalculation() {
        const productSelect = document.getElementById('standsProduct');
        if (productSelect) productSelect.dispatchEvent(new Event('change'));
    },

    async openStampsConfig() {
        if (typeof StampsPricing === 'undefined') {
            Swal.fire('خطأ', 'وحدة StampsPricing غير متاحة', 'error');
            return;
        }
        const content = document.getElementById('stampsConfigContent');
        if (!content) {
            Swal.fire('خطأ', 'عنصر واجهة الأختام غير موجود', 'error');
            return;
        }
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('stampsConfigModal');
            return;
        }

        const sellColl = PricingService.SELL_COLLECTION;
        const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(sellColl) : db.collection(sellColl)).where('categoryId', '==', 'Stamps').get();
        const sellByDoc = {};
        const sizesByBand = { automatic_machine: [], wooden_handle: [] };
        let clicheSellPerCm2 = StampsPricing.DEFAULT_CLICHE_SELL_PER_CM2 || 0.015;
        snap.docs.forEach(d => {
            const data = d.data();
            sellByDoc[d.id] = data;
            if (d.id === 'Stamps_cliche') {
                if (data.sellPricePerCm2 != null) clicheSellPerCm2 = data.sellPricePerCm2;
                return;
            }
            if (data.band === 'automatic_machine' || data.band === 'wooden_handle') {
                const sizeId = data.sizeId || d.id.replace('Stamps_' + data.band + '_', '');
                const name = data.productNameAr || data.productName || sizeId;
                if (!sizesByBand[data.band].some(s => s.sizeId === sizeId)) {
                    sizesByBand[data.band].push({ sizeId, name, docId: d.id });
                }
            }
        });
        const defaultSizesMachine = StampsPricing.getDefaultSizes('automatic_machine') || [];
        const defaultSizesHandle = StampsPricing.getDefaultSizes('wooden_handle') || [];
        defaultSizesMachine.forEach(s => {
            if (!sizesByBand.automatic_machine.some(x => x.sizeId === s.sizeId)) {
                sizesByBand.automatic_machine.push({ sizeId: s.sizeId, name: s.productNameAr || s.productName || s.sizeId, docId: StampsPricing.docId('automatic_machine', s.sizeId) });
            }
        });
        defaultSizesHandle.forEach(s => {
            if (!sizesByBand.wooden_handle.some(x => x.sizeId === s.sizeId)) {
                sizesByBand.wooden_handle.push({ sizeId: s.sizeId, name: s.productNameAr || s.productName || s.sizeId, docId: StampsPricing.docId('wooden_handle', s.sizeId) });
            }
        });

        content.innerHTML = `
            <form id="stampsConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">النوع <span class="text-red-500">*</span></label>
                    <select id="stampsBand" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="automatic_machine">ماكينة أوتوماتيك</option>
                        <option value="wooden_handle">مقبض خشبي</option>
                        <option value="cliche_only">كليشيه فقط</option>
                    </select>
                </div>
                <div id="stampsSizeSection">
                    <label class="block text-sm font-bold text-gray-700 mb-1">المقاس <span class="text-red-500">*</span></label>
                    <select id="stampsSize" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المقاس</option>
                        ${sizesByBand.automatic_machine.map(s => `<option value="${s.docId}">${s.name}</option>`).join('')}
                    </select>
                </div>
                <div id="stampsVariantSection">
                    <label class="block text-sm font-bold text-gray-700 mb-1">النوع</label>
                    <div class="flex gap-4">
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="stampsVariant" value="only" checked class="text-brandGold"> <span id="stampsVariantLabelOnly">ماكينة فقط</span></label>
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="stampsVariant" value="stamp" class="text-brandGold"> <span id="stampsVariantLabelStamp">ماكينة + ختم</span></label>
                    </div>
                </div>
                <div id="stampsClicheSection" class="hidden-section">
                    <label class="block text-sm font-bold text-gray-700 mb-1">الأبعاد (سم) <span class="text-red-500">*</span></label>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="number" id="stampsClicheWidth" step="0.1" min="0.1" placeholder="العرض" class="border border-gray-300 p-3 rounded-xl">
                        <input type="number" id="stampsClicheHeight" step="0.1" min="0.1" placeholder="الارتفاع" class="border border-gray-300 p-3 rounded-xl">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="stampsQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="stampsCalculationDisplay" class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div class="text-center text-gray-500">اختر النوع والمقاس والكمية</div>
                </div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('stampsConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;

        const bandSelect = document.getElementById('stampsBand');
        const sizeSection = document.getElementById('stampsSizeSection');
        const variantSection = document.getElementById('stampsVariantSection');
        const clicheSection = document.getElementById('stampsClicheSection');
        const sizeSelect = document.getElementById('stampsSize');
        const quantityInput = document.getElementById('stampsQuantity');
        const form = document.getElementById('stampsConfigForm');

        const updateStampsUI = () => {
            const band = bandSelect.value;
            clicheSection.classList.add('hidden-section');
            sizeSection.classList.remove('hidden-section');
            variantSection.classList.remove('hidden-section');
            if (band === 'cliche_only') {
                clicheSection.classList.remove('hidden-section');
                sizeSection.classList.add('hidden-section');
                variantSection.classList.add('hidden-section');
            } else {
                const sizes = sizesByBand[band] || [];
                sizeSelect.innerHTML = '<option value="">اختر المقاس</option>' + sizes.map(s => `<option value="${s.docId}">${s.name}</option>`).join('');
                const labelOnly = band === 'automatic_machine' ? 'ماكينة فقط' : 'مقبض فقط';
                const labelStamp = band === 'automatic_machine' ? 'ماكينة + ختم' : 'مقبض + ختم';
                const elOnly = document.getElementById('stampsVariantLabelOnly');
                const elStamp = document.getElementById('stampsVariantLabelStamp');
                if (elOnly) elOnly.textContent = labelOnly;
                if (elStamp) elStamp.textContent = labelStamp;
            }
            updateStampsCalculation();
        };

        const updateStampsCalculation = () => {
            const display = document.getElementById('stampsCalculationDisplay');
            if (!display) return;
            const band = bandSelect.value;
            const quantity = parseFloat(quantityInput?.value) || 1;
            if (band === 'cliche_only') {
                const w = parseFloat(document.getElementById('stampsClicheWidth')?.value) || 0;
                const h = parseFloat(document.getElementById('stampsClicheHeight')?.value) || 0;
                if (w <= 0 || h <= 0) {
                    display.innerHTML = '<div class="text-center text-gray-500">أدخل العرض والارتفاع (سم)</div>';
                    return;
                }
                const calc = StampsPricing.calculateCliche(w, h, quantity, clicheSellPerCm2);
                display.innerHTML = `<div class="space-y-1 text-sm"><div class="flex justify-between"><span>المساحة:</span><span>${calc.area.toFixed(2)} سم²</span></div><div class="flex justify-between"><span>سعر الوحدة:</span><span>${calc.unitPrice.toFixed(2)} ج.م</span></div><div class="flex justify-between font-bold text-brandGold"><span>الإجمالي (${quantity} قطعة):</span><span>${calc.totalPrice.toFixed(2)} ج.م</span></div></div>`;
                return;
            }
            const docId = sizeSelect.value;
            if (!docId) {
                display.innerHTML = '<div class="text-center text-gray-500">اختر المقاس</div>';
                return;
            }
            const data = sellByDoc[docId];
            if (!data) {
                display.innerHTML = '<div class="text-center text-red-500">سعر البيع غير محدد لهذا المقاس</div>';
                return;
            }
            const variant = document.querySelector('input[name="stampsVariant"]:checked')?.value || 'only';
            const isMachine = band === 'automatic_machine';
            const unitPrice = variant === 'stamp'
                ? (isMachine ? (data.sellPriceMachineStamp || 0) : (data.sellPriceHandleStamp || 0))
                : (isMachine ? (data.sellPriceMachineOnly || 0) : (data.sellPriceHandleOnly || 0));
            const total = unitPrice * quantity;
            const variantLabel = variant === 'stamp' ? (isMachine ? 'ماكينة + ختم' : 'مقبض + ختم') : (isMachine ? 'ماكينة فقط' : 'مقبض فقط');
            display.innerHTML = `<div class="space-y-1 text-sm"><div class="flex justify-between"><span>${variantLabel}:</span><span>${unitPrice.toFixed(2)} ج.م/قطعة</span></div><div class="flex justify-between font-bold text-brandGold"><span>الإجمالي (${quantity} قطعة):</span><span>${total.toFixed(2)} ج.م</span></div></div>`;
        };

        bandSelect.addEventListener('change', updateStampsUI);
        sizeSelect.addEventListener('change', updateStampsCalculation);
        quantityInput.addEventListener('input', updateStampsCalculation);
        form.querySelectorAll('input[name="stampsVariant"]').forEach(r => r.addEventListener('change', updateStampsCalculation));
        document.getElementById('stampsClicheWidth')?.addEventListener('input', updateStampsCalculation);
        document.getElementById('stampsClicheHeight')?.addEventListener('input', updateStampsCalculation);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const band = bandSelect.value;
            const quantity = parseFloat(quantityInput?.value) || 1;
            if (band === 'cliche_only') {
                const w = parseFloat(document.getElementById('stampsClicheWidth')?.value) || 0;
                const h = parseFloat(document.getElementById('stampsClicheHeight')?.value) || 0;
                if (w <= 0 || h <= 0) {
                    Swal.fire('خطأ', 'أدخل العرض والارتفاع (سم)', 'error');
                    return;
                }
                const calc = StampsPricing.calculateCliche(w, h, quantity, clicheSellPerCm2);
                let productionCostTotal = 0;
                try {
                    const costColl = (typeof PricingService !== 'undefined' && PricingService.COST_COLLECTION) ? PricingService.COST_COLLECTION : 'product_prices_cost';
                    const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(costColl) : db.collection(costColl)).doc('Stamps_cliche').get();
                    const costPerCm2 = costDoc.exists && costDoc.data().costPricePerCm2 != null ? costDoc.data().costPricePerCm2 : (typeof StampsPricing.DEFAULT_CLICHE_COST_PER_CM2 !== 'undefined' ? StampsPricing.DEFAULT_CLICHE_COST_PER_CM2 : 0);
                    const costCalc = StampsPricing.calculateCliche(w, h, quantity, costPerCm2);
                    productionCostTotal = costCalc.totalPrice;
                } catch (e) { console.warn('Stamps cliche cost not loaded:', e); }
                const orderProduct = {
                    id: Date.now(),
                    type: 'Stamps',
                    band: 'cliche_only',
                    widthCm: w,
                    heightCm: h,
                    quantity,
                    unitPrice: calc.unitPrice,
                    price: calc.totalPrice,
                    sellingPrice: calc.totalPrice,
                    productionCost: productionCostTotal,
                    calculation: calc
                };
                this.addProduct(orderProduct);
                closeModal('stampsConfigModal');
                Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
                return;
            }
            const docId = sizeSelect.value;
            if (!docId) {
                Swal.fire('خطأ', 'اختر المقاس', 'error');
                return;
            }
            const data = sellByDoc[docId];
            if (!data) {
                Swal.fire('خطأ', 'سعر البيع غير محدد لهذا المقاس', 'error');
                return;
            }
            const variant = document.querySelector('input[name="stampsVariant"]:checked')?.value || 'only';
            const isMachine = band === 'automatic_machine';
            const unitPrice = variant === 'stamp'
                ? (isMachine ? (data.sellPriceMachineStamp || 0) : (data.sellPriceHandleStamp || 0))
                : (isMachine ? (data.sellPriceMachineOnly || 0) : (data.sellPriceHandleOnly || 0));
            const total = unitPrice * quantity;
            const sizeId = data.sizeId || docId.replace('Stamps_' + band + '_', '');
            const productName = data.productNameAr || data.productName || sizeId;
            let productionCostTotal = 0;
            try {
                const costColl = (typeof PricingService !== 'undefined' && PricingService.COST_COLLECTION) ? PricingService.COST_COLLECTION : 'product_prices_cost';
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(costColl) : db.collection(costColl)).doc(docId).get();
                if (costDoc.exists) {
                    const costData = costDoc.data();
                    const costUnit = variant === 'stamp'
                        ? (isMachine ? (costData.costPriceMachineStamp || 0) : (costData.costPriceHandleStamp || 0))
                        : (isMachine ? (costData.costPriceMachineOnly || 0) : (costData.costPriceHandleOnly || 0));
                    productionCostTotal = costUnit * quantity;
                }
            } catch (e) { console.warn('Stamps cost not loaded:', e); }
            const orderProduct = {
                id: Date.now(),
                type: 'Stamps',
                band,
                sizeId,
                productName,
                variant,
                quantity,
                unitPrice,
                price: total,
                sellingPrice: total,
                productionCost: productionCostTotal
            };
            this.addProduct(orderProduct);
            closeModal('stampsConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });

        updateStampsUI();
        openModal('stampsConfigModal');
    },

    async openBusinessCardsConfig() {
        if (typeof BusinessCardsPricing === 'undefined') {
            Swal.fire('خطأ', 'وحدة BusinessCardsPricing غير متاحة', 'error');
            return;
        }
        const content = document.getElementById('businessCardsConfigContent');
        if (!content) {
            Swal.fire('خطأ', 'عنصر واجهة الكروت الشخصية غير موجود', 'error');
            return;
        }
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db) {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات غير متاحة.</p>';
            openModal('businessCardsConfigModal');
            return;
        }

        const configColl = typeof PricingAdmin !== 'undefined' && PricingAdmin.COLLECTION_NAME ? PricingAdmin.COLLECTION_NAME : 'pricing_config';
        let config = {};
        try {
            const configDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(configColl) : db.collection(configColl)).doc(BusinessCardsPricing.CONFIG_DOC).get();
            if (configDoc.exists) config = configDoc.data();
        } catch (e) { console.warn('Business cards config load error:', e); }

        const fromConfig = config.paperTypes || [];
        const existingIds = new Set(fromConfig.map(p => (p.id || p.key)));
        const defaultTypes = BusinessCardsPricing.DEFAULT_PAPER_TYPES || [];
        const missingDefaults = defaultTypes.filter(p => !existingIds.has(p.id));
        const paperTypes = fromConfig.length ? [...fromConfig, ...missingDefaults] : defaultTypes;
        const sizeModifiers = config.sizeModifiers || BusinessCardsPricing.DEFAULT_SIZE_MODIFIERS;

        const sellByDoc = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(BusinessCardsPricing.SELL_COLLECTION) : db.collection(BusinessCardsPricing.SELL_COLLECTION)).get();
            snap.docs.forEach(d => { sellByDoc[d.id] = d.data(); });
        } catch (e) { console.warn('Business cards sell prices load error:', e); }

        const sizeOptions = [
            { w: 9, h: 5, label: '9 × 5 سم (أساسي)' },
            { w: 9, h: 5.5, label: '9 × 5.5 سم (+15%)' },
            { w: 9.5, h: 5.5, label: '9.5 × 5.5 سم (+20%)' }
        ];

        content.innerHTML = `
            <form id="businessCardsConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">نوع الورق <span class="text-red-500">*</span></label>
                    <select id="bcPaperType" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر نوع الورق</option>
                        ${paperTypes.map(p => `<option value="${p.id || p.key || p}">${p.nameAr || p.name || (p.id || p.key || p)}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية (أدخل أي رقم، سيُستخدم أقرب عدد أعلى) <span class="text-red-500">*</span></label>
                    <input type="number" id="bcQuantity" step="1" min="1" value="100" required placeholder="مثال: 150 → 200" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">وجه الطباعة <span class="text-red-500">*</span></label>
                    <div class="flex gap-4">
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="bcSides" value="single" checked class="text-brandGold"> <span>وجه واحد</span></label>
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="bcSides" value="double" class="text-brandGold"> <span>وجهين</span></label>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">مقاس الكارت</label>
                    <select id="bcSize" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        ${sizeOptions.map(s => `<option value="${s.w},${s.h}">${s.label}</option>`).join('')}
                    </select>
                </div>
                <div id="bcCalculationDisplay" class="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <div class="text-center text-gray-500">اختر نوع الورق والكمية</div>
                </div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('businessCardsConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;

        const paperSelect = document.getElementById('bcPaperType');
        const quantityInput = document.getElementById('bcQuantity');
        const sizeSelect = document.getElementById('bcSize');
        const form = document.getElementById('businessCardsConfigForm');
        const display = document.getElementById('bcCalculationDisplay');

        const updateBCCalculation = () => {
            const paperId = paperSelect?.value;
            const qtyInput = parseFloat(quantityInput?.value) || 0;
            const sides = document.querySelector('input[name="bcSides"]:checked')?.value || 'single';
            const sizeVal = sizeSelect?.value || '9,5';
            const [w, h] = sizeVal.split(',').map(Number);

            if (!paperId || qtyInput <= 0) {
                display.innerHTML = '<div class="text-center text-gray-500">اختر نوع الورق وأدخل الكمية</div>';
                return;
            }

            const quantities = config.quantities || BusinessCardsPricing.DEFAULT_QUANTITIES;
            const tierQty = BusinessCardsPricing.getNextHigherQuantity(qtyInput, quantities);
            const docId = BusinessCardsPricing.priceDocId(paperId, String(tierQty), sides);
            const priceData = sellByDoc[docId];
            const basePrice = priceData?.price ?? 0;
            const modifier = BusinessCardsPricing.getSizeModifier(w, h, sizeModifiers);
            const runs = Math.ceil(qtyInput / tierQty);
            const totalPrice = runs * basePrice * modifier;
            const unitPrice = tierQty > 0 ? (basePrice * modifier / tierQty) : 0;

            const paperName = paperTypes.find(p => (p.id || p.key) === paperId)?.nameAr || paperId;
            const sidesLabel = sides === 'single' ? 'وجه واحد' : 'وجهين';
            const modText = modifier > 1 ? ` (معدل المقاس: +${((modifier - 1) * 100).toFixed(0)}%)` : '';

            display.innerHTML = `
                <div class="space-y-1 text-sm">
                    <div class="flex justify-between"><span>نوع الورق:</span><span>${paperName}</span></div>
                    <div class="flex justify-between"><span>الكمية:</span><span>${qtyInput} كارت</span></div>
                    <div class="flex justify-between"><span>المستوى المستخدم:</span><span>${tierQty} كارت/دفعة${modText}</span></div>
                    ${runs > 1 ? `<div class="flex justify-between"><span>عدد الدفعات:</span><span>${runs}</span></div>` : ''}
                    <div class="flex justify-between"><span>${sidesLabel} — سعر ${tierQty} كارت:</span><span>${(basePrice * modifier).toFixed(2)} ج.م</span></div>
                    <div class="flex justify-between font-bold text-brandGold"><span>الإجمالي:</span><span>${totalPrice.toFixed(2)} ج.م</span></div>
                </div>
            `;
        };

        paperSelect?.addEventListener('change', updateBCCalculation);
        quantityInput?.addEventListener('input', updateBCCalculation);
        sizeSelect?.addEventListener('change', updateBCCalculation);
        form?.querySelectorAll('input[name="bcSides"]').forEach(r => r.addEventListener('change', updateBCCalculation));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const paperId = paperSelect.value;
            const qtyInput = Math.ceil(parseFloat(quantityInput?.value) || 0);
            const sides = document.querySelector('input[name="bcSides"]:checked')?.value || 'single';
            const sizeVal = sizeSelect?.value || '9,5';
            const [widthCm, heightCm] = sizeVal.split(',').map(Number);

            if (!paperId || qtyInput <= 0) {
                Swal.fire('خطأ', 'اختر نوع الورق وأدخل الكمية', 'error');
                return;
            }

            const quantities = config.quantities || BusinessCardsPricing.DEFAULT_QUANTITIES;
            const tierQty = BusinessCardsPricing.getNextHigherQuantity(qtyInput, quantities);
            const docId = BusinessCardsPricing.priceDocId(paperId, String(tierQty), sides);
            const priceData = sellByDoc[docId];
            const basePrice = priceData?.price ?? 0;
            if (basePrice <= 0) {
                Swal.fire('خطأ', `لم يتم تحديد سعر البيع لـ ${paperId} - ${tierQty} - ${sides === 'single' ? 'وجه واحد' : 'وجهين'}. حدد السعر من إدارة التسعير أولاً.`, 'error');
                return;
            }

            const modifier = BusinessCardsPricing.getSizeModifier(widthCm, heightCm, sizeModifiers);
            const runs = Math.ceil(qtyInput / tierQty);
            const totalPrice = runs * basePrice * modifier;
            const unitPrice = tierQty > 0 ? (basePrice * modifier / tierQty) : 0;

            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(BusinessCardsPricing.COST_COLLECTION) : db.collection(BusinessCardsPricing.COST_COLLECTION)).doc(docId).get();
                if (costDoc.exists && costDoc.data().price != null) {
                    const costBase = costDoc.data().price;
                    productionCost = runs * costBase * modifier;
                }
            } catch (err) { console.warn('Business cards cost load error:', err); }

            const paperName = paperTypes.find(p => (p.id || p.key) === paperId)?.nameAr || paperId;
            const sidesLabel = sides === 'single' ? 'وجه واحد' : 'وجهين';

            const orderProduct = {
                id: Date.now(),
                type: 'BusinessCard',
                paperTypeId: paperId,
                paperTypeName: paperName,
                quantity: qtyInput,
                tierQuantity: tierQty,
                sides,
                sidesLabel,
                widthCm,
                heightCm,
                unitPrice,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            };

            this.addProduct(orderProduct);
            closeModal('businessCardsConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });

        updateBCCalculation();
        openModal('businessCardsConfigModal');
    },

    async openEnvelopesConfig() {
        const content = document.getElementById('envelopesConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db) {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات غير متاحة.</p>';
            openModal('envelopesConfigModal');
            return;
        }
        const products = (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.PRODUCTS) ? EnvelopesPricing.PRODUCTS : [
            { id: 'american_22_11', nameAr: 'American 22 × 11', supportsInkjet: true },
            { id: 'a5', nameAr: 'A5 (22.9 × 16.2)', supportsInkjet: true },
            { id: 'a4', nameAr: 'A4 (32.4 × 22.9)', supportsInkjet: false },
            { id: 'half_congratulations', nameAr: 'Half Congratulations (17 × 25)', supportsInkjet: true },
            { id: 'congratulations', nameAr: 'Congratulations (25 × 35)', supportsInkjet: false },
            { id: 'a3', nameAr: 'A3 (33 × 45)', supportsInkjet: false }
        ];
        const sellColl = (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.SELL_COLLECTION) ? EnvelopesPricing.SELL_COLLECTION : 'envelopes_prices_sell';
        const costColl = (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.COST_COLLECTION) ? EnvelopesPricing.COST_COLLECTION : 'envelopes_prices_cost';
        const tiers = (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.DEFAULT_QUANTITY_TIERS) ? EnvelopesPricing.DEFAULT_QUANTITY_TIERS : [500, 1000, 1500, 2000, 2500, 3000, 5000, 10000];
        const offsetMin = (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.OFFSET_MIN_QUANTITY) ? EnvelopesPricing.OFFSET_MIN_QUANTITY : 500;
        const platePriceDefault = (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.PLATE_PRICE_PER_COLOR) ? EnvelopesPricing.PLATE_PRICE_PER_COLOR : 50;

        const sellData = {};
        try {
            for (const p of products) {
                const doc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(sellColl) : db.collection(sellColl)).doc(p.id).get();
                if (doc.exists) {
                    const d = doc.data();
                    sellData[p.id] = {
                        quantityTiers: d.quantityTiers || {},
                        platePricePerColor: d.platePricePerColor != null ? d.platePricePerColor : platePriceDefault,
                        inkjetPricePerSheetOneColor: d.inkjetPricePerSheetOneColor != null ? d.inkjetPricePerSheetOneColor : 0,
                        inkjetPricePerSheetFullColor: d.inkjetPricePerSheetFullColor != null ? d.inkjetPricePerSheetFullColor : 0
                    };
                } else {
                    sellData[p.id] = { quantityTiers: {}, platePricePerColor: platePriceDefault, inkjetPricePerSheetOneColor: 0, inkjetPricePerSheetFullColor: 0 };
                }
            }
        } catch (e) { console.warn(e); }

        const getTierForQty = (q) => {
            const n = parseInt(q, 10) || 0;
            for (const t of tiers) { if (n <= t) return t; }
            return tiers[tiers.length - 1];
        };

        content.innerHTML = `
            <form id="envelopesConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">مقاس الظرف <span class="text-red-500">*</span></label>
                    <select id="envelopeSize" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المقاس</option>
                        ${products.map(p => `<option value="${p.id}" data-inkjet="${p.supportsInkjet ? '1' : '0'}">${p.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">نوع الطباعة <span class="text-red-500">*</span></label>
                    <select id="envelopePrintingType" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="offset">أوفست (أقل كمية ${offsetMin})</option>
                        <option value="inkjet" id="envelopeInkjetOption">إنك جيت</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">اللون <span class="text-red-500">*</span></label>
                    <select id="envelopeColor" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="one">لون واحد</option>
                        <option value="full">أربع ألوان (ملون)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="envelopeQuantity" step="1" min="1" value="${offsetMin}" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none" placeholder="أقل كمية أوفست: ${offsetMin}">
                    <p id="envelopeQuantityHint" class="text-xs text-sky-600 mt-1"></p>
                </div>
                <div id="envelopeCalculationDisplay" class="bg-sky-50 p-4 rounded-xl border border-sky-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('envelopesConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;

        const sizeSel = document.getElementById('envelopeSize');
        const printingTypeSel = document.getElementById('envelopePrintingType');
        const colorSel = document.getElementById('envelopeColor');
        const qtyInput = document.getElementById('envelopeQuantity');
        const hintEl = document.getElementById('envelopeQuantityHint');
        const inkjetOption = document.getElementById('envelopeInkjetOption');

        const updateInkjetVisibility = () => {
            const opt = sizeSel?.options[sizeSel?.selectedIndex];
            const supportsInkjet = opt?.dataset?.inkjet === '1';
            if (inkjetOption) inkjetOption.style.display = supportsInkjet ? '' : 'none';
            if (!supportsInkjet && printingTypeSel?.value === 'inkjet') printingTypeSel.value = 'offset';
            if (!supportsInkjet) qtyInput.min = 1;
            else if (printingTypeSel?.value === 'offset') qtyInput.min = offsetMin;
            else qtyInput.min = 1;
            updateEnvelopeCalc();
        };

        const updateEnvelopeCalc = () => {
            const productId = sizeSel?.value;
            if (!productId) { document.getElementById('envelopeCalculationDisplay').innerHTML = 'الإجمالي: 0 ج.م'; return; }
            const data = sellData[productId];
            if (!data) { document.getElementById('envelopeCalculationDisplay').innerHTML = 'الإجمالي: 0 ج.م'; return; }
            const printingType = printingTypeSel?.value || 'offset';
            const colorOption = colorSel?.value || 'one';
            let quantity = parseInt(qtyInput?.value || offsetMin, 10) || 0;

            if (printingType === 'offset') {
                if (quantity < offsetMin) quantity = offsetMin;
                const tier = getTierForQty(quantity);
                const tierPrice = (data.quantityTiers && data.quantityTiers[tier] != null) ? data.quantityTiers[tier] : 0;
                const numColors = colorOption === 'full' ? 4 : 1;
                const plateCost = numColors * (data.platePricePerColor || platePriceDefault);
                const total = tierPrice + plateCost;
                hintEl.textContent = quantity !== tier ? `سيتم احتساب السعر على أساس ${tier} ظرف (أقرب شريحة أعلى)` : '';
                document.getElementById('envelopeCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م ${quantity !== tier ? `(شريحة ${tier})` : ''}`;
            } else {
                const pricePerSheet = colorOption === 'full' ? (data.inkjetPricePerSheetFullColor || 0) : (data.inkjetPricePerSheetOneColor || 0);
                const total = pricePerSheet * quantity;
                hintEl.textContent = '';
                document.getElementById('envelopeCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
            }
        };

        sizeSel?.addEventListener('change', updateInkjetVisibility);
        printingTypeSel?.addEventListener('change', () => {
            qtyInput.min = printingTypeSel.value === 'offset' ? offsetMin : 1;
            if (printingTypeSel.value === 'offset' && parseInt(qtyInput.value, 10) < offsetMin) qtyInput.value = offsetMin;
            updateEnvelopeCalc();
        });
        colorSel?.addEventListener('change', updateEnvelopeCalc);
        qtyInput?.addEventListener('input', updateEnvelopeCalc);

        document.getElementById('envelopesConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = sizeSel.value;
            const product = products.find(p => p.id === productId);
            const printingType = printingTypeSel.value;
            const colorOption = colorSel.value;
            let quantity = parseInt(qtyInput.value || offsetMin, 10) || 0;

            if (printingType === 'offset') {
                if (quantity < offsetMin) {
                    Swal.fire('خطأ', `أقل كمية للأوفست: ${offsetMin} ظرف`, 'error');
                    return;
                }
                quantity = getTierForQty(quantity);
            }

            const data = sellData[productId];
            if (!data) {
                Swal.fire('خطأ', 'لم يتم تحميل أسعار هذا المقاس.', 'error');
                return;
            }

            let totalPrice = 0;
            let tierPrice = 0;
            let plateCost = 0;
            const numColors = colorOption === 'full' ? 4 : 1;

            if (printingType === 'offset') {
                tierPrice = (data.quantityTiers && data.quantityTiers[quantity] != null) ? data.quantityTiers[quantity] : 0;
                plateCost = numColors * (data.platePricePerColor || platePriceDefault);
                totalPrice = tierPrice + plateCost;
            } else {
                const pricePerSheet = colorOption === 'full' ? (data.inkjetPricePerSheetFullColor || 0) : (data.inkjetPricePerSheetOneColor || 0);
                totalPrice = pricePerSheet * quantity;
            }

            if (totalPrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد الأسعار لهذا المقاس. حدد الأسعار من إدارة التسعير أولاً.', 'error');
                return;
            }

            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(costColl) : db.collection(costColl)).doc(productId).get();
                if (costDoc.exists) {
                    const d = costDoc.data();
                    const costTiers = d.quantityTiers || {};
                    const costPlate = d.platePricePerColor != null ? d.platePricePerColor : platePriceDefault;
                    if (printingType === 'offset') {
                        const ct = (costTiers[quantity] != null) ? costTiers[quantity] : 0;
                        productionCost = ct + (numColors * costPlate);
                    } else {
                        const perSheet = colorOption === 'full' ? (d.inkjetPricePerSheetFullColor || 0) : (d.inkjetPricePerSheetOneColor || 0);
                        productionCost = perSheet * quantity;
                    }
                }
            } catch (err) {}

            this.addProduct({
                id: Date.now(),
                type: 'Envelopes',
                productId,
                productName: product?.nameAr || productId,
                printingType,
                colorOption,
                quantity,
                tierPrice: printingType === 'offset' ? tierPrice : null,
                plateCost: printingType === 'offset' ? plateCost : null,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('envelopesConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });

        updateInkjetVisibility();
        updateEnvelopeCalc();
        openModal('envelopesConfigModal');
    },

    async openUVPrintingConfig() {
        const content = document.getElementById('uvPrintingConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('uvPrintingConfigModal');
            return;
        }
        // Load sell base price for 60×90 reference
        let sellBasePrice = 0;
        try {
            const doc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc('UVPrinting_area_base').get();
            if (doc.exists) sellBasePrice = doc.data().sellingPrice || doc.data().price || 0;
        } catch (e) {}
        // Load cost base price
        let costBasePrice = 0;
        try {
            const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc('UVPrinting_area_base').get();
            if (costDoc.exists) costBasePrice = costDoc.data().costPrice || costDoc.data().price || 0;
        } catch (e) {}

        content.innerHTML = `
            <form id="uvPrintingConfigForm" class="space-y-4">
                <p class="text-gray-600">المقاس المرجعي: 60×90 سم. أدخل العرض والطول بالسنتيمتر.</p>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">العرض (سم) <span class="text-red-500">*</span></label>
                        <input type="number" id="uvWidth" step="0.1" min="1" required placeholder="مثال: 120" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">الطول (سم) <span class="text-red-500">*</span></label>
                        <input type="number" id="uvHeight" step="0.1" min="1" required placeholder="مثال: 100" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="uvQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="uvCalculationDisplay" class="bg-violet-50 p-4 rounded-xl border border-violet-200 space-y-1">
                    <div class="text-lg font-bold text-center">الإجمالي: 0 ج.م</div>
                    <div class="text-sm text-gray-500 text-center" id="uvUnitPriceDisplay"></div>
                </div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('uvPrintingConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const sbp = sellBasePrice;
        const cbp = costBasePrice;
        const P = (typeof UVPrintingPricing !== 'undefined') ? UVPrintingPricing : null;
        const updateUVCalc = () => {
            const w = parseFloat(document.getElementById('uvWidth')?.value) || 0;
            const h = parseFloat(document.getElementById('uvHeight')?.value) || 0;
            const qty = parseInt(document.getElementById('uvQuantity')?.value || 1, 10);
            let unitPrice = 0, total = 0;
            if (P) {
                const res = P.calculate(w, h, qty, sbp);
                unitPrice = res.unitPrice;
                total = res.totalPrice;
            } else {
                unitPrice = (w * h) / (60 * 90) * sbp;
                total = unitPrice * qty;
            }
            document.getElementById('uvCalculationDisplay').querySelector('.text-lg').textContent = `الإجمالي: ${total.toFixed(2)} ج.م`;
            document.getElementById('uvUnitPriceDisplay').textContent = `سعر القطعة: ${unitPrice.toFixed(2)} ج.م`;
        };
        document.getElementById('uvWidth')?.addEventListener('input', updateUVCalc);
        document.getElementById('uvHeight')?.addEventListener('input', updateUVCalc);
        document.getElementById('uvQuantity')?.addEventListener('input', updateUVCalc);
        document.getElementById('uvPrintingConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const w = parseFloat(document.getElementById('uvWidth')?.value) || 0;
            const h = parseFloat(document.getElementById('uvHeight')?.value) || 0;
            const qty = parseInt(document.getElementById('uvQuantity')?.value || 1, 10);
            if (w <= 0 || h <= 0) { Swal.fire('خطأ', 'أدخل العرض والطول', 'error'); return; }
            if (sbp <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد السعر المرجعي. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            const sellRes = P ? P.calculate(w, h, qty, sbp) : { unitPrice: (w*h)/(60*90)*sbp, totalPrice: ((w*h)/(60*90)*sbp)*qty };
            const costRes = P ? P.calculate(w, h, qty, cbp) : { unitPrice: (w*h)/(60*90)*cbp, totalPrice: ((w*h)/(60*90)*cbp)*qty };
            this.addProduct({
                id: Date.now(),
                type: 'UVPrinting',
                widthCm: w,
                heightCm: h,
                quantity: qty,
                unitPrice: sellRes.unitPrice,
                price: sellRes.totalPrice,
                sellingPrice: sellRes.totalPrice,
                productionCost: costRes.totalPrice
            });
            closeModal('uvPrintingConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateUVCalc();
        openModal('uvPrintingConfigModal');
    },

    async openTableauxConfig() {
        const content = document.getElementById('tableauxConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('tableauxConfigModal');
            return;
        }
        const products = (typeof TableauPricing !== 'undefined' && TableauPricing.SIZES ? TableauPricing.SIZES : [
            { id: '20x30_straight', nameAr: 'تابلوة 20×30 (خشب عدل)' },
            { id: '20x30_beveled', nameAr: 'تابلوة 20×30 (خشب مشطوف)' },
            { id: '30x40_straight', nameAr: 'تابلوة 30×40 (خشب عدل)' },
            { id: '30x40_beveled', nameAr: 'تابلوة 30×40 (خشب مشطوف)' },
            { id: '40x50_straight', nameAr: 'تابلوة 40×50 (خشب عدل)' },
            { id: '40x50_beveled', nameAr: 'تابلوة 40×50 (خشب مشطوف)' },
            { id: '50x60_straight', nameAr: 'تابلوة 50×60 (خشب عدل)' },
            { id: '50x60_beveled', nameAr: 'تابلوة 50×60 (خشب مشطوف)' },
            { id: '50x70_straight', nameAr: 'تابلوة 50×70 (خشب عدل)' },
            { id: '50x70_beveled', nameAr: 'تابلوة 50×70 (خشب مشطوف)' }
        ]).map(p => ({ id: p.id, name: p.nameAr || p.name }));
        if (products.length === 0) {
            content.innerHTML = '<p class="text-red-600">لا توجد منتجات للتابلوةات.</p>';
            openModal('tableauxConfigModal');
            return;
        }
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'Tableaux').get();
            snap.docs.forEach(d => { const d_ = d.data(); prices[d_.productId || d.id.replace('Tableaux_', '')] = d_.sellingPrice || d_.price || 0; });
        } catch (e) {}
        content.innerHTML = `
            <form id="tableauxConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">المنتج <span class="text-red-500">*</span></label>
                    <select id="tableauxProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر التابلوة</option>
                        ${products.map(p => `<option value="${p.id}" data-price="${prices[p.id] || 0}">${p.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="tableauxQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="tableauxCalculationDisplay" class="bg-amber-50 p-4 rounded-xl border border-amber-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('tableauxConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const updateTableauxCalc = () => {
            const sel = document.getElementById('tableauxProduct');
            const qty = parseInt(document.getElementById('tableauxQuantity')?.value || 1, 10);
            const price = parseFloat(sel?.options[sel?.selectedIndex]?.dataset?.price || 0) || 0;
            const total = price * qty;
            document.getElementById('tableauxCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        document.getElementById('tableauxProduct')?.addEventListener('change', updateTableauxCalc);
        document.getElementById('tableauxQuantity')?.addEventListener('input', updateTableauxCalc);
        document.getElementById('tableauxConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = document.getElementById('tableauxProduct').value;
            const quantity = parseInt(document.getElementById('tableauxQuantity')?.value || 1, 10);
            const product = products.find(p => p.id === productId);
            const unitPrice = parseFloat(document.getElementById('tableauxProduct').options[document.getElementById('tableauxProduct').selectedIndex]?.dataset?.price || 0) || 0;
            const totalPrice = unitPrice * quantity;
            if (unitPrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع لهذا المنتج. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`Tableaux_${productId}`).get();
                if (costDoc.exists) productionCost = (costDoc.data().costPrice || costDoc.data().price || 0) * quantity;
            } catch (err) {}
            this.addProduct({
                id: Date.now(),
                type: 'Tableaux',
                productId,
                productName: product?.name || productId,
                quantity,
                unitPrice,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('tableauxConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateTableauxCalc();
        openModal('tableauxConfigModal');
    },

    async openDTFConfig() {
        const content = document.getElementById('dtfConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('dtfConfigModal');
            return;
        }
        let pricePerMeter = (typeof DTFPrintingPricing !== 'undefined' ? DTFPrintingPricing.DEFAULT_PRICE_PER_METER : 135);
        try {
            const doc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).doc('DTF_meter').get();
            if (doc.exists) pricePerMeter = doc.data().sellingPrice || doc.data().price || pricePerMeter;
        } catch (e) {}
        content.innerHTML = `
            <form id="dtfConfigForm" class="space-y-4">
                <p class="text-gray-600">العرض ثابت 60 سم. أدخل الطول بالمتر.</p>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الطول (متر) <span class="text-red-500">*</span></label>
                    <input type="number" id="dtfLength" step="0.01" min="0.01" required placeholder="مثال: 1.5" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="dtfQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="dtfCalculationDisplay" class="bg-pink-50 p-4 rounded-xl border border-pink-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('dtfConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const ppm = pricePerMeter;
        const updateDTFCalc = () => {
            const len = parseFloat(document.getElementById('dtfLength')?.value || 0) || 0;
            const qty = parseInt(document.getElementById('dtfQuantity')?.value || 1, 10);
            const total = len * ppm * qty;
            document.getElementById('dtfCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        document.getElementById('dtfLength')?.addEventListener('input', updateDTFCalc);
        document.getElementById('dtfQuantity')?.addEventListener('input', updateDTFCalc);
        document.getElementById('dtfConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const lengthMeters = parseFloat(document.getElementById('dtfLength')?.value || 0) || 0;
            const quantity = parseInt(document.getElementById('dtfQuantity')?.value || 1, 10);
            if (lengthMeters <= 0) { Swal.fire('خطأ', 'أدخل الطول بالمتر', 'error'); return; }
            const totalPrice = lengthMeters * ppm * quantity;
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc('DTF_meter').get();
                if (costDoc.exists) {
                    const costPpm = costDoc.data().costPrice || costDoc.data().price || 0;
                    productionCost = lengthMeters * costPpm * quantity;
                }
            } catch (err) {}
            this.addProduct({
                id: Date.now(),
                type: 'DTF',
                lengthMeters,
                quantity,
                unitPrice: ppm,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost,
                fixedWidthCm: 60
            });
            closeModal('dtfConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateDTFCalc();
        openModal('dtfConfigModal');
    },

    async openFlagsConfig() {
        const content = document.getElementById('flagsConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('flagsConfigModal');
            return;
        }
        const fixedProducts = (typeof FlagsPricing !== 'undefined' && FlagsPricing.FIXED_PRODUCTS) ? FlagsPricing.FIXED_PRODUCTS : [
            { id: 'flag_2.5_feather', nameAr: 'علم 2.5 متر (ريشة)' },
            { id: 'stand_only_2.5_feather', nameAr: 'ستان فقط 2.5 متر (ريشة)' },
            { id: 'flag_4_feather', nameAr: 'علم 4 متر (ريشة)' },
            { id: 'stand_only_4_feather', nameAr: 'ستان فقط 4 متر (ريشة)' },
            { id: 'flag_pole', nameAr: 'علم سارى' },
            { id: 'flag_wave', nameAr: 'علم تلويح' },
            { id: 'flag_desk_single', nameAr: 'علم مكتب فردى' },
            { id: 'flag_desk_double', nameAr: 'علم مكتب مجوز' },
            { id: 'flag_desk_large', nameAr: 'علم مكتب كبير' },
            { id: 'base_feather_only', nameAr: 'قاعدة علم ريشة فقط' },
            { id: 'pole_feather_only', nameAr: 'سارى علم ريشة فقط' }
        ];
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'Flag').get();
            snap.docs.forEach(d => { const d_ = d.data(); prices[d_.productId || d.id.replace('Flag_', '')] = d_.sellingPrice || d_.price || 0; });
        } catch (e) {}
        const trigalSell = prices.trigal_meter || 0;
        content.innerHTML = `
            <form id="flagsConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">نوع المنتج <span class="text-red-500">*</span></label>
                    <select id="flagProductType" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر نوع المنتج</option>
                        <optgroup label="منتجات بسعر ثابت">
                            ${fixedProducts.map(p => `<option value="fixed_${p.id}" data-price="${prices[p.id] || 0}">${p.nameAr}</option>`).join('')}
                        </optgroup>
                        <optgroup label="ستان ترجال (حسب المقاس)">
                            <option value="trigal">ستان ترجال — طول × عرض × سعر/م²</option>
                        </optgroup>
                    </select>
                </div>
                <div id="flagsFixedSection">
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="flagQuantity" step="1" min="1" value="1" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="flagsTrigalSection" class="hidden-section">
                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">الطول (م)</label>
                            <input type="number" id="flagLength" step="0.01" min="0.01" placeholder="0" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">العرض (م)</label>
                            <input type="number" id="flagWidth" step="0.01" min="0.01" placeholder="0" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">الكمية</label>
                            <input type="number" id="flagTrigalQuantity" step="1" min="1" value="1" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                    </div>
                </div>
                <div id="flagsCalculationDisplay" class="bg-blue-50 p-4 rounded-xl border border-blue-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('flagsConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const productSelect = document.getElementById('flagProductType');
        const fixedSection = document.getElementById('flagsFixedSection');
        const trigalSection = document.getElementById('flagsTrigalSection');
        const updateFlagsCalc = () => {
            const val = productSelect?.value || '';
            const display = document.getElementById('flagsCalculationDisplay');
            if (val.startsWith('fixed_')) {
                const productId = val.replace('fixed_', '');
                const price = parseFloat(productSelect?.options[productSelect?.selectedIndex]?.dataset?.price || 0) || 0;
                const qty = parseInt(document.getElementById('flagQuantity')?.value || 1, 10);
                const total = price * qty;
                display.innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
            } else if (val === 'trigal') {
                const len = parseFloat(document.getElementById('flagLength')?.value || 0) || 0;
                const wid = parseFloat(document.getElementById('flagWidth')?.value || 0) || 0;
                const qty = parseInt(document.getElementById('flagTrigalQuantity')?.value || 1, 10);
                const total = len * wid * trigalSell * qty;
                display.innerHTML = `المساحة: ${(len * wid).toFixed(2)} م² × ${trigalSell.toFixed(2)} ج.م/م² × ${qty} = ${total.toFixed(2)} ج.م`;
            } else {
                display.innerHTML = 'الإجمالي: 0 ج.م';
            }
        };
        productSelect?.addEventListener('change', () => {
            const val = productSelect?.value || '';
            if (val === 'trigal') {
                fixedSection.classList.add('hidden-section');
                trigalSection.classList.remove('hidden-section');
            } else {
                fixedSection.classList.remove('hidden-section');
                trigalSection.classList.add('hidden-section');
            }
            updateFlagsCalc();
        });
        document.getElementById('flagQuantity')?.addEventListener('input', updateFlagsCalc);
        document.getElementById('flagLength')?.addEventListener('input', updateFlagsCalc);
        document.getElementById('flagWidth')?.addEventListener('input', updateFlagsCalc);
        document.getElementById('flagTrigalQuantity')?.addEventListener('input', updateFlagsCalc);
        document.getElementById('flagsConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const val = productSelect?.value || '';
            if (!val) { Swal.fire('خطأ', 'اختر نوع المنتج', 'error'); return; }
            if (val.startsWith('fixed_')) {
                const productId = val.replace('fixed_', '');
                const product = fixedProducts.find(p => p.id === productId);
                const unitPrice = parseFloat(productSelect?.options[productSelect?.selectedIndex]?.dataset?.price || 0) || 0;
                const quantity = parseInt(document.getElementById('flagQuantity')?.value || 1, 10);
                if (unitPrice <= 0) {
                    Swal.fire('خطأ', 'لم يتم تحديد سعر البيع لهذا المنتج. حدد السعر من إدارة التسعير أولاً.', 'error');
                    return;
                }
                const totalPrice = unitPrice * quantity;
                let productionCost = 0;
                try {
                    const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`Flag_${productId}`).get();
                    if (costDoc.exists) productionCost = (costDoc.data().costPrice || costDoc.data().price || 0) * quantity;
                } catch (err) {}
                this.addProduct({
                    id: Date.now(),
                    type: 'Flag',
                    productId,
                    productName: product?.nameAr || productId,
                    quantity,
                    unitPrice,
                    price: totalPrice,
                    sellingPrice: totalPrice,
                    productionCost
                });
            } else if (val === 'trigal') {
                const lengthM = parseFloat(document.getElementById('flagLength')?.value || 0) || 0;
                const widthM = parseFloat(document.getElementById('flagWidth')?.value || 0) || 0;
                const quantity = parseInt(document.getElementById('flagTrigalQuantity')?.value || 1, 10);
                if (lengthM <= 0 || widthM <= 0) {
                    Swal.fire('خطأ', 'أدخل الطول والعرض بالمتر', 'error');
                    return;
                }
                if (trigalSell <= 0) {
                    Swal.fire('خطأ', 'لم يتم تحديد سعر المتر² لستان ترجال. حدد السعر من إدارة التسعير أولاً.', 'error');
                    return;
                }
                const calc = typeof FlagsPricing !== 'undefined' ? FlagsPricing.calculateTrigal(lengthM, widthM, quantity, trigalSell) : { totalPrice: lengthM * widthM * trigalSell * quantity };
                let productionCost = 0;
                try {
                    const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc('Flag_trigal_meter').get();
                    if (costDoc.exists) {
                        const costPps = costDoc.data().costPrice || costDoc.data().price || 0;
                        productionCost = lengthM * widthM * costPps * quantity;
                    }
                } catch (err) {}
                this.addProduct({
                    id: Date.now(),
                    type: 'Flag',
                    productId: 'trigal_meter',
                    productName: 'ستان ترجال',
                    lengthM,
                    widthM,
                    quantity,
                    unitPrice: trigalSell,
                    price: calc.totalPrice,
                    sellingPrice: calc.totalPrice,
                    productionCost,
                    area: lengthM * widthM
                });
            }
            closeModal('flagsConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateFlagsCalc();
        openModal('flagsConfigModal');
    },

    async openTShirtConfig() {
        const content = document.getElementById('tshirtConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('tshirtConfigModal');
            return;
        }
        const baseProducts = (typeof TShirtPricing !== 'undefined' && TShirtPricing.BASE_PRODUCTS) ? TShirtPricing.BASE_PRODUCTS : [
            { id: 'basic_short', nameAr: 'تيشرت بيزك نص كم' },
            { id: 'basic_long', nameAr: 'تيشرت بيزك كم طويل' },
            { id: 'polo_short', nameAr: 'تيشرت بولو نص كم' },
            { id: 'polo_long', nameAr: 'تيشرت بولو كم طويل' },
            { id: 'hoodie_local', nameAr: 'هودي محلي' },
            { id: 'hoodie_imported', nameAr: 'هودي مستورد' }
        ];
        const printingOptions = (typeof TShirtPricing !== 'undefined' && TShirtPricing.PRINTING_OPTIONS) ? TShirtPricing.PRINTING_OPTIONS : [
            { id: 'printing_one_side', nameAr: 'طباعة وجه واحد' },
            { id: 'printing_front_back', nameAr: 'طباعة وجهين' }
        ];
        const pressingOptions = (typeof TShirtPricing !== 'undefined' && TShirtPricing.PRESSING_OPTIONS) ? TShirtPricing.PRESSING_OPTIONS : [
            { id: 'pressing_one_side', nameAr: 'كبس وجه واحد' },
            { id: 'pressing_two_sides', nameAr: 'كبس وجهين' }
        ];
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'TShirt').get();
            snap.docs.forEach(d => { const d_ = d.data(); prices[d_.productId || d.id.replace('TShirt_', '')] = d_.sellingPrice || d_.price || 0; });
        } catch (e) {}
        content.innerHTML = `
            <form id="tshirtConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">نوع التيشرت <span class="text-red-500">*</span></label>
                    <select id="tshirtBase" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر التيشرت</option>
                        ${baseProducts.map(p => `<option value="${p.id}" data-price="${prices[p.id] || 0}">${p.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">طباعة (اختياري)</label>
                    <select id="tshirtPrinting" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="" data-price="0">لا طباعة</option>
                        ${printingOptions.map(p => `<option value="${p.id}" data-price="${prices[p.id] || 0}">${p.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">كبس (اختياري)</label>
                    <select id="tshirtPressing" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="" data-price="0">لا كبس</option>
                        ${pressingOptions.map(p => `<option value="${p.id}" data-price="${prices[p.id] || 0}">${p.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="tshirtQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="tshirtCalculationDisplay" class="bg-violet-50 p-4 rounded-xl border border-violet-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('tshirtConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const updateTShirtCalc = () => {
            const baseSel = document.getElementById('tshirtBase');
            const printSel = document.getElementById('tshirtPrinting');
            const pressSel = document.getElementById('tshirtPressing');
            const qty = parseInt(document.getElementById('tshirtQuantity')?.value || 1, 10);
            const basePrice = parseFloat(baseSel?.options[baseSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const printPrice = parseFloat(printSel?.options[printSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const pressPrice = parseFloat(pressSel?.options[pressSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const total = (basePrice + printPrice + pressPrice) * qty;
            document.getElementById('tshirtCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        document.getElementById('tshirtBase')?.addEventListener('change', updateTShirtCalc);
        document.getElementById('tshirtPrinting')?.addEventListener('change', updateTShirtCalc);
        document.getElementById('tshirtPressing')?.addEventListener('change', updateTShirtCalc);
        document.getElementById('tshirtQuantity')?.addEventListener('input', updateTShirtCalc);
        document.getElementById('tshirtConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const baseId = document.getElementById('tshirtBase').value;
            const printId = document.getElementById('tshirtPrinting').value || null;
            const pressId = document.getElementById('tshirtPressing').value || null;
            const quantity = parseInt(document.getElementById('tshirtQuantity')?.value || 1, 10);
            const baseProduct = baseProducts.find(p => p.id === baseId);
            const basePrice = parseFloat(document.getElementById('tshirtBase').options[document.getElementById('tshirtBase').selectedIndex]?.dataset?.price || 0) || 0;
            const printPrice = printId ? (parseFloat(document.getElementById('tshirtPrinting').options[document.getElementById('tshirtPrinting').selectedIndex]?.dataset?.price || 0) || 0) : 0;
            const pressPrice = pressId ? (parseFloat(document.getElementById('tshirtPressing').options[document.getElementById('tshirtPressing').selectedIndex]?.dataset?.price || 0) || 0) : 0;
            if (basePrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع للتيشرت. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            const totalPrice = (basePrice + printPrice + pressPrice) * quantity;
            let productionCost = 0;
            try {
                const baseCostDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`TShirt_${baseId}`).get();
                const baseCost = baseCostDoc.exists ? (baseCostDoc.data().costPrice ?? baseCostDoc.data().price ?? 0) : 0;
                let printCost = 0;
                if (printId) {
                    const pc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`TShirt_${printId}`).get();
                    printCost = pc.exists ? (pc.data().costPrice ?? pc.data().price ?? 0) : 0;
                }
                let pressCost = 0;
                if (pressId) {
                    const prc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`TShirt_${pressId}`).get();
                    pressCost = prc.exists ? (prc.data().costPrice ?? prc.data().price ?? 0) : 0;
                }
                productionCost = (baseCost + printCost + pressCost) * quantity;
            } catch (err) {}
            const printingName = printId ? (printingOptions.find(p => p.id === printId)?.nameAr || printId) : null;
            const pressingName = pressId ? (pressingOptions.find(p => p.id === pressId)?.nameAr || pressId) : null;
            this.addProduct({
                id: Date.now(),
                type: 'TShirt',
                productId: baseId,
                productName: baseProduct?.nameAr || baseId,
                printingId: printId,
                printingName,
                pressingId: pressId,
                pressingName,
                quantity,
                basePrice,
                printingPrice: printPrice,
                pressingPrice: pressPrice,
                unitPrice: basePrice + printPrice + pressPrice,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('tshirtConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateTShirtCalc();
        openModal('tshirtConfigModal');
    },

    async openFabricBagConfig() {
        const content = document.getElementById('fabricBagConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('fabricBagConfigModal');
            return;
        }
        const baseSizes = (typeof FabricBagPricing !== 'undefined' && FabricBagPricing.BASE_SIZES) ? FabricBagPricing.BASE_SIZES : [];
        const printingOptions = (typeof FabricBagPricing !== 'undefined' && FabricBagPricing.PRINTING_OPTIONS) ? FabricBagPricing.PRINTING_OPTIONS : [
            { id: 'silk_one_side_one_color', nameAr: 'سكرين وجه واحد لون واحد' },
            { id: 'silk_two_sides_one_color', nameAr: 'سكرين وجهين لون واحد' },
            { id: 'dtf_one_side_full_colors', nameAr: 'DTF وجه واحد ألوان كاملة' },
            { id: 'dtf_two_sides_full_colors', nameAr: 'DTF وجهين ألوان كاملة' }
        ];
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'FabricBag').get();
            snap.docs.forEach(d => {
                const d_ = d.data();
                const pid = d_.productId || d.id.replace('FabricBag_', '');
                prices[pid] = d_.sellingPrice || d_.price || 0;
            });
        } catch (e) {}
        const getPrintingProductId = (sizeId, optId) => (typeof FabricBagPricing !== 'undefined' && FabricBagPricing.getPrintingProductId) ? FabricBagPricing.getPrintingProductId(sizeId, optId) : `${sizeId}_${optId}`;
        const buildPrintingSelect = (sizeId) => {
            const opts = printingOptions.map(p => {
                const printProdId = getPrintingProductId(sizeId, p.id);
                const price = prices[printProdId] || 0;
                return `<option value="${p.id}" data-price="${price}" data-printprodid="${printProdId}">${p.nameAr}</option>`;
            }).join('');
            return `<option value="" data-price="0">لا طباعة</option>${opts}`;
        };
        content.innerHTML = `
            <form id="fabricBagConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">مقاس الشنطة <span class="text-red-500">*</span></label>
                    <select id="fabricBagSize" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المقاس</option>
                        ${baseSizes.map(s => `<option value="${s.id}" data-price="${prices[s.id] || 0}">${s.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">طباعة (اختياري)</label>
                    <select id="fabricBagPrinting" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        ${buildPrintingSelect(baseSizes[0]?.id || '16x22')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="fabricBagQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="fabricBagCalculationDisplay" class="bg-green-50 p-4 rounded-xl border border-green-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('fabricBagConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const sizeSel = document.getElementById('fabricBagSize');
        const printSel = document.getElementById('fabricBagPrinting');
        const updateFabricBagPrintingOptions = () => {
            const sizeId = sizeSel?.value || baseSizes[0]?.id || '16x22';
            if (printSel) {
                printSel.innerHTML = buildPrintingSelect(sizeId);
            }
            updateFabricBagCalc();
        };
        const updateFabricBagCalc = () => {
            const qty = parseInt(document.getElementById('fabricBagQuantity')?.value || 1, 10);
            const basePrice = parseFloat(sizeSel?.options[sizeSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const printPrice = parseFloat(printSel?.options[printSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const total = (basePrice + printPrice) * qty;
            const disp = document.getElementById('fabricBagCalculationDisplay');
            if (disp) disp.innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        sizeSel?.addEventListener('change', updateFabricBagPrintingOptions);
        printSel?.addEventListener('change', updateFabricBagCalc);
        document.getElementById('fabricBagQuantity')?.addEventListener('input', updateFabricBagCalc);
        document.getElementById('fabricBagConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const sizeId = sizeSel.value;
            const printId = printSel.value || null;
            const quantity = parseInt(document.getElementById('fabricBagQuantity')?.value || 1, 10);
            const sizeProduct = baseSizes.find(s => s.id === sizeId);
            const basePrice = parseFloat(sizeSel.options[sizeSel.selectedIndex]?.dataset?.price || 0) || 0;
            const printPrice = printId ? (parseFloat(printSel.options[printSel.selectedIndex]?.dataset?.price || 0) || 0) : 0;
            if (basePrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع للشنطة. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            const totalPrice = (basePrice + printPrice) * quantity;
            let productionCost = 0;
            try {
                const baseCostDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`FabricBag_${sizeId}`).get();
                const baseCost = baseCostDoc.exists ? (baseCostDoc.data().costPrice ?? baseCostDoc.data().price ?? 0) : 0;
                let printCost = 0;
                if (printId) {
                    const printProdId = getPrintingProductId(sizeId, printId);
                    const pc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`FabricBag_${printProdId}`).get();
                    printCost = pc.exists ? (pc.data().costPrice ?? pc.data().price ?? 0) : 0;
                }
                productionCost = (baseCost + printCost) * quantity;
            } catch (err) {}
            const printingName = printId ? (printingOptions.find(p => p.id === printId)?.nameAr || printId) : null;
            this.addProduct({
                id: Date.now(),
                type: 'FabricBag',
                productId: sizeId,
                productName: sizeProduct?.nameAr || sizeId,
                printingId: printId,
                printingName,
                quantity,
                basePrice,
                printingPrice: printPrice,
                unitPrice: basePrice + printPrice,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('fabricBagConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateFabricBagCalc();
        openModal('fabricBagConfigModal');
    },

    async openIDCardConfig() {
        const content = document.getElementById('idCardConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('idCardConfigModal');
            return;
        }
        const idCard = typeof IDCardPricing !== 'undefined' ? IDCardPricing : null;
        const ranges = idCard?.RANGES || [];
        const specialTypes = idCard?.SPECIAL_TYPES || [
            { id: 'encrypted_one_side', nameAr: 'كارنيه مشفر وجه واحد' },
            { id: 'encrypted_two_sides', nameAr: 'كارنيه مشفر وجهين' }
        ];
        const addons = idCard?.ADDONS || [
            { id: 'plastic_holder', nameAr: 'غطاء بلاستيك' },
            { id: 'plain_lanyard', nameAr: 'خيط عادي' },
            { id: 'lanyard_printed_one_color', nameAr: 'خيط مطبوع لون واحد' },
            { id: 'lanyard_printed_full_color', nameAr: 'خيط مطبوع ألوان كاملة' }
        ];
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'IDCard').get();
            snap.docs.forEach(d => {
                const d_ = d.data();
                const pid = d_.productId || d.id.replace('IDCard_', '');
                prices[pid] = d_.sellingPrice || d_.price || 0;
            });
        } catch (e) {}
        const addonCheckboxesHtml = addons.map(a => `
            <label class="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50">
                <input type="checkbox" id="idcard_addon_${a.id}" class="idcard-addon-cb w-4 h-4 text-brandGold rounded" data-addonid="${a.id}" data-price="${prices[a.id] || 0}">
                <span class="text-sm font-medium">${a.nameAr}</span>
            </label>
        `).join('');
        content.innerHTML = `
            <form id="idCardConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">نوع الكارنيه <span class="text-red-500">*</span></label>
                    <select id="idCardType" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="standard">كارنيه عادي (حسب الكمية)</option>
                        ${specialTypes.map(s => `<option value="${s.id}" data-price="${prices[s.id] || 0}">${s.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="idCardQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="idCardRangeInfo" class="text-sm text-gray-600 hidden">النطاق: <span id="idCardRangeText"></span></div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-2">إضافات (اختياري)</label>
                    <div class="border border-gray-200 rounded-xl p-3 space-y-1">${addonCheckboxesHtml}</div>
                </div>
                <div id="idCardCalculationDisplay" class="bg-slate-50 p-4 rounded-xl border border-slate-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('idCardConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const typeSel = document.getElementById('idCardType');
        const qtyInput = document.getElementById('idCardQuantity');
        const rangeInfo = document.getElementById('idCardRangeInfo');
        const rangeText = document.getElementById('idCardRangeText');
        const getBasePricePerCard = () => {
            const type = typeSel?.value || 'standard';
            const qty = parseInt(qtyInput?.value || 1, 10);
            if (type === 'standard') {
                const range = idCard?.getRangeForQuantity?.(qty);
                if (!range) return { price: 0, rangeName: null };
                return { price: prices[range.id] || 0, rangeName: range.nameAr, rangeId: range.id };
            }
            const opt = typeSel?.options[typeSel?.selectedIndex];
            return { price: parseFloat(opt?.dataset?.price || 0) || 0, rangeName: null, rangeId: type };
        };
        const getAddonsTotal = () => {
            let sum = 0;
            document.querySelectorAll('.idcard-addon-cb:checked').forEach(cb => {
                sum += parseFloat(cb.dataset?.price || 0) || 0;
            });
            return sum;
        };
        const updateIDCardCalc = () => {
            const qty = parseInt(qtyInput?.value || 1, 10);
            const type = typeSel?.value || 'standard';
            const { price: basePerCard, rangeName, rangeId } = getBasePricePerCard();
            if (type === 'standard' && rangeName) {
                rangeInfo?.classList.remove('hidden');
                if (rangeText) rangeText.textContent = rangeName;
            } else {
                rangeInfo?.classList.add('hidden');
            }
            const addonsPerUnit = getAddonsTotal();
            const total = (basePerCard + addonsPerUnit) * qty;
            const disp = document.getElementById('idCardCalculationDisplay');
            if (disp) disp.innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        typeSel?.addEventListener('change', updateIDCardCalc);
        qtyInput?.addEventListener('input', updateIDCardCalc);
        document.querySelectorAll('.idcard-addon-cb').forEach(cb => cb.addEventListener('change', updateIDCardCalc));
        document.getElementById('idCardConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = typeSel.value;
            const quantity = parseInt(qtyInput?.value || 1, 10);
            const { price: basePerCard, rangeName, rangeId } = getBasePricePerCard();
            if (basePerCard <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع. حدد الأسعار من إدارة التسعير أولاً.', 'error');
                return;
            }
            const addonsPerUnit = getAddonsTotal();
            const totalPrice = (basePerCard + addonsPerUnit) * quantity;
            const selectedAddons = [];
            document.querySelectorAll('.idcard-addon-cb:checked').forEach(cb => {
                const addonId = cb.dataset?.addonid;
                const addon = addons.find(a => a.id === addonId);
                selectedAddons.push({ addonId, addonName: addon?.nameAr || addonId, pricePerUnit: parseFloat(cb.dataset?.price || 0) || 0 });
            });
            let productionCost = 0;
            try {
                const baseCostDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`IDCard_${rangeId}`).get();
                const baseCostPerCard = baseCostDoc.exists ? (baseCostDoc.data().costPrice ?? baseCostDoc.data().price ?? 0) : 0;
                let addonsCost = 0;
                for (const a of selectedAddons) {
                    const ac = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`IDCard_${a.addonId}`).get();
                    addonsCost += ac.exists ? (ac.data().costPrice ?? ac.data().price ?? 0) : 0;
                }
                productionCost = (baseCostPerCard + addonsCost) * quantity;
            } catch (err) {}
            const productName = type === 'standard' ? (`كارنيه عادي ${rangeName || ''}`.trim()) : (specialTypes.find(s => s.id === type)?.nameAr || type);
            this.addProduct({
                id: Date.now(),
                type: 'IDCard',
                productType: type === 'standard' ? 'standard' : 'special',
                productId: rangeId,
                productName,
                quantity,
                basePricePerCard: basePerCard,
                addons: selectedAddons,
                addonsTotalPerUnit: addonsPerUnit,
                unitPrice: basePerCard + addonsPerUnit,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('idCardConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateIDCardCalc();
        openModal('idCardConfigModal');
    },

    async openZikrMedalConfig() {
        const content = document.getElementById('zikrMedalConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('zikrMedalConfigModal');
            return;
        }
        const zikr = typeof ZikrMedalPricing !== 'undefined' ? ZikrMedalPricing : null;
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'ZikrMedal').get();
            snap.docs.forEach(d => {
                const d_ = d.data();
                const pid = d_.productId || d.id.replace('ZikrMedal_', '');
                prices[pid] = d_.sellingPrice ?? d_.price ?? 0;
            });
        } catch (e) {}
        content.innerHTML = `
            <form id="zikrMedalConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <div class="flex gap-2">
                        <input type="number" id="zikrMedalQuantity" step="1" min="1" value="50" required placeholder="أدخل الكمية" class="flex-1 border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <button type="button" id="zikrMedalIncrementBtn" class="px-4 py-3 bg-brandGold text-white rounded-xl font-bold hover:bg-brandGoldDark transition">+</button>
                    </div>
                </div>
                <div id="zikrMedalGiftSection" class="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div class="text-sm font-bold text-amber-800 mb-1">العرض المطبق:</div>
                    <div id="zikrMedalAppliedOffer" class="text-amber-900 font-medium">—</div>
                    <div id="zikrMedalGiftDisplay" class="text-sm text-amber-700 mt-1">—</div>
                </div>
                <div id="zikrMedalExtraPaperSection" class="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <label class="flex items-center gap-2 cursor-pointer mb-3">
                        <input type="checkbox" id="zikrMedalExtraPaperCheck" class="w-4 h-4 text-brandGold rounded">
                        <span class="font-bold text-gray-700">إضافة ورق زيادة</span>
                    </label>
                    <div id="zikrMedalExtraPaperFields" class="hidden-section space-y-3 mr-6">
                        <div>
                            <label class="block text-sm font-medium text-gray-600 mb-1">عدد أوراق الزيادة</label>
                            <input type="number" id="zikrMedalExtraPaperCount" min="0" value="0" step="1" class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                        </div>
                        <div class="text-sm text-gray-600">
                            <span class="font-medium">كمية المدليات:</span> <span id="zikrMedalMedalsQtyDisplay">—</span>
                        </div>
                        <div id="zikrMedalExtraPaperCalc" class="text-sm text-amber-700 font-medium">—</div>
                    </div>
                </div>
                <div id="zikrMedalCalculationDisplay" class="bg-amber-50 p-4 rounded-xl border border-amber-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('zikrMedalConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const qtyInput = document.getElementById('zikrMedalQuantity');
        const incBtn = document.getElementById('zikrMedalIncrementBtn');
        const appliedOfferEl = document.getElementById('zikrMedalAppliedOffer');
        const giftDisplayEl = document.getElementById('zikrMedalGiftDisplay');
        const extraPaperPrice = prices['addon_extra_paper'] || 0;
        const updateZikrMedalDisplay = () => {
            const qty = parseInt(qtyInput?.value || 0, 10);
            const tier = zikr?.getNextHigherTier?.(qty);
            const extraPaperCheck = document.getElementById('zikrMedalExtraPaperCheck');
            const extraPaperFields = document.getElementById('zikrMedalExtraPaperFields');
            const medalsQtyDisplay = document.getElementById('zikrMedalMedalsQtyDisplay');
            const extraPaperCalcEl = document.getElementById('zikrMedalExtraPaperCalc');
            const extraPaperCount = parseInt(document.getElementById('zikrMedalExtraPaperCount')?.value || 0, 10);
            if (extraPaperCheck?.checked) {
                extraPaperFields?.classList.remove('hidden-section');
            } else {
                extraPaperFields?.classList.add('hidden-section');
            }
            if (!tier) {
                appliedOfferEl.textContent = 'أدخل الكمية لمعرفة العرض';
                giftDisplayEl.textContent = '—';
                if (medalsQtyDisplay) medalsQtyDisplay.textContent = '—';
                if (extraPaperCalcEl) extraPaperCalcEl.textContent = '—';
                document.getElementById('zikrMedalCalculationDisplay').innerHTML = 'الإجمالي: 0 ج.م';
                return;
            }
            const sellPrice = prices[tier.id] || 0;
            appliedOfferEl.textContent = `العرض المطبق: ${tier.baseQty} ميدالية + ${tier.giftQty} هدية مجانية`;
            giftDisplayEl.textContent = `إجمالي الوحدات: ${tier.baseQty + tier.giftQty} (${tier.baseQty} مدفوعة + ${tier.giftQty} هدية)`;
            if (medalsQtyDisplay) medalsQtyDisplay.textContent = tier.baseQty;
            let extraPaperTotal = 0;
            if (extraPaperCheck?.checked && extraPaperCount > 0 && extraPaperPrice > 0) {
                extraPaperTotal = (extraPaperPrice * extraPaperCount) * tier.baseQty;
                if (extraPaperCalcEl) extraPaperCalcEl.textContent = `إجمالي ورق الزيادة: (${extraPaperPrice.toFixed(2)} × ${extraPaperCount}) × ${tier.baseQty} = ${extraPaperTotal.toFixed(2)} ج.م`;
            } else if (extraPaperCalcEl) {
                extraPaperCalcEl.textContent = extraPaperPrice <= 0 ? 'حدد سعر ورقة الزيادة من إدارة التسعير' : '—';
            }
            const total = sellPrice + extraPaperTotal;
            document.getElementById('zikrMedalCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        document.getElementById('zikrMedalExtraPaperCheck')?.addEventListener('change', updateZikrMedalDisplay);
        document.getElementById('zikrMedalExtraPaperCount')?.addEventListener('input', updateZikrMedalDisplay);
        qtyInput?.addEventListener('input', updateZikrMedalDisplay);
        incBtn?.addEventListener('click', () => {
            const cur = parseInt(qtyInput?.value || 0, 10);
            qtyInput.value = Math.max(1, cur + 1);
            updateZikrMedalDisplay();
        });
        document.getElementById('zikrMedalConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const qty = parseInt(qtyInput?.value || 0, 10);
            if (qty <= 0) {
                Swal.fire('خطأ', 'أدخل كمية صحيحة', 'error');
                return;
            }
            const tier = zikr?.getNextHigherTier?.(qty);
            if (!tier) {
                Swal.fire('خطأ', 'لم يتم العثور على عرض مناسب للكمية المدخلة', 'error');
                return;
            }
            const sellPrice = prices[tier.id] || 0;
            if (sellPrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع لهذا العرض. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            const extraPaperCheck = document.getElementById('zikrMedalExtraPaperCheck')?.checked;
            const extraPaperCount = parseInt(document.getElementById('zikrMedalExtraPaperCount')?.value || 0, 10);
            const extraPaperPrice = prices['addon_extra_paper'] || 0;
            let extraPaperTotal = 0;
            if (extraPaperCheck && extraPaperCount > 0) {
                if (extraPaperPrice <= 0) {
                    Swal.fire('خطأ', 'لم يتم تحديد سعر ورقة الزيادة من إدارة التسعير', 'error');
                    return;
                }
                extraPaperTotal = (extraPaperPrice * extraPaperCount) * tier.baseQty;
            }
            const totalPrice = sellPrice + extraPaperTotal;
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`ZikrMedal_${tier.id}`).get();
                productionCost = costDoc.exists ? (costDoc.data().costPrice ?? costDoc.data().price ?? 0) : 0;
                if (extraPaperCheck && extraPaperCount > 0) {
                    const addonCostDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc('ZikrMedal_addon_extra_paper').get();
                    const addonCost = addonCostDoc.exists ? (addonCostDoc.data().costPrice ?? addonCostDoc.data().price ?? 0) : 0;
                    productionCost += (addonCost * extraPaperCount) * tier.baseQty;
                }
            } catch (err) {}
            let productName = `مدليات أذكار ${tier.baseQty} + ${tier.giftQty} هدية`;
            if (extraPaperCheck && extraPaperCount > 0) {
                productName += ` | ورق زيادة: ${extraPaperCount} × ${tier.baseQty}`;
            }
            this.addProduct({
                id: Date.now(),
                type: 'ZikrMedal',
                tierId: tier.id,
                baseQty: tier.baseQty,
                giftQty: tier.giftQty,
                quantity: tier.baseQty,
                productName,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost,
                extraPaperAddon: extraPaperCheck && extraPaperCount > 0 ? {
                    enabled: true,
                    numSheets: extraPaperCount,
                    pricePerSheet: extraPaperPrice,
                    medalsQty: tier.baseQty,
                    total: extraPaperTotal
                } : null
            });
            closeModal('zikrMedalConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateZikrMedalDisplay();
        openModal('zikrMedalConfigModal');
    },

    async openSublimationGiftConfig() {
        const content = document.getElementById('sublimationGiftConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('sublimationGiftConfigModal');
            return;
        }
        const products = (typeof SublimationGiftPricing !== 'undefined' && SublimationGiftPricing.PRODUCTS) ? SublimationGiftPricing.PRODUCTS : [];
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'SublimationGift').get();
            snap.docs.forEach(d => {
                const d_ = d.data();
                const pid = d_.productId || d.id.replace('SublimationGift_', '');
                prices[pid] = d_.sellingPrice ?? d_.price ?? 0;
            });
        } catch (e) {}
        content.innerHTML = `
            <form id="sublimationGiftConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">المنتج <span class="text-red-500">*</span></label>
                    <select id="sublimationGiftProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المنتج</option>
                        ${products.map(p => `<option value="${p.id}" data-price="${prices[p.id] || 0}">${p.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="sublimationGiftQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="sublimationGiftCalculationDisplay" class="bg-fuchsia-50 p-4 rounded-xl border border-fuchsia-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('sublimationGiftConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const productSel = document.getElementById('sublimationGiftProduct');
        const qtyInput = document.getElementById('sublimationGiftQuantity');
        const updateSublimationGiftCalc = () => {
            const price = parseFloat(productSel?.options[productSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const qty = parseInt(qtyInput?.value || 1, 10);
            const total = price * qty;
            document.getElementById('sublimationGiftCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        productSel?.addEventListener('change', updateSublimationGiftCalc);
        qtyInput?.addEventListener('input', updateSublimationGiftCalc);
        document.getElementById('sublimationGiftConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = productSel.value;
            const product = products.find(p => p.id === productId);
            const quantity = parseInt(qtyInput?.value || 1, 10);
            const unitPrice = parseFloat(productSel.options[productSel.selectedIndex]?.dataset?.price || 0) || 0;
            if (unitPrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع لهذا المنتج. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            const totalPrice = unitPrice * quantity;
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`SublimationGift_${productId}`).get();
                const costUnit = costDoc.exists ? (costDoc.data().costPrice ?? costDoc.data().price ?? 0) : 0;
                productionCost = costUnit * quantity;
            } catch (err) {}
            this.addProduct({
                id: Date.now(),
                type: 'SublimationGift',
                productId,
                productName: product?.nameAr || productId,
                quantity,
                unitPrice,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('sublimationGiftConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateSublimationGiftCalc();
        openModal('sublimationGiftConfigModal');
    },

    async openPromotionalGiftsConfig() {
        const content = document.getElementById('promotionalGiftsConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('promotionalGiftsConfigModal');
            return;
        }
        const products = (typeof PromotionalGiftsPricing !== 'undefined' && PromotionalGiftsPricing.PRODUCTS) ? PromotionalGiftsPricing.PRODUCTS : [];
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'promotional_gifts').get();
            snap.docs.forEach(d => {
                const d_ = d.data();
                const pid = d_.productId || d.id.replace('promotional_gifts_', '');
                prices[pid] = d_.sellingPrice ?? d_.price ?? 0;
            });
        } catch (e) {}
        content.innerHTML = `
            <form id="promotionalGiftsConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">المنتج <span class="text-red-500">*</span></label>
                    <select id="promotionalGiftsProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المنتج</option>
                        ${products.map(p => `<option value="${p.id}" data-price="${prices[p.id] || 0}" data-min="${p.minQuantity || 1}">${p.nameAr}${p.minQuantity ? ' (أقل كمية ' + p.minQuantity + ')' : ''}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="promotionalGiftsQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                    <p id="promotionalGiftsMinHint" class="text-xs text-orange-600 mt-1 hidden-section">أقل كمية للبالون: 500</p>
                </div>
                <div id="promotionalGiftsCalculationDisplay" class="bg-teal-50 p-4 rounded-xl border border-teal-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('promotionalGiftsConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const productSel = document.getElementById('promotionalGiftsProduct');
        const qtyInput = document.getElementById('promotionalGiftsQuantity');
        const minHint = document.getElementById('promotionalGiftsMinHint');
        const updateCalc = () => {
            const price = parseFloat(productSel?.options[productSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const minQ = parseInt(productSel?.options[productSel?.selectedIndex]?.dataset?.min || 1, 10);
            let qty = parseInt(qtyInput?.value || 1, 10);
            if (minQ > 1) {
                minHint.classList.remove('hidden-section');
                if (qty < minQ) qty = minQ;
                qtyInput.value = qty;
                qtyInput.min = minQ;
            } else minHint.classList.add('hidden-section');
            const total = price * qty;
            document.getElementById('promotionalGiftsCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        productSel?.addEventListener('change', updateCalc);
        qtyInput?.addEventListener('input', updateCalc);
        document.getElementById('promotionalGiftsConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = productSel.value;
            const product = products.find(p => p.id === productId);
            const minQ = parseInt(productSel.options[productSel.selectedIndex]?.dataset?.min || 1, 10);
            let quantity = parseInt(qtyInput?.value || 1, 10);
            if (quantity < minQ) {
                Swal.fire('خطأ', `أقل كمية لهذا المنتج: ${minQ}`, 'error');
                return;
            }
            const unitPrice = parseFloat(productSel.options[productSel.selectedIndex]?.dataset?.price || 0) || 0;
            if (unitPrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            const totalPrice = unitPrice * quantity;
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`promotional_gifts_${productId}`).get();
                const costUnit = costDoc.exists ? (costDoc.data().costPrice ?? costDoc.data().price ?? 0) : 0;
                productionCost = costUnit * quantity;
            } catch (err) {}
            this.addProduct({
                id: Date.now(),
                type: 'promotional_gifts',
                productId,
                productName: product?.nameAr || productId,
                quantity,
                unitPrice,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('promotionalGiftsConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateCalc();
        openModal('promotionalGiftsConfigModal');
    },

    async openRulerFramesConfig() {
        const content = document.getElementById('rulerFramesConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('rulerFramesConfigModal');
            return;
        }
        const products = (typeof RulerFramesPricing !== 'undefined' && RulerFramesPricing.PRODUCTS) ? RulerFramesPricing.PRODUCTS : [];
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'ruler_frames').get();
            snap.docs.forEach(d => {
                const d_ = d.data();
                const pid = d_.productId || d.id.replace('ruler_frames_', '');
                prices[pid] = d_.sellingPrice ?? d_.price ?? 0;
            });
        } catch (e) {}
        content.innerHTML = `
            <form id="rulerFramesConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">المنتج <span class="text-red-500">*</span></label>
                    <select id="rulerFramesProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المنتج</option>
                        ${products.map(p => `<option value="${p.id}" data-price="${prices[p.id] || 0}">${p.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="rulerFramesQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="rulerFramesCalculationDisplay" class="bg-slate-50 p-4 rounded-xl border border-slate-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('rulerFramesConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const productSel = document.getElementById('rulerFramesProduct');
        const qtyInput = document.getElementById('rulerFramesQuantity');
        const updateCalc = () => {
            const price = parseFloat(productSel?.options[productSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const qty = parseInt(qtyInput?.value || 1, 10);
            document.getElementById('rulerFramesCalculationDisplay').innerHTML = `الإجمالي: ${(price * qty).toFixed(2)} ج.م`;
        };
        productSel?.addEventListener('change', updateCalc);
        qtyInput?.addEventListener('input', updateCalc);
        document.getElementById('rulerFramesConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = productSel.value;
            const product = products.find(p => p.id === productId);
            const quantity = parseInt(qtyInput?.value || 1, 10);
            const unitPrice = parseFloat(productSel.options[productSel.selectedIndex]?.dataset?.price || 0) || 0;
            if (unitPrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            const totalPrice = unitPrice * quantity;
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`ruler_frames_${productId}`).get();
                const costUnit = costDoc.exists ? (costDoc.data().costPrice ?? costDoc.data().price ?? 0) : 0;
                productionCost = costUnit * quantity;
            } catch (err) {}
            this.addProduct({
                id: Date.now(),
                type: 'ruler_frames',
                productId,
                productName: product?.nameAr || productId,
                quantity,
                unitPrice,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('rulerFramesConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateCalc();
        openModal('rulerFramesConfigModal');
    },

    async openShippingFlyersClearBagsConfig() {
        const content = document.getElementById('shippingFlyersClearBagsConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('shippingFlyersClearBagsConfigModal');
            return;
        }
        const products = (typeof ShippingFlyersClearBagsPricing !== 'undefined' && ShippingFlyersClearBagsPricing.PRODUCTS) ? ShippingFlyersClearBagsPricing.PRODUCTS : [];
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'shipping_flyers_clear_bags').get();
            snap.docs.forEach(d => {
                const d_ = d.data();
                const pid = d_.productId || d.id.replace('shipping_flyers_clear_bags_', '');
                prices[pid] = d_.sellingPrice ?? d_.price ?? 0;
            });
        } catch (e) {}
        content.innerHTML = `
            <form id="shippingFlyersClearBagsConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">المنتج <span class="text-red-500">*</span></label>
                    <select id="shippingFlyersProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المنتج</option>
                        ${products.map(p => `<option value="${p.id}" data-price="${prices[p.id] || 0}">${p.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="shippingFlyersQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div class="bg-amber-50 p-3 rounded-xl border border-amber-200">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="shippingFlyersPrintingAddon" class="w-5 h-5 text-brandGold rounded">
                        <span class="font-bold text-gray-700">إضافة طباعة (سعر حسب الكمية)</span>
                    </label>
                    <input type="number" id="shippingFlyersPrintingPriceInput" step="0.01" min="0" placeholder="سعر الطباعة للقطعة" class="w-full mt-2 border border-gray-300 p-2 rounded-lg text-sm hidden-section">
                </div>
                <div id="shippingFlyersCalculationDisplay" class="bg-amber-50 p-4 rounded-xl border border-amber-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('shippingFlyersClearBagsConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const productSel = document.getElementById('shippingFlyersProduct');
        const qtyInput = document.getElementById('shippingFlyersQuantity');
        const printingCheck = document.getElementById('shippingFlyersPrintingAddon');
        const printingPriceInput = document.getElementById('shippingFlyersPrintingPriceInput');
        if (printingCheck) printingCheck.addEventListener('change', () => { printingPriceInput.classList.toggle('hidden-section', !printingCheck.checked); updateShippingFlyersCalc(); });
        const updateShippingFlyersCalc = () => {
            const price = parseFloat(productSel?.options[productSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const qty = parseInt(qtyInput?.value || 1, 10);
            let printingTotal = 0;
            if (printingCheck?.checked && printingPriceInput) {
                const perPiece = parseFloat(printingPriceInput.value || 0) || 0;
                printingTotal = perPiece * qty;
            }
            const total = price * qty + printingTotal;
            document.getElementById('shippingFlyersCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        productSel?.addEventListener('change', updateShippingFlyersCalc);
        qtyInput?.addEventListener('input', updateShippingFlyersCalc);
        if (printingPriceInput) printingPriceInput.addEventListener('input', updateShippingFlyersCalc);
        document.getElementById('shippingFlyersClearBagsConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = productSel.value;
            const product = products.find(p => p.id === productId);
            const quantity = parseInt(qtyInput?.value || 1, 10);
            const unitPrice = parseFloat(productSel.options[productSel.selectedIndex]?.dataset?.price || 0) || 0;
            let printingPerPiece = 0;
            if (printingCheck?.checked && printingPriceInput) printingPerPiece = parseFloat(printingPriceInput.value || 0) || 0;
            const baseTotal = unitPrice * quantity;
            const printingTotal = printingPerPiece * quantity;
            const totalPrice = baseTotal + printingTotal;
            if (unitPrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`shipping_flyers_clear_bags_${productId}`).get();
                const costUnit = costDoc.exists ? (costDoc.data().costPrice ?? costDoc.data().price ?? 0) : 0;
                productionCost = costUnit * quantity;
            } catch (err) {}
            this.addProduct({
                id: Date.now(),
                type: 'shipping_flyers_clear_bags',
                productId,
                productName: product?.nameAr || productId,
                quantity,
                unitPrice,
                printingAddon: printingCheck?.checked ? { perPiece: printingPerPiece, total: printingTotal } : null,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('shippingFlyersClearBagsConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateShippingFlyersCalc();
        openModal('shippingFlyersClearBagsConfigModal');
    },

    async openPlasticBagsConfig() {
        const content = document.getElementById('plasticBagsConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('plasticBagsConfigModal');
            return;
        }
        const MIN_KG = (typeof PlasticBagsPricing !== 'undefined' && PlasticBagsPricing.MIN_QUANTITY_KG) ? PlasticBagsPricing.MIN_QUANTITY_KG : 50;
        const addons = (typeof PlasticBagsPricing !== 'undefined' && PlasticBagsPricing.ADDONS) ? PlasticBagsPricing.ADDONS : [
            { id: 'extra_color', nameAr: 'لون إضافي' },
            { id: 'external_handle', nameAr: 'مقبض خارجي' }
        ];
        let sellPrices = {}; let costPrices = {};
        try {
            const sellSnap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'plastic_bags').get();
            sellSnap.docs.forEach(d => {
                const d_ = d.data();
                sellPrices[d_.productId || 'plastic_bag_kg'] = d_.sellingPrice ?? d_.price ?? 0;
                if (d_.addonsPrices) Object.assign(sellPrices, d_.addonsPrices);
            });
            const costSnap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).where('categoryId', '==', 'plastic_bags').get();
            costSnap.docs.forEach(d => {
                const d_ = d.data();
                costPrices[d_.productId || 'plastic_bag_kg'] = d_.costPrice ?? d_.price ?? 0;
                if (d_.addonsCosts) Object.assign(costPrices, d_.addonsCosts);
            });
        } catch (e) {}
        const basePricePerKg = sellPrices.plastic_bag_kg ?? sellPrices['plastic_bag_kg'] ?? PlasticBagsPricing?.BASE_PRICE_PER_KG ?? 75;
        content.innerHTML = `
            <form id="plasticBagsConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية (كجم) <span class="text-red-500">*</span> — أقل كمية ${MIN_KG} كجم</label>
                    <input type="number" id="plasticBagsKg" step="1" min="${MIN_KG}" value="${MIN_KG}" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div class="bg-lime-50 p-3 rounded-xl border border-lime-200">
                    <p class="font-bold text-gray-700 mb-2">إضافات (سعر للكيلو)</p>
                    ${addons.map(a => `
                        <label class="flex items-center gap-2 cursor-pointer mb-2">
                            <input type="checkbox" id="plastic_bag_addon_${a.id}" class="w-5 h-5 text-brandGold rounded" data-addon-id="${a.id}">
                            <span>${a.nameAr}</span>
                            <input type="number" step="0.01" min="0" placeholder="ج.م/كجم" class="w-24 border border-gray-300 p-1 rounded text-sm addon-price-kg" data-addon-id="${a.id}">
                        </label>
                    `).join('')}
                </div>
                <div id="plasticBagsCalculationDisplay" class="bg-lime-50 p-4 rounded-xl border border-lime-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('plasticBagsConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const kgInput = document.getElementById('plasticBagsKg');
        const updatePlasticBagsCalc = () => {
            const kg = parseFloat(kgInput?.value || MIN_KG) || 0;
            let addonsTotal = 0;
            addons.forEach(a => {
                const cb = document.getElementById(`plastic_bag_addon_${a.id}`);
                const priceInput = document.querySelector(`.addon-price-kg[data-addon-id="${a.id}"]`);
                if (cb?.checked && priceInput) addonsTotal += (parseFloat(priceInput.value || 0) || 0) * kg;
            });
            const baseTotal = basePricePerKg * kg;
            const total = baseTotal + addonsTotal;
            document.getElementById('plasticBagsCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        kgInput?.addEventListener('input', updatePlasticBagsCalc);
        content.querySelectorAll('.addon-price-kg').forEach(el => el.addEventListener('input', updatePlasticBagsCalc));
        content.querySelectorAll('[id^="plastic_bag_addon_"]').forEach(cb => cb.addEventListener('change', updatePlasticBagsCalc));
        document.getElementById('plasticBagsConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const quantityKg = parseFloat(kgInput?.value || 0) || 0;
            if (quantityKg < MIN_KG) {
                Swal.fire('خطأ', `أقل كمية ${MIN_KG} كجم`, 'error');
                return;
            }
            const baseTotal = basePricePerKg * quantityKg;
            const selectedAddons = [];
            addons.forEach(a => {
                const cb = document.getElementById(`plastic_bag_addon_${a.id}`);
                const priceInput = document.querySelector(`.addon-price-kg[data-addon-id="${a.id}"]`);
                if (cb?.checked && priceInput) {
                    const pricePerKg = parseFloat(priceInput.value || 0) || 0;
                    selectedAddons.push({ id: a.id, nameAr: a.nameAr, pricePerKg, total: pricePerKg * quantityKg });
                }
            });
            const addonsTotal = selectedAddons.reduce((s, a) => s + a.total, 0);
            const totalPrice = baseTotal + addonsTotal;
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc('plastic_bags_plastic_bag_kg').get();
                const costPerKg = costDoc.exists ? (costDoc.data().costPrice ?? costDoc.data().price ?? 0) : 0;
                productionCost = costPerKg * quantityKg;
            } catch (err) {}
            this.addProduct({
                id: Date.now(),
                type: 'plastic_bags',
                productId: 'plastic_bag_kg',
                productName: 'شنط بلاستيك (بالكيلو)',
                quantityKg,
                quantity: quantityKg,
                unitPrice: basePricePerKg,
                addons: selectedAddons,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('plasticBagsConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updatePlasticBagsCalc();
        openModal('plasticBagsConfigModal');
    },

    async openInkjetPaperPrintingConfig() {
        const content = document.getElementById('inkjetPaperPrintingConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو خدمة التسعير غير متاحة.</p>';
            openModal('inkjetPaperPrintingConfigModal');
            return;
        }
        const products = (typeof InkjetPaperPrintingPricing !== 'undefined' && InkjetPaperPrintingPricing.PRODUCTS) ? InkjetPaperPrintingPricing.PRODUCTS : [];
        const prices = {};
        try {
            const snap = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.SELL_COLLECTION) : db.collection(PricingService.SELL_COLLECTION)).where('categoryId', '==', 'inkjet_paper_printing').get();
            snap.docs.forEach(d => {
                const d_ = d.data();
                const pid = d_.productId || d.id.replace('inkjet_paper_printing_', '');
                prices[pid] = d_.sellingPrice ?? d_.price ?? 0;
            });
        } catch (e) {}
        content.innerHTML = `
            <form id="inkjetPaperPrintingConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">المنتج <span class="text-red-500">*</span></label>
                    <select id="inkjetPaperPrintingProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المنتج</option>
                        ${products.map(p => `<option value="${p.id}" data-price="${prices[p.id] || 0}">${p.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="inkjetPaperPrintingQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div id="inkjetPaperPrintingCalculationDisplay" class="bg-sky-50 p-4 rounded-xl border border-sky-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('inkjetPaperPrintingConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const productSel = document.getElementById('inkjetPaperPrintingProduct');
        const qtyInput = document.getElementById('inkjetPaperPrintingQuantity');
        const updateCalc = () => {
            const price = parseFloat(productSel?.options[productSel?.selectedIndex]?.dataset?.price || 0) || 0;
            const qty = parseInt(qtyInput?.value || 1, 10);
            document.getElementById('inkjetPaperPrintingCalculationDisplay').innerHTML = `الإجمالي: ${(price * qty).toFixed(2)} ج.م`;
        };
        productSel?.addEventListener('change', updateCalc);
        qtyInput?.addEventListener('input', updateCalc);
        document.getElementById('inkjetPaperPrintingConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = productSel.value;
            const product = products.find(p => p.id === productId);
            const quantity = parseInt(qtyInput?.value || 1, 10);
            const unitPrice = parseFloat(productSel.options[productSel.selectedIndex]?.dataset?.price || 0) || 0;
            if (unitPrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            const totalPrice = unitPrice * quantity;
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(PricingService.COST_COLLECTION) : db.collection(PricingService.COST_COLLECTION)).doc(`inkjet_paper_printing_${productId}`).get();
                const costUnit = costDoc.exists ? (costDoc.data().costPrice ?? costDoc.data().price ?? 0) : 0;
                productionCost = costUnit * quantity;
            } catch (err) {}
            this.addProduct({
                id: Date.now(),
                type: 'inkjet_paper_printing',
                productId,
                productName: product?.nameAr || productId,
                quantity,
                unitPrice,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('inkjetPaperPrintingConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateCalc();
        openModal('inkjetPaperPrintingConfigModal');
    },

    async openSafetyPrintingConfig() {
        const content = document.getElementById('safetyPrintingConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db) {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات غير متاحة.</p>';
            openModal('safetyPrintingConfigModal');
            return;
        }
        const sellColl = (typeof SafetyPrintingPricing !== 'undefined' && SafetyPrintingPricing.SELL_COLLECTION) ? SafetyPrintingPricing.SELL_COLLECTION : 'safety_printing_prices_sell';
        const costColl = (typeof SafetyPrintingPricing !== 'undefined' && SafetyPrintingPricing.COST_COLLECTION) ? SafetyPrintingPricing.COST_COLLECTION : 'safety_printing_prices_cost';
        const products = (typeof SafetyPrintingPricing !== 'undefined' && SafetyPrintingPricing.PRODUCTS) ? SafetyPrintingPricing.PRODUCTS : [
            { id: 'worker_vest', nameAr: 'فيست عمال' },
            { id: 'engineer_vest', nameAr: 'فيست مهندسين' },
            { id: 'safety_helmet', nameAr: 'خوذة' },
            { id: 'vip_helmet', nameAr: 'خوذة VIP' }
        ];
        const prices = {}; const printingPrices = {};
        try {
            for (const p of products) {
                const doc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(sellColl) : db.collection(sellColl)).doc(p.id).get();
                if (doc.exists) {
                    const d = doc.data();
                    prices[p.id] = d.sellingPrice ?? d.costPrice ?? 0;
                    printingPrices[p.id] = d.printingPrices || { front_only: 0, front_back: 0 };
                } else {
                    prices[p.id] = 0;
                    printingPrices[p.id] = { front_only: 0, front_back: 0 };
                }
            }
        } catch (e) {}
        content.innerHTML = `
            <form id="safetyPrintingConfigForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">المنتج <span class="text-red-500">*</span></label>
                    <select id="safetyPrintingProduct" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">اختر المنتج</option>
                        ${products.map(p => `<option value="${p.id}" data-base="${prices[p.id] || 0}" data-print-front="${(printingPrices[p.id] || {}).front_only || 0}" data-print-front-back="${(printingPrices[p.id] || {}).front_back || 0}">${p.nameAr}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الكمية <span class="text-red-500">*</span></label>
                    <input type="number" id="safetyPrintingQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">الطباعة (اختياري)</label>
                    <select id="safetyPrintingPrinting" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        <option value="">بدون طباعة</option>
                        <option value="front_only">طباعة وجه واحد</option>
                        <option value="front_back">طباعة وجهين</option>
                    </select>
                </div>
                <div id="safetyPrintingCalculationDisplay" class="bg-red-50 p-4 rounded-xl border border-red-200">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('safetyPrintingConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const productSel = document.getElementById('safetyPrintingProduct');
        const qtyInput = document.getElementById('safetyPrintingQuantity');
        const printingSel = document.getElementById('safetyPrintingPrinting');
        const updateCalc = () => {
            const opt = productSel?.options[productSel?.selectedIndex];
            const base = parseFloat(opt?.dataset?.base || 0) || 0;
            const frontOnly = parseFloat(opt?.dataset?.printFront || 0) || 0;
            const frontBack = parseFloat(opt?.dataset?.printFrontBack || 0) || 0;
            const qty = parseInt(qtyInput?.value || 1, 10);
            const printVal = printingSel?.value || '';
            const printPrice = printVal === 'front_only' ? frontOnly : printVal === 'front_back' ? frontBack : 0;
            const total = (base * qty) + (printPrice * qty);
            document.getElementById('safetyPrintingCalculationDisplay').innerHTML = `الإجمالي: ${total.toFixed(2)} ج.م`;
        };
        productSel?.addEventListener('change', updateCalc);
        qtyInput?.addEventListener('input', updateCalc);
        printingSel?.addEventListener('change', updateCalc);
        document.getElementById('safetyPrintingConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const productId = productSel.value;
            const product = products.find(p => p.id === productId);
            const quantity = parseInt(qtyInput?.value || 1, 10);
            const opt = productSel.options[productSel.selectedIndex];
            const basePrice = parseFloat(opt?.dataset?.base || 0) || 0;
            const frontOnly = parseFloat(opt?.dataset?.printFront || 0) || 0;
            const frontBack = parseFloat(opt?.dataset?.printFrontBack || 0) || 0;
            const printingOption = printingSel?.value || '';
            const printingPrice = printingOption === 'front_only' ? frontOnly : printingOption === 'front_back' ? frontBack : 0;
            const totalPrice = (basePrice * quantity) + (printingPrice * quantity);
            if (basePrice <= 0) {
                Swal.fire('خطأ', 'لم يتم تحديد سعر البيع. حدد السعر من إدارة التسعير أولاً.', 'error');
                return;
            }
            let productionCost = 0;
            try {
                const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(costColl) : db.collection(costColl)).doc(productId).get();
                if (costDoc.exists) {
                    const d = costDoc.data();
                    const costBase = d.costPrice ?? 0;
                    const costPrint = printingOption === 'front_only' ? ((d.printingCosts || {}).front_only || 0) : printingOption === 'front_back' ? ((d.printingCosts || {}).front_back || 0) : 0;
                    productionCost = (costBase * quantity) + (costPrint * quantity);
                }
            } catch (err) {}
            this.addProduct({
                id: Date.now(),
                type: 'safety_printing',
                productId,
                productName: product?.nameAr || productId,
                quantity,
                unitPrice: basePrice,
                printingOption: printingOption || null,
                printingPrice: printingOption ? printingPrice : 0,
                price: totalPrice,
                sellingPrice: totalPrice,
                productionCost
            });
            closeModal('safetyPrintingConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        updateCalc();
        openModal('safetyPrintingConfigModal');
    },

    async openDigitalPrintingConfig() {
        const content = document.getElementById('digitalPrintingConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof DigitalPrintingPricing === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو وحدة قسم الدجيتال غير متاحة.</p>';
            if (document.getElementById('digitalPrintingConfigModal')) openModal('digitalPrintingConfigModal');
            return;
        }
        const DP = DigitalPrintingPricing;
        const sellColl = DP.SELL_COLLECTION;
        const costColl = DP.COST_COLLECTION;
        const configDocId = DP.CONFIG_DOC_ID || 'default';
        let sellData = { paperPrices: {}, lamination: {}, extras: {}, stanRoll: {} };
        let costData = { paperPrices: {}, lamination: {}, extras: {}, stanRoll: {} };
        try {
            const sellDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(sellColl) : db.collection(sellColl)).doc(configDocId).get();
            if (sellDoc.exists) {
                const d = sellDoc.data();
                if (d.paperPrices) sellData.paperPrices = d.paperPrices;
                if (d.lamination) sellData.lamination = d.lamination;
                if (d.extras) sellData.extras = d.extras;
                if (d.stanRoll) sellData.stanRoll = d.stanRoll;
            }
            const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(costColl) : db.collection(costColl)).doc(configDocId).get();
            if (costDoc.exists) {
                const d = costDoc.data();
                if (d.paperPrices) costData.paperPrices = d.paperPrices;
                if (d.lamination) costData.lamination = d.lamination;
                if (d.extras) costData.extras = d.extras;
                if (d.stanRoll) costData.stanRoll = d.stanRoll;
            }
        } catch (e) { console.warn('Digital printing prices load:', e); }

        const paperTypes = DP.PAPER_TYPES || [];
        const defaultPaper = paperTypes[0] ? paperTypes[0].id : '';

        const buildParams = (source, paperId, printingSide, laminationType, laminationSide, qty, w, h, extrasInputs) => {
            const pp = source.paperPrices[paperId] || {};
            const lam = source.lamination || {};
            const ex = source.extras || {};
            return {
                quantity: qty,
                widthCm: w,
                heightCm: h,
                paperTypeId: paperId,
                printingSide: printingSide || 'single',
                priceSingle: pp.priceSingle != null ? pp.priceSingle : 0,
                priceDouble: pp.priceDouble != null ? pp.priceDouble : 0,
                laminationMatteSingle: lam.matteSingle != null ? lam.matteSingle : 0,
                laminationMatteDouble: lam.matteDouble != null ? lam.matteDouble : 0,
                laminationGlossySingle: lam.glossySingle != null ? lam.glossySingle : 0,
                laminationGlossyDouble: lam.glossyDouble != null ? lam.glossyDouble : 0,
                laminationType: laminationType || null,
                laminationSide: laminationSide || null,
                specialColorCount: parseInt(extrasInputs.specialColorCount || 0, 10) || 0,
                specialColorPricePerColor: ex.specialColorPerColor != null ? ex.specialColorPerColor : 0,
                stickerCutting: extrasInputs.stickerCuttingEnabled ? (ex.stickerCuttingPerSheet != null ? ex.stickerCuttingPerSheet : 0) : 0,
                dieCutting: extrasInputs.dieCuttingEnabled ? (ex.dieCuttingPerSheet != null ? ex.dieCuttingPerSheet : 0) : 0,
                creasingCount: parseInt(extrasInputs.creasingCount || 0, 10) || 0,
                creasingPricePer1000: ex.creasingPer1000 != null ? ex.creasingPer1000 : 0,
                perforationCount: parseInt(extrasInputs.perforationCount || 0, 10) || 0,
                perforationPricePer1000: ex.perforationPer1000 != null ? ex.perforationPer1000 : 0,
                cornerRoundingPricePer1000: extrasInputs.cornerRoundingEnabled ? (ex.cornerRoundingPer1000 != null ? ex.cornerRoundingPer1000 : 0) : 0,
                folderPocketQty: parseInt(extrasInputs.folderPocketQty || 0, 10) || 0,
                folderPocketPricePerPiece: ex.folderPocketPerPiece != null ? ex.folderPocketPerPiece : 0,
                bagAssemblyQty: parseInt(extrasInputs.bagAssemblyQty || 0, 10) || 0,
                bagAssemblyPricePerBag: ex.bagAssemblyPerBag != null ? ex.bagAssemblyPerBag : 0,
                paperCuttingCount: parseInt(extrasInputs.paperCuttingCount || 0, 10) || 0,
                paperCuttingPricePer1000: ex.paperCuttingPer1000 != null ? ex.paperCuttingPer1000 : 0
            };
        };

        const getExtrasInputs = () => ({
            specialColorCount: document.getElementById('digitalPrintingExtraSpecialColor')?.checked ? (parseInt(document.getElementById('digitalPrintingSpecialColorCount')?.value) || 1) : 0,
            stickerCuttingEnabled: document.getElementById('digitalPrintingExtraStickerCutting')?.checked || false,
            dieCuttingEnabled: document.getElementById('digitalPrintingExtraDieCutting')?.checked || false,
            creasingCount: document.getElementById('digitalPrintingExtraCreasing')?.checked ? (parseInt(document.getElementById('digitalPrintingCreasingCount')?.value) || 1) : 0,
            perforationCount: document.getElementById('digitalPrintingExtraPerforation')?.checked ? (parseInt(document.getElementById('digitalPrintingPerforationCount')?.value) || 1) : 0,
            cornerRoundingEnabled: document.getElementById('digitalPrintingExtraCornerRounding')?.checked || false,
            folderPocketQty: document.getElementById('digitalPrintingExtraFolderPocket')?.checked ? (parseInt(document.getElementById('digitalPrintingFolderPocketQty')?.value) || 1) : 0,
            bagAssemblyQty: document.getElementById('digitalPrintingExtraBagAssembly')?.checked ? (parseInt(document.getElementById('digitalPrintingBagQty')?.value) || 1) : 0,
            paperCuttingCount: document.getElementById('digitalPrintingExtraPaperCutting')?.checked ? (parseInt(document.getElementById('digitalPrintingPaperCuttingCount')?.value) || 1) : 0
        });

        content.innerHTML = `
            <form id="digitalPrintingConfigForm" class="space-y-4">
                <div id="digitalPrintingSheetForm" class="space-y-4">
                <p class="text-sm text-gray-600 mb-2">الحد الأقصى للقطعة: 31.5×46.5 سم (فرخ الديجيتال). الورق والطباعة حسب الفرخ.</p>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">الكمية (عدد القطع) <span class="text-red-500">*</span></label>
                        <input type="number" id="digitalPrintingQuantity" step="1" min="1" value="100" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">عرض القطعة (سم) <span class="text-red-500">*</span></label>
                        <input type="number" id="digitalPrintingWidth" step="0.1" min="0.1" max="32" placeholder="32" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">ارتفاع القطعة (سم) <span class="text-red-500">*</span></label>
                        <input type="number" id="digitalPrintingHeight" step="0.1" min="0.1" max="47" placeholder="47" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">نوع الورق <span class="text-red-500">*</span></label>
                        <select id="digitalPrintingPaperType" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                            ${paperTypes.map(p => `<option value="${p.id}">${p.nameAr}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">جهة الطباعة <span class="text-red-500">*</span></label>
                        <select id="digitalPrintingPrintingSide" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                            <option value="single">وجه واحد</option>
                            <option value="double">وجهين</option>
                        </select>
                    </div>
                </div>
                <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p class="font-bold text-gray-700 mb-2">سلفان (بالفرخ) — اختياري</p>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="digitalPrintingLamination" value="" class="text-brandGold"> بدون</label>
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="digitalPrintingLamination" value="matte_single" class="text-brandGold"> سلفان مط وجه واحد</label>
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="digitalPrintingLamination" value="matte_double" class="text-brandGold"> سلفان مط وجهين</label>
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="digitalPrintingLamination" value="glossy_single" class="text-brandGold"> سلفان لامع وجه واحد</label>
                        <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="digitalPrintingLamination" value="glossy_double" class="text-brandGold"> سلفان لامع وجهين</label>
                    </div>
                    <p id="digitalPrintingLaminationHint" class="text-xs text-amber-600 mt-1"></p>
                </div>
                <div class="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <p class="font-bold text-gray-700 mb-1">إضافات (اختياري)</p>
                    <p class="text-xs text-gray-500 mb-3">علّم على الإضافة المطلوبة — الأسعار تلقائية من إدارة التسعير</p>
                    <div class="space-y-2 text-sm">
                        <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <input type="checkbox" id="digitalPrintingExtraSpecialColor" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700 flex-1">لون اسبشيال (بالفرخ)</span>
                            <input type="number" id="digitalPrintingSpecialColorCount" step="1" min="1" value="1" class="w-20 border border-gray-300 p-1 rounded text-sm hidden-section" placeholder="عدد">
                        </div>
                        <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <input type="checkbox" id="digitalPrintingExtraStickerCutting" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700 flex-1">تشريح استيكر (بالفرخ)</span>
                        </div>
                        <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <input type="checkbox" id="digitalPrintingExtraDieCutting" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700 flex-1">تقطيع ورق فورمة (بالفرخ)</span>
                        </div>
                        <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <input type="checkbox" id="digitalPrintingExtraCreasing" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700 flex-1">ريجة بالـ 1000 قطعة</span>
                            <input type="number" id="digitalPrintingCreasingCount" step="1" min="1" value="1" class="w-20 border border-gray-300 p-1 rounded text-sm hidden-section" placeholder="عدد">
                        </div>
                        <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <input type="checkbox" id="digitalPrintingExtraPerforation" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700 flex-1">تخريم بالـ 1000 قطعة</span>
                            <input type="number" id="digitalPrintingPerforationCount" step="1" min="1" value="1" class="w-20 border border-gray-300 p-1 rounded text-sm hidden-section" placeholder="عدد">
                        </div>
                        <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <input type="checkbox" id="digitalPrintingExtraCornerRounding" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700 flex-1">ركنة بالـ 1000 قطعة</span>
                        </div>
                        <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <input type="checkbox" id="digitalPrintingExtraFolderPocket" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700 flex-1">جيب + لزق (للفولدر) بالقطعة</span>
                            <input type="number" id="digitalPrintingFolderPocketQty" step="1" min="1" value="1" class="w-20 border border-gray-300 p-1 rounded text-sm hidden-section" placeholder="كمية">
                        </div>
                        <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <input type="checkbox" id="digitalPrintingExtraBagAssembly" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700 flex-1">تقفيل شنطة بالشنطة الواحدة</span>
                            <input type="number" id="digitalPrintingBagQty" step="1" min="1" value="1" class="w-20 border border-gray-300 p-1 rounded text-sm hidden-section" placeholder="كمية">
                        </div>
                        <div class="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200">
                            <input type="checkbox" id="digitalPrintingExtraPaperCutting" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold">
                            <span class="font-bold text-gray-700 flex-1">قص الورق بالـ 1000 قطعة</span>
                            <input type="number" id="digitalPrintingPaperCuttingCount" step="1" min="1" value="1" class="w-20 border border-gray-300 p-1 rounded text-sm hidden-section" placeholder="عدد">
                        </div>
                    </div>
                </div>
                </div>
                <div id="digitalPrintingSummary" class="bg-violet-50 p-4 rounded-xl border border-violet-200 text-sm">أدخل الكمية والمقاس ونوع الورق لرؤية الملخص.</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('digitalPrintingConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;

        const quantityEl = document.getElementById('digitalPrintingQuantity');
        const widthEl = document.getElementById('digitalPrintingWidth');
        const heightEl = document.getElementById('digitalPrintingHeight');
        const paperEl = document.getElementById('digitalPrintingPaperType');
        const sideEl = document.getElementById('digitalPrintingPrintingSide');
        const summaryEl = document.getElementById('digitalPrintingSummary');
        const laminationHint = document.getElementById('digitalPrintingLaminationHint');
        const updateLaminationState = () => {
            const paperId = paperEl?.value || '';
            const canDouble = DP.canLaminationDouble(paperId);
            const paper = DP.getPaperTypeById(paperId);
            const noLam = !paper || !paper.laminationAllowed;
            const radios = document.querySelectorAll('input[name="digitalPrintingLamination"]');
            radios.forEach(r => {
                if (r.value === '') return;
                const isDouble = r.value === 'matte_double' || r.value === 'glossy_double';
                if (noLam) { r.disabled = true; r.parentElement.classList.add('opacity-50'); return; }
                if (isDouble && !canDouble) { r.disabled = true; r.parentElement.classList.add('opacity-50'); return; }
                r.disabled = false;
                r.parentElement.classList.remove('opacity-50');
            });
            if (noLam) laminationHint.textContent = 'هذا النوع لا يسمح بالسلفان.';
            else if (!canDouble) laminationHint.textContent = 'سلفان وجهين غير متاح لهذا النوع.';
            else laminationHint.textContent = '';
        };

        const getLaminationValues = () => {
            const v = document.querySelector('input[name="digitalPrintingLamination"]:checked')?.value || '';
            if (!v) return { laminationType: null, laminationSide: null };
            if (v === 'matte_single') return { laminationType: 'matte', laminationSide: 'single' };
            if (v === 'matte_double') return { laminationType: 'matte', laminationSide: 'double' };
            if (v === 'glossy_single') return { laminationType: 'glossy', laminationSide: 'single' };
            if (v === 'glossy_double') return { laminationType: 'glossy', laminationSide: 'double' };
            return { laminationType: null, laminationSide: null };
        };

        const runDigitalCalc = () => {
            const qty = parseInt(quantityEl?.value || 0, 10);
            const w = parseFloat(widthEl?.value || 0);
            const h = parseFloat(heightEl?.value || 0);
            const paperId = paperEl?.value || defaultPaper;
            const printingSide = sideEl?.value || 'single';
            const { laminationType, laminationSide } = getLaminationValues();
            if (qty <= 0 || w <= 0 || h <= 0) {
                summaryEl.innerHTML = 'أدخل الكمية وعرض وارتفاع القطعة.';
                return;
            }
            if (!DP.isSizeAllowed(w, h)) {
                summaryEl.innerHTML = '<span class="text-red-600">المقاس يتجاوز فرخ الديجيتال 31.5×46.5 سم. غير مسموح في قسم الدجيتال.</span>';
                return;
            }
            const extrasInputs = getExtrasInputs();
            const paramsSell = buildParams(sellData, paperId, printingSide, laminationType, laminationSide, qty, w, h, extrasInputs);
            const result = DP.calculate(paramsSell);
            if (!result) {
                summaryEl.innerHTML = 'لا يمكن حساب السعر. تحقق من المدخلات.';
                return;
            }
            let html = `<div class="space-y-1"><div>الورق المستخدم: ${result.sheetsNeeded} ورقة</div><div>نوع الورق: ${result.paperTypeNameAr}</div><div>الطباعة: ${result.printingSideLabel}</div>`;
            if (result.laminationCost > 0) html += `<div>سلفان: ${result.laminationCost.toFixed(2)} ج.م</div>`;
            if (result.specialColorCost > 0) html += `<div>لون اسبشيال: ${result.specialColorCost.toFixed(2)} ج.م</div>`;
            if (result.stickerCuttingCost > 0) html += `<div>تشريح استيكر: ${result.stickerCuttingCost.toFixed(2)} ج.م</div>`;
            if (result.dieCuttingCost > 0) html += `<div>تقطيع ورق فورمة: ${result.dieCuttingCost.toFixed(2)} ج.م</div>`;
            if (result.creasingCost > 0) html += `<div>ريجة: ${result.creasingCost.toFixed(2)} ج.م</div>`;
            if (result.perforationCost > 0) html += `<div>تخريم: ${result.perforationCost.toFixed(2)} ج.م</div>`;
            if (result.cornerRoundingCost > 0) html += `<div>ركنة: ${result.cornerRoundingCost.toFixed(2)} ج.م</div>`;
            if (result.folderPocketCost > 0) html += `<div>جيب + لزق (للفولدر): ${result.folderPocketCost.toFixed(2)} ج.م</div>`;
            if (result.bagAssemblyCost > 0) html += `<div>تقفيل شنطة: ${result.bagAssemblyCost.toFixed(2)} ج.م</div>`;
            if (result.paperCuttingCost > 0) html += `<div>قص الورق: ${result.paperCuttingCost.toFixed(2)} ج.م</div>`;
            html += `</div><div class="font-bold text-lg mt-2">الإجمالي: ${result.total.toFixed(2)} ج.م</div>`;
            summaryEl.innerHTML = html;
        };

        paperEl?.addEventListener('change', () => { updateLaminationState(); runDigitalCalc(); });
        [quantityEl, widthEl, heightEl, sideEl].forEach(el => { if (el) el.addEventListener('input', runDigitalCalc); });
        document.querySelectorAll('input[name="digitalPrintingLamination"]').forEach(r => { r.addEventListener('change', runDigitalCalc); });
        const extrasCheckboxMap = {
            'digitalPrintingExtraSpecialColor': 'digitalPrintingSpecialColorCount',
            'digitalPrintingExtraCreasing': 'digitalPrintingCreasingCount',
            'digitalPrintingExtraPerforation': 'digitalPrintingPerforationCount',
            'digitalPrintingExtraFolderPocket': 'digitalPrintingFolderPocketQty',
            'digitalPrintingExtraBagAssembly': 'digitalPrintingBagQty',
            'digitalPrintingExtraPaperCutting': 'digitalPrintingPaperCuttingCount'
        };
        Object.entries(extrasCheckboxMap).forEach(([cbId, inputId]) => {
            const cb = document.getElementById(cbId);
            const inp = document.getElementById(inputId);
            if (cb) cb.addEventListener('change', () => {
                if (inp) inp.classList.toggle('hidden-section', !cb.checked);
                runDigitalCalc();
            });
            if (inp) inp.addEventListener('input', runDigitalCalc);
        });
        ['digitalPrintingExtraStickerCutting', 'digitalPrintingExtraDieCutting', 'digitalPrintingExtraCornerRounding'].forEach(id => {
            const cb = document.getElementById(id);
            if (cb) cb.addEventListener('change', runDigitalCalc);
        });

        updateLaminationState();

        document.getElementById('digitalPrintingConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const qty = parseInt(quantityEl?.value || 0, 10);
            const w = parseFloat(widthEl?.value || 0);
            const h = parseFloat(heightEl?.value || 0);
            const paperId = paperEl?.value || defaultPaper;
            const printingSide = sideEl?.value || 'single';
            const { laminationType, laminationSide } = getLaminationValues();
            if (qty <= 0 || w <= 0 || h <= 0) {
                Swal.fire('خطأ', 'أدخل الكمية وعرض وارتفاع القطعة.', 'error');
                return;
            }
            if (!DP.isSizeAllowed(w, h)) {
                Swal.fire('خطأ', 'المقاس يتجاوز فرخ الديجيتال 31.5×46.5 سم. غير مسموح في قسم الدجيتال.', 'error');
                return;
            }
            const extrasInputs = getExtrasInputs();
            const paramsSell = buildParams(sellData, paperId, printingSide, laminationType, laminationSide, qty, w, h, extrasInputs);
            const paramsCost = buildParams(costData, paperId, printingSide, laminationType, laminationSide, qty, w, h, extrasInputs);
            const resultSell = DP.calculate(paramsSell);
            const resultCost = DP.calculate(paramsCost);
            if (!resultSell || resultSell.total < 0) {
                Swal.fire('خطأ', 'لم يتم تحديد أسعار البيع. حدد الأسعار من إدارة التسعير (قسم الدجيتال).', 'error');
                return;
            }
            const paper = DP.getPaperTypeById(paperId);
            this.addProduct({
                id: Date.now(),
                type: 'digital_printing',
                productId: paperId,
                productName: `قسم الدجيتال — ${paper ? paper.nameAr : paperId}`,
                quantity: qty,
                widthCm: w,
                heightCm: h,
                paperTypeId: paperId,
                paperTypeNameAr: resultSell.paperTypeNameAr,
                printingSide,
                printingSideLabel: resultSell.printingSideLabel,
                sheetsNeeded: resultSell.sheetsNeeded,
                piecesPerSheet: resultSell.piecesPerSheet,
                breakdown: resultSell,
                price: resultSell.total,
                sellingPrice: resultSell.total,
                productionCost: resultCost ? resultCost.total : 0
            });
            closeModal('digitalPrintingConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });

        runDigitalCalc();
        openModal('digitalPrintingConfigModal');
    },

    async openPaperBagsConfig() {
        const content = document.getElementById('paperBagsConfigContent');
        if (!content) return;
        const db = (typeof window !== 'undefined' && window.db) ? window.db : null;
        if (!db || typeof PaperBagsPricing === 'undefined') {
            content.innerHTML = '<p class="text-red-600">قاعدة البيانات أو وحدة باند الشنط الورقية غير متاحة.</p>';
            if (document.getElementById('paperBagsConfigModal')) openModal('paperBagsConfigModal');
            return;
        }
        const PB = PaperBagsPricing;
        const sellColl = PB.SELL_COLLECTION;
        const costColl = PB.COST_COLLECTION;
        const configDocId = PB.CONFIG_DOC_ID || 'default';
        let sellData = {};
        let costData = {};
        try {
            const sellDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(sellColl) : db.collection(sellColl)).doc(configDocId).get();
            if (sellDoc.exists) sellData = sellDoc.data();
            const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(costColl) : db.collection(costColl)).doc(configDocId).get();
            if (costDoc.exists) costData = costDoc.data();
        } catch (e) { console.warn('Paper bags prices load:', e); }
        const paperTypes = PB.PAPER_TYPES || [];
        const additions = PB.ADDITIONS || [];
        const defaultPaper = paperTypes[0] ? paperTypes[0].id : '';
        const sheetBlockHTML = (num, label) => `
            <div class="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                <h5 class="font-bold text-gray-800 mb-2">${label}</h5>
                <div><label class="block text-sm text-gray-700 mb-1">نوع الورق</label><select id="paperBagsS${num}_Paper" class="w-full border border-gray-300 p-2 rounded">${paperTypes.map(p => `<option value="${p.id}">${p.nameAr}</option>`).join('')}</select></div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-sm text-gray-700 mb-1">الطول (سم)</label><input type="number" id="paperBagsS${num}_Width" step="0.1" min="1" value="20" class="w-full border border-gray-300 p-2 rounded"></div>
                    <div><label class="block text-sm text-gray-700 mb-1">العرض (سم)</label><input type="number" id="paperBagsS${num}_Height" step="0.1" min="1" value="30" class="w-full border border-gray-300 p-2 rounded"></div>
                </div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-sm text-gray-700 mb-1">عدد الأوجه</label><select id="paperBagsS${num}_Sides" class="w-full border border-gray-300 p-2 rounded"><option value="1">وجه واحد</option><option value="2">وجه وظهر</option></select></div>
                    <div><label class="block text-sm text-gray-700 mb-1">عدد الألوان</label><input type="number" id="paperBagsS${num}_Colors" step="1" min="1" value="1" class="w-full border border-gray-300 p-2 rounded"></div>
                </div>
                <div><label class="block text-sm text-gray-700 mb-1">الإضافات</label><div class="flex flex-wrap gap-3">${additions.map(a => `<label class="flex items-center gap-1 cursor-pointer text-sm"><input type="checkbox" id="paperBagsS${num}_Add_${a.id}" class="w-3 h-3 text-brandGold rounded">${a.nameAr}</label>`).join('')}</div></div>
            </div>
        `;
        content.innerHTML = `
            <form id="paperBagsConfigForm" class="space-y-4">
                <p class="text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mb-2">⚠️ الشنطة بتتحسب وهي مفرودة، مش وهي مقفولة</p>
                <div class="space-y-4">
                    <h4 class="font-bold text-gray-800">أولًا: الإعدادات الأساسية</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">نوع الورق <span class="text-red-500">*</span></label>
                            <select id="paperBagsPaperType" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                                ${paperTypes.map(p => `<option value="${p.id}">${p.nameAr}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">الكمية (بالـ 1000 شنطة) <span class="text-red-500">*</span></label>
                            <input type="number" id="paperBagsQuantity1000" step="0.1" min="0.1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">عدد الورق</label>
                            <select id="paperBagsSheetsPerBag" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                                <option value="1">ورقة واحدة</option>
                                <option value="2">ورقتين</option>
                            </select>
                        </div>
                    </div>
                    <div id="paperBagsSheet1Block" class="space-y-3">
                        <h4 class="font-bold text-gray-800">ثانيًا: في حالة ورقة واحدة</h4>
                        <div class="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="block text-sm text-gray-700 mb-1">الطول (سم)</label><input type="number" id="paperBagsSheet1_Width" step="0.1" min="1" value="20" class="w-full border border-gray-300 p-2 rounded"></div>
                                <div><label class="block text-sm text-gray-700 mb-1">العرض (سم)</label><input type="number" id="paperBagsSheet1_Height" step="0.1" min="1" value="30" class="w-full border border-gray-300 p-2 rounded"></div>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div><label class="block text-sm text-gray-700 mb-1">عدد الأوجه</label><select id="paperBagsSheet1_Sides" class="w-full border border-gray-300 p-2 rounded"><option value="1">وجه واحد</option><option value="2">وجه وظهر</option></select></div>
                                <div><label class="block text-sm text-gray-700 mb-1">عدد الألوان لكل وجه</label><input type="number" id="paperBagsSheet1_Colors" step="1" min="1" value="1" class="w-full border border-gray-300 p-2 rounded"></div>
                            </div>
                            <div><label class="block text-sm text-gray-700 mb-1">الإضافات (لكل ورقة)</label><div class="flex flex-wrap gap-3">${additions.map(a => `<label class="flex items-center gap-1 cursor-pointer text-sm"><input type="checkbox" id="paperBagsSheet1_Add_${a.id}" class="w-3 h-3 text-brandGold rounded">${a.nameAr}</label>`).join('')}</div></div>
                        </div>
                    </div>
                    <div id="paperBagsSheet2Block" class="hidden-section space-y-3">
                        <h4 class="font-bold text-gray-800">ثالثًا: في حالة ورقتين</h4>
                        ${sheetBlockHTML(1, 'الورقة الأولى')}
                        ${sheetBlockHTML(2, 'الورقة الثانية')}
                    </div>
                    <div>
                        <h4 class="font-bold text-gray-800 mb-2">سادسًا: نوع اليد</h4>
                        <select id="paperBagsHandleType" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                            <option value="kapsula">يد كبسولة</option>
                            <option value="dabara">يد دبارة</option>
                        </select>
                    </div>
                </div>
                <div id="paperBagsSummary" class="bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm">الإجمالي: 0 ج.م</div>
                <div class="flex gap-3">
                    <button type="button" onclick="closeModal('paperBagsConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;
        const getSheetData = (prefix) => {
            const paperId = document.getElementById(`paperBags${prefix}_Paper`)?.value || document.getElementById('paperBagsPaperType')?.value || defaultPaper;
            const widthCm = parseFloat(document.getElementById(`paperBags${prefix}_Width`)?.value || 20);
            const heightCm = parseFloat(document.getElementById(`paperBags${prefix}_Height`)?.value || 30);
            const sides = parseInt(document.getElementById(`paperBags${prefix}_Sides`)?.value || 1, 10);
            const colors = parseInt(document.getElementById(`paperBags${prefix}_Colors`)?.value || 1, 10);
            const addObj = {};
            additions.forEach(a => {
                const el = document.getElementById(`paperBags${prefix}_Add_${a.id}`);
                addObj[a.id] = el && el.checked;
            });
            return { paperTypeId: paperId, widthCm, heightCm, sides, colors, additions: addObj };
        };
        const runPaperBagsCalc = () => {
            const q = parseFloat(document.getElementById('paperBagsQuantity1000')?.value || 0);
            const sheets = parseInt(document.getElementById('paperBagsSheetsPerBag')?.value || 1, 10);
            const handleTypeId = document.getElementById('paperBagsHandleType')?.value || 'kapsula';
            const sheet1 = sheets === 1 ? getSheetData('Sheet1') : getSheetData('S1');
            sheet1.paperTypeId = sheets === 1 ? (document.getElementById('paperBagsPaperType')?.value || defaultPaper) : sheet1.paperTypeId;
            const sheet2 = sheets === 2 ? getSheetData('S2') : {};
            const result = PB.calculate({
                quantity1000: q,
                sheetsPerBag: sheets,
                sheet1,
                sheet2: sheets === 2 ? sheet2 : {},
                handleTypeId,
                paperPrices: sellData.paperPrices || {},
                handlesPricePer1000: sellData.handlesPricePer1000 != null ? sellData.handlesPricePer1000 : 0,
                printingPricePerSheet: sellData.printingPricePerSheet != null ? sellData.printingPricePerSheet : 0,
                assemblyPricePer1000_1sheet: sellData.assemblyPer1000_1sheet != null ? sellData.assemblyPer1000_1sheet : 0,
                assemblyPricePer1000_2sheets: sellData.assemblyPer1000_2sheets != null ? sellData.assemblyPer1000_2sheets : 0,
                handleTypePricePer1000: handleTypeId === 'dabara' ? (sellData.handleType_dabara != null ? sellData.handleType_dabara : 0) : (sellData.handleType_kapsula != null ? sellData.handleType_kapsula : 0),
                additionsPrices: sellData.additionsPrices || {}
            });
            if (!result) { document.getElementById('paperBagsSummary').innerHTML = 'أدخل الكمية.'; return; }
            let html = `<div class="space-y-1"><div>الورق والقص: ${result.paperCost.toFixed(2)} ج.م</div><div>الزنجات: ${result.handlesCost.toFixed(2)} ج.م</div><div>الطباعة: ${result.printingCost.toFixed(2)} ج.م</div>${result.additionsCost > 0 ? `<div>الإضافات: ${result.additionsCost.toFixed(2)} ج.م</div>` : ''}<div>التقفيل: ${result.assemblyCost.toFixed(2)} ج.م</div><div>${result.handleTypeNameAr}: ${result.handleTypeCost.toFixed(2)} ج.م</div></div><div class="font-bold text-lg mt-2">الإجمالي: ${result.total.toFixed(2)} ج.م</div>`;
            document.getElementById('paperBagsSummary').innerHTML = html;
        };
        const toggleSheetsBlocks = () => {
            const sheets = parseInt(document.getElementById('paperBagsSheetsPerBag')?.value || 1, 10);
            const b1 = document.getElementById('paperBagsSheet1Block');
            const b2 = document.getElementById('paperBagsSheet2Block');
            if (b1) b1.classList.toggle('hidden-section', sheets !== 1);
            if (b2) b2.classList.toggle('hidden-section', sheets !== 2);
        };
        document.getElementById('paperBagsSheetsPerBag')?.addEventListener('change', toggleSheetsBlocks);
        toggleSheetsBlocks();
        ['paperBagsQuantity1000', 'paperBagsPaperType', 'paperBagsSheetsPerBag', 'paperBagsHandleType'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', runPaperBagsCalc);
            if (el && id === 'paperBagsQuantity1000') el.addEventListener('input', runPaperBagsCalc);
        });
        setTimeout(() => {
            document.querySelectorAll('[id^="paperBagsSheet1_"], [id^="paperBagsS1_"], [id^="paperBagsS2_"]').forEach(el => {
                if (el) { el.addEventListener('change', runPaperBagsCalc); if (el.type === 'number' || el.type === 'text') el.addEventListener('input', runPaperBagsCalc); }
            });
        }, 0);
        document.getElementById('paperBagsConfigForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const q = parseFloat(document.getElementById('paperBagsQuantity1000')?.value || 0);
            const sheets = parseInt(document.getElementById('paperBagsSheetsPerBag')?.value || 1, 10);
            const handleTypeId = document.getElementById('paperBagsHandleType')?.value || 'kapsula';
            if (q <= 0) { Swal.fire('خطأ', 'أدخل الكمية بالـ 1000.', 'error'); return; }
            const sheet1 = sheets === 1 ? getSheetData('Sheet1') : getSheetData('S1');
            sheet1.paperTypeId = sheets === 1 ? (document.getElementById('paperBagsPaperType')?.value || defaultPaper) : sheet1.paperTypeId;
            const sheet2 = sheets === 2 ? getSheetData('S2') : {};
            const calcParams = (data) => ({
                quantity1000: q, sheetsPerBag: sheets, sheet1, sheet2, handleTypeId,
                paperPrices: data.paperPrices || {},
                handlesPricePer1000: data.handlesPricePer1000 != null ? data.handlesPricePer1000 : 0,
                printingPricePerSheet: data.printingPricePerSheet != null ? data.printingPricePerSheet : 0,
                assemblyPricePer1000_1sheet: data.assemblyPer1000_1sheet != null ? data.assemblyPer1000_1sheet : 0,
                assemblyPricePer1000_2sheets: data.assemblyPer1000_2sheets != null ? data.assemblyPer1000_2sheets : 0,
                handleTypePricePer1000: handleTypeId === 'dabara' ? (data.handleType_dabara != null ? data.handleType_dabara : 0) : (data.handleType_kapsula != null ? data.handleType_kapsula : 0),
                additionsPrices: data.additionsPrices || {}
            });
            const resultSell = PB.calculate(calcParams(sellData));
            const resultCost = PB.calculate(calcParams(costData));
            if (!resultSell || resultSell.total <= 0) { Swal.fire('خطأ', 'حدد الأسعار من إدارة التسعير (باند الشنط الورقية).', 'error'); return; }
            const paper = PB.getPaperTypeById(sheet1.paperTypeId);
            this.addProduct({ id: Date.now(), type: 'paper_bags', productId: sheet1.paperTypeId, productName: `باند الشنط الورقية — ${paper ? paper.nameAr : sheet1.paperTypeId}`, paperTypeId: sheet1.paperTypeId, paperTypeNameAr: resultSell.paperTypeNameAr, quantity1000: q, quantityBags: resultSell.quantityBags, sheetsPerBag: sheets, widthCm: sheet1.widthCm, heightCm: sheet1.heightCm, handleTypeId, handleTypeNameAr: resultSell.handleTypeNameAr, breakdown: resultSell, price: resultSell.total, sellingPrice: resultSell.total, productionCost: resultCost ? resultCost.total : 0 });
            closeModal('paperBagsConfigModal');
            Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
        });
        runPaperBagsCalc();
        openModal('paperBagsConfigModal');
    },

    // ==================== BROCHURES ====================
    _brochureSheets: [],
    _brochureSheetCounter: 0,

    openBrochuresConfig() {
        const content = document.getElementById('brochuresConfigContent');
        if (!content) return;

        this._brochureSheets = [];
        this._brochureSheetCounter = 0;

        // Build paper type options from BrochuresPricing
        const paperTypes = (typeof BrochuresPricing !== 'undefined') ? BrochuresPricing.PAPER_TYPES : [];
        let paperOptionsHtml = '<option value="">اختر نوع الورق</option>';
        let currentGroup = '';
        for (const pt of paperTypes) {
            if (pt.group !== currentGroup) {
                if (currentGroup) paperOptionsHtml += '</optgroup>';
                paperOptionsHtml += `<optgroup label="${pt.group}">`;
                currentGroup = pt.group;
            }
            paperOptionsHtml += `<option value="${pt.id}">${pt.nameAr}</option>`;
        }
        if (currentGroup) paperOptionsHtml += '</optgroup>';

        // Build additions checkboxes
        const additions = (typeof BrochuresPricing !== 'undefined') ? BrochuresPricing.ADDITIONS : [];
        let additionsHtml = '';
        for (const add of additions) {
            additionsHtml += `
                <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <label class="flex items-center gap-3 cursor-pointer mb-2">
                        <input type="checkbox" id="brochureAdd_${add.id}" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts._brochureRecalc()">
                        <span class="font-bold text-gray-700">${add.nameAr}</span>
                    </label>
                    <div id="brochureAddOpts_${add.id}" class="hidden-section mr-8 space-y-2">
                        ${add.supportsSides ? `<select id="brochureAddSides_${add.id}" class="w-full border border-gray-300 p-2 rounded text-sm" onchange="OrderProducts._brochureRecalc()">
                            <option value="1">وجه واحد</option>
                            <option value="2">وجهين</option>
                        </select>` : ''}
                        ${add.supportsCount ? `<input type="number" id="brochureAddCount_${add.id}" step="1" min="1" value="1" placeholder="العدد" class="w-full border border-gray-300 p-2 rounded text-sm" oninput="OrderProducts._brochureRecalc()">` : ''}
                        ${add.hasForm ? `<label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="brochureAddForm_${add.id}" class="w-4 h-4 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts._brochureRecalc()">
                            <span class="text-sm text-gray-700">+ فورمة</span>
                        </label>` : ''}
                    </div>
                </div>`;
        }

        content.innerHTML = `
            <form id="brochuresConfigForm" class="space-y-4">
                <!-- Brochure Quantity -->
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">عدد البرشورات <span class="text-red-500">*</span></label>
                    <input type="number" id="brochureQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none" oninput="OrderProducts._brochureRecalc()">
                </div>

                <!-- Sheets Container -->
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-bold text-lg text-gray-800"><i class="fas fa-layer-group ml-2 text-blue-600"></i> أوراق البرشور</h4>
                        <button type="button" onclick="OrderProducts._addBrochureSheet()" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition">
                            <i class="fas fa-plus ml-1"></i> إضافة ورقة
                        </button>
                    </div>
                    <div id="brochureSheetsContainer" class="space-y-4">
                        <div class="text-center text-gray-400 py-4 text-sm">اضغط "إضافة ورقة" لإضافة أوراق البرشور</div>
                    </div>
                </div>

                <!-- Additions -->
                <div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                    <label class="flex items-center gap-3 cursor-pointer mb-3">
                        <input type="checkbox" id="brochureAdditionsToggle" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="document.getElementById('brochureAdditionsContent').classList.toggle('hidden-section')">
                        <span class="font-bold text-gray-800 text-lg">إضافات البرشورات</span>
                    </label>
                    <div id="brochureAdditionsContent" class="hidden-section space-y-3">
                        ${additionsHtml}
                    </div>
                </div>

                <!-- Calculation Display -->
                <div id="brochureCalcDisplay" class="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                    <div class="text-center text-gray-500">أضف أوراق البرشور لحساب السعر</div>
                </div>

                <div class="flex gap-3 mt-4">
                    <button type="button" onclick="closeModal('brochuresConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;

        // Add first sheet automatically
        this._addBrochureSheet();

        // Toggle additions checkboxes
        const addCheckboxes = additions.map(a => document.getElementById(`brochureAdd_${a.id}`));
        addCheckboxes.forEach(cb => {
            if (cb) cb.addEventListener('change', () => {
                const addId = cb.id.replace('brochureAdd_', '');
                const opts = document.getElementById(`brochureAddOpts_${addId}`);
                if (opts) opts.classList.toggle('hidden-section', !cb.checked);
                this._brochureRecalc();
            });
        });

        // Form submit
        document.getElementById('brochuresConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this._submitBrochure();
        });

        openModal('brochuresConfigModal');
    },

    _addBrochureSheet() {
        this._brochureSheetCounter++;
        const idx = this._brochureSheetCounter;
        const paperTypes = (typeof BrochuresPricing !== 'undefined') ? BrochuresPricing.PAPER_TYPES : [];
        let paperOptionsHtml = '<option value="">اختر نوع الورق</option>';
        let currentGroup = '';
        for (const pt of paperTypes) {
            if (pt.group !== currentGroup) {
                if (currentGroup) paperOptionsHtml += '</optgroup>';
                paperOptionsHtml += `<optgroup label="${pt.group}">`;
                currentGroup = pt.group;
            }
            paperOptionsHtml += `<option value="${pt.id}">${pt.nameAr}</option>`;
        }
        if (currentGroup) paperOptionsHtml += '</optgroup>';

        this._brochureSheets.push(idx);
        const container = document.getElementById('brochureSheetsContainer');
        if (!container) return;

        // Remove placeholder if first sheet
        if (this._brochureSheets.length === 1) {
            container.innerHTML = '';
        }

        const sheetDiv = document.createElement('div');
        sheetDiv.id = `brochureSheet_${idx}`;
        sheetDiv.className = 'bg-white p-4 rounded-xl border-2 border-blue-300 shadow-sm';
        sheetDiv.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h5 class="font-bold text-gray-800"><i class="fas fa-file-alt ml-1 text-blue-500"></i> ورقة ${idx}</h5>
                <button type="button" onclick="OrderProducts._removeBrochureSheet(${idx})" class="text-red-500 hover:text-red-700 text-sm font-bold">
                    <i class="fas fa-trash ml-1"></i> حذف
                </button>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">نوع الورق</label>
                    <select id="bSheet_paper_${idx}" class="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-brandGold outline-none" onchange="OrderProducts._brochureRecalc()">
                        ${paperOptionsHtml}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">الطول (سم)</label>
                        <input type="number" id="bSheet_w_${idx}" step="0.01" min="0" placeholder="0" class="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-brandGold outline-none" oninput="OrderProducts._brochureRecalc()">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">العرض (سم)</label>
                        <input type="number" id="bSheet_h_${idx}" step="0.01" min="0" placeholder="0" class="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-brandGold outline-none" oninput="OrderProducts._brochureRecalc()">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">ألوان الطباعة</label>
                        <select id="bSheet_colors_${idx}" class="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-brandGold outline-none" onchange="OrderProducts._brochureRecalc()">
                            <option value="4">أربع ألوان</option>
                            <option value="1">لون واحد</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">عدد التكرار</label>
                        <input type="number" id="bSheet_rep_${idx}" step="1" min="1" value="1" class="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-brandGold outline-none" oninput="OrderProducts._brochureRecalc()">
                    </div>
                </div>
                <div class="bg-indigo-50 p-2 rounded border border-indigo-100">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" id="bSheet_double_${idx}" class="w-4 h-4 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts._brochureRecalc()">
                        <span class="text-sm font-bold text-gray-700">طباعة وجهين</span>
                    </label>
                </div>
            </div>
        `;
        container.appendChild(sheetDiv);
        this._brochureRecalc();
    },

    _removeBrochureSheet(idx) {
        this._brochureSheets = this._brochureSheets.filter(i => i !== idx);
        const el = document.getElementById(`brochureSheet_${idx}`);
        if (el) el.remove();
        if (this._brochureSheets.length === 0) {
            const container = document.getElementById('brochureSheetsContainer');
            if (container) container.innerHTML = '<div class="text-center text-gray-400 py-4 text-sm">اضغط "إضافة ورقة" لإضافة أوراق البرشور</div>';
        }
        this._brochureRecalc();
    },

    _getBrochureSheetData(idx) {
        return {
            paperTypeId: document.getElementById(`bSheet_paper_${idx}`)?.value || '',
            widthCm: parseFloat(document.getElementById(`bSheet_w_${idx}`)?.value) || 0,
            heightCm: parseFloat(document.getElementById(`bSheet_h_${idx}`)?.value) || 0,
            colors: parseInt(document.getElementById(`bSheet_colors_${idx}`)?.value) || 4,
            doubleSided: document.getElementById(`bSheet_double_${idx}`)?.checked || false,
            repetition: parseInt(document.getElementById(`bSheet_rep_${idx}`)?.value) || 1
        };
    },

    _getBrochureAdditions() {
        const additions = {};
        const addList = (typeof BrochuresPricing !== 'undefined') ? BrochuresPricing.ADDITIONS : [];
        for (const add of addList) {
            const cb = document.getElementById(`brochureAdd_${add.id}`);
            if (cb && cb.checked) {
                const entry = { selected: true };
                if (add.supportsSides) {
                    entry.sides = parseInt(document.getElementById(`brochureAddSides_${add.id}`)?.value) || 1;
                }
                if (add.supportsCount) {
                    entry.count = parseInt(document.getElementById(`brochureAddCount_${add.id}`)?.value) || 1;
                }
                if (add.hasForm) {
                    entry.withForm = document.getElementById(`brochureAddForm_${add.id}`)?.checked || false;
                }
                additions[add.id] = entry;
            }
        }
        return additions;
    },

    _brochureRecalc() {
        const display = document.getElementById('brochureCalcDisplay');
        if (!display) return;

        const brochureQty = parseInt(document.getElementById('brochureQuantity')?.value) || 0;
        const sheets = this._brochureSheets.map(idx => this._getBrochureSheetData(idx));
        const validSheets = sheets.filter(s => s.paperTypeId && s.widthCm > 0 && s.heightCm > 0);

        if (brochureQty <= 0 || validSheets.length === 0) {
            display.innerHTML = '<div class="text-center text-gray-500">أضف أوراق البرشور واملأ البيانات لحساب السعر</div>';
            return;
        }

        const additions = this._getBrochureAdditions();
        const finishing = null;

        if (typeof BrochuresPricing === 'undefined') {
            display.innerHTML = '<div class="text-center text-red-500">وحدة تسعير البرشورات غير متاحة</div>';
            return;
        }

        const calc = BrochuresPricing.calculate({
            brochureQuantity: brochureQty,
            sheets: validSheets,
            additions,
            finishing
        });

        if (!calc) {
            display.innerHTML = '<div class="text-center text-red-500">تعذر حساب السعر</div>';
            return;
        }

        const sellingPrice = calc.totalCost;

        // Build breakdown HTML
        let sheetsBreakdown = '';
        calc.sheetResults.forEach((sr, i) => {
            sheetsBreakdown += `
                <div class="flex justify-between text-xs mb-1">
                    <span>ورقة ${i + 1}: ${sr.paperTypeName} (${sr.widthCm}×${sr.heightCm} سم) × ${sr.repetition} تكرار</span>
                    <span class="font-bold">${sr.totalCost.toFixed(2)} ج.م</span>
                </div>`;
        });

        display.innerHTML = `
            <div class="space-y-2 text-sm">
                <div class="bg-blue-50 p-3 rounded border border-blue-200">
                    <strong class="block mb-2">تفاصيل الأوراق (لكل برشور):</strong>
                    ${sheetsBreakdown}
                    <div class="flex justify-between border-t pt-1 mt-1 font-bold">
                        <span>إجمالي أوراق البرشور الواحد:</span>
                        <span>${calc.totalSheetsCostPerBrochure.toFixed(2)} ج.م</span>
                    </div>
                </div>
                <div class="bg-gray-50 p-3 rounded border border-gray-200">
                    <div class="flex justify-between text-xs mb-1">
                        <span>تكلفة الأوراق × ${brochureQty} برشور:</span>
                        <span class="font-bold">${calc.totalSheetsCost.toFixed(2)} ج.م</span>
                    </div>
                    ${calc.additionsCost > 0 ? `<div class="flex justify-between text-xs mb-1">
                        <span>إضافات البرشورات:</span>
                        <span class="font-bold">${calc.additionsCost.toFixed(2)} ج.م</span>
                    </div>` : ''}
                    <div class="flex justify-between border-t pt-1 mt-1 font-bold">
                        <span>الإجمالي:</span>
                        <span class="text-lg">${calc.totalCost.toFixed(2)} ج.م</span>
                    </div>
                </div>
                <div class="bg-green-50 p-3 rounded border border-green-200">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-gray-700 text-lg">سعر البيع:</span>
                        <span class="text-2xl font-bold text-brandGold">${sellingPrice.toFixed(2)} ج.م</span>
                    </div>
                </div>
            </div>
        `;
    },

    _submitBrochure() {
        const brochureQty = parseInt(document.getElementById('brochureQuantity')?.value) || 0;
        if (brochureQty <= 0) {
            Swal.fire('خطأ', 'أدخل عدد البرشورات', 'error');
            return;
        }

        const sheets = this._brochureSheets.map(idx => this._getBrochureSheetData(idx));
        const validSheets = sheets.filter(s => s.paperTypeId && s.widthCm > 0 && s.heightCm > 0);
        if (validSheets.length === 0) {
            Swal.fire('خطأ', 'أضف ورقة واحدة على الأقل مع بيانات صحيحة', 'error');
            return;
        }

        const additions = this._getBrochureAdditions();
        const finishing = null;

        const calc = BrochuresPricing.calculate({
            brochureQuantity: brochureQty,
            sheets: validSheets,
            additions,
            finishing
        });

        if (!calc || calc.totalCost <= 0) {
            Swal.fire('خطأ', 'تعذر حساب السعر. تأكد من إدخال جميع البيانات.', 'error');
            return;
        }

        const costPrice = calc.totalCost;
        const sellingPrice = calc.totalCost;

        // Build sheet summary for display
        const sheetsSummary = validSheets.map((s, i) => {
            const pt = BrochuresPricing.getPaperTypeById(s.paperTypeId);
            return `${pt ? pt.nameAr : s.paperTypeId} (${s.widthCm}×${s.heightCm}) ×${s.repetition}`;
        }).join(' | ');

        const product = {
            id: Date.now(),
            type: 'brochures',
            brochureQuantity: brochureQty,
            sheets: validSheets,
            additions,
            finishing,
            calculation: calc,
            sheetsSummary,
            productionCost: calc.totalCost,
            costPrice,
            sellingPrice,
            price: sellingPrice
        };

        this.addProduct(product);
        closeModal('brochuresConfigModal');
        Swal.fire('تم', 'تم إضافة البرشور بنجاح', 'success');
    },

    // ==================== CATALOGS ====================
    _catalogSheets: [],
    _catalogSheetCounter: 0,
    _catalogSellPrices: {},
    _catalogCostPrices: {},

    async openCatalogsConfig() {
        const content = document.getElementById('catalogsConfigContent');
        if (!content) return;

        this._catalogSheets = [];
        this._catalogSheetCounter = 0;

        // Pre-load pricing data once (cached for this session)
        try {
            if (typeof PricingService !== 'undefined') {
                const [sellData, costData] = await Promise.all([
                    PricingService.loadPricing('catalogs', 'selling'),
                    PricingService.loadPricing('catalogs', 'cost')
                ]);
                this._catalogSellPrices = (sellData && sellData.paperPrices) ? sellData.paperPrices : (sellData || {});
                this._catalogCostPrices = (costData && costData.paperPrices) ? costData.paperPrices : (costData || {});
            }
        } catch (e) { console.warn('Catalog prices preload:', e); }

        // Build paper type options from CatalogsPricing (= digital paper types)
        const paperTypes = (typeof CatalogsPricing !== 'undefined') ? CatalogsPricing.getPaperTypes() : [];
        let paperOptionsHtml = '<option value="">اختر نوع الورق</option>';
        for (const pt of paperTypes) {
            paperOptionsHtml += `<option value="${pt.id}">${pt.nameAr}</option>`;
        }

        // Build additions checkboxes (same as brochures)
        const additions = (typeof CatalogsPricing !== 'undefined') ? CatalogsPricing.ADDITIONS : [];
        let additionsHtml = '';
        for (const add of additions) {
            additionsHtml += `
                <div class="bg-white p-3 rounded-lg border border-gray-200">
                    <label class="flex items-center gap-3 cursor-pointer mb-2">
                        <input type="checkbox" id="catalogAdd_${add.id}" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts._catalogRecalc()">
                        <span class="font-bold text-gray-700">${add.nameAr}</span>
                    </label>
                    <div id="catalogAddOpts_${add.id}" class="hidden-section mr-8 space-y-2">
                        ${add.supportsSides ? `<select id="catalogAddSides_${add.id}" class="w-full border border-gray-300 p-2 rounded text-sm" onchange="OrderProducts._catalogRecalc()">
                            <option value="1">وجه واحد</option>
                            <option value="2">وجهين</option>
                        </select>` : ''}
                        ${add.supportsCount ? `<input type="number" id="catalogAddCount_${add.id}" step="1" min="1" value="1" placeholder="العدد" class="w-full border border-gray-300 p-2 rounded text-sm" oninput="OrderProducts._catalogRecalc()">` : ''}
                        ${add.hasForm ? `<label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" id="catalogAddForm_${add.id}" class="w-4 h-4 text-brandGold rounded focus:ring-brandGold" onchange="OrderProducts._catalogRecalc()">
                            <span class="text-sm text-gray-700">+ فورمة</span>
                        </label>` : ''}
                    </div>
                </div>`;
        }

        content.innerHTML = `
            <form id="catalogsConfigForm" class="space-y-4">
                <!-- Catalog Quantity -->
                <div>
                    <label class="block text-sm font-bold text-gray-700 mb-1">عدد الكتالوجات <span class="text-red-500">*</span></label>
                    <input type="number" id="catalogQuantity" step="1" min="1" value="1" required class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none" oninput="OrderProducts._catalogRecalc()">
                </div>

                <!-- Fixed size info -->
                <div class="bg-gray-100 p-3 rounded-xl border border-gray-200 text-center">
                    <span class="text-sm text-gray-600"><i class="fas fa-ruler-combined ml-1 text-gray-500"></i> مقاس الورقة الأساسي: <strong>32 × 64 سم</strong></span>
                </div>

                <!-- Sheets Container -->
                <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                    <div class="flex justify-between items-center mb-3">
                        <h4 class="font-bold text-lg text-gray-800"><i class="fas fa-layer-group ml-2 text-emerald-600"></i> أوراق الكتالوج</h4>
                        <button type="button" onclick="OrderProducts._addCatalogSheet()" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition">
                            <i class="fas fa-plus ml-1"></i> إضافة ورقة
                        </button>
                    </div>
                    <div id="catalogSheetsContainer" class="space-y-4">
                        <div class="text-center text-gray-400 py-4 text-sm">اضغط "إضافة ورقة" لإضافة أوراق الكتالوج</div>
                    </div>
                </div>

                <!-- Additions -->
                <div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                    <label class="flex items-center gap-3 cursor-pointer mb-3">
                        <input type="checkbox" id="catalogAdditionsToggle" class="w-5 h-5 text-brandGold rounded focus:ring-brandGold" onchange="document.getElementById('catalogAdditionsContent').classList.toggle('hidden-section')">
                        <span class="font-bold text-gray-800 text-lg">إضافات الكتالوجات</span>
                    </label>
                    <div id="catalogAdditionsContent" class="hidden-section space-y-3">
                        ${additionsHtml}
                    </div>
                </div>

                <!-- Calculation Display -->
                <div id="catalogCalcDisplay" class="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                    <div class="text-center text-gray-500">أضف أوراق الكتالوج لحساب السعر</div>
                </div>

                <div class="flex gap-3 mt-4">
                    <button type="button" onclick="closeModal('catalogsConfigModal')" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">إلغاء</button>
                    <button type="submit" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">إضافة المنتج</button>
                </div>
            </form>
        `;

        // Add first sheet automatically
        this._addCatalogSheet();

        // Toggle additions checkboxes
        const addCheckboxes = additions.map(a => document.getElementById(`catalogAdd_${a.id}`));
        addCheckboxes.forEach(cb => {
            if (cb) cb.addEventListener('change', () => {
                const addId = cb.id.replace('catalogAdd_', '');
                const opts = document.getElementById(`catalogAddOpts_${addId}`);
                if (opts) opts.classList.toggle('hidden-section', !cb.checked);
                this._catalogRecalc();
            });
        });

        // Form submit
        document.getElementById('catalogsConfigForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this._submitCatalog();
        });

        openModal('catalogsConfigModal');
    },

    _addCatalogSheet() {
        this._catalogSheetCounter++;
        const idx = this._catalogSheetCounter;
        const paperTypes = (typeof CatalogsPricing !== 'undefined') ? CatalogsPricing.getPaperTypes() : [];
        let paperOptionsHtml = '<option value="">اختر نوع الورق</option>';
        for (const pt of paperTypes) {
            paperOptionsHtml += `<option value="${pt.id}">${pt.nameAr}</option>`;
        }

        this._catalogSheets.push(idx);
        const container = document.getElementById('catalogSheetsContainer');
        if (!container) return;

        // Remove placeholder if first sheet
        if (this._catalogSheets.length === 1) {
            container.innerHTML = '';
        }

        const sheetDiv = document.createElement('div');
        sheetDiv.id = `catalogSheet_${idx}`;
        sheetDiv.className = 'bg-white p-4 rounded-xl border-2 border-emerald-300 shadow-sm';
        sheetDiv.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h5 class="font-bold text-gray-800"><i class="fas fa-file-alt ml-1 text-emerald-500"></i> ورقة ${idx}</h5>
                <button type="button" onclick="OrderProducts._removeCatalogSheet(${idx})" class="text-red-500 hover:text-red-700 text-sm font-bold">
                    <i class="fas fa-trash ml-1"></i> حذف
                </button>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-bold text-gray-600 mb-1">نوع الورق</label>
                    <select id="cSheet_paper_${idx}" class="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-brandGold outline-none" onchange="OrderProducts._catalogRecalc()">
                        ${paperOptionsHtml}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">طباعة</label>
                        <select id="cSheet_side_${idx}" class="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-brandGold outline-none" onchange="OrderProducts._catalogRecalc()">
                            <option value="single">وجه واحد</option>
                            <option value="double">وجهين</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-600 mb-1">عدد التكرار</label>
                        <input type="number" id="cSheet_rep_${idx}" step="1" min="1" value="1" class="w-full border border-gray-300 p-2 rounded-lg text-sm focus:border-brandGold outline-none" oninput="OrderProducts._catalogRecalc()">
                    </div>
                </div>
            </div>
        `;
        container.appendChild(sheetDiv);
        this._catalogRecalc();
    },

    _removeCatalogSheet(idx) {
        this._catalogSheets = this._catalogSheets.filter(i => i !== idx);
        const el = document.getElementById(`catalogSheet_${idx}`);
        if (el) el.remove();
        if (this._catalogSheets.length === 0) {
            const container = document.getElementById('catalogSheetsContainer');
            if (container) container.innerHTML = '<div class="text-center text-gray-400 py-4 text-sm">اضغط "إضافة ورقة" لإضافة أوراق الكتالوج</div>';
        }
        this._catalogRecalc();
    },

    _getCatalogSheetData(idx) {
        return {
            paperTypeId: document.getElementById(`cSheet_paper_${idx}`)?.value || '',
            printingSide: document.getElementById(`cSheet_side_${idx}`)?.value || 'single',
            repetition: parseInt(document.getElementById(`cSheet_rep_${idx}`)?.value) || 1
        };
    },

    _getCatalogAdditions() {
        const additions = {};
        const addList = (typeof CatalogsPricing !== 'undefined') ? CatalogsPricing.ADDITIONS : [];
        for (const add of addList) {
            const cb = document.getElementById(`catalogAdd_${add.id}`);
            if (cb && cb.checked) {
                const entry = { selected: true };
                if (add.supportsSides) {
                    entry.sides = parseInt(document.getElementById(`catalogAddSides_${add.id}`)?.value) || 1;
                }
                if (add.supportsCount) {
                    entry.count = parseInt(document.getElementById(`catalogAddCount_${add.id}`)?.value) || 1;
                }
                if (add.hasForm) {
                    entry.withForm = document.getElementById(`catalogAddForm_${add.id}`)?.checked || false;
                }
                additions[add.id] = entry;
            }
        }
        return additions;
    },

    _catalogRecalc() {
        const display = document.getElementById('catalogCalcDisplay');
        if (!display) return;

        const catalogQty = parseInt(document.getElementById('catalogQuantity')?.value) || 0;
        const sheets = this._catalogSheets.map(idx => this._getCatalogSheetData(idx));
        const validSheets = sheets.filter(s => s.paperTypeId);

        if (catalogQty <= 0 || validSheets.length === 0) {
            display.innerHTML = '<div class="text-center text-gray-500">أضف أوراق الكتالوج واملأ البيانات لحساب السعر</div>';
            return;
        }

        const additions = this._getCatalogAdditions();
        const finishing = null;

        if (typeof CatalogsPricing === 'undefined') {
            display.innerHTML = '<div class="text-center text-red-500">وحدة تسعير الكتالوجات غير متاحة</div>';
            return;
        }

        // Use cached prices (loaded once in openCatalogsConfig)
        const calcSell = CatalogsPricing.calculate({
            catalogQuantity: catalogQty,
            sheets: validSheets,
            additions,
            finishing,
            prices: this._catalogSellPrices
        });

        const calcCost = CatalogsPricing.calculate({
            catalogQuantity: catalogQty,
            sheets: validSheets,
            additions,
            finishing,
            prices: this._catalogCostPrices
        });

        if (!calcSell) {
            display.innerHTML = '<div class="text-center text-red-500">تعذر حساب السعر</div>';
            return;
        }

        const sellingPrice = calcSell.totalCost;

        // Build breakdown HTML
        let sheetsBreakdown = '';
        calcSell.sheetResults.forEach((sr, i) => {
            sheetsBreakdown += `
                <div class="flex justify-between text-xs mb-1">
                    <span>ورقة ${i + 1}: ${sr.paperTypeName} (${sr.printingSide === 'double' ? 'وجهين' : 'وجه'}) × ${sr.repetition} تكرار</span>
                    <span class="font-bold">${sr.totalCost.toFixed(2)} ج.م</span>
                </div>`;
        });

        display.innerHTML = `
            <div class="space-y-2 text-sm">
                <div class="bg-emerald-50 p-3 rounded border border-emerald-200">
                    <strong class="block mb-2">تفاصيل الأوراق (لكل كتالوج):</strong>
                    ${sheetsBreakdown}
                    <div class="flex justify-between border-t pt-1 mt-1 font-bold">
                        <span>إجمالي أوراق الكتالوج الواحد:</span>
                        <span>${calcSell.totalSheetsCostPerCatalog.toFixed(2)} ج.م</span>
                    </div>
                </div>
                <div class="bg-gray-50 p-3 rounded border border-gray-200">
                    <div class="flex justify-between text-xs mb-1">
                        <span>تكلفة الأوراق × ${catalogQty} كتالوج:</span>
                        <span class="font-bold">${calcSell.totalSheetsCost.toFixed(2)} ج.م</span>
                    </div>
                    ${calcSell.additionsCost > 0 ? `<div class="flex justify-between text-xs mb-1">
                        <span>إضافات الكتالوجات:</span>
                        <span class="font-bold">${calcSell.additionsCost.toFixed(2)} ج.م</span>
                    </div>` : ''}
                    <div class="flex justify-between border-t pt-1 mt-1 font-bold">
                        <span>الإجمالي:</span>
                        <span class="text-lg">${calcSell.totalCost.toFixed(2)} ج.م</span>
                    </div>
                </div>
                <div class="bg-green-50 p-3 rounded border border-green-200">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-gray-700 text-lg">سعر البيع:</span>
                        <span class="text-2xl font-bold text-brandGold">${sellingPrice.toFixed(2)} ج.م</span>
                    </div>
                </div>
            </div>
        `;
    },

    async _submitCatalog() {
        const catalogQty = parseInt(document.getElementById('catalogQuantity')?.value) || 0;
        if (catalogQty <= 0) {
            Swal.fire('خطأ', 'أدخل عدد الكتالوجات', 'error');
            return;
        }

        const sheets = this._catalogSheets.map(idx => this._getCatalogSheetData(idx));
        const validSheets = sheets.filter(s => s.paperTypeId);
        if (validSheets.length === 0) {
            Swal.fire('خطأ', 'أضف ورقة واحدة على الأقل مع اختيار نوع الورق', 'error');
            return;
        }

        const additions = this._getCatalogAdditions();
        const finishing = null;

        // Use cached prices (loaded once in openCatalogsConfig)
        const calcSell = CatalogsPricing.calculate({
            catalogQuantity: catalogQty,
            sheets: validSheets,
            additions,
            finishing,
            prices: this._catalogSellPrices
        });

        const calcCost = CatalogsPricing.calculate({
            catalogQuantity: catalogQty,
            sheets: validSheets,
            additions,
            finishing,
            prices: this._catalogCostPrices
        });

        if (!calcSell || calcSell.totalCost <= 0) {
            Swal.fire('خطأ', 'تعذر حساب السعر. تأكد من تسعير الأوراق في إدارة التسعير (الكتالوجات).', 'error');
            return;
        }

        const costPrice = calcCost ? calcCost.totalCost : calcSell.totalCost;
        const sellingPrice = calcSell.totalCost;

        // Build sheet summary
        const sheetsSummary = validSheets.map((s, i) => {
            const pt = CatalogsPricing.getPaperTypeById(s.paperTypeId);
            return `${pt ? pt.nameAr : s.paperTypeId} (${s.printingSide === 'double' ? 'وجهين' : 'وجه'}) ×${s.repetition}`;
        }).join(' | ');

        const product = {
            id: Date.now(),
            type: 'catalogs',
            catalogQuantity: catalogQty,
            sheets: validSheets,
            additions,
            finishing,
            calculation: calcSell,
            sheetsSummary,
            productionCost: costPrice,
            costPrice,
            sellingPrice,
            price: sellingPrice
        };

        this.addProduct(product);
        closeModal('catalogsConfigModal');
        Swal.fire('تم', 'تم إضافة الكتالوج بنجاح', 'success');
    },

    // ==================== ACRYLIC & BADGE ====================
    _acrylicBadgeSellPrices: null,
    _acrylicBadgeCostPrices: null,

    async openAcrylicBadgeConfig() {
        const content = document.getElementById('acrylicBadgeConfigContent');
        if (!content) return;

        // Load prices once
        try {
            const sellDoc = await PricingService.loadPricing('acrylic_badge', 'selling');
            this._acrylicBadgeSellPrices = (sellDoc && sellDoc.prices) ? sellDoc.prices : {};
        } catch(e) { this._acrylicBadgeSellPrices = {}; }
        try {
            const costDoc = await PricingService.loadPricing('acrylic_badge', 'cost');
            this._acrylicBadgeCostPrices = (costDoc && costDoc.prices) ? costDoc.prices : {};
        } catch(e) { this._acrylicBadgeCostPrices = {}; }

        const materialOpts = AcrylicBadgePricing.ACRYLIC_MATERIALS.map(m =>
            `<option value="${m.id}">${m.nameAr}</option>`
        ).join('');

        const additionsCheckboxes = AcrylicBadgePricing.ACRYLIC_ADDITIONS.map(a =>
            `<label class="flex items-center gap-2 text-sm">
                <input type="checkbox" value="${a.id}" onchange="OrderProducts._acrylicBadgeRecalc()" class="ab-addition-chk rounded">
                ${a.nameAr}
            </label>`
        ).join('');

        const screwOpts = AcrylicBadgePricing.SCREW_TYPES.map(s =>
            `<option value="${s.id}">${s.nameAr}</option>`
        ).join('');

        content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block font-bold mb-1">نوع المنتج</label>
                    <select id="abSubBand" onchange="OrderProducts._acrylicBadgeRecalc()" class="w-full border p-2 rounded">
                        <option value="acrylic">اكريلك</option>
                        <option value="badge">باغ (دهبي / فضي)</option>
                    </select>
                </div>
                <div id="abMaterialRow">
                    <label class="block font-bold mb-1">خامة الاكريلك</label>
                    <select id="abMaterial" onchange="OrderProducts._acrylicBadgeRecalc()" class="w-full border p-2 rounded">
                        ${materialOpts}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold mb-1">العرض (سم)</label>
                        <input id="abWidth" type="number" min="1" value="20" oninput="OrderProducts._acrylicBadgeRecalc()" class="w-full border p-2 rounded">
                    </div>
                    <div>
                        <label class="block font-bold mb-1">الطول (سم)</label>
                        <input id="abHeight" type="number" min="1" value="30" oninput="OrderProducts._acrylicBadgeRecalc()" class="w-full border p-2 rounded">
                    </div>
                </div>
                <div>
                    <label class="block font-bold mb-1">الكمية</label>
                    <input id="abQuantity" type="number" min="1" value="1" oninput="OrderProducts._acrylicBadgeRecalc()" class="w-full border p-2 rounded">
                </div>
                <div id="abAdditionsRow">
                    <label class="block font-bold mb-1">إضافات</label>
                    <div class="flex flex-wrap gap-4">${additionsCheckboxes}</div>
                </div>
                <div>
                    <label class="block font-bold mb-1">مسامير ديكور</label>
                    <div class="grid grid-cols-2 gap-3" id="abScrewsContainer">
                        <select id="abScrewType" class="border p-2 rounded">${screwOpts}</select>
                        <input id="abScrewCount" type="number" min="0" value="0" oninput="OrderProducts._acrylicBadgeRecalc()" class="border p-2 rounded" placeholder="عدد المسامير">
                    </div>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="text-lg font-bold text-center" id="abTotalPrice">الإجمالي: 0 ج.م</div>
                    <div class="text-sm text-gray-500 text-center mt-1" id="abPriceBreakdown"></div>
                </div>
                <button onclick="OrderProducts._submitAcrylicBadge()" class="w-full bg-cyan-600 text-white py-3 rounded-lg font-bold hover:bg-cyan-700 transition">إضافة للطلب</button>
            </div>
        `;

        openModal('acrylicBadgeConfigModal');
        this._acrylicBadgeRecalc();
    },

    _acrylicBadgeRecalc() {
        const subBand = document.getElementById('abSubBand')?.value || 'acrylic';
        const materialRow = document.getElementById('abMaterialRow');
        const additionsRow = document.getElementById('abAdditionsRow');
        if (materialRow) materialRow.style.display = subBand === 'acrylic' ? '' : 'none';
        if (additionsRow) additionsRow.style.display = subBand === 'acrylic' ? '' : 'none';

        const width = parseFloat(document.getElementById('abWidth')?.value) || 0;
        const height = parseFloat(document.getElementById('abHeight')?.value) || 0;
        const quantity = parseInt(document.getElementById('abQuantity')?.value) || 0;
        const prices = this._acrylicBadgeSellPrices || {};

        let result = null;
        if (subBand === 'acrylic') {
            const materialId = document.getElementById('abMaterial')?.value || '';
            const additions = [];
            document.querySelectorAll('.ab-addition-chk:checked').forEach(chk => additions.push(chk.value));
            const screwId = document.getElementById('abScrewType')?.value || '';
            const screwCount = parseInt(document.getElementById('abScrewCount')?.value) || 0;
            const screws = {};
            if (screwId && screwCount > 0) screws[screwId] = screwCount;
            result = AcrylicBadgePricing.calculateAcrylic({ materialId, width, height, quantity, prices, additions, screws });
        } else {
            const screwId = document.getElementById('abScrewType')?.value || '';
            const screwCount = parseInt(document.getElementById('abScrewCount')?.value) || 0;
            const screws = {};
            if (screwId && screwCount > 0) screws[screwId] = screwCount;
            result = AcrylicBadgePricing.calculateBadge({ width, height, quantity, prices, screws });
        }

        const totalEl = document.getElementById('abTotalPrice');
        const breakdownEl = document.getElementById('abPriceBreakdown');
        if (result) {
            totalEl.textContent = `الإجمالي: ${result.grandTotal.toFixed(2)} ج.م`;
            let bd = `سعر القطعة: ${result.pricePerPiece.toFixed(2)} ج.م`;
            if (result.additionsTotal > 0) bd += ` | إضافات: ${result.additionsTotal.toFixed(2)}`;
            if (result.screwsTotal > 0) bd += ` | مسامير: ${result.screwsTotal.toFixed(2)}`;
            breakdownEl.textContent = bd;
        } else {
            totalEl.textContent = 'الإجمالي: 0 ج.م';
            breakdownEl.textContent = '';
        }
    },

    _submitAcrylicBadge() {
        const subBand = document.getElementById('abSubBand')?.value || 'acrylic';
        const width = parseFloat(document.getElementById('abWidth')?.value) || 0;
        const height = parseFloat(document.getElementById('abHeight')?.value) || 0;
        const quantity = parseInt(document.getElementById('abQuantity')?.value) || 0;

        if (width <= 0 || height <= 0 || quantity <= 0) {
            Swal.fire('خطأ', 'يرجى إدخال الأبعاد والكمية', 'error');
            return;
        }

        const sellPrices = this._acrylicBadgeSellPrices || {};
        const costPrices = this._acrylicBadgeCostPrices || {};

        const screwId = document.getElementById('abScrewType')?.value || '';
        const screwCount = parseInt(document.getElementById('abScrewCount')?.value) || 0;
        const screws = {};
        if (screwId && screwCount > 0) screws[screwId] = screwCount;

        let calcSell, calcCost;
        let productName;

        if (subBand === 'acrylic') {
            const materialId = document.getElementById('abMaterial')?.value || '';
            const additions = [];
            document.querySelectorAll('.ab-addition-chk:checked').forEach(chk => additions.push(chk.value));
            calcSell = AcrylicBadgePricing.calculateAcrylic({ materialId, width, height, quantity, prices: sellPrices, additions, screws });
            calcCost = AcrylicBadgePricing.calculateAcrylic({ materialId, width, height, quantity, prices: costPrices, additions, screws });
            const mat = AcrylicBadgePricing.getMaterialById(materialId);
            productName = mat ? mat.nameAr : 'اكريلك';
        } else {
            calcSell = AcrylicBadgePricing.calculateBadge({ width, height, quantity, prices: sellPrices, screws });
            calcCost = AcrylicBadgePricing.calculateBadge({ width, height, quantity, prices: costPrices, screws });
            productName = 'باغ (دهبي / فضي)';
        }

        if (!calcSell) {
            Swal.fire('خطأ', 'لا يمكن حساب السعر — تأكد من البيانات', 'error');
            return;
        }

        const costPrice = calcCost ? calcCost.grandTotal : calcSell.grandTotal;
        const sellingPrice = calcSell.grandTotal;

        const product = {
            id: Date.now(),
            type: 'acrylic_badge',
            subBand,
            productName,
            width,
            height,
            quantity,
            calculation: calcSell,
            productionCost: costPrice,
            costPrice,
            sellingPrice,
            price: sellingPrice
        };

        this.addProduct(product);
        closeModal('acrylicBadgeConfigModal');
        Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
    },

    // ==================== CARD WITH ROSARY ====================
    _cardRosarySellPrices: null,
    _cardRosaryCostPrices: null,

    async openCardRosaryConfig() {
        const content = document.getElementById('cardRosaryConfigContent');
        if (!content) return;

        // Load prices once
        try {
            const sellDoc = await PricingService.loadPricing('card_rosary', 'selling');
            this._cardRosarySellPrices = (sellDoc && sellDoc.prices) ? sellDoc.prices : {};
        } catch(e) { this._cardRosarySellPrices = {}; }
        try {
            const costDoc = await PricingService.loadPricing('card_rosary', 'cost');
            this._cardRosaryCostPrices = (costDoc && costDoc.prices) ? costDoc.prices : {};
        } catch(e) { this._cardRosaryCostPrices = {}; }

        const subItemOpts = CardRosaryPricing.SUB_ITEMS.map(s =>
            `<option value="${s.id}">${s.nameAr}</option>`
        ).join('');

        content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block font-bold mb-1">الصنف</label>
                    <select id="crSubItem" onchange="OrderProducts._cardRosaryRecalc()" class="w-full border p-2 rounded">
                        ${subItemOpts}
                    </select>
                </div>
                <div>
                    <label class="block font-bold mb-1">الكمية</label>
                    <input id="crQuantity" type="number" min="1" value="50" oninput="OrderProducts._cardRosaryRecalc()" class="w-full border p-2 rounded">
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="text-lg font-bold text-center" id="crTotalPrice">الإجمالي: 0 ج.م</div>
                    <div class="text-sm text-gray-500 text-center mt-1" id="crPriceBreakdown"></div>
                </div>
                <button onclick="OrderProducts._submitCardRosary()" class="w-full bg-rose-600 text-white py-3 rounded-lg font-bold hover:bg-rose-700 transition">إضافة للطلب</button>
            </div>
        `;

        openModal('cardRosaryConfigModal');
        this._cardRosaryRecalc();
    },

    _cardRosaryRecalc() {
        const subItemId = document.getElementById('crSubItem')?.value || '';
        const quantity = parseInt(document.getElementById('crQuantity')?.value) || 0;
        const prices = this._cardRosarySellPrices || {};

        const result = CardRosaryPricing.calculate({ subItemId, quantity, prices });

        const totalEl = document.getElementById('crTotalPrice');
        const breakdownEl = document.getElementById('crPriceBreakdown');
        if (result) {
            totalEl.textContent = `الإجمالي: ${result.grandTotal.toFixed(2)} ج.م`;
            breakdownEl.textContent = `شريحة: ${result.tierQty} — سعر الشريحة: ${result.tierPrice.toFixed(2)} ج.م`;
        } else {
            totalEl.textContent = 'الإجمالي: 0 ج.م';
            breakdownEl.textContent = '';
        }
    },

    _submitCardRosary() {
        const subItemId = document.getElementById('crSubItem')?.value || '';
        const quantity = parseInt(document.getElementById('crQuantity')?.value) || 0;

        if (!subItemId || quantity <= 0) {
            Swal.fire('خطأ', 'يرجى اختيار الصنف وإدخال الكمية', 'error');
            return;
        }

        const sellPrices = this._cardRosarySellPrices || {};
        const costPrices = this._cardRosaryCostPrices || {};

        const calcSell = CardRosaryPricing.calculate({ subItemId, quantity, prices: sellPrices });
        const calcCost = CardRosaryPricing.calculate({ subItemId, quantity, prices: costPrices });

        if (!calcSell) {
            Swal.fire('خطأ', 'لا يمكن حساب السعر — تأكد من البيانات', 'error');
            return;
        }

        const costPrice = calcCost ? calcCost.grandTotal : calcSell.grandTotal;
        const sellingPrice = calcSell.grandTotal;
        const subItem = CardRosaryPricing.getSubItemById(subItemId);

        const product = {
            id: Date.now(),
            type: 'card_rosary',
            subItemId,
            subItemNameAr: subItem ? subItem.nameAr : subItemId,
            quantity,
            calculation: calcSell,
            productionCost: costPrice,
            costPrice,
            sellingPrice,
            price: sellingPrice
        };

        this.addProduct(product);
        closeModal('cardRosaryConfigModal');
        Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
    },

    // ==================== ANNUAL ADS (دعاية سنوية) ====================
    _annualAdsSellPrices: null,
    _annualAdsCostPrices: null,

    async openAnnualAdsConfig() {
        const content = document.getElementById('annualAdsConfigContent');
        if (!content) return;

        // Load prices and custom sub-items
        let customSubItems = [];
        try {
            const sellDoc = await PricingService.loadPricing('annual_ads', 'selling');
            this._annualAdsSellPrices = (sellDoc && sellDoc.prices) ? sellDoc.prices : {};
            customSubItems = (sellDoc && sellDoc.customSubItems) ? sellDoc.customSubItems : [];
        } catch(e) { this._annualAdsSellPrices = {}; }
        try {
            const costDoc = await PricingService.loadPricing('annual_ads', 'cost');
            this._annualAdsCostPrices = (costDoc && costDoc.prices) ? costDoc.prices : {};
            // Merge custom sub-items from cost doc too
            if (costDoc && costDoc.customSubItems && costDoc.customSubItems.length > customSubItems.length) {
                customSubItems = costDoc.customSubItems;
            }
        } catch(e) { this._annualAdsCostPrices = {}; }

        // Sync custom sub-items into pricing engine
        if (typeof AnnualAdsPricing !== 'undefined') {
            AnnualAdsPricing.setCustomSubItems(customSubItems);
        }

        const allSubItems = AnnualAdsPricing.getSubItems();
        const subItemOpts = allSubItems.map(s =>
            `<option value="${s.id}">${s.nameAr}</option>`
        ).join('');

        content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block font-bold mb-1">البند</label>
                    <select id="aaSubItem" onchange="OrderProducts._annualAdsRecalc()" class="w-full border p-2 rounded">
                        ${subItemOpts}
                    </select>
                </div>
                <div>
                    <label class="block font-bold mb-1">الكمية</label>
                    <input id="aaQuantity" type="number" min="1" value="50" oninput="OrderProducts._annualAdsRecalc()" class="w-full border p-2 rounded">
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="text-lg font-bold text-center" id="aaTotalPrice">الإجمالي: 0 ج.م</div>
                    <div class="text-sm text-gray-500 text-center mt-1" id="aaPriceBreakdown"></div>
                </div>
                <button onclick="OrderProducts._submitAnnualAds()" class="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition">إضافة للطلب</button>
            </div>
        `;

        openModal('annualAdsConfigModal');
        this._annualAdsRecalc();
    },

    _annualAdsRecalc() {
        const subItemId = document.getElementById('aaSubItem')?.value || '';
        const quantity = parseInt(document.getElementById('aaQuantity')?.value) || 0;
        const prices = this._annualAdsSellPrices || {};

        const result = AnnualAdsPricing.calculate({ subItemId, quantity, prices });

        const totalEl = document.getElementById('aaTotalPrice');
        const breakdownEl = document.getElementById('aaPriceBreakdown');
        if (result) {
            totalEl.textContent = `الإجمالي: ${result.grandTotal.toFixed(2)} ج.م`;
            breakdownEl.textContent = `شريحة: ${result.tierQty} | سعر القطعة: ${result.unitPrice.toFixed(2)} ج.م | ${result.quantity} × ${result.unitPrice.toFixed(2)} = ${result.grandTotal.toFixed(2)} ج.م`;
        } else {
            totalEl.textContent = 'الإجمالي: 0 ج.م';
            breakdownEl.textContent = '';
        }
    },

    _submitAnnualAds() {
        const subItemId = document.getElementById('aaSubItem')?.value || '';
        const quantity = parseInt(document.getElementById('aaQuantity')?.value) || 0;

        if (!subItemId || quantity <= 0) {
            Swal.fire('خطأ', 'يرجى اختيار البند وإدخال الكمية', 'error');
            return;
        }

        const sellPrices = this._annualAdsSellPrices || {};
        const costPrices = this._annualAdsCostPrices || {};

        const calcSell = AnnualAdsPricing.calculate({ subItemId, quantity, prices: sellPrices });
        const calcCost = AnnualAdsPricing.calculate({ subItemId, quantity, prices: costPrices });

        if (!calcSell) {
            Swal.fire('خطأ', 'لا يمكن حساب السعر — تأكد من البيانات', 'error');
            return;
        }

        const costPrice = calcCost ? calcCost.grandTotal : calcSell.grandTotal;
        const sellingPrice = calcSell.grandTotal;
        const subItem = AnnualAdsPricing.getSubItemById(subItemId);

        const product = {
            id: Date.now(),
            type: 'annual_ads',
            subItemId,
            subItemNameAr: subItem ? subItem.nameAr : subItemId,
            quantity,
            calculation: calcSell,
            productionCost: costPrice,
            costPrice,
            sellingPrice,
            price: sellingPrice
        };

        this.addProduct(product);
        closeModal('annualAdsConfigModal');
        Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
    },

    // ==================== CUP QURAN BAGS (كوباية–مصاحف–شنط سبوع) ====================
    _cqbSellPrices: null,
    _cqbCostPrices: null,

    async openCupQuranBagsConfig() {
        const content = document.getElementById('cupQuranBagsConfigContent');
        if (!content) return;

        // Load prices
        try {
            const sellDoc = await PricingService.loadPricing('cup_quran_bags', 'selling');
            this._cqbSellPrices = (sellDoc && sellDoc.prices) ? sellDoc.prices : {};
        } catch(e) { this._cqbSellPrices = {}; }
        try {
            const costDoc = await PricingService.loadPricing('cup_quran_bags', 'cost');
            this._cqbCostPrices = (costDoc && costDoc.prices) ? costDoc.prices : {};
        } catch(e) { this._cqbCostPrices = {}; }

        const P = CupQuranBagsPricing;

        // Sub-band selector buttons
        const subBandBtns = P.SUB_BANDS.map((b, idx) => {
            const active = idx === 0 ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700';
            return `<button onclick="OrderProducts._cqbSwitchSubBand('${b.id}', this)" class="cqb-order-band-btn flex-1 px-3 py-2 rounded-lg text-sm font-bold transition ${active}" data-band="${b.id}"><i class="fas ${b.icon} ml-1"></i>${b.nameAr}</button>`;
        }).join('');

        // Cup Sticker type options
        const cupTypeOpts = P.CUP_STICKER_TYPES.map(t => `<option value="${t.id}">${t.nameAr}</option>`).join('');

        // Soboa bags size options
        const sizeOpts = P.SOBOA_BAGS_SIZES.map(s => `<option value="${s.id}">${s.nameAr}</option>`).join('');

        content.innerHTML = `
            <div class="space-y-4">
                <div class="flex gap-2">${subBandBtns}</div>

                <!-- Cup Sticker form -->
                <div id="cqbForm_cup_sticker" class="cqb-order-form space-y-3">
                    <div>
                        <label class="block font-bold mb-1">النوع</label>
                        <select id="cqbCupType" onchange="OrderProducts._cqbRecalc()" class="w-full border p-2 rounded">${cupTypeOpts}</select>
                    </div>
                    <div>
                        <label class="block font-bold mb-1">الكمية</label>
                        <input id="cqbCupQty" type="number" min="1" value="50" oninput="OrderProducts._cqbRecalc()" class="w-full border p-2 rounded">
                    </div>
                </div>

                <!-- Quran form -->
                <div id="cqbForm_quran" class="cqb-order-form space-y-3" style="display:none;">
                    <div>
                        <label class="block font-bold mb-1">الكمية</label>
                        <input id="cqbQuranQty" type="number" min="1" value="50" oninput="OrderProducts._cqbRecalc()" class="w-full border p-2 rounded">
                    </div>
                </div>

                <!-- Soboa Bags form -->
                <div id="cqbForm_soboa_bags" class="cqb-order-form space-y-3" style="display:none;">
                    <div>
                        <label class="block font-bold mb-1">المقاس</label>
                        <select id="cqbBagsSize" onchange="OrderProducts._cqbRecalc()" class="w-full border p-2 rounded">${sizeOpts}</select>
                    </div>
                    <div>
                        <label class="block font-bold mb-1">الكمية</label>
                        <input id="cqbBagsQty" type="number" min="1" value="50" oninput="OrderProducts._cqbRecalc()" class="w-full border p-2 rounded">
                    </div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="text-lg font-bold text-center" id="cqbTotalPrice">الإجمالي: 0 ج.م</div>
                    <div class="text-sm text-gray-500 text-center mt-1" id="cqbPriceBreakdown"></div>
                </div>
                <button onclick="OrderProducts._submitCupQuranBags()" class="w-full bg-pink-600 text-white py-3 rounded-lg font-bold hover:bg-pink-700 transition">إضافة للطلب</button>
            </div>
        `;

        this._cqbActiveSubBand = 'cup_sticker';
        openModal('cupQuranBagsConfigModal');
        this._cqbRecalc();
    },

    _cqbActiveSubBand: 'cup_sticker',

    _cqbSwitchSubBand(bandId, btn) {
        this._cqbActiveSubBand = bandId;
        document.querySelectorAll('.cqb-order-band-btn').forEach(b => { b.classList.remove('bg-pink-600', 'text-white'); b.classList.add('bg-gray-200', 'text-gray-700'); });
        btn.classList.remove('bg-gray-200', 'text-gray-700');
        btn.classList.add('bg-pink-600', 'text-white');
        document.querySelectorAll('.cqb-order-form').forEach(f => f.style.display = 'none');
        const form = document.getElementById(`cqbForm_${bandId}`);
        if (form) form.style.display = '';
        this._cqbRecalc();
    },

    _cqbRecalc() {
        const P = CupQuranBagsPricing;
        const prices = this._cqbSellPrices || {};
        let result = null;

        if (this._cqbActiveSubBand === 'cup_sticker') {
            const typeId = document.getElementById('cqbCupType')?.value || '';
            const quantity = parseInt(document.getElementById('cqbCupQty')?.value) || 0;
            result = P.calculate({ subBandId: 'cup_sticker', typeId, quantity, prices });
        } else if (this._cqbActiveSubBand === 'quran') {
            const quantity = parseInt(document.getElementById('cqbQuranQty')?.value) || 0;
            result = P.calculate({ subBandId: 'quran', quantity, prices });
        } else if (this._cqbActiveSubBand === 'soboa_bags') {
            const sizeId = document.getElementById('cqbBagsSize')?.value || '';
            const quantity = parseInt(document.getElementById('cqbBagsQty')?.value) || 0;
            result = P.calculate({ subBandId: 'soboa_bags', sizeId, quantity, prices });
        }

        const totalEl = document.getElementById('cqbTotalPrice');
        const breakdownEl = document.getElementById('cqbPriceBreakdown');
        if (result) {
            totalEl.textContent = `الإجمالي: ${result.grandTotal.toFixed(2)} ج.م`;
            if (result.pricingMode === 'total') {
                breakdownEl.textContent = `${result.typeNameAr || ''} | شريحة: ${result.tierQty} | السعر الإجمالي: ${result.grandTotal.toFixed(2)} ج.م`;
            } else {
                breakdownEl.textContent = `شريحة: ${result.tierQty} | سعر القطعة: ${result.unitPrice.toFixed(2)} ج.م | ${result.quantity} × ${result.unitPrice.toFixed(2)} = ${result.grandTotal.toFixed(2)} ج.م`;
            }
        } else {
            totalEl.textContent = 'الإجمالي: 0 ج.م';
            breakdownEl.textContent = '';
        }
    },

    _submitCupQuranBags() {
        const P = CupQuranBagsPricing;
        const sellPrices = this._cqbSellPrices || {};
        const costPrices = this._cqbCostPrices || {};
        let params = { subBandId: this._cqbActiveSubBand };
        let quantity = 0;

        if (this._cqbActiveSubBand === 'cup_sticker') {
            params.typeId = document.getElementById('cqbCupType')?.value || '';
            quantity = parseInt(document.getElementById('cqbCupQty')?.value) || 0;
            params.quantity = quantity;
            if (!params.typeId || quantity <= 0) { Swal.fire('خطأ', 'يرجى اختيار النوع وإدخال الكمية', 'error'); return; }
        } else if (this._cqbActiveSubBand === 'quran') {
            quantity = parseInt(document.getElementById('cqbQuranQty')?.value) || 0;
            params.quantity = quantity;
            if (quantity <= 0) { Swal.fire('خطأ', 'يرجى إدخال الكمية', 'error'); return; }
        } else if (this._cqbActiveSubBand === 'soboa_bags') {
            params.sizeId = document.getElementById('cqbBagsSize')?.value || '';
            quantity = parseInt(document.getElementById('cqbBagsQty')?.value) || 0;
            params.quantity = quantity;
            if (!params.sizeId || quantity <= 0) { Swal.fire('خطأ', 'يرجى اختيار المقاس وإدخال الكمية', 'error'); return; }
        }

        const calcSell = P.calculate({ ...params, prices: sellPrices });
        const calcCost = P.calculate({ ...params, prices: costPrices });

        if (!calcSell) {
            Swal.fire('خطأ', 'لا يمكن حساب السعر — تأكد من البيانات', 'error');
            return;
        }

        const costPrice = calcCost ? calcCost.grandTotal : calcSell.grandTotal;
        const sellingPrice = calcSell.grandTotal;

        // Build display name
        let displayName = calcSell.subBandNameAr;
        if (calcSell.typeNameAr) displayName += ` (${calcSell.typeNameAr})`;

        const product = {
            id: Date.now(),
            type: 'cup_quran_bags',
            subBandId: this._cqbActiveSubBand,
            subItemNameAr: displayName,
            quantity,
            calculation: calcSell,
            productionCost: costPrice,
            costPrice,
            sellingPrice,
            price: sellingPrice
        };

        this.addProduct(product);
        closeModal('cupQuranBagsConfigModal');
        Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
    },

    // ==================== BOXES (البوكسات) ====================
    _boxesSellPrices: null,
    _boxesCostPrices: null,

    async openBoxesConfig() {
        const content = document.getElementById('boxesConfigContent');
        if (!content) return;

        // Load prices
        try {
            const sellDoc = await PricingService.loadPricing('boxes', 'selling');
            this._boxesSellPrices = (sellDoc && sellDoc.prices) ? sellDoc.prices : {};
        } catch(e) { this._boxesSellPrices = {}; }
        try {
            const costDoc = await PricingService.loadPricing('boxes', 'cost');
            this._boxesCostPrices = (costDoc && costDoc.prices) ? costDoc.prices : {};
        } catch(e) { this._boxesCostPrices = {}; }

        const P = BoxesPricing;

        const typeOpts = P.BOX_TYPES.map(t => `<option value="${t.id}">${t.nameAr}</option>`).join('');
        const sizeOpts = P.SIZES.map(s => `<option value="${s.id}">${s.nameAr}</option>`).join('');

        content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block font-bold mb-1">نوع البوكس</label>
                    <select id="boxType" onchange="OrderProducts._boxesRecalc()" class="w-full border p-2 rounded">${typeOpts}</select>
                </div>
                <div>
                    <label class="block font-bold mb-1">المقاس (ط×ع×ا)</label>
                    <select id="boxSize" onchange="OrderProducts._boxesRecalc()" class="w-full border p-2 rounded">${sizeOpts}</select>
                </div>
                <div>
                    <label class="block font-bold mb-1">الكمية</label>
                    <input id="boxQty" type="number" min="1" value="50" oninput="OrderProducts._boxesRecalc()" class="w-full border p-2 rounded">
                </div>
                <div class="flex items-center gap-2">
                    <input id="boxPrintingCheck" type="checkbox" onchange="OrderProducts._boxesRecalc()" class="w-5 h-5 accent-yellow-600">
                    <label for="boxPrintingCheck" class="font-bold">إضافة طباعة</label>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div class="text-sm font-medium" id="boxBoxPrice"></div>
                    <div class="text-sm font-medium" id="boxPrintPrice" style="display:none;"></div>
                    <div class="border-t pt-2 mt-2">
                        <div class="text-lg font-bold text-center" id="boxTotalPrice">الإجمالي: 0 ج.م</div>
                    </div>
                </div>
                <button onclick="OrderProducts._submitBoxes()" class="w-full bg-yellow-600 text-white py-3 rounded-lg font-bold hover:bg-yellow-700 transition">إضافة للطلب</button>
            </div>
        `;

        openModal('boxesConfigModal');
        this._boxesRecalc();
    },

    _boxesRecalc() {
        const P = BoxesPricing;
        const prices = this._boxesSellPrices || {};
        const typeId = document.getElementById('boxType')?.value || '';
        const sizeId = document.getElementById('boxSize')?.value || '';
        const quantity = parseInt(document.getElementById('boxQty')?.value) || 0;
        const withPrinting = document.getElementById('boxPrintingCheck')?.checked || false;

        const boxResult = P.calculateBox({ typeId, sizeId, quantity, prices });
        const printResult = withPrinting ? P.calculatePrinting({ quantity, prices }) : null;

        const boxPriceEl = document.getElementById('boxBoxPrice');
        const printPriceEl = document.getElementById('boxPrintPrice');
        const totalEl = document.getElementById('boxTotalPrice');

        if (boxResult) {
            boxPriceEl.innerHTML = `<i class="fas fa-box text-yellow-700 ml-1"></i>${boxResult.typeNameAr} ${boxResult.sizeNameAr} × ${quantity} — سعر القطعة: ${boxResult.unitPrice.toFixed(2)} ج.م — الإجمالي: <b>${boxResult.grandTotal.toFixed(2)} ج.م</b>`;
        } else {
            boxPriceEl.textContent = '';
        }

        if (printResult) {
            printPriceEl.style.display = '';
            printPriceEl.innerHTML = `<i class="fas fa-print text-blue-600 ml-1"></i>طباعة × ${quantity} — سعر القطعة: ${printResult.unitPrice.toFixed(2)} ج.م — الإجمالي: <b>${printResult.grandTotal.toFixed(2)} ج.م</b>`;
        } else {
            printPriceEl.style.display = 'none';
            printPriceEl.textContent = '';
        }

        const boxTotal = boxResult ? boxResult.grandTotal : 0;
        const printTotal = printResult ? printResult.grandTotal : 0;
        totalEl.textContent = `الإجمالي: ${(boxTotal + printTotal).toFixed(2)} ج.م`;
    },

    _submitBoxes() {
        const P = BoxesPricing;
        const sellPrices = this._boxesSellPrices || {};
        const costPrices = this._boxesCostPrices || {};
        const typeId = document.getElementById('boxType')?.value || '';
        const sizeId = document.getElementById('boxSize')?.value || '';
        const quantity = parseInt(document.getElementById('boxQty')?.value) || 0;
        const withPrinting = document.getElementById('boxPrintingCheck')?.checked || false;

        if (!typeId || !sizeId || quantity <= 0) {
            Swal.fire('خطأ', 'يرجى اختيار النوع والمقاس وإدخال الكمية', 'error');
            return;
        }

        const boxSell = P.calculateBox({ typeId, sizeId, quantity, prices: sellPrices });
        const boxCost = P.calculateBox({ typeId, sizeId, quantity, prices: costPrices });
        const printSell = withPrinting ? P.calculatePrinting({ quantity, prices: sellPrices }) : null;
        const printCost = withPrinting ? P.calculatePrinting({ quantity, prices: costPrices }) : null;

        if (!boxSell) {
            Swal.fire('خطأ', 'لا يمكن حساب السعر — تأكد من البيانات', 'error');
            return;
        }

        const boxCostTotal = boxCost ? boxCost.grandTotal : boxSell.grandTotal;
        const printCostTotal = printCost ? printCost.grandTotal : (printSell ? printSell.grandTotal : 0);
        const printSellTotal = printSell ? printSell.grandTotal : 0;

        const totalSell = boxSell.grandTotal + printSellTotal;
        const totalCost = boxCostTotal + printCostTotal;

        const type = P.getBoxTypeById(typeId);
        const size = P.getSizeById(sizeId);
        const displayName = `${type ? type.nameAr : typeId} ${size ? size.nameAr : sizeId}`;

        const product = {
            id: Date.now(),
            type: 'boxes',
            boxTypeId: typeId,
            boxSizeId: sizeId,
            subItemNameAr: displayName,
            quantity,
            withPrinting,
            boxCalc: boxSell,
            printCalc: printSell,
            calculation: boxSell,
            productionCost: totalCost,
            costPrice: totalCost,
            sellingPrice: totalSell,
            price: totalSell
        };

        this.addProduct(product);
        closeModal('boxesConfigModal');
        Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
    },

    // ==================== CLADDING & LETTERS ====================
    _clSellPrices: null,
    _clCostPrices: null,

    async openCladdingLettersConfig() {
        const content = document.getElementById('claddingLettersConfigContent');
        if (!content) return;

        // Load prices
        try {
            const sellDoc = await PricingService.loadPricing('cladding_letters', 'selling');
            this._clSellPrices = (sellDoc && sellDoc.prices) ? sellDoc.prices : {};
        } catch(e) { this._clSellPrices = {}; }
        try {
            const costDoc = await PricingService.loadPricing('cladding_letters', 'cost');
            this._clCostPrices = (costDoc && costDoc.prices) ? costDoc.prices : {};
        } catch(e) { this._clCostPrices = {}; }

        const P = CladdingLettersPricing;
        const letterOpts = P.LETTER_TYPES.map(lt =>
            `<option value="${lt.id}">${lt.nameAr}</option>`
        ).join('');

        content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block font-bold mb-1">القسم</label>
                    <select id="clSubBand" onchange="OrderProducts._clSubBandChanged()" class="w-full border p-2 rounded">
                        <option value="cladding">واجهات كلادينج</option>
                        <option value="letters">الحروف</option>
                    </select>
                </div>
                <div id="clLetterTypeRow" style="display:none">
                    <label class="block font-bold mb-1">نوع الحروف</label>
                    <select id="clLetterType" onchange="OrderProducts._clRenderAdditions(); OrderProducts._clRecalc()" class="w-full border p-2 rounded">
                        ${letterOpts}
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block font-bold mb-1">العرض (سم)</label>
                        <input id="clWidth" type="number" min="1" value="100" oninput="OrderProducts._clRecalc()" class="w-full border p-2 rounded">
                    </div>
                    <div>
                        <label class="block font-bold mb-1">الطول (سم)</label>
                        <input id="clHeight" type="number" min="1" value="100" oninput="OrderProducts._clRecalc()" class="w-full border p-2 rounded">
                    </div>
                </div>
                <div>
                    <label class="block font-bold mb-1">الكمية</label>
                    <input id="clQuantity" type="number" min="1" value="1" oninput="OrderProducts._clRecalc()" class="w-full border p-2 rounded">
                </div>

                <!-- Additions (shown only for letters) -->
                <div id="clAdditionsContainer" style="display:none" class="space-y-3 bg-gray-50 p-4 rounded-lg">
                    <label class="block font-bold mb-1">الإضافات</label>
                    <div id="clAdditionsList"></div>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                    <div class="text-lg font-bold text-center" id="clTotalPrice">الإجمالي: 0 ج.م</div>
                    <div class="text-sm text-gray-500 text-center mt-1" id="clPriceBreakdown"></div>
                </div>
                <button onclick="OrderProducts._submitCladdingLetters()" class="w-full bg-slate-700 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition">إضافة للطلب</button>
            </div>
        `;

        openModal('claddingLettersConfigModal');
        this._clSubBandChanged();
    },

    _clSubBandChanged() {
        const subBand = document.getElementById('clSubBand')?.value || 'cladding';
        const letterTypeRow = document.getElementById('clLetterTypeRow');
        const additionsContainer = document.getElementById('clAdditionsContainer');

        if (subBand === 'cladding') {
            if (letterTypeRow) letterTypeRow.style.display = 'none';
            if (additionsContainer) additionsContainer.style.display = 'none';
            // Reset default dims for cladding
            const w = document.getElementById('clWidth');
            const h = document.getElementById('clHeight');
            if (w && w.value == '100' && h && h.value == '50') { w.value = '100'; h.value = '100'; }
        } else {
            if (letterTypeRow) letterTypeRow.style.display = '';
            if (additionsContainer) additionsContainer.style.display = '';
            // Reset default dims for letters
            const w = document.getElementById('clWidth');
            const h = document.getElementById('clHeight');
            if (w && w.value == '100' && h && h.value == '100') { w.value = '100'; h.value = '50'; }
            this._clRenderAdditions();
        }
        this._clRecalc();
    },

    _clRenderAdditions() {
        const P = CladdingLettersPricing;
        const letterTypeId = document.getElementById('clLetterType')?.value || P.LETTER_TYPES[0].id;
        const lt = P.getLetterTypeById(letterTypeId);
        if (!lt) return;

        const container = document.getElementById('clAdditionsList');
        if (!container) return;

        let html = '';
        lt.additions.forEach(addId => {
            const addDef = P.getAdditionDef(addId);
            if (!addDef) return;
            const needsCount = addDef.type === 'per_letter' || addDef.type === 'per_count';
            html += `
                <div class="flex items-center gap-3 mb-2">
                    <label class="flex items-center gap-2 text-sm flex-1">
                        <input type="checkbox" value="${addId}" onchange="OrderProducts._clAdditionToggle('${addId}')" class="cl-add-chk rounded" data-add-id="${addId}">
                        ${addDef.nameAr}
                    </label>
                    ${needsCount ? `
                        <div id="clAddCount_${addId}" style="display:none" class="flex items-center gap-1">
                            <span class="text-xs text-gray-600">${addDef.fieldLabel}:</span>
                            <input type="number" min="1" value="1" id="clAddCountInput_${addId}" oninput="OrderProducts._clRecalc()" class="border p-1 rounded w-16 text-sm">
                        </div>
                    ` : ''}
                </div>
            `;
        });
        container.innerHTML = html;
    },

    _clAdditionToggle(addId) {
        const chk = document.querySelector(`.cl-add-chk[data-add-id="${addId}"]`);
        const countDiv = document.getElementById(`clAddCount_${addId}`);
        if (countDiv) {
            countDiv.style.display = chk && chk.checked ? '' : 'none';
        }
        this._clRecalc();
    },

    _clRecalc() {
        const P = CladdingLettersPricing;
        const subBand = document.getElementById('clSubBand')?.value || 'cladding';
        const letterTypeId = document.getElementById('clLetterType')?.value || '';
        const width = parseFloat(document.getElementById('clWidth')?.value) || 0;
        const height = parseFloat(document.getElementById('clHeight')?.value) || 0;
        const quantity = parseInt(document.getElementById('clQuantity')?.value) || 1;
        const sellPrices = this._clSellPrices || {};

        // Gather additions
        const additions = {};
        if (subBand === 'letters') {
            document.querySelectorAll('.cl-add-chk:checked').forEach(chk => {
                const addId = chk.dataset.addId;
                const addDef = P.getAdditionDef(addId);
                if (!addDef) return;
                if (addDef.type === 'per_letter' || addDef.type === 'per_count') {
                    const count = parseInt(document.getElementById(`clAddCountInput_${addId}`)?.value) || 0;
                    additions[addId] = { count };
                } else if (addDef.type === 'by_area') {
                    additions[addId] = true;
                }
            });
        }

        const params = { subBand, letterTypeId, width, height, quantity, additions };
        const result = P.calculate(params, sellPrices);

        const totalEl = document.getElementById('clTotalPrice');
        const breakdownEl = document.getElementById('clPriceBreakdown');
        if (totalEl) totalEl.textContent = `الإجمالي: ${result.total.toFixed(2)} ج.م`;
        if (breakdownEl) {
            breakdownEl.innerHTML = result.items.map(it =>
                `<div class="flex justify-between text-xs"><span>${it.name}${it.size ? ' (' + it.size + ')' : ''}</span><span>${it.price.toFixed(2)} ج.م</span></div>`
            ).join('');
        }

        // Re-render additions when letter type changes
        const lt = P.getLetterTypeById(letterTypeId);
        if (subBand === 'letters' && lt) {
            const container = document.getElementById('clAdditionsList');
            if (container) {
                const existingAddIds = Array.from(container.querySelectorAll('.cl-add-chk')).map(c => c.dataset.addId);
                if (JSON.stringify(existingAddIds) !== JSON.stringify(lt.additions)) {
                    this._clRenderAdditions();
                }
            }
        }
    },

    _submitCladdingLetters() {
        const P = CladdingLettersPricing;
        const subBand = document.getElementById('clSubBand')?.value || 'cladding';
        const letterTypeId = document.getElementById('clLetterType')?.value || '';
        const width = parseFloat(document.getElementById('clWidth')?.value) || 0;
        const height = parseFloat(document.getElementById('clHeight')?.value) || 0;
        const quantity = parseInt(document.getElementById('clQuantity')?.value) || 1;

        if (width <= 0 || height <= 0) {
            Swal.fire('خطأ', 'يرجى إدخال مقاسات صحيحة', 'error');
            return;
        }

        const sellPrices = this._clSellPrices || {};
        const costPrices = this._clCostPrices || {};

        // Gather additions
        const additions = {};
        if (subBand === 'letters') {
            document.querySelectorAll('.cl-add-chk:checked').forEach(chk => {
                const addId = chk.dataset.addId;
                const addDef = P.getAdditionDef(addId);
                if (!addDef) return;
                if (addDef.type === 'per_letter' || addDef.type === 'per_count') {
                    const count = parseInt(document.getElementById(`clAddCountInput_${addId}`)?.value) || 0;
                    additions[addId] = { count };
                } else if (addDef.type === 'by_area') {
                    additions[addId] = true;
                }
            });
        }

        const params = { subBand, letterTypeId, width, height, quantity, additions };
        const sellResult = P.calculate(params, sellPrices);
        const costResult = P.calculate(params, costPrices);

        let productName = '';
        if (subBand === 'cladding') {
            productName = 'واجهة كلادينج';
        } else {
            const lt = P.getLetterTypeById(letterTypeId);
            productName = lt ? lt.nameAr : 'حروف';
        }

        const product = {
            id: Date.now(),
            type: 'cladding_letters',
            subBand,
            letterTypeId: subBand === 'letters' ? letterTypeId : null,
            productName,
            width,
            height,
            quantity,
            additions,
            calculation: sellResult,
            costCalculation: costResult,
            sellingPrice: sellResult.total,
            productionCost: costResult.total,
            price: sellResult.total
        };

        this.addProduct(product);
        closeModal('claddingLettersConfigModal');
        Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
    },

    // ─── Kraft Bags ───
    _kbSellPrices: {},
    _kbCostPrices: {},

    async openKraftBagsConfig() {
        const content = document.getElementById('kraftBagsConfigContent');
        if (!content) return;
        const db = typeof window !== 'undefined' && window.db ? window.db : null;
        const P = (typeof KraftBagsPricing !== 'undefined') ? KraftBagsPricing : null;
        if (!db || !P || typeof PricingService === 'undefined') {
            content.innerHTML = '<p class="text-red-600">خدمة التسعير غير متاحة</p>';
            openModal('kraftBagsConfigModal');
            return;
        }

        // Load sell and cost prices
        this._kbSellPrices = {};
        this._kbCostPrices = {};
        try {
            const sellDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(P.SELL_COLLECTION) : db.collection(P.SELL_COLLECTION)).doc('default').get();
            if (sellDoc.exists && sellDoc.data().prices) this._kbSellPrices = sellDoc.data().prices;
        } catch (e) {}
        try {
            const costDoc = await (typeof Branch !== 'undefined' && Branch.getCollection ? Branch.getCollection(P.COST_COLLECTION) : db.collection(P.COST_COLLECTION)).doc('default').get();
            if (costDoc.exists && costDoc.data().prices) this._kbCostPrices = costDoc.data().prices;
        } catch (e) {}

        const sizeOpts = P.SIZES.map(s => `<option value="${s.id}">${s.nameAr}</option>`).join('');

        content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <label class="block font-bold mb-1">المقاس</label>
                    <select id="kbSize" onchange="OrderProducts._kbRecalc()" class="w-full border p-2 rounded">
                        ${sizeOpts}
                    </select>
                </div>
                <div>
                    <label class="block font-bold mb-1">الكمية</label>
                    <input id="kbQuantity" type="number" min="1" value="50" oninput="OrderProducts._kbRecalc()" class="w-full border p-2 rounded">
                </div>
                <div class="flex items-center gap-2">
                    <input type="checkbox" id="kbPrintingCheck" onchange="OrderProducts._kbRecalc()" class="w-5 h-5">
                    <label for="kbPrintingCheck" class="font-bold">إضافة طباعة</label>
                </div>
                <div class="bg-amber-50 p-4 rounded-lg border border-amber-200 space-y-1">
                    <div class="text-lg font-bold text-center" id="kbTotalPrice">الإجمالي: 0 ج.م</div>
                    <div class="text-sm text-gray-500 text-center mt-1" id="kbPriceBreakdown"></div>
                </div>
                <button onclick="OrderProducts._submitKraftBags()" class="w-full bg-amber-600 text-white py-3 rounded-lg font-bold hover:bg-amber-700 transition">إضافة للطلب</button>
            </div>
        `;

        this._kbRecalc();
        openModal('kraftBagsConfigModal');
    },

    _kbRecalc() {
        const P = (typeof KraftBagsPricing !== 'undefined') ? KraftBagsPricing : null;
        if (!P) return;
        const sizeId = document.getElementById('kbSize')?.value || '';
        const qty = parseInt(document.getElementById('kbQuantity')?.value) || 0;
        const withPrinting = document.getElementById('kbPrintingCheck')?.checked || false;

        const sellPrices = this._kbSellPrices || {};
        const bagCalc = P.calculateBag({ sizeId, quantity: qty, prices: sellPrices });
        let printCalc = null;
        if (withPrinting) {
            printCalc = P.calculatePrinting({ sizeId, quantity: qty, prices: sellPrices });
        }

        let total = bagCalc ? bagCalc.grandTotal : 0;
        let breakdown = [];
        if (bagCalc) {
            breakdown.push(`شنطة: ${bagCalc.unitPrice.toFixed(2)} × ${qty} = ${bagCalc.grandTotal.toFixed(2)} ج.م`);
        }
        if (printCalc) {
            total += printCalc.grandTotal;
            breakdown.push(`طباعة: ${printCalc.unitPrice.toFixed(2)} × ${qty} = ${printCalc.grandTotal.toFixed(2)} ج.م`);
        }

        const totalEl = document.getElementById('kbTotalPrice');
        const breakdownEl = document.getElementById('kbPriceBreakdown');
        if (totalEl) totalEl.textContent = `الإجمالي: ${total.toFixed(2)} ج.م`;
        if (breakdownEl) breakdownEl.innerHTML = breakdown.join('<br>');
    },

    _submitKraftBags() {
        const P = (typeof KraftBagsPricing !== 'undefined') ? KraftBagsPricing : null;
        if (!P) return;
        const sizeId = document.getElementById('kbSize')?.value || '';
        const qty = parseInt(document.getElementById('kbQuantity')?.value) || 0;
        const withPrinting = document.getElementById('kbPrintingCheck')?.checked || false;

        if (!sizeId || qty <= 0) {
            Swal.fire('خطأ', 'يرجى اختيار المقاس وإدخال الكمية', 'error');
            return;
        }

        const sellPrices = this._kbSellPrices || {};
        const costPrices = this._kbCostPrices || {};

        const sellBag = P.calculateBag({ sizeId, quantity: qty, prices: sellPrices });
        const costBag = P.calculateBag({ sizeId, quantity: qty, prices: costPrices });

        let sellPrint = null, costPrint = null;
        if (withPrinting) {
            sellPrint = P.calculatePrinting({ sizeId, quantity: qty, prices: sellPrices });
            costPrint = P.calculatePrinting({ sizeId, quantity: qty, prices: costPrices });
        }

        const sellTotal = (sellBag ? sellBag.grandTotal : 0) + (sellPrint ? sellPrint.grandTotal : 0);
        const costTotal = (costBag ? costBag.grandTotal : 0) + (costPrint ? costPrint.grandTotal : 0);

        const sizeName = P.getSizeById(sizeId)?.nameAr || sizeId;

        const product = {
            id: Date.now(),
            type: 'kraft_bags',
            sizeId,
            subItemNameAr: sizeName,
            quantity: qty,
            withPrinting,
            bagCalc: sellBag,
            printCalc: sellPrint,
            costBagCalc: costBag,
            costPrintCalc: costPrint,
            sellingPrice: sellTotal,
            productionCost: costTotal,
            price: sellTotal
        };

        this.addProduct(product);
        closeModal('kraftBagsConfigModal');
        Swal.fire('تم', 'تم إضافة المنتج بنجاح', 'success');
    }
};

// Expose OrderProducts globally for HTML onclick handlers
window.OrderProducts = OrderProducts;
window.DesignFileStore = DesignFileStore;
window.DesignCloudStore = DesignCloudStore;
window.productHasDesignFile = productHasDesignFile;
window.resolveProductDesignUrl = resolveProductDesignUrl;
window.resolveProductDesignUrlAsync = resolveProductDesignUrlAsync;
