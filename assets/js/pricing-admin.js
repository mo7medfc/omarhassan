// Pricing Admin Module - Manage products, pricing, and configurations
const PricingAdmin = {
    COLLECTION_NAME: 'pricing_config',
    OFFERS_COLLECTION: 'offers',
    _configCache: {},
    _offersCache: [],
    _initialized: false,
    currentCategory: null,
    currentStandsSubCategory: null, // Roll Up | X-Banner | Pop Up

    _getDb() {
        if (typeof window !== 'undefined' && window.db) return window.db;
        if (typeof db !== 'undefined') return db;
        throw new Error('Firestore db instance not found.');
    },
    _getColl(collectionName) {
        if (typeof Branch !== 'undefined' && Branch.getCollection) {
            return Branch.getCollection(collectionName);
        }
        return this._getDb().collection(collectionName);
    },
    
    // Initialize - Load all configs from Firestore
    async _initialize() {
        if (this._initialized) {
            return;
        }
        
        const db = this._getDb();
        
        try {
            // Load configs from Firestore
            const configs = ['offset', 'product', 'paperTypes', 'shipping'];
            for (const configName of configs) {
                try {
                    const doc = await this._getColl(this.COLLECTION_NAME).doc(configName).get();
                    if (doc.exists) {
                        this._configCache[configName] = doc.data();
                    }
                } catch (error) {
                    console.error(`Error loading ${configName} config:`, error);
                }
            }
            
            // Load offers from Firestore
            try {
                const offersSnapshot = await this._getColl(this.OFFERS_COLLECTION).get();
                this._offersCache = offersSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return { 
                        id: doc.id || data.id || Date.now().toString(), 
                        ...data 
                    };
                });
                this._offersCache.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
            } catch (error) {
                console.error('Error loading offers:', error);
                this._offersCache = [];
            }
            
            this._initialized = true;
        } catch (error) {
            console.error('Error initializing pricing config:', error);
            this._initialized = true; // Mark as initialized even on error to prevent retry loops
        }
    },

    // Render the pricing admin interface
    async render(category = null, pricingMode = null) {
        const content = document.getElementById('pricingContent');
        if (!content) return;

        // Initialize data from Firestore first
        if (!this._initialized) {
            await this._initialize();
        }

        this.currentCategory = category;
        const standsSubCategory = arguments[2] !== undefined ? arguments[2] : null; // third param for Stands
        if (category === 'Stands') {
            if (!pricingMode) this.currentStandsSubCategory = null; // عند العودة لاختيار سعر بيع/تكلفة
            else this.currentStandsSubCategory = standsSubCategory !== undefined ? standsSubCategory : this.currentStandsSubCategory;
        }

        // Always default to selling mode — no cost mode
        if (category && !pricingMode) {
            pricingMode = 'selling';
        }

        // If category and mode are selected, show category details
        if (category && pricingMode) {
            await this.renderCategoryDetails(category, pricingMode);
            return;
        }

        // Show category selection view — Modern grouped layout
        const _cats = [
            { group: 'طباعة وورق', emoji: '🖨️', items: [
                { id: 'Offset', name: 'أوفست', icon: 'fa-print', color: '#4f46e5', bg: '#eef2ff' },
                { id: 'digital_printing', name: 'ماكينة طباعة رقمية', icon: 'fa-layer-group', color: '#7c3aed', bg: '#f5f3ff' },
                { id: 'PaperTypes', name: 'أنواع الورق', icon: 'fa-scroll', color: '#0369a1', bg: '#f0f9ff' },
                { id: 'brochures', name: 'البرشورات', icon: 'fa-book-open', color: '#0891b2', bg: '#ecfeff' },
                { id: 'catalogs', name: 'الكتالوجات', icon: 'fa-swatchbook', color: '#059669', bg: '#ecfdf5' },
                { id: 'envelopes', name: 'المظاريف', icon: 'fa-envelope-open-text', color: '#2563eb', bg: '#eff6ff' },
                { id: 'inkjet_paper_printing', name: 'إنك جيت ورق', icon: 'fa-fill-drip', color: '#0ea5e9', bg: '#f0f9ff' },
                { id: 'stan_roll', name: 'بكرة ستان', icon: 'fa-tape', color: '#65a30d', bg: '#f7fee7' },
            ]},
            { group: 'لافتات وإعلانات', emoji: '🏗️', items: [
                { id: 'Outdoor', name: 'الأوت دور', icon: 'fa-image', color: '#ea580c', bg: '#fff7ed' },
                { id: 'Indoor', name: 'الإندور', icon: 'fa-tv', color: '#9333ea', bg: '#faf5ff' },
                { id: 'Stands', name: 'الاستندات', icon: 'fa-person-booth', color: '#0891b2', bg: '#ecfeff' },
                { id: 'Flag', name: 'أعلام', icon: 'fa-flag', color: '#2563eb', bg: '#eff6ff' },
                { id: 'Tableaux', name: 'تابلوهات', icon: 'fa-panorama', color: '#d97706', bg: '#fffbeb' },
                { id: 'UVPrinting', name: 'طباعة UV', icon: 'fa-bolt', color: '#7c3aed', bg: '#f5f3ff' },
                { id: 'cladding_letters', name: 'كلادينج وحروف', icon: 'fa-font', color: '#475569', bg: '#f8fafc' },
            ]},
            { group: 'ملابس وطباعة خاصة', emoji: '👕', items: [
                { id: 'DTF', name: 'طباعة DTF', icon: 'fa-palette', color: '#db2777', bg: '#fdf2f8' },
                { id: 'TShirt', name: 'تيشرتات', icon: 'fa-tshirt', color: '#7c3aed', bg: '#f5f3ff' },
                { id: 'safety_printing', name: 'السيفتي', icon: 'fa-hard-hat', color: '#dc2626', bg: '#fef2f2' },
            ]},
            { group: 'كروت ومطبوعات', emoji: '💳', items: [
                { id: 'BusinessCard', name: 'كروت شخصية', icon: 'fa-address-card', color: '#059669', bg: '#ecfdf5' },
                { id: 'IDCard', name: 'الكارنيهات', icon: 'fa-id-badge', color: '#475569', bg: '#f8fafc' },
                { id: 'Stamps', name: 'الأختام والختم', icon: 'fa-stamp', color: '#e11d48', bg: '#fff1f2' },
                { id: 'card_rosary', name: 'كارت بسبحة', icon: 'fa-hands-praying', color: '#be185d', bg: '#fdf2f8' },
            ]},
            { group: 'هدايا ومنتجات', emoji: '🎁', items: [
                { id: 'SublimationGift', name: 'هدايا سبلميشن', icon: 'fa-mug-saucer', color: '#c026d3', bg: '#fdf4ff' },
                { id: 'promotional_gifts', name: 'هدايا ترويجية', icon: 'fa-gifts', color: '#0d9488', bg: '#f0fdfa' },
                { id: 'ZikrMedal', name: 'مدليات الأذكار', icon: 'fa-medal', color: '#d97706', bg: '#fffbeb' },
                { id: 'acrylic_badge', name: 'اكريلك وباغ', icon: 'fa-gem', color: '#0891b2', bg: '#ecfeff' },
                { id: 'cup_quran_bags', name: 'كوباية–مصاحف–سبوع', icon: 'fa-mug-hot', color: '#db2777', bg: '#fdf2f8' },
                { id: 'ruler_frames', name: 'برواز مسطرة', icon: 'fa-ruler-combined', color: '#64748b', bg: '#f8fafc' },
            ]},
            { group: 'شنط وتغليف', emoji: '🛍️', items: [
                { id: 'paper_bags', name: 'شنط ورقية', icon: 'fa-bag-shopping', color: '#ea580c', bg: '#fff7ed' },
                { id: 'FabricBag', name: 'شنط قماش', icon: 'fa-suitcase', color: '#16a34a', bg: '#f0fdf4' },
                { id: 'plastic_bags', name: 'شنط بلاستيك', icon: 'fa-shopping-bag', color: '#65a30d', bg: '#f7fee7' },
                { id: 'kraft_bags', name: 'شنط كرافت', icon: 'fa-box', color: '#b45309', bg: '#fffbeb' },
                { id: 'shipping_flyers_clear_bags', name: 'فلاير شحن وأكياس', icon: 'fa-truck-fast', color: '#d97706', bg: '#fffbeb' },
                { id: 'boxes', name: 'البوكسات', icon: 'fa-box-open', color: '#ca8a04', bg: '#fefce8' },
            ]},
            { group: 'عروض ودعاية', emoji: '📢', items: [
                { id: 'Offers', name: 'العروض', icon: 'fa-percent', color: '#ea580c', bg: '#fff7ed' },
                { id: 'annual_ads', name: 'دعاية سنوية', icon: 'fa-calendar-days', color: '#dc2626', bg: '#fef2f2' },
            ]},
        ];

        const renderCard = (item) => `
            <div onclick="PricingAdmin.render('${item.id}')" class="category-card group cursor-pointer flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white hover:shadow-xl hover:scale-[1.02] hover:border-transparent transition-all duration-200" style="min-height:72px" data-name="${item.name}">
                <div class="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style="background:${item.bg}">
                    <i class="fas ${item.icon} text-lg" style="color:${item.color}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-sm text-gray-800 truncate group-hover:text-gray-950 transition">${item.name}</h4>
                </div>
                <i class="fas fa-chevron-left text-gray-300 group-hover:text-gray-500 text-xs transition"></i>
            </div>`;

        const renderGroup = (g) => `
            <div class="mb-8 pricing-group">
                <div class="flex items-center gap-2 mb-3 px-1">
                    <span class="text-xl">${g.emoji}</span>
                    <h3 class="font-extrabold text-base text-gray-700 tracking-tight">${g.group}</h3>
                    <span class="text-[11px] text-gray-400 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">${g.items.length}</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    ${g.items.map(renderCard).join('')}
                </div>
            </div>`;

        content.innerHTML = `
            <div class="mb-6">
                <div class="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div>
                        <h3 class="text-2xl font-extrabold text-gray-900">إدارة التسعير</h3>
                        <p class="text-sm text-gray-500 mt-1">اختر الماكينة أو الصنف لتعديل الأسعار</p>
                    </div>
                    <div class="relative">
                        <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
                        <input id="pricingSearchInput" type="text" placeholder="ابحث عن صنف..." oninput="PricingAdmin._filterCategories(this.value)" class="w-64 pr-9 pl-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:border-brandGold focus:ring-2 focus:ring-brandGold/20 transition">
                    </div>
                </div>
                ${typeof PrintMachines !== 'undefined' ? PrintMachines.galleryHtml() : ''}
                <div class="flex flex-wrap gap-2 mb-5" id="pricingGroupTabs">
                    <button onclick="PricingAdmin._filterGroup('')" class="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-900 text-white transition hover:bg-gray-700 _pg_tab _pg_active">الكل</button>
                    ${_cats.map(g => `<button onclick="PricingAdmin._filterGroup('${g.group}')" class="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 transition hover:bg-gray-200 _pg_tab">${g.emoji} ${g.group}</button>`).join('')}
                </div>
            </div>
            <div id="pricingCategoriesContainer">
                ${_cats.map(renderGroup).join('')}
            </div>
        `;

        // Store categories data for filtering
        this._catGroups = _cats;
    },

    _filterCategories(query) {
        const q = (query || '').trim().toLowerCase();
        const cards = document.querySelectorAll('#pricingCategoriesContainer .category-card');
        const groups = document.querySelectorAll('#pricingCategoriesContainer .pricing-group');
        if (!q) {
            cards.forEach(c => c.style.display = '');
            groups.forEach(g => g.style.display = '');
            return;
        }
        groups.forEach(g => {
            let hasVisible = false;
            g.querySelectorAll('.category-card').forEach(c => {
                const name = (c.getAttribute('data-name') || '').toLowerCase();
                const match = name.includes(q);
                c.style.display = match ? '' : 'none';
                if (match) hasVisible = true;
            });
            g.style.display = hasVisible ? '' : 'none';
        });
    },

    _filterGroup(groupName) {
        const tabs = document.querySelectorAll('._pg_tab');
        tabs.forEach(t => {
            t.classList.remove('bg-gray-900', 'text-white', '_pg_active');
            t.classList.add('bg-gray-100', 'text-gray-600');
        });
        const clicked = event?.target;
        if (clicked) {
            clicked.classList.remove('bg-gray-100', 'text-gray-600');
            clicked.classList.add('bg-gray-900', 'text-white', '_pg_active');
        }
        const groups = document.querySelectorAll('#pricingCategoriesContainer .pricing-group');
        if (!groupName) {
            groups.forEach(g => g.style.display = '');
        } else {
            groups.forEach(g => {
                const title = g.querySelector('h3')?.textContent?.trim() || '';
                g.style.display = title === groupName ? '' : 'none';
            });
        }
        const searchInput = document.getElementById('pricingSearchInput');
        if (searchInput) searchInput.value = '';
    },

    async renderStandsSubCategorySelector() {
        const content = document.getElementById('pricingContent');
        if (!content || typeof StandsPricing === 'undefined') return;
        const subs = StandsPricing.SUB_CATEGORIES;
        content.innerHTML = `
            <div class="mb-6">
                <button onclick="PricingAdmin.render()" class="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition">
                    <i class="fas fa-arrow-right"></i>
                    <span>العودة</span>
                </button>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">الاستندات — اختر النوع</h3>
                <p class="text-gray-600">Roll Up | X-Banner | Pop Up</p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${subs.map(s => `
                    <div onclick="PricingAdmin.render('Stands', null, '${s.id}')" class="category-card cursor-pointer bg-gradient-to-br from-cyan-50 to-sky-100 border-2 border-cyan-300 hover:border-cyan-500 p-8 rounded-xl transition-all hover:shadow-lg">
                        <div class="text-center">
                            <i class="fas fa-th-large text-6xl text-cyan-600 mb-4"></i>
                            <h4 class="font-bold text-xl text-gray-800 mb-2">${s.nameAr}</h4>
                            <p class="text-sm text-gray-600">${s.name}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // Render pricing mode selector - DISABLED: always redirect to selling mode
    async renderPricingModeSelector(category) {
        return this.renderCategoryDetails(category, 'selling');
    },

    // Legacy category names (kept for reference)
    _renderPricingModeSelectorLegacy(category) {
        const categoryNames = {
            'Offset': 'أوفست',
            'Offers': 'العروض',
            'PaperTypes': 'أنواع الورق',
            'CustomerSources': 'مصادر العملاء',
            'Shipping': 'أسعار الشحن',
            'Outdoor': 'الأوت دور',
            'Indoor': 'ان دور',
            'Stands': 'الاستندات',
            'Stamps': 'الأختام والختم',
            'Stand': 'الاستند',
            'Seal': 'الختم',
            'BusinessCard': 'كروت شخصية',
            'Tableau': 'تابلوةات',
            'DTF': 'طباعة DTF',
            'DTFUV': 'طباعة DTF UV',
            'Flag': 'أعلام',
            'TShirt': 'تيشرتات',
            'FabricBag': 'شنط قماش',
            'IDCard': 'الكارنيهات',
            'ZikrMedal': 'مدليات الأذكار',
            'SublimationGift': 'هدايا سبلميشن',
            'PromotionalGift': 'هدايا ترويجية',
            'RulerFrame': 'برواز مسطرة',
            'ShippingFlyer': 'فلاير شحن وأكياس شفافة',
            'PlasticBag': 'شنط بلاستيك',
            'InkjetPaper': 'طباعة إنك جيت بالورقة',
            'SafetyPrinting': 'لسيفتي بالطباعة',
            'Envelopes': 'المظاريف',
            'envelopes': 'المظاريف',
            'UVPrinting': 'طباعة UV',
            'Tableaux': 'تابلوةات',
            'Notebooks': 'الدفاتر',
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
            'boxes': 'البوكسات',
            'cladding_letters': 'واجهات كلادينج و حروف',
            'kraft_bags': 'شنط كرافت',
            'stan_roll': 'بكرة ستان'
        };

        const categoryIcons = {
            'Offset': 'fa-print',
            'Offers': 'fa-tags',
            'PaperTypes': 'fa-file-alt',
            'CustomerSources': 'fa-users',
            'Shipping': 'fa-truck',
            'Outdoor': 'fa-sun',
            'Indoor': 'fa-home',
            'Stands': 'fa-th-large',
            'Stamps': 'fa-stamp',
            'Stand': 'fa-cube',
            'Seal': 'fa-stamp',
            'BusinessCard': 'fa-id-card',
            'Tableau': 'fa-image',
            'DTF': 'fa-tshirt',
            'DTFUV': 'fa-spray-can',
            'Flag': 'fa-flag',
            'TShirt': 'fa-tshirt',
            'FabricBag': 'fa-shopping-bag',
            'IDCard': 'fa-id-card',
            'ZikrMedal': 'fa-medal',
            'SublimationGift': 'fa-gift',
            'PromotionalGift': 'fa-star',
            'RulerFrame': 'fa-ruler',
            'ShippingFlyer': 'fa-shipping-fast',
            'PlasticBag': 'fa-shopping-bag',
            'InkjetPaper': 'fa-print',
            'SafetyPrinting': 'fa-hard-hat',
            'Envelopes': 'fa-envelope',
            'envelopes': 'fa-envelope',
            'UVPrinting': 'fa-sun',
            'Tableaux': 'fa-image',
            'Notebooks': 'fa-book',
            'promotional_gifts': 'fa-gift',
            'ruler_frames': 'fa-ruler-combined',
            'shipping_flyers_clear_bags': 'fa-shipping-fast',
            'plastic_bags': 'fa-shopping-bag',
            'inkjet_paper_printing': 'fa-print',
            'safety_printing': 'fa-hard-hat',
            'digital_printing': 'fa-print',
            'paper_bags': 'fa-shopping-bag',
            'brochures': 'fa-book-open',
            'catalogs': 'fa-swatchbook',
            'acrylic_badge': 'fa-gem',
            'card_rosary': 'fa-pray',
            'annual_ads': 'fa-calendar-alt',
            'cup_quran_bags': 'fa-mug-hot',
            'boxes': 'fa-box-open',
            'cladding_letters': 'fa-building',
            'kraft_bags': 'fa-shopping-bag',
            'stan_roll': 'fa-scroll'
        };

        const categoryColors = {
            'Offset': { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200', icon: 'text-indigo-600' },
            'Offers': { bg: 'from-yellow-50 to-orange-100', border: 'border-yellow-300', icon: 'text-yellow-600' },
            'PaperTypes': { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200', icon: 'text-indigo-600' },
            'CustomerSources': { bg: 'from-teal-50 to-teal-100', border: 'border-teal-200', icon: 'text-teal-600' },
            'Shipping': { bg: 'from-red-50 to-red-100', border: 'border-red-200', icon: 'text-red-600' },
            'Outdoor': { bg: 'from-orange-50 to-amber-100', border: 'border-orange-300', icon: 'text-orange-600' },
            'Indoor': { bg: 'from-purple-50 to-pink-100', border: 'border-purple-300', icon: 'text-purple-600' },
            'Stands': { bg: 'from-cyan-50 to-sky-100', border: 'border-cyan-300', icon: 'text-cyan-600' },
            'Stamps': { bg: 'from-rose-50 to-pink-100', border: 'border-rose-300', icon: 'text-rose-600' },
            'Stand': { bg: 'from-cyan-50 to-blue-100', border: 'border-cyan-300', icon: 'text-cyan-600' },
            'Seal': { bg: 'from-red-50 to-pink-100', border: 'border-red-300', icon: 'text-red-600' },
            'BusinessCard': { bg: 'from-emerald-50 to-teal-100', border: 'border-emerald-300', icon: 'text-emerald-600' },
            'Tableau': { bg: 'from-amber-50 to-yellow-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'DTF': { bg: 'from-pink-50 to-rose-100', border: 'border-pink-300', icon: 'text-pink-600' },
            'DTFUV': { bg: 'from-indigo-50 to-blue-100', border: 'border-indigo-300', icon: 'text-indigo-600' },
            'Flag': { bg: 'from-blue-50 to-indigo-100', border: 'border-blue-300', icon: 'text-blue-600' },
            'TShirt': { bg: 'from-violet-50 to-purple-100', border: 'border-violet-300', icon: 'text-violet-600' },
            'FabricBag': { bg: 'from-green-50 to-emerald-100', border: 'border-green-300', icon: 'text-green-600' },
            'IDCard': { bg: 'from-slate-50 to-blue-50', border: 'border-slate-300', icon: 'text-slate-600' },
            'ZikrMedal': { bg: 'from-amber-50 to-yellow-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'SublimationGift': { bg: 'from-fuchsia-50 to-pink-100', border: 'border-fuchsia-300', icon: 'text-fuchsia-600' },
            'PromotionalGift': { bg: 'from-teal-50 to-cyan-100', border: 'border-teal-300', icon: 'text-teal-600' },
            'RulerFrame': { bg: 'from-slate-50 to-gray-100', border: 'border-slate-300', icon: 'text-slate-600' },
            'ShippingFlyer': { bg: 'from-amber-50 to-orange-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'PlasticBag': { bg: 'from-lime-50 to-green-100', border: 'border-lime-300', icon: 'text-lime-600' },
            'InkjetPaper': { bg: 'from-sky-50 to-cyan-100', border: 'border-sky-300', icon: 'text-sky-600' },
            'SafetyPrinting': { bg: 'from-red-50 to-rose-100', border: 'border-red-300', icon: 'text-red-600' },
            'Envelopes': { bg: 'from-sky-50 to-blue-100', border: 'border-sky-300', icon: 'text-sky-600' },
            'envelopes': { bg: 'from-sky-50 to-blue-100', border: 'border-sky-300', icon: 'text-sky-600' },
            'UVPrinting': { bg: 'from-violet-50 to-purple-100', border: 'border-violet-300', icon: 'text-violet-600' },
            'Tableaux': { bg: 'from-amber-50 to-yellow-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'Notebooks': { bg: 'from-amber-50 to-yellow-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'digital_printing': { bg: 'from-violet-50 to-purple-100', border: 'border-violet-300', icon: 'text-violet-600' },
            'paper_bags': { bg: 'from-amber-50 to-orange-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'brochures': { bg: 'from-blue-50 to-cyan-100', border: 'border-blue-300', icon: 'text-blue-600' },
            'catalogs': { bg: 'from-emerald-50 to-teal-100', border: 'border-emerald-300', icon: 'text-emerald-600' },
            'acrylic_badge': { bg: 'from-cyan-50 to-sky-100', border: 'border-cyan-300', icon: 'text-cyan-600' },
            'card_rosary': { bg: 'from-rose-50 to-pink-100', border: 'border-rose-300', icon: 'text-rose-600' },
            'annual_ads': { bg: 'from-orange-50 to-red-100', border: 'border-orange-300', icon: 'text-orange-600' },
            'cup_quran_bags': { bg: 'from-pink-50 to-fuchsia-100', border: 'border-pink-300', icon: 'text-pink-600' },
            'boxes': { bg: 'from-yellow-50 to-amber-100', border: 'border-yellow-400', icon: 'text-yellow-700' },
            'cladding_letters': { bg: 'from-gray-50 to-gray-100', border: 'border-gray-300', icon: 'text-gray-600' },
            'kraft_bags': { bg: 'from-amber-50 to-orange-100', border: 'border-amber-400', icon: 'text-amber-700' },
            'stan_roll': { bg: 'from-lime-50 to-emerald-100', border: 'border-lime-300', icon: 'text-lime-600' }
        };

        const colors = categoryColors[category] || { bg: 'from-gray-50 to-gray-100', border: 'border-gray-300', icon: 'text-gray-600' };
        const icon = categoryIcons[category] || 'fa-box';
        const categoryName = categoryNames[category] || category;

        // Check if category supports cost pricing
        const isNonCostSection = ['Shipping', 'CustomerSources', 'PaperTypes', 'Offers'].includes(category);
        const userRole = AppState.currentUser?.role || 'employee';
        const canViewCost = !isNonCostSection && (typeof PricingService !== 'undefined' ? PricingService.canViewCostPrice(userRole) : false);

        const backOnclick = category === 'Stands' ? "PricingAdmin.render('Stands', null, null)" : "PricingAdmin.render()";
        let html = `
            <div class="mb-6">
                <button onclick="${backOnclick}" class="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition">
                    <i class="fas fa-arrow-right"></i>
                    <span>${category === 'Stands' ? 'العودة لأنواع الاستندات' : 'العودة للفئات'}</span>
                </button>
                <div class="flex items-center gap-3">
                    <div class="bg-gradient-to-br ${colors.bg} ${colors.border} border-2 p-4 rounded-xl">
                        <i class="fas ${icon} ${colors.icon} text-4xl"></i>
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900">${categoryName}</h3>
                        <p class="text-gray-600">اختر نوع التسعير</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                <!-- Selling Price Mode -->
                <div onclick="PricingAdmin.render('${category}', 'selling')" 
                     class="cursor-pointer bg-gradient-to-br from-green-50 to-emerald-100 border-4 border-green-300 hover:border-green-500 p-8 rounded-xl transition-all hover:shadow-xl transform hover:scale-105">
                    <div class="text-center">
                        <i class="fas fa-dollar-sign text-6xl text-green-600 mb-4"></i>
                        <h4 class="font-bold text-2xl text-gray-800 mb-2">سعر البيع</h4>
                        <p class="text-sm text-gray-600 mb-4">إدارة أسعار البيع للعملاء</p>
                        <div class="bg-white rounded-lg p-3 text-xs text-gray-500">
                            من: ${category === 'BusinessCard' ? 'business_cards_prices_sell' : 'product_prices_sell'}
                        </div>
                    </div>
                </div>

                <!-- Cost Price Mode -->
                ${canViewCost ? `
                <div onclick="PricingAdmin.render('${category}', 'cost')" 
                     class="cursor-pointer bg-gradient-to-br from-red-50 to-rose-100 border-4 border-red-300 hover:border-red-500 p-8 rounded-xl transition-all hover:shadow-xl transform hover:scale-105">
                    <div class="text-center">
                        <i class="fas fa-calculator text-6xl text-red-600 mb-4"></i>
                        <h4 class="font-bold text-2xl text-gray-800 mb-2">سعر التكلفة</h4>
                        <p class="text-sm text-gray-600 mb-4">إدارة أسعار التكلفة الداخلية</p>
                        <div class="bg-white rounded-lg p-3 text-xs text-gray-500">
                            من: ${category === 'BusinessCard' ? 'business_cards_prices_cost' : 'product_prices_cost'}
                        </div>
                    </div>
                </div>
                ` : `
                <div class="bg-gray-100 border-4 border-gray-200 p-8 rounded-xl opacity-50 cursor-not-allowed">
                    <div class="text-center">
                        <i class="fas fa-lock text-6xl text-gray-400 mb-4"></i>
                        <h4 class="font-bold text-2xl text-gray-500 mb-2">سعر التكلفة</h4>
                        <p class="text-sm text-gray-400 mb-4">غير متاح</p>
                        <div class="bg-white rounded-lg p-3 text-xs text-gray-400">
                            يتطلب صلاحيات إدارية
                        </div>
                    </div>
                </div>
                `}
            </div>
        `;

        content.innerHTML = html;
    },

    // Render category details view (UNIFIED - works for ALL categories)
    async renderCategoryDetails(category, pricingMode) {
        const content = document.getElementById('pricingContent');
        if (!content) return;

        // Show loading indicator immediately for better UX
        if (category === 'Outdoor' || category === 'Indoor' || category === 'Stands' || category === 'Stamps' || category === 'BusinessCard') {
            const label = category === 'Outdoor' ? 'الأوت دور' : category === 'Indoor' ? 'الإندور' : category === 'Stands' ? 'الاستندات' : category === 'Stamps' ? 'الأختام' : 'كروت شخصية';
            content.innerHTML = `
                <div class="space-y-6">
                    <div class="bg-white p-6 rounded-xl border border-gray-200">
                        <div class="flex justify-between items-center mb-4">
                            <h4 class="text-xl font-bold text-gray-800">منتجات ${label}</h4>
                            <div class="flex items-center gap-2 text-gray-600">
                                <i class="fas fa-spinner fa-spin"></i>
                                <span>جاري التحميل...</span>
                            </div>
                        </div>
                        <div class="text-center py-8">
                            <i class="fas fa-spinner fa-spin text-4xl text-brandGold mb-4"></i>
                            <p class="text-gray-600">جاري تحميل الأسعار...</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Initialize data from Firestore if not already done
        if (!this._initialized) {
            await this._initialize();
        }

        const categoryNames = {
            'Offset': 'أوفست',
            'Offers': 'العروض',
            'PaperTypes': 'أنواع الورق',
            'CustomerSources': 'مصادر العملاء',
            'Shipping': 'أسعار الشحن',
            'Outdoor': 'الأوت دور',
            'Indoor': 'ان دور',
            'Stands': 'الاستندات',
            'Stamps': 'الأختام والختم',
            'Stand': 'الاستند',
            'Seal': 'الختم',
            'BusinessCard': 'كروت شخصية',
            'Tableau': 'تابلوةات',
            'DTF': 'طباعة DTF',
            'DTFUV': 'طباعة DTF UV',
            'Flag': 'أعلام',
            'TShirt': 'تيشرتات',
            'FabricBag': 'شنط قماش',
            'IDCard': 'الكارنيهات',
            'ZikrMedal': 'مدليات الأذكار',
            'SublimationGift': 'هدايا سبلميشن',
            'PromotionalGift': 'هدايا ترويجية',
            'RulerFrame': 'برواز مسطرة',
            'ShippingFlyer': 'فلاير شحن وأكياس شفافة',
            'PlasticBag': 'شنط بلاستيك',
            'InkjetPaper': 'طباعة إنك جيت بالورقة',
            'SafetyPrinting': 'لسيفتي بالطباعة',
            'Envelopes': 'المظاريف',
            'envelopes': 'المظاريف',
            'UVPrinting': 'طباعة UV',
            'Tableaux': 'تابلوةات',
            'Notebooks': 'الدفاتر',
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
            'boxes': 'البوكسات',
            'cladding_letters': 'واجهات كلادينج و حروف',
            'kraft_bags': 'شنط كرافت',
            'stan_roll': 'بكرة ستان'
        };

        const categoryIcons = {
            'Offset': 'fa-print',
            'Offers': 'fa-tags',
            'PaperTypes': 'fa-file-alt',
            'CustomerSources': 'fa-users',
            'Shipping': 'fa-truck',
            'Outdoor': 'fa-sun',
            'Indoor': 'fa-home',
            'Stands': 'fa-th-large',
            'Stamps': 'fa-stamp',
            'Stand': 'fa-cube',
            'Seal': 'fa-stamp',
            'BusinessCard': 'fa-id-card',
            'Tableau': 'fa-image',
            'DTF': 'fa-tshirt',
            'DTFUV': 'fa-spray-can',
            'Flag': 'fa-flag',
            'TShirt': 'fa-tshirt',
            'FabricBag': 'fa-shopping-bag',
            'IDCard': 'fa-id-card',
            'ZikrMedal': 'fa-medal',
            'SublimationGift': 'fa-gift',
            'PromotionalGift': 'fa-star',
            'RulerFrame': 'fa-ruler',
            'ShippingFlyer': 'fa-shipping-fast',
            'PlasticBag': 'fa-shopping-bag',
            'InkjetPaper': 'fa-print',
            'SafetyPrinting': 'fa-hard-hat',
            'Envelopes': 'fa-envelope',
            'envelopes': 'fa-envelope',
            'UVPrinting': 'fa-sun',
            'Tableaux': 'fa-image',
            'Notebooks': 'fa-book',
            'promotional_gifts': 'fa-gift',
            'ruler_frames': 'fa-ruler-combined',
            'shipping_flyers_clear_bags': 'fa-shipping-fast',
            'plastic_bags': 'fa-shopping-bag',
            'inkjet_paper_printing': 'fa-print',
            'safety_printing': 'fa-hard-hat',
            'digital_printing': 'fa-print',
            'paper_bags': 'fa-shopping-bag',
            'brochures': 'fa-book-open',
            'catalogs': 'fa-swatchbook',
            'acrylic_badge': 'fa-gem',
            'card_rosary': 'fa-pray',
            'annual_ads': 'fa-calendar-alt',
            'cup_quran_bags': 'fa-mug-hot',
            'boxes': 'fa-box-open',
            'cladding_letters': 'fa-building',
            'kraft_bags': 'fa-shopping-bag',
            'stan_roll': 'fa-scroll'
        };

        const categoryColors = {
            'Offset': { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200', icon: 'text-indigo-600' },
            'Offers': { bg: 'from-yellow-50 to-orange-100', border: 'border-yellow-300', icon: 'text-yellow-600' },
            'PaperTypes': { bg: 'from-indigo-50 to-indigo-100', border: 'border-indigo-200', icon: 'text-indigo-600' },
            'CustomerSources': { bg: 'from-teal-50 to-teal-100', border: 'border-teal-200', icon: 'text-teal-600' },
            'Shipping': { bg: 'from-red-50 to-red-100', border: 'border-red-200', icon: 'text-red-600' },
            'Outdoor': { bg: 'from-orange-50 to-amber-100', border: 'border-orange-300', icon: 'text-orange-600' },
            'Indoor': { bg: 'from-purple-50 to-pink-100', border: 'border-purple-300', icon: 'text-purple-600' },
            'Stands': { bg: 'from-cyan-50 to-sky-100', border: 'border-cyan-300', icon: 'text-cyan-600' },
            'Stamps': { bg: 'from-rose-50 to-pink-100', border: 'border-rose-300', icon: 'text-rose-600' },
            'Stand': { bg: 'from-cyan-50 to-blue-100', border: 'border-cyan-300', icon: 'text-cyan-600' },
            'Seal': { bg: 'from-red-50 to-pink-100', border: 'border-red-300', icon: 'text-red-600' },
            'BusinessCard': { bg: 'from-emerald-50 to-teal-100', border: 'border-emerald-300', icon: 'text-emerald-600' },
            'Tableau': { bg: 'from-amber-50 to-yellow-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'DTF': { bg: 'from-pink-50 to-rose-100', border: 'border-pink-300', icon: 'text-pink-600' },
            'DTFUV': { bg: 'from-indigo-50 to-blue-100', border: 'border-indigo-300', icon: 'text-indigo-600' },
            'Flag': { bg: 'from-blue-50 to-indigo-100', border: 'border-blue-300', icon: 'text-blue-600' },
            'TShirt': { bg: 'from-violet-50 to-purple-100', border: 'border-violet-300', icon: 'text-violet-600' },
            'FabricBag': { bg: 'from-green-50 to-emerald-100', border: 'border-green-300', icon: 'text-green-600' },
            'IDCard': { bg: 'from-slate-50 to-blue-50', border: 'border-slate-300', icon: 'text-slate-600' },
            'ZikrMedal': { bg: 'from-amber-50 to-yellow-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'SublimationGift': { bg: 'from-fuchsia-50 to-pink-100', border: 'border-fuchsia-300', icon: 'text-fuchsia-600' },
            'PromotionalGift': { bg: 'from-teal-50 to-cyan-100', border: 'border-teal-300', icon: 'text-teal-600' },
            'RulerFrame': { bg: 'from-slate-50 to-gray-100', border: 'border-slate-300', icon: 'text-slate-600' },
            'ShippingFlyer': { bg: 'from-amber-50 to-orange-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'PlasticBag': { bg: 'from-lime-50 to-green-100', border: 'border-lime-300', icon: 'text-lime-600' },
            'InkjetPaper': { bg: 'from-sky-50 to-cyan-100', border: 'border-sky-300', icon: 'text-sky-600' },
            'SafetyPrinting': { bg: 'from-red-50 to-rose-100', border: 'border-red-300', icon: 'text-red-600' },
            'Envelopes': { bg: 'from-sky-50 to-blue-100', border: 'border-sky-300', icon: 'text-sky-600' },
            'envelopes': { bg: 'from-sky-50 to-blue-100', border: 'border-sky-300', icon: 'text-sky-600' },
            'UVPrinting': { bg: 'from-violet-50 to-purple-100', border: 'border-violet-300', icon: 'text-violet-600' },
            'Tableaux': { bg: 'from-amber-50 to-yellow-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'Notebooks': { bg: 'from-amber-50 to-yellow-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'promotional_gifts': { bg: 'from-teal-50 to-cyan-100', border: 'border-teal-300', icon: 'text-teal-600' },
            'ruler_frames': { bg: 'from-slate-50 to-gray-100', border: 'border-slate-300', icon: 'text-slate-600' },
            'shipping_flyers_clear_bags': { bg: 'from-amber-50 to-orange-100', border: 'border-amber-300', icon: 'text-amber-600' },
            'plastic_bags': { bg: 'from-lime-50 to-green-100', border: 'border-lime-300', icon: 'text-lime-600' },
            'inkjet_paper_printing': { bg: 'from-sky-50 to-cyan-100', border: 'border-sky-300', icon: 'text-sky-600' },
            'safety_printing': { bg: 'from-red-50 to-rose-100', border: 'border-red-300', icon: 'text-red-600' },
            'digital_printing': { bg: 'from-violet-50 to-purple-100', border: 'border-violet-300', icon: 'text-violet-600' },
            'brochures': { bg: 'from-blue-50 to-cyan-100', border: 'border-blue-300', icon: 'text-blue-600' },
            'catalogs': { bg: 'from-emerald-50 to-teal-100', border: 'border-emerald-300', icon: 'text-emerald-600' },
            'acrylic_badge': { bg: 'from-cyan-50 to-sky-100', border: 'border-cyan-300', icon: 'text-cyan-600' },
            'card_rosary': { bg: 'from-rose-50 to-pink-100', border: 'border-rose-300', icon: 'text-rose-600' },
            'annual_ads': { bg: 'from-orange-50 to-red-100', border: 'border-orange-300', icon: 'text-orange-600' },
            'cup_quran_bags': { bg: 'from-pink-50 to-fuchsia-100', border: 'border-pink-300', icon: 'text-pink-600' },
            'boxes': { bg: 'from-yellow-50 to-amber-100', border: 'border-yellow-400', icon: 'text-yellow-700' },
            'cladding_letters': { bg: 'from-slate-50 to-stone-100', border: 'border-slate-400', icon: 'text-slate-700' },
            'kraft_bags': { bg: 'from-amber-50 to-orange-100', border: 'border-amber-400', icon: 'text-amber-700' },
            'stan_roll': { bg: 'from-lime-50 to-emerald-100', border: 'border-lime-300', icon: 'text-lime-600' }
        };

        const colors = categoryColors[category] || categoryColors['Outdoor'] || { bg: 'from-gray-50 to-gray-100', border: 'border-gray-300', icon: 'text-gray-600' };
        const icon = categoryIcons[category] || 'fa-box';
        
        const isNonCostSection = ['Shipping', 'CustomerSources', 'PaperTypes', 'Offers'].includes(category);
        
        // Validate pricing mode
        if (pricingMode === 'cost' && isNonCostSection) {
            pricingMode = 'selling'; // Force selling mode for non-cost sections
        }

        // Back button logic - always go back to categories
        let backBtnOnclick, backBtnLabel;
        if (category === 'Stands') {
            if (this.currentStandsSubCategory) {
                backBtnOnclick = `PricingAdmin.render('Stands', 'selling', null)`;
                backBtnLabel = 'العودة لاختيار نوع الاستند';
            } else {
                backBtnOnclick = `PricingAdmin.render()`;
                backBtnLabel = 'العودة للفئات';
            }
        } else {
            backBtnOnclick = `PricingAdmin.render()`;
            backBtnLabel = 'العودة للفئات';
        }
        // Back button and category header
        let categoryHTML = `
            <div class="mb-6">
                <button onclick="${backBtnOnclick}" class="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition">
                    <i class="fas fa-arrow-right"></i>
                    <span>${backBtnLabel}</span>
                </button>
                <div class="flex items-center gap-3">
                    <div class="bg-gradient-to-br ${colors.bg} ${colors.border} border-2 p-4 rounded-xl">
                        <i class="fas ${icon} ${colors.icon} text-4xl"></i>
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900">${categoryNames[category]}</h3>
                        <p class="text-gray-600">إدارة الأسعار</p>
                    </div>
                </div>
            </div>
        `;

        // Render category-specific content using UNIFIED pricing mode
        // Special categories (Offset, Offers, etc.) can have custom rendering
        // But they should still respect the pricingMode parameter
        switch(category) {
            case 'Offset':
                // Offset has complex configuration, keep custom renderer but respect mode
                const offsetConfig = await this.loadOffsetConfig();
                categoryHTML += this.renderOffsetCategory(offsetConfig);
                break;
            case 'Outdoor':
                categoryHTML += await this.renderOutdoorCategory(pricingMode);
                break;
            case 'Indoor':
                categoryHTML += await this.renderIndoorCategory(pricingMode);
                break;
            case 'Stands':
                categoryHTML += await this.renderStandsCategory(pricingMode, this.currentStandsSubCategory);
                break;
            case 'Stamps':
                categoryHTML += await this.renderStampsCategory(pricingMode);
                break;
            case 'BusinessCard':
                categoryHTML += await this.renderBusinessCardCategory(pricingMode);
                break;
            case 'Offers':
            case 'PaperTypes':
            case 'CustomerSources':
            case 'Shipping':
                // These are configuration categories, not product pricing
                // They don't need pricing mode, but we'll show them anyway
                if (category === 'Offers') {
                    categoryHTML += this.renderOffersCategory();
                } else if (category === 'PaperTypes') {
                    categoryHTML += this.renderPaperTypesCategory();
                } else if (category === 'CustomerSources') {
                    categoryHTML += this.renderCustomerSourcesCategory();
                } else if (category === 'Shipping') {
                categoryHTML += await this.renderShippingCategory();
                }
                break;
            case 'Stand':
            case 'Seal':
            case 'Tableau':
            case 'Tableaux':
            case 'DTF':
            case 'DTFUV':
            case 'Flag':
            case 'TShirt':
            case 'FabricBag':
            case 'IDCard':
            case 'ZikrMedal':
            case 'SublimationGift':
            case 'PromotionalGift':
            case 'RulerFrame':
            case 'ShippingFlyer':
            case 'PlasticBag':
            case 'InkjetPaper':
            case 'SafetyPrinting':
            case 'UVPrinting':
            case 'Notebooks':
            case 'promotional_gifts':
            case 'ruler_frames':
            case 'shipping_flyers_clear_bags':
            case 'plastic_bags':
            case 'inkjet_paper_printing':
                categoryHTML += await this.renderUnifiedProductCategory(category, pricingMode);
                break;
            case 'safety_printing':
                categoryHTML += await this.renderSafetyPrintingCategory(pricingMode);
                break;
            case 'Envelopes':
            case 'envelopes':
                categoryHTML += await this.renderEnvelopesCategory(pricingMode);
                break;
            case 'digital_printing':
                categoryHTML += await this.renderDigitalPrintingCategory(pricingMode);
                break;
            case 'paper_bags':
                categoryHTML += await this.renderPaperBagsCategory(pricingMode);
                break;
            case 'brochures':
                categoryHTML += await this.renderBrochuresCategory(pricingMode);
                break;
            case 'catalogs':
                categoryHTML += await this.renderCatalogsCategory(pricingMode);
                break;
            case 'acrylic_badge':
                categoryHTML += await this.renderAcrylicBadgeCategory(pricingMode);
                break;
            case 'card_rosary':
                categoryHTML += await this.renderCardRosaryCategory(pricingMode);
                break;
            case 'annual_ads':
                categoryHTML += await this.renderAnnualAdsCategory(pricingMode);
                break;
            case 'cup_quran_bags':
                categoryHTML += await this.renderCupQuranBagsCategory(pricingMode);
                break;
            case 'boxes':
                categoryHTML += await this.renderBoxesCategory(pricingMode);
                break;
            case 'cladding_letters':
                categoryHTML += await this.renderCladdingLettersCategory(pricingMode);
                break;
            case 'kraft_bags':
                categoryHTML += await this.renderKraftBagsCategory(pricingMode);
                break;
            case 'stan_roll':
                categoryHTML += await this.renderStanRollCategory(pricingMode);
                break;
        }

        content.innerHTML = categoryHTML;

        // Initialize category-specific rendering
        if (category === 'Offers') {
            await this.renderOffers();
        } else if (category === 'PaperTypes') {
            this.renderPaperTypes();
        } else if (category === 'CustomerSources') {
            this.renderCustomerSources();
        } else if (category === 'Offset') {
            this.renderPaperTypes();
        }
    },

    // Load offset configuration
    async loadOffsetConfig() {
        if (!this._initialized) {
            await this._initialize();
        }
        
        // Always load from Firestore to get latest prices
        try {
            const db = this._getDb();
            const doc = await this._getColl(this.COLLECTION_NAME).doc('offset').get();
            
            if (doc.exists) {
                const config = doc.data();
                this._configCache.offset = config;
                
                // Debug: log loaded machines and prices
                console.log('Loaded Offset Config from Firestore:', {
                    machines: config.machines?.map(m => ({
                        name: m.name,
                        dieCuttingPrice: m.dieCuttingPrice,
                        dieCuttingFormPrice: m.dieCuttingFormPrice,
                        embossingPrice: m.embossingPrice,
                        debossingPrice: m.debossingPrice,
                        creasingPrice: m.creasingPrice,
                        perforationPrice: m.perforationPrice,
                        specialColorPrice: m.specialColorPrice
                    })),
                    additions: config.additions,
                    perforation: config.additions?.perforation,
                    cornering: config.additions?.cornering,
                    spotUV: config.additions?.spotUV
                });
                
                return config;
            }
        } catch (error) {
            console.error('Error loading offset config from Firestore:', error);
        }
        
        // If cache exists, return it
        if (this._configCache.offset) {
            return this._configCache.offset;
        }
        
        // Return default config from OffsetPricing module
        if (typeof OffsetPricing !== 'undefined') {
            return OffsetPricing.config;
        }
        
        const defaultConfig = {
            sheetCost: 6.5,
            cutting: { initialCost: 50, perThousandCost: 30 },
            colors: { oneColor: 80, fourColor: 320 },
            machines: [
                { name: '1/8 Sheet', size: { width: 35, height: 25 }, cost: 100, oneColorCost: 100, fourColorCost: 200 },
                { name: '1/4 Sheet', size: { width: 50, height: 35 }, cost: 200, oneColorCost: 200, fourColorCost: 400 },
                { name: '1/2 Sheet', size: { width: 70, height: 50 }, cost: 300, oneColorCost: 300, fourColorCost: 600 },
                { name: 'Full Sheet', size: { width: 70, height: 100 }, cost: 400, oneColorCost: 400, fourColorCost: 800 }
            ]
        };
        
        // Save default to Firestore if not exists
        try {
            const db = this._getDb();
            await this._getColl(this.COLLECTION_NAME).doc('offset').set(defaultConfig);
        } catch (error) {
            console.error('Error saving default offset config:', error);
        }
        
        this._configCache.offset = defaultConfig;
        return defaultConfig;
    },

    // Load product configuration
    async loadProductConfig() {
        if (!this._initialized) {
            await this._initialize();
        }
        
        if (this._configCache.product) {
            const config = this._configCache.product;
            // Migration: convert old format to new format with cost and sellingPrice
            if (config.Banner && typeof config.Banner === 'number' && !config.Banner.cost) {
                // Old format: single price (cost)
                return {
                    Banner: { cost: config.Banner, sellingPrice: config.Banner * 1.5 },
                    Flex: { cost: config.Flex, sellingPrice: config.Flex * 1.5 },
                    Vinyl: { cost: config.Vinyl, sellingPrice: config.Vinyl * 1.5 },
                    Lamination: config.Lamination || 50
                };
            }
            return config;
        }
        
        const defaultConfig = {
            Banner: { cost: 100, sellingPrice: 150 },
            Flex: { cost: 180, sellingPrice: 270 },
            Vinyl: { cost: 200, sellingPrice: 300 },
            Lamination: 50
        };
        
        // Save default to Firestore if not exists
        const db = this._getDb();
        await this._getColl(this.COLLECTION_NAME).doc('product').set(defaultConfig);
        this._configCache.product = defaultConfig;
        
        return defaultConfig;
    },

    // Save offset configuration
    async saveOffsetConfig() {
        const config = {
            sellMarginPercent: parseFloat(document.getElementById('offsetSellMarginPercent')?.value || 50),
            sheetCost: parseFloat(document.getElementById('offsetSheetCost')?.value || 6.5),
            cutting: {
                initialCost: parseFloat(document.getElementById('offsetCuttingInitial')?.value || 50),
                perThousandCost: parseFloat(document.getElementById('offsetCuttingPerThousand')?.value || 30)
            },
            colors: {
                oneColor: parseFloat(document.getElementById('offsetColorOne')?.value || 80),
                fourColor: parseFloat(document.getElementById('offsetColorFour')?.value || 320)
            },
            machines: [],
            additions: {
                // Most additions are now per machine, only general ones remain here
                formPrice: parseFloat(document.getElementById('offsetFormPrice')?.value || 0), // Price per square cm for forms
                cornering: parseFloat(document.getElementById('offsetAdditionCornering')?.value || 0), // Price per 1000 sheets (unified)
                perforation: parseFloat(document.getElementById('offsetAdditionPerforation')?.value || 0), // Price per 1000 sheets per perforation
                spotUV: parseFloat(document.getElementById('offsetAdditionSpotUV')?.value || 0),
                folderPocket: parseFloat(document.getElementById('offsetAdditionFolderPocket')?.value || 0), // Price per 1000 pieces
                bontaGluing: parseFloat(document.getElementById('offsetAdditionBontaGluing')?.value || 0), // Price per 1000 pieces (× bonta count)
                sandwichBag: parseFloat(document.getElementById('offsetAdditionSandwichBag')?.value || 0) // Price per 1000 pieces
            }
        };
        
        // Debug: Log form input values before saving
        const perforationInput = document.getElementById('offsetAdditionPerforation');
        const corneringInput = document.getElementById('offsetAdditionCornering');
        const spotUVInput = document.getElementById('offsetAdditionSpotUV');
        const formPriceInput = document.getElementById('offsetFormPrice');
        
        console.log('=== saveOffsetConfig: Reading from form inputs ===', {
            perforationInput: {
                element: perforationInput ? 'FOUND' : 'NOT FOUND',
                value: perforationInput?.value,
                parsed: config.additions.perforation
            },
            corneringInput: {
                element: corneringInput ? 'FOUND' : 'NOT FOUND',
                value: corneringInput?.value,
                parsed: config.additions.cornering
            },
            spotUVInput: {
                element: spotUVInput ? 'FOUND' : 'NOT FOUND',
                value: spotUVInput?.value,
                parsed: config.additions.spotUV
            },
            formPriceInput: {
                element: formPriceInput ? 'FOUND' : 'NOT FOUND',
                value: formPriceInput?.value,
                parsed: config.additions.formPrice
            }
        });

        // Get machine configurations
        const machineInputs = document.querySelectorAll('[id^="machineName_"]');
        const cachedMachines = this._configCache?.offset?.machines || [];
        
        machineInputs.forEach((input, index) => {
            const name = document.getElementById(`machineName_${index}`)?.value;
            const width = parseFloat(document.getElementById(`machineWidth_${index}`)?.value || 0);
            const height = parseFloat(document.getElementById(`machineHeight_${index}`)?.value || 0);
            const oneColorCost = parseFloat(document.getElementById(`machineOneColorCost_${index}`)?.value || 0);
            const fourColorCost = parseFloat(document.getElementById(`machineFourColorCost_${index}`)?.value || 0);
            
            if (name && width && height && (oneColorCost || fourColorCost)) {
                // Get prices from cache (saved from modals)
                const cachedMachine = cachedMachines[index] || {};
                const machineConfig = {
                    name: name,
                    size: { width: width, height: height },
                    cost: oneColorCost,
                    oneColorCost: oneColorCost,
                    fourColorCost: fourColorCost,
                    specialColorPrice: cachedMachine.specialColorPrice || 0,
                    matteCellophanePrice: cachedMachine.matteCellophanePrice || 0,
                    glossyCellophanePrice: cachedMachine.glossyCellophanePrice || 0,
                    dieCuttingPrice: cachedMachine.dieCuttingPrice || 0,
                    embossingPrice: cachedMachine.embossingPrice || 0,
                    debossingPrice: cachedMachine.debossingPrice || 0,
                    creasingPrice: cachedMachine.creasingPrice || 0,
                    perforationPrice: cachedMachine.perforationPrice || 0
                };
                
                // Add form prices if they exist (per machine)
                if (cachedMachine.dieCuttingFormPrice !== undefined) {
                    machineConfig.dieCuttingFormPrice = cachedMachine.dieCuttingFormPrice;
                }
                if (cachedMachine.embossingFormPrice !== undefined) {
                    machineConfig.embossingFormPrice = cachedMachine.embossingFormPrice;
                }
                if (cachedMachine.debossingFormPrice !== undefined) {
                    machineConfig.debossingFormPrice = cachedMachine.debossingFormPrice;
                }
                
                config.machines.push(machineConfig);
            }
        });
        
        // Update form price in additions if it exists in cache
        if (this._configCache?.offset?.additions?.formPrice !== undefined) {
            config.additions.formPrice = this._configCache.offset.additions.formPrice;
        }

        // Merge with cached prices to ensure all addition prices are included
        const cachedConfig = this._configCache?.offset || {};
        if (cachedConfig.machines && cachedConfig.machines.length > 0) {
            // Update machines with cached prices if they exist
            config.machines.forEach((machine, index) => {
                const cachedMachine = cachedConfig.machines[index];
                if (cachedMachine) {
                    // Preserve oneColorCost/fourColorCost from cache
                    if (cachedMachine.oneColorCost !== undefined) machine.oneColorCost = cachedMachine.oneColorCost;
                    if (cachedMachine.fourColorCost !== undefined) machine.fourColorCost = cachedMachine.fourColorCost;
                    // Preserve all addition prices from cache
                    machine.specialColorPrice = cachedMachine.specialColorPrice || machine.specialColorPrice || 0;
                    machine.matteCellophanePrice = cachedMachine.matteCellophanePrice || machine.matteCellophanePrice || 0;
                    machine.glossyCellophanePrice = cachedMachine.glossyCellophanePrice || machine.glossyCellophanePrice || 0;
                    machine.dieCuttingPrice = cachedMachine.dieCuttingPrice || machine.dieCuttingPrice || 0;
                    machine.embossingPrice = cachedMachine.embossingPrice || machine.embossingPrice || 0;
                    machine.debossingPrice = cachedMachine.debossingPrice || machine.debossingPrice || 0;
                    machine.creasingPrice = cachedMachine.creasingPrice || machine.creasingPrice || 0;
                    machine.perforationPrice = cachedMachine.perforationPrice || machine.perforationPrice || 0;
                    
                    // Preserve form prices
                    if (cachedMachine.dieCuttingFormPrice !== undefined) {
                        machine.dieCuttingFormPrice = cachedMachine.dieCuttingFormPrice;
                    }
                    if (cachedMachine.embossingFormPrice !== undefined) {
                        machine.embossingFormPrice = cachedMachine.embossingFormPrice;
                    }
                    if (cachedMachine.debossingFormPrice !== undefined) {
                        machine.debossingFormPrice = cachedMachine.debossingFormPrice;
                    }
                }
            });
        }
        
        // Merge additions from cache, but prioritize values from form inputs
        if (cachedConfig.additions) {
            config.additions = {
                ...cachedConfig.additions, // Start with cached values
                ...config.additions // Override with form values (perforation, cornering, spotUV, formPrice)
            };
        }
        
        // Debug: Log what we're saving
        console.log('=== saveOffsetConfig: Saving to Firestore ===', {
            additions: config.additions,
            perforation: config.additions.perforation,
            cornering: config.additions.cornering,
            spotUV: config.additions.spotUV,
            formPrice: config.additions.formPrice
        });
        
        // Save to Firestore
        const db = this._getDb();
        await this._getColl(this.COLLECTION_NAME).doc('offset').set(config);
        
        // Verify save by reading back
        const verifyDoc = await this._getColl(this.COLLECTION_NAME).doc('offset').get();
        if (verifyDoc.exists) {
            const savedData = verifyDoc.data();
            console.log('=== saveOffsetConfig: Verified from Firestore ===', {
                additions: savedData.additions,
                perforation: savedData.additions?.perforation,
                cornering: savedData.additions?.cornering,
                spotUV: savedData.additions?.spotUV
            });
        }
        
        // Update cache
        this._configCache.offset = config;
        
        // Update OffsetPricing module config
        if (typeof OffsetPricing !== 'undefined') {
            OffsetPricing.config = config;
        }

        Swal.fire('تم', 'تم حفظ إعدادات الأوفست بنجاح', 'success');
    },


    // Render Offset category
    renderOffsetCategory(offsetConfig = null) {
        if (!offsetConfig) {
            // This should not happen if called from renderCategoryDetails, but fallback just in case
            console.warn('renderOffsetCategory called without config');
            return '<div class="text-center text-gray-500 py-8">جارٍ التحميل...</div>';
        }
        return `
            <div class="space-y-6">
                <!-- Offset Sell Margin % -->
                <div class="bg-white p-6 rounded-xl border-2 border-yellow-400">
                    <h4 class="text-xl font-bold text-gray-800 mb-4"><i class="fas fa-percentage text-yellow-600 ml-2"></i>نسبة البيع للأوفست</h4>
                    <p class="text-sm text-gray-600 mb-3">هذه النسبة تُطبق تلقائياً على كل طلبات الأوفست. سعر البيع = التكلفة + (التكلفة × النسبة ÷ 100)</p>
                    <div class="max-w-xs">
                        <label class="block text-sm font-bold text-gray-700 mb-1">نسبة البيع %</label>
                        <input type="number" id="offsetSellMarginPercent" step="0.1" min="0" value="${offsetConfig.sellMarginPercent || 50}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none text-lg font-bold">
                    </div>
                </div>

                <!-- Paper Types Management -->
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-xl font-bold text-gray-800">أنواع الورق</h4>
                        <button onclick="PricingAdmin.openAddPaperTypeModal()" class="bg-brandGold text-white px-4 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition">
                            <i class="fas fa-plus ml-2"></i> إضافة نوع ورق جديد
                        </button>
                    </div>
                    <div id="paperTypesList" class="space-y-3 max-h-96 overflow-y-auto">
                        <!-- Paper types will be rendered here -->
                    </div>
                </div>

                <!-- Cutting Costs -->
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">تكاليف القطع</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">قطع الورق الأولي (ج.م)</label>
                            <input type="number" id="offsetCuttingInitial" step="0.01" value="${offsetConfig.cutting.initialCost}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">القطع النهائي (ج.م لكل 1000 قطعة)</label>
                            <input type="number" id="offsetCuttingPerThousand" step="0.01" value="${offsetConfig.cutting.perThousandCost}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                    </div>
                </div>

                <!-- Zinc Costs -->
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">تكاليف الزنك (البلاطة)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">لون واحد (ج.م)</label>
                            <input type="number" id="offsetColorOne" step="0.01" value="${offsetConfig.colors.oneColor}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">أربع ألوان (ج.م)</label>
                            <input type="number" id="offsetColorFour" step="0.01" value="${offsetConfig.colors.fourColor}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                        </div>
                    </div>
                </div>

                <!-- Printing Machines -->
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">آلات الطباعة</h4>
                    <div id="offsetMachinesList" class="space-y-3">
                        ${offsetConfig.machines.map((machine, index) => `
                            <div class="bg-gray-50 p-4 rounded-lg border border-gray-300">
                                <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    <div>
                                        <label class="block text-xs text-gray-600 mb-1">اسم الآلة</label>
                                        <input type="text" id="machineName_${index}" value="${machine.name}" class="w-full border border-gray-300 p-2 rounded focus:border-brandGold outline-none text-sm">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-gray-600 mb-1">الطول (سم)</label>
                                        <input type="number" id="machineWidth_${index}" step="0.01" value="${machine.size.width}" class="w-full border border-gray-300 p-2 rounded focus:border-brandGold outline-none text-sm">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-gray-600 mb-1">العرض (سم)</label>
                                        <input type="number" id="machineHeight_${index}" step="0.01" value="${machine.size.height}" class="w-full border border-gray-300 p-2 rounded focus:border-brandGold outline-none text-sm">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-gray-600 mb-1">لون واحد (ج.م)</label>
                                        <input type="number" id="machineOneColorCost_${index}" step="0.01" value="${machine.oneColorCost || machine.cost || 0}" class="w-full border border-gray-300 p-2 rounded focus:border-brandGold outline-none text-sm">
                                    </div>
                                    <div>
                                        <label class="block text-xs text-gray-600 mb-1">ألوان (ج.م)</label>
                                        <input type="number" id="machineFourColorCost_${index}" step="0.01" value="${machine.fourColorCost || machine.cost || 0}" class="w-full border border-gray-300 p-2 rounded focus:border-brandGold outline-none text-sm">
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Offset Additions Prices -->
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">أسعار الإضافات</h4>
                    <p class="text-sm text-gray-600 mb-4">اضغط على الإضافة لإدخال أسعارها لكل آلة</p>
                    
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                        <button type="button" onclick="PricingAdmin.openAdditionPricingModal('specialColor', 'لون أي')" class="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 p-4 rounded-xl transition-all text-right">
                            <div class="font-bold text-gray-800 mb-1">لون أي</div>
                            <div class="text-xs text-gray-600">ج.م/1000 ورقة - وجه واحد</div>
                        </button>
                        <button type="button" onclick="PricingAdmin.openAdditionPricingModal('matteCellophane', 'سلوفان مط')" class="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 p-4 rounded-xl transition-all text-right">
                            <div class="font-bold text-gray-800 mb-1">سلوفان مط</div>
                            <div class="text-xs text-gray-600">ج.م/1000 ورقة - وجه واحد</div>
                        </button>
                        <button type="button" onclick="PricingAdmin.openAdditionPricingModal('glossyCellophane', 'سلوفان لامع')" class="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 p-4 rounded-xl transition-all text-right">
                            <div class="font-bold text-gray-800 mb-1">سلوفان لامع</div>
                            <div class="text-xs text-gray-600">ج.م/1000 ورقة - وجه واحد</div>
                        </button>
                        <button type="button" onclick="PricingAdmin.openAdditionPricingModal('dieCutting', 'تكسير', true)" class="bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 p-4 rounded-xl transition-all text-right">
                            <div class="font-bold text-gray-800 mb-1">تكسير</div>
                            <div class="text-xs text-gray-600">ج.م/1000 ورقة + فورمة</div>
                        </button>
                        <button type="button" onclick="PricingAdmin.openAdditionPricingModal('embossing', 'بصمة', true)" class="bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 p-4 rounded-xl transition-all text-right">
                            <div class="font-bold text-gray-800 mb-1">بصمة</div>
                            <div class="text-xs text-gray-600">ج.م/1000 ورقة - وجه واحد + فورمة</div>
                        </button>
                        <button type="button" onclick="PricingAdmin.openAdditionPricingModal('debossing', 'كفراج', true)" class="bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-400 p-4 rounded-xl transition-all text-right">
                            <div class="font-bold text-gray-800 mb-1">كفراج</div>
                            <div class="text-xs text-gray-600">ج.م/1000 ورقة - وجه واحد + فورمة</div>
                        </button>
                        <button type="button" onclick="PricingAdmin.openAdditionPricingModal('creasing', 'ريجة')" class="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-400 p-4 rounded-xl transition-all text-right">
                            <div class="font-bold text-gray-800 mb-1">ريجة</div>
                            <div class="text-xs text-gray-600">ج.م/1000 ورقة</div>
                        </button>
                    </div>
                    
                    <div class="border-t pt-4 mt-4">
                        <h5 class="font-bold text-gray-800 mb-3">أسعار الإضافات العامة</h5>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">جيب فولدر + لزق (ج.م لكل 1000 قطعة)</label>
                                <input type="number" id="offsetAdditionFolderPocket" step="0.01" value="${(offsetConfig.additions?.folderPocket || 0)}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">تلزيق بونطة (ج.م لكل 1000 قطعة)</label>
                                <input type="number" id="offsetAdditionBontaGluing" step="0.01" value="${(offsetConfig.additions?.bontaGluing || 0)}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                                <p class="text-xs text-gray-500 mt-1">يُضرب في عدد البونط عند الحساب</p>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-1">تفصيل كيس سندوتش (ج.م لكل 1000 قطعة)</label>
                                <input type="number" id="offsetAdditionSandwichBag" step="0.01" value="${(offsetConfig.additions?.sandwichBag || 0)}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                            </div>
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <label class="block text-sm font-bold text-gray-700">ركنة (ج.م لكل 1000 ورقة)</label>
                                    <button type="button" onclick="PricingAdmin.togglePriceInfo('cornering', 'general')" class="text-blue-500 hover:text-blue-700 text-sm">
                                        <i class="fas fa-question-circle"></i>
                                    </button>
                                </div>
                                <div id="priceInfo_cornering_general" class="hidden bg-blue-50 p-2 rounded border border-blue-200 text-xs text-gray-700 mb-2">
                                    التسعيرة لكل 1000 ورقة. سعر موحد لجميع الآلات (ليس لكل آلة). إذا كانت الكمية أقل من 1000 ورقة، يتم حسابها كأنها 1000 ورقة
                                </div>
                                <input type="number" id="offsetAdditionCornering" step="0.01" value="${(offsetConfig.additions?.cornering || 0)}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                            </div>
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <label class="block text-sm font-bold text-gray-700">تخريم (ج.م لكل 1000 ورقة)</label>
                                    <button type="button" onclick="PricingAdmin.togglePriceInfo('perforation', 'general')" class="text-blue-500 hover:text-blue-700 text-sm">
                                        <i class="fas fa-question-circle"></i>
                                    </button>
                                </div>
                                <div id="priceInfo_perforation_general" class="hidden bg-blue-50 p-2 rounded border border-blue-200 text-xs text-gray-700 mb-2">
                                    التسعيرة لكل 1000 ورقة. سعر موحد لجميع الآلات (ليس لكل آلة). يتم ضرب السعر × عدد التخريمن. إذا كانت الكمية أقل من 1000 ورقة، يتم حسابها كأنها 1000 ورقة
                                </div>
                                <input type="number" id="offsetAdditionPerforation" step="0.01" value="${(offsetConfig.additions?.perforation || 0)}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                            </div>
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <label class="block text-sm font-bold text-gray-700">سبوت (ج.م لكل وجه - وجه واحد)</label>
                                    <button type="button" onclick="PricingAdmin.togglePriceInfo('spotUV', 'general')" class="text-blue-500 hover:text-blue-700 text-sm">
                                        <i class="fas fa-question-circle"></i>
                                    </button>
                                </div>
                                <div id="priceInfo_spotUV_general" class="hidden bg-blue-50 p-2 rounded border border-blue-200 text-xs text-gray-700 mb-2">
                                    التسعيرة للوجه الواحد. عند اختيار وجهين يتم ضرب السعر × 2
                                </div>
                                <input type="number" id="offsetAdditionSpotUV" step="0.01" value="${(offsetConfig.additions?.spotUV || 0)}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-4">
                    <button onclick="PricingAdmin.saveOffsetConfig()" class="bg-brandGold text-white px-6 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">
                        <i class="fas fa-save ml-2"></i> حفظ إعدادات الأوفست
                    </button>
                </div>
            </div>
        `;
    },

    // Render Offers category
    renderOffersCategory() {
        return `
            <div class="bg-white p-6 rounded-xl border border-gray-200">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-xl font-bold text-gray-800">إدارة العروض</h4>
                    <button onclick="PricingAdmin.openAddOfferModal()" class="bg-brandGold text-white px-4 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition">
                        <i class="fas fa-plus ml-2"></i> إضافة عرض جديد
                    </button>
                </div>
                <div id="offersList" class="space-y-4">
                    <!-- Offers will be rendered here -->
                </div>
            </div>
        `;
    },

    // Save category-specific configuration
    async saveCategoryConfig(category) {
        // This function is now deprecated - Banner, Flex, Vinyl are managed in Outdoor section
        Swal.fire('معلومة', 'تم نقل إدارة البانر والفينيل والفليكس إلى قسم ان دور', 'info');
    },

    // Save product configuration (legacy support - deprecated)
    saveProductConfig() {
        // Banner, Flex, Vinyl are now managed in Outdoor section
        Swal.fire('معلومة', 'تم نقل إدارة البانر والفينيل والفليكس إلى قسم ان دور', 'info');
    },

    // Load offers from Firestore
    async loadOffers() {
        if (!this._initialized) {
            await this._initialize();
        }
        return [...this._offersCache];
    },

    // Save offers to Firestore
    async saveOffers(offers) {
        const db = this._getDb();
        
        try {
            // Delete all existing offers
            const batch = db.batch();
            const snapshot = await this._getColl(this.OFFERS_COLLECTION).get();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            
            // Add all new offers
            offers.forEach(offer => {
                const docRef = this._getColl(this.OFFERS_COLLECTION).doc(offer.id || this._getColl(this.OFFERS_COLLECTION).doc().id);
                const { id, ...offerData } = offer;
                batch.set(docRef, offerData);
            });
            
            await batch.commit();
            
            // Update cache
            this._offersCache = [...offers];
            this._offersCache.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        } catch (error) {
            console.error('Error saving offers:', error);
            throw error;
        }
    },

    // Render offers list
    async renderOffers() {
        const offersList = document.getElementById('offersList');
        if (!offersList) return;

        const offers = await this.loadOffers();

        if (offers.length === 0) {
            offersList.innerHTML = '<div class="text-center text-gray-500 py-8">لا توجد عروض. اضغط على "إضافة عرض جديد" للبدء</div>';
            return;
        }

        offersList.innerHTML = offers.map((offer, index) => `
            <div class="bg-white p-4 rounded-lg border border-gray-300">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <h5 class="font-bold text-lg text-gray-800 mb-2">${offer.name}</h5>
                        <div class="text-sm text-gray-600 mb-2">
                            <span class="font-bold text-brandGold">سعر البيع: ${(offer.sellingPrice || offer.price).toFixed(2)} ج.م</span>
                            ${offer.cost ? `<span class="text-gray-500 mr-3">التكلفة: ${offer.cost.toFixed(2)} ج.م</span>` : ''}
                        </div>
                        <div class="bg-gray-50 p-3 rounded border border-gray-200">
                            <strong class="text-xs text-gray-700 block mb-2">المنتجات المشمولة:</strong>
                            <ul class="text-xs text-gray-600 space-y-1">
                                ${offer.items.map(item => `
                                    <li>• ${item.productName} - الكمية: ${item.quantity}${item.size ? ` - المقاس: ${item.size}` : ''}${item.paperType ? ` - ${item.paperType}` : ''}</li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                    <div class="flex gap-2 mr-4">
                        <button onclick="PricingAdmin.editOffer(${offer.id})" class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="PricingAdmin.deleteOffer(${offer.id})" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    // Open add/edit offer modal
    async openAddOfferModal(offerId = null) {
        const offers = await this.loadOffers();
        const offer = offerId ? offers.find(o => o.id === offerId) : null;

        Swal.fire({
            title: offerId ? 'تعديل العرض' : 'إضافة عرض جديد',
            html: `
                <div class="text-right space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">اسم العرض</label>
                        <input type="text" id="offerName" value="${offer?.name || ''}" class="w-full border border-gray-300 p-2 rounded" placeholder="مثال: بطاقة عمل + بانر">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">سعر التكلفة الفعلية (ج.م)</label>
                        <input type="number" id="offerCost" step="0.01" value="${offer?.cost || offer?.price || ''}" class="w-full border border-gray-300 p-2 rounded" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">سعر البيع (ج.م)</label>
                        <input type="number" id="offerSellingPrice" step="0.01" value="${offer?.sellingPrice || offer?.price || ''}" class="w-full border border-gray-300 p-2 rounded" placeholder="0.00">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">المنتجات المشمولة (افصل بين كل منتج بفاصلة)</label>
                        <textarea id="offerItems" rows="4" class="w-full border border-gray-300 p-2 rounded" placeholder="مثال:&#10;بطاقة عمل - 1000 قطعة - 5×9 سم&#10;بانر - 1 قطعة - 1×2 م">${offer ? offer.items.map(item => `${item.productName} - ${item.quantity} ${item.size ? '- ' + item.size : ''}${item.paperType ? ' - ' + item.paperType : ''}`).join('\\n') : ''}</textarea>
                        <p class="text-xs text-gray-500 mt-1">الصيغة: اسم المنتج - الكمية - المقاس (اختياري) - نوع الورق (اختياري)</p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#D98618',
            didOpen: () => {
                // Focus on name input
                document.getElementById('offerName').focus();
            },
            preConfirm: () => {
                const name = document.getElementById('offerName').value.trim();
                const cost = parseFloat(document.getElementById('offerCost').value);
                const sellingPrice = parseFloat(document.getElementById('offerSellingPrice').value);
                const itemsText = document.getElementById('offerItems').value.trim();

                if (!name || !cost || cost <= 0 || !sellingPrice || sellingPrice <= 0) {
                    Swal.showValidationMessage('يرجى إدخال اسم العرض وسعر التكلفة وسعر البيع');
                    return false;
                }

                if (!itemsText) {
                    Swal.showValidationMessage('يرجى إدخال المنتجات المشمولة');
                    return false;
                }

                // Parse items
                const items = itemsText.split('\\n').filter(line => line.trim()).map(line => {
                    const parts = line.split('-').map(p => p.trim());
                    const item = {
                        productName: parts[0] || '',
                        quantity: parseInt(parts[1]) || 1
                    };
                    if (parts[2]) item.size = parts[2];
                    if (parts[3]) item.paperType = parts[3];
                    return item;
                });

                return {
                    id: offerId || Date.now(),
                    name: name,
                    cost: cost,
                    sellingPrice: sellingPrice,
                    price: sellingPrice, // Backward compatibility
                    items: items
                };
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                const updatedOffers = offerId 
                    ? offers.map(o => o.id === offerId ? result.value : o)
                    : [...offers, result.value];
                
                await this.saveOffers(updatedOffers);
                await this.renderOffers();
                Swal.fire('تم', offerId ? 'تم تعديل العرض بنجاح' : 'تم إضافة العرض بنجاح', 'success');
            }
        });
    },

    // Edit offer
    editOffer(offerId) {
        this.openAddOfferModal(offerId);
    },

    // Delete offer
    async deleteOffer(offerId) {
        Swal.fire({
            title: 'هل أنت متأكد؟',
            text: 'سيتم حذف هذا العرض',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#d33'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const offers = await this.loadOffers();
                const updatedOffers = offers.filter(o => o.id !== offerId);
                await this.saveOffers(updatedOffers);
                if (this.currentCategory === 'Offers') {
                    await this.renderOffers();
                } else {
                    await this.render('Offers');
                }
                Swal.fire('تم الحذف', 'تم حذف العرض بنجاح', 'success');
            }
        });
    },

    // Paper Types Management
    loadPaperTypes() {
        const stored = localStorage.getItem('ah_paperTypes');
        if (stored) {
            const paperTypes = JSON.parse(stored);
            // Migrate old format to new format if needed
            return paperTypes.map(paper => {
                if (!paper.baseSize) {
                    // Old format: parse size string or use default
                    const defaultSize = { width: 70, height: 100 };
                    if (paper.size && paper.size.includes('×')) {
                        const parts = paper.size.split('×');
                        if (parts.length === 2) {
                            const width = parseFloat(parts[0].trim());
                            const height = parseFloat(parts[1].trim().split(' ')[0]);
                            if (!isNaN(width) && !isNaN(height)) {
                                paper.baseSize = { width, height };
                            } else {
                                paper.baseSize = defaultSize;
                            }
                        } else {
                            paper.baseSize = defaultSize;
                        }
                    } else {
                        paper.baseSize = defaultSize;
                    }
                }
                return paper;
            });
        }
        // Default paper types - comprehensive list
        const defaultPaperTypes = [
            // ورق عادي
            { id: 1, name: 'ورق 60 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 2, name: 'ورق 70 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 3, name: 'ورق 80 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 4, name: 'ورق 100 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 5, name: 'ورق 120 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            
            // ورق كوشية
            { id: 6, name: 'ورق كوشية 90 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 7, name: 'ورق كوشية 115 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 8, name: 'ورق كوشية 130 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 9, name: 'ورق كوشية 150 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 10, name: 'ورق كوشية 170 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 11, name: 'ورق كوشية 200 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 12, name: 'ورق كوشية 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 13, name: 'ورق كوشية 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 14, name: 'ورق كوشية 350 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            
            // أستيكر
            { id: 15, name: 'أستيكر ورق', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 16, name: 'أستيكر ورق جاك', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 17, name: 'أستيكر جاك بلاستيك شفاف', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 18, name: 'أستيكر جاك بلاستيك أبيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            
            // برستول كوشية
            { id: 19, name: 'برستول كوشية 230 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 20, name: 'برستول كوشية 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 21, name: 'برستول كوشية 270 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 22, name: 'برستول كوشية 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 23, name: 'برستول كوشية 350 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            
            // برستول الوان مخرفش (غلاف الدفاتر)
            { id: 24, name: 'برستول الوان مخرفش ( غلاف الدفاتر ) 140 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 25, name: 'برستول الوان مخرفش ( غلاف الدفاتر ) 200 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 26, name: 'برستول الوان مخرفش ( غلاف الدفاتر ) 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 27, name: 'برستول الوان مخرفش ( غلاف الدفاتر ) 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            
            // ورق كرافت
            { id: 28, name: 'ورق كرافت مصرى 80 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 29, name: 'ورق كرافت مصرى 100 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 30, name: 'ورق كرافت مستورد 90 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 31, name: 'ورق كرافت مستورد 110 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 32, name: 'كرافت بنى كرتون 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            
            // ورق كونكورد
            { id: 33, name: 'ورق كونكورد أبيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 34, name: 'ورق كونكورد بيج', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            
            // ورق دوبلكس
            { id: 35, name: 'ورق دوبلكس هندى 200 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 36, name: 'ورق دوبلكس هندي 220 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 37, name: 'ورق دوبلكس سعودي 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 38, name: 'ورق دوبلكس سعودي 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 39, name: 'ورق دوبلكس سعودى 350 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 40, name: 'ورق دوبلكس مصرى باله 140 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 41, name: 'ورق دوبلكس مصرى باله 180 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            
            // كريستال
            { id: 42, name: 'كريستال أبيض 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 43, name: 'كريستال أوف وايت 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 44, name: 'كريستال ذهبي 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 45, name: 'كريستال أبيض 125 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 46, name: 'كريستال أوف وايت 125 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 47, name: 'كريستال ذهبي 125 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            
            // أنواع خاصة
            { id: 48, name: 'أوبالين أبيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 49, name: 'عجينة ابيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 50, name: 'عجينة كريمي', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 51, name: 'فبريانو ابيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 52, name: 'فبريانو كريمي', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 53, name: 'قماش ابيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 54, name: 'قماش كريمي', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
            { id: 55, name: 'ورق زبدة', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 }
        ];
        
        return defaultPaperTypes;
    },

    savePaperTypes(paperTypes) {
        localStorage.setItem('ah_paperTypes', JSON.stringify(paperTypes));
    },

    renderPaperTypes() {
        const paperTypesList = document.getElementById('paperTypesList');
        if (!paperTypesList) return;

        const paperTypes = this.loadPaperTypes();

        if (paperTypes.length === 0) {
            paperTypesList.innerHTML = '<div class="text-center text-gray-500 py-8">لا توجد أنواع ورق. اضغط على "إضافة نوع ورق جديد" للبدء</div>';
            return;
        }

        paperTypesList.innerHTML = paperTypes.map(paper => `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-300">
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <div class="flex items-center gap-3">
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <i class="fas fa-file-alt text-indigo-600 text-xl"></i>
                            </div>
                            <div>
                                <h5 class="font-bold text-gray-800">${paper.name}</h5>
                                <div class="text-sm text-gray-600 mt-1">
                                    <span>المقاس: ${paper.size}</span>
                                    <span class="mx-2">|</span>
                                    <span class="font-bold text-brandGold">السعر: ${paper.price.toFixed(2)} ج.م للوحة</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2 mr-4">
                        <button onclick="PricingAdmin.editPaperType(${paper.id})" class="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="PricingAdmin.deletePaperType(${paper.id})" class="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    openAddPaperTypeModal(paperTypeId = null) {
        const paperTypes = this.loadPaperTypes();
        const paperType = paperTypeId ? paperTypes.find(p => p.id === paperTypeId) : null;

        Swal.fire({
            title: paperTypeId ? 'تعديل نوع الورق' : 'إضافة نوع ورق جديد',
            html: `
                <div class="text-right space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">اسم نوع الورق</label>
                        <input type="text" id="paperTypeName" value="${paperType?.name || ''}" class="w-full border border-gray-300 p-2 rounded" placeholder="مثال: أوفست 150 جم">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">عرض اللوحة الأساسية (سم)</label>
                            <input type="number" id="paperTypeWidth" step="0.01" value="${paperType?.baseSize?.width || 70}" class="w-full border border-gray-300 p-2 rounded" placeholder="70">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">طول اللوحة الأساسية (سم)</label>
                            <input type="number" id="paperTypeHeight" step="0.01" value="${paperType?.baseSize?.height || 100}" class="w-full border border-gray-300 p-2 rounded" placeholder="100">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">السعر لكل لوحة (ج.م)</label>
                        <input type="number" id="paperTypePrice" step="0.01" value="${paperType?.price || ''}" class="w-full border border-gray-300 p-2 rounded" placeholder="0.00">
                    </div>
                    <p class="text-xs text-gray-500">اللوحة الأساسية هي الحجم الكامل للورقة قبل القطع (افتراضي: 70×100 سم)</p>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#D98618',
            didOpen: () => {
                document.getElementById('paperTypeName').focus();
            },
            preConfirm: () => {
                const name = document.getElementById('paperTypeName').value.trim();
                const width = parseFloat(document.getElementById('paperTypeWidth').value);
                const height = parseFloat(document.getElementById('paperTypeHeight').value);
                const price = parseFloat(document.getElementById('paperTypePrice').value);

                if (!name || !width || !height || !price || price <= 0 || width <= 0 || height <= 0) {
                    Swal.showValidationMessage('يرجى إدخال جميع البيانات بشكل صحيح');
                    return false;
                }

                return {
                    id: paperTypeId || Date.now(),
                    name: name,
                    size: `${width}×${height} سم`, // Keep for display
                    baseSize: { width, height },
                    price: price
                };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                const updatedPaperTypes = paperTypeId 
                    ? paperTypes.map(p => p.id === paperTypeId ? result.value : p)
                    : [...paperTypes, result.value];
                
                this.savePaperTypes(updatedPaperTypes);
                this.renderPaperTypes();
                Swal.fire('تم', paperTypeId ? 'تم تعديل نوع الورق بنجاح' : 'تم إضافة نوع الورق بنجاح', 'success');
            }
        });
    },

    editPaperType(paperTypeId) {
        this.openAddPaperTypeModal(paperTypeId);
    },

    deletePaperType(paperTypeId) {
        Swal.fire({
            title: 'هل أنت متأكد؟',
            text: 'سيتم حذف نوع الورق هذا',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#d33'
        }).then((result) => {
            if (result.isConfirmed) {
                const paperTypes = this.loadPaperTypes();
                const updatedPaperTypes = paperTypes.filter(p => p.id !== paperTypeId);
                this.savePaperTypes(updatedPaperTypes);
                this.renderPaperTypes();
                Swal.fire('تم الحذف', 'تم حذف نوع الورق بنجاح', 'success');
            }
        });
    },

    renderPaperTypesCategory() {
        return `
            <div class="bg-white p-6 rounded-xl border border-gray-200">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-xl font-bold text-gray-800">إدارة أنواع الورق</h4>
                    <div class="flex gap-2">
                        <button onclick="PricingAdmin.initializeDefaultPaperTypes()" class="bg-green-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600 transition">
                            <i class="fas fa-database ml-2"></i> تهيئة أنواع الورق الافتراضية
                        </button>
                        <button onclick="PricingAdmin.openAddPaperTypeModal()" class="bg-brandGold text-white px-4 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition">
                            <i class="fas fa-plus ml-2"></i> إضافة نوع ورق جديد
                        </button>
                    </div>
                </div>
                <p class="text-sm text-gray-600 mb-4">يمكنك إضافة أنواع ورق جديدة أو تعديل الأسعار الموجودة. اضغط على "تهيئة أنواع الورق الافتراضية" لإضافة جميع الأنواع الأساسية.</p>
                <div id="paperTypesList" class="space-y-3 max-h-96 overflow-y-auto">
                    <!-- Paper types will be rendered here -->
                </div>
            </div>
        `;
    },

    // Initialize default paper types (adds all types if not already present)
    initializeDefaultPaperTypes() {
        Swal.fire({
            title: 'تهيئة أنواع الورق',
            text: 'سيتم إضافة جميع أنواع الورق الافتراضية. الأنواع الموجودة لن تتأثر.',
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'نعم، قم بالتهيئة',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#10b981'
        }).then((result) => {
            if (result.isConfirmed) {
                const existingTypes = this.loadPaperTypes();
                
                // Get existing type names to avoid duplicates
                const existingNames = new Set(existingTypes.map(t => t.name));
                
                // Default paper types list
                const defaultPaperTypes = [
                    { name: 'ورق 60 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق 70 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق 80 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق 100 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق 120 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كوشية 90 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كوشية 115 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كوشية 130 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كوشية 150 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كوشية 170 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كوشية 200 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كوشية 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كوشية 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كوشية 350 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'أستيكر ورق', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'أستيكر ورق جاك', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'أستيكر جاك بلاستيك شفاف', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'أستيكر جاك بلاستيك أبيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'برستول كوشية 230 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'برستول كوشية 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'برستول كوشية 270 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'برستول كوشية 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'برستول كوشية 350 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'برستول الوان مخرفش ( غلاف الدفاتر ) 140 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'برستول الوان مخرفش ( غلاف الدفاتر ) 200 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'برستول الوان مخرفش ( غلاف الدفاتر ) 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'برستول الوان مخرفش ( غلاف الدفاتر ) 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كرافت مصرى 80 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كرافت مصرى 100 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كرافت مستورد 90 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كرافت مستورد 110 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'كرافت بنى كرتون 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كونكورد أبيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق كونكورد بيج', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق دوبلكس هندى 200 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق دوبلكس هندي 220 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق دوبلكس سعودي 250 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق دوبلكس سعودي 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق دوبلكس سعودى 350 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق دوبلكس مصرى باله 140 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق دوبلكس مصرى باله 180 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'كريستال أبيض 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'كريستال أوف وايت 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'كريستال ذهبي 300 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'كريستال أبيض 125 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'كريستال أوف وايت 125 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'كريستال ذهبي 125 جرام', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'أوبالين أبيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'عجينة ابيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'عجينة كريمي', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'فبريانو ابيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'فبريانو كريمي', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'قماش ابيض', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'قماش كريمي', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 },
                    { name: 'ورق زبدة', size: '70×100 سم', baseSize: { width: 70, height: 100 }, price: 0 }
                ];
                
                // Find max ID from existing types
                const maxId = existingTypes.length > 0 
                    ? Math.max(...existingTypes.map(t => t.id || 0))
                    : 0;
                
                // Add new types with unique IDs
                let newTypesCount = 0;
                defaultPaperTypes.forEach(defaultType => {
                    if (!existingNames.has(defaultType.name)) {
                        existingTypes.push({
                            ...defaultType,
                            id: maxId + newTypesCount + 1
                        });
                        newTypesCount++;
                    }
                });
                
                this.savePaperTypes(existingTypes);
                this.renderPaperTypes();
                
                Swal.fire({
                    icon: 'success',
                    title: 'تم التهيئة',
                    text: `تم إضافة ${newTypesCount} نوع ورق جديد. يمكنك الآن تعديل الأسعار حسب احتياجاتك.`,
                    timer: 3000,
                    showConfirmButton: false
                });
            }
        });
    },

    // Customer Sources Management
    renderCustomerSourcesCategory() {
        return `
            <div class="bg-white p-6 rounded-xl border border-gray-200">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-xl font-bold text-gray-800">إدارة مصادر العملاء</h4>
                    <button onclick="PricingAdmin.openAddCustomerSourceModal()" class="bg-brandGold text-white px-4 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition">
                        <i class="fas fa-plus ml-2"></i> إضافة مصدر جديد
                    </button>
                </div>
                <p class="text-sm text-gray-600 mb-4">يمكنك تفعيل أو تعطيل المصادر. المصادر المعطلة لن تظهر في نموذج الطلب ولكن الطلبات القديمة ستبقى محفوظة.</p>
                <div id="customerSourcesList" class="space-y-3">
                    <!-- Customer sources will be rendered here -->
                </div>
            </div>
        `;
    },

    renderCustomerSources() {
        const sourcesList = document.getElementById('customerSourcesList');
        if (!sourcesList) return;

        const sources = CustomerSources.loadSources();

        if (sources.length === 0) {
            sourcesList.innerHTML = '<div class="text-center text-gray-500 py-8">لا توجد مصادر. اضغط على "إضافة مصدر جديد" للبدء</div>';
            return;
        }

        sourcesList.innerHTML = sources.map(source => `
            <div class="bg-gray-50 p-4 rounded-lg border border-gray-300">
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <div class="flex items-center gap-3">
                            <div class="bg-white p-3 rounded-lg border border-gray-200">
                                <i class="fas fa-user-friends text-teal-600 text-xl"></i>
                            </div>
                            <div>
                                <h5 class="font-bold text-gray-800">${source.name}</h5>
                                <div class="text-sm text-gray-600 mt-1">
                                    <span class="px-2 py-1 rounded ${source.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}">
                                        ${source.enabled ? 'مفعل' : 'معطل'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-2 mr-4">
                        <button onclick="PricingAdmin.editCustomerSource(${source.id})" class="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="PricingAdmin.toggleCustomerSource(${source.id})" class="bg-${source.enabled ? 'yellow' : 'green'}-500 text-white px-3 py-2 rounded text-sm hover:bg-${source.enabled ? 'yellow' : 'green'}-600 transition">
                            <i class="fas fa-${source.enabled ? 'ban' : 'check'}"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    },

    openAddCustomerSourceModal(sourceId = null) {
        const sources = CustomerSources.loadSources();
        const source = sourceId ? sources.find(s => s.id === sourceId) : null;

        Swal.fire({
            title: sourceId ? 'تعديل المصدر' : 'إضافة مصدر جديد',
            html: `
                <div class="text-right space-y-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">اسم المصدر</label>
                        <input type="text" id="customerSourceName" value="${source?.name || ''}" class="w-full border border-gray-300 p-2 rounded" placeholder="مثال: إعلان فيسبوك">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#D98618',
            didOpen: () => {
                document.getElementById('customerSourceName').focus();
            },
            preConfirm: () => {
                const name = document.getElementById('customerSourceName').value.trim();

                if (!name) {
                    Swal.showValidationMessage('يرجى إدخال اسم المصدر');
                    return false;
                }

                return { name };
            }
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                if (sourceId) {
                    CustomerSources.updateSource(sourceId, result.value.name);
                    Swal.fire('تم', 'تم تعديل المصدر بنجاح', 'success');
                } else {
                    CustomerSources.addSource(result.value.name);
                    Swal.fire('تم', 'تم إضافة المصدر بنجاح', 'success');
                }
                this.renderCustomerSources();
            }
        });
    },

    editCustomerSource(sourceId) {
        this.openAddCustomerSourceModal(sourceId);
    },

    toggleCustomerSource(sourceId) {
        const source = CustomerSources.toggleSource(sourceId);
        if (source) {
            Swal.fire('تم', `تم ${source.enabled ? 'تفعيل' : 'تعطيل'} المصدر بنجاح`, 'success');
            this.renderCustomerSources();
        }
    },

    // Render Shipping Prices Category
    async renderShippingCategory() {
        const db = this._getDb();
        let shippingPrices = {};
        
        // Load shipping prices from Firestore
        try {
            const shippingDoc = await this._getColl(this.COLLECTION_NAME).doc('shipping').get();
            if (shippingDoc.exists) {
                shippingPrices = shippingDoc.data().prices || {};
            }
        } catch (error) {
            console.error('Error loading shipping prices:', error);
        }

        // Get all governorates from Storage
        const governorates = Storage.governorates || [];
        
        // Governorate names in Arabic
        const governorateNames = {
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
        };

        // Default prices (if not set)
        const defaultPrice = (gov) => {
            if (gov === 'Cairo' || gov === 'Giza') return 60;
            return 100;
        };

        let pricesHTML = '';
        governorates.forEach(gov => {
            const currentPrice = shippingPrices[gov] || defaultPrice(gov);
            const arabicName = governorateNames[gov] || gov;
            pricesHTML += `
                <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-bold text-gray-800">${arabicName}</h4>
                            <p class="text-xs text-gray-500">${gov}</p>
                        </div>
                        <div class="flex items-center gap-3">
                            <input 
                                type="number" 
                                id="shippingPrice_${gov}" 
                                value="${currentPrice}" 
                                min="0" 
                                step="1"
                                class="w-24 border border-gray-300 p-2 rounded-lg text-center font-bold text-brandGold focus:border-brandGold focus:ring-1 focus:ring-brandGold outline-none"
                            />
                            <span class="text-gray-600 font-semibold">ج.م</span>
                        </div>
                    </div>
                </div>
            `;
        });

        return `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold text-gray-900">أسعار الشحن للمحافظات</h3>
                        <button onclick="PricingAdmin.saveShippingPrices()" class="bg-brandGold text-white px-6 py-2 rounded-lg hover:bg-brandGoldDark transition font-semibold">
                            <i class="fas fa-save ml-2"></i>حفظ التغييرات
                        </button>
                    </div>
                    <p class="text-gray-600 text-sm mb-6">قم بتحديد سعر الشحن لكل محافظة. السعر الافتراضي: القاهرة والجيزة 60 ج.م، باقي المحافظات 100 ج.م</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2">
                        ${pricesHTML}
                    </div>
                </div>
            </div>
        `;
    },

    // Save Shipping Prices
    async saveShippingPrices() {
        const db = this._getDb();
        const governorates = Storage.governorates || [];
        const shippingPrices = {};
        
        // Collect all prices
        governorates.forEach(gov => {
            const input = document.getElementById(`shippingPrice_${gov}`);
            if (input) {
                const price = parseFloat(input.value) || 0;
                if (price >= 0) {
                    shippingPrices[gov] = price;
                }
            }
        });

        try {
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('shipping').set({
                prices: shippingPrices,
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // Update cache
            this._configCache['shipping'] = { prices: shippingPrices };

            Swal.fire({
                icon: 'success',
                title: 'تم الحفظ',
                text: 'تم حفظ أسعار الشحن بنجاح',
                timer: 2000,
                showConfirmButton: false
            });

            // Reload to show updated prices
            this.render('Shipping');
        } catch (error) {
            console.error('Error saving shipping prices:', error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'فشل حفظ أسعار الشحن. يرجى المحاولة مرة أخرى.'
            });
        }
    },
    
    // Toggle price info display
    togglePriceInfo(priceType, index) {
        const infoDiv = document.getElementById(`priceInfo_${priceType}_${index}`);
        if (infoDiv) {
            if (infoDiv.classList.contains('hidden')) {
                infoDiv.classList.remove('hidden');
            } else {
                infoDiv.classList.add('hidden');
            }
        }
    },
    
    // Open addition pricing modal
    openAdditionPricingModal(additionType, additionName, hasForm = false) {
        // Perforation is now unified (not per machine), so don't open modal
        if (additionType === 'perforation') {
            Swal.fire('معلومة', 'سعر التخريم موحد لجميع الآلات. يمكنك تعديله من قسم "أسعار الإضافات العامة"', 'info');
            return;
        }
        
        // Load current config if cache is empty
        if (!this._configCache?.offset) {
            this.loadOffsetConfig().then(() => {
                this.openAdditionPricingModal(additionType, additionName, hasForm);
            });
            return;
        }
        
        const offsetConfig = this._configCache.offset || {};
        let machines = offsetConfig.machines || [];
        
        // If machines array is empty, try to load from current form
        if (machines.length === 0) {
            const machineInputs = document.querySelectorAll('[id^="machineName_"]');
            machineInputs.forEach((input, index) => {
                const name = document.getElementById(`machineName_${index}`)?.value;
                const width = parseFloat(document.getElementById(`machineWidth_${index}`)?.value || 0);
                const height = parseFloat(document.getElementById(`machineHeight_${index}`)?.value || 0);
                const oneColorCost = parseFloat(document.getElementById(`machineOneColorCost_${index}`)?.value || 0);
                const fourColorCost = parseFloat(document.getElementById(`machineFourColorCost_${index}`)?.value || 0);
                
                if (name && width && height && (oneColorCost || fourColorCost)) {
                    machines.push({
                        name: name,
                        size: { width: width, height: height },
                        cost: oneColorCost,
                        oneColorCost: oneColorCost,
                        fourColorCost: fourColorCost
                    });
                }
            });
        }
        
        if (machines.length === 0) {
            Swal.fire('تنبيه', 'يرجى إضافة آلات الطباعة أولاً', 'warning');
            return;
        }
        
        // Get current prices
        const currentPrices = {};
        const currentFormPrices = {};
        const priceKey = `machine${additionType.charAt(0).toUpperCase() + additionType.slice(1)}Price`;
        machines.forEach((machine, index) => {
            currentPrices[index] = machine[priceKey] || 0;
            if (hasForm) {
                currentFormPrices[index] = machine[`${additionType}FormPrice`] || offsetConfig.additions?.formPrice || 0;
            }
        });
        
        // Create modal content
        let modalContent = `
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div class="bg-brandBlack p-4 px-6 flex justify-between items-center sticky top-0 z-10">
                    <h3 class="text-white font-bold text-lg">تسعير ${additionName}</h3>
                    <button onclick="PricingAdmin.closeAdditionPricingModal()" class="text-gray-400 hover:text-white transition">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6">
                    <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p class="text-sm text-blue-800">
                            <i class="fas fa-info-circle ml-2"></i>
                            <strong>ملاحظة:</strong> أدخل سعر ${additionName} لكل آلة (ج.م لكل 1000 ورقة)
                            ${hasForm ? ' + سعر الفورمة (ج.م لكل سنتيمتر مربع)' : ''}
                        </p>
                    </div>
                    <div class="space-y-4">
                        ${machines.map((machine, index) => `
                            <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h5 class="font-bold text-gray-800 mb-3">${machine.name}</h5>
                                <div class="grid grid-cols-1 ${hasForm ? 'md:grid-cols-2' : ''} gap-4">
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-1">سعر ${additionName} (ج.م/1000 ورقة)</label>
                                        <input type="number" id="modal_${additionType}_price_${index}" step="0.01" value="${currentPrices[index]}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                                    </div>
                                    ${hasForm ? `
                                    <div>
                                        <label class="block text-sm font-bold text-gray-700 mb-1">سعر الفورمة (ج.م/سم²)</label>
                                        <input type="number" id="modal_${additionType}_form_${index}" step="0.01" value="${currentFormPrices[index] || 0}" class="w-full border border-gray-300 p-3 rounded-xl focus:border-brandGold outline-none">
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${hasForm ? `
                    <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p class="text-xs text-yellow-800">
                            <i class="fas fa-exclamation-triangle ml-2"></i>
                            <strong>ملاحظة:</strong> إذا كانت أسعار الفورمة مختلفة لكل آلة، أدخلها في الحقول أعلاه. إذا كانت موحدة، سيتم استخدام السعر الموحد من قسم "أسعار الإضافات العامة"
                        </p>
                    </div>
                    ` : ''}
                    <div class="flex gap-3 mt-6">
                        <button type="button" onclick="PricingAdmin.closeAdditionPricingModal()" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition">
                            إلغاء
                        </button>
                        <button type="button" onclick="PricingAdmin.saveAdditionPricing('${additionType}', ${hasForm})" class="flex-1 bg-brandGold text-white py-3 rounded-xl font-bold hover:bg-brandGoldDark transition">
                            حفظ
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Create or update modal
        let modal = document.getElementById('additionPricingModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'additionPricingModal';
            modal.className = 'fixed inset-0 z-50 hidden-section bg-black/70 backdrop-blur-sm flex items-center justify-center p-4';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = modalContent;
        modal.classList.remove('hidden-section');
        modal.style.display = 'flex';
    },
    
    // Close addition pricing modal
    closeAdditionPricingModal() {
        const modal = document.getElementById('additionPricingModal');
        if (modal) {
            modal.classList.add('hidden-section');
            modal.style.display = 'none';
        }
    },
    
    // Save addition pricing
    async saveAdditionPricing(additionType, hasForm = false) {
        // Ensure cache exists and load current config if needed
        if (!this._configCache) {
            this._configCache = {};
        }
        if (!this._configCache.offset) {
            await this.loadOffsetConfig();
        }
        
        const offsetConfig = this._configCache.offset || { machines: [], additions: {} };
        let machines = offsetConfig.machines || [];
        
        // If machines array is empty, try to load from current form
        if (machines.length === 0) {
            const machineInputs = document.querySelectorAll('[id^="machineName_"]');
            machineInputs.forEach((input, index) => {
                const name = document.getElementById(`machineName_${index}`)?.value;
                const width = parseFloat(document.getElementById(`machineWidth_${index}`)?.value || 0);
                const height = parseFloat(document.getElementById(`machineHeight_${index}`)?.value || 0);
                const oneColorCost = parseFloat(document.getElementById(`machineOneColorCost_${index}`)?.value || 0);
                const fourColorCost = parseFloat(document.getElementById(`machineFourColorCost_${index}`)?.value || 0);
                
                if (name && width && height && (oneColorCost || fourColorCost)) {
                    machines.push({
                        name: name,
                        size: { width: width, height: height },
                        cost: oneColorCost,
                        oneColorCost: oneColorCost,
                        fourColorCost: fourColorCost
                    });
                }
            });
        }
        
        // For dieCutting, the field should be dieCuttingPrice (not machineDieCuttingPrice)
        // For other additions, use the standard format
        let priceKey;
        if (additionType === 'dieCutting') {
            priceKey = 'dieCuttingPrice';
        } else if (additionType === 'embossing') {
            priceKey = 'embossingPrice';
        } else if (additionType === 'debossing') {
            priceKey = 'debossingPrice';
        } else if (additionType === 'creasing') {
            priceKey = 'creasingPrice';
        } else if (additionType === 'perforation') {
            // Perforation is now unified (not per machine), skip it
            Swal.fire('معلومة', 'سعر التخريم موحد لجميع الآلات. يمكنك تعديله من قسم "أسعار الإضافات العامة"', 'info');
            return;
        } else if (additionType === 'specialColor') {
            priceKey = 'specialColorPrice';
        } else if (additionType === 'matteCellophane') {
            priceKey = 'matteCellophanePrice';
        } else if (additionType === 'glossyCellophane') {
            priceKey = 'glossyCellophanePrice';
        } else {
            priceKey = `machine${additionType.charAt(0).toUpperCase() + additionType.slice(1)}Price`;
        }
        
        // Update prices in cache
        machines.forEach((machine, index) => {
            const priceInput = document.getElementById(`modal_${additionType}_price_${index}`);
            if (priceInput) {
                const priceValue = parseFloat(priceInput.value || 0);
                machine[priceKey] = priceValue;
                console.log(`Setting ${priceKey} for machine ${machine.name || index}: ${priceValue}`);
            }
            
            // Update form price if hasForm (store per machine)
            if (hasForm) {
                const formInput = document.getElementById(`modal_${additionType}_form_${index}`);
                if (formInput) {
                    const formPrice = parseFloat(formInput.value || 0);
                    machine[`${additionType}FormPrice`] = formPrice;
                }
            }
        });
        
        // Update general form price if hasForm (use first machine's form price as default if all are same)
        if (hasForm && machines.length > 0) {
            const firstFormInput = document.getElementById(`modal_${additionType}_form_0`);
            if (firstFormInput) {
                offsetConfig.additions = offsetConfig.additions || {};
                const firstFormPrice = parseFloat(firstFormInput.value || 0);
                // Check if all form prices are the same
                let allSame = true;
                for (let i = 1; i < machines.length; i++) {
                    const formInput = document.getElementById(`modal_${additionType}_form_${i}`);
                    if (formInput && parseFloat(formInput.value || 0) !== firstFormPrice) {
                        allSame = false;
                        break;
                    }
                }
                // Only set general form price if all are the same
                if (allSame && firstFormPrice > 0) {
                    offsetConfig.additions.formPrice = firstFormPrice;
                }
            }
        }
        
        // Update cache
        offsetConfig.machines = machines;
        this._configCache.offset = offsetConfig;
        
        // Debug: log saved prices
        console.log(`Saved ${additionType} prices:`, machines.map(m => ({
            name: m.name,
            price: m[priceKey],
            formPrice: hasForm ? m[`${additionType}FormPrice`] : undefined
        })));
        
        // Save to Firestore immediately to persist changes
        try {
            const db = this._getDb();
            if (!db) {
                throw new Error('Database not available');
            }
            
            // Load current config first to preserve other settings (cutting, colors, etc.)
            const currentConfig = await this.loadOffsetConfig();
            
            // Ensure machines array exists
            const currentMachines = currentConfig.machines || [];
            
            // Update machines: merge current machines with updated prices
            const finalMachines = currentMachines.map((currentMachine, index) => {
                const updatedMachine = machines[index];
                
                // If we have an updated machine, merge the prices
                if (updatedMachine) {
                    const mergedMachine = { ...currentMachine };
                    
                    // Update the specific addition price (use same priceKey logic as above)
                    let priceKey;
                    if (additionType === 'dieCutting') {
                        priceKey = 'dieCuttingPrice';
                    } else if (additionType === 'embossing') {
                        priceKey = 'embossingPrice';
                    } else if (additionType === 'debossing') {
                        priceKey = 'debossingPrice';
                    } else if (additionType === 'creasing') {
                        priceKey = 'creasingPrice';
                    } else if (additionType === 'perforation') {
                        // Perforation is now unified (not per machine), return current machine as is
                        return currentMachine;
                    } else if (additionType === 'specialColor') {
                        priceKey = 'specialColorPrice';
                    } else if (additionType === 'matteCellophane') {
                        priceKey = 'matteCellophanePrice';
                    } else if (additionType === 'glossyCellophane') {
                        priceKey = 'glossyCellophanePrice';
                    } else {
                        priceKey = `machine${additionType.charAt(0).toUpperCase() + additionType.slice(1)}Price`;
                    }
                    
                    // Get price from updated machine (it should be set in the cache)
                    const newPrice = updatedMachine[priceKey];
                    if (newPrice !== undefined && newPrice !== null) {
                        mergedMachine[priceKey] = newPrice;
                        console.log(`Merging ${priceKey} for ${mergedMachine.name}: ${newPrice}`);
                    } else {
                        // Fallback: try to get from input directly
                        const priceInput = document.getElementById(`modal_${additionType}_price_${index}`);
                        if (priceInput) {
                            const priceValue = parseFloat(priceInput.value || 0);
                            mergedMachine[priceKey] = priceValue;
                            console.log(`Fallback: Setting ${priceKey} for ${mergedMachine.name} from input: ${priceValue}`);
                        }
                    }
                    
                    // Update form price if hasForm
                    if (hasForm) {
                        const formPriceKey = `${additionType}FormPrice`;
                        const newFormPrice = updatedMachine[formPriceKey];
                        if (newFormPrice !== undefined && newFormPrice !== null) {
                            mergedMachine[formPriceKey] = newFormPrice;
                        } else {
                            // Fallback: try to get from input directly
                            const formInput = document.getElementById(`modal_${additionType}_form_${index}`);
                            if (formInput) {
                                mergedMachine[formPriceKey] = parseFloat(formInput.value || 0);
                            }
                        }
                    }
                    
                    return mergedMachine;
                }
                
                // If no updated machine, keep current
                return currentMachine;
            });
            
            // If we have new machines that don't exist in current config, add them
            if (machines.length > currentMachines.length) {
                for (let i = currentMachines.length; i < machines.length; i++) {
                    finalMachines.push(machines[i]);
                }
            }
            
            const finalConfig = {
                ...currentConfig,
                machines: finalMachines,
                additions: {
                    ...currentConfig.additions,
                    ...offsetConfig.additions
                }
            };
            
            await this._getColl(this.COLLECTION_NAME).doc('offset').set(finalConfig);
            // Update cache with final config
            this._configCache.offset = finalConfig;
        } catch (error) {
            console.error('Error saving addition pricing to Firestore:', error);
            console.error('Error details:', error.message, error.stack);
            Swal.fire('تحذير', `تم حفظ الأسعار في الذاكرة المؤقتة، لكن فشل الحفظ في قاعدة البيانات: ${error.message}. يرجى حفظ إعدادات الأوفست مرة أخرى.`, 'warning');
            return;
        }
        
        // Close modal
        this.closeAdditionPricingModal();
        
        Swal.fire('تم', `تم حفظ أسعار ${this.getAdditionArabicName(additionType)} بنجاح`, 'success');
    },
    
    // Render pricing mode selection
    // UNIFIED Product Category Renderer - Works for ALL categories
    // This function replaces all category-specific rendering methods
    async renderUnifiedProductCategory(category, pricingMode) {
        if (typeof PricingService === 'undefined') {
            return '<div class="text-red-600">خطأ: وحدة PricingService غير متاحة</div>';
        }
        
        const db = this._getDb();
        let products = [];

        // STEP 1: Load products from Firestore (SINGLE SOURCE OF TRUTH)
        // Try multiple collection strategies for backward compatibility
        
        // Strategy 1: Category-specific module (Outdoor, Indoor, Envelopes, UVPrinting, Tableaux, DTF)
        const categoryProductLoaders = {
            'Outdoor': async () => {
                if (typeof Outdoor === 'undefined') return [];
        await Outdoor.initialize();
                return await Outdoor.getProducts();
            },
            'Indoor': async () => {
                if (typeof Outdoor === 'undefined') return [];
                await Outdoor.initialize();
                const allProducts = await Outdoor.getProducts();
                return allProducts.filter(p => [4, 19, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(parseInt(p.id) || p.id));
            },
            'Envelopes': async () => (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.getAllProducts ? EnvelopesPricing.getAllProducts() : (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.PRODUCTS ? EnvelopesPricing.PRODUCTS.map(p => ({ id: p.id, name: p.nameAr, unit: p.unit || 'tier' })) : [])),
            'envelopes': async () => (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.getAllProducts ? EnvelopesPricing.getAllProducts() : []),
            'UVPrinting': async () => [{ id: 'area_base', name: 'سعر المرجعي 60×90 سم', unit: 'fixed' }],
            'Tableaux': async () => (typeof TableauPricing !== 'undefined' ? TableauPricing.SIZES.map(p => ({ id: p.id, name: p.nameAr, unit: p.unit || 'fixed' })) : []),
            'DTF': async () => [{ id: 'meter', name: 'سعر المتر (عرض ثابت 60 سم)', unit: 'meter' }],
            'Flag': async () => {
                const fixed = (typeof FlagsPricing !== 'undefined' && FlagsPricing.FIXED_PRODUCTS) ? FlagsPricing.FIXED_PRODUCTS : [];
                const trigal = { id: 'trigal_meter', name: 'ستان ترجال (حسب المقاس — طول × عرض × سعر/م²)', unit: 'sqm' };
                return [...fixed.map(p => ({ id: p.id, name: p.nameAr, unit: p.unit || 'fixed' })), trigal];
            },
            'TShirt': async () => {
                const base = (typeof TShirtPricing !== 'undefined' && TShirtPricing.BASE_PRODUCTS) ? TShirtPricing.BASE_PRODUCTS : [];
                const printing = (typeof TShirtPricing !== 'undefined' && TShirtPricing.PRINTING_OPTIONS) ? TShirtPricing.PRINTING_OPTIONS : [];
                const pressing = (typeof TShirtPricing !== 'undefined' && TShirtPricing.PRESSING_OPTIONS) ? TShirtPricing.PRESSING_OPTIONS : [];
                return [
                    ...base.map(p => ({ id: p.id, name: p.nameAr, unit: p.unit || 'fixed', section: 'base' })),
                    ...printing.map(p => ({ id: p.id, name: p.nameAr, unit: p.unit || 'fixed', section: 'printing' })),
                    ...pressing.map(p => ({ id: p.id, name: p.nameAr, unit: p.unit || 'fixed', section: 'pressing' }))
                ];
            },
            'FabricBag': async () => {
                return (typeof FabricBagPricing !== 'undefined' && FabricBagPricing.getAllProducts)
                    ? FabricBagPricing.getAllProducts()
                    : [];
            },
            'IDCard': async () => {
                return (typeof IDCardPricing !== 'undefined' && IDCardPricing.getAllProducts)
                    ? IDCardPricing.getAllProducts()
                    : [];
            },
            'ZikrMedal': async () => {
                return (typeof ZikrMedalPricing !== 'undefined' && ZikrMedalPricing.getAllProducts)
                    ? ZikrMedalPricing.getAllProducts()
                    : [];
            },
            'SublimationGift': async () => {
                return (typeof SublimationGiftPricing !== 'undefined' && SublimationGiftPricing.getAllProducts)
                    ? SublimationGiftPricing.getAllProducts()
                    : [];
            },
            'promotional_gifts': async () => {
                return (typeof PromotionalGiftsPricing !== 'undefined' && PromotionalGiftsPricing.getAllProducts)
                    ? PromotionalGiftsPricing.getAllProducts()
                    : [];
            },
            'ruler_frames': async () => {
                return (typeof RulerFramesPricing !== 'undefined' && RulerFramesPricing.getAllProducts)
                    ? RulerFramesPricing.getAllProducts()
                    : [];
            },
            'shipping_flyers_clear_bags': async () => {
                return (typeof ShippingFlyersClearBagsPricing !== 'undefined' && ShippingFlyersClearBagsPricing.getAllProducts)
                    ? ShippingFlyersClearBagsPricing.getAllProducts()
                    : [];
            },
            'plastic_bags': async () => {
                return (typeof PlasticBagsPricing !== 'undefined' && PlasticBagsPricing.getAllProducts)
                    ? PlasticBagsPricing.getAllProducts()
                    : [];
            },
            'inkjet_paper_printing': async () => {
                return (typeof InkjetPaperPrintingPricing !== 'undefined' && InkjetPaperPrintingPricing.getAllProducts)
                    ? InkjetPaperPrintingPricing.getAllProducts()
                    : [];
            },
            'safety_printing': async () => {
                return (typeof SafetyPrintingPricing !== 'undefined' && SafetyPrintingPricing.getAllProducts)
                    ? SafetyPrintingPricing.getAllProducts()
                    : [];
            },
            'digital_printing': async () => {
                return (typeof DigitalPrintingPricing !== 'undefined' && DigitalPrintingPricing.getAllProducts)
                    ? DigitalPrintingPricing.getAllProducts()
                    : [];
            },
            'paper_bags': async () => {
                return (typeof PaperBagsPricing !== 'undefined' && PaperBagsPricing.getAllProducts)
                    ? PaperBagsPricing.getAllProducts()
                    : [];
            },
            'brochures': async () => {
                return (typeof BrochuresPricing !== 'undefined' && BrochuresPricing.getAllProducts)
                    ? BrochuresPricing.getAllProducts()
                    : [];
            },
            'catalogs': async () => {
                return (typeof CatalogsPricing !== 'undefined' && CatalogsPricing.getAllProducts)
                    ? CatalogsPricing.getAllProducts()
                    : [];
            },
            'acrylic_badge': async () => {
                return (typeof AcrylicBadgePricing !== 'undefined' && AcrylicBadgePricing.getAllProducts)
                    ? AcrylicBadgePricing.getAllProducts()
                    : [];
            },
            'card_rosary': async () => {
                return (typeof CardRosaryPricing !== 'undefined' && CardRosaryPricing.getAllProducts)
                    ? CardRosaryPricing.getAllProducts()
                    : [];
            },
            'annual_ads': async () => {
                return (typeof AnnualAdsPricing !== 'undefined' && AnnualAdsPricing.getAllProducts)
                    ? AnnualAdsPricing.getAllProducts()
                    : [];
            },
            'cup_quran_bags': async () => {
                return (typeof CupQuranBagsPricing !== 'undefined' && CupQuranBagsPricing.getAllProducts)
                    ? CupQuranBagsPricing.getAllProducts()
                    : [];
            },
            'boxes': async () => {
                return (typeof BoxesPricing !== 'undefined' && BoxesPricing.getAllProducts)
                    ? BoxesPricing.getAllProducts()
                    : [];
            }
        };

        // Try category-specific loader first
        if (categoryProductLoaders[category]) {
            try {
                products = await categoryProductLoaders[category]();
                console.log(`✅ [${category}] Loaded ${products.length} products from category-specific loader`);
            } catch (error) {
                console.error(`❌ [${category}] Error loading from category-specific loader:`, error);
            }
        }

        // Strategy 2: Category-specific collection (e.g., outdoor_products, stand_products)
        if (products.length === 0) {
            const categoryCollectionMap = {
                'Outdoor': 'outdoor_products',
                'Indoor': 'outdoor_products', // Indoor uses outdoor_products collection
                'Stand': 'stand_products',
                'Seal': 'seal_products',
                'BusinessCard': 'business_card_products',
                'Tableau': 'tableau_products',
                'DTF': 'dtf_products',
                'DTFUV': 'dtf_uv_products',
                'Flag': 'flag_products',
                'TShirt': 'tshirt_products',
                'FabricBag': 'fabric_bag_products',
                'IDCard': 'id_card_products',
                'ZikrMedal': 'zikr_medal_products',
                'SublimationGift': 'sublimation_gift_products',
                'PromotionalGift': 'promotional_gift_products',
                'RulerFrame': 'ruler_frame_products',
                'ShippingFlyer': 'shipping_flyer_products',
                'PlasticBag': 'plastic_bag_products',
                'InkjetPaper': 'inkjet_paper_products',
                'promotional_gifts': 'promotional_gift_products',
                'ruler_frames': 'ruler_frame_products',
                'shipping_flyers_clear_bags': 'shipping_flyer_products',
                'plastic_bags': 'plastic_bag_products',
                'inkjet_paper_printing': 'inkjet_paper_products',
                'safety_printing': 'safety_printing_products',
                'SafetyPrinting': 'safety_printing_products',
                'Envelopes': 'envelope_products',
                'UVPrinting': 'uv_printing_products',
                'Tableaux': 'tableaux_products',
                'Notebooks': 'notebook_products'
            };

            const collectionName = categoryCollectionMap[category];
            if (collectionName) {
                try {
                    const snapshot = await this._getColl(collectionName).get();
                    if (!snapshot.empty) {
                        products = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        console.log(`✅ [${category}] Loaded ${products.length} products from collection: ${collectionName}`);
                    } else {
                        console.log(`⚠️ [${category}] Collection ${collectionName} is empty`);
                    }
                } catch (error) {
                    console.error(`❌ [${category}] Error loading from collection ${collectionName}:`, error);
                }
            }
        }

        // Strategy 3: Unified products collection filtered by categoryId
        if (products.length === 0) {
            try {
                const snapshot = await this._getColl('products')
                    .where('categoryId', '==', category)
                    .get();
                if (!snapshot.empty) {
                    products = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    console.log(`✅ [${category}] Loaded ${products.length} products from unified products collection`);
                } else {
                    console.log(`⚠️ [${category}] No products found in unified products collection with categoryId=${category}`);
                }
            } catch (error) {
                console.error(`❌ [${category}] Error loading from unified products collection:`, error);
            }
        }

        // Strategy 4: Hardcoded products fallback (for categories with fixed product lists)
        if (products.length === 0) {
            const hardcodedProducts = {
                'Flag': (typeof FlagsPricing !== 'undefined' ? [
                    ...(FlagsPricing.FIXED_PRODUCTS || []).map(p => ({ id: p.id, name: p.nameAr, unit: p.unit || 'fixed' })),
                    { id: 'trigal_meter', name: 'ستان ترجال (حسب المقاس — طول × عرض × سعر/م²)', unit: 'sqm' }
                ] : [
                    { id: 'flag_2.5_feather', name: 'علم 2.5 متر (ريشة)', unit: 'fixed' },
                    { id: 'stand_only_2.5_feather', name: 'ستان فقط 2.5 متر (ريشة)', unit: 'fixed' },
                    { id: 'flag_4_feather', name: 'علم 4 متر (ريشة)', unit: 'fixed' },
                    { id: 'stand_only_4_feather', name: 'ستان فقط 4 متر (ريشة)', unit: 'fixed' },
                    { id: 'flag_pole', name: 'علم سارى', unit: 'fixed' },
                    { id: 'flag_wave', name: 'علم تلويح', unit: 'fixed' },
                    { id: 'flag_desk_single', name: 'علم مكتب فردى', unit: 'fixed' },
                    { id: 'flag_desk_double', name: 'علم مكتب مجوز', unit: 'fixed' },
                    { id: 'flag_desk_large', name: 'علم مكتب كبير', unit: 'fixed' },
                    { id: 'base_feather_only', name: 'قاعدة علم ريشة فقط', unit: 'fixed' },
                    { id: 'pole_feather_only', name: 'سارى علم ريشة فقط', unit: 'fixed' },
                    { id: 'trigal_meter', name: 'ستان ترجال (حسب المقاس)', unit: 'sqm' }
                ]),
                'Seal': [
                    { id: 'automaticMachine', name: 'ماكينة اتوماتيك', unit: 'fixed' },
                    { id: 'woodenHand', name: 'يد خشب', unit: 'fixed' },
                    { id: 'sealOnly', name: 'سريل فقط', unit: 'fixed' },
                    { id: 'cliché', name: 'كلشية', unit: 'sqm' }
                ],
                'BusinessCard': [
                    { id: 'coated_300', name: 'كوشيه 300 جرام', unit: 'fixed' },
                    { id: 'coated_350', name: 'كوشيه 350 جرام', unit: 'fixed' },
                    { id: 'bristol_coated_350', name: 'بريستول كوشيه 350 جرام', unit: 'fixed' },
                    { id: 'lamination', name: 'ورق لامنيش', unit: 'fixed' },
                    { id: 'laser', name: 'ورق ليزري', unit: 'fixed' },
                    { id: 'crystal', name: 'ورق كريستال', unit: 'fixed' },
                    { id: 'italian', name: 'ورق إيطالي', unit: 'fixed' }
                ],
                'Tableau': [
                    { id: '20x30_straight', name: 'تابلوة 20×30 (خشب عدل)', unit: 'fixed' },
                    { id: '20x30_beveled', name: 'تابلوة 20×30 (خشب مشطوف)', unit: 'fixed' },
                    { id: '30x40_straight', name: 'تابلوة 30×40 (خشب عدل)', unit: 'fixed' },
                    { id: '30x40_beveled', name: 'تابلوة 30×40 (خشب مشطوف)', unit: 'fixed' },
                    { id: '40x50_straight', name: 'تابلوة 40×50 (خشب عدل)', unit: 'fixed' },
                    { id: '40x50_beveled', name: 'تابلوة 40×50 (خشب مشطوف)', unit: 'fixed' },
                    { id: '50x60_straight', name: 'تابلوة 50×60 (خشب عدل)', unit: 'fixed' },
                    { id: '50x60_beveled', name: 'تابلوة 50×60 (خشب مشطوف)', unit: 'fixed' },
                    { id: '50x70_straight', name: 'تابلوة 50×70 (خشب عدل)', unit: 'fixed' },
                    { id: '50x70_beveled', name: 'تابلوة 50×70 (خشب مشطوف)', unit: 'fixed' }
                ],
                'DTFUV': [
                    { id: 'dtf_uv_printing', name: 'طباعة DTF UV (حسب المتر)', unit: 'meter' }
                ],
                'Stand': [
                    { id: 'rollUp_banner', name: 'رول اب بانر', unit: 'fixed' },
                    { id: 'rollUp_glossy', name: 'رول اب جلوسى', unit: 'fixed' },
                    { id: 'xBanner_banner', name: 'اكس بانر بانر', unit: 'fixed' },
                    { id: 'xBanner_glossy', name: 'اكس بانر جلوسى', unit: 'fixed' },
                    { id: 'popUp', name: 'بوب اب', unit: 'fixed' }
                ],
                'TShirt': (typeof TShirtPricing !== 'undefined' ? [
                    ...(TShirtPricing.BASE_PRODUCTS || []).map(p => ({ id: p.id, name: p.nameAr, unit: 'fixed' })),
                    ...(TShirtPricing.PRINTING_OPTIONS || []).map(p => ({ id: p.id, name: p.nameAr, unit: 'fixed' })),
                    ...(TShirtPricing.PRESSING_OPTIONS || []).map(p => ({ id: p.id, name: p.nameAr, unit: 'fixed' }))
                ] : [
                    { id: 'basic_short', name: 'تيشرت بيزك نص كم', unit: 'fixed' },
                    { id: 'basic_long', name: 'تيشرت بيزك كم طويل', unit: 'fixed' },
                    { id: 'polo_short', name: 'تيشرت بولو نص كم', unit: 'fixed' },
                    { id: 'polo_long', name: 'تيشرت بولو كم طويل', unit: 'fixed' },
                    { id: 'hoodie_local', name: 'هودي محلي', unit: 'fixed' },
                    { id: 'hoodie_imported', name: 'هودي مستورد', unit: 'fixed' },
                    { id: 'printing_one_side', name: 'طباعة وجه واحد', unit: 'fixed' },
                    { id: 'printing_front_back', name: 'طباعة وجهين', unit: 'fixed' },
                    { id: 'pressing_one_side', name: 'كبس وجه واحد', unit: 'fixed' },
                    { id: 'pressing_two_sides', name: 'كبس وجهين', unit: 'fixed' }
                ]),
                'FabricBag': (typeof FabricBagPricing !== 'undefined' && FabricBagPricing.getAllProducts)
                    ? FabricBagPricing.getAllProducts()
                    : [
                        { id: '16x22', name: 'شنطة 16×22 سم', unit: 'fixed' },
                        { id: '20x25', name: 'شنطة 20×25 سم', unit: 'fixed' },
                        { id: '25x30', name: 'شنطة 25×30 سم', unit: 'fixed' },
                        { id: '30x35', name: 'شنطة 30×35 سم', unit: 'fixed' },
                        { id: '30x40', name: 'شنطة 30×40 سم', unit: 'fixed' },
                        { id: '35x40', name: 'شنطة 35×40 سم', unit: 'fixed' },
                        { id: '40x40', name: 'شنطة 40×40 سم', unit: 'fixed' },
                        { id: '40x45', name: 'شنطة 40×45 سم', unit: 'fixed' },
                        { id: '40x50', name: 'شنطة 40×50 سم', unit: 'fixed' },
                        { id: '50x50', name: 'شنطة 50×50 سم', unit: 'fixed' },
                        { id: '50x60', name: 'شنطة 50×60 سم', unit: 'fixed' },
                        { id: '60x60', name: 'شنطة 60×60 سم', unit: 'fixed' }
                    ],
                'SublimationGift': (typeof SublimationGiftPricing !== 'undefined' && SublimationGiftPricing.getAllProducts)
                    ? SublimationGiftPricing.getAllProducts()
                    : [
                        { id: 'mug_white_printed', name: 'ماج أبيض (مطبوع)', unit: 'fixed' },
                        { id: 'mug_colored_printed', name: 'ماج ملون (مطبوع)', unit: 'fixed' },
                        { id: 'mug_magic', name: 'ماج سحري', unit: 'fixed' },
                        { id: 'coaster_wood', name: 'كوستر خشب', unit: 'fixed' },
                        { id: 'cap', name: 'كاب', unit: 'fixed' },
                        { id: 'medallion_wood_4x6_single', name: 'مادلية خشب 4×6 وجه واحد', unit: 'fixed' },
                        { id: 'medallion_wood_4x6_double', name: 'مادلية خشب 4×6 وجهين', unit: 'fixed' },
                        { id: 'mouse_pad', name: 'بادة ماوس', unit: 'fixed' },
                        { id: 'puzzle_small', name: 'بازل صغير', unit: 'fixed' },
                        { id: 'puzzle_large', name: 'بازل كبير', unit: 'fixed' },
                        { id: 'sublimation_paper', name: 'ورق سبلميشن', unit: 'fixed' },
                        { id: 'single_press', name: 'كبسة واحدة', unit: 'fixed' }
                    ],
                'PromotionalGift': [
                    { id: 'name_tag_port', name: 'نيم تاج ميناء', unit: 'fixed' },
                    { id: 'name_tag_pin_gold_silver', name: 'نيم تاج (دهبي - فضى) دبوس', unit: 'fixed' },
                    { id: 'name_tag_magnet_gold_silver', name: 'نيم تاج (دهبى - فضى) مغناطيس', unit: 'fixed' },
                    { id: 'medallion_acrylic_shape', name: 'مادلية اكريلك تقطيع أشكال', unit: 'fixed' },
                    { id: 'medallion_wood_shape', name: 'مادلية خشب تقطيع أشكال', unit: 'fixed' },
                    { id: 'coaster_acrylic_felt', name: 'كوستر أكريلك ضهر قطيفة', unit: 'fixed' },
                    { id: 'coaster_acrylic_two_layers', name: 'كوستر أكريلك طبقتين', unit: 'fixed' },
                    { id: 'coaster_wood_laser', name: 'كوستر خشب حفر ليزر', unit: 'fixed' },
                    { id: 'stand_acrylic_a5', name: 'استاند اكريلك A5', unit: 'fixed' },
                    { id: 'stand_acrylic_a4', name: 'استاند اكريلك A4', unit: 'fixed' },
                    { id: 'balloon', name: 'بالونة', unit: 'fixed' },
                    { id: 'keychain', name: 'حظاظات', unit: 'fixed' },
                    { id: 'keychain_pool', name: 'حظاظات حمام سباحة', unit: 'fixed' }
                ],
                'RulerFrame': [
                    { id: 'black_15x20', name: 'برواز مسطرة أسود 15×20', unit: 'fixed' },
                    { id: 'black_20x30', name: 'برواز مسطرة أسود 20×30', unit: 'fixed' },
                    { id: 'black_30x40', name: 'برواز مسطرة أسود 30×40', unit: 'fixed' },
                    { id: 'white_15x20', name: 'برواز مسطرة أبيض 15×20', unit: 'fixed' },
                    { id: 'white_20x30', name: 'برواز مسطرة أبيض 20×30', unit: 'fixed' },
                    { id: 'white_30x40', name: 'برواز مسطرة أبيض 30×40', unit: 'fixed' }
                ],
                'ShippingFlyer': [
                    { id: 'flyer_25x35', name: 'فلاير شحن 25×35', unit: 'fixed' },
                    { id: 'flyer_35x40', name: 'فلاير شحن 35×40', unit: 'fixed' },
                    { id: 'bag_20x25', name: 'كيس شفاف بسوستة 20×25', unit: 'fixed' },
                    { id: 'bag_27x35', name: 'كيس شفاف بسوستة 27×35', unit: 'fixed' },
                    { id: 'bag_35x40', name: 'كيس شفاف بسوستة 35×40', unit: 'fixed' }
                ],
                'PlasticBag': [
                    { id: 'plastic_bag', name: 'شنط بلاستيك (حسب الكيلو)', unit: 'kg' }
                ],
                'InkjetPaper': [
                    { id: 'paper_80g_a4_single_one_color', name: 'ورقة 80 جرام A4 وجه واحد لون واحد', unit: 'fixed' },
                    { id: 'paper_80g_a4_double_one_color', name: 'ورقة 80 جرام A4 وجهين لون واحد', unit: 'fixed' },
                    { id: 'paper_80g_a4_single_colors', name: 'ورقة 80 جرام A4 وجه واحد ألوان', unit: 'fixed' },
                    { id: 'paper_80g_a4_double_colors', name: 'ورقة 80 جرام A4 وجهين ألوان', unit: 'fixed' },
                    { id: 'print_only_single_one_color', name: 'طباعة فقط وجه واحد لون واحد', unit: 'fixed' },
                    { id: 'print_only_double_one_color', name: 'طباعة فقط وجهين لون واحد', unit: 'fixed' },
                    { id: 'print_only_single_colors', name: 'طباعة فقط وجه واحد ألوان', unit: 'fixed' },
                    { id: 'print_only_double_colors', name: 'طباعة فقط وجهين ألوان', unit: 'fixed' }
                ],
                'promotional_gifts': (typeof PromotionalGiftsPricing !== 'undefined' && PromotionalGiftsPricing.getAllProducts)
                    ? PromotionalGiftsPricing.getAllProducts()
                    : [
                        { id: 'enamel_name_tag', name: 'إنامل نيم تاج', unit: 'fixed' },
                        { id: 'gold_silver_name_tag_pin', name: 'نيم تاج دهبي/فضي (دبوس)', unit: 'fixed' },
                        { id: 'gold_silver_name_tag_magnet', name: 'نيم تاج دهبي/فضي (مغناطيس)', unit: 'fixed' },
                        { id: 'acrylic_medal_custom_shapes', name: 'ميدالية اكريلك (أشكال مخصصة)', unit: 'fixed' },
                        { id: 'wooden_medal_custom_shapes', name: 'ميدالية خشب (أشكال مخصصة)', unit: 'fixed' },
                        { id: 'acrylic_coaster_velvet_back', name: 'كوستر اكريلك (ضهر قطيفة)', unit: 'fixed' },
                        { id: 'acrylic_coaster_double_layer', name: 'كوستر اكريلك (طبقتين)', unit: 'fixed' },
                        { id: 'wooden_coaster_laser_engraved', name: 'كوستر خشب (حفر ليزر)', unit: 'fixed' },
                        { id: 'acrylic_stand_a5', name: 'استاند اكريلك A5', unit: 'fixed' },
                        { id: 'acrylic_stand_a4', name: 'استاند اكريلك A4', unit: 'fixed' },
                        { id: 'balloon_min_500', name: 'بالون (أقل كمية 500)', unit: 'fixed' },
                        { id: 'wristbands', name: 'أساور', unit: 'fixed' },
                        { id: 'swimming_pool_wristbands', name: 'أساور حمام سباحة', unit: 'fixed' }
                    ],
                'ruler_frames': (typeof RulerFramesPricing !== 'undefined' && RulerFramesPricing.getAllProducts)
                    ? RulerFramesPricing.getAllProducts()
                    : [
                        { id: 'black_15x20', name: 'برواز مسطرة أسود 15×20', unit: 'fixed' },
                        { id: 'black_20x30', name: 'برواز مسطرة أسود 20×30', unit: 'fixed' },
                        { id: 'black_30x40', name: 'برواز مسطرة أسود 30×40', unit: 'fixed' },
                        { id: 'white_15x20', name: 'برواز مسطرة أبيض 15×20', unit: 'fixed' },
                        { id: 'white_20x30', name: 'برواز مسطرة أبيض 20×30', unit: 'fixed' },
                        { id: 'white_30x40', name: 'برواز مسطرة أبيض 30×40', unit: 'fixed' }
                    ],
                'shipping_flyers_clear_bags': (typeof ShippingFlyersClearBagsPricing !== 'undefined' && ShippingFlyersClearBagsPricing.getAllProducts)
                    ? ShippingFlyersClearBagsPricing.getAllProducts()
                    : [
                        { id: 'shipping_flyer_25x35', name: 'فلاير شحن 25×35', unit: 'fixed' },
                        { id: 'shipping_flyer_35x40', name: 'فلاير شحن 35×40', unit: 'fixed' },
                        { id: 'clear_zipper_bag_20x25', name: 'كيس شفاف بسوستة 20×25', unit: 'fixed' },
                        { id: 'clear_zipper_bag_27x35', name: 'كيس شفاف بسوستة 27×35', unit: 'fixed' },
                        { id: 'clear_zipper_bag_35x40', name: 'كيس شفاف بسوستة 35×40', unit: 'fixed' }
                    ],
                'plastic_bags': (typeof PlasticBagsPricing !== 'undefined' && PlasticBagsPricing.getAllProducts)
                    ? PlasticBagsPricing.getAllProducts()
                    : [{ id: 'plastic_bag_kg', name: 'شنط بلاستيك (بالكيلو)', unit: 'kg' }],
                'inkjet_paper_printing': (typeof InkjetPaperPrintingPricing !== 'undefined' && InkjetPaperPrintingPricing.getAllProducts)
                    ? InkjetPaperPrintingPricing.getAllProducts()
                    : [
                        { id: 'a4_80gsm_single_black', name: 'A4 80 جرام – وجه واحد – أسود', unit: 'fixed' },
                        { id: 'a4_80gsm_double_black', name: 'A4 80 جرام – وجهين – أسود', unit: 'fixed' },
                        { id: 'a4_80gsm_single_color', name: 'A4 80 جرام – وجه واحد – ملون', unit: 'fixed' },
                        { id: 'a4_80gsm_double_color', name: 'A4 80 جرام – وجهين – ملون', unit: 'fixed' },
                        { id: 'printing_only_single_black', name: 'طباعة فقط – وجه واحد – أسود', unit: 'fixed' },
                        { id: 'printing_only_double_black', name: 'طباعة فقط – وجهين – أسود', unit: 'fixed' },
                        { id: 'printing_only_single_color', name: 'طباعة فقط – وجه واحد – ملون', unit: 'fixed' },
                        { id: 'printing_only_double_color', name: 'طباعة فقط – وجهين – ملون', unit: 'fixed' }
                    ],
                'SafetyPrinting': [
                    { id: 'vest_workers', name: 'فيست عمال', unit: 'fixed' },
                    { id: 'vest_engineers', name: 'فيست مهندسين', unit: 'fixed' },
                    { id: 'helmet', name: 'خوذة', unit: 'fixed' },
                    { id: 'helmet_vip', name: 'خوذة VIP', unit: 'fixed' }
                ],
                'Envelopes': (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.getAllProducts ? EnvelopesPricing.getAllProducts() : [
                    { id: 'american_22_11', name: 'American 22 × 11', unit: 'tier' },
                    { id: 'a5', name: 'A5 (22.9 × 16.2)', unit: 'tier' },
                    { id: 'a4', name: 'A4 (32.4 × 22.9)', unit: 'tier' },
                    { id: 'half_congratulations', name: 'Half Congratulations (17 × 25)', unit: 'tier' },
                    { id: 'congratulations', name: 'Congratulations (25 × 35)', unit: 'tier' },
                    { id: 'a3', name: 'A3 (33 × 45)', unit: 'tier' }
                ].map(p => ({ id: p.id, name: p.nameAr || p.name, unit: p.unit || 'tier' }))),
                'envelopes': (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.getAllProducts ? EnvelopesPricing.getAllProducts() : [
                    { id: 'american_22_11', name: 'American 22 × 11', unit: 'tier' },
                    { id: 'a5', name: 'A5 (22.9 × 16.2)', unit: 'tier' },
                    { id: 'a4', name: 'A4 (32.4 × 22.9)', unit: 'tier' },
                    { id: 'half_congratulations', name: 'Half Congratulations (17 × 25)', unit: 'tier' },
                    { id: 'congratulations', name: 'Congratulations (25 × 35)', unit: 'tier' },
                    { id: 'a3', name: 'A3 (33 × 45)', unit: 'tier' }
                ].map(p => ({ id: p.id, name: p.nameAr || p.name, unit: p.unit || 'tier' }))),
                'UVPrinting': [{ id: 'meter', name: 'سعر المتر (عرض ثابت 60 سم)', unit: 'meter' }],
                'Tableaux': (typeof TableauPricing !== 'undefined' ? TableauPricing.SIZES : [
                    { id: '20x30_straight', name: 'تابلوة 20×30 (خشب عدل)', unit: 'fixed' },
                    { id: '20x30_beveled', name: 'تابلوة 20×30 (خشب مشطوف)', unit: 'fixed' },
                    { id: '30x40_straight', name: 'تابلوة 30×40 (خشب عدل)', unit: 'fixed' },
                    { id: '30x40_beveled', name: 'تابلوة 30×40 (خشب مشطوف)', unit: 'fixed' },
                    { id: '40x50_straight', name: 'تابلوة 40×50 (خشب عدل)', unit: 'fixed' },
                    { id: '40x50_beveled', name: 'تابلوة 40×50 (خشب مشطوف)', unit: 'fixed' },
                    { id: '50x60_straight', name: 'تابلوة 50×60 (خشب عدل)', unit: 'fixed' },
                    { id: '50x60_beveled', name: 'تابلوة 50×60 (خشب مشطوف)', unit: 'fixed' },
                    { id: '50x70_straight', name: 'تابلوة 50×70 (خشب عدل)', unit: 'fixed' },
                    { id: '50x70_beveled', name: 'تابلوة 50×70 (خشب مشطوف)', unit: 'fixed' }
                ]).map(p => ({ id: p.id, name: p.nameAr || p.name, unit: p.unit || 'fixed' })),
                'DTF': [{ id: 'meter', name: 'سعر المتر (عرض ثابت 60 سم)', unit: 'meter' }],
                'IDCard': (typeof IDCardPricing !== 'undefined' && IDCardPricing.getAllProducts)
                    ? IDCardPricing.getAllProducts()
                    : [],
                'ZikrMedal': (typeof ZikrMedalPricing !== 'undefined' && ZikrMedalPricing.getAllProducts)
                    ? ZikrMedalPricing.getAllProducts()
                    : [],
                'Notebooks': [
                    { id: '15x20', name: 'دفتر 15×20 سم', unit: 'fixed' },
                    { id: '20x30', name: 'دفتر 20×30 سم', unit: 'fixed' },
                    { id: '30x42', name: 'دفتر 30×42 سم', unit: 'fixed' },
                    { id: 'custom', name: 'دفتر مقاس مخصص (21×30)', unit: 'fixed' }
                ],
                'safety_printing': (typeof SafetyPrintingPricing !== 'undefined' && SafetyPrintingPricing.getAllProducts)
                    ? SafetyPrintingPricing.getAllProducts()
                    : [
                        { id: 'worker_vest', name: 'فيست عمال', unit: 'fixed' },
                        { id: 'engineer_vest', name: 'فيست مهندسين', unit: 'fixed' },
                        { id: 'safety_helmet', name: 'خوذة', unit: 'fixed' },
                        { id: 'vip_helmet', name: 'خوذة VIP', unit: 'fixed' }
                    ],
                'digital_printing': (typeof DigitalPrintingPricing !== 'undefined' && DigitalPrintingPricing.getAllProducts)
                    ? DigitalPrintingPricing.getAllProducts()
                    : [],
                'paper_bags': (typeof PaperBagsPricing !== 'undefined' && PaperBagsPricing.getAllProducts)
                    ? PaperBagsPricing.getAllProducts()
                    : []
            };

            if (hardcodedProducts[category] && hardcodedProducts[category].length > 0) {
                products = hardcodedProducts[category];
                console.log(`✅ [${category}] Loaded ${products.length} products from hardcoded fallback`);
                console.log(`💡 [${category}] These are default products. Consider migrating them to Firestore for better management.`);
            }
        }

        // Debug: Log products loaded
        console.log(`📦 [${category}] Total products loaded: ${products.length}`);
        if (products.length > 0) {
            console.log(`📦 [${category}] Product IDs:`, products.map(p => p.id || p.productId || 'unknown'));
        }

        // STEP 2: Load prices from CORRECT collection (separate from products)
        let prices = {};
        try {
            // Load from unified pricing collections
            if (pricingMode === 'selling') {
                prices = await PricingService.getCategoryProductsSellPricing(category);
            } else if (pricingMode === 'cost') {
                prices = await PricingService.getCategoryProductsCostPricing(category);
            }
            console.log(`💰 [${category}] Loaded ${Object.keys(prices).length} prices from ${pricingMode === 'selling' ? 'product_prices_sell' : 'product_prices_cost'}`);
        } catch (error) {
            console.error(`❌ [${category}] Error loading prices:`, error);
        }

        // STEP 3: Show products even if prices don't exist
        if (products.length === 0) {
            return `<div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                <p class="text-yellow-800 font-bold mb-2">لا توجد منتجات متاحة لهذه الفئة</p>
                <p class="text-yellow-600 text-sm">يرجى إضافة المنتجات في Firestore في إحدى المجموعات التالية:</p>
                <ul class="list-disc list-inside mt-2 text-sm text-yellow-700">
                    <li>${category.toLowerCase()}_products</li>
                    <li>products (مع categoryId = "${category}")</li>
                </ul>
            </div>`;
        }

        // Check user permissions (prices already loaded in STEP 2)
        const userRole = AppState.currentUser?.role || 'employee';
        const canEdit = pricingMode === 'selling' ? (userRole === 'admin' || userRole === 'manager') : PricingService.canEditCostPrice(userRole);
        
        let html = `
            <div class="bg-white p-6 rounded-xl border border-gray-200 space-y-6">
                <div class="border-b-2 border-gray-300 pb-4">
                    <h4 class="text-2xl font-bold text-gray-800 mb-2">
                        ${pricingMode === 'selling' ? 'أسعار البيع' : 'أسعار التكلفة'} - ${category}
                    </h4>
                    <p class="text-gray-600">
                        ${pricingMode === 'selling' 
                            ? 'إدارة أسعار البيع لكل منتج (من product_prices_sell)' 
                            : 'إدارة أسعار التكلفة لكل منتج (من product_prices_cost)'}
                    </p>
                </div>
                
                <!-- Products List -->
                <div class="bg-${pricingMode === 'selling' ? 'green' : 'red'}-50 p-4 rounded-xl border border-${pricingMode === 'selling' ? 'green' : 'red'}-200">
                    <h5 class="text-xl font-bold text-gray-800 mb-4">المنتجات</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="productsList_${category}">
        `;

        // STEP 4: Merge products with prices in UI
        // Show ALL products, even if price is missing (price will be 0/empty)
        const missingPriceProductIds = [];
        
        // Render products with SINGLE input field (based on mode)
        for (const product of products) {
            const productId = String(product.id || product.productId || product.id);
            const productName = product.name || product.productName || `منتج ${productId}`;
            
            // Get price from prices object (may be missing - that's OK)
            let price = 0;
            if (pricingMode === 'selling') {
                price = prices[productId]?.sellingPrice || prices[productId]?.price || 0;
            } else {
                price = prices[productId]?.costPrice || prices[productId]?.price || 0;
            }
            
            // Track missing prices for debug
            if (price === 0 && !prices[productId]) {
                missingPriceProductIds.push(productId);
            }
            
            const unitText = product.unit === 'sqm' ? 'ج.م / م²' : product.unit === 'meter' ? 'ج.م / متر' : (product.unit === 'per_card' || product.unit === 'per_unit') ? 'ج.م / وحدة' : 'ج.م (ثابت)';
            
            html += `
                <div class="bg-white p-4 rounded-lg border-2 border-${pricingMode === 'selling' ? 'green' : 'red'}-200 shadow-sm hover:shadow-md transition">
                    <label class="block text-sm font-bold text-gray-700 mb-3">${productName}</label>
                    
                    <!-- SINGLE Input Field (Selling OR Cost, NOT both) -->
                    <div class="mb-2">
                        <label class="block text-xs font-semibold text-gray-600 mb-1">
                            ${pricingMode === 'selling' ? 'سعر البيع' : 'سعر التكلفة'} (ج.م)
                        </label>
                    <input type="number" 
                               id="product_price_${category}_${productId}_${pricingMode}" 
                           step="0.01" 
                           min="0" 
                               value="${price}" 
                               ${!canEdit ? 'readonly' : ''}
                               class="w-full border-2 border-${pricingMode === 'selling' ? 'green' : 'red'}-300 p-3 rounded-lg focus:border-${pricingMode === 'selling' ? 'green' : 'red'}-500 focus:ring-2 focus:ring-${pricingMode === 'selling' ? 'green' : 'red'}-500/20 outline-none transition"
                               data-product-id="${productId}">
                    <span class="text-xs text-gray-500 mt-1 block font-medium">${unitText}</span>
                        ${!canEdit ? '<span class="text-xs text-orange-600 mt-1 block">للقراءة فقط</span>' : ''}
                    </div>
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
                ${canEdit ? `
                <div class="mt-6 text-center">
                    <button onclick="PricingAdmin.saveAllUnifiedPrices('${category}', '${pricingMode}')" class="bg-brandGold text-white px-8 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition text-lg">
                        <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                    </button>
                </div>
                ` : ''}
            </div>
        `;

        // Debug: Log missing prices
        if (missingPriceProductIds.length > 0) {
            console.log(`⚠️ [${category}] Products with missing ${pricingMode} prices:`, missingPriceProductIds);
            console.log(`💡 [${category}] Admin can enter prices for these products in the UI above`);
        }
        
        return html;
    },
    
    // Save unified product price (works for ALL categories)
    async saveUnifiedProductPrice(category, productId, pricingMode, priceValue) {
        const userRole = AppState.currentUser?.role || 'employee';
        
        // Check permissions
        if (pricingMode === 'cost' && !PricingService.canEditCostPrice(userRole)) {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل أسعار التكلفة', 'error');
            return;
        }
        
        if (pricingMode === 'selling' && userRole !== 'admin' && userRole !== 'manager') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل أسعار البيع', 'error');
            return;
        }
        
        if (typeof PricingService === 'undefined') {
            Swal.fire('خطأ', 'وحدة PricingService غير متاحة', 'error');
            return;
        }
        
        priceValue = parseFloat(priceValue) || 0;
        const db = this._getDb();
        
        try {
            // Save to CORRECT collection based on mode (unified structure)
            if (pricingMode === 'selling') {
                await PricingService.saveProductSellPrice(category, productId, priceValue);
            } else if (pricingMode === 'cost') {
                await PricingService.saveProductCostPrice(category, productId, priceValue);
            }
            
            // Visual feedback
            const inputId = `product_price_${category}_${productId}_${pricingMode}`;
            const input = document.getElementById(inputId);
            if (input) {
                input.classList.add(`border-${pricingMode === 'selling' ? 'green' : 'red'}-500`);
                setTimeout(() => {
                    input.classList.remove(`border-${pricingMode === 'selling' ? 'green' : 'red'}-500`);
                }, 1000);
            }
            
            // Toast notification
            Swal.fire({
                icon: 'success',
                title: 'تم الحفظ',
                text: `تم حفظ ${pricingMode === 'selling' ? 'سعر البيع' : 'سعر التكلفة'} بنجاح`,
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        } catch (error) {
            console.error('Error saving product price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Batch save all unified product prices (manual save button)
    async saveAllUnifiedPrices(category, pricingMode) {
        const userRole = AppState.currentUser?.role || 'employee';
        if (pricingMode === 'cost' && !PricingService.canEditCostPrice(userRole)) {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل أسعار التكلفة', 'error');
            return;
        }
        if (pricingMode === 'selling' && userRole !== 'admin' && userRole !== 'manager') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل أسعار البيع', 'error');
            return;
        }
        try {
            const inputs = document.querySelectorAll(`[id^="product_price_${category}_"][id$="_${pricingMode}"]`);
            let saved = 0;
            for (const input of inputs) {
                const productId = input.dataset.productId;
                const val = parseFloat(input.value) || 0;
                if (pricingMode === 'selling') {
                    await PricingService.saveProductSellPrice(category, productId, val);
                } else {
                    await PricingService.saveProductCostPrice(category, productId, val);
                }
                saved++;
            }
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: `تم حفظ ${saved} سعر بنجاح`, timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (error) {
            console.error('Error batch saving prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    // Legacy method - redirects to unified renderer (kept for backward compatibility)
    async renderOutdoorCategory(pricingMode = 'selling') {
        return await this.renderUnifiedProductCategory('Outdoor', pricingMode);
    },

    // ---- Stamps (Seals & Stamps): مثل الاستندات — شاشة منفصلة لسعر البيع وشاشة لسعر التكلفة ----
    async renderStampsCategory(pricingMode) {
        if (typeof StampsPricing === 'undefined') {
            return '<div class="text-red-600">خطأ: وحدة StampsPricing غير متاحة. تأكد من تحميل stamps-pricing.js</div>';
        }
        if (pricingMode !== 'selling' && pricingMode !== 'cost') pricingMode = 'selling';
        this.currentStampsPricingMode = pricingMode;

        const db = this._getDb();
        const sellColl = (typeof PricingService !== 'undefined' && PricingService.SELL_COLLECTION) ? PricingService.SELL_COLLECTION : 'product_prices_sell';
        const costColl = (typeof PricingService !== 'undefined' && PricingService.COST_COLLECTION) ? PricingService.COST_COLLECTION : 'product_prices_cost';
        const collection = pricingMode === 'selling' ? sellColl : costColl;

        const bandIds = ['automatic_machine', 'wooden_handle', 'cliche_only'];
        const byDoc = {};

        const sizesByBand = { automatic_machine: [], wooden_handle: [] };
        const snap = await this._getColl(collection).where('categoryId', '==', 'Stamps').get();
        snap.docs.forEach(d => { byDoc[d.id] = d.data(); });
        bandIds.forEach(bid => {
            if (bid === 'cliche_only') return;
            // إضافة الأحجام الافتراضية أولاً (مثل إضافة الطلب) حتى تظهر الأصناف حتى لو لم تُحفظ أسعار بعد
            const defaultSizes = StampsPricing.getDefaultSizes(bid) || [];
            defaultSizes.forEach(s => {
                if (!sizesByBand[bid].some(x => x.sizeId === s.sizeId)) {
                    sizesByBand[bid].push({ sizeId: s.sizeId, productName: s.productName || s.sizeId, productNameAr: s.productNameAr || s.productName || s.sizeId });
                }
            });
            // إضافة أي مقاسات إضافية من Firestore غير موجودة في الافتراضي
            const fromSnap = snap.docs.filter(d => d.data().band === bid).map(d => ({ sizeId: d.data().sizeId || d.id.replace('Stamps_' + bid + '_', ''), productName: d.data().productName || '', productNameAr: d.data().productNameAr || '' }));
            fromSnap.forEach(({ sizeId, productName, productNameAr }) => {
                if (sizeId && !sizesByBand[bid].some(s => s.sizeId === sizeId)) {
                    sizesByBand[bid].push({ sizeId, productName: productName || sizeId, productNameAr: productNameAr || productName || sizeId });
                }
            });
        });

        const userRole = AppState.currentUser?.role || 'employee';
        const canEditSell = userRole === 'admin' || userRole === 'manager';
        const canEditCost = typeof PricingService !== 'undefined' && PricingService.canEditCostPrice(userRole);
        const canEdit = pricingMode === 'selling' ? canEditSell : canEditCost;

        const isSell = pricingMode === 'selling';
        const labelPrice = isSell ? 'سعر البيع' : 'سعر التكلفة';
        const inputClass = isSell ? 'border-green-300' : 'border-red-300';

        let html = '<div class="bg-white p-6 rounded-xl border border-gray-200 space-y-6">';
        html += '<div class="flex flex-wrap gap-2 border-b-2 border-gray-300 pb-4">';
        StampsPricing.BANDS.forEach((band, idx) => {
            html += `<button type="button" onclick="PricingAdmin.switchStampsTab('${band.id}')" class="stamps-tab-btn px-4 py-2 rounded-lg font-bold transition ${idx === 0 ? 'bg-rose-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}" data-stamps-tab="${band.id}">${band.nameAr || band.name}</button>`;
        });
        html += '</div>';

        StampsPricing.BANDS.forEach((band, tabIdx) => {
            const isActive = tabIdx === 0;
            html += `<div id="stamps_tab_${band.id}" class="stamps-tab-pane ${isActive ? '' : 'hidden'}">`;

            if (band.id === 'cliche_only') {
                const doc = byDoc['Stamps_cliche'] || {};
                const perCm2 = isSell ? (doc.sellPricePerCm2 != null ? doc.sellPricePerCm2 : StampsPricing.DEFAULT_CLICHE_SELL_PER_CM2) : (doc.costPricePerCm2 != null ? doc.costPricePerCm2 : StampsPricing.DEFAULT_CLICHE_COST_PER_CM2);
                const inputId = isSell ? 'stamps_cliche_sell_per_cm2' : 'stamps_cliche_cost_per_cm2';
                html += `
                    <div class="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
                        <p class="text-gray-700 mb-2">${labelPrice} لكل سم² (ج.م). المعادلة: العرض × الارتفاع × السعر/سم² × الكمية.</p>
                        <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
                            <div>
                                <label class="block text-sm font-bold ${isSell ? 'text-green-700' : 'text-red-700'} mb-1">${labelPrice} لكل سم² (ج.م)</label>
                                <input type="number" step="0.001" min="0" id="${inputId}" value="${perCm2}" ${!canEdit ? 'readonly' : ''} class="w-full border-2 ${inputClass} p-2 rounded-lg">
                            </div>
                        </div>
                        <button type="button" onclick="PricingAdmin.saveStampsClichePrices()" class="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700" ${!canEdit ? 'disabled' : ''}>حفظ أسعار الكليشيه</button>
                    </div>`;
            } else {
                const sizes = sizesByBand[band.id] || [];
                const isMachine = band.id === 'automatic_machine';
                const labelA = isMachine ? 'ماكينة فقط' : 'مقبض فقط';
                const labelB = isMachine ? 'ماكينة + ختم' : 'مقبض + ختم';
                html += `<p class="text-gray-600 mb-2">${band.nameAr} — إدخال ${labelPrice} لكل مقاس (${labelA} / ${labelB}).</p>`;
                html += '<div class="overflow-x-auto"><table class="w-full border border-gray-300 rounded-lg"><thead><tr class="bg-gray-100">';
                html += '<th class="text-right p-2 border-b">المنتج</th>';
                html += '<th class="text-right p-2 border-b">' + labelPrice + ': ' + labelA + '</th>';
                html += '<th class="text-right p-2 border-b">' + labelPrice + ': ' + labelB + '</th>';
                html += '<th class="text-right p-2 border-b w-20">حذف</th></tr></thead><tbody>';
                sizes.forEach(s => {
                    const docId = StampsPricing.docId(band.id, s.sizeId);
                    const row = byDoc[docId] || {};
                    const valA = isSell ? (isMachine ? (row.sellPriceMachineOnly ?? '') : (row.sellPriceHandleOnly ?? '')) : (isMachine ? (row.costPriceMachineOnly ?? '') : (row.costPriceHandleOnly ?? ''));
                    const valB = isSell ? (isMachine ? (row.sellPriceMachineStamp ?? '') : (row.sellPriceHandleStamp ?? '')) : (isMachine ? (row.costPriceMachineStamp ?? '') : (row.costPriceHandleStamp ?? ''));
                    const fieldA = isSell ? 'sellA' : 'costA';
                    const fieldB = isSell ? 'sellB' : 'costB';
                    const name = (s.productNameAr || s.productName || s.sizeId);
                    html += `<tr class="border-b border-gray-200" data-size-id="${s.sizeId}">
                        <td class="p-2 font-medium">${name}</td>
                        <td class="p-1"><input type="number" step="0.01" min="0" data-field="${fieldA}" data-band="${band.id}" data-size="${s.sizeId}" value="${valA}" ${!canEdit ? 'readonly' : ''} class="w-full border border-gray-300 p-1 rounded text-sm"></td>
                        <td class="p-1"><input type="number" step="0.01" min="0" data-field="${fieldB}" data-band="${band.id}" data-size="${s.sizeId}" value="${valB}" ${!canEdit ? 'readonly' : ''} class="w-full border border-gray-300 p-1 rounded text-sm"></td>
                        <td class="p-1"><button type="button" onclick="PricingAdmin.deleteStampsSize('${band.id}','${s.sizeId}')" class="text-red-600 hover:underline text-sm" ${!canEdit ? 'disabled' : ''}>حذف</button></td>
                    </tr>`;
                });
                html += '</tbody></table></div>';
                html += `<div class="mt-4 flex gap-2"><button type="button" onclick="PricingAdmin.saveStampsBandPrices('${band.id}')" class="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700" ${!canEdit ? 'disabled' : ''}>حفظ أسعار ${band.nameAr}</button><button type="button" onclick="PricingAdmin.addStampsSize('${band.id}')" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" ${!canEdit ? 'disabled' : ''}>إضافة مقاس</button></div>`;
            }
            html += '</div>';
        });

        html += '</div>';
        return html;
    },

    switchStampsTab(bandId) {
        document.querySelectorAll('.stamps-tab-pane').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.stamps-tab-btn').forEach(btn => {
            btn.classList.remove('bg-rose-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
            if (btn.getAttribute('data-stamps-tab') === bandId) {
                btn.classList.remove('bg-gray-200', 'text-gray-700');
                btn.classList.add('bg-rose-600', 'text-white');
            }
        });
        const pane = document.getElementById('stamps_tab_' + bandId);
        if (pane) pane.classList.remove('hidden');
    },

    collectStampsBandInputs(bandId) {
        const isSell = this.currentStampsPricingMode === 'selling';
        const isMachine = bandId === 'automatic_machine';
        const rows = document.querySelectorAll(`#stamps_tab_${bandId} tr[data-size-id]`);
        const bySize = {};
        const fieldA = isSell ? 'sellA' : 'costA';
        const fieldB = isSell ? 'sellB' : 'costB';
        rows.forEach(tr => {
            const sizeId = tr.getAttribute('data-size-id');
            const valA = parseFloat(tr.querySelector(`input[data-field="${fieldA}"]`)?.value) || 0;
            const valB = parseFloat(tr.querySelector(`input[data-field="${fieldB}"]`)?.value) || 0;
            const defaultInfo = (StampsPricing.getDefaultSizes(bandId) || []).find(s => s.sizeId === sizeId);
            const productName = tr.dataset.productName || (defaultInfo && defaultInfo.productName) || sizeId;
            const productNameAr = tr.dataset.productNameAr || (defaultInfo && defaultInfo.productNameAr) || productName;
            if (isSell) {
                bySize[sizeId] = { sizeId, productName, productNameAr, sellA: valA, sellB: valB, costA: 0, costB: 0 };
            } else {
                bySize[sizeId] = { sizeId, productName, productNameAr, sellA: 0, sellB: 0, costA: valA, costB: valB };
            }
        });
        return bySize;
    },

    addStampsSize(bandId) {
        const isSell = this.currentStampsPricingMode === 'selling';
        const canEdit = isSell ? (AppState.currentUser?.role === 'admin' || AppState.currentUser?.role === 'manager') : (typeof PricingService !== 'undefined' && PricingService.canEditCostPrice(AppState.currentUser?.role || 'employee'));
        const fieldA = isSell ? 'sellA' : 'costA';
        const fieldB = isSell ? 'sellB' : 'costB';
        Swal.fire({
            title: 'إضافة مقاس جديد',
            html: '<input id="swal-stamps-name" class="swal2-input w-full" placeholder="اسم المنتج (عربي)"><input id="swal-stamps-sizeid" class="swal2-input w-full mt-2" placeholder="مفتاح المقاس (مثل: custom-1)">',
            showCancelButton: true,
            confirmButtonText: 'إضافة',
            cancelButtonText: 'إلغاء'
        }).then((result) => {
            if (!result.isConfirmed) return;
            const name = (document.getElementById('swal-stamps-name')?.value || '').trim() || 'مقاس جديد';
            let sizeId = (document.getElementById('swal-stamps-sizeid')?.value || '').trim().replace(/\s+/g, '-') || 'custom-' + Date.now();
            const tbody = document.querySelector('#stamps_tab_' + bandId + ' table tbody');
            if (!tbody) return;
            const tr = document.createElement('tr');
            tr.className = 'border-b border-gray-200';
            tr.setAttribute('data-size-id', sizeId);
            tr.setAttribute('data-product-name', name);
            tr.setAttribute('data-product-name-ar', name);
            tr.innerHTML = '<td class="p-2 font-medium">' + name + '</td>' +
                '<td class="p-1"><input type="number" step="0.01" min="0" data-field="' + fieldA + '" data-band="' + bandId + '" data-size="' + sizeId + '" value="" ' + (canEdit ? '' : 'readonly') + ' class="w-full border border-gray-300 p-1 rounded text-sm"></td>' +
                '<td class="p-1"><input type="number" step="0.01" min="0" data-field="' + fieldB + '" data-band="' + bandId + '" data-size="' + sizeId + '" value="" ' + (canEdit ? '' : 'readonly') + ' class="w-full border border-gray-300 p-1 rounded text-sm"></td>' +
                '<td class="p-1"><button type="button" onclick="PricingAdmin.deleteStampsSize(\'' + bandId + '\',\'' + sizeId + '\')" class="text-red-600 hover:underline text-sm">حذف</button></td>';
            tbody.appendChild(tr);
            Swal.fire('تم', 'تمت إضافة المقاس. احفظ الأسعار عند الانتهاء.', 'success');
        });
    },

    async saveStampsBandPrices(bandId) {
        const userRole = AppState.currentUser?.role || 'employee';
        const isSell = this.currentStampsPricingMode === 'selling';
        if (isSell && userRole !== 'admin' && userRole !== 'manager') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لحفظ أسعار البيع', 'error');
            return;
        }
        if (!isSell && typeof PricingService !== 'undefined' && !PricingService.canEditCostPrice(userRole)) {
            Swal.fire('خطأ', 'ليس لديك صلاحية لحفظ أسعار التكلفة', 'error');
            return;
        }
        const db = this._getDb();
        const sellColl = (typeof PricingService !== 'undefined' && PricingService.SELL_COLLECTION) ? PricingService.SELL_COLLECTION : 'product_prices_sell';
        const costColl = (typeof PricingService !== 'undefined' && PricingService.COST_COLLECTION) ? PricingService.COST_COLLECTION : 'product_prices_cost';
        const collection = isSell ? sellColl : costColl;
        const isMachine = bandId === 'automatic_machine';
        const bySize = this.collectStampsBandInputs(bandId);
        const batch = db.batch();
        Object.keys(bySize).forEach(sizeId => {
            const d = bySize[sizeId];
            const docId = StampsPricing.docId(bandId, sizeId);
            const ref = this._getColl(collection).doc(docId);
            if (isSell) {
                batch.set(ref, {
                    categoryId: 'Stamps',
                    band: bandId,
                    sizeId,
                    productName: d.productName,
                    productNameAr: d.productNameAr || d.productName,
                    ...(isMachine ? { sellPriceMachineOnly: d.sellA, sellPriceMachineStamp: d.sellB } : { sellPriceHandleOnly: d.sellA, sellPriceHandleStamp: d.sellB }),
                    currency: 'EGP',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } else {
                batch.set(ref, {
                    categoryId: 'Stamps',
                    band: bandId,
                    sizeId,
                    productName: d.productName,
                    productNameAr: d.productNameAr || d.productName,
                    ...(isMachine ? { costPriceMachineOnly: d.costA, costPriceMachineStamp: d.costB } : { costPriceHandleOnly: d.costA, costPriceHandleStamp: d.costB }),
                    currency: 'EGP',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        });
        await batch.commit();
        Swal.fire('تم', 'تم حفظ أسعار النطاق بنجاح', 'success');
        this.render('Stamps', this.currentStampsPricingMode);
    },

    async saveStampsClichePrices() {
        const userRole = AppState.currentUser?.role || 'employee';
        const isSell = this.currentStampsPricingMode === 'selling';
        if (isSell && userRole !== 'admin' && userRole !== 'manager') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لحفظ أسعار البيع', 'error');
            return;
        }
        if (!isSell && typeof PricingService !== 'undefined' && !PricingService.canEditCostPrice(userRole)) {
            Swal.fire('خطأ', 'ليس لديك صلاحية لحفظ أسعار التكلفة', 'error');
            return;
        }
        const inputId = isSell ? 'stamps_cliche_sell_per_cm2' : 'stamps_cliche_cost_per_cm2';
        const value = parseFloat(document.getElementById(inputId)?.value) || 0;
        const db = this._getDb();
        const sellColl = (typeof PricingService !== 'undefined' && PricingService.SELL_COLLECTION) ? PricingService.SELL_COLLECTION : 'product_prices_sell';
        const costColl = (typeof PricingService !== 'undefined' && PricingService.COST_COLLECTION) ? PricingService.COST_COLLECTION : 'product_prices_cost';
        const collection = isSell ? sellColl : costColl;
        const field = isSell ? 'sellPricePerCm2' : 'costPricePerCm2';
        await this._getColl(collection).doc('Stamps_cliche').set({
            categoryId: 'Stamps',
            band: 'cliche_only',
            [field]: value,
            currency: 'EGP',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        Swal.fire('تم', 'تم حفظ أسعار الكليشيه بنجاح', 'success');
        this.render('Stamps', this.currentStampsPricingMode);
    },

    deleteStampsSize(bandId, sizeId) {
        Swal.fire({
            title: 'حذف المقاس؟',
            text: 'سيتم حذف أسعار هذا المقاس من قاعدة البيانات.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (!result.isConfirmed) return;
            const db = this._getDb();
            const sellColl = (typeof PricingService !== 'undefined' && PricingService.SELL_COLLECTION) ? PricingService.SELL_COLLECTION : 'product_prices_sell';
            const costColl = (typeof PricingService !== 'undefined' && PricingService.COST_COLLECTION) ? PricingService.COST_COLLECTION : 'product_prices_cost';
            const docId = StampsPricing.docId(bandId, sizeId);
            await this._getColl(sellColl).doc(docId).delete();
            await this._getColl(costColl).doc(docId).delete();
            Swal.fire('تم', 'تم حذف المقاس', 'success');
            this.render('Stamps', this.currentStampsPricingMode || 'selling');
        });
    },
    
    // Legacy method - redirects to unified save function
    async saveOutdoorProductPrice(mode, productId, priceValue = null) {
        return await this.saveUnifiedProductPrice('Outdoor', productId, mode, priceValue);
    },
    
    // Save Outdoor addon price
    async saveOutdoorAddonPrice(addonId) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(`outdoor_addon_${addonId}`);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            await Outdoor.saveAddonPrice(addonId, price);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving addon price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },
    
    // Reinitialize Outdoor addons (force recreate from defaultAddons)
    async reinitializeOutdoorAddons() {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لإعادة تهيئة الإضافات', 'error');
            return;
        }
        
        const result = await Swal.fire({
            title: 'تأكيد إعادة التهيئة',
            text: 'سيتم إعادة إنشاء جميع إضافات ان دور من الإعدادات الافتراضية. هل أنت متأكد؟',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، إعادة التهيئة',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6'
        });
        
        if (!result.isConfirmed) return;
        
        try {
            if (typeof Outdoor === 'undefined') {
                Swal.fire('خطأ', 'وحدة ان دور غير متاحة', 'error');
                return;
            }
            
            // Force reinitialize addons
            // Get db instance (same way Outdoor module does)
            let db;
            if (typeof window !== 'undefined' && window.db) {
                db = window.db;
            } else if (typeof db !== 'undefined') {
                db = db;
            } else {
                throw new Error('Firestore db instance not found.');
            }
            
            const batch = db.batch();
            
            // Delete all existing addons
            const addonsSnapshot = await this._getColl(Outdoor.ADDONS_COLLECTION).get();
            addonsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            
            // Add all default addons
            for (const addon of Outdoor.defaultAddons) {
                const docRef = this._getColl(Outdoor.ADDONS_COLLECTION).doc(addon.id.toString());
                batch.set(docRef, {
                    ...addon,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
            
            await batch.commit();
            
            // Clear cache and reinitialize
            Outdoor._addonsCache = [];
            Outdoor._initialized = false;
            await Outdoor.initialize();
            
            // Reload pricing config to include new addons
            const pricingDoc = await this._getColl(Outdoor.COLLECTION_NAME).doc('pricing').get();
            if (pricingDoc.exists) {
                const currentPricing = pricingDoc.data();
                // Ensure all new addons have pricing entries
                for (const addon of Outdoor.defaultAddons) {
                    if (!currentPricing.addons || currentPricing.addons[addon.id] === undefined) {
                        currentPricing.addons = currentPricing.addons || {};
                        currentPricing.addons[addon.id] = 0;
                    }
                }
                await this._getColl(Outdoor.COLLECTION_NAME).doc('pricing').set(currentPricing);
                Outdoor._pricingCache = currentPricing;
            }
            
            Swal.fire('تم', 'تم إعادة تهيئة الإضافات بنجاح', 'success');
            
            // Reload the Outdoor category
            await this.render('Outdoor');
        } catch (error) {
            console.error('Error reinitializing addons:', error);
            Swal.fire('خطأ', `فشل إعادة التهيئة: ${error.message}`, 'error');
        }
    },
    
    // Get Arabic name for addition
    getAdditionArabicName(additionType) {
        const names = {
            'specialColor': 'لون أي',
            'matteCellophane': 'سلوفان مط',
            'glossyCellophane': 'سلوفان لامع',
            'dieCutting': 'تكسير',
            'embossing': 'بصمة',
            'debossing': 'كفراج',
            'creasing': 'ريجة',
            'perforation': 'تخريم'
        };
        return names[additionType] || additionType;
    },
    
    // Render Indoor category (160cm max section)
    async renderIndoorCategory() {
        if (typeof Outdoor === 'undefined') {
            return '<div class="text-red-600">خطأ: وحدة ان دور غير متاحة</div>';
        }
        
        await Outdoor.initialize();
        const allProducts = await Outdoor.getProducts();
        const allAddons = await Outdoor.getAddons();
        
        // Filter products for Indoor section (160cm max)
        // Note: Cutter Plotter and Print & Cut are now standalone categories, not part of Indoor
        const indoorProducts = [
            { id: 4, name: 'بانر عاكس' },
            { id: 19, name: 'بانر جكتار' },
            { id: 5, name: 'فنيل أبيض' },
            { id: 6, name: 'فنيل شفاف' },
            { id: 7, name: 'فنيل مصنفر (فاضى)' },
            { id: 8, name: 'فنيل مصنفر (مطبوع)' },
            { id: 9, name: 'فنيل عاكس' },
            { id: 10, name: 'لامينشن فقط' },
            { id: 11, name: 'فليكس' },
            { id: 12, name: 'فليكس كوتيد' },
            { id: 13, name: 'سي ثرو' },
            { id: 14, name: 'جليتر' },
            { id: 15, name: 'جلوسي' }
        ];
        
        // Load pricing for this section (use separate collection)
        let db;
        if (typeof window !== 'undefined' && window.db) {
            db = window.db;
        } else if (typeof db !== 'undefined') {
            db = db;
        } else {
            return '<div class="text-red-600">خطأ: قاعدة البيانات غير متاحة</div>';
        }
        
        const pricingDoc = await this._getColl('outdoor_config').doc('indoor_pricing').get();
        let pricing = pricingDoc.exists ? pricingDoc.data() : { products: {}, addons: {} };
        
        // Initialize default pricing if needed
        if (!pricing.products || Object.keys(pricing.products).length === 0) {
            pricing.products = {};
            pricing.addons = {};
            for (const product of indoorProducts) {
                pricing.products[product.id] = 0;
            }
            for (const addon of allAddons) {
                pricing.addons[addon.id] = 0;
            }
            await this._getColl('outdoor_config').doc('indoor_pricing').set(pricing);
        }
        
        let html = `
            <div class="bg-white p-6 rounded-xl border border-gray-200 space-y-6">
                <div class="border-b-2 border-gray-300 pb-4">
                    <h4 class="text-2xl font-bold text-gray-800 mb-2">إدارة تسعير ان دور</h4>
                    <p class="text-gray-600">أقصى عرض أو طول مسموح: 160 سم</p>
                </div>
                
                <!-- Products Pricing -->
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h5 class="text-xl font-bold text-gray-800 mb-4">أسعار المنتجات</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="indoorProductsList">
        `;
        
        // Render products
        for (const productInfo of indoorProducts) {
            const product = allProducts.find(p => p.id === productInfo.id);
            if (!product) continue;
            
            const price = pricing.products?.[product.id] || 0;
            const unitText = product.unit === 'sqm' ? 'ج.م / م²' : product.unit === 'meter' ? 'ج.م / متر' : (product.unit === 'per_card' || product.unit === 'per_unit') ? 'ج.م / وحدة' : 'ج.م (ثابت)';
            html += `
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                    <label class="block text-sm font-bold text-gray-700 mb-3">
                        <i class="fas fa-tag text-brandGold ml-2"></i>
                        ${product.name}
                    </label>
                    <input type="number" 
                           id="indoor_product_${product.id}" 
                           step="0.01" 
                           min="0" 
                           value="${price}" 
                           class="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-brandGold focus:ring-2 focus:ring-brandGold/20 outline-none transition text-gray-800 font-medium"
                           data-indoor-type="product" data-indoor-id="${product.id}">
                    <span class="text-xs text-gray-500 mt-1 block font-medium">${unitText}</span>
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
                
                <!-- Banner/Glitter Addons Pricing -->
                <div class="bg-green-50 p-4 rounded-xl border border-green-200">
                    <h5 class="text-xl font-bold text-gray-800 mb-4">أسعار إضافات البانر والجليتر</h5>
                    <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4">
                        <p class="text-xs text-gray-700">
                            <i class="fas fa-info-circle text-yellow-600 ml-1"></i>
                            <strong>ملاحظة:</strong> لامينشن مط ولامينشن لامع يتطلبان أقصى عرض 150 سم
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="indoorBannerAddonsList">
        `;
        
        // Render banner/glitter addons
        const bannerAddons = allAddons.filter(a => a.forBanner === true);
        for (const addon of bannerAddons) {
            const price = pricing.addons?.[addon.id] || 0;
            const unitText = addon.unit === 'sqm' ? 'ج.م / م²' : addon.unit === 'meter' ? 'ج.م / متر' : 'ج.م (ثابت)';
            const maxWidthWarning = addon.maxWidth ? `<div class="mt-2 p-2 bg-orange-50 border border-orange-200 rounded"><span class="text-xs text-orange-700"><i class="fas fa-exclamation-triangle ml-1"></i> <strong>أقصى عرض:</strong> ${addon.maxWidth} سم</span></div>` : '';
            const noteWarning = addon.note ? `<div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded"><span class="text-xs text-blue-700"><i class="fas fa-info-circle ml-1"></i> <strong>ملاحظة:</strong> ${addon.note}</span></div>` : '';
            html += `
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                    <label class="block text-sm font-bold text-gray-700 mb-3">
                        <i class="fas fa-tag text-brandGold ml-2"></i>
                        ${addon.name}
                    </label>
                    <input type="number" 
                           id="indoor_addon_${addon.id}" 
                           step="0.01" 
                           min="0" 
                           value="${price}" 
                           class="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-brandGold focus:ring-2 focus:ring-brandGold/20 outline-none transition text-gray-800 font-medium"
                           data-indoor-type="addon" data-indoor-id="${addon.id}"
                           ${addon.isManual ? 'readonly placeholder="يدوي" class="bg-gray-100"' : ''}>
                    <span class="text-xs text-gray-500 mt-1 block font-medium">${unitText}</span>
                    ${maxWidthWarning}
                    ${noteWarning}
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
                
                <!-- Vinyl Addons Pricing -->
                <div class="bg-purple-50 p-4 rounded-xl border border-purple-200">
                    <h5 class="text-xl font-bold text-gray-800 mb-4">أسعار إضافات الفينيل</h5>
                    <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4">
                        <p class="text-xs text-gray-700">
                            <i class="fas fa-info-circle text-yellow-600 ml-1"></i>
                            <strong>ملاحظة:</strong> جميع إضافات الفينيل تتطلب أقصى عرض 150 سم
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="indoorVinylAddonsList">
        `;
        
        // Render vinyl addons
        const vinylAddons = allAddons.filter(a => a.forVinyl === true);
        for (const addon of vinylAddons) {
            const price = pricing.addons?.[addon.id] || 0;
            const unitText = addon.unit === 'sqm' ? 'ج.م / م²' : addon.unit === 'meter' ? 'ج.م / متر' : 'ج.م (ثابت)';
            const maxWidthWarning = addon.maxWidth ? `<div class="mt-2 p-2 bg-orange-50 border border-orange-200 rounded"><span class="text-xs text-orange-700"><i class="fas fa-exclamation-triangle ml-1"></i> <strong>أقصى عرض:</strong> ${addon.maxWidth} سم</span></div>` : '';
            html += `
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                    <label class="block text-sm font-bold text-gray-700 mb-3">
                        <i class="fas fa-tag text-brandGold ml-2"></i>
                        ${addon.name}
                    </label>
                    <input type="number" 
                           id="indoor_addon_${addon.id}" 
                           step="0.01" 
                           min="0" 
                           value="${price}" 
                           class="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-brandGold focus:ring-2 focus:ring-brandGold/20 outline-none transition text-gray-800 font-medium"
                           data-indoor-type="addon" data-indoor-id="${addon.id}">
                    <span class="text-xs text-gray-500 mt-1 block font-medium">${unitText}</span>
                    ${maxWidthWarning}
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
                
                <!-- Flex Addons Pricing -->
                <div class="bg-pink-50 p-4 rounded-xl border border-pink-200">
                    <h5 class="text-xl font-bold text-gray-800 mb-4">أسعار إضافات الفليكس</h5>
                    <div class="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4">
                        <p class="text-xs text-gray-700">
                            <i class="fas fa-info-circle text-yellow-600 ml-1"></i>
                            <strong>ملاحظة:</strong> لامينشن مط ولامينشن لامع يتطلبان أقصى عرض 150 سم
                        </p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="indoorFlexAddonsList">
        `;
        
        // Render flex addons
        const flexAddons = allAddons.filter(a => a.forFlex === true);
        for (const addon of flexAddons) {
            const price = pricing.addons?.[addon.id] || 0;
            const unitText = addon.unit === 'sqm' ? 'ج.م / م²' : addon.unit === 'meter' ? 'ج.م / متر' : 'ج.م (ثابت)';
            const maxWidthWarning = addon.maxWidth ? `<div class="mt-2 p-2 bg-orange-50 border border-orange-200 rounded"><span class="text-xs text-orange-700"><i class="fas fa-exclamation-triangle ml-1"></i> <strong>أقصى عرض:</strong> ${addon.maxWidth} سم</span></div>` : '';
            html += `
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                    <label class="block text-sm font-bold text-gray-700 mb-3">
                        <i class="fas fa-tag text-brandGold ml-2"></i>
                        ${addon.name}
                    </label>
                    <input type="number" 
                           id="indoor_addon_${addon.id}" 
                           step="0.01" 
                           min="0" 
                           value="${price}" 
                           class="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-brandGold focus:ring-2 focus:ring-brandGold/20 outline-none transition text-gray-800 font-medium"
                           data-indoor-type="addon" data-indoor-id="${addon.id}">
                    <span class="text-xs text-gray-500 mt-1 block font-medium">${unitText}</span>
                    ${maxWidthWarning}
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
                
                <!-- C-Thru Addons Pricing -->
                <div class="bg-teal-50 p-4 rounded-xl border border-teal-200">
                    <h5 class="text-xl font-bold text-gray-800 mb-4">أسعار إضافات سي ثرو</h5>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="indoorCThruAddonsList">
        `;
        
        // Render C-Thru addons
        const cThruAddons = allAddons.filter(a => a.forCThru === true);
        for (const addon of cThruAddons) {
            const price = pricing.addons?.[addon.id] || 0;
            const unitText = addon.unit === 'sqm' ? 'ج.م / م²' : addon.unit === 'meter' ? 'ج.م / متر' : 'ج.م (ثابت)';
            html += `
                <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition">
                    <label class="block text-sm font-bold text-gray-700 mb-3">
                        <i class="fas fa-tag text-brandGold ml-2"></i>
                        ${addon.name}
                    </label>
                    <input type="number" 
                           id="indoor_addon_${addon.id}" 
                           step="0.01" 
                           min="0" 
                           value="${price}" 
                           class="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-brandGold focus:ring-2 focus:ring-brandGold/20 outline-none transition text-gray-800 font-medium"
                           data-indoor-type="addon" data-indoor-id="${addon.id}">
                    <span class="text-xs text-gray-500 mt-1 block font-medium">${unitText}</span>
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
                
                <div class="mt-6 text-center">
                    <button onclick="PricingAdmin.saveAllIndoorPrices()" class="bg-brandGold text-white px-8 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition text-lg">
                        <i class="fas fa-save ml-2"></i> حفظ جميع أسعار ان دور
                    </button>
                </div>
            </div>
        `;
        
        return html;
    },
    
    // Save Indoor product price
    async saveIndoorProductPrice(productId) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(`indoor_product_${productId}`);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            let db;
            if (typeof window !== 'undefined' && window.db) {
                db = window.db;
            } else if (typeof db !== 'undefined') {
                db = db;
            } else {
                throw new Error('Firestore db instance not found.');
            }
            
            const pricingDoc = await this._getColl('outdoor_config').doc('indoor_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : { products: {}, addons: {} };
            
            if (!pricing.products) {
                pricing.products = {};
            }
            
            pricing.products[productId] = price;
            pricing.updatedAt = new Date().toISOString();
            
            await this._getColl('outdoor_config').doc('indoor_pricing').set(pricing);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving product price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },
    
    // Save Indoor addon price
    async saveIndoorAddonPrice(addonId) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(`indoor_addon_${addonId}`);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            let db;
            if (typeof window !== 'undefined' && window.db) {
                db = window.db;
            } else if (typeof db !== 'undefined') {
                db = db;
            } else {
                throw new Error('Firestore db instance not found.');
            }
            
            const pricingDoc = await this._getColl('outdoor_config').doc('indoor_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : { products: {}, addons: {} };
            
            if (!pricing.addons) {
                pricing.addons = {};
            }
            
            pricing.addons[addonId] = price;
            pricing.updatedAt = new Date().toISOString();
            
            await this._getColl('outdoor_config').doc('indoor_pricing').set(pricing);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving addon price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Batch save all Indoor prices (manual save button)
    async saveAllIndoorPrices() {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        try {
            const pricingDoc = await this._getColl('outdoor_config').doc('indoor_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : { products: {}, addons: {} };
            if (!pricing.products) pricing.products = {};
            if (!pricing.addons) pricing.addons = {};

            const productInputs = document.querySelectorAll('[data-indoor-type="product"]');
            productInputs.forEach(input => {
                const id = input.dataset.indoorId;
                if (id) pricing.products[id] = parseFloat(input.value) || 0;
            });

            const addonInputs = document.querySelectorAll('[data-indoor-type="addon"]');
            addonInputs.forEach(input => {
                const id = input.dataset.indoorId;
                if (id) pricing.addons[id] = parseFloat(input.value) || 0;
            });

            pricing.updatedAt = new Date().toISOString();
            await this._getColl('outdoor_config').doc('indoor_pricing').set(pricing);
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم حفظ جميع أسعار ان دور بنجاح', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (error) {
            console.error('Error batch saving indoor prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    // Render Stand category with subcategories
    async renderStandCategory() {
        const db = this._getDb();
        
        // Load stand pricing from Firestore
        let standPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').get();
            if (pricingDoc.exists) {
                standPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading stand pricing:', error);
        }

        // Roll Up sizes
        const rollUpSizes = [
            { width: 80, height: 200 },
            { width: 85, height: 200 },
            { width: 100, height: 200 },
            { width: 120, height: 200 },
            { width: 150, height: 200 }
        ];

        // Default prices if not set
        const defaultPrices = {
            rollUpBannerEmpty: standPricing.rollUpBannerEmpty || {},
            rollUpBannerPrinted: standPricing.rollUpBannerPrinted || {},
            rollUpGlossyEmpty: standPricing.rollUpGlossyEmpty || {},
            rollUpGlossyPrinted: standPricing.rollUpGlossyPrinted || {},
            laminationMatte: standPricing.laminationMatte || 0,
            laminationGlossy: standPricing.laminationGlossy || 0,
            xBannerBannerEmpty: standPricing.xBannerBannerEmpty || {},
            xBannerBannerPrinted: standPricing.xBannerBannerPrinted || {},
            xBannerGlossyEmpty: standPricing.xBannerGlossyEmpty || {},
            xBannerGlossyPrinted: standPricing.xBannerGlossyPrinted || {},
            popUpEmpty: standPricing.popUpEmpty || {},
            popUpPrinted: standPricing.popUpPrinted || {},
            // Pop Up types
            popUp2x3StraightEmpty: standPricing.popUp2x3StraightEmpty || {},
            popUp2x3StraightPrinted: standPricing.popUp2x3StraightPrinted || {},
            popUp2x3CurveEmpty: standPricing.popUp2x3CurveEmpty || {},
            popUp2x3CurvePrinted: standPricing.popUp2x3CurvePrinted || {},
            popUp3x3StraightEmpty: standPricing.popUp3x3StraightEmpty || {},
            popUp3x3StraightPrinted: standPricing.popUp3x3StraightPrinted || {},
            popUp3x3CurveEmpty: standPricing.popUp3x3CurveEmpty || {},
            popUp3x3CurvePrinted: standPricing.popUp3x3CurvePrinted || {},
            popUp3x4StraightEmpty: standPricing.popUp3x4StraightEmpty || {},
            popUp3x4StraightPrinted: standPricing.popUp3x4StraightPrinted || {},
            popUp3x4CurveEmpty: standPricing.popUp3x4CurveEmpty || {},
            popUp3x4CurvePrinted: standPricing.popUp3x4CurvePrinted || {},
            popUp3x5StraightEmpty: standPricing.popUp3x5StraightEmpty || {},
            popUp3x5StraightPrinted: standPricing.popUp3x5StraightPrinted || {},
            popUp3x5CurveEmpty: standPricing.popUp3x5CurveEmpty || {},
            popUp3x5CurvePrinted: standPricing.popUp3x5CurvePrinted || {},
            popUpCounterEmpty: standPricing.popUpCounterEmpty || 0,
            popUpCounterPrinted: standPricing.popUpCounterPrinted || 0,
            popUpPromotionTableEmpty: standPricing.popUpPromotionTableEmpty || 0,
            popUpPromotionTablePrinted: standPricing.popUpPromotionTablePrinted || 0
        };

        let html = `
            <div class="bg-white p-6 rounded-xl border border-gray-200 space-y-6">
                <div class="border-b-2 border-gray-300 pb-4">
                    <h4 class="text-2xl font-bold text-gray-800 mb-2">إدارة تسعير الاستند</h4>
                    <p class="text-gray-600">قم بتحديد أسعار أنواع الاستند المختلفة</p>
                </div>
                
                <!-- Roll Up Banner Section (Collapsible) -->
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
                    <div class="flex items-center justify-between cursor-pointer" onclick="PricingAdmin.toggleRollUpBannerSection()">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-scroll text-5xl text-blue-600"></i>
                            <div>
                                <h5 class="text-xl font-bold text-gray-800 mb-1">رول اب بانر</h5>
                                <p class="text-sm text-gray-600">Roll Up Banner</p>
                            </div>
                        </div>
                        <i id="rollUpBannerToggleIcon" class="fas fa-chevron-down text-2xl text-blue-600 transition-transform"></i>
                    </div>
                    <div id="rollUpBannerDetails" class="hidden-section mt-4">
                        <div class="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                            <h6 class="font-bold text-gray-700 mb-3">أسعار المقاسات - فاضي (ج.م)</h6>
                            <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        `;

        // Render Roll Up Banner sizes (Empty)
        rollUpSizes.forEach(size => {
            const sizeKey = `${size.width}x${size.height}`;
            const price = defaultPrices.rollUpBannerEmpty[sizeKey] || 0;
            html += `
                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1">${size.width}×${size.height} سم</label>
                    <input type="number" 
                           id="rollUpBannerEmpty_${sizeKey}" 
                           step="0.01" 
                           min="0" 
                           value="${price}" 
                           class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                           data-stands-type="rollUpBannerEmpty" data-stands-size="${sizeKey}">
                </div>
            `;
        });

        html += `
                            </div>
                            <h6 class="font-bold text-gray-700 mb-3 mt-4">أسعار المقاسات - مطبوع (ج.م)</h6>
                            <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        `;

        // Render Roll Up Banner sizes (Printed)
        rollUpSizes.forEach(size => {
            const sizeKey = `${size.width}x${size.height}`;
            const price = defaultPrices.rollUpBannerPrinted[sizeKey] || 0;
            html += `
                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1">${size.width}×${size.height} سم</label>
                    <input type="number" 
                           id="rollUpBannerPrinted_${sizeKey}" 
                           step="0.01" 
                           min="0" 
                           value="${price}" 
                           class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                           onchange="PricingAdmin.saveRollUpPrice('rollUpBannerPrinted', '${sizeKey}')">
                </div>
            `;
        });

        html += `
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Roll Up Glossy Section (Collapsible) -->
                <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border-2 border-indigo-200">
                    <div class="flex items-center justify-between cursor-pointer" onclick="PricingAdmin.toggleRollUpGlossySection()">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-scroll text-5xl text-indigo-600"></i>
                            <div>
                                <h5 class="text-xl font-bold text-gray-800 mb-1">رول اب جلوسى</h5>
                                <p class="text-sm text-gray-600">Roll Up Glossy</p>
                            </div>
                        </div>
                        <i id="rollUpGlossyToggleIcon" class="fas fa-chevron-down text-2xl text-indigo-600 transition-transform"></i>
                    </div>
                    <div id="rollUpGlossyDetails" class="hidden-section mt-4">
                        <div class="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                            <h6 class="font-bold text-gray-700 mb-3">أسعار المقاسات - فاضي (ج.م)</h6>
                            <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        `;

        // Render Roll Up Glossy sizes (Empty)
        rollUpSizes.forEach(size => {
            const sizeKey = `${size.width}x${size.height}`;
            const price = defaultPrices.rollUpGlossyEmpty[sizeKey] || 0;
            html += `
                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1">${size.width}×${size.height} سم</label>
                    <input type="number" 
                           id="rollUpGlossyEmpty_${sizeKey}" 
                           step="0.01" 
                           min="0" 
                           value="${price}" 
                           class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                           onchange="PricingAdmin.saveRollUpPrice('rollUpGlossyEmpty', '${sizeKey}')">
                </div>
            `;
        });

        html += `
                            </div>
                            <h6 class="font-bold text-gray-700 mb-3 mt-4">أسعار المقاسات - مطبوع (ج.م)</h6>
                            <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        `;

        // Render Roll Up Glossy sizes (Printed)
        rollUpSizes.forEach(size => {
            const sizeKey = `${size.width}x${size.height}`;
            const price = defaultPrices.rollUpGlossyPrinted[sizeKey] || 0;
            html += `
                <div>
                    <label class="block text-xs font-bold text-gray-700 mb-1">${size.width}×${size.height} سم</label>
                    <input type="number" 
                           id="rollUpGlossyPrinted_${sizeKey}" 
                           step="0.01" 
                           min="0" 
                           value="${price}" 
                           class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                           onchange="PricingAdmin.saveRollUpPrice('rollUpGlossyPrinted', '${sizeKey}')">
                </div>
            `;
        });

        html += `
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Lamination Prices (Collapsible) -->
                <div class="bg-gradient-to-br from-yellow-50 to-orange-100 p-6 rounded-xl border-2 border-yellow-200">
                    <div class="flex items-center justify-between cursor-pointer" onclick="PricingAdmin.toggleLaminationSection()">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-layer-group text-5xl text-yellow-600"></i>
                            <div>
                                <h5 class="text-xl font-bold text-gray-800 mb-1">أسعار اللامينشن</h5>
                                <p class="text-sm text-gray-600">Lamination Prices (ج.م / م²)</p>
                            </div>
                        </div>
                        <i id="laminationToggleIcon" class="fas fa-chevron-down text-2xl text-yellow-600 transition-transform"></i>
                    </div>
                    <div id="laminationDetails" class="hidden-section mt-4">
                        <div class="bg-white p-4 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-2">لامينشن مط (ج.م / م²)</label>
                                <input type="number" 
                                       id="laminationMatte" 
                                       step="0.01" 
                                       min="0" 
                                       value="${defaultPrices.laminationMatte}" 
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none"
                                       onchange="PricingAdmin.saveLaminationPrice('laminationMatte')">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-2">لامينشن لامع (ج.م / م²)</label>
                                <input type="number" 
                                       id="laminationGlossy" 
                                       step="0.01" 
                                       min="0" 
                                       value="${defaultPrices.laminationGlossy}" 
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none"
                                       onchange="PricingAdmin.saveLaminationPrice('laminationGlossy')">
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- X-Banner Section (Collapsible) -->
                <div class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200">
                    <div class="flex items-center justify-between cursor-pointer" onclick="PricingAdmin.toggleXBannerSection()">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-flag text-5xl text-green-600"></i>
                            <div>
                                <h5 class="text-xl font-bold text-gray-800 mb-1">اكس بانر</h5>
                                <p class="text-sm text-gray-600">X-Banner</p>
                            </div>
                        </div>
                        <i id="xBannerToggleIcon" class="fas fa-chevron-down text-2xl text-green-600 transition-transform"></i>
                    </div>
                    <div id="xBannerDetails" class="hidden-section mt-4 space-y-4">
                        <!-- X-Banner Banner Section -->
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <h6 class="font-bold text-gray-700 mb-3">اكس بانر بانر</h6>
                            <div class="mt-4">
                                <h6 class="font-bold text-gray-700 mb-3">أسعار المقاسات - فاضي (ج.م)</h6>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 mb-1">60×160 سم</label>
                                        <input type="number" 
                                               id="xBannerBannerEmpty_60x160" 
                                               step="0.01" 
                                               min="0" 
                                               value="${defaultPrices.xBannerBannerEmpty?.['60x160'] || 0}" 
                                               class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                               onchange="PricingAdmin.saveXBannerSizePrice('xBannerBannerEmpty', '60x160')">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 mb-1">80×180 سم</label>
                                        <input type="number" 
                                               id="xBannerBannerEmpty_80x180" 
                                               step="0.01" 
                                               min="0" 
                                               value="${defaultPrices.xBannerBannerEmpty?.['80x180'] || 0}" 
                                               class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                               onchange="PricingAdmin.saveXBannerSizePrice('xBannerBannerEmpty', '80x180')">
                                    </div>
                                </div>
                            </div>
                            <div class="mt-4">
                                <h6 class="font-bold text-gray-700 mb-3">أسعار المقاسات - مطبوع (ج.م)</h6>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 mb-1">60×160 سم</label>
                                        <input type="number" 
                                               id="xBannerBannerPrinted_60x160" 
                                               step="0.01" 
                                               min="0" 
                                               value="${defaultPrices.xBannerBannerPrinted?.['60x160'] || 0}" 
                                               class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                               onchange="PricingAdmin.saveXBannerSizePrice('xBannerBannerPrinted', '60x160')">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 mb-1">80×180 سم</label>
                                        <input type="number" 
                                               id="xBannerBannerPrinted_80x180" 
                                               step="0.01" 
                                               min="0" 
                                               value="${defaultPrices.xBannerBannerPrinted?.['80x180'] || 0}" 
                                               class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                               onchange="PricingAdmin.saveXBannerSizePrice('xBannerBannerPrinted', '80x180')">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- X-Banner Glossy Section -->
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <h6 class="font-bold text-gray-700 mb-3">اكس بانر جلوسى</h6>
                            <div class="mt-4">
                                <h6 class="font-bold text-gray-700 mb-3">أسعار المقاسات - فاضي (ج.م)</h6>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 mb-1">60×160 سم</label>
                                        <input type="number" 
                                               id="xBannerGlossyEmpty_60x160" 
                                               step="0.01" 
                                               min="0" 
                                               value="${defaultPrices.xBannerGlossyEmpty?.['60x160'] || 0}" 
                                               class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                               onchange="PricingAdmin.saveXBannerSizePrice('xBannerGlossyEmpty', '60x160')">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 mb-1">80×180 سم</label>
                                        <input type="number" 
                                               id="xBannerGlossyEmpty_80x180" 
                                               step="0.01" 
                                               min="0" 
                                               value="${defaultPrices.xBannerGlossyEmpty?.['80x180'] || 0}" 
                                               class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                               onchange="PricingAdmin.saveXBannerSizePrice('xBannerGlossyEmpty', '80x180')">
                                    </div>
                                </div>
                            </div>
                            <div class="mt-4">
                                <h6 class="font-bold text-gray-700 mb-3">أسعار المقاسات - مطبوع (ج.م)</h6>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 mb-1">60×160 سم</label>
                                        <input type="number" 
                                               id="xBannerGlossyPrinted_60x160" 
                                               step="0.01" 
                                               min="0" 
                                               value="${defaultPrices.xBannerGlossyPrinted?.['60x160'] || 0}" 
                                               class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                               onchange="PricingAdmin.saveXBannerSizePrice('xBannerGlossyPrinted', '60x160')">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-gray-700 mb-1">80×180 سم</label>
                                        <input type="number" 
                                               id="xBannerGlossyPrinted_80x180" 
                                               step="0.01" 
                                               min="0" 
                                               value="${defaultPrices.xBannerGlossyPrinted?.['80x180'] || 0}" 
                                               class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                               onchange="PricingAdmin.saveXBannerSizePrice('xBannerGlossyPrinted', '80x180')">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-1 gap-6">

                    <!-- Pop Up (Collapsible) -->
                    <div class="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border-2 border-purple-200">
                        <div class="flex items-center justify-between cursor-pointer" onclick="PricingAdmin.togglePopUpSection()">
                            <div class="flex items-center gap-4">
                                <i class="fas fa-cube text-5xl text-purple-600"></i>
                                <div>
                                    <h5 class="text-xl font-bold text-gray-800 mb-1">بوب اب</h5>
                                    <p class="text-sm text-gray-600">Pop Up</p>
                                </div>
                            </div>
                            <i id="popUpToggleIcon" class="fas fa-chevron-down text-2xl text-purple-600 transition-transform"></i>
                        </div>
                        <div id="popUpDetails" class="hidden-section mt-4">
                            <div class="bg-white p-4 rounded-lg border border-gray-200 space-y-6">
                                <!-- Pop Up 2×3 Straight -->
                                <div class="border-b border-gray-200 pb-4">
                                    <h6 class="font-bold text-gray-700 mb-3">بوب اب 2×3 (استريت)</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp2x3StraightEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp2x3StraightEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp2x3StraightEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp2x3StraightPrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp2x3StraightPrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp2x3StraightPrinted')">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pop Up 2×3 Curve -->
                                <div class="border-b border-gray-200 pb-4">
                                    <h6 class="font-bold text-gray-700 mb-3">بوب اب 2×3 (كيرف)</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp2x3CurveEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp2x3CurveEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp2x3CurveEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp2x3CurvePrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp2x3CurvePrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp2x3CurvePrinted')">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pop Up 3×3 Straight -->
                                <div class="border-b border-gray-200 pb-4">
                                    <h6 class="font-bold text-gray-700 mb-3">بوب اب 3×3 (استريت)</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x3StraightEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x3StraightEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x3StraightEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x3StraightPrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x3StraightPrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x3StraightPrinted')">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pop Up 3×3 Curve -->
                                <div class="border-b border-gray-200 pb-4">
                                    <h6 class="font-bold text-gray-700 mb-3">بوب اب 3×3 (كيرف)</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x3CurveEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x3CurveEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x3CurveEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x3CurvePrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x3CurvePrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x3CurvePrinted')">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pop Up 3×4 Straight -->
                                <div class="border-b border-gray-200 pb-4">
                                    <h6 class="font-bold text-gray-700 mb-3">بوب اب 3×4 (استريت)</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x4StraightEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x4StraightEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x4StraightEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x4StraightPrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x4StraightPrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x4StraightPrinted')">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pop Up 3×4 Curve -->
                                <div class="border-b border-gray-200 pb-4">
                                    <h6 class="font-bold text-gray-700 mb-3">بوب اب 3×4 (كيرف)</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x4CurveEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x4CurveEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x4CurveEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x4CurvePrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x4CurvePrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x4CurvePrinted')">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pop Up 3×5 Straight -->
                                <div class="border-b border-gray-200 pb-4">
                                    <h6 class="font-bold text-gray-700 mb-3">بوب اب 3×5 (استريت)</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x5StraightEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x5StraightEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x5StraightEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x5StraightPrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x5StraightPrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x5StraightPrinted')">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pop Up 3×5 Curve -->
                                <div class="border-b border-gray-200 pb-4">
                                    <h6 class="font-bold text-gray-700 mb-3">بوب اب 3×5 (كيرف)</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x5CurveEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x5CurveEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x5CurveEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUp3x5CurvePrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUp3x5CurvePrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUp3x5CurvePrinted')">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Pop Up Counter -->
                                <div class="border-b border-gray-200 pb-4">
                                    <h6 class="font-bold text-gray-700 mb-3">بوب اب كاونتر</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUpCounterEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUpCounterEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUpCounterEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUpCounterPrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUpCounterPrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUpCounterPrinted')">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Promotion Table -->
                                <div>
                                    <h6 class="font-bold text-gray-700 mb-3">بروموشن تيبل</h6>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">فاضي (ج.م)</label>
                                            <input type="number" 
                                                   id="popUpPromotionTableEmpty" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUpPromotionTableEmpty || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUpPromotionTableEmpty')">
                                        </div>
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">مطبوع (ج.م)</label>
                                            <input type="number" 
                                                   id="popUpPromotionTablePrinted" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${defaultPrices.popUpPromotionTablePrinted || 0}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.savePopUpPrice('popUpPromotionTablePrinted')">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return html;
    },

    // Save Roll Up price
    async saveRollUpPrice(type, sizeKey) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(`${type}_${sizeKey}`);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            const db = this._getDb();
            
            // Load existing pricing
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // Initialize type object if not exists
            if (!pricing[type]) {
                pricing[type] = {};
            }
            
            // Update the specific size price
            pricing[type][sizeKey] = price;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving roll up price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Save lamination price
    async saveLaminationPrice(type) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(type);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            const db = this._getDb();
            
            // Load existing pricing
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // Update the lamination price
            pricing[type] = price;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving lamination price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Toggle sections
    toggleRollUpBannerSection() {
        const details = document.getElementById('rollUpBannerDetails');
        const icon = document.getElementById('rollUpBannerToggleIcon');
        if (details && icon) {
            details.classList.toggle('hidden-section');
            icon.classList.toggle('rotate-180');
        }
    },

    toggleRollUpGlossySection() {
        const details = document.getElementById('rollUpGlossyDetails');
        const icon = document.getElementById('rollUpGlossyToggleIcon');
        if (details && icon) {
            details.classList.toggle('hidden-section');
            icon.classList.toggle('rotate-180');
        }
    },

    toggleLaminationSection() {
        const details = document.getElementById('laminationDetails');
        const icon = document.getElementById('laminationToggleIcon');
        if (details && icon) {
            details.classList.toggle('hidden-section');
            icon.classList.toggle('rotate-180');
        }
    },

    toggleXBannerSection() {
        const details = document.getElementById('xBannerDetails');
        const icon = document.getElementById('xBannerToggleIcon');
        if (details && icon) {
            details.classList.toggle('hidden-section');
            icon.classList.toggle('rotate-180');
        }
    },

    togglePopUpSection() {
        const details = document.getElementById('popUpDetails');
        const icon = document.getElementById('popUpToggleIcon');
        if (details && icon) {
            details.classList.toggle('hidden-section');
            icon.classList.toggle('rotate-180');
        }
    },

    // Save Pop Up price
    async savePopUpPrice(type) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(type);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            const db = this._getDb();
            
            // Load existing pricing
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // Update the specific type price
            pricing[type] = price;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving Pop Up price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Save X-Banner size price
    async saveXBannerSizePrice(type, sizeKey) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(`${type}_${sizeKey}`);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            const db = this._getDb();
            
            // Load existing pricing
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // Initialize type object if not exists
            if (!pricing[type]) {
                pricing[type] = {};
            }
            
            // Update the specific size price
            pricing[type][sizeKey] = price;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving X-Banner size price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Save stand price (for Pop Up)
    async saveStandPrice(type) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(`stand_${type}`);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            const db = this._getDb();
            
            // Load existing pricing
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // Update the specific type price
            pricing[type] = price;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('stand_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving stand price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Seal category
    async renderSealCategory() {
        const db = this._getDb();
        
        // Load seal pricing from Firestore
        let sealPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('seal_pricing').get();
            if (pricingDoc.exists) {
                sealPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading seal pricing:', error);
        }

        const defaultPrices = {
            automaticMachine: sealPricing.automaticMachine || {},
            woodenHand: sealPricing.woodenHand || {},
            sealOnly: sealPricing.sealOnly || {}
        };

        // Automatic Machine sizes
        const automaticMachineSizes = [
            { key: 'rectangle_1.5x4', name: 'مستطيل 1.5 × 4 سم', type: 'rectangle' },
            { key: 'rectangle_2x5', name: 'مستطيل 2 × 5 سم', type: 'rectangle' },
            { key: 'rectangle_3x6', name: 'مستطيل 3 × 6 سم', type: 'rectangle' },
            { key: 'rectangle_3x7', name: 'مستطيل 3 × 7 سم', type: 'rectangle' },
            { key: 'oval_2x5', name: 'بيضاوي 2 × 5 سم', type: 'oval' },
            { key: 'oval_3x5', name: 'بيضاوي 3 × 5 سم', type: 'oval' },
            { key: 'oval_3x6', name: 'بيضاوي 3 × 6 سم', type: 'oval' },
            { key: 'square_4x4', name: 'مربع 4 × 4 سم', type: 'square' },
            { key: 'round_4x4', name: 'مدور 4 × 4 سم', type: 'round' },
            { key: 'square_5x5', name: 'مربع 5 × 5 سم', type: 'square' },
            { key: 'round_5x5', name: 'مدور 5 × 5 سم', type: 'round' },
            { key: 'flash_1.5x4', name: 'ختم فلاشة أو جيب 1.5 × 4 سم', type: 'flash' },
            { key: 'date_arabic', name: 'ختم تاريخ (عربي)', type: 'date' },
            { key: 'date_english', name: 'ختم تاريخ (إنجليزي)', type: 'date' },
            { key: 'date_company', name: 'ختم تاريخ + اسم الشركة', type: 'date' }
        ];

        let html = `
            <div class="space-y-6">
                <!-- Automatic Machine Section (Collapsible) -->
                <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
                    <div class="flex items-center justify-between cursor-pointer" onclick="PricingAdmin.toggleAutomaticMachineSection()">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-cog text-5xl text-blue-600"></i>
                            <div>
                                <h5 class="text-xl font-bold text-gray-800 mb-1">ماكينة اتوماتيك</h5>
                                <p class="text-sm text-gray-600">Automatic Machine</p>
                            </div>
                        </div>
                        <i id="automaticMachineToggleIcon" class="fas fa-chevron-down text-2xl text-blue-600 transition-transform"></i>
                    </div>
                    <div id="automaticMachineDetails" class="mt-4">
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <h6 class="font-bold text-gray-700 mb-3">أسعار المقاسات (ج.م)</h6>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                ${automaticMachineSizes.map(size => {
                                    const price = defaultPrices.automaticMachine[size.key] || 0;
                                    return `
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">${size.name}</label>
                                            <input type="number" 
                                                   id="seal_automaticMachine_${size.key}" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${price}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.saveSealSizePrice('automaticMachine', '${size.key}')">
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Wooden Hand Section (Collapsible) -->
                <div class="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-xl border-2 border-amber-200">
                    <div class="flex items-center justify-between cursor-pointer" onclick="PricingAdmin.toggleWoodenHandSection()">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-hammer text-5xl text-amber-600"></i>
                            <div>
                                <h5 class="text-xl font-bold text-gray-800 mb-1">يد خشب</h5>
                                <p class="text-sm text-gray-600">Wooden Hand</p>
                            </div>
                        </div>
                        <i id="woodenHandToggleIcon" class="fas fa-chevron-down text-2xl text-amber-600 transition-transform"></i>
                    </div>
                    <div id="woodenHandDetails" class="mt-4">
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <h6 class="font-bold text-gray-700 mb-3">أسعار المقاسات (ج.م)</h6>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                ${automaticMachineSizes.filter(size => 
                                    ['rectangle_1.5x4', 'rectangle_2x5', 'rectangle_3x6', 'rectangle_3x7', 
                                     'oval_2x5', 'oval_3x6', 'square_4x4', 'round_4x4', 
                                     'square_5x5', 'round_5x5'].includes(size.key)
                                ).map(size => {
                                    const price = defaultPrices.woodenHand[size.key] || 0;
                                    return `
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">${size.name}</label>
                                            <input type="number" 
                                                   id="seal_woodenHand_${size.key}" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${price}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.saveSealSizePrice('woodenHand', '${size.key}')">
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Seal Only Section (Collapsible) -->
                <div class="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border-2 border-green-200">
                    <div class="flex items-center justify-between cursor-pointer" onclick="PricingAdmin.toggleSealOnlySection()">
                        <div class="flex items-center gap-4">
                            <i class="fas fa-stamp text-5xl text-green-600"></i>
                            <div>
                                <h5 class="text-xl font-bold text-gray-800 mb-1">سريل فقط</h5>
                                <p class="text-sm text-gray-600">Seal Only</p>
                            </div>
                        </div>
                        <i id="sealOnlyToggleIcon" class="fas fa-chevron-down text-2xl text-green-600 transition-transform"></i>
                    </div>
                    <div id="sealOnlyDetails" class="mt-4">
                        <div class="bg-white p-4 rounded-lg border border-gray-200">
                            <h6 class="font-bold text-gray-700 mb-3">أسعار المقاسات (ج.م)</h6>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                ${automaticMachineSizes.filter(size => 
                                    ['rectangle_1.5x4', 'rectangle_2x5', 'rectangle_3x6', 'rectangle_3x7', 
                                     'oval_2x5', 'oval_3x5', 'oval_3x6', 'square_4x4', 'round_4x4', 
                                     'round_5x5', 'flash_1.5x4', 'date_company'].includes(size.key)
                                ).map(size => {
                                    const price = defaultPrices.sealOnly[size.key] || 0;
                                    return `
                                        <div>
                                            <label class="block text-xs font-bold text-gray-700 mb-1">${size.name}</label>
                                            <input type="number" 
                                                   id="seal_sealOnly_${size.key}" 
                                                   step="0.01" 
                                                   min="0" 
                                                   value="${price}" 
                                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm"
                                                   onchange="PricingAdmin.saveSealSizePrice('sealOnly', '${size.key}')">
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return html;
    },

    // Toggle Automatic Machine section
    toggleAutomaticMachineSection() {
        const details = document.getElementById('automaticMachineDetails');
        const icon = document.getElementById('automaticMachineToggleIcon');
        if (details && icon) {
            details.classList.toggle('hidden-section');
            icon.classList.toggle('rotate-180');
        }
    },

    // Toggle Wooden Hand section
    toggleWoodenHandSection() {
        const details = document.getElementById('woodenHandDetails');
        const icon = document.getElementById('woodenHandToggleIcon');
        if (details && icon) {
            details.classList.toggle('hidden-section');
            icon.classList.toggle('rotate-180');
        }
    },

    // Toggle Seal Only section
    toggleSealOnlySection() {
        const details = document.getElementById('sealOnlyDetails');
        const icon = document.getElementById('sealOnlyToggleIcon');
        if (details && icon) {
            details.classList.toggle('hidden-section');
            icon.classList.toggle('rotate-180');
        }
    },

    // Save seal price
    async saveSealPrice(type) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(`seal_${type}`);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            const db = this._getDb();
            
            // Load existing pricing
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('seal_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // Update the specific type price
            pricing[type] = price;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('seal_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving seal price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Save seal size price (for automatic machine)
    async saveSealSizePrice(type, sizeKey) {
        if (AppState.currentUser?.role !== 'admin') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لتعديل الأسعار', 'error');
            return;
        }
        
        const input = document.getElementById(`seal_${type}_${sizeKey}`);
        if (!input) return;
        
        const price = parseFloat(input.value) || 0;
        
        try {
            const db = this._getDb();
            
            // Load existing pricing
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('seal_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // Initialize type object if not exists
            if (!pricing[type]) {
                pricing[type] = {};
            }
            
            // Update the specific size price
            pricing[type][sizeKey] = price;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('seal_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving seal size price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Business Card Category — separate sell/cost collections, quantity-based, no global markup
    async renderBusinessCardCategory(pricingMode) {
        if (typeof BusinessCardsPricing === 'undefined') {
            return '<div class="text-red-600">خطأ: وحدة BusinessCardsPricing غير متاحة. تأكد من تحميل business-cards-pricing.js</div>';
        }
        if (pricingMode !== 'selling' && pricingMode !== 'cost') pricingMode = 'selling';
        this.currentBusinessCardPricingMode = pricingMode;

        const db = this._getDb();
        const sellColl = BusinessCardsPricing.SELL_COLLECTION;
        const costColl = BusinessCardsPricing.COST_COLLECTION;
        const collection = pricingMode === 'selling' ? sellColl : costColl;
        const configColl = this.COLLECTION_NAME;

        // Load config (paper types, quantities, size modifiers)
        let config = {};
        try {
            const configDoc = await this._getColl(configColl).doc(BusinessCardsPricing.CONFIG_DOC).get();
            if (configDoc.exists) config = configDoc.data();
        } catch (e) { console.warn('Business cards config load error:', e); }

        const fromConfig = config.paperTypes || [];
        const existingIds = new Set(fromConfig.map(p => (p.id || p.key)));
        const defaultTypes = BusinessCardsPricing.DEFAULT_PAPER_TYPES || [];
        const missingDefaults = defaultTypes.filter(p => !existingIds.has(p.id));
        const paperTypes = fromConfig.length ? [...fromConfig, ...missingDefaults] : defaultTypes;
        const quantities = config.quantities || BusinessCardsPricing.DEFAULT_QUANTITIES;
        const paperTypeLabels = {};
        paperTypes.forEach(p => { paperTypeLabels[p.id] = p.nameAr || p.id; });

        // Load prices from sell or cost collection
        const byDoc = {};
        try {
            const snap = await this._getColl(collection).get();
            snap.docs.forEach(d => { byDoc[d.id] = d.data(); });
        } catch (e) { console.warn('Business cards prices load error:', e); }

        const userRole = AppState.currentUser?.role || 'employee';
        const canEditSell = userRole === 'admin' || userRole === 'manager';
        const canEditCost = typeof PricingService !== 'undefined' && PricingService.canEditCostPrice(userRole);
        const canEdit = pricingMode === 'selling' ? canEditSell : canEditCost;

        const isSell = pricingMode === 'selling';
        const labelPrice = isSell ? 'سعر البيع' : 'سعر التكلفة';
        const inputClass = isSell ? 'border-green-300' : 'border-red-300';

        let html = '<div class="bg-white p-6 rounded-xl border border-gray-200 space-y-6">';
        html += '<p class="text-gray-600 mb-4">أسعار لكل نوع ورق وعدد (وجه واحد / وجهين). الحجم الأساسي: 9×5 سم. المقاسات الأخرى تُطبق من خلال معدلات الإضافة.</p>';

        paperTypes.forEach(paper => {
            const paperId = paper.id || paper.key || paper;
            const paperName = paper.nameAr || paper.name || paperTypeLabels[paperId] || paperId;
            html += `<div class="border border-gray-200 rounded-xl p-4 mb-6">`;
            html += `<h4 class="text-lg font-bold text-gray-800 mb-3">${paperName}</h4>`;
            html += '<div class="overflow-x-auto"><table class="w-full border border-gray-300 rounded-lg text-right"><thead><tr class="bg-gray-100">';
            html += '<th class="p-2 border-b">العدد</th>';
            html += `<th class="p-2 border-b">${labelPrice} — وجه واحد</th>`;
            html += `<th class="p-2 border-b">${labelPrice} — وجهين</th>`;
            html += '</tr></thead><tbody>';

            quantities.forEach(qty => {
                const qtyStr = String(qty);
                const docIdSingle = BusinessCardsPricing.priceDocId(paperId, qtyStr, 'single');
                const docIdDouble = BusinessCardsPricing.priceDocId(paperId, qtyStr, 'double');
                const valSingle = (byDoc[docIdSingle]?.price ?? '') || '';
                const valDouble = (byDoc[docIdDouble]?.price ?? '') || '';

                html += `<tr class="border-b border-gray-200">
                    <td class="p-2 font-medium">${qty} كارت</td>
                    <td class="p-1"><input type="number" step="0.01" min="0" data-paper="${paperId}" data-qty="${qtyStr}" data-sides="single" value="${valSingle}" ${!canEdit ? 'readonly' : ''} class="w-full border-2 ${inputClass} p-2 rounded text-sm"></td>
                    <td class="p-1"><input type="number" step="0.01" min="0" data-paper="${paperId}" data-qty="${qtyStr}" data-sides="double" value="${valDouble}" ${!canEdit ? 'readonly' : ''} class="w-full border-2 ${inputClass} p-2 rounded text-sm"></td>
                </tr>`;
            });

            html += '</tbody></table></div></div>';
        });

        html += `<div class="flex gap-4 mt-4">
            <button type="button" onclick="PricingAdmin.saveBusinessCardPrices('${pricingMode}')" class="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold" ${!canEdit ? 'disabled' : ''}>
                <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
            </button>
            <button type="button" onclick="PricingAdmin.addBusinessCardPaperType()" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700" ${!(userRole === 'admin' || userRole === 'manager') ? 'disabled' : ''}>
                إضافة نوع ورق
            </button>
        </div>`;
        html += '</div>';
        return html;
    },

    async saveBusinessCardPrices(pricingMode) {
        if (typeof BusinessCardsPricing === 'undefined') return;
        const mode = pricingMode || this.currentBusinessCardPricingMode || 'selling';
        const userRole = AppState.currentUser?.role || 'employee';
        if (mode === 'selling' && userRole !== 'admin' && userRole !== 'manager') {
            Swal.fire('خطأ', 'ليس لديك صلاحية لحفظ أسعار البيع', 'error');
            return;
        }
        if (mode === 'cost' && typeof PricingService !== 'undefined' && !PricingService.canEditCostPrice(userRole)) {
            Swal.fire('خطأ', 'ليس لديك صلاحية لحفظ أسعار التكلفة', 'error');
            return;
        }
        const db = this._getDb();
        const collection = mode === 'selling' ? BusinessCardsPricing.SELL_COLLECTION : BusinessCardsPricing.COST_COLLECTION;
        const inputs = document.querySelectorAll('input[data-paper][data-qty][data-sides]');
        const batch = db.batch();
        let count = 0;
        inputs.forEach(inp => {
            const paperId = inp.getAttribute('data-paper');
            const qty = inp.getAttribute('data-qty');
            const sides = inp.getAttribute('data-sides');
            const val = parseFloat(inp.value) || 0;
            const docId = BusinessCardsPricing.priceDocId(paperId, qty, sides);
            const ref = this._getColl(collection).doc(docId);
            batch.set(ref, {
                categoryId: 'BusinessCard',
                paperTypeId: paperId,
                quantity: parseInt(qty, 10),
                sides,
                price: val,
                updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
            });
            count++;
        });
        try {
            await batch.commit();
            Swal.fire('تم', `تم حفظ ${count} سعر بنجاح`, 'success');
            this.render('BusinessCard', mode);
        } catch (e) {
            console.error('Error saving business card prices:', e);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    addBusinessCardPaperType() {
        const userRole = AppState.currentUser?.role || 'employee';
        if (userRole !== 'admin' && userRole !== 'manager') return;
        Swal.fire({
            title: 'إضافة نوع ورق جديد',
            html: '<input id="swal-bc-id" class="swal2-input w-full" placeholder="المفتاح (مثل: 400_gsm)"><input id="swal-bc-name" class="swal2-input w-full mt-2" placeholder="الاسم بالعربي (مثل: 400 جرام)">',
            showCancelButton: true,
            confirmButtonText: 'إضافة',
            cancelButtonText: 'إلغاء'
        }).then(async (result) => {
            if (!result.isConfirmed) return;
            const id = (document.getElementById('swal-bc-id')?.value || '').trim().replace(/\s+/g, '_') || 'custom_' + Date.now();
            const nameAr = (document.getElementById('swal-bc-name')?.value || '').trim() || id;
            if (!id) { Swal.fire('خطأ', 'أدخل المفتاح', 'error'); return; }
            try {
                const db = this._getDb();
                const configRef = this._getColl(this.COLLECTION_NAME).doc(BusinessCardsPricing.CONFIG_DOC);
                const doc = await configRef.get();
                const config = doc.exists ? doc.data() : {};
                const paperTypes = config.paperTypes || BusinessCardsPricing.DEFAULT_PAPER_TYPES;
                if (paperTypes.some(p => (p.id || p.key) === id)) {
                    Swal.fire('تنبيه', 'نوع الورق موجود مسبقاً', 'warning');
                    return;
                }
                paperTypes.push({ id, nameAr });
                await configRef.set({ ...config, paperTypes }, { merge: true });
                Swal.fire('تم', 'تمت إضافة نوع الورق. سيظهر عند إعادة تحميل الصفحة.', 'success');
                this.render('BusinessCard', this.currentBusinessCardPricingMode || 'selling');
            } catch (e) {
                console.error(e);
                Swal.fire('خطأ', 'فشل الإضافة', 'error');
            }
        });
    },

    // Render Tableau Category
    async renderTableauCategory() {
        const db = this._getDb();
        
        // Load tableau pricing from Firestore
        let tableauPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('tableau_pricing').get();
            if (pricingDoc.exists) {
                tableauPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading tableau pricing:', error);
        }
        
        const sizes = [
            { key: '20x30', name: 'تابلوة 20×30' },
            { key: '30x40', name: 'تابلوة 30×40' },
            { key: '40x50', name: 'تابلوة 40×50' },
            { key: '50x60', name: 'تابلوة 50×60' },
            { key: '50x70', name: 'تابلوة 50×70' }
        ];
        
        let pricingHTML = '';
        
        sizes.forEach(size => {
            const sizePricing = tableauPricing[size.key] || {};
            
            // Support both old format (number) and new format (object)
            const straightData = typeof sizePricing === 'object' ? (sizePricing.straight || {}) : {};
            const straightPrice = typeof straightData === 'object' ? (straightData.price || 0) : (straightData || 0);
            const straightProductionCost = typeof straightData === 'object' ? (straightData.productionCost || 0) : (straightPrice * 0.7);
            
            const beveledData = typeof sizePricing === 'object' ? (sizePricing.beveled || {}) : {};
            const beveledPrice = typeof beveledData === 'object' ? (beveledData.price || 0) : (beveledData || 0);
            const beveledProductionCost = typeof beveledData === 'object' ? (beveledData.productionCost || 0) : (beveledPrice * 0.7);
            
            pricingHTML += `
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">${size.name}</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">خشب عدل</label>
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${straightPrice}" 
                                           onchange="PricingAdmin.saveTableauPrice('${size.key}', 'straight', 'price', this.value)"
                                           class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${straightProductionCost}" 
                                           onchange="PricingAdmin.saveTableauPrice('${size.key}', 'straight', 'productionCost', this.value)"
                                           class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">خشب مشطوف</label>
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${beveledPrice}" 
                                           onchange="PricingAdmin.saveTableauPrice('${size.key}', 'beveled', 'price', this.value)"
                                           class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${beveledProductionCost}" 
                                           onchange="PricingAdmin.saveTableauPrice('${size.key}', 'beveled', 'productionCost', this.value)"
                                           class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير التابلوةات</h3>
                        <p class="text-gray-600">قم بتحديد الأسعار لكل مقاس ونوع الخشب</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                ${pricingHTML}
            </div>
        `;
    },

    // Save tableau price
    async saveTableauPrice(sizeKey, woodType, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('tableau_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // Initialize size object if not exists
            if (!pricing[sizeKey]) {
                pricing[sizeKey] = {};
            }
            
            // If it's a number (old format), convert to object
            if (typeof pricing[sizeKey][woodType] === 'number') {
                const oldPrice = pricing[sizeKey][woodType];
                pricing[sizeKey][woodType] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize wood type object if not exists
            if (!pricing[sizeKey][woodType]) {
                pricing[sizeKey][woodType] = {};
            }
            
            // Update the specific price or production cost
            pricing[sizeKey][woodType][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('tableau_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving tableau price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render DTF Category
    async renderDTFCategory() {
        const db = this._getDb();
        
        // Load DTF pricing from Firestore
        let dtfPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('dtf_pricing').get();
            if (pricingDoc.exists) {
                dtfPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading DTF pricing:', error);
        }
        
        // Support both old format (number) and new format (object)
        const pricePerMeterData = dtfPricing.pricePerMeter || {};
        const pricePerMeter = typeof pricePerMeterData === 'object' ? (pricePerMeterData.price || 0) : (pricePerMeterData || 0);
        const productionCostPerMeter = typeof pricePerMeterData === 'object' ? (pricePerMeterData.productionCost || 0) : (pricePerMeter * 0.7);
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير طباعة DTF</h3>
                        <p class="text-gray-600">قم بتحديد السعر للمتر الطولي</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                    <p class="text-sm text-gray-700 mb-2">
                        <i class="fas fa-info-circle text-blue-600 ml-2"></i>
                        <strong>معلومات:</strong>
                    </p>
                    <ul class="text-sm text-gray-600 space-y-1 mr-4">
                        <li>• العرض ثابت: 60 سم</li>
                        <li>• المتر الواحد = 100 سم (طول) × 60 سم (عرض)</li>
                        <li>• يتم التسعير على أساس المتر الطولي</li>
                    </ul>
                </div>
                
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-lg font-bold text-gray-700 mb-2">سعر البيع للمتر الطولي</label>
                            <div class="flex items-center gap-4">
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${pricePerMeter}" 
                                       onchange="PricingAdmin.saveDTFPrice('price', this.value)"
                                       class="flex-1 border border-gray-300 p-4 rounded-lg focus:border-brandGold outline-none text-lg">
                                <span class="text-lg font-bold text-gray-700">ج.م / متر</span>
                            </div>
                        </div>
                        <div>
                            <label class="block text-lg font-bold text-gray-700 mb-2">سعر التنفيذ للمتر الطولي</label>
                            <div class="flex items-center gap-4">
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${productionCostPerMeter}" 
                                       onchange="PricingAdmin.saveDTFPrice('productionCost', this.value)"
                                       class="flex-1 border border-gray-300 p-4 rounded-lg focus:border-brandGold outline-none text-lg">
                                <span class="text-lg font-bold text-gray-700">ج.م / متر</span>
                            </div>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">مثال: إذا كان السعر 50 ج.م للمتر، فمترين = 100 ج.م</p>
                </div>
            </div>
        `;
    },

    // Save DTF price
    async saveDTFPrice(priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('dtf_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // If pricePerMeter is a number (old format), convert to object
            if (typeof pricing.pricePerMeter === 'number') {
                const oldPrice = pricing.pricePerMeter;
                pricing.pricePerMeter = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize pricePerMeter object if not exists
            if (!pricing.pricePerMeter) {
                pricing.pricePerMeter = {};
            }
            
            // Update the specific price or production cost
            pricing.pricePerMeter[priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('dtf_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving DTF price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render DTF UV Category
    async renderDTFUVCategory() {
        const db = this._getDb();
        
        // Load DTF UV pricing from Firestore
        let dtfUVPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('dtf_uv_pricing').get();
            if (pricingDoc.exists) {
                dtfUVPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading DTF UV pricing:', error);
        }
        
        // Support both old format (number) and new format (object)
        const pricePerMeterData = dtfUVPricing.pricePerMeter || {};
        const pricePerMeter = typeof pricePerMeterData === 'object' ? (pricePerMeterData.price || 0) : (pricePerMeterData || 0);
        const productionCostPerMeter = typeof pricePerMeterData === 'object' ? (pricePerMeterData.productionCost || 0) : (pricePerMeter * 0.7);
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير طباعة DTF UV</h3>
                        <p class="text-gray-600">قم بتحديد السعر للمتر الطولي</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                    <p class="text-sm text-gray-700 mb-2">
                        <i class="fas fa-info-circle text-blue-600 ml-2"></i>
                        <strong>معلومات:</strong>
                    </p>
                    <ul class="text-sm text-gray-600 space-y-1 mr-4">
                        <li>• العرض ثابت: 60 سم</li>
                        <li>• المتر الواحد = 100 سم (طول) × 60 سم (عرض)</li>
                        <li>• يتم التسعير على أساس المتر الطولي</li>
                        <li>• السعر = الطول × سعر المتر</li>
                    </ul>
                </div>
                
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-lg font-bold text-gray-700 mb-2">سعر البيع للمتر الطولي</label>
                            <div class="flex items-center gap-4">
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${pricePerMeter}" 
                                       onchange="PricingAdmin.saveDTFUVPrice('price', this.value)"
                                       class="flex-1 border border-gray-300 p-4 rounded-lg focus:border-brandGold outline-none text-lg">
                                <span class="text-lg font-bold text-gray-700">ج.م / متر</span>
                            </div>
                        </div>
                        <div>
                            <label class="block text-lg font-bold text-gray-700 mb-2">سعر التنفيذ للمتر الطولي</label>
                            <div class="flex items-center gap-4">
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${productionCostPerMeter}" 
                                       onchange="PricingAdmin.saveDTFUVPrice('productionCost', this.value)"
                                       class="flex-1 border border-gray-300 p-4 rounded-lg focus:border-brandGold outline-none text-lg">
                                <span class="text-lg font-bold text-gray-700">ج.م / متر</span>
                            </div>
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">مثال: إذا كان السعر 50 ج.م للمتر، فمترين = 100 ج.م</p>
                </div>
            </div>
        `;
    },

    // Save DTF UV price
    async saveDTFUVPrice(priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('dtf_uv_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // If pricePerMeter is a number (old format), convert to object
            if (typeof pricing.pricePerMeter === 'number') {
                const oldPrice = pricing.pricePerMeter;
                pricing.pricePerMeter = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize pricePerMeter object if not exists
            if (!pricing.pricePerMeter) {
                pricing.pricePerMeter = {};
            }
            
            // Update the specific price or production cost
            pricing.pricePerMeter[priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('dtf_uv_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving DTF UV price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Flag Category
    async renderFlagCategory() {
        const db = this._getDb();
        
        // Load flag pricing from Firestore
        let flagPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('flag_pricing').get();
            if (pricingDoc.exists) {
                flagPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading flag pricing:', error);
        }
        
        const fixedPriceProducts = [
            { key: 'flag_2.5_feather', name: 'علم 2.5 متر (ريشة)' },
            { key: 'stand_only_2.5_feather', name: 'ستان فقط 2.5 متر (ريشة)' },
            { key: 'flag_4_feather', name: 'علم 4 متر (ريشة)' },
            { key: 'stand_only_4_feather', name: 'ستان فقط 4 متر (ريشة)' },
            { key: 'flag_pole', name: 'علم سارى' },
            { key: 'flag_wave', name: 'علم تلويح' },
            { key: 'flag_desk_single', name: 'علم مكتب فردى' },
            { key: 'flag_desk_double', name: 'علم مكتب مجوز' },
            { key: 'flag_desk_large', name: 'علم مكتب كبير' },
            { key: 'base_feather_only', name: 'قاعدة علم ريشة فقط' },
            { key: 'pole_feather_only', name: 'سارى علم ريشة فقط' }
        ];
        
        const customStandPricePerSqm = flagPricing.customStandPricePerSqm || 0;
        
        let pricingHTML = '';
        
        // Fixed price products
        fixedPriceProducts.forEach(product => {
            // Support both old format (number) and new format (object)
            const productData = flagPricing[product.key] || {};
            const price = typeof productData === 'object' ? (productData.price || 0) : (productData || 0);
            const productionCost = typeof productData === 'object' ? (productData.productionCost || 0) : (price * 0.7);
            
            pricingHTML += `
                <div class="bg-white p-4 rounded-xl border border-gray-200 mb-4">
                    <label class="text-lg font-bold text-gray-700 mb-3 block">${product.name}</label>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                            <div class="flex items-center gap-2">
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${price}" 
                                       onchange="PricingAdmin.saveFlagPrice('${product.key}', 'price', this.value)"
                                       class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                <span class="text-sm font-bold text-gray-700">ج.م</span>
                            </div>
                        </div>
                        <div>
                            <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                            <div class="flex items-center gap-2">
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${productionCost}" 
                                       onchange="PricingAdmin.saveFlagPrice('${product.key}', 'productionCost', this.value)"
                                       class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                <span class="text-sm font-bold text-gray-700">ج.م</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير الأعلام</h3>
                        <p class="text-gray-600">قم بتحديد الأسعار لكل نوع علم</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <!-- Fixed Price Products -->
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">المنتجات بسعر ثابت</h4>
                    ${pricingHTML}
                </div>
                
                <!-- Custom Stand (with formula) -->
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">ستان ترجال (حسب المقاس)</h4>
                    <div class="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-4">
                        <p class="text-sm text-gray-700 mb-2">
                            <i class="fas fa-calculator text-yellow-600 ml-2"></i>
                            <strong>المعادلة:</strong> طول × عرض × سعر = الإجمالي
                        </p>
                    </div>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">سعر البيع للمتر²</label>
                            <div class="flex items-center gap-3">
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${typeof customStandPricePerSqm === 'object' ? (customStandPricePerSqm.price || 0) : (customStandPricePerSqm || 0)}" 
                                       onchange="PricingAdmin.saveFlagPrice('customStandPricePerSqm', 'price', this.value)"
                                       class="w-32 border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                                <span class="text-lg font-bold text-gray-700">ج.م / م²</span>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">سعر التنفيذ للمتر²</label>
                            <div class="flex items-center gap-3">
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${typeof customStandPricePerSqm === 'object' ? (customStandPricePerSqm.productionCost || 0) : (customStandPricePerSqm * 0.7)}" 
                                       onchange="PricingAdmin.saveFlagPrice('customStandPricePerSqm', 'productionCost', this.value)"
                                       class="w-32 border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                                <span class="text-lg font-bold text-gray-700">ج.م / م²</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Save flag price
    async saveFlagPrice(productKey, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('flag_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // If it's a number (old format), convert to object
            if (typeof pricing[productKey] === 'number') {
                const oldPrice = pricing[productKey];
                pricing[productKey] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize product object if not exists
            if (!pricing[productKey]) {
                pricing[productKey] = {};
            }
            
            // Update the specific price or production cost
            pricing[productKey][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('flag_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving flag price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render T-Shirt Category
    async renderTShirtCategory() {
        const db = this._getDb();
        
        // Load T-shirt pricing from Firestore
        let tshirtPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('tshirt_pricing').get();
            if (pricingDoc.exists) {
                tshirtPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading T-shirt pricing:', error);
        }
        
        const tshirtTypes = [
            { key: 'basic_half_sleeve', name: 'بيزك نص كم' },
            { key: 'basic_full_sleeve', name: 'بيزك كم' },
            { key: 'polo_half_sleeve', name: 'بولو نص كم' },
            { key: 'polo_full_sleeve', name: 'بولو كم' },
            { key: 'hoodie_egyptian', name: 'هودى مصرى' },
            { key: 'hoodie_imported', name: 'هودى مستورد' }
        ];
        
        let pricingHTML = '';
        
        tshirtTypes.forEach(tshirt => {
            // Support both old format (number) and new format (object)
            const basePriceData = tshirtPricing[tshirt.key]?.basePrice || tshirtPricing[tshirt.key] || {};
            const basePrice = typeof basePriceData === 'object' ? (basePriceData.price || 0) : (basePriceData || 0);
            const basePriceProductionCost = typeof basePriceData === 'object' ? (basePriceData.productionCost || 0) : (basePrice * 0.7);
            
            const printSingleData = tshirtPricing[tshirt.key]?.printSingle || {};
            const printSingle = typeof printSingleData === 'object' ? (printSingleData.price || 0) : (printSingleData || 0);
            const printSingleProductionCost = typeof printSingleData === 'object' ? (printSingleData.productionCost || 0) : (printSingle * 0.7);
            
            const printDoubleData = tshirtPricing[tshirt.key]?.printDouble || {};
            const printDouble = typeof printDoubleData === 'object' ? (printDoubleData.price || 0) : (printDoubleData || 0);
            const printDoubleProductionCost = typeof printDoubleData === 'object' ? (printDoubleData.productionCost || 0) : (printDouble * 0.7);
            
            pricingHTML += `
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">${tshirt.name}</h4>
                    
                    <!-- Base Price -->
                    <div class="mb-4">
                        <label class="block text-sm font-bold text-gray-700 mb-2">سعر التيشرت</label>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                <div class="flex items-center gap-2">
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${basePrice}" 
                                           onchange="PricingAdmin.saveTShirtPrice('${tshirt.key}', 'basePrice', 'price', this.value)"
                                           class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                    <span class="text-xs font-bold text-gray-700">ج.م</span>
                                </div>
                            </div>
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                <div class="flex items-center gap-2">
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${basePriceProductionCost}" 
                                           onchange="PricingAdmin.saveTShirtPrice('${tshirt.key}', 'basePrice', 'productionCost', this.value)"
                                           class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                    <span class="text-xs font-bold text-gray-700">ج.م</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Printing Prices -->
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">طباعة وجه واحد</label>
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${printSingle}" 
                                               onchange="PricingAdmin.saveTShirtPrice('${tshirt.key}', 'printSingle', 'price', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${printSingleProductionCost}" 
                                               onchange="PricingAdmin.saveTShirtPrice('${tshirt.key}', 'printSingle', 'productionCost', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">طباعة وجه وظهر</label>
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${printDouble}" 
                                               onchange="PricingAdmin.saveTShirtPrice('${tshirt.key}', 'printDouble', 'price', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${printDoubleProductionCost}" 
                                               onchange="PricingAdmin.saveTShirtPrice('${tshirt.key}', 'printDouble', 'productionCost', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Press prices (global for all types)
        const pressSingleData = tshirtPricing.pressSingle || {};
        const pressSingle = typeof pressSingleData === 'object' ? (pressSingleData.price || 0) : (pressSingleData || 0);
        const pressSingleProductionCost = typeof pressSingleData === 'object' ? (pressSingleData.productionCost || 0) : (pressSingle * 0.7);
        
        const pressDoubleData = tshirtPricing.pressDouble || {};
        const pressDouble = typeof pressDoubleData === 'object' ? (pressDoubleData.price || 0) : (pressDoubleData || 0);
        const pressDoubleProductionCost = typeof pressDoubleData === 'object' ? (pressDoubleData.productionCost || 0) : (pressDouble * 0.7);
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير التيشرتات</h3>
                        <p class="text-gray-600">قم بتحديد الأسعار لكل نوع تيشرت والطباعة والإضافات</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                ${pricingHTML}
                
                <!-- Press Prices (Global) -->
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">الإضافات (تنطبق على جميع الأنواع)</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">كبس التيشرت وجه واحد</label>
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${pressSingle}" 
                                               onchange="PricingAdmin.saveTShirtPrice('pressSingle', null, 'price', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${pressSingleProductionCost}" 
                                               onchange="PricingAdmin.saveTShirtPrice('pressSingle', null, 'productionCost', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">كبس التيشرت وجهين</label>
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${pressDouble}" 
                                               onchange="PricingAdmin.saveTShirtPrice('pressDouble', null, 'price', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${pressDoubleProductionCost}" 
                                               onchange="PricingAdmin.saveTShirtPrice('pressDouble', null, 'productionCost', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Save T-shirt price
    async saveTShirtPrice(key1, key2, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('tshirt_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            if (key2 === null) {
                // Global prices (pressSingle, pressDouble)
                // If it's a number (old format), convert to object
                if (typeof pricing[key1] === 'number') {
                    const oldPrice = pricing[key1];
                    pricing[key1] = {
                        price: oldPrice,
                        productionCost: oldPrice * 0.7
                    };
                }
                if (!pricing[key1]) {
                    pricing[key1] = {};
                }
                pricing[key1][priceType] = parseFloat(value) || 0;
            } else {
                // Type-specific prices
                if (!pricing[key1]) {
                    pricing[key1] = {};
                }
                // If it's a number (old format), convert to object
                if (typeof pricing[key1][key2] === 'number') {
                    const oldPrice = pricing[key1][key2];
                    pricing[key1][key2] = {
                        price: oldPrice,
                        productionCost: oldPrice * 0.7
                    };
                }
                if (!pricing[key1][key2]) {
                    pricing[key1][key2] = {};
                }
                pricing[key1][key2][priceType] = parseFloat(value) || 0;
            }
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('tshirt_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving T-shirt price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Fabric Bag Category
    async renderFabricBagCategory() {
        const db = this._getDb();
        
        // Load fabric bag pricing from Firestore
        let fabricBagPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('fabric_bag_pricing').get();
            if (pricingDoc.exists) {
                fabricBagPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading fabric bag pricing:', error);
        }
        
        const sizes = [
            { key: '16x22', name: 'شنطة 16×22' },
            { key: '20x25', name: 'شنطة 20×25' },
            { key: '25x30', name: 'شنطة 25×30' },
            { key: '30x35', name: 'شنطة 30×35' },
            { key: '30x40', name: 'شنطة 30×40' },
            { key: '35x40', name: 'شنطة 35×40' },
            { key: '40x40', name: 'شنطة 40×40' },
            { key: '40x45', name: 'شنطة 40×45' },
            { key: '40x50', name: 'شنطة 40×50' },
            { key: '50x50', name: 'شنطة 50×50' },
            { key: '50x60', name: 'شنطة 50×60' },
            { key: '60x60', name: 'شنطة 60×60' }
        ];
        
        let pricingHTML = '';
        
        sizes.forEach(size => {
            const sizePricing = fabricBagPricing[size.key] || {};
            
            // Support both old format (number) and new format (object)
            const basePriceData = sizePricing.basePrice || sizePricing || {};
            const basePrice = typeof basePriceData === 'object' ? (basePriceData.price || 0) : (basePriceData || 0);
            const basePriceProductionCost = typeof basePriceData === 'object' ? (basePriceData.productionCost || 0) : (basePrice * 0.7);
            
            const additionPriceData = sizePricing.additionPrice || {};
            const additionPrice = typeof additionPriceData === 'object' ? (additionPriceData.price || 0) : (additionPriceData || 0);
            const additionPriceProductionCost = typeof additionPriceData === 'object' ? (additionPriceData.productionCost || 0) : (additionPrice * 0.7);
            
            const printSingleScreenData = sizePricing.printSingleScreen || {};
            const printSingleScreen = typeof printSingleScreenData === 'object' ? (printSingleScreenData.price || 0) : (printSingleScreenData || 0);
            const printSingleScreenProductionCost = typeof printSingleScreenData === 'object' ? (printSingleScreenData.productionCost || 0) : (printSingleScreen * 0.7);
            
            const printDoubleScreenData = sizePricing.printDoubleScreen || {};
            const printDoubleScreen = typeof printDoubleScreenData === 'object' ? (printDoubleScreenData.price || 0) : (printDoubleScreenData || 0);
            const printDoubleScreenProductionCost = typeof printDoubleScreenData === 'object' ? (printDoubleScreenData.productionCost || 0) : (printDoubleScreen * 0.7);
            
            const printSingleDTFData = sizePricing.printSingleDTF || {};
            const printSingleDTF = typeof printSingleDTFData === 'object' ? (printSingleDTFData.price || 0) : (printSingleDTFData || 0);
            const printSingleDTFProductionCost = typeof printSingleDTFData === 'object' ? (printSingleDTFData.productionCost || 0) : (printSingleDTF * 0.7);
            
            const printDoubleDTFData = sizePricing.printDoubleDTF || {};
            const printDoubleDTF = typeof printDoubleDTFData === 'object' ? (printDoubleDTFData.price || 0) : (printDoubleDTFData || 0);
            const printDoubleDTFProductionCost = typeof printDoubleDTFData === 'object' ? (printDoubleDTFData.productionCost || 0) : (printDoubleDTF * 0.7);
            
            pricingHTML += `
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">${size.name}</h4>
                    
                    <!-- Base Price and Addition -->
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">سعر الشنطة</label>
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${basePrice}" 
                                               onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'basePrice', 'price', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${basePriceProductionCost}" 
                                               onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'basePrice', 'productionCost', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">إضافة</label>
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${additionPrice}" 
                                               onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'additionPrice', 'price', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${additionPriceProductionCost}" 
                                               onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'additionPrice', 'productionCost', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-xs font-bold text-gray-700">ج.م</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Printing Prices -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">سلك سكرين (لون واحد)</label>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">وجه واحد</label>
                                    <div class="space-y-2">
                                        <div>
                                            <label class="text-xs text-gray-500 mb-1 block">بيع</label>
                                            <div class="flex items-center gap-2">
                                                <input type="number" 
                                                       step="0.01" 
                                                       min="0" 
                                                       value="${printSingleScreen}" 
                                                       onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'printSingleScreen', 'price', this.value)"
                                                       class="flex-1 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                                <span class="text-xs font-bold text-gray-700">ج.م</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="text-xs text-gray-500 mb-1 block">تنفيذ</label>
                                            <div class="flex items-center gap-2">
                                                <input type="number" 
                                                       step="0.01" 
                                                       min="0" 
                                                       value="${printSingleScreenProductionCost}" 
                                                       onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'printSingleScreen', 'productionCost', this.value)"
                                                       class="flex-1 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                                <span class="text-xs font-bold text-gray-700">ج.م</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">وجهين</label>
                                    <div class="space-y-2">
                                        <div>
                                            <label class="text-xs text-gray-500 mb-1 block">بيع</label>
                                            <div class="flex items-center gap-2">
                                                <input type="number" 
                                                       step="0.01" 
                                                       min="0" 
                                                       value="${printDoubleScreen}" 
                                                       onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'printDoubleScreen', 'price', this.value)"
                                                       class="flex-1 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                                <span class="text-xs font-bold text-gray-700">ج.م</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="text-xs text-gray-500 mb-1 block">تنفيذ</label>
                                            <div class="flex items-center gap-2">
                                                <input type="number" 
                                                       step="0.01" 
                                                       min="0" 
                                                       value="${printDoubleScreenProductionCost}" 
                                                       onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'printDoubleScreen', 'productionCost', this.value)"
                                                       class="flex-1 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                                <span class="text-xs font-bold text-gray-700">ج.م</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-2">DTF (ألوان)</label>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">وجه واحد</label>
                                    <div class="space-y-2">
                                        <div>
                                            <label class="text-xs text-gray-500 mb-1 block">بيع</label>
                                            <div class="flex items-center gap-2">
                                                <input type="number" 
                                                       step="0.01" 
                                                       min="0" 
                                                       value="${printSingleDTF}" 
                                                       onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'printSingleDTF', 'price', this.value)"
                                                       class="flex-1 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                                <span class="text-xs font-bold text-gray-700">ج.م</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="text-xs text-gray-500 mb-1 block">تنفيذ</label>
                                            <div class="flex items-center gap-2">
                                                <input type="number" 
                                                       step="0.01" 
                                                       min="0" 
                                                       value="${printSingleDTFProductionCost}" 
                                                       onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'printSingleDTF', 'productionCost', this.value)"
                                                       class="flex-1 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                                <span class="text-xs font-bold text-gray-700">ج.م</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">وجهين</label>
                                    <div class="space-y-2">
                                        <div>
                                            <label class="text-xs text-gray-500 mb-1 block">بيع</label>
                                            <div class="flex items-center gap-2">
                                                <input type="number" 
                                                       step="0.01" 
                                                       min="0" 
                                                       value="${printDoubleDTF}" 
                                                       onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'printDoubleDTF', 'price', this.value)"
                                                       class="flex-1 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                                <span class="text-xs font-bold text-gray-700">ج.م</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label class="text-xs text-gray-500 mb-1 block">تنفيذ</label>
                                            <div class="flex items-center gap-2">
                                                <input type="number" 
                                                       step="0.01" 
                                                       min="0" 
                                                       value="${printDoubleDTFProductionCost}" 
                                                       onchange="PricingAdmin.saveFabricBagPrice('${size.key}', 'printDoubleDTF', 'productionCost', this.value)"
                                                       class="flex-1 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                                <span class="text-xs font-bold text-gray-700">ج.م</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير الشنط القماش</h3>
                        <p class="text-gray-600">قم بتحديد الأسعار لكل مقاس والطباعة</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                ${pricingHTML}
            </div>
        `;
    },

    // Save fabric bag price
    async saveFabricBagPrice(sizeKey, priceKey, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('fabric_bag_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // Initialize size object if not exists
            if (!pricing[sizeKey]) {
                pricing[sizeKey] = {};
            }
            
            // If it's a number (old format), convert to object
            if (typeof pricing[sizeKey][priceKey] === 'number') {
                const oldPrice = pricing[sizeKey][priceKey];
                pricing[sizeKey][priceKey] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize price key object if not exists
            if (!pricing[sizeKey][priceKey]) {
                pricing[sizeKey][priceKey] = {};
            }
            
            // Update the specific price or production cost
            pricing[sizeKey][priceKey][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('fabric_bag_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving fabric bag price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },


    // Render Sublimation Gift Category
    async renderSublimationGiftCategory() {
        const db = this._getDb();
        
        // Load sublimation gift pricing from Firestore
        let sublimationGiftPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('sublimation_gift_pricing').get();
            if (pricingDoc.exists) {
                sublimationGiftPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading sublimation gift pricing:', error);
        }
        
        // Product list
        const products = [
            { key: 'mug_white_printed', name: 'ماج أبيض (مطبوع)' },
            { key: 'mug_colored_printed', name: 'ماج ملون (مطبوع)' },
            { key: 'mug_magic', name: 'ماج سحرى' },
            { key: 'coaster_wood', name: 'كوستر خشب' },
            { key: 'cap', name: 'كاب' },
            { key: 'medallion_wood_4x6_single', name: 'مادلية خشب 4×6 وجه واحد' },
            { key: 'medallion_wood_4x6_double', name: 'مادلية خشب 4×6 وجهين' },
            { key: 'mouse_pad', name: 'بادة ماوس' },
            { key: 'puzzle_small', name: 'بازل صغير' },
            { key: 'puzzle_large', name: 'بازل كبير' },
            { key: 'sublimation_paper', name: 'ورقة سبلميشن' },
            { key: 'single_press', name: 'كبسة واحدة' }
        ];
        
        let productsHTML = '';
        products.forEach(product => {
            // Support both old format (number) and new format (object)
            const productData = sublimationGiftPricing[product.key] || {};
            const price = typeof productData === 'object' ? (productData.price || 0) : (productData || 0);
            const productionCost = typeof productData === 'object' ? (productData.productionCost || 0) : (price * 0.7);
            
            productsHTML += `
                <tr>
                    <td class="p-3 font-bold text-gray-800">${product.name}</td>
                    <td class="p-3">
                        <div class="space-y-2">
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${price}" 
                                       onchange="PricingAdmin.saveSublimationGiftPrice('${product.key}', 'price', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${productionCost}" 
                                       onchange="PricingAdmin.saveSublimationGiftPrice('${product.key}', 'productionCost', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير هدايا السبلميشن</h3>
                        <p class="text-gray-600">قم بتحديد الأسعار لكل منتج</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="overflow-x-auto">
                        <table class="w-full text-right">
                            <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                                <tr>
                                    <th class="p-3">المنتج</th>
                                    <th class="p-3">السعر (بيع / تنفيذ)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${productsHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    // Save sublimation gift price
    async saveSublimationGiftPrice(productKey, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('sublimation_gift_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // If it's a number (old format), convert to object
            if (typeof pricing[productKey] === 'number') {
                const oldPrice = pricing[productKey];
                pricing[productKey] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize product object if not exists
            if (!pricing[productKey]) {
                pricing[productKey] = {};
            }
            
            // Update the specific price or production cost
            pricing[productKey][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('sublimation_gift_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving sublimation gift price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Safety Printing Category (isolated: safety_printing_prices_sell / safety_printing_prices_cost)
    async renderSafetyPrintingCategory(pricingMode) {
        const db = this._getDb();
        const isSell = pricingMode === 'selling';
        const collName = (typeof SafetyPrintingPricing !== 'undefined')
            ? (isSell ? SafetyPrintingPricing.SELL_COLLECTION : SafetyPrintingPricing.COST_COLLECTION)
            : (isSell ? 'safety_printing_prices_sell' : 'safety_printing_prices_cost');
        const products = (typeof SafetyPrintingPricing !== 'undefined' && SafetyPrintingPricing.PRODUCTS)
            ? SafetyPrintingPricing.PRODUCTS
            : [
                { id: 'worker_vest', nameAr: 'فيست عمال' },
                { id: 'engineer_vest', nameAr: 'فيست مهندسين' },
                { id: 'safety_helmet', nameAr: 'خوذة' },
                { id: 'vip_helmet', nameAr: 'خوذة VIP' }
            ];
        const priceLabel = isSell ? 'سعر البيع' : 'سعر التكلفة';
        const baseKey = isSell ? 'sellingPrice' : 'costPrice';
        const printKey = isSell ? 'printingPrices' : 'printingCosts';

        const pricing = {};
        try {
            for (const p of products) {
                const doc = await this._getColl(collName).doc(p.id).get();
                if (doc.exists) {
                    const d = doc.data();
                    pricing[p.id] = {
                        base: d[baseKey] ?? d.sellingPrice ?? d.costPrice ?? 0,
                        front_only: (d[printKey] && d[printKey].front_only != null) ? d[printKey].front_only : 0,
                        front_back: (d[printKey] && d[printKey].front_back != null) ? d[printKey].front_back : 0
                    };
                } else {
                    pricing[p.id] = { base: 0, front_only: 0, front_back: 0 };
                }
            }
        } catch (e) {
            console.error('Error loading safety printing pricing:', e);
        }

        let rows = '';
        products.forEach(p => {
            const pr = pricing[p.id] || { base: 0, front_only: 0, front_back: 0 };
            rows += `
                <tr>
                    <td class="p-3 font-bold text-gray-800">${p.nameAr}</td>
                    <td class="p-3">
                        <label class="text-xs text-gray-600 mb-1 block">${priceLabel} (أساسي)</label>
                        <input type="number" step="0.01" min="0" value="${pr.base}"
                            onchange="PricingAdmin.saveSafetyPrintingPrice('${p.id}', '${pricingMode}', 'base', this.value)"
                            class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                    </td>
                    <td class="p-3">
                        <label class="text-xs text-gray-600 mb-1 block">طباعة وجه واحد</label>
                        <input type="number" step="0.01" min="0" value="${pr.front_only}"
                            onchange="PricingAdmin.saveSafetyPrintingPrice('${p.id}', '${pricingMode}', 'front_only', this.value)"
                            class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                    </td>
                    <td class="p-3">
                        <label class="text-xs text-gray-600 mb-1 block">طباعة وجهين</label>
                        <input type="number" step="0.01" min="0" value="${pr.front_back}"
                            onchange="PricingAdmin.saveSafetyPrintingPrice('${p.id}', '${pricingMode}', 'front_back', this.value)"
                            class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                    </td>
                </tr>
            `;
        });

        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">السيفتي بالطباعة — ${isSell ? 'سعر البيع' : 'سعر التكلفة'}</h3>
                        <p class="text-gray-600">السعر الأساسي + أسعار الطباعة (اختياري)</p>
                    </div>
                    <button onclick="PricingAdmin.render('safety_printing')" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="overflow-x-auto">
                        <table class="w-full text-right">
                            <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                                <tr>
                                    <th class="p-3">المنتج</th>
                                    <th class="p-3">السعر الأساسي</th>
                                    <th class="p-3">طباعة وجه واحد</th>
                                    <th class="p-3">طباعة وجهين</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    async saveSafetyPrintingPrice(productId, pricingMode, field, value) {
        const db = this._getDb();
        const isSell = pricingMode === 'selling';
        const collName = (typeof SafetyPrintingPricing !== 'undefined')
            ? (isSell ? SafetyPrintingPricing.SELL_COLLECTION : SafetyPrintingPricing.COST_COLLECTION)
            : (isSell ? 'safety_printing_prices_sell' : 'safety_printing_prices_cost');
        const baseKey = isSell ? 'sellingPrice' : 'costPrice';
        const printKey = isSell ? 'printingPrices' : 'printingCosts';
        try {
            const docRef = this._getColl(collName).doc(productId);
            const doc = await docRef.get();
            const data = doc.exists ? doc.data() : { productId };
            if (field === 'base') {
                data[baseKey] = parseFloat(value) || 0;
            } else {
                if (!data[printKey]) data[printKey] = {};
                data[printKey][field] = parseFloat(value) || 0;
            }
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving safety printing price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Envelopes Category (envelopes_prices_sell / envelopes_prices_cost, quantity tiers + offset/inkjet)
    async renderEnvelopesCategory(pricingMode) {
        const db = this._getDb();
        const isSell = pricingMode === 'selling';
        const collName = (typeof EnvelopesPricing !== 'undefined')
            ? (isSell ? EnvelopesPricing.SELL_COLLECTION : EnvelopesPricing.COST_COLLECTION)
            : (isSell ? 'envelopes_prices_sell' : 'envelopes_prices_cost');
        const products = (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.PRODUCTS)
            ? EnvelopesPricing.PRODUCTS
            : [
                { id: 'american_22_11', nameAr: 'American 22 × 11', supportsInkjet: true },
                { id: 'a5', nameAr: 'A5 (22.9 × 16.2)', supportsInkjet: true },
                { id: 'a4', nameAr: 'A4 (32.4 × 22.9)', supportsInkjet: false },
                { id: 'half_congratulations', nameAr: 'Half Congratulations (17 × 25)', supportsInkjet: true },
                { id: 'congratulations', nameAr: 'Congratulations (25 × 35)', supportsInkjet: false },
                { id: 'a3', nameAr: 'A3 (33 × 45)', supportsInkjet: false }
            ];
        const tiers = (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.DEFAULT_QUANTITY_TIERS)
            ? EnvelopesPricing.DEFAULT_QUANTITY_TIERS
            : [500, 1000, 1500, 2000, 2500, 3000, 5000, 10000];
        const baseKey = isSell ? 'sellingPrice' : 'costPrice';
        const priceLabel = isSell ? 'سعر البيع' : 'سعر التكلفة';

        const pricing = {};
        try {
            for (const p of products) {
                const doc = await this._getColl(collName).doc(p.id).get();
                if (doc.exists) {
                    const d = doc.data();
                    const qt = d.quantityTiers || {};
                    pricing[p.id] = {
                        quantityTiers: tiers.reduce((o, t) => { o[t] = qt[t] != null ? qt[t] : 0; return o; }, {}),
                        platePricePerColor: d.platePricePerColor != null ? d.platePricePerColor : 50,
                        inkjetPricePerSheetOneColor: d.inkjetPricePerSheetOneColor != null ? d.inkjetPricePerSheetOneColor : 0,
                        inkjetPricePerSheetFullColor: d.inkjetPricePerSheetFullColor != null ? d.inkjetPricePerSheetFullColor : 0
                    };
                } else {
                    pricing[p.id] = {
                        quantityTiers: tiers.reduce((o, t) => { o[t] = 0; return o; }, {}),
                        platePricePerColor: 50,
                        inkjetPricePerSheetOneColor: 0,
                        inkjetPricePerSheetFullColor: 0
                    };
                }
            }
        } catch (e) {
            console.error('Error loading envelopes pricing:', e);
        }

        const tierCols = tiers.map(t => `
            <th class="p-2 text-xs font-bold text-gray-700">${t}</th>
        `).join('');
        let rows = '';
        products.forEach(p => {
            const pr = pricing[p.id] || {};
            const tierInputs = tiers.map(t => `
                <td class="p-1">
                    <input type="number" step="0.01" min="0" value="${pr.quantityTiers && pr.quantityTiers[t] != null ? pr.quantityTiers[t] : 0}"
                        onchange="PricingAdmin.saveEnvelopesPrice('${p.id}', '${pricingMode}', 'tier_${t}', this.value)"
                        class="w-16 border border-gray-300 p-1 rounded text-sm focus:border-brandGold outline-none">
                </td>
            `).join('');
            const inkjet1 = p.supportsInkjet
                ? `<td class="p-1"><input type="number" step="0.01" min="0" value="${pr.inkjetPricePerSheetOneColor != null ? pr.inkjetPricePerSheetOneColor : 0}"
                    onchange="PricingAdmin.saveEnvelopesPrice('${p.id}', '${pricingMode}', 'inkjetOneColor', this.value)"
                    class="w-20 border border-gray-300 p-1 rounded text-sm focus:border-brandGold outline-none"></td>`
                : '<td class="p-1 text-gray-400">—</td>';
            const inkjet4 = p.supportsInkjet
                ? `<td class="p-1"><input type="number" step="0.01" min="0" value="${pr.inkjetPricePerSheetFullColor != null ? pr.inkjetPricePerSheetFullColor : 0}"
                    onchange="PricingAdmin.saveEnvelopesPrice('${p.id}', '${pricingMode}', 'inkjetFullColor', this.value)"
                    class="w-20 border border-gray-300 p-1 rounded text-sm focus:border-brandGold outline-none"></td>`
                : '<td class="p-1 text-gray-400">—</td>';
            rows += `
                <tr class="border-b border-gray-200">
                    <td class="p-2 font-bold text-gray-800">${p.nameAr}</td>
                    ${tierInputs}
                    <td class="p-1">
                        <input type="number" step="0.01" min="0" value="${pr.platePricePerColor != null ? pr.platePricePerColor : 50}"
                            onchange="PricingAdmin.saveEnvelopesPrice('${p.id}', '${pricingMode}', 'platePerColor', this.value)"
                            class="w-16 border border-gray-300 p-1 rounded text-sm focus:border-brandGold outline-none" title="لوحة/لون">
                    </td>
                    ${inkjet1}
                    ${inkjet4}
                </tr>
            `;
        });

        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">المظاريف — ${isSell ? 'سعر البيع' : 'سعر التكلفة'}</h3>
                        <p class="text-gray-600">أسعار حسب الكمية (أوفست) + لوحة/لون. إنك جيت للمقاسات المحددة فقط.</p>
                    </div>
                    <button onclick="PricingAdmin.render('envelopes')" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 overflow-x-auto">
                    <table class="w-full text-right text-sm">
                        <thead class="bg-gray-100 text-gray-700 border-b border-gray-200">
                            <tr>
                                <th class="p-2">المنتج</th>
                                ${tierCols}
                                <th class="p-2">لوحة/لون</th>
                                <th class="p-2">إنك جيت لون واحد</th>
                                <th class="p-2">إنك جيت ملون</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async saveEnvelopesPrice(productId, pricingMode, field, value) {
        const db = this._getDb();
        const isSell = pricingMode === 'selling';
        const collName = (typeof EnvelopesPricing !== 'undefined')
            ? (isSell ? EnvelopesPricing.SELL_COLLECTION : EnvelopesPricing.COST_COLLECTION)
            : (isSell ? 'envelopes_prices_sell' : 'envelopes_prices_cost');
        const tiers = (typeof EnvelopesPricing !== 'undefined' && EnvelopesPricing.DEFAULT_QUANTITY_TIERS)
            ? EnvelopesPricing.DEFAULT_QUANTITY_TIERS
            : [500, 1000, 1500, 2000, 2500, 3000, 5000, 10000];
        try {
            const docRef = this._getColl(collName).doc(productId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : { productId };
            if (field.startsWith('tier_')) {
                const tier = parseInt(field.replace('tier_', ''), 10);
                if (!data.quantityTiers) data.quantityTiers = {};
                data.quantityTiers[tier] = parseFloat(value) || 0;
            } else if (field === 'platePerColor') {
                data.platePricePerColor = parseFloat(value) || 0;
            } else if (field === 'inkjetOneColor') {
                data.inkjetPricePerSheetOneColor = parseFloat(value) || 0;
            } else if (field === 'inkjetFullColor') {
                data.inkjetPricePerSheetFullColor = parseFloat(value) || 0;
            }
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving envelopes price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    async openMachine(machineId) {
        const machine = (typeof PrintMachines !== 'undefined') ? PrintMachines.getById(machineId) : null;
        if (!machine) {
            Swal.fire('تنبيه', 'الماكينة غير موجودة', 'info');
            return;
        }
        if (!machine.ready || !machine.pricingCategory) {
            Swal.fire({ icon: 'info', title: 'قريباً', text: 'تسعير هذه الماكينة هيظهر قريباً', timer: 1800, showConfirmButton: false });
            return;
        }
        // الديجيتال: نفتح شاشة التكلفة/البيع مع بنود الماكينة
        if (machine.pricingCategory === 'digital_printing') {
            await this.render('digital_printing', 'cost');
            return;
        }
        await this.render(machine.pricingCategory, 'selling');
    },

    async renderDigitalPrintingCategory(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof DigitalPrintingPricing !== 'undefined')
            ? (isSell ? DigitalPrintingPricing.SELL_COLLECTION : DigitalPrintingPricing.COST_COLLECTION)
            : (isSell ? 'digital_prices_sell' : 'digital_prices_cost');
        const configDocId = (typeof DigitalPrintingPricing !== 'undefined' && DigitalPrintingPricing.CONFIG_DOC_ID)
            ? DigitalPrintingPricing.CONFIG_DOC_ID
            : 'default';
        const paperTypes = (typeof DigitalPrintingPricing !== 'undefined' && DigitalPrintingPricing.PAPER_TYPES)
            ? DigitalPrintingPricing.PAPER_TYPES
            : [];
        const productItems = (typeof DigitalPrintingPricing !== 'undefined' && DigitalPrintingPricing.getProductItems)
            ? DigitalPrintingPricing.getProductItems()
            : [];
        const machine = (typeof PrintMachines !== 'undefined') ? PrintMachines.getById('digital') : null;

        let paperPrices = {};
        let lamination = { matteSingle: 0, matteDouble: 0, glossySingle: 0, glossyDouble: 0 };
        let stanRoll = {};
        let extras = {
            specialColorPerColor: 0, stickerCuttingPerSheet: 0, dieCuttingPerSheet: 0,
            creasingPer1000: 0, perforationPer1000: 0, cornerRoundingPer1000: 0,
            folderPocketPerPiece: 0, bagAssemblyPerBag: 0, paperCuttingPer1000: 0
        };
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) {
                const d = doc.data();
                if (d.paperPrices && typeof d.paperPrices === 'object') paperPrices = d.paperPrices;
                if (d.lamination && typeof d.lamination === 'object') lamination = { ...lamination, ...d.lamination };
                if (d.stanRoll && typeof d.stanRoll === 'object') stanRoll = d.stanRoll;
                if (d.extras && typeof d.extras === 'object') extras = { ...extras, ...d.extras };
            }
        } catch (e) {
            console.error('Error loading digital printing pricing:', e);
        }

        // لو التكلفة فاضية — عبّي من قائمة الصياد افتراضياً في العرض فقط
        if (!isSell && (!paperPrices || !Object.keys(paperPrices).length) && typeof DigitalPrintingPricing !== 'undefined') {
            paperPrices = DigitalPrintingPricing.getDefaultCostPaperPrices();
        }

        const numCell = (paperId, field, value, enabled) => {
            if (!enabled) {
                return `<td class="p-2 text-center text-gray-300 text-sm">—</td>`;
            }
            const v = value != null && value !== '' ? value : 0;
            return `<td class="p-2"><input type="number" step="0.01" min="0" value="${v}"
                onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'paperPrices', '${paperId}', '${field}', this.value)"
                class="w-full min-w-[72px] border border-gray-300 p-2 rounded text-sm font-bold ${isSell ? 'text-emerald-700' : 'text-rose-700'}"></td>`;
        };

        const paperRows = paperTypes.map(p => {
            const pp = paperPrices[p.id] || {};
            const def = (typeof DigitalPrintingPricing !== 'undefined' && DigitalPrintingPricing.DEFAULT_COST_PAPER_PRICES)
                ? (DigitalPrintingPricing.DEFAULT_COST_PAPER_PRICES[p.id] || {})
                : {};
            const supportDouble = def.priceDouble != null || pp.priceDouble > 0;
            const supportCel1 = !!p.cellophaneSingle || (def.cellophaneSingle != null);
            const supportCel2 = !!p.cellophaneDouble || (def.cellophaneDouble != null);
            return `<tr class="hover:bg-gray-50">
                <td class="p-3 font-bold text-gray-800 whitespace-nowrap">${p.nameAr}</td>
                ${numCell(p.id, 'priceSingle', pp.priceSingle, true)}
                ${numCell(p.id, 'priceDouble', pp.priceDouble, supportDouble)}
                ${numCell(p.id, 'cellophaneSingle', pp.cellophaneSingle, supportCel1)}
                ${numCell(p.id, 'cellophaneDouble', pp.cellophaneDouble, supportCel2)}
            </tr>`;
        }).join('');

        const itemsHtml = productItems.map(it => `
            <div class="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 border border-violet-100">
                <i class="fas fa-check text-violet-500 text-xs"></i>
                <span class="text-sm font-bold text-violet-900">${it.nameAr}</span>
            </div>`).join('');

        return `
            <div class="space-y-6">
                <div class="rounded-2xl overflow-hidden border border-violet-200 bg-white shadow-sm">
                    <div class="grid md:grid-cols-[220px_1fr] gap-0">
                        <div class="bg-slate-100 aspect-[4/3] md:aspect-auto md:min-h-[180px] relative overflow-hidden">
                            <img src="${machine ? machine.image : 'assets/images/machines/digital.jpg'}" alt="ديجيتال" class="w-full h-full object-cover" onerror="this.parentElement.innerHTML='<div class=\\'flex items-center justify-center h-full min-h-[160px] bg-violet-900\\'><i class=\\'fas fa-print text-5xl text-white/40\\'></i></div>'">
                        </div>
                        <div class="p-5 md:p-6">
                            <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
                                <div>
                                    <p class="text-xs font-bold text-violet-600 mb-1">ماكينة الطباعة</p>
                                    <h3 class="text-2xl font-extrabold text-gray-900">ماكينة طباعة رقمية</h3>
                                    <p class="text-sm text-gray-500 mt-1">تسعير الورق — لوحة 32×47 سم · يشمل الطباعة</p>
                                </div>
                                <button onclick="PricingAdmin.render()" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold hover:bg-gray-200 transition text-sm">
                                    <i class="fas fa-arrow-right ml-1"></i> رجوع للماكينات
                                </button>
                            </div>
                            <div class="flex flex-wrap gap-2 mb-4">
                                <button onclick="PricingAdmin.render('digital_printing','cost')" class="px-4 py-2 rounded-xl text-sm font-extrabold transition ${!isSell ? 'bg-rose-600 text-white shadow' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}">
                                    <i class="fas fa-calculator ml-1"></i> سعر التكلفة
                                </button>
                                <button onclick="PricingAdmin.render('digital_printing','selling')" class="px-4 py-2 rounded-xl text-sm font-extrabold transition ${isSell ? 'bg-emerald-600 text-white shadow' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">
                                    <i class="fas fa-tags ml-1"></i> سعر البيع
                                </button>
                                ${!isSell ? `<button onclick="PricingAdmin.seedDigitalCostPrices()" class="px-4 py-2 rounded-xl text-sm font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200">
                                    <i class="fas fa-download ml-1"></i> تحميل أسعار التكلفة الافتراضية
                                </button>` : `<button onclick="PricingAdmin.copyDigitalCostToSell()" class="px-4 py-2 rounded-xl text-sm font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200">
                                    <i class="fas fa-copy ml-1"></i> نسخ التكلفة كأساس للبيع
                                </button>`}
                            </div>
                            <div>
                                <p class="text-xs font-bold text-gray-500 mb-2">بنود الديجيتال</p>
                                <div class="flex flex-wrap gap-2">${itemsHtml}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200">
                    <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                        <h4 class="font-extrabold text-gray-800">
                            أسعار الورق — <span class="${isSell ? 'text-emerald-600' : 'text-rose-600'}">${isSell ? 'بيع' : 'تكلفة'}</span>
                            <span class="text-sm font-bold text-gray-400">(ج.م / ورقة)</span>
                        </h4>
                        ${!isSell ? `<p class="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg font-semibold"><i class="fas fa-info-circle ml-1"></i>${(typeof DigitalPrintingPricing !== 'undefined' && DigitalPrintingPricing.COST_NOTE) ? DigitalPrintingPricing.COST_NOTE : 'لأكثر من 10 ورقات'}</p>` : ''}
                    </div>
                    <div class="overflow-x-auto rounded-xl border border-gray-100">
                        <table class="w-full text-right min-w-[640px]">
                            <thead class="bg-slate-900 text-white text-xs sm:text-sm">
                                <tr>
                                    <th class="p-3 font-bold">نوع الورق</th>
                                    <th class="p-3 font-bold">وجه واحد</th>
                                    <th class="p-3 font-bold">وجهين</th>
                                    <th class="p-3 font-bold">سلوفان وجه</th>
                                    <th class="p-3 font-bold">سلوفان وجهين</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">${paperRows}</tbody>
                        </table>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-gray-200">
                    <h4 class="font-bold text-gray-800 mb-4">سلفان عام (اختياري — بالفرخ)</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div><label class="block text-gray-700 mb-1">سلفان مط وجه واحد</label><input type="number" step="0.01" min="0" value="${lamination.matteSingle != null ? lamination.matteSingle : 0}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'lamination', null, 'matteSingle', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">سلفان مط وجهين</label><input type="number" step="0.01" min="0" value="${lamination.matteDouble != null ? lamination.matteDouble : 0}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'lamination', null, 'matteDouble', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">سلفان لامع وجه واحد</label><input type="number" step="0.01" min="0" value="${lamination.glossySingle != null ? lamination.glossySingle : 0}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'lamination', null, 'glossySingle', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">سلفان لامع وجهين</label><input type="number" step="0.01" min="0" value="${lamination.glossyDouble != null ? lamination.glossyDouble : 0}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'lamination', null, 'glossyDouble', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                    </div>
                </div>

                <div class="bg-white p-6 rounded-2xl border border-gray-200">
                    <h4 class="font-bold text-gray-800 mb-4">إضافات</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        <div><label class="block text-gray-700 mb-1">لون اسبشيال (بالفرخ)</label><input type="number" step="0.01" min="0" value="${extras.specialColorPerColor}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'extras', null, 'specialColorPerColor', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">تشريح استيكر (بالفرخ)</label><input type="number" step="0.01" min="0" value="${extras.stickerCuttingPerSheet}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'extras', null, 'stickerCuttingPerSheet', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">تقطيع ورق فورمة (بالفرخ)</label><input type="number" step="0.01" min="0" value="${extras.dieCuttingPerSheet}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'extras', null, 'dieCuttingPerSheet', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">ريجة بالـ 1000 قطعة</label><input type="number" step="0.01" min="0" value="${extras.creasingPer1000}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'extras', null, 'creasingPer1000', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">تخريم بالـ 1000 قطعة</label><input type="number" step="0.01" min="0" value="${extras.perforationPer1000}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'extras', null, 'perforationPer1000', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">ركنة بالـ 1000 قطعة</label><input type="number" step="0.01" min="0" value="${extras.cornerRoundingPer1000}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'extras', null, 'cornerRoundingPer1000', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">جيب + لزق (للفولدر) بالقطعة</label><input type="number" step="0.01" min="0" value="${extras.folderPocketPerPiece}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'extras', null, 'folderPocketPerPiece', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">تقفيل شنطة بالشنطة</label><input type="number" step="0.01" min="0" value="${extras.bagAssemblyPerBag}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'extras', null, 'bagAssemblyPerBag', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">قص الورق بالـ 1000 قطعة</label><input type="number" step="0.01" min="0" value="${extras.paperCuttingPer1000}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'extras', null, 'paperCuttingPer1000', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                    </div>
                </div>
            </div>
        `;
    },

    async seedDigitalCostPrices() {
        if (typeof DigitalPrintingPricing === 'undefined') return;
        const { isConfirmed } = await Swal.fire({
            title: 'تحميل أسعار التكلفة؟',
            html: '<p class="text-sm text-gray-600">هيتحمّل جدول أسعار الصياد كأسعار تكلفة افتراضية (ممكن تعدّلها بعد كده).</p>',
            icon: 'question',
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: 'تحميل',
            confirmButtonColor: '#e11d48'
        });
        if (!isConfirmed) return;
        try {
            const collName = DigitalPrintingPricing.COST_COLLECTION;
            const docId = DigitalPrintingPricing.CONFIG_DOC_ID;
            const docRef = this._getColl(collName).doc(docId);
            const existing = await docRef.get();
            const data = existing.exists ? existing.data() : {};
            data.paperPrices = DigitalPrintingPricing.getDefaultCostPaperPrices();
            data.updatedAt = new Date().toISOString();
            data.sourceNote = DigitalPrintingPricing.COST_NOTE || '';
            await docRef.set(data, { merge: true });
            Swal.fire({ icon: 'success', title: 'تم التحميل', timer: 1400, showConfirmButton: false });
            await this.render('digital_printing', 'cost');
        } catch (e) {
            console.error(e);
            Swal.fire('خطأ', 'فشل حفظ أسعار التكلفة', 'error');
        }
    },

    async copyDigitalCostToSell() {
        if (typeof DigitalPrintingPricing === 'undefined') return;
        const { value: markup } = await Swal.fire({
            title: 'نسخ التكلفة إلى البيع',
            html: '<p class="text-sm text-gray-600 mb-3">هينسخ أسعار التكلفة كأساس لأسعار البيع. تقدر تضيف نسبة زيادة %.</p>',
            input: 'number',
            inputValue: 0,
            inputAttributes: { min: 0, step: '1' },
            inputLabel: 'نسبة الزيادة % (0 = نفس التكلفة)',
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: 'نسخ',
            confirmButtonColor: '#059669'
        });
        if (markup === undefined) return;
        try {
            const costDoc = await this._getColl(DigitalPrintingPricing.COST_COLLECTION).doc(DigitalPrintingPricing.CONFIG_DOC_ID).get();
            let paperPrices = {};
            if (costDoc.exists && costDoc.data().paperPrices) {
                paperPrices = costDoc.data().paperPrices;
            } else {
                paperPrices = DigitalPrintingPricing.getDefaultCostPaperPrices();
            }
            const pct = (parseFloat(markup) || 0) / 100;
            const sellPrices = {};
            Object.keys(paperPrices).forEach(id => {
                const p = paperPrices[id] || {};
                const mul = (n) => n != null && n !== '' ? Math.round((Number(n) * (1 + pct)) * 100) / 100 : 0;
                sellPrices[id] = {
                    priceSingle: mul(p.priceSingle),
                    priceDouble: mul(p.priceDouble),
                    cellophaneSingle: mul(p.cellophaneSingle),
                    cellophaneDouble: mul(p.cellophaneDouble)
                };
            });
            const sellRef = this._getColl(DigitalPrintingPricing.SELL_COLLECTION).doc(DigitalPrintingPricing.CONFIG_DOC_ID);
            const sellExisting = await sellRef.get();
            const data = sellExisting.exists ? sellExisting.data() : {};
            data.paperPrices = sellPrices;
            data.updatedAt = new Date().toISOString();
            await sellRef.set(data, { merge: true });
            Swal.fire({ icon: 'success', title: 'تم النسخ', timer: 1400, showConfirmButton: false });
            await this.render('digital_printing', 'selling');
        } catch (e) {
            console.error(e);
            Swal.fire('خطأ', 'فشل نسخ الأسعار', 'error');
        }
    },

    async saveDigitalPrintingPrice(docId, pricingMode, section, paperTypeId, field, value) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof DigitalPrintingPricing !== 'undefined')
            ? (isSell ? DigitalPrintingPricing.SELL_COLLECTION : DigitalPrintingPricing.COST_COLLECTION)
            : (isSell ? 'digital_prices_sell' : 'digital_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (section === 'paperPrices' && paperTypeId) {
                if (!data.paperPrices) data.paperPrices = {};
                if (!data.paperPrices[paperTypeId]) data.paperPrices[paperTypeId] = {};
                data.paperPrices[paperTypeId][field] = parseFloat(value) || 0;
            } else if (section === 'lamination') {
                if (!data.lamination) data.lamination = {};
                data.lamination[field] = parseFloat(value) || 0;
            } else if (section === 'stanRoll' && paperTypeId) {
                if (!data.stanRoll) data.stanRoll = {};
                data.stanRoll[paperTypeId] = parseFloat(value) || 0;
            } else if (section === 'extras') {
                if (!data.extras) data.extras = {};
                data.extras[field] = parseFloat(value) || 0;
            }
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            // حفظ صامت بدون popup مزعج لكل خلية
            const toast = document.createElement('div');
            toast.textContent = 'تم الحفظ';
            toast.style.cssText = 'position:fixed;bottom:20px;left:20px;background:#059669;color:#fff;padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;z-index:99999;opacity:0;transition:opacity .2s';
            document.body.appendChild(toast);
            requestAnimationFrame(() => { toast.style.opacity = '1'; });
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 200); }, 900);
        } catch (error) {
            console.error('Error saving digital printing price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    async renderStanRollCategory(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof DigitalPrintingPricing !== 'undefined')
            ? (isSell ? DigitalPrintingPricing.SELL_COLLECTION : DigitalPrintingPricing.COST_COLLECTION)
            : (isSell ? 'digital_prices_sell' : 'digital_prices_cost');
        const configDocId = (typeof DigitalPrintingPricing !== 'undefined' && DigitalPrintingPricing.CONFIG_DOC_ID)
            ? DigitalPrintingPricing.CONFIG_DOC_ID : 'default';
        const stanRollSizes = (typeof DigitalPrintingPricing !== 'undefined' && DigitalPrintingPricing.STAN_ROLL_SIZES)
            ? DigitalPrintingPricing.STAN_ROLL_SIZES : [];

        let stanRoll = {};
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) {
                const d = doc.data();
                if (d.stanRoll && typeof d.stanRoll === 'object') stanRoll = d.stanRoll;
            }
        } catch (e) {
            console.error('Error loading stan roll pricing:', e);
        }

        const rows = stanRollSizes.map(s => {
            const price = stanRoll[s.id] != null ? stanRoll[s.id] : 0;
            return `<tr>
                <td class="p-3 font-bold text-gray-800">${s.nameAr}</td>
                <td class="p-2"><input type="number" step="0.01" min="0" value="${price}" onchange="PricingAdmin.saveDigitalPrintingPrice('${configDocId}', '${pricingMode}', 'stanRoll', '${s.id}', 'price', this.value)" class="w-full border border-gray-300 p-2 rounded text-sm"></td>
            </tr>`;
        }).join('');

        return `
            <div class="bg-white p-6 rounded-xl border border-gray-200">
                <h4 class="font-bold text-lg text-gray-800 mb-4"><i class="fas fa-scroll text-lime-600 ml-2"></i> بكرة ستان — سعر كل مقاس (ج.م/بكرة)</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-right">
                        <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                            <tr>
                                <th class="p-3">المقاس</th>
                                <th class="p-3">السعر (ج.م)</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    async renderPaperBagsCategory(pricingMode) {
        const db = this._getDb();
        const isSell = pricingMode === 'selling';
        const collName = (typeof PaperBagsPricing !== 'undefined')
            ? (isSell ? PaperBagsPricing.SELL_COLLECTION : PaperBagsPricing.COST_COLLECTION)
            : (isSell ? 'paper_bags_prices_sell' : 'paper_bags_prices_cost');
        const configDocId = (typeof PaperBagsPricing !== 'undefined' && PaperBagsPricing.CONFIG_DOC_ID)
            ? PaperBagsPricing.CONFIG_DOC_ID
            : 'default';
        const paperTypes = (typeof PaperBagsPricing !== 'undefined' && PaperBagsPricing.PAPER_TYPES)
            ? PaperBagsPricing.PAPER_TYPES
            : [];
        let paperPrices = {};
        let handlesPrice = 0;
        let printingPricePerSheet = 0;
        let assembly_1 = 0, assembly_2 = 0;
        let handle_kapsula = 0, handle_dabara = 0;
        let additionsPrices = {};
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) {
                const d = doc.data();
                if (d.paperPrices && typeof d.paperPrices === 'object') paperPrices = d.paperPrices;
                handlesPrice = d.handlesPricePer1000 != null ? d.handlesPricePer1000 : 0;
                printingPricePerSheet = d.printingPricePerSheet != null ? d.printingPricePerSheet : 0;
                assembly_1 = d.assemblyPer1000_1sheet != null ? d.assemblyPer1000_1sheet : 0;
                assembly_2 = d.assemblyPer1000_2sheets != null ? d.assemblyPer1000_2sheets : 0;
                handle_kapsula = d.handleType_kapsula != null ? d.handleType_kapsula : 0;
                handle_dabara = d.handleType_dabara != null ? d.handleType_dabara : 0;
                additionsPrices = (d.additionsPrices && typeof d.additionsPrices === 'object') ? d.additionsPrices : {};
            }
        } catch (e) { console.error('Error loading paper bags pricing:', e); }
        const paperRows = paperTypes.map(p => {
            const price = paperPrices[p.id] != null ? paperPrices[p.id] : 0;
            return `<tr><td class="p-3 font-bold text-gray-800">${p.nameAr}</td><td class="p-2"><input type="number" step="0.01" min="0" value="${price}" onchange="PricingAdmin.savePaperBagsPrice('${configDocId}', '${pricingMode}', 'paperPrices', '${p.id}', this.value)" class="w-full border border-gray-300 p-2 rounded text-sm" data-paper-id="${p.id}"></td></tr>`;
        }).join('');
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">باند الشنط الورقية — ${isSell ? 'سعر البيع' : 'سعر التكلفة'}</h3>
                        <p class="text-gray-600">جميع الأسعار بالـ 1000 شنطة. ⚠️ الشنطة بتتحسب وهي مفرودة، مش وهي مقفولة.</p>
                    </div>
                    <button onclick="PricingAdmin.render('paper_bags')" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4">1) الورق والقص المبدئي (ج.م/1000 شنطة)</h4>
                    <table class="w-full text-right"><thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200"><tr><th class="p-3">نوع الورق</th><th class="p-3">السعر</th></tr></thead><tbody class="divide-y divide-gray-200">${paperRows}</tbody></table>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4">2) الزنجات (ج.م/1000 شنطة)</h4>
                    <div><label class="block text-gray-700 mb-1">سعر الزنجات للـ 1000</label><input type="number" step="0.01" min="0" value="${handlesPrice}" onchange="PricingAdmin.savePaperBagsPrice('${configDocId}', '${pricingMode}', 'handlesPricePer1000', null, this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4">3) الطباعة (ج.م/ورقة)</h4>
                    <div><label class="block text-gray-700 mb-1">سعر الطباعة للورقة</label><input type="number" step="0.01" min="0" value="${printingPricePerSheet}" onchange="PricingAdmin.savePaperBagsPrice('${configDocId}', '${pricingMode}', 'printingPricePerSheet', null, this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4">4) التقفيل (ج.م/1000 شنطة)</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div><label class="block text-gray-700 mb-1">ورقة واحدة</label><input type="number" step="0.01" min="0" value="${assembly_1}" onchange="PricingAdmin.savePaperBagsPrice('${configDocId}', '${pricingMode}', 'assemblyPer1000_1sheet', null, this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">ورقتين</label><input type="number" step="0.01" min="0" value="${assembly_2}" onchange="PricingAdmin.savePaperBagsPrice('${configDocId}', '${pricingMode}', 'assemblyPer1000_2sheets', null, this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4">5) الإضافات (لكل ورقة على حدة — ج.م/1000 ورقة)</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        ${(typeof PaperBagsPricing !== 'undefined' && PaperBagsPricing.ADDITIONS ? PaperBagsPricing.ADDITIONS : []).map(a => {
                            const addPrice = additionsPrices[a.id] != null ? additionsPrices[a.id] : 0;
                            return `<div><label class="block text-gray-700 mb-1">${a.nameAr}</label><input type="number" step="0.01" min="0" value="${addPrice}" onchange="PricingAdmin.savePaperBagsAddition('${configDocId}', '${pricingMode}', '${a.id}', this.value)" class="w-full border border-gray-300 p-2 rounded"></div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-gray-800 mb-4">6) يد الشنطة (ج.م/1000 قطعة)</h4>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div><label class="block text-gray-700 mb-1">يد كبسولة</label><input type="number" step="0.01" min="0" value="${handle_kapsula}" onchange="PricingAdmin.savePaperBagsPrice('${configDocId}', '${pricingMode}', 'handleType_kapsula', null, this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                        <div><label class="block text-gray-700 mb-1">يد دبارة</label><input type="number" step="0.01" min="0" value="${handle_dabara}" onchange="PricingAdmin.savePaperBagsPrice('${configDocId}', '${pricingMode}', 'handleType_dabara', null, this.value)" class="w-full border border-gray-300 p-2 rounded"></div>
                    </div>
                </div>
            </div>
        `;
    },

    async savePaperBagsPrice(docId, pricingMode, field, paperTypeId, value) {
        const db = this._getDb();
        const isSell = pricingMode === 'selling';
        const collName = (typeof PaperBagsPricing !== 'undefined')
            ? (isSell ? PaperBagsPricing.SELL_COLLECTION : PaperBagsPricing.COST_COLLECTION)
            : (isSell ? 'paper_bags_prices_sell' : 'paper_bags_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (field === 'paperPrices' && paperTypeId) {
                if (!data.paperPrices) data.paperPrices = {};
                data.paperPrices[paperTypeId] = parseFloat(value) || 0;
            } else if (['handlesPricePer1000', 'printingPricePerSheet', 'assemblyPer1000_1sheet', 'assemblyPer1000_2sheets', 'handleType_kapsula', 'handleType_dabara'].includes(field)) {
                data[field] = parseFloat(value) || 0;
            }
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving paper bags price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    async savePaperBagsAddition(docId, pricingMode, additionId, value) {
        const db = this._getDb();
        const isSell = pricingMode === 'selling';
        const collName = (typeof PaperBagsPricing !== 'undefined')
            ? (isSell ? PaperBagsPricing.SELL_COLLECTION : PaperBagsPricing.COST_COLLECTION)
            : (isSell ? 'paper_bags_prices_sell' : 'paper_bags_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (!data.additionsPrices) data.additionsPrices = {};
            data.additionsPrices[additionId] = parseFloat(value) || 0;
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving paper bags addition:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // ==================== BROCHURES PRICING ADMIN ====================
    async renderBrochuresCategory(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof BrochuresPricing !== 'undefined')
            ? (isSell ? BrochuresPricing.SELL_COLLECTION : BrochuresPricing.COST_COLLECTION)
            : (isSell ? 'brochures_prices_sell' : 'brochures_prices_cost');
        const configDocId = 'default';
        const paperTypes = (typeof BrochuresPricing !== 'undefined' && BrochuresPricing.PAPER_TYPES)
            ? BrochuresPricing.PAPER_TYPES : [];
        const additions = (typeof BrochuresPricing !== 'undefined' && BrochuresPricing.ADDITIONS)
            ? BrochuresPricing.ADDITIONS : [];
        const finishingOptions = (typeof BrochuresPricing !== 'undefined' && BrochuresPricing.FINISHING_OPTIONS)
            ? BrochuresPricing.FINISHING_OPTIONS : [];

        let paperPrices = {};
        let additionsPrices = {};
        let finishingPrices = {};
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) {
                const d = doc.data();
                if (d.paperPrices && typeof d.paperPrices === 'object') paperPrices = d.paperPrices;
                if (d.additionsPrices && typeof d.additionsPrices === 'object') additionsPrices = d.additionsPrices;
                if (d.finishingPrices && typeof d.finishingPrices === 'object') finishingPrices = d.finishingPrices;
            }
        } catch (e) { console.error('Error loading brochures pricing:', e); }

        const paperRows = paperTypes.map(p => {
            const pp = paperPrices[p.id] || {};
            const priceSingle = pp.priceSingle != null ? pp.priceSingle : 0;
            const priceDouble = pp.priceDouble != null ? pp.priceDouble : 0;
            return `<tr>
                <td class="p-3 font-bold text-gray-800">${p.nameAr}</td>
                <td class="p-2"><input type="number" step="0.01" min="0" value="${priceSingle}" onchange="PricingAdmin.saveBrochuresPrice('${configDocId}', '${pricingMode}', 'paperPrices', '${p.id}', 'priceSingle', this.value)" class="w-full border border-gray-300 p-2 rounded text-sm"></td>
                <td class="p-2"><input type="number" step="0.01" min="0" value="${priceDouble}" onchange="PricingAdmin.saveBrochuresPrice('${configDocId}', '${pricingMode}', 'paperPrices', '${p.id}', 'priceDouble', this.value)" class="w-full border border-gray-300 p-2 rounded text-sm"></td>
            </tr>`;
        }).join('');

        const additionsRows = additions.map(a => {
            const price = additionsPrices[a.id] != null ? additionsPrices[a.id] : 0;
            return `<div>
                <label class="block text-gray-700 mb-1">${a.nameAr}</label>
                <input type="number" step="0.01" min="0" value="${price}" onchange="PricingAdmin.saveBrochuresPrice('${configDocId}', '${pricingMode}', 'additionsPrices', '${a.id}', 'price', this.value)" class="w-full border border-gray-300 p-2 rounded">
            </div>`;
        }).join('');

        const finishingRows = finishingOptions.map(f => {
            const price = finishingPrices[f.id] != null ? finishingPrices[f.id] : 0;
            return `<div>
                <label class="block text-gray-700 mb-1">${f.nameAr}</label>
                <input type="number" step="0.01" min="0" value="${price}" onchange="PricingAdmin.saveBrochuresPrice('${configDocId}', '${pricingMode}', 'finishingPrices', '${f.id}', 'price', this.value)" class="w-full border border-gray-300 p-2 rounded">
            </div>`;
        }).join('');

        return `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4">أسعار الورق (ج.م/ورقة — يشمل الطباعة)</h4>
                    <div class="overflow-x-auto">
                        <table class="w-full text-right">
                            <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                                <tr><th class="p-3">نوع الورق</th><th class="p-3">وجه واحد</th><th class="p-3">وجهين</th></tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">${paperRows}</tbody>
                        </table>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4">إضافات البرشورات (ج.م)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        ${additionsRows}
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-gray-800 mb-4">تقفيل (ج.م / قطعة برشور)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        ${finishingRows}
                    </div>
                </div>
            </div>
        `;
    },

    async saveBrochuresPrice(docId, pricingMode, section, itemId, field, value) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof BrochuresPricing !== 'undefined')
            ? (isSell ? BrochuresPricing.SELL_COLLECTION : BrochuresPricing.COST_COLLECTION)
            : (isSell ? 'brochures_prices_sell' : 'brochures_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (section === 'paperPrices' && itemId) {
                if (!data.paperPrices) data.paperPrices = {};
                if (!data.paperPrices[itemId]) data.paperPrices[itemId] = {};
                data.paperPrices[itemId][field] = parseFloat(value) || 0;
            } else if (section === 'additionsPrices' && itemId) {
                if (!data.additionsPrices) data.additionsPrices = {};
                data.additionsPrices[itemId] = parseFloat(value) || 0;
            } else if (section === 'finishingPrices' && itemId) {
                if (!data.finishingPrices) data.finishingPrices = {};
                data.finishingPrices[itemId] = parseFloat(value) || 0;
            }
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving brochures price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // ==================== CATALOGS PRICING ADMIN ====================
    async renderCatalogsCategory(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof CatalogsPricing !== 'undefined')
            ? (isSell ? CatalogsPricing.SELL_COLLECTION : CatalogsPricing.COST_COLLECTION)
            : (isSell ? 'catalogs_prices_sell' : 'catalogs_prices_cost');
        const configDocId = 'default';
        const paperTypes = (typeof CatalogsPricing !== 'undefined')
            ? CatalogsPricing.getPaperTypes() : [];
        const additions = (typeof CatalogsPricing !== 'undefined' && CatalogsPricing.ADDITIONS)
            ? CatalogsPricing.ADDITIONS : [];
        const finishingOptions = (typeof CatalogsPricing !== 'undefined' && CatalogsPricing.FINISHING_OPTIONS)
            ? CatalogsPricing.FINISHING_OPTIONS : [];

        let paperPrices = {};
        let additionsPrices = {};
        let finishingPrices = {};
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) {
                const d = doc.data();
                if (d.paperPrices && typeof d.paperPrices === 'object') paperPrices = d.paperPrices;
                if (d.additionsPrices && typeof d.additionsPrices === 'object') additionsPrices = d.additionsPrices;
                if (d.finishingPrices && typeof d.finishingPrices === 'object') finishingPrices = d.finishingPrices;
            }
        } catch (e) { console.error('Error loading catalogs pricing:', e); }

        const paperRows = paperTypes.map(p => {
            const pp = paperPrices[p.id] || {};
            const priceSingle = pp.priceSingle != null ? pp.priceSingle : 0;
            const priceDouble = pp.priceDouble != null ? pp.priceDouble : 0;
            return `<tr>
                <td class="p-3 font-bold text-gray-800">${p.nameAr}</td>
                <td class="p-2"><input type="number" step="0.01" min="0" value="${priceSingle}" onchange="PricingAdmin.saveCatalogsPrice('${configDocId}', '${pricingMode}', 'paperPrices', '${p.id}', 'priceSingle', this.value)" class="w-full border border-gray-300 p-2 rounded text-sm"></td>
                <td class="p-2"><input type="number" step="0.01" min="0" value="${priceDouble}" onchange="PricingAdmin.saveCatalogsPrice('${configDocId}', '${pricingMode}', 'paperPrices', '${p.id}', 'priceDouble', this.value)" class="w-full border border-gray-300 p-2 rounded text-sm"></td>
            </tr>`;
        }).join('');

        const additionsRows = additions.map(a => {
            const price = additionsPrices[a.id] != null ? additionsPrices[a.id] : 0;
            return `<div>
                <label class="block text-gray-700 mb-1">${a.nameAr}</label>
                <input type="number" step="0.01" min="0" value="${price}" onchange="PricingAdmin.saveCatalogsPrice('${configDocId}', '${pricingMode}', 'additionsPrices', '${a.id}', 'price', this.value)" class="w-full border border-gray-300 p-2 rounded">
            </div>`;
        }).join('');

        const finishingRows = finishingOptions.map(f => {
            const price = finishingPrices[f.id] != null ? finishingPrices[f.id] : 0;
            return `<div>
                <label class="block text-gray-700 mb-1">${f.nameAr}</label>
                <input type="number" step="0.01" min="0" value="${price}" onchange="PricingAdmin.saveCatalogsPrice('${configDocId}', '${pricingMode}', 'finishingPrices', '${f.id}', 'price', this.value)" class="w-full border border-gray-300 p-2 rounded">
            </div>`;
        }).join('');

        return `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4">أسعار الورق (ج.م/ورقة 32×64 — يشمل الطباعة)</h4>
                    <p class="text-sm text-gray-500 mb-3">أوراق الديجيتال بمقاس ثابت 32×64 سم — سعر الورقة يشمل الطباعة (وجه واحد / وجهين)</p>
                    <div class="overflow-x-auto">
                        <table class="w-full text-right">
                            <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                                <tr><th class="p-3">نوع الورق</th><th class="p-3">وجه واحد</th><th class="p-3">وجهين</th></tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">${paperRows}</tbody>
                        </table>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4">إضافات الكتالوجات (ج.م)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        ${additionsRows}
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-gray-800 mb-4">تقفيل (ج.م / قطعة كتالوج)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        ${finishingRows}
                    </div>
                </div>
            </div>
        `;
    },

    async saveCatalogsPrice(docId, pricingMode, section, itemId, field, value) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof CatalogsPricing !== 'undefined')
            ? (isSell ? CatalogsPricing.SELL_COLLECTION : CatalogsPricing.COST_COLLECTION)
            : (isSell ? 'catalogs_prices_sell' : 'catalogs_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (section === 'paperPrices' && itemId) {
                if (!data.paperPrices) data.paperPrices = {};
                if (!data.paperPrices[itemId]) data.paperPrices[itemId] = {};
                data.paperPrices[itemId][field] = parseFloat(value) || 0;
            } else if (section === 'additionsPrices' && itemId) {
                if (!data.additionsPrices) data.additionsPrices = {};
                data.additionsPrices[itemId] = parseFloat(value) || 0;
            } else if (section === 'finishingPrices' && itemId) {
                if (!data.finishingPrices) data.finishingPrices = {};
                data.finishingPrices[itemId] = parseFloat(value) || 0;
            }
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving catalogs price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Promotional Gift Category
    async renderPromotionalGiftCategory() {
        const db = this._getDb();
        
        // Load promotional gift pricing from Firestore
        let promotionalGiftPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('promotional_gift_pricing').get();
            if (pricingDoc.exists) {
                promotionalGiftPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading promotional gift pricing:', error);
        }
        
        // Product list with minimum quantity requirements
        const products = [
            { key: 'name_tag_port', name: 'نيم تاج ميناء', minQuantity: 1 },
            { key: 'name_tag_pin_gold_silver', name: 'نيم تاج (دهبي - فضى) دبوس', minQuantity: 1 },
            { key: 'name_tag_magnet_gold_silver', name: 'نيم تاج (دهبى - فضى) مغناطيس', minQuantity: 1 },
            { key: 'medallion_acrylic_shape', name: 'مادلية اكريلك تقطيع أشكال', minQuantity: 1 },
            { key: 'medallion_wood_shape', name: 'مادلية خشب تقطيع أشكال', minQuantity: 1 },
            { key: 'coaster_acrylic_felt', name: 'كوستر أكريلك ضهر قطيفة', minQuantity: 1 },
            { key: 'coaster_acrylic_two_layers', name: 'كوستر أكريلك طبقتين', minQuantity: 1 },
            { key: 'coaster_wood_laser', name: 'كوستر خشب حفر ليزر', minQuantity: 1 },
            { key: 'stand_acrylic_a5', name: 'استاند اكريلك A5', minQuantity: 1 },
            { key: 'stand_acrylic_a4', name: 'استاند اكريلك A4', minQuantity: 1 },
            { key: 'balloon', name: 'بالونة', minQuantity: 500 },
            { key: 'keychain', name: 'حظاظات', minQuantity: 1 },
            { key: 'keychain_pool', name: 'حظاظات حمام سباحة', minQuantity: 1 }
        ];
        
        let productsHTML = '';
        products.forEach(product => {
            // Support both old format (number) and new format (object)
            const productData = promotionalGiftPricing[product.key] || {};
            const price = typeof productData === 'object' ? (productData.price || 0) : (productData || 0);
            const productionCost = typeof productData === 'object' ? (productData.productionCost || 0) : (price * 0.7);
            const minQtyText = product.minQuantity > 1 ? ` <span class="text-orange-600 font-bold">(أقل كمية: ${product.minQuantity})</span>` : '';
            productsHTML += `
                <tr>
                    <td class="p-3 font-bold text-gray-800">${product.name}${minQtyText}</td>
                    <td class="p-3">
                        <div class="space-y-2">
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${price}" 
                                       onchange="PricingAdmin.savePromotionalGiftPrice('${product.key}', 'price', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${productionCost}" 
                                       onchange="PricingAdmin.savePromotionalGiftPrice('${product.key}', 'productionCost', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                        </div>
                    </td>
                    <td class="p-3 text-sm text-gray-600">ج.م للوحدة</td>
                </tr>
            `;
        });
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير الهدايا الترويجية</h3>
                        <p class="text-gray-600">قم بتحديد السعر للوحدة لكل منتج (السعر النهائي = السعر × الكمية)</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                    <p class="text-sm text-gray-700 mb-2">
                        <i class="fas fa-info-circle text-blue-600 ml-2"></i>
                        <strong>معلومات:</strong>
                    </p>
                    <ul class="text-sm text-gray-600 space-y-1 mr-4">
                        <li>• السعر المدخل هو السعر للوحدة الواحدة</li>
                        <li>• عند إضافة منتج للطلب، يتم ضرب السعر × الكمية</li>
                        <li>• بعض المنتجات لها حد أدنى للكمية (مثل: بالونة - 500 وحدة)</li>
                    </ul>
                </div>
                
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="overflow-x-auto">
                        <table class="w-full text-right">
                            <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                                <tr>
                                    <th class="p-3">المنتج</th>
                                    <th class="p-3">السعر للوحدة</th>
                                    <th class="p-3">الوحدة</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${productsHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    // Save promotional gift price
    async savePromotionalGiftPrice(productKey, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('promotional_gift_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // If it's a number (old format), convert to object
            if (typeof pricing[productKey] === 'number') {
                const oldPrice = pricing[productKey];
                pricing[productKey] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize product object if not exists
            if (!pricing[productKey]) {
                pricing[productKey] = {};
            }
            
            // Update the specific price or production cost
            pricing[productKey][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('promotional_gift_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving promotional gift price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Ruler Frame Category
    async renderRulerFrameCategory() {
        const db = this._getDb();
        
        // Load ruler frame pricing from Firestore
        let rulerFramePricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('ruler_frame_pricing').get();
            if (pricingDoc.exists) {
                rulerFramePricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading ruler frame pricing:', error);
        }
        
        // Product list
        const products = [
            { key: 'black_15x20', name: 'برواز مسطرة أسود 15×20', width: 15, height: 20, color: 'أسود' },
            { key: 'black_20x30', name: 'برواز مسطرة أسود 20×30', width: 20, height: 30, color: 'أسود' },
            { key: 'black_30x40', name: 'برواز مسطرة أسود 30×40', width: 30, height: 40, color: 'أسود' },
            { key: 'white_15x20', name: 'برواز مسطرة أبيض 15×20', width: 15, height: 20, color: 'أبيض' },
            { key: 'white_20x30', name: 'برواز مسطرة أبيض 20×30', width: 20, height: 30, color: 'أبيض' },
            { key: 'white_30x40', name: 'برواز مسطرة أبيض 30×40', width: 30, height: 40, color: 'أبيض' }
        ];
        
        let productsHTML = '';
        products.forEach(product => {
            // Support both old format (number) and new format (object)
            const productData = rulerFramePricing[product.key] || {};
            const price = typeof productData === 'object' ? (productData.price || 0) : (productData || 0);
            const productionCost = typeof productData === 'object' ? (productData.productionCost || 0) : (price * 0.7);
            
            productsHTML += `
                <tr>
                    <td class="p-3 font-bold text-gray-800">${product.name}</td>
                    <td class="p-3 text-sm text-gray-600">${product.width} × ${product.height} سم</td>
                    <td class="p-3 text-sm text-gray-600">${product.color}</td>
                    <td class="p-3">
                        <div class="space-y-2">
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${price}" 
                                       onchange="PricingAdmin.saveRulerFramePrice('${product.key}', 'price', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${productionCost}" 
                                       onchange="PricingAdmin.saveRulerFramePrice('${product.key}', 'productionCost', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                        </div>
                    </td>
                    <td class="p-3 text-sm text-gray-600">ج.م</td>
                </tr>
            `;
        });
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير برواز المسطرة</h3>
                        <p class="text-gray-600">قم بتحديد السعر لكل مقاس ولون</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="overflow-x-auto">
                        <table class="w-full text-right">
                            <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                                <tr>
                                    <th class="p-3">المنتج</th>
                                    <th class="p-3">المقاس</th>
                                    <th class="p-3">اللون</th>
                                    <th class="p-3">السعر</th>
                                    <th class="p-3">الوحدة</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${productsHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    // Save ruler frame price
    async saveRulerFramePrice(productKey, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('ruler_frame_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // If it's a number (old format), convert to object
            if (typeof pricing[productKey] === 'number') {
                const oldPrice = pricing[productKey];
                pricing[productKey] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize product object if not exists
            if (!pricing[productKey]) {
                pricing[productKey] = {};
            }
            
            // Update the specific price or production cost
            pricing[productKey][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('ruler_frame_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving ruler frame price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Shipping Flyer Category
    async renderShippingFlyerCategory() {
        const db = this._getDb();
        
        // Load shipping flyer pricing from Firestore
        let shippingFlyerPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('shipping_flyer_pricing').get();
            if (pricingDoc.exists) {
                shippingFlyerPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading shipping flyer pricing:', error);
        }
        
        // Product list
        const products = [
            { key: 'flyer_25x35', name: 'فلاير شحن 25×35', width: 25, height: 35, type: 'flyer' },
            { key: 'flyer_35x40', name: 'فلاير شحن 35×40', width: 35, height: 40, type: 'flyer' },
            { key: 'bag_20x25', name: 'كيس شفاف بسوستة 20×25', width: 20, height: 25, type: 'bag' },
            { key: 'bag_27x35', name: 'كيس شفاف بسوستة 27×35', width: 27, height: 35, type: 'bag' },
            { key: 'bag_35x40', name: 'كيس شفاف بسوستة 35×40', width: 35, height: 40, type: 'bag' }
        ];
        
        let productsHTML = '';
        products.forEach(product => {
            const productPricing = shippingFlyerPricing[product.key] || {};
            
            // Support both old format (number) and new format (object)
            const basePriceData = productPricing.basePrice || {};
            const basePrice = typeof basePriceData === 'object' ? (basePriceData.price || 0) : (basePriceData || 0);
            const basePriceProductionCost = typeof basePriceData === 'object' ? (basePriceData.productionCost || 0) : (basePrice * 0.7);
            
            const printingPrices = productPricing.printingPrices || {};
            
            // Create printing prices table
            let printingPricesHTML = '';
            const quantityRanges = [
                { label: '1-100', key: '1-100' },
                { label: '101-500', key: '101-500' },
                { label: '501-1000', key: '501-1000' },
                { label: '1001-5000', key: '1001-5000' },
                { label: '5001+', key: '5001-' }
            ];
            
            quantityRanges.forEach(range => {
                // Support both old format (number) and new format (object)
                const priceData = printingPrices[range.key] || {};
                const price = typeof priceData === 'object' ? (priceData.price || 0) : (priceData || 0);
                const productionCost = typeof priceData === 'object' ? (priceData.productionCost || 0) : (price * 0.7);
                
                printingPricesHTML += `
                    <tr>
                        <td class="p-2 text-sm font-bold">${range.label}</td>
                        <td class="p-2">
                            <div class="space-y-1">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">بيع</label>
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${price}" 
                                           onchange="PricingAdmin.saveShippingFlyerPrintingPrice('${product.key}', '${range.key}', 'price', this.value)"
                                           class="w-24 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">تنفيذ</label>
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${productionCost}" 
                                           onchange="PricingAdmin.saveShippingFlyerPrintingPrice('${product.key}', '${range.key}', 'productionCost', this.value)"
                                           class="w-24 border border-gray-300 p-1 rounded text-xs focus:border-brandGold outline-none">
                                </div>
                            </div>
                        </td>
                        <td class="p-2 text-sm text-gray-600">ج.م/وحدة</td>
                    </tr>
                `;
            });
            
            productsHTML += `
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <div class="mb-4">
                        <h4 class="text-xl font-bold text-gray-800 mb-3">${product.name}</h4>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-2">سعر البيع للمنتج</label>
                                <div class="flex items-center gap-2">
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${basePrice}" 
                                           onchange="PricingAdmin.saveShippingFlyerBasePrice('${product.key}', 'price', this.value)"
                                           class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                    <span class="text-sm font-bold text-gray-700">ج.م</span>
                                </div>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-gray-700 mb-2">سعر التنفيذ للمنتج</label>
                                <div class="flex items-center gap-2">
                                    <input type="number" 
                                           step="0.01" 
                                           min="0" 
                                           value="${basePriceProductionCost}" 
                                           onchange="PricingAdmin.saveShippingFlyerBasePrice('${product.key}', 'productionCost', this.value)"
                                           class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                    <span class="text-sm font-bold text-gray-700">ج.م</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <h5 class="text-lg font-bold text-gray-700 mb-3">أسعار الطباعة حسب الكمية:</h5>
                        <div class="overflow-x-auto">
                            <table class="w-full text-right border border-gray-200">
                                <thead class="bg-gray-100 text-gray-700 text-sm">
                                    <tr>
                                        <th class="p-2">نطاق الكمية</th>
                                        <th class="p-2">السعر للوحدة (بيع / تنفيذ)</th>
                                        <th class="p-2">الوحدة</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${printingPricesHTML}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
        });
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير فلاير الشحن والأكياس الشفافة</h3>
                        <p class="text-gray-600">قم بتحديد سعر المنتج وأسعار الطباعة حسب الكمية</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                    <p class="text-sm text-gray-700 mb-2">
                        <i class="fas fa-info-circle text-blue-600 ml-2"></i>
                        <strong>معلومات:</strong>
                    </p>
                    <ul class="text-sm text-gray-600 space-y-1 mr-4">
                        <li>• السعر النهائي = (سعر المنتج × الكمية) + (سعر الطباعة × الكمية)</li>
                        <li>• سعر الطباعة يختلف حسب الكمية المطلوبة</li>
                        <li>• عند إضافة منتج للطلب، يمكن اختيار إضافة طباعة</li>
                    </ul>
                </div>
                
                ${productsHTML}
            </div>
        `;
    },

    // Save shipping flyer base price
    async saveShippingFlyerBasePrice(productKey, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('shipping_flyer_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            if (!pricing[productKey]) {
                pricing[productKey] = {};
            }
            
            // If basePrice is a number (old format), convert to object
            if (typeof pricing[productKey].basePrice === 'number') {
                const oldPrice = pricing[productKey].basePrice;
                pricing[productKey].basePrice = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            if (!pricing[productKey].basePrice) {
                pricing[productKey].basePrice = {};
            }
            
            pricing[productKey].basePrice[priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('shipping_flyer_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving shipping flyer base price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Save shipping flyer printing price
    async saveShippingFlyerPrintingPrice(productKey, quantityRange, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('shipping_flyer_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            if (!pricing[productKey]) {
                pricing[productKey] = {};
            }
            
            if (!pricing[productKey].printingPrices) {
                pricing[productKey].printingPrices = {};
            }
            
            // If it's a number (old format), convert to object
            if (typeof pricing[productKey].printingPrices[quantityRange] === 'number') {
                const oldPrice = pricing[productKey].printingPrices[quantityRange];
                pricing[productKey].printingPrices[quantityRange] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            if (!pricing[productKey].printingPrices[quantityRange]) {
                pricing[productKey].printingPrices[quantityRange] = {};
            }
            
            pricing[productKey].printingPrices[quantityRange][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('shipping_flyer_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ سعر الطباعة بنجاح', 'success');
        } catch (error) {
            console.error('Error saving shipping flyer printing price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Plastic Bag Category
    async renderPlasticBagCategory() {
        const db = this._getDb();
        
        // Load plastic bag pricing from Firestore
        let plasticBagPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('plastic_bag_pricing').get();
            if (pricingDoc.exists) {
                plasticBagPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading plastic bag pricing:', error);
        }
        
        // Support both old format (number) and new format (object)
        const basePricePerKgData = plasticBagPricing.basePricePerKg || {};
        const basePricePerKg = typeof basePricePerKgData === 'object' ? (basePricePerKgData.price || 0) : (basePricePerKgData || 0);
        const basePricePerKgProductionCost = typeof basePricePerKgData === 'object' ? (basePricePerKgData.productionCost || 0) : (basePricePerKg * 0.7);
        
        const extraColorPricePerKgData = plasticBagPricing.extraColorPricePerKg || {};
        const extraColorPricePerKg = typeof extraColorPricePerKgData === 'object' ? (extraColorPricePerKgData.price || 0) : (extraColorPricePerKgData || 0);
        const extraColorPricePerKgProductionCost = typeof extraColorPricePerKgData === 'object' ? (extraColorPricePerKgData.productionCost || 0) : (extraColorPricePerKg * 0.7);
        
        const externalHandlePricePerKgData = plasticBagPricing.externalHandlePricePerKg || {};
        const externalHandlePricePerKg = typeof externalHandlePricePerKgData === 'object' ? (externalHandlePricePerKgData.price || 0) : (externalHandlePricePerKgData || 0);
        const externalHandlePricePerKgProductionCost = typeof externalHandlePricePerKgData === 'object' ? (externalHandlePricePerKgData.productionCost || 0) : (externalHandlePricePerKg * 0.7);
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير شنط البلاستيك</h3>
                        <p class="text-gray-600">قم بتحديد السعر بالكيلو والإضافات</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                    <p class="text-sm text-gray-700 mb-2">
                        <i class="fas fa-info-circle text-blue-600 ml-2"></i>
                        <strong>معلومات:</strong>
                    </p>
                    <ul class="text-sm text-gray-600 space-y-1 mr-4">
                        <li>• السعر بالكيلو | أقل كمية: 50 كيلو</li>
                        <li>• السعر النهائي = (السعر الأساسي × الكمية) + (إضافة لون × الكمية) + (يد خارجية × الكمية)</li>
                        <li>• الإضافات اختيارية ويمكن إضافتها معاً</li>
                    </ul>
                </div>
                
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">الأسعار</h4>
                    
                    <div class="space-y-4">
                        <!-- Base Price -->
                        <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <label class="text-lg font-bold text-gray-700 mb-3 block">السعر الأساسي للكيلو:</label>
                            <p class="text-sm text-gray-600 mb-3">السعر الأساسي للشنط البلاستيك</p>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${basePricePerKg}" 
                                               onchange="PricingAdmin.savePlasticBagPrice('basePricePerKg', 'price', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-sm font-bold text-gray-700">ج.م/كيلو</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${basePricePerKgProductionCost}" 
                                               onchange="PricingAdmin.savePlasticBagPrice('basePricePerKg', 'productionCost', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-sm font-bold text-gray-700">ج.م/كيلو</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Extra Color Price -->
                        <div class="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <label class="text-lg font-bold text-gray-700 mb-3 block">إضافة لون زيادة للكيلو:</label>
                            <p class="text-sm text-gray-600 mb-3">سعر إضافة لون إضافي للشنط</p>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${extraColorPricePerKg}" 
                                               onchange="PricingAdmin.savePlasticBagPrice('extraColorPricePerKg', 'price', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-sm font-bold text-gray-700">ج.م/كيلو</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${extraColorPricePerKgProductionCost}" 
                                               onchange="PricingAdmin.savePlasticBagPrice('extraColorPricePerKg', 'productionCost', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-sm font-bold text-gray-700">ج.م/كيلو</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- External Handle Price -->
                        <div class="p-4 bg-green-50 rounded-lg border border-green-200">
                            <label class="text-lg font-bold text-gray-700 mb-3 block">إضافة يد خارجية للكيلو:</label>
                            <p class="text-sm text-gray-600 mb-3">سعر إضافة يد خارجية للشنط</p>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${externalHandlePricePerKg}" 
                                               onchange="PricingAdmin.savePlasticBagPrice('externalHandlePricePerKg', 'price', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-sm font-bold text-gray-700">ج.م/كيلو</span>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                    <div class="flex items-center gap-2">
                                        <input type="number" 
                                               step="0.01" 
                                               min="0" 
                                               value="${externalHandlePricePerKgProductionCost}" 
                                               onchange="PricingAdmin.savePlasticBagPrice('externalHandlePricePerKg', 'productionCost', this.value)"
                                               class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                                        <span class="text-sm font-bold text-gray-700">ج.م/كيلو</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Save plastic bag price
    async savePlasticBagPrice(priceKey, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('plastic_bag_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // If it's a number (old format), convert to object
            if (typeof pricing[priceKey] === 'number') {
                const oldPrice = pricing[priceKey];
                pricing[priceKey] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize price key object if not exists
            if (!pricing[priceKey]) {
                pricing[priceKey] = {};
            }
            
            // Update the specific price or production cost
            pricing[priceKey][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('plastic_bag_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving plastic bag price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Inkjet Paper Category
    async renderInkjetPaperCategory() {
        const db = this._getDb();
        
        // Load inkjet paper pricing from Firestore
        let inkjetPaperPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('inkjet_paper_pricing').get();
            if (pricingDoc.exists) {
                inkjetPaperPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading inkjet paper pricing:', error);
        }
        
        // Product list
        const products = [
            { key: 'paper_80g_a4_single_one_color', name: 'ورقة 80 جرام A4 وجه واحد لون واحد' },
            { key: 'paper_80g_a4_double_one_color', name: 'ورقة 80 جرام A4 وجهين لون واحد' },
            { key: 'paper_80g_a4_single_colors', name: 'ورقة 80 جرام A4 وجه واحد ألوان' },
            { key: 'paper_80g_a4_double_colors', name: 'ورقة 80 جرام A4 وجهين ألوان' },
            { key: 'print_only_single_one_color', name: 'طباعة فقط وجه واحد لون واحد' },
            { key: 'print_only_double_one_color', name: 'طباعة فقط وجهين لون واحد' },
            { key: 'print_only_single_colors', name: 'طباعة فقط وجه واحد ألوان' },
            { key: 'print_only_double_colors', name: 'طباعة فقط وجهين ألوان' }
        ];
        
        let productsHTML = '';
        products.forEach(product => {
            // Support both old format (number) and new format (object)
            const productData = inkjetPaperPricing[product.key] || {};
            const price = typeof productData === 'object' ? (productData.price || 0) : (productData || 0);
            const productionCost = typeof productData === 'object' ? (productData.productionCost || 0) : (price * 0.7);
            
            productsHTML += `
                <tr>
                    <td class="p-3 font-bold text-gray-800">${product.name}</td>
                    <td class="p-3">
                        <div class="space-y-2">
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${price}" 
                                       onchange="PricingAdmin.saveInkjetPaperPrice('${product.key}', 'price', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${productionCost}" 
                                       onchange="PricingAdmin.saveInkjetPaperPrice('${product.key}', 'productionCost', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                        </div>
                    </td>
                    <td class="p-3 text-sm text-gray-600">ج.م</td>
                </tr>
            `;
        });
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير طباعة إنك جيت بالورقة</h3>
                        <p class="text-gray-600">قم بتحديد السعر لكل نوع طباعة</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="overflow-x-auto">
                        <table class="w-full text-right">
                            <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                                <tr>
                                    <th class="p-3">نوع الطباعة</th>
                                    <th class="p-3">السعر</th>
                                    <th class="p-3">الوحدة</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${productsHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    // Save inkjet paper price
    async saveInkjetPaperPrice(productKey, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('inkjet_paper_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // If it's a number (old format), convert to object
            if (typeof pricing[productKey] === 'number') {
                const oldPrice = pricing[productKey];
                pricing[productKey] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize product object if not exists
            if (!pricing[productKey]) {
                pricing[productKey] = {};
            }
            
            // Update the specific price or production cost
            pricing[productKey][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('inkjet_paper_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving inkjet paper price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // Render Safety Printing Category
    async renderSafetyPrintingCategory() {
        const db = this._getDb();
        
        // Load safety printing pricing from Firestore
        let safetyPrintingPricing = {};
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('safety_printing_pricing').get();
            if (pricingDoc.exists) {
                safetyPrintingPricing = pricingDoc.data();
            }
        } catch (error) {
            console.error('Error loading safety printing pricing:', error);
        }
        
        // Product list
        const products = [
            { key: 'vest_workers', name: 'فيست عمال' },
            { key: 'vest_engineers', name: 'فيست مهندسين' },
            { key: 'helmet', name: 'خوذة' },
            { key: 'helmet_vip', name: 'خوذة VIP' }
        ];
        
        let productsHTML = '';
        products.forEach(product => {
            // Support both old format (number) and new format (object)
            const productData = safetyPrintingPricing[product.key] || {};
            const price = typeof productData === 'object' ? (productData.price || 0) : (productData || 0);
            const productionCost = typeof productData === 'object' ? (productData.productionCost || 0) : (price * 0.7);
            
            productsHTML += `
                <tr>
                    <td class="p-3 font-bold text-gray-800">${product.name}</td>
                    <td class="p-3">
                        <div class="space-y-2">
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر البيع</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${price}" 
                                       onchange="PricingAdmin.saveSafetyPrintingPrice('${product.key}', 'price', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                            <div>
                                <label class="text-xs text-gray-600 mb-1 block">سعر التنفيذ</label>
                                <input type="number" 
                                       step="0.01" 
                                       min="0" 
                                       value="${productionCost}" 
                                       onchange="PricingAdmin.saveSafetyPrintingPrice('${product.key}', 'productionCost', this.value)"
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                        </div>
                    </td>
                    <td class="p-3 text-sm text-gray-600">ج.م</td>
                </tr>
            `;
        });
        
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير لسيفتي بالطباعة</h3>
                        <p class="text-gray-600">قم بتحديد السعر لكل منتج</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>
                
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="overflow-x-auto">
                        <table class="w-full text-right">
                            <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                                <tr>
                                    <th class="p-3">المنتج</th>
                                    <th class="p-3">السعر</th>
                                    <th class="p-3">الوحدة</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">
                                ${productsHTML}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    // Render Envelope Category
    async renderEnvelopeCategory() {
        // Load envelope config if available
        if (typeof EnvelopePricing !== 'undefined') {
            await EnvelopePricing.loadConfig();
        }

        // Load current config to display
        const currentConfig = typeof EnvelopePricing !== 'undefined' ? EnvelopePricing.config : null;
        
        // Render base prices for offset
        let basePricesHTML = '';
        if (currentConfig && currentConfig.offset && currentConfig.offset.basePrices) {
            const basePrices = currentConfig.offset.basePrices;
            const quantities = Object.keys(basePrices).map(Number).sort((a, b) => a - b);
            quantities.forEach(qty => {
                basePricesHTML += `
                    <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div class="flex-1">
                            <span class="font-bold text-gray-700">${qty} مظروف</span>
                        </div>
                        <div class="w-32">
                            <input type="number" 
                                   data-quantity="${qty}" 
                                   step="0.01" 
                                   value="${basePrices[qty]}" 
                                   class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                        </div>
                        <div class="text-sm text-gray-600">ج.م</div>
                        <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            });
        }

        // Render inkjet prices for each size
        const renderInkjetPrices = (sizeKey, displayName) => {
            let html = '';
            if (currentConfig && currentConfig.inkjet && currentConfig.inkjet.basePricesPerColor && currentConfig.inkjet.basePricesPerColor[sizeKey]) {
                const basePrices = currentConfig.inkjet.basePricesPerColor[sizeKey];
                const quantities = Object.keys(basePrices).map(Number).sort((a, b) => a - b);
                quantities.forEach(qty => {
                    html += `
                        <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <div class="flex-1">
                                <span class="font-bold text-gray-700">${qty} مظروف</span>
                            </div>
                            <div class="w-32">
                                <input type="number" 
                                       data-quantity="${qty}" 
                                       step="0.01" 
                                       value="${basePrices[qty]}" 
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
                            </div>
                            <div class="text-sm text-gray-600">ج.م لكل لون</div>
                            <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                });
            }
            return html;
        };

        const inkjetAmericanHTML = renderInkjetPrices('american', 'American');
        const inkjetA5HTML = renderInkjetPrices('a5', 'A5');
        const inkjetHalfInvHTML = renderInkjetPrices('half_invitations', 'نص التمنيات');

        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">تسعير المظاريف</h3>
                        <p class="text-gray-600">إدارة أسعار المظاريف - الطباعة الأوفست والإنك جيت</p>
                    </div>
                    <button onclick="PricingAdmin.render()" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition">
                        <i class="fas fa-arrow-right ml-2"></i> رجوع
                    </button>
                </div>

                <!-- Offset Printing Configuration -->
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">إعدادات الطباعة الأوفست</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">الحد الأدنى للكمية</label>
                            <input type="number" id="envelopeOffsetMinQuantity" step="1" min="1" value="${typeof EnvelopePricing !== 'undefined' ? EnvelopePricing.config.offset.minQuantity : 500}" class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-700 mb-1">تكلفة اللوحة لكل لون (ج.م)</label>
                            <input type="number" id="envelopeOffsetPlateCost" step="0.01" min="0" value="${typeof EnvelopePricing !== 'undefined' ? EnvelopePricing.config.offset.plateCostPerColor : 50}" class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <label class="block text-sm font-bold text-gray-700 mb-2">الأسعار الأساسية حسب الكمية</label>
                        <div id="envelopeOffsetBasePrices" class="space-y-2">
                            ${basePricesHTML || '<!-- Base prices will be rendered here -->'}
                        </div>
                        <button onclick="PricingAdmin.addEnvelopeBasePrice()" class="mt-2 bg-brandGold text-white px-4 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition text-sm">
                            <i class="fas fa-plus ml-2"></i> إضافة سعر أساسي
                        </button>
                        <p class="text-xs text-gray-500 mt-2">يمكنك إضافة أسعار أساسية للكميات المختلفة. سيتم استخدام الاستيفاء (interpolation) للكميات بين القيم المحددة.</p>
                    </div>
                </div>

                <!-- Inkjet Printing Configuration -->
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="text-xl font-bold text-gray-800 mb-4">إعدادات الطباعة بالإنك جيت (تسعير بالشرائح)</h4>
                    <p class="text-sm text-gray-600 mb-4">الإنك جيت متاح فقط للأحجام: American، A5، نص التمنيات</p>
                    
                    <!-- American Size -->
                    <div class="mb-6">
                        <h5 class="font-bold text-gray-700 mb-3">American (22×11 سم)</h5>
                        <div id="envelopeInkjetAmericanPrices" class="space-y-2 mb-3">
                            ${inkjetAmericanHTML || '<!-- Base prices will be rendered here -->'}
                        </div>
                        <button onclick="PricingAdmin.addEnvelopeInkjetPrice('american')" class="bg-brandGold text-white px-4 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition text-sm">
                            <i class="fas fa-plus ml-2"></i> إضافة سعر
                        </button>
                    </div>

                    <!-- A5 Size -->
                    <div class="mb-6">
                        <h5 class="font-bold text-gray-700 mb-3">A5 (22.9×16.2 سم)</h5>
                        <div id="envelopeInkjetA5Prices" class="space-y-2 mb-3">
                            ${inkjetA5HTML || '<!-- Base prices will be rendered here -->'}
                        </div>
                        <button onclick="PricingAdmin.addEnvelopeInkjetPrice('a5')" class="bg-brandGold text-white px-4 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition text-sm">
                            <i class="fas fa-plus ml-2"></i> إضافة سعر
                        </button>
                    </div>

                    <!-- Half Invitations Size -->
                    <div class="mb-6">
                        <h5 class="font-bold text-gray-700 mb-3">نص التمنيات (17×25 سم)</h5>
                        <div id="envelopeInkjetHalfInvitationsPrices" class="space-y-2 mb-3">
                            ${inkjetHalfInvHTML || '<!-- Base prices will be rendered here -->'}
                        </div>
                        <button onclick="PricingAdmin.addEnvelopeInkjetPrice('half_invitations')" class="bg-brandGold text-white px-4 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition text-sm">
                            <i class="fas fa-plus ml-2"></i> إضافة سعر
                        </button>
                    </div>
                    
                    <p class="text-xs text-gray-500 mt-4">السعر لكل لون حسب الكمية. سيتم استخدام الاستيفاء (interpolation) للكميات بين القيم المحددة.</p>
                </div>

                <!-- Save Button -->
                <div class="flex justify-end">
                    <button onclick="PricingAdmin.saveEnvelopeConfig()" class="bg-brandGold text-white px-6 py-3 rounded-lg font-bold hover:bg-brandGoldDark transition">
                        <i class="fas fa-save ml-2"></i> حفظ الإعدادات
                    </button>
                </div>
            </div>
        `;
    },

    // Load envelope configuration from Firestore
    async loadEnvelopeConfig() {
        const db = this._getDb();
        try {
            const doc = await this._getColl(this.COLLECTION_NAME).doc('envelope').get();
            if (doc.exists) {
                return doc.data();
            }
        } catch (error) {
            console.error('Error loading envelope config:', error);
        }
        return null;
    },

    // Save envelope configuration to Firestore
    async saveEnvelopeConfig() {
        const db = this._getDb();
        
        try {
            // Collect offset config
            const offsetConfig = {
                minQuantity: parseInt(document.getElementById('envelopeOffsetMinQuantity').value) || 500,
                plateCostPerColor: parseFloat(document.getElementById('envelopeOffsetPlateCost').value) || 50,
                basePrices: {}
            };

            // Collect base prices (if any are added)
            const basePricesContainer = document.getElementById('envelopeOffsetBasePrices');
            if (basePricesContainer) {
                const priceInputs = basePricesContainer.querySelectorAll('input[data-quantity]');
                priceInputs.forEach(input => {
                    const quantity = parseInt(input.dataset.quantity);
                    const price = parseFloat(input.value);
                    if (quantity && price) {
                        offsetConfig.basePrices[quantity] = price;
                    }
                });
            }

            // Collect inkjet config (quantity slabs per color)
            const inkjetConfig = {
                basePricesPerColor: {
                    american: {},
                    a5: {},
                    half_invitations: {}
                }
            };

            // Collect prices for each size
            const sizeContainers = {
                'american': 'envelopeInkjetAmericanPrices',
                'a5': 'envelopeInkjetA5Prices',
                'half_invitations': 'envelopeInkjetHalfInvitationsPrices'
            };

            Object.keys(sizeContainers).forEach(sizeKey => {
                const container = document.getElementById(sizeContainers[sizeKey]);
                if (container) {
                    const priceInputs = container.querySelectorAll('input[data-quantity]');
                    priceInputs.forEach(input => {
                        const quantity = parseInt(input.dataset.quantity);
                        const price = parseFloat(input.value);
                        if (quantity && price) {
                            inkjetConfig.basePricesPerColor[sizeKey][quantity] = price;
                        }
                    });
                }
            });

            const config = {
                offset: offsetConfig,
                inkjet: inkjetConfig
            };

            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('envelope').set(config);
            
            // Update cache
            this._configCache.envelope = config;
            
            // Update EnvelopePricing module if available
            if (typeof EnvelopePricing !== 'undefined') {
                EnvelopePricing.config = config;
                localStorage.setItem('ah_envelopeConfig', JSON.stringify(config));
            }

            Swal.fire({
                icon: 'success',
                title: 'تم الحفظ',
                text: 'تم حفظ إعدادات المظاريف بنجاح',
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error saving envelope config:', error);
            Swal.fire({
                icon: 'error',
                title: 'خطأ',
                text: 'فشل حفظ الإعدادات: ' + error.message
            });
        }
    },

    // Render Notebook Category

    // Add base price row for offset printing
    addEnvelopeBasePrice() {
        const container = document.getElementById('envelopeOffsetBasePrices');
        if (!container) return;

        const quantity = prompt('أدخل الكمية (مثال: 1000)');
        if (!quantity || isNaN(quantity)) return;

        const price = prompt('أدخل السعر الأساسي (ج.م)');
        if (!price || isNaN(price)) return;

        const row = document.createElement('div');
        row.className = 'flex items-center gap-3 p-2 bg-gray-50 rounded-lg';
        row.innerHTML = `
            <div class="flex-1">
                <span class="font-bold text-gray-700">${quantity} مظروف</span>
            </div>
            <div class="w-32">
                <input type="number" 
                       data-quantity="${quantity}" 
                       step="0.01" 
                       value="${price}" 
                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none">
            </div>
            <div class="text-sm text-gray-600">ج.م</div>
            <button onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700">
                <i class="fas fa-trash"></i>
            </button>
        `;
        container.appendChild(row);
    },

    // Render Outdoor Category (Group-Based Structure) - OPTIMIZED
    async renderOutdoorCategory(pricingMode) {
        if (typeof OutdoorPricing === 'undefined') {
            return '<div class="text-red-600">خطأ: وحدة OutdoorPricing غير متاحة</div>';
        }

        const db = this._getDb();
        const collection = pricingMode === 'selling' ? PricingService.SELL_COLLECTION : PricingService.COST_COLLECTION;
        const priceField = pricingMode === 'selling' ? 'pricePerSquareMeter' : 'costPerSquareMeter';
        const addonsField = pricingMode === 'selling' ? 'addonsPrices' : 'addonsCosts';
        
        // Load ALL data in parallel using Promise.all (much faster than sequential)
        const products = OutdoorPricing.getAllProducts();
        const groups = Object.values(OutdoorPricing.GROUPS);
        const specialProducts = ['see-through', 'glitter', 'glossy'];

        // Prepare all document references
        const productPromises = products.map(product => {
            const docId = `Outdoor_${product.id}`;
            return this._getColl(collection).doc(docId).get()
                .then(doc => ({
                    productId: product.id,
                    data: doc.exists ? doc.data() : null
                }))
                .catch(error => {
                    console.error(`Error loading price for ${product.id}:`, error);
                    return { productId: product.id, data: null };
                });
        });

        const groupPromises = groups.map(group => {
            const docId = `Outdoor_Group_${group.id}`;
            return this._getColl(collection).doc(docId).get()
                .then(doc => ({
                    groupId: group.id,
                    data: doc.exists ? doc.data() : null
                }))
                .catch(error => {
                    console.error(`Error loading group addons for ${group.id}:`, error);
                    return { groupId: group.id, data: null };
                });
        });

        const specialPromises = specialProducts.map(productId => {
            const docId = `Outdoor_Group_special_${productId}`;
            return this._getColl(collection).doc(docId).get()
                .then(doc => ({
                    productId: productId,
                    data: doc.exists ? doc.data() : null
                }))
                .catch(error => {
                    console.error(`Error loading special addons for ${productId}:`, error);
                    return { productId: productId, data: null };
                });
        });

        // Load all data in parallel
        const [productResults, groupResults, specialResults] = await Promise.all([
            Promise.all(productPromises),
            Promise.all(groupPromises),
            Promise.all(specialPromises)
        ]);

        // Process results
        const productPrices = {};
        productResults.forEach(({ productId, data }) => {
            productPrices[productId] = data ? (data[priceField] || 0) : 0;
        });

        const groupAddonsPrices = {};
        groupResults.forEach(({ groupId, data }) => {
            groupAddonsPrices[groupId] = data ? (data[addonsField] || {}) : {};
        });

        const specialAddonsPrices = {};
        specialResults.forEach(({ productId, data }) => {
            specialAddonsPrices[productId] = data ? (data[addonsField] || {}) : {};
        });

        let html = `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-xl font-bold text-gray-800">منتجات الأوت دور</h4>
                        <button onclick="PricingAdmin.saveOutdoorPrices('${pricingMode}')" class="bg-brandGold text-white px-6 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition">
                            <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                        </button>
                    </div>
        `;

        // Render by groups
        for (const group of groups) {
            // Skip 'special' group in regular groups loop - it's handled separately below
            if (group.id === 'special') continue;
            
            const groupProducts = group.products.map(id => OutdoorPricing.getProduct(id)).filter(p => p);
            
            html += `
                <div class="mb-8 bg-gray-50 p-6 rounded-xl border-2 border-gray-300">
                    <h5 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-layer-group text-brandGold"></i>
                        ${group.nameAr} (${group.name})
                    </h5>
            `;

            // Group Addons Section (shared across all products in group)
            const groupAddons = OutdoorPricing.GROUP_ADDONS[group.id];
            if (Array.isArray(groupAddons) && groupAddons.length > 0) {
                const currentGroupAddons = groupAddonsPrices[group.id] || {};
                html += `
                    <div class="mb-6 bg-white p-4 rounded-lg border border-gray-200">
                        <h6 class="font-bold text-gray-700 mb-3 text-lg">إضافات المجموعة (مشتركة بين جميع منتجات هذه المجموعة)</h6>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                `;
                for (const addon of groupAddons) {
                    const addonPrice = currentGroupAddons[addon.id] || 0;
                    const maxWidthText = addon.maxWidth ? ` <span class="text-xs text-red-600">(حد أقصى ${addon.maxWidth} سم)</span>` : '';
                    const unitText = addon.unit === 'perSquareMeter' ? 'ج.م/م²' : addon.unit === 'perMeter' ? 'ج.م/م' : 'ج.م';
                    html += `
                        <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <label class="block text-sm font-bold text-gray-700 mb-1">${addon.nameAr}${maxWidthText}</label>
                            <div class="flex items-center gap-2">
                                <input type="number" 
                                       id="outdoor_group_${group.id}_addon_${addon.id}" 
                                       step="0.01" 
                                       min="0" 
                                       value="${addonPrice.toFixed(2)}" 
                                       class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                                <span class="text-xs text-gray-500">${unitText}</span>
                            </div>
                        </div>
                    `;
                }
                html += `</div></div>`;
            }

            // Products in this group
            html += `
                <div class="mt-4">
                    <h6 class="font-bold text-gray-700 mb-3">المنتجات في هذه المجموعة:</h6>
                    <div class="space-y-3">
            `;
            for (const product of groupProducts) {
                const productPrice = productPrices[product.id] || 0;
                html += `
                    <div class="bg-white p-4 rounded-lg border border-gray-200">
                        <div class="flex justify-between items-center">
                            <div class="flex-1">
                                <h6 class="font-bold text-gray-800">${product.nameAr}</h6>
                                <p class="text-sm text-gray-600">${product.name}</p>
                            </div>
                            <div class="w-48">
                                <label class="block text-xs text-gray-600 mb-1">السعر لكل متر مربع (ج.م)</label>
                                <input type="number" 
                                       id="outdoor_product_${product.id}" 
                                       step="0.01" 
                                       min="0" 
                                       value="${productPrice.toFixed(2)}" 
                                       class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                        </div>
                    </div>
                `;
            }
            html += `</div></div>`;
            html += `</div>`; // Close group section
        }

        // Special Products (See-Through, Glitter, Glossy, Lamination Only)
        const specialGroup = OutdoorPricing.GROUPS.special;
        if (specialGroup) {
            html += `
                <div class="mb-8 bg-purple-50 p-6 rounded-xl border-2 border-purple-300">
                    <h5 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-star text-purple-600"></i>
                        ${specialGroup.nameAr} (${specialGroup.name})
                    </h5>
            `;

            for (const productId of specialGroup.products) {
                const product = OutdoorPricing.getProduct(productId);
                if (!product) continue;

                const productPrice = productPrices[productId] || 0;
                const productAddons = OutdoorPricing.getProductAddons(productId);
                const currentAddons = specialAddonsPrices[productId] || {};

                html += `
                    <div class="mb-4 bg-white p-4 rounded-lg border border-gray-200">
                        <div class="mb-3">
                            <h6 class="font-bold text-gray-800 text-lg">${product.nameAr}</h6>
                            <p class="text-sm text-gray-600">${product.name}</p>
                        </div>
                        <div class="mb-3">
                            <label class="block text-sm font-bold text-gray-700 mb-1">السعر لكل متر مربع (ج.م)</label>
                            <input type="number" 
                                   id="outdoor_product_${productId}" 
                                   step="0.01" 
                                   min="0" 
                                   value="${productPrice.toFixed(2)}" 
                                   class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                        </div>
                `;

                // Special product addons
                if (productAddons.length > 0) {
                    html += `
                        <div class="mt-3 pt-3 border-t border-gray-300">
                            <h6 class="font-bold text-gray-700 mb-2">إضافات خاصة لهذا المنتج:</h6>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    `;
                    for (const addon of productAddons) {
                        const addonPrice = currentAddons[addon.id] || 0;
                        const maxWidthText = addon.maxWidth ? ` <span class="text-xs text-red-600">(حد أقصى ${addon.maxWidth} سم)</span>` : '';
                        const unitText = addon.unit === 'perSquareMeter' ? 'ج.م/م²' : addon.unit === 'perMeter' ? 'ج.م/م' : 'ج.م';
                        html += `
                            <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <label class="block text-sm font-bold text-gray-700 mb-1">${addon.nameAr}${maxWidthText}</label>
                                <div class="flex items-center gap-2">
                                    <input type="number" 
                                           id="outdoor_special_${productId}_addon_${addon.id}" 
                                           step="0.01" 
                                           min="0" 
                                           value="${addonPrice.toFixed(2)}" 
                                           class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                                    <span class="text-xs text-gray-500">${unitText}</span>
                                </div>
                            </div>
                        `;
                    }
                    html += `</div></div>`;
                }

                html += `</div>`;
            }

            html += `</div>`;
        }

        html += `
                </div>
            </div>
        `;

        return html;
    },

    // Save Outdoor prices (Group-Based Structure)
    async saveOutdoorPrices(pricingMode) {
        if (typeof OutdoorPricing === 'undefined') {
            Swal.fire('خطأ', 'وحدة OutdoorPricing غير متاحة', 'error');
            return;
        }

        const db = this._getDb();
        const collection = pricingMode === 'selling' ? PricingService.SELL_COLLECTION : PricingService.COST_COLLECTION;
        const priceField = pricingMode === 'selling' ? 'pricePerSquareMeter' : 'costPerSquareMeter';
        const addonsField = pricingMode === 'selling' ? 'addonsPrices' : 'addonsCosts';

        try {
            Swal.fire({
                title: 'جارٍ الحفظ...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const batch = db.batch();
            let savedCount = 0;

            // Save product prices (each product has its own price per square meter)
            const products = OutdoorPricing.getAllProducts();
            for (const product of products) {
                const priceValue = parseFloat(document.getElementById(`outdoor_product_${product.id}`)?.value || 0);
                
                const docId = `Outdoor_${product.id}`;
                const docRef = this._getColl(collection).doc(docId);
                
                const dataToSave = {
                    categoryId: 'Outdoor',
                    productId: product.id,
                    groupId: product.groupId,
                    [priceField]: priceValue,
                    currency: 'EGP',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                batch.set(docRef, dataToSave, { merge: true });
                savedCount++;
            }

            // Save group addon prices (shared across all products in group)
            const groups = Object.values(OutdoorPricing.GROUPS);
            for (const group of groups) {
                // Skip 'special' group - it's an object, not an array, and is handled separately
                if (group.id === 'special') continue;
                
                const groupAddons = OutdoorPricing.GROUP_ADDONS[group.id];
                // Check if it's an array and has items
                if (!Array.isArray(groupAddons) || groupAddons.length === 0) continue;

                const addonsData = {};
                for (const addon of groupAddons) {
                    const addonPrice = parseFloat(document.getElementById(`outdoor_group_${group.id}_addon_${addon.id}`)?.value || 0);
                    if (addonPrice > 0) {
                        addonsData[addon.id] = addonPrice;
                    }
                }

                const docId = `Outdoor_Group_${group.id}`;
                const docRef = this._getColl(collection).doc(docId);
                
                const dataToSave = {
                    categoryId: 'Outdoor',
                    groupId: group.id,
                    [addonsField]: addonsData,
                    currency: 'EGP',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                batch.set(docRef, dataToSave, { merge: true });
            }

            // Save special product addons (See-Through, Glitter, Glossy)
            const specialProducts = ['see-through', 'glitter', 'glossy'];
            for (const productId of specialProducts) {
                const productAddons = OutdoorPricing.getProductAddons(productId);
                if (productAddons.length === 0) continue;

                const addonsData = {};
                for (const addon of productAddons) {
                    const addonPrice = parseFloat(document.getElementById(`outdoor_special_${productId}_addon_${addon.id}`)?.value || 0);
                    if (addonPrice > 0) {
                        addonsData[addon.id] = addonPrice;
                    }
                }

                const docId = `Outdoor_Group_special_${productId}`;
                const docRef = this._getColl(collection).doc(docId);
                
                const dataToSave = {
                    categoryId: 'Outdoor',
                    productId: productId,
                    groupId: 'special',
                    [addonsField]: addonsData,
                    currency: 'EGP',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                batch.set(docRef, dataToSave, { merge: true });
            }

            await batch.commit();

            Swal.fire('تم', `تم حفظ ${savedCount} منتج و${groups.length} مجموعة بنجاح`, 'success');
            
            // Re-render to show updated prices
            this.render('Outdoor', pricingMode);
        } catch (error) {
            console.error('Error saving Outdoor prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    // Render Indoor Category (same architecture as Outdoor, max 160 cm)
    async renderIndoorCategory(pricingMode) {
        if (typeof IndoorPricing === 'undefined') {
            return '<div class="text-red-600">خطأ: وحدة IndoorPricing غير متاحة</div>';
        }

        const db = this._getDb();
        const collection = pricingMode === 'selling' ? PricingService.SELL_COLLECTION : PricingService.COST_COLLECTION;
        const priceFieldSqm = pricingMode === 'selling' ? 'pricePerSquareMeter' : 'costPerSquareMeter';
        const priceFieldM = pricingMode === 'selling' ? 'pricePerMeter' : 'costPerMeter';
        const addonsField = pricingMode === 'selling' ? 'addonsPrices' : 'addonsCosts';

        const products = IndoorPricing.getAllProducts();
        const groups = Object.values(IndoorPricing.GROUPS);
        const specialProducts = ['see-through', 'glitter', 'glossy'];

        const productPromises = products.map(product => {
            const docId = `Indoor_${product.id}`;
            return this._getColl(collection).doc(docId).get()
                .then(doc => ({ productId: product.id, data: doc.exists ? doc.data() : null }))
                .catch(() => ({ productId: product.id, data: null }));
        });

        const groupIdsForAddons = ['banner', 'vinyl', 'flex'];
        const groupPromises = groupIdsForAddons.map(groupId => {
            const docId = `Indoor_Group_${groupId}`;
            return this._getColl(collection).doc(docId).get()
                .then(doc => ({ groupId, data: doc.exists ? doc.data() : null }))
                .catch(() => ({ groupId, data: null }));
        });

        const specialPromises = specialProducts.map(productId => {
            const docId = `Indoor_Group_special_${productId}`;
            return this._getColl(collection).doc(docId).get()
                .then(doc => ({ productId, data: doc.exists ? doc.data() : null }))
                .catch(() => ({ productId, data: null }));
        });

        const cutterPlotterPromise = this._getColl(collection).doc('Indoor_Group_cutterPlotter').get()
            .then(doc => ({ data: doc.exists ? doc.data() : null })).catch(() => ({ data: null }));
        const printCutPromise = this._getColl(collection).doc('Indoor_Group_printCut').get()
            .then(doc => ({ data: doc.exists ? doc.data() : null })).catch(() => ({ data: null }));

        const [productResults, groupResults, specialResults, cutterPlotterRes, printCutRes] = await Promise.all([
            Promise.all(productPromises),
            Promise.all(groupPromises),
            Promise.all(specialPromises),
            cutterPlotterPromise,
            printCutPromise
        ]);

        const productPricesSqm = {};
        const productPricesM = {};
        productResults.forEach(({ productId, data }) => {
            if (!data) return;
            if (data[priceFieldSqm] !== undefined) productPricesSqm[productId] = data[priceFieldSqm] || 0;
            if (data[priceFieldM] !== undefined) productPricesM[productId] = data[priceFieldM] || 0;
        });

        const groupAddonsPrices = {};
        groupResults.forEach(({ groupId, data }) => {
            groupAddonsPrices[groupId] = data ? (data[addonsField] || {}) : {};
        });
        const specialAddonsPrices = {};
        specialResults.forEach(({ productId, data }) => {
            specialAddonsPrices[productId] = data ? (data[addonsField] || {}) : {};
        });
        const cutterPlotterAddons = cutterPlotterRes.data ? (cutterPlotterRes.data[addonsField] || {}) : {};
        const printCutAddons = printCutRes.data ? (printCutRes.data[addonsField] || {}) : {};

        let html = `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-xl font-bold text-gray-800">منتجات الإندور (حد أقصى 160 سم)</h4>
                        <button onclick="PricingAdmin.saveIndoorPrices('${pricingMode}')" class="bg-brandGold text-white px-6 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition">
                            <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                        </button>
                    </div>
        `;

        for (const group of groups) {
            if (group.id === 'special') continue;
            if (group.id === 'cutterPlotter' || group.id === 'printCut') continue;

            const groupProducts = group.products.map(id => IndoorPricing.getProduct(id)).filter(p => p);
            const groupAddons = IndoorPricing.GROUP_ADDONS[group.id];
            if (!Array.isArray(groupAddons)) continue;

            const currentGroupAddons = groupAddonsPrices[group.id] || {};
            html += `
                <div class="mb-8 bg-gray-50 p-6 rounded-xl border-2 border-gray-300">
                    <h5 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-layer-group text-brandGold"></i>
                        ${group.nameAr} (${group.name})
                    </h5>
                    <div class="mb-6 bg-white p-4 rounded-lg border border-gray-200">
                        <h6 class="font-bold text-gray-700 mb-3 text-lg">إضافات المجموعة</h6>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            `;
            for (const addon of groupAddons) {
                const addonPrice = currentGroupAddons[addon.id] || 0;
                const maxWidthText = addon.maxWidth ? ` <span class="text-xs text-red-600">(حد أقصى ${addon.maxWidth} سم)</span>` : '';
                const unitText = addon.unit === 'perSquareMeter' ? 'ج.م/م²' : addon.unit === 'perMeter' ? 'ج.م/م' : 'ج.م';
                html += `
                    <div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label class="block text-sm font-bold text-gray-700 mb-1">${addon.nameAr}${maxWidthText}</label>
                        <input type="number" id="indoor_group_${group.id}_addon_${addon.id}" step="0.01" min="0" value="${addonPrice.toFixed(2)}" class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                        <span class="text-xs text-gray-500">${unitText}</span>
                    </div>
                `;
            }
            html += `</div></div><div class="mt-4"><h6 class="font-bold text-gray-700 mb-3">المنتجات:</h6><div class="space-y-3">`;
            for (const product of groupProducts) {
                const price = productPricesSqm[product.id] || 0;
                html += `
                    <div class="bg-white p-4 rounded-lg border border-gray-200">
                        <div class="flex justify-between items-center">
                            <div class="flex-1">
                                <h6 class="font-bold text-gray-800">${product.nameAr}</h6>
                                <p class="text-sm text-gray-600">${product.name}</p>
                            </div>
                            <div class="w-48">
                                <label class="block text-xs text-gray-600 mb-1">السعر لكل متر مربع (ج.م)</label>
                                <input type="number" id="indoor_product_${product.id}" step="0.01" min="0" value="${price.toFixed(2)}" class="w-full border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            </div>
                        </div>
                    </div>
                `;
            }
            html += `</div></div></div>`;
        }

        // Special group (see-through, glitter, glossy, lamination-only)
        const specialGroup = IndoorPricing.GROUPS.special;
        if (specialGroup) {
            html += `<div class="mb-8 bg-purple-50 p-6 rounded-xl border-2 border-purple-300">
                <h5 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><i class="fas fa-star text-purple-600"></i> ${specialGroup.nameAr}</h5>`;
            for (const productId of specialGroup.products) {
                const product = IndoorPricing.getProduct(productId);
                if (!product) continue;
                const productPrice = productPricesSqm[productId] || 0;
                const productAddons = IndoorPricing.getProductAddons(productId);
                const currentAddons = specialAddonsPrices[productId] || {};
                html += `<div class="mb-4 bg-white p-4 rounded-lg border border-gray-200">
                    <div class="mb-3"><h6 class="font-bold text-gray-800 text-lg">${product.nameAr}</h6><p class="text-sm text-gray-600">${product.name}</p></div>
                    <div class="mb-3">
                        <label class="block text-sm font-bold text-gray-700 mb-1">السعر لكل متر مربع (ج.م)</label>
                        <input type="number" id="indoor_product_${productId}" step="0.01" min="0" value="${productPrice.toFixed(2)}" class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                    </div>`;
                if (productAddons.length > 0) {
                    html += `<div class="mt-3 pt-3 border-t border-gray-300"><h6 class="font-bold text-gray-700 mb-2">إضافات خاصة:</h6><div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;
                    for (const addon of productAddons) {
                        const addonPrice = currentAddons[addon.id] || 0;
                        const maxWidthText = addon.maxWidth ? ` <span class="text-xs text-red-600">(حد أقصى ${addon.maxWidth} سم)</span>` : '';
                        const unitText = addon.unit === 'perSquareMeter' ? 'ج.م/م²' : addon.unit === 'perMeter' ? 'ج.م/م' : 'ج.م';
                        html += `<div class="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <label class="block text-sm font-bold text-gray-700 mb-1">${addon.nameAr}${maxWidthText}</label>
                            <input type="number" id="indoor_special_${productId}_addon_${addon.id}" step="0.01" min="0" value="${addonPrice.toFixed(2)}" class="flex-1 border border-gray-300 p-2 rounded-lg focus:border-brandGold outline-none text-sm">
                            <span class="text-xs text-gray-500">${unitText}</span>
                        </div>`;
                    }
                    html += `</div></div>`;
                }
                html += `</div>`;
            }
            html += `</div>`;
        }

        // Cutter Plotter (price per meter)
        const cutterGroup = IndoorPricing.GROUPS.cutterPlotter;
        if (cutterGroup) {
            const product = IndoorPricing.getProduct('cutter-plotter');
            if (product) {
                const price = productPricesM['cutter-plotter'] || 0;
                const addons = IndoorPricing.GROUP_ADDONS.cutterPlotter || [];
                html += `<div class="mb-8 bg-teal-50 p-6 rounded-xl border-2 border-teal-300">
                    <h5 class="text-xl font-bold text-gray-800 mb-4"><i class="fas fa-cut text-teal-600 ml-2"></i>${cutterGroup.nameAr}</h5>
                    <div class="mb-4 bg-white p-4 rounded-lg border border-gray-200">
                        <h6 class="font-bold text-gray-800">${product.nameAr}</h6>
                        <label class="block text-sm font-bold text-gray-700 mb-1 mt-2">السعر لكل متر (ج.م)</label>
                        <input type="number" id="indoor_product_cutter-plotter" step="0.01" min="0" value="${price.toFixed(2)}" class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">`;
                for (const addon of addons) {
                    const addonPrice = cutterPlotterAddons[addon.id] || 0;
                    html += `<div class="bg-gray-50 p-3 rounded-lg"><label class="block text-sm font-bold text-gray-700 mb-1">${addon.nameAr}</label>
                        <input type="number" id="indoor_group_cutterPlotter_addon_${addon.id}" step="0.01" min="0" value="${addonPrice.toFixed(2)}" class="w-full border border-gray-300 p-2 rounded-lg text-sm"></div>`;
                }
                html += `</div></div></div>`;
            }
        }

        // Print & Cut (price per meter + lamination addons)
        const printCutGroup = IndoorPricing.GROUPS.printCut;
        if (printCutGroup) {
            const product = IndoorPricing.getProduct('print-and-cut');
            if (product) {
                const price = productPricesM['print-and-cut'] || 0;
                const addons = IndoorPricing.GROUP_ADDONS.printCut || [];
                html += `<div class="mb-8 bg-cyan-50 p-6 rounded-xl border-2 border-cyan-300">
                    <h5 class="text-xl font-bold text-gray-800 mb-4"><i class="fas fa-print text-cyan-600 ml-2"></i>${printCutGroup.nameAr}</h5>
                    <div class="mb-4 bg-white p-4 rounded-lg border border-gray-200">
                        <h6 class="font-bold text-gray-800">${product.nameAr}</h6>
                        <label class="block text-sm font-bold text-gray-700 mb-1 mt-2">السعر لكل متر (ج.م)</label>
                        <input type="number" id="indoor_product_print-and-cut" step="0.01" min="0" value="${price.toFixed(2)}" class="w-full border border-gray-300 p-3 rounded-lg focus:border-brandGold outline-none">
                        <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">`;
                for (const addon of addons) {
                    const addonPrice = printCutAddons[addon.id] || 0;
                    const maxWidthText = addon.maxWidth ? ` <span class="text-xs text-red-600">(حد أقصى ${addon.maxWidth} سم)</span>` : '';
                    html += `<div class="bg-gray-50 p-3 rounded-lg"><label class="block text-sm font-bold text-gray-700 mb-1">${addon.nameAr}${maxWidthText}</label>
                        <input type="number" id="indoor_group_printCut_addon_${addon.id}" step="0.01" min="0" value="${addonPrice.toFixed(2)}" class="w-full border border-gray-300 p-2 rounded-lg text-sm"></div>`;
                }
                html += `</div></div></div>`;
            }
        }

        html += `</div></div>`;
        return html;
    },

    async saveIndoorPrices(pricingMode) {
        if (typeof IndoorPricing === 'undefined') {
            Swal.fire('خطأ', 'وحدة IndoorPricing غير متاحة', 'error');
            return;
        }
        const db = this._getDb();
        const collection = pricingMode === 'selling' ? PricingService.SELL_COLLECTION : PricingService.COST_COLLECTION;
        const priceFieldSqm = pricingMode === 'selling' ? 'pricePerSquareMeter' : 'costPerSquareMeter';
        const priceFieldM = pricingMode === 'selling' ? 'pricePerMeter' : 'costPerMeter';
        const addonsField = pricingMode === 'selling' ? 'addonsPrices' : 'addonsCosts';

        try {
            Swal.fire({ title: 'جارٍ الحفظ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            const batch = db.batch();
            let savedCount = 0;

            const products = IndoorPricing.getAllProducts();
            for (const product of products) {
                const docId = `Indoor_${product.id}`;
                const docRef = this._getColl(collection).doc(docId);
                const isPerMeter = product.pricingUnit === 'perMeter';
                const inputId = `indoor_product_${product.id}`;
                const priceValue = parseFloat(document.getElementById(inputId)?.value || 0);
                const dataToSave = {
                    categoryId: 'Indoor',
                    productId: product.id,
                    groupId: product.groupId,
                    currency: 'EGP',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                if (isPerMeter) dataToSave[priceFieldM] = priceValue;
                else dataToSave[priceFieldSqm] = priceValue;
                batch.set(docRef, dataToSave, { merge: true });
                savedCount++;
            }

            const groupIdsForAddons = ['banner', 'vinyl', 'flex'];
            for (const groupId of groupIdsForAddons) {
                const groupAddons = IndoorPricing.GROUP_ADDONS[groupId];
                if (!Array.isArray(groupAddons) || groupAddons.length === 0) continue;
                const addonsData = {};
                for (const addon of groupAddons) {
                    const v = parseFloat(document.getElementById(`indoor_group_${groupId}_addon_${addon.id}`)?.value || 0);
                    if (v > 0) addonsData[addon.id] = v;
                }
                const docRef = this._getColl(collection).doc(`Indoor_Group_${groupId}`);
                batch.set(docRef, { categoryId: 'Indoor', groupId, [addonsField]: addonsData, currency: 'EGP', updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
            }

            for (const productId of ['see-through', 'glitter', 'glossy']) {
                const productAddons = IndoorPricing.getProductAddons(productId);
                if (productAddons.length === 0) continue;
                const addonsData = {};
                for (const addon of productAddons) {
                    const v = parseFloat(document.getElementById(`indoor_special_${productId}_addon_${addon.id}`)?.value || 0);
                    if (v > 0) addonsData[addon.id] = v;
                }
                const docRef = this._getColl(collection).doc(`Indoor_Group_special_${productId}`);
                batch.set(docRef, { categoryId: 'Indoor', productId, groupId: 'special', [addonsField]: addonsData, currency: 'EGP', updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
            }

            const cutterAddons = IndoorPricing.GROUP_ADDONS.cutterPlotter || [];
            const cutterAddonsData = {};
            for (const addon of cutterAddons) {
                const v = parseFloat(document.getElementById(`indoor_group_cutterPlotter_addon_${addon.id}`)?.value || 0);
                if (v > 0) cutterAddonsData[addon.id] = v;
            }
            batch.set(this._getColl(collection).doc('Indoor_Group_cutterPlotter'), { categoryId: 'Indoor', groupId: 'cutterPlotter', [addonsField]: cutterAddonsData, currency: 'EGP', updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

            const printCutAddons = IndoorPricing.GROUP_ADDONS.printCut || [];
            const printCutAddonsData = {};
            for (const addon of printCutAddons) {
                const v = parseFloat(document.getElementById(`indoor_group_printCut_addon_${addon.id}`)?.value || 0);
                if (v > 0) printCutAddonsData[addon.id] = v;
            }
            batch.set(this._getColl(collection).doc('Indoor_Group_printCut'), { categoryId: 'Indoor', groupId: 'printCut', [addonsField]: printCutAddonsData, currency: 'EGP', updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });

            await batch.commit();
            Swal.fire('تم', 'تم حفظ أسعار الإندور بنجاح', 'success');
            this.render('Indoor', pricingMode);
        } catch (error) {
            console.error('Error saving Indoor prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    async renderStandsCategory(pricingMode, subCategoryId) {
        if (typeof StandsPricing === 'undefined') return '<div class="text-red-600">وحدة StandsPricing غير متاحة</div>';

        // عند عدم اختيار نوع فرعي: عرض رول أب | اكس بانر | بوب أب
        if (!subCategoryId) {
            const subs = StandsPricing.SUB_CATEGORIES;
            const modeLabel = pricingMode === 'selling' ? 'سعر البيع' : 'سعر التكلفة';
            return `
                <div class="space-y-6">
                    <div class="mb-6">
                        <p class="text-gray-600 mb-2">${pricingMode === 'selling' ? 'من product_prices_sell' : 'من product_prices_cost'}</p>
                        <h3 class="text-xl font-bold text-gray-800">الاستندات — ${modeLabel} — اختر النوع</h3>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        ${subs.map(s => `
                            <div onclick="PricingAdmin.render('Stands', '${pricingMode}', '${s.id}')" class="category-card cursor-pointer bg-gradient-to-br from-cyan-50 to-sky-100 border-2 border-cyan-300 hover:border-cyan-500 p-8 rounded-xl transition-all hover:shadow-lg">
                                <div class="text-center">
                                    <i class="fas fa-th-large text-6xl text-cyan-600 mb-4"></i>
                                    <h4 class="font-bold text-xl text-gray-800 mb-2">${s.nameAr}</h4>
                                    <p class="text-sm text-gray-600">${s.name}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        const db = this._getDb();
        const collection = pricingMode === 'selling'
            ? (typeof PricingService !== 'undefined' ? PricingService.SELL_COLLECTION : 'product_prices_sell')
            : (typeof PricingService !== 'undefined' ? PricingService.COST_COLLECTION : 'product_prices_cost');
        const priceEmptyField = pricingMode === 'selling' ? 'priceEmpty' : 'costEmpty';
        const pricePrintedField = pricingMode === 'selling' ? 'pricePrinted' : 'costPrinted';
        const addonsField = pricingMode === 'selling' ? 'addonsPrices' : 'addonsCosts';

        const products = StandsPricing.getProductsBySubCategory(subCategoryId);
        const subCat = StandsPricing.getSubCategory(subCategoryId);
        const addons = StandsPricing.getSubCategoryAddons(subCategoryId);

        const productPromises = products.map(p => this._getColl(collection).doc(`Stands_${subCategoryId}_${p.id}`).get().then(doc => ({ productId: p.id, data: doc.exists ? doc.data() : null })).catch(() => ({ productId: p.id, data: null })));
        const groupAddonPromise = (addons.length > 0) ? this._getColl(collection).doc(`Stands_Group_${subCategoryId}`).get().then(doc => ({ data: doc.exists ? doc.data() : null })).catch(() => ({ data: null })) : Promise.resolve({ data: null });

        const [productResults, groupAddonRes] = await Promise.all([Promise.all(productPromises), groupAddonPromise]);

        const productPrices = {};
        productResults.forEach(({ productId, data }) => {
            const emptyVal = data && (data[priceEmptyField] !== undefined && data[priceEmptyField] !== null) ? Number(data[priceEmptyField]) : 0;
            const printedVal = data && (data[pricePrintedField] !== undefined && data[pricePrintedField] !== null) ? Number(data[pricePrintedField]) : 0;
            productPrices[productId] = { empty: emptyVal, printed: printedVal };
        });
        const groupAddonsData = groupAddonRes.data ? (groupAddonRes.data[addonsField] || {}) : {};

        let html = `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="text-xl font-bold text-gray-800">${subCat.nameAr} (${subCat.name}) — ${pricingMode === 'selling' ? 'سعر البيع' : 'سعر التكلفة'}</h4>
                        <button onclick="PricingAdmin.saveStandsPrices('${pricingMode}', '${subCategoryId}')" class="bg-brandGold text-white px-6 py-2 rounded-lg font-bold hover:bg-brandGoldDark transition"><i class="fas fa-save ml-2"></i> حفظ</button>
                    </div>
        `;

        if (addons.length > 0) {
            html += `<div class="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h6 class="font-bold text-gray-700 mb-3">إضافات اللامينيشن (ج.م / م²)</h6>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;
            addons.forEach(addon => {
                const val = groupAddonsData[addon.id] || 0;
                html += `<div class="flex items-center gap-2"><label class="w-40 font-bold text-gray-700">${addon.nameAr}</label><input type="number" id="stands_group_${subCategoryId}_addon_${addon.id}" step="0.01" min="0" value="${val.toFixed(2)}" class="border border-gray-300 p-2 rounded-lg w-32"></div>`;
            });
            html += `</div></div>`;
        }

        html += `<div class="space-y-3"><h6 class="font-bold text-gray-700 mb-2">المنتجات — فارغ / مطبوع (ج.م)</h6>`;
        products.forEach(product => {
            const prices = productPrices[product.id] || { empty: 0, printed: 0 };
            html += `
                <div class="flex flex-wrap items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div class="flex-1 min-w-[200px]"><strong>${product.nameAr}</strong><br><span class="text-sm text-gray-500">${product.name}</span></div>
                    <div class="flex items-center gap-2"><label class="text-sm text-gray-600">فارغ:</label><input type="number" id="stands_product_${product.id}_empty" step="0.01" min="0" value="${prices.empty.toFixed(2)}" class="border border-gray-300 p-2 rounded-lg w-24"></div>
                    <div class="flex items-center gap-2"><label class="text-sm text-gray-600">مطبوع:</label><input type="number" id="stands_product_${product.id}_printed" step="0.01" min="0" value="${prices.printed.toFixed(2)}" class="border border-gray-300 p-2 rounded-lg w-24"></div>
                </div>`;
        });
        html += `</div></div></div>`;
        return html;
    },

    async saveStandsPrices(pricingMode, subCategoryId) {
        if (typeof StandsPricing === 'undefined' || !subCategoryId) {
            Swal.fire('خطأ', 'بيانات غير كاملة', 'error');
            return;
        }
        const db = this._getDb();
        const collection = pricingMode === 'selling'
            ? (typeof PricingService !== 'undefined' ? PricingService.SELL_COLLECTION : 'product_prices_sell')
            : (typeof PricingService !== 'undefined' ? PricingService.COST_COLLECTION : 'product_prices_cost');
        const priceEmptyField = pricingMode === 'selling' ? 'priceEmpty' : 'costEmpty';
        const pricePrintedField = pricingMode === 'selling' ? 'pricePrinted' : 'costPrinted';
        const addonsField = pricingMode === 'selling' ? 'addonsPrices' : 'addonsCosts';

        try {
            Swal.fire({ title: 'جارٍ الحفظ...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
            const batch = db.batch();
            const products = StandsPricing.getProductsBySubCategory(subCategoryId);
            const addons = StandsPricing.getSubCategoryAddons(subCategoryId);

            for (const product of products) {
                const docRef = this._getColl(collection).doc(`Stands_${subCategoryId}_${product.id}`);
                const emptyVal = parseFloat(document.getElementById(`stands_product_${product.id}_empty`)?.value || 0);
                const printedVal = parseFloat(document.getElementById(`stands_product_${product.id}_printed`)?.value || 0);
                batch.set(docRef, {
                    categoryId: 'Stands',
                    subCategoryId,
                    productId: product.id,
                    [priceEmptyField]: emptyVal,
                    [pricePrintedField]: printedVal,
                    currency: 'EGP',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            if (addons.length > 0) {
                const addonsData = {};
                addons.forEach(addon => {
                    const v = parseFloat(document.getElementById(`stands_group_${subCategoryId}_addon_${addon.id}`)?.value || 0);
                    if (v > 0) addonsData[addon.id] = v;
                });
                batch.set(this._getColl(collection).doc(`Stands_Group_${subCategoryId}`), {
                    categoryId: 'Stands',
                    subCategoryId,
                    [addonsField]: addonsData,
                    currency: 'EGP',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            await batch.commit();
            Swal.fire('تم', 'تم حفظ الأسعار بنجاح', 'success');
            this.render('Stands', pricingMode, subCategoryId);
        } catch (error) {
            console.error('Error saving Stands prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    // Render Cost Management section

    // Save safety printing price
    async saveSafetyPrintingPrice(productKey, priceType, value) {
        const db = this._getDb();
        
        try {
            const pricingDoc = await this._getColl(this.COLLECTION_NAME).doc('safety_printing_pricing').get();
            let pricing = pricingDoc.exists ? pricingDoc.data() : {};
            
            // If it's a number (old format), convert to object
            if (typeof pricing[productKey] === 'number') {
                const oldPrice = pricing[productKey];
                pricing[productKey] = {
                    price: oldPrice,
                    productionCost: oldPrice * 0.7
                };
            }
            
            // Initialize product object if not exists
            if (!pricing[productKey]) {
                pricing[productKey] = {};
            }
            
            // Update the specific price or production cost
            pricing[productKey][priceType] = parseFloat(value) || 0;
            
            // Save to Firestore
            await this._getColl(this.COLLECTION_NAME).doc('safety_printing_pricing').set(pricing);
            
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving safety printing price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    // ==================== ACRYLIC & BADGE PRICING ADMIN ====================
    async renderAcrylicBadgeCategory(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof AcrylicBadgePricing !== 'undefined')
            ? (isSell ? AcrylicBadgePricing.SELL_COLLECTION : AcrylicBadgePricing.COST_COLLECTION)
            : (isSell ? 'acrylic_badge_prices_sell' : 'acrylic_badge_prices_cost');
        const configDocId = 'default';

        const materials = (typeof AcrylicBadgePricing !== 'undefined') ? AcrylicBadgePricing.ACRYLIC_MATERIALS : [];
        const additions = (typeof AcrylicBadgePricing !== 'undefined') ? AcrylicBadgePricing.ACRYLIC_ADDITIONS : [];
        const screwTypes = (typeof AcrylicBadgePricing !== 'undefined') ? AcrylicBadgePricing.SCREW_TYPES : [];

        let prices = {};
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) prices = doc.data().prices || {};
        } catch (e) { console.error('Error loading acrylic_badge pricing:', e); }

        const materialRows = materials.map(m => {
            const val = prices[m.id] != null ? prices[m.id] : 0;
            return `<tr>
                <td class="p-3 font-bold text-gray-800">${m.nameAr}</td>
                <td class="p-2 text-gray-500 text-sm">${m.thickness} ملل</td>
                <td class="p-2"><input type="number" step="0.01" min="0" value="${val}" data-ab-key="${m.id}" class="w-full border border-gray-300 p-2 rounded text-sm"></td>
            </tr>`;
        }).join('');

        const additionRows = additions.map(a => {
            const val = prices[a.id] != null ? prices[a.id] : 0;
            return `<div>
                <label class="block text-gray-700 mb-1">${a.nameAr}</label>
                <input type="number" step="0.01" min="0" value="${val}" data-ab-key="${a.id}" class="w-full border border-gray-300 p-2 rounded">
            </div>`;
        }).join('');

        const badgeVal = prices['badge_base'] != null ? prices['badge_base'] : 0;

        const screwRows = screwTypes.map(s => {
            const val = prices[s.id] != null ? prices[s.id] : 0;
            return `<div>
                <label class="block text-gray-700 mb-1">${s.nameAr}</label>
                <input type="number" step="0.01" min="0" value="${val}" data-ab-key="${s.id}" class="w-full border border-gray-300 p-2 rounded">
            </div>`;
        }).join('');

        return `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4"><i class="fas fa-layer-group ml-2"></i>أسعار خامات الاكريلك (ج.م / لوح 60×90 سم)</h4>
                    <p class="text-sm text-gray-500 mb-3">سعر اللوح الكامل 60×90 سم — يتم حسابه بنسبة المساحة تلقائياً</p>
                    <div class="overflow-x-auto">
                        <table class="w-full text-right">
                            <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                                <tr><th class="p-3">الخامة</th><th class="p-3">السُمك</th><th class="p-3">سعر اللوح (ج.م)</th></tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200">${materialRows}</tbody>
                        </table>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4"><i class="fas fa-plus-circle ml-2"></i>إضافات الاكريلك (ج.م / لوح 60×90 سم)</h4>
                    <p class="text-sm text-gray-500 mb-3">سعر الإضافة بالنسبة للوح الكامل — يتم حسابه بنسبة المساحة</p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">${additionRows}</div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200 mb-6">
                    <h4 class="font-bold text-gray-800 mb-4"><i class="fas fa-award ml-2"></i>سعر الباغ — دهبي / فضي (ج.م / لوح 60×120 سم)</h4>
                    <p class="text-sm text-gray-500 mb-3">شامل حفر ليزر — يتم حسابه بنسبة المساحة تلقائياً</p>
                    <div class="max-w-sm">
                        <input type="number" step="0.01" min="0" value="${badgeVal}" data-ab-key="badge_base" class="w-full border border-gray-300 p-2 rounded text-sm">
                    </div>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-gray-800 mb-4"><i class="fas fa-wrench ml-2"></i>أسعار المسامير (ج.م / مسمار واحد)</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">${screwRows}</div>
                </div>
                <div class="mt-6 text-center">
                    <button onclick="PricingAdmin.saveAllAcrylicBadgePrices('${pricingMode}')" class="bg-brandGold text-white px-8 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition text-lg">
                        <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                    </button>
                </div>
            </div>
        `;
    },

    async saveAcrylicBadgePrice(docId, pricingMode, itemId, value) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof AcrylicBadgePricing !== 'undefined')
            ? (isSell ? AcrylicBadgePricing.SELL_COLLECTION : AcrylicBadgePricing.COST_COLLECTION)
            : (isSell ? 'acrylic_badge_prices_sell' : 'acrylic_badge_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (!data.prices) data.prices = {};
            data.prices[itemId] = parseFloat(value) || 0;
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving acrylic_badge price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    async saveAllAcrylicBadgePrices(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof AcrylicBadgePricing !== 'undefined')
            ? (isSell ? AcrylicBadgePricing.SELL_COLLECTION : AcrylicBadgePricing.COST_COLLECTION)
            : (isSell ? 'acrylic_badge_prices_sell' : 'acrylic_badge_prices_cost');
        try {
            const inputs = document.querySelectorAll('[data-ab-key]');
            const prices = {};
            inputs.forEach(input => { prices[input.dataset.abKey] = parseFloat(input.value) || 0; });
            await this._getColl(collName).doc('default').set({ prices, updatedAt: new Date().toISOString() }, { merge: true });
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم حفظ جميع أسعار اكريلك وباغ', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (error) {
            console.error('Error saving acrylic_badge prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    // ==================== CARD WITH ROSARY PRICING ADMIN ====================
    async renderCardRosaryCategory(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof CardRosaryPricing !== 'undefined')
            ? (isSell ? CardRosaryPricing.SELL_COLLECTION : CardRosaryPricing.COST_COLLECTION)
            : (isSell ? 'card_rosary_prices_sell' : 'card_rosary_prices_cost');
        const configDocId = 'default';

        const subItems = (typeof CardRosaryPricing !== 'undefined') ? CardRosaryPricing.SUB_ITEMS : [];
        const tiers = (typeof CardRosaryPricing !== 'undefined') ? CardRosaryPricing.TIERS : [];

        let prices = {};
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) prices = doc.data().prices || {};
        } catch (e) { console.error('Error loading card_rosary pricing:', e); }

        const tabButtons = subItems.map((s, idx) => {
            const active = idx === 0 ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
            return `<button onclick="PricingAdmin._switchCardRosaryTab('${s.id}', this)" class="card-rosary-tab px-3 py-2 rounded-lg text-sm font-medium transition ${active}" data-tab="${s.id}">${s.nameAr}</button>`;
        }).join('');

        const tabPanels = subItems.map((s, idx) => {
            const display = idx === 0 ? '' : 'display:none;';
            const tierRows = tiers.map(t => {
                const key = (typeof CardRosaryPricing !== 'undefined') ? CardRosaryPricing.priceKey(s.id, t.id) : `${s.id}__${t.id}`;
                const val = prices[key] != null ? prices[key] : 0;
                return `<tr>
                    <td class="p-2 font-medium text-gray-800">${t.baseQty}</td>
                    <td class="p-2"><input type="number" step="0.01" min="0" value="${val}" data-cr-key="${key}" class="w-full border border-gray-300 p-2 rounded text-sm"></td>
                </tr>`;
            }).join('');

            return `<div class="card-rosary-panel" data-panel="${s.id}" style="${display}">
                <div class="overflow-x-auto max-h-96 overflow-y-auto">
                    <table class="w-full text-right">
                        <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200 sticky top-0">
                            <tr><th class="p-2">الكمية</th><th class="p-2">السعر (ج.م)</th></tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">${tierRows}</tbody>
                    </table>
                </div>
            </div>`;
        }).join('');

        return `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-gray-800 mb-4"><i class="fas fa-pray ml-2"></i>أسعار كارت بسبحة — حسب الكمية</h4>
                    <p class="text-sm text-gray-500 mb-4">اختر الصنف ثم أدخل السعر لكل شريحة كمية</p>
                    <div class="flex flex-wrap gap-2 mb-4">${tabButtons}</div>
                    ${tabPanels}
                </div>
                <div class="mt-6 text-center">
                    <button onclick="PricingAdmin.saveAllCardRosaryPrices('${pricingMode}')" class="bg-brandGold text-white px-8 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition text-lg">
                        <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                    </button>
                </div>
            </div>
        `;
    },

    _switchCardRosaryTab(tabId, btn) {
        document.querySelectorAll('.card-rosary-tab').forEach(t => {
            t.classList.remove('bg-rose-600', 'text-white');
            t.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        });
        btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        btn.classList.add('bg-rose-600', 'text-white');
        document.querySelectorAll('.card-rosary-panel').forEach(p => p.style.display = 'none');
        const panel = document.querySelector(`.card-rosary-panel[data-panel="${tabId}"]`);
        if (panel) panel.style.display = '';
    },

    async saveCardRosaryPrice(docId, pricingMode, priceKey, value) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof CardRosaryPricing !== 'undefined')
            ? (isSell ? CardRosaryPricing.SELL_COLLECTION : CardRosaryPricing.COST_COLLECTION)
            : (isSell ? 'card_rosary_prices_sell' : 'card_rosary_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (!data.prices) data.prices = {};
            data.prices[priceKey] = parseFloat(value) || 0;
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving card_rosary price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    async saveAllCardRosaryPrices(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof CardRosaryPricing !== 'undefined')
            ? (isSell ? CardRosaryPricing.SELL_COLLECTION : CardRosaryPricing.COST_COLLECTION)
            : (isSell ? 'card_rosary_prices_sell' : 'card_rosary_prices_cost');
        try {
            const inputs = document.querySelectorAll('[data-cr-key]');
            const prices = {};
            inputs.forEach(input => { prices[input.dataset.crKey] = parseFloat(input.value) || 0; });
            await this._getColl(collName).doc('default').set({ prices, updatedAt: new Date().toISOString() }, { merge: true });
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم حفظ جميع أسعار كارت بسبحة', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (error) {
            console.error('Error saving card_rosary prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    // ==================== ANNUAL ADS (دعاية سنوية) PRICING ADMIN ====================
    async renderAnnualAdsCategory(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof AnnualAdsPricing !== 'undefined')
            ? (isSell ? AnnualAdsPricing.SELL_COLLECTION : AnnualAdsPricing.COST_COLLECTION)
            : (isSell ? 'annual_ads_prices_sell' : 'annual_ads_prices_cost');
        const configDocId = 'default';

        const tiers = (typeof AnnualAdsPricing !== 'undefined') ? AnnualAdsPricing.TIERS : [];

        let prices = {};
        let customSubItems = [];
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) {
                const data = doc.data();
                prices = data.prices || {};
                customSubItems = data.customSubItems || [];
            }
        } catch (e) { console.error('Error loading annual_ads pricing:', e); }

        // Sync custom sub-items into pricing engine
        if (typeof AnnualAdsPricing !== 'undefined') {
            AnnualAdsPricing.setCustomSubItems(customSubItems);
        }

        const allSubItems = (typeof AnnualAdsPricing !== 'undefined') ? AnnualAdsPricing.getSubItems() : [];

        const tabButtons = allSubItems.map((s, idx) => {
            const active = idx === 0 ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
            const isCustom = customSubItems.some(c => c.id === s.id);
            const deleteBtn = isCustom ? `<span onclick="event.stopPropagation(); PricingAdmin.deleteAnnualAdsCustomSubItem('${configDocId}','${pricingMode}','${s.id}')" class="mr-1 text-red-400 hover:text-red-600 text-xs" title="حذف"><i class="fas fa-trash-alt"></i></span>` : '';
            return `<button onclick="PricingAdmin._switchAnnualAdsTab('${s.id}', this)" class="annual-ads-tab px-3 py-2 rounded-lg text-sm font-medium transition ${active}" data-tab="${s.id}">${deleteBtn}${s.nameAr}</button>`;
        }).join('');

        const tabPanels = allSubItems.map((s, idx) => {
            const display = idx === 0 ? '' : 'display:none;';
            const tierRows = tiers.map(t => {
                const key = (typeof AnnualAdsPricing !== 'undefined') ? AnnualAdsPricing.priceKey(s.id, t.id) : `${s.id}__${t.id}`;
                const val = prices[key] != null ? prices[key] : 0;
                return `<tr>
                    <td class="p-2 font-medium text-gray-800">${t.baseQty}</td>
                    <td class="p-2"><input type="number" step="0.01" min="0" value="${val}" data-aa-key="${key}" class="w-full border border-gray-300 p-2 rounded text-sm"></td>
                </tr>`;
            }).join('');

            return `<div class="annual-ads-panel" data-panel="${s.id}" style="${display}">
                <div class="overflow-x-auto max-h-96 overflow-y-auto">
                    <table class="w-full text-right">
                        <thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200 sticky top-0">
                            <tr><th class="p-2">الكمية</th><th class="p-2">سعر القطعة (ج.م)</th></tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200">${tierRows}</tbody>
                    </table>
                </div>
            </div>`;
        }).join('');

        return `
            <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-gray-800 mb-4"><i class="fas fa-calendar-alt ml-2"></i>أسعار الدعاية السنوية — سعر القطعة حسب الشريحة</h4>
                    <p class="text-sm text-gray-500 mb-4">اختر البند ثم أدخل سعر القطعة لكل شريحة كمية. الإجمالي = الكمية × سعر القطعة</p>
                    <div class="flex flex-wrap gap-2 mb-4">${tabButtons}</div>
                    ${tabPanels}
                </div>
                <div class="mt-6 text-center">
                    <button onclick="PricingAdmin.saveAllAnnualAdsPrices('${pricingMode}')" class="bg-brandGold text-white px-8 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition text-lg">
                        <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                    </button>
                </div>
                <div class="bg-white p-6 rounded-xl border border-gray-200">
                    <h4 class="font-bold text-gray-800 mb-3"><i class="fas fa-plus-circle ml-2 text-green-600"></i>إضافة بند جديد</h4>
                    <div class="flex gap-3 items-end">
                        <div class="flex-1">
                            <label class="block text-sm font-medium text-gray-700 mb-1">اسم البند</label>
                            <input type="text" id="annualAdsNewSubItemName" placeholder="مثال: مفكرة جيب" class="w-full border border-gray-300 p-2 rounded text-sm">
                        </div>
                        <button onclick="PricingAdmin.addAnnualAdsCustomSubItem('${configDocId}','${pricingMode}')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition"><i class="fas fa-plus ml-1"></i>إضافة</button>
                    </div>
                </div>
            </div>
        `;
    },

    _switchAnnualAdsTab(tabId, btn) {
        document.querySelectorAll('.annual-ads-tab').forEach(t => {
            t.classList.remove('bg-orange-600', 'text-white');
            t.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        });
        btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        btn.classList.add('bg-orange-600', 'text-white');
        document.querySelectorAll('.annual-ads-panel').forEach(p => p.style.display = 'none');
        const panel = document.querySelector(`.annual-ads-panel[data-panel="${tabId}"]`);
        if (panel) panel.style.display = '';
    },

    async saveAnnualAdsPrice(docId, pricingMode, priceKey, value) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof AnnualAdsPricing !== 'undefined')
            ? (isSell ? AnnualAdsPricing.SELL_COLLECTION : AnnualAdsPricing.COST_COLLECTION)
            : (isSell ? 'annual_ads_prices_sell' : 'annual_ads_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (!data.prices) data.prices = {};
            data.prices[priceKey] = parseFloat(value) || 0;
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving annual_ads price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    async saveAllAnnualAdsPrices(pricingMode) {
        const isSell = pricingMode === 'selling';
        const collName = (typeof AnnualAdsPricing !== 'undefined')
            ? (isSell ? AnnualAdsPricing.SELL_COLLECTION : AnnualAdsPricing.COST_COLLECTION)
            : (isSell ? 'annual_ads_prices_sell' : 'annual_ads_prices_cost');
        try {
            const docRef = this._getColl(collName).doc('default');
            const existingDoc = await docRef.get();
            let data = existingDoc.exists ? existingDoc.data() : {};
            if (!data.prices) data.prices = {};
            const inputs = document.querySelectorAll('[data-aa-key]');
            inputs.forEach(input => { data.prices[input.dataset.aaKey] = parseFloat(input.value) || 0; });
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم حفظ جميع أسعار الدعاية السنوية', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (error) {
            console.error('Error saving annual_ads prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    async addAnnualAdsCustomSubItem(docId, pricingMode) {
        const nameInput = document.getElementById('annualAdsNewSubItemName');
        const nameAr = (nameInput ? nameInput.value : '').trim();
        if (!nameAr) {
            Swal.fire('خطأ', 'يرجى إدخال اسم البند', 'error');
            return;
        }
        const newId = 'custom_' + Date.now();
        const isSell = pricingMode === 'selling';
        const collName = (typeof AnnualAdsPricing !== 'undefined')
            ? (isSell ? AnnualAdsPricing.SELL_COLLECTION : AnnualAdsPricing.COST_COLLECTION)
            : (isSell ? 'annual_ads_prices_sell' : 'annual_ads_prices_cost');

        // Save to BOTH sell & cost collections so custom items appear in both modes
        const sellColl = (typeof AnnualAdsPricing !== 'undefined') ? AnnualAdsPricing.SELL_COLLECTION : 'annual_ads_prices_sell';
        const costColl = (typeof AnnualAdsPricing !== 'undefined') ? AnnualAdsPricing.COST_COLLECTION : 'annual_ads_prices_cost';

        try {
            for (const coll of [sellColl, costColl]) {
                const docRef = this._getColl(coll).doc(docId);
                const doc = await docRef.get();
                let data = doc.exists ? doc.data() : {};
                if (!data.customSubItems) data.customSubItems = [];
                data.customSubItems.push({ id: newId, nameAr });
                data.updatedAt = new Date().toISOString();
                await docRef.set(data);
            }
            Swal.fire('تم', `تم إضافة بند "${nameAr}" بنجاح`, 'success');
            // Re-render
            this.render('annual_ads');
        } catch (error) {
            console.error('Error adding annual_ads custom sub-item:', error);
            Swal.fire('خطأ', 'فشل إضافة البند', 'error');
        }
    },

    async deleteAnnualAdsCustomSubItem(docId, pricingMode, subItemId) {
        const result = await Swal.fire({
            title: 'حذف البند',
            text: 'هل أنت متأكد من حذف هذا البند؟ سيتم حذف جميع أسعاره.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء'
        });
        if (!result.isConfirmed) return;

        const sellColl = (typeof AnnualAdsPricing !== 'undefined') ? AnnualAdsPricing.SELL_COLLECTION : 'annual_ads_prices_sell';
        const costColl = (typeof AnnualAdsPricing !== 'undefined') ? AnnualAdsPricing.COST_COLLECTION : 'annual_ads_prices_cost';
        const tiers = (typeof AnnualAdsPricing !== 'undefined') ? AnnualAdsPricing.TIERS : [];

        try {
            for (const coll of [sellColl, costColl]) {
                const docRef = this._getColl(coll).doc(docId);
                const doc = await docRef.get();
                let data = doc.exists ? doc.data() : {};
                // Remove from custom list
                data.customSubItems = (data.customSubItems || []).filter(c => c.id !== subItemId);
                // Remove prices for this sub-item
                if (data.prices) {
                    for (const t of tiers) {
                        const key = `${subItemId}__${t.id}`;
                        delete data.prices[key];
                    }
                }
                data.updatedAt = new Date().toISOString();
                await docRef.set(data);
            }
            Swal.fire('تم', 'تم حذف البند بنجاح', 'success');
            this.render('annual_ads');
        } catch (error) {
            console.error('Error deleting annual_ads custom sub-item:', error);
            Swal.fire('خطأ', 'فشل حذف البند', 'error');
        }
    },

    // ==================== CUP QURAN BAGS (كوباية–مصاحف–شنط سبوع) PRICING ADMIN ====================
    async renderCupQuranBagsCategory(pricingMode) {
        const P = (typeof CupQuranBagsPricing !== 'undefined') ? CupQuranBagsPricing : null;
        const isSell = pricingMode === 'selling';
        const collName = P
            ? (isSell ? P.SELL_COLLECTION : P.COST_COLLECTION)
            : (isSell ? 'cup_quran_bags_prices_sell' : 'cup_quran_bags_prices_cost');
        const configDocId = 'default';

        let prices = {};
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) prices = doc.data().prices || {};
        } catch (e) { console.error('Error loading cup_quran_bags pricing:', e); }

        // Build sub-band tabs
        const subBands = P ? P.SUB_BANDS : [];
        const subBandTabs = subBands.map((b, idx) => {
            const active = idx === 0 ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
            return `<button onclick="PricingAdmin._switchCQBSubBandTab('${b.id}', this)" class="cqb-subband-tab px-4 py-2 rounded-lg text-sm font-bold transition ${active}" data-tab="${b.id}"><i class="fas ${b.icon} ml-1"></i>${b.nameAr}</button>`;
        }).join('');

        // Panel: Cup Sticker
        const cupTypes = P ? P.CUP_STICKER_TYPES : [];
        const cupTiers = P ? P.CUP_STICKER_TIERS : [];
        const cupTypeTabs = cupTypes.map((t, idx) => {
            const active = idx === 0 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
            return `<button onclick="PricingAdmin._switchCQBCupTypeTab('${t.id}', this)" class="cqb-cuptype-tab px-3 py-1.5 rounded text-xs font-medium transition ${active}" data-tab="${t.id}">${t.nameAr}</button>`;
        }).join('');
        const cupTypePanels = cupTypes.map((t, idx) => {
            const display = idx === 0 ? '' : 'display:none;';
            const rows = cupTiers.map(tier => {
                const key = P ? P.priceKey('cup_sticker', t.id, tier.id) : `cup_sticker__${t.id}__${tier.id}`;
                const val = prices[key] != null ? prices[key] : 0;
                return `<tr><td class="p-2 font-medium text-gray-800">${tier.baseQty}</td><td class="p-2"><input type="number" step="0.01" min="0" value="${val}" data-cqb-key="${key}" class="w-full border border-gray-300 p-2 rounded text-sm"></td></tr>`;
            }).join('');
            return `<div class="cqb-cuptype-panel" data-panel="${t.id}" style="${display}">
                <div class="overflow-x-auto max-h-80 overflow-y-auto"><table class="w-full text-right"><thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200 sticky top-0"><tr><th class="p-2">الكمية</th><th class="p-2">السعر الإجمالي (ج.م)</th></tr></thead><tbody class="divide-y divide-gray-200">${rows}</tbody></table></div>
            </div>`;
        }).join('');

        // Panel: Quran
        const quranTiers = P ? P.QURAN_TIERS : [];
        const quranRows = quranTiers.map(tier => {
            const key = P ? P.priceKey('quran', null, tier.id) : `quran__${tier.id}`;
            const val = prices[key] != null ? prices[key] : 0;
            return `<tr><td class="p-2 font-medium text-gray-800">${tier.baseQty}</td><td class="p-2"><input type="number" step="0.01" min="0" value="${val}" data-cqb-key="${key}" class="w-full border border-gray-300 p-2 rounded text-sm"></td></tr>`;
        }).join('');

        // Panel: Soboa Bags
        const sizes = P ? P.SOBOA_BAGS_SIZES : [];
        const bagsTiers = P ? P.SOBOA_BAGS_TIERS : [];
        const sizeTabs = sizes.map((s, idx) => {
            const active = idx === 0 ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
            return `<button onclick="PricingAdmin._switchCQBSizeTab('${s.id}', this)" class="cqb-size-tab px-3 py-1.5 rounded text-xs font-medium transition ${active}" data-tab="${s.id}">${s.nameAr}</button>`;
        }).join('');
        const sizePanels = sizes.map((s, idx) => {
            const display = idx === 0 ? '' : 'display:none;';
            const rows = bagsTiers.map(tier => {
                const key = P ? P.priceKey('soboa_bags', s.id, tier.id) : `soboa_bags__${s.id}__${tier.id}`;
                const val = prices[key] != null ? prices[key] : 0;
                return `<tr><td class="p-2 font-medium text-gray-800">${tier.baseQty}</td><td class="p-2"><input type="number" step="0.01" min="0" value="${val}" data-cqb-key="${key}" class="w-full border border-gray-300 p-2 rounded text-sm"></td></tr>`;
            }).join('');
            return `<div class="cqb-size-panel" data-panel="${s.id}" style="${display}">
                <div class="overflow-x-auto max-h-80 overflow-y-auto"><table class="w-full text-right"><thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200 sticky top-0"><tr><th class="p-2">الكمية</th><th class="p-2">سعر القطعة (ج.م)</th></tr></thead><tbody class="divide-y divide-gray-200">${rows}</tbody></table></div>
            </div>`;
        }).join('');

        return `
            <div class="space-y-6">
                <div class="flex flex-wrap gap-3 mb-2">${subBandTabs}</div>

                <!-- Cup Sticker Panel -->
                <div class="cqb-subband-panel bg-white p-6 rounded-xl border border-gray-200" data-panel="cup_sticker">
                    <h4 class="font-bold text-gray-800 mb-3"><i class="fas fa-mug-hot ml-2 text-red-500"></i>كوباية بالاستيكر — السعر الإجمالي حسب الكمية</h4>
                    <p class="text-sm text-gray-500 mb-3">اختر النوع ثم أدخل السعر الإجمالي لكل شريحة كمية</p>
                    <div class="flex flex-wrap gap-2 mb-3">${cupTypeTabs}</div>
                    ${cupTypePanels}
                </div>

                <!-- Quran Panel -->
                <div class="cqb-subband-panel bg-white p-6 rounded-xl border border-gray-200" data-panel="quran" style="display:none;">
                    <h4 class="font-bold text-gray-800 mb-3"><i class="fas fa-quran ml-2 text-green-600"></i>مصاحف — سعر القطعة حسب الشريحة</h4>
                    <p class="text-sm text-gray-500 mb-3">الإجمالي = الكمية × سعر القطعة</p>
                    <div class="overflow-x-auto max-h-80 overflow-y-auto"><table class="w-full text-right"><thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200 sticky top-0"><tr><th class="p-2">الكمية</th><th class="p-2">سعر القطعة (ج.م)</th></tr></thead><tbody class="divide-y divide-gray-200">${quranRows}</tbody></table></div>
                </div>

                <!-- Soboa Bags Panel -->
                <div class="cqb-subband-panel bg-white p-6 rounded-xl border border-gray-200" data-panel="soboa_bags" style="display:none;">
                    <h4 class="font-bold text-gray-800 mb-3"><i class="fas fa-shopping-bag ml-2 text-yellow-600"></i>شنط سبوع — سعر القطعة حسب المقاس والشريحة</h4>
                    <p class="text-sm text-gray-500 mb-3">السعر شامل الطباعة — الإجمالي = الكمية × سعر القطعة</p>
                    <div class="flex flex-wrap gap-2 mb-3">${sizeTabs}</div>
                    ${sizePanels}
                </div>
                <div class="mt-6 text-center">
                    <button onclick="PricingAdmin.saveAllCupQuranBagsPrices('${pricingMode}')" class="bg-brandGold text-white px-8 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition text-lg">
                        <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                    </button>
                </div>
            </div>
        `;
    },

    _switchCQBSubBandTab(tabId, btn) {
        document.querySelectorAll('.cqb-subband-tab').forEach(t => { t.classList.remove('bg-pink-600', 'text-white'); t.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200'); });
        btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        btn.classList.add('bg-pink-600', 'text-white');
        document.querySelectorAll('.cqb-subband-panel').forEach(p => p.style.display = 'none');
        const panel = document.querySelector(`.cqb-subband-panel[data-panel="${tabId}"]`);
        if (panel) panel.style.display = '';
    },

    _switchCQBCupTypeTab(tabId, btn) {
        document.querySelectorAll('.cqb-cuptype-tab').forEach(t => { t.classList.remove('bg-red-500', 'text-white'); t.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200'); });
        btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        btn.classList.add('bg-red-500', 'text-white');
        document.querySelectorAll('.cqb-cuptype-panel').forEach(p => p.style.display = 'none');
        const panel = document.querySelector(`.cqb-cuptype-panel[data-panel="${tabId}"]`);
        if (panel) panel.style.display = '';
    },

    _switchCQBSizeTab(tabId, btn) {
        document.querySelectorAll('.cqb-size-tab').forEach(t => { t.classList.remove('bg-yellow-500', 'text-white'); t.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200'); });
        btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        btn.classList.add('bg-yellow-500', 'text-white');
        document.querySelectorAll('.cqb-size-panel').forEach(p => p.style.display = 'none');
        const panel = document.querySelector(`.cqb-size-panel[data-panel="${tabId}"]`);
        if (panel) panel.style.display = '';
    },

    async saveCupQuranBagsPrice(docId, pricingMode, priceKey, value) {
        const P = (typeof CupQuranBagsPricing !== 'undefined') ? CupQuranBagsPricing : null;
        const isSell = pricingMode === 'selling';
        const collName = P
            ? (isSell ? P.SELL_COLLECTION : P.COST_COLLECTION)
            : (isSell ? 'cup_quran_bags_prices_sell' : 'cup_quran_bags_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (!data.prices) data.prices = {};
            data.prices[priceKey] = parseFloat(value) || 0;
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving cup_quran_bags price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    async saveAllCupQuranBagsPrices(pricingMode) {
        const P = (typeof CupQuranBagsPricing !== 'undefined') ? CupQuranBagsPricing : null;
        const isSell = pricingMode === 'selling';
        const collName = P
            ? (isSell ? P.SELL_COLLECTION : P.COST_COLLECTION)
            : (isSell ? 'cup_quran_bags_prices_sell' : 'cup_quran_bags_prices_cost');
        try {
            const inputs = document.querySelectorAll('[data-cqb-key]');
            const prices = {};
            inputs.forEach(input => { prices[input.dataset.cqbKey] = parseFloat(input.value) || 0; });
            await this._getColl(collName).doc('default').set({ prices, updatedAt: new Date().toISOString() }, { merge: true });
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم حفظ جميع أسعار كوباية–مصاحف–شنط سبوع', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (error) {
            console.error('Error saving cup_quran_bags prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    // ==================== BOXES (البوكسات) PRICING ADMIN ====================
    async renderBoxesCategory(pricingMode) {
        const P = (typeof BoxesPricing !== 'undefined') ? BoxesPricing : null;
        const isSell = pricingMode === 'selling';
        const collName = P
            ? (isSell ? P.SELL_COLLECTION : P.COST_COLLECTION)
            : (isSell ? 'boxes_prices_sell' : 'boxes_prices_cost');
        const configDocId = 'default';

        let prices = {};
        try {
            const doc = await this._getColl(collName).doc(configDocId).get();
            if (doc.exists) prices = doc.data().prices || {};
        } catch (e) { console.error('Error loading boxes pricing:', e); }

        const types = P ? P.BOX_TYPES : [];
        const sizes = P ? P.SIZES : [];
        const tiers = P ? P.TIERS : [];
        const printTiers = P ? P.PRINTING_TIERS : [];

        // Type tabs (brown / white)
        const typeTabs = types.map((t, idx) => {
            const active = idx === 0 ? 'bg-yellow-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
            return `<button onclick="PricingAdmin._switchBoxesTypeTab('${t.id}', this)" class="boxes-type-tab px-4 py-2 rounded-lg text-sm font-bold transition ${active}" data-tab="${t.id}"><i class="fas fa-box ml-1"></i>${t.nameAr}</button>`;
        }).join('');

        // Size tabs per type — each type gets its own set of size sub-tabs and tier tables
        const typePanels = types.map((type, tIdx) => {
            const display = tIdx === 0 ? '' : 'display:none;';

            const sizeTabs = sizes.map((s, sIdx) => {
                const active = sIdx === 0 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
                return `<button onclick="PricingAdmin._switchBoxesSizeTab('${type.id}','${s.id}', this)" class="boxes-size-tab-${type.id} px-2 py-1 rounded text-xs font-medium transition ${active}" data-tab="${s.id}">${s.nameAr}</button>`;
            }).join('');

            const sizePanels = sizes.map((s, sIdx) => {
                const sDisplay = sIdx === 0 ? '' : 'display:none;';
                const rows = tiers.map(tier => {
                    const key = P ? P.priceKey(type.id, s.id, tier.id) : `${type.id}__${s.id}__${tier.id}`;
                    const val = prices[key] != null ? prices[key] : 0;
                    return `<tr><td class="p-2 font-medium text-gray-800">${tier.baseQty}</td><td class="p-2"><input type="number" step="0.01" min="0" value="${val}" data-bx-key="${key}" class="w-full border border-gray-300 p-2 rounded text-sm"></td></tr>`;
                }).join('');
                return `<div class="boxes-size-panel-${type.id}" data-panel="${s.id}" style="${sDisplay}">
                    <div class="overflow-x-auto max-h-72 overflow-y-auto"><table class="w-full text-right"><thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200 sticky top-0"><tr><th class="p-2">الكمية</th><th class="p-2">سعر القطعة (ج.م)</th></tr></thead><tbody class="divide-y divide-gray-200">${rows}</tbody></table></div>
                </div>`;
            }).join('');

            return `<div class="boxes-type-panel" data-panel="${type.id}" style="${display}">
                <h4 class="font-bold text-gray-800 mb-3"><i class="fas fa-box ml-2 text-yellow-700"></i>${type.nameAr} — سعر القطعة حسب المقاس والشريحة</h4>
                <p class="text-sm text-gray-500 mb-2">الإجمالي = الكمية × سعر القطعة</p>
                <div class="flex flex-wrap gap-1.5 mb-3">${sizeTabs}</div>
                ${sizePanels}
            </div>`;
        }).join('');

        // Printing tiers section
        const printRows = printTiers.map(tier => {
            const key = P ? P.printingPriceKey(tier.id) : `printing__${tier.id}`;
            const val = prices[key] != null ? prices[key] : 0;
            return `<tr><td class="p-2 font-medium text-gray-800">${tier.baseQty}</td><td class="p-2"><input type="number" step="0.01" min="0" value="${val}" data-bx-key="${key}" class="w-full border border-gray-300 p-2 rounded text-sm"></td></tr>`;
        }).join('');

        return `
            <div class="space-y-6">
                <!-- Main tabs: Box types + Printing -->
                <div class="flex flex-wrap gap-3 mb-2">
                    ${typeTabs}
                    <button onclick="PricingAdmin._switchBoxesTypeTab('printing', this)" class="boxes-type-tab px-4 py-2 rounded-lg text-sm font-bold transition bg-gray-100 text-gray-700 hover:bg-gray-200" data-tab="printing"><i class="fas fa-print ml-1"></i>تسعير الطباعة</button>
                </div>

                ${typePanels}

                <!-- Printing Panel -->
                <div class="boxes-type-panel bg-white p-6 rounded-xl border border-gray-200" data-panel="printing" style="display:none;">
                    <h4 class="font-bold text-gray-800 mb-3"><i class="fas fa-print ml-2 text-blue-600"></i>تسعير الطباعة — سعر القطعة حسب الشريحة</h4>
                    <p class="text-sm text-gray-500 mb-3">إجمالي الطباعة = الكمية × سعر الطباعة للقطعة</p>
                    <div class="overflow-x-auto max-h-72 overflow-y-auto"><table class="w-full text-right"><thead class="bg-gray-100 text-gray-700 text-sm border-b border-gray-200 sticky top-0"><tr><th class="p-2">الكمية</th><th class="p-2">سعر الطباعة للقطعة (ج.م)</th></tr></thead><tbody class="divide-y divide-gray-200">${printRows}</tbody></table></div>
                </div>
                <div class="mt-6 text-center">
                    <button onclick="PricingAdmin.saveAllBoxesPrices('${pricingMode}')" class="bg-brandGold text-white px-8 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition text-lg">
                        <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                    </button>
                </div>
            </div>
        `;
    },

    _switchBoxesTypeTab(tabId, btn) {
        document.querySelectorAll('.boxes-type-tab').forEach(t => { t.classList.remove('bg-yellow-700', 'text-white'); t.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200'); });
        btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        btn.classList.add('bg-yellow-700', 'text-white');
        document.querySelectorAll('.boxes-type-panel').forEach(p => p.style.display = 'none');
        const panel = document.querySelector(`.boxes-type-panel[data-panel="${tabId}"]`);
        if (panel) panel.style.display = '';
    },

    _switchBoxesSizeTab(typeId, sizeId, btn) {
        document.querySelectorAll(`.boxes-size-tab-${typeId}`).forEach(t => { t.classList.remove('bg-amber-500', 'text-white'); t.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200'); });
        btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        btn.classList.add('bg-amber-500', 'text-white');
        document.querySelectorAll(`.boxes-size-panel-${typeId}`).forEach(p => p.style.display = 'none');
        const panel = document.querySelector(`.boxes-size-panel-${typeId}[data-panel="${sizeId}"]`);
        if (panel) panel.style.display = '';
    },

    async saveBoxesPrice(docId, pricingMode, priceKey, value) {
        const P = (typeof BoxesPricing !== 'undefined') ? BoxesPricing : null;
        const isSell = pricingMode === 'selling';
        const collName = P
            ? (isSell ? P.SELL_COLLECTION : P.COST_COLLECTION)
            : (isSell ? 'boxes_prices_sell' : 'boxes_prices_cost');
        try {
            const docRef = this._getColl(collName).doc(docId);
            const doc = await docRef.get();
            let data = doc.exists ? doc.data() : {};
            if (!data.prices) data.prices = {};
            data.prices[priceKey] = parseFloat(value) || 0;
            data.updatedAt = new Date().toISOString();
            await docRef.set(data);
            Swal.fire('تم', 'تم حفظ السعر بنجاح', 'success');
        } catch (error) {
            console.error('Error saving boxes price:', error);
            Swal.fire('خطأ', 'فشل حفظ السعر', 'error');
        }
    },

    async saveAllBoxesPrices(pricingMode) {
        const P = (typeof BoxesPricing !== 'undefined') ? BoxesPricing : null;
        const isSell = pricingMode === 'selling';
        const collName = P
            ? (isSell ? P.SELL_COLLECTION : P.COST_COLLECTION)
            : (isSell ? 'boxes_prices_sell' : 'boxes_prices_cost');
        try {
            const inputs = document.querySelectorAll('[data-bx-key]');
            const prices = {};
            inputs.forEach(input => { prices[input.dataset.bxKey] = parseFloat(input.value) || 0; });
            await this._getColl(collName).doc('default').set({ prices, updatedAt: new Date().toISOString() }, { merge: true });
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم حفظ جميع أسعار البوكسات', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (error) {
            console.error('Error saving boxes prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    // ─── Cladding & Letters ───
    async renderCladdingLettersCategory(pricingMode) {
        const P = (typeof CladdingLettersPricing !== 'undefined') ? CladdingLettersPricing : null;
        if (!P) return '<div class="text-red-600">خطأ: وحدة CladdingLettersPricing غير متاحة</div>';

        const isSell = pricingMode === 'selling';
        const collName = isSell ? P.SELL_COLLECTION : P.COST_COLLECTION;
        const priceLabel = isSell ? 'سعر البيع' : 'سعر التكلفة';
        const borderColor = isSell ? 'green' : 'red';

        let prices = {};
        try {
            const doc = await this._getColl(collName).doc('default').get();
            if (doc.exists && doc.data().prices) prices = doc.data().prices;
        } catch (e) { console.error('Error loading cladding_letters prices:', e); }

        const allKeys = P.getAllPriceKeys();
        const claddingKeys = allKeys.filter(k => k.section === 'cladding');
        const lettersKeys = allKeys.filter(k => k.section === 'letters');
        const additionsKeys = allKeys.filter(k => k.section === 'additions');

        const renderInput = (key) => {
            const val = prices[key.id] != null ? prices[key.id] : 0;
            return `
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <label class="block text-sm font-bold text-gray-700 mb-2">${key.name}</label>
                    <input type="number" step="0.01" min="0" value="${val}"
                           id="cl_price_${key.id}"
                           data-cl-key="${key.id}"
                           class="w-full border-2 border-${borderColor}-300 p-3 rounded-lg focus:border-${borderColor}-500 outline-none transition">
                    <span class="text-xs text-gray-500 mt-1 block">${priceLabel} (ج.م)</span>
                </div>`;
        };

        return `
            <div class="space-y-6">
                <!-- Cladding Facades -->
                <div class="bg-gradient-to-br from-slate-50 to-gray-100 p-6 rounded-xl border-2 border-slate-300">
                    <h4 class="text-xl font-bold text-gray-800 mb-4"><i class="fas fa-building text-slate-600 ml-2"></i>واجهات كلادينج</h4>
                    <p class="text-sm text-gray-600 mb-4">المقاس الاستندر: 100×100 سم</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${claddingKeys.map(renderInput).join('')}
                    </div>
                </div>

                <!-- Letters Base Prices -->
                <div class="bg-gradient-to-br from-amber-50 to-yellow-100 p-6 rounded-xl border-2 border-amber-300">
                    <h4 class="text-xl font-bold text-gray-800 mb-4"><i class="fas fa-font text-amber-600 ml-2"></i>أنواع الحروف</h4>
                    <p class="text-sm text-gray-600 mb-4">المقاس الاستندر: 100×50 سم — السعر الأساسي لكل نوع</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${lettersKeys.map(renderInput).join('')}
                    </div>
                </div>

                <!-- Additions Prices -->
                <div class="bg-gradient-to-br from-blue-50 to-cyan-100 p-6 rounded-xl border-2 border-blue-300">
                    <h4 class="text-xl font-bold text-gray-800 mb-4"><i class="fas fa-plus-circle text-blue-600 ml-2"></i>أسعار الإضافات</h4>
                    <p class="text-sm text-gray-600 mb-4">إضاءة / ترانس / تركيب</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${additionsKeys.map(renderInput).join('')}
                    </div>
                </div>

                <!-- Save Button -->
                <div class="mt-6 text-center">
                    <button onclick="PricingAdmin.saveAllCladdingLettersPrices('${pricingMode}')" class="bg-brandGold text-white px-8 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition text-lg">
                        <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                    </button>
                </div>
            </div>`;
    },

    async saveAllCladdingLettersPrices(pricingMode) {
        const P = (typeof CladdingLettersPricing !== 'undefined') ? CladdingLettersPricing : null;
        if (!P) return;
        const isSell = pricingMode === 'selling';
        const collName = isSell ? P.SELL_COLLECTION : P.COST_COLLECTION;
        try {
            const inputs = document.querySelectorAll('[data-cl-key]');
            const prices = {};
            inputs.forEach(input => {
                prices[input.dataset.clKey] = parseFloat(input.value) || 0;
            });
            await this._getColl(collName).doc('default').set({ prices, updatedAt: new Date().toISOString() }, { merge: true });
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم حفظ جميع أسعار واجهات كلادينج و حروف', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (error) {
            console.error('Error saving cladding_letters prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    },

    // ─── Kraft Bags ───
    async renderKraftBagsCategory(pricingMode) {
        const P = (typeof KraftBagsPricing !== 'undefined') ? KraftBagsPricing : null;
        if (!P) return '<div class="text-red-600">KraftBagsPricing غير متاح</div>';

        const isSell = pricingMode === 'selling';
        const collName = isSell ? P.SELL_COLLECTION : P.COST_COLLECTION;
        let prices = {};
        try {
            const doc = await this._getColl(collName).doc('default').get();
            if (doc.exists && doc.data().prices) prices = doc.data().prices;
        } catch (e) { console.error('Error loading kraft_bags prices:', e); }

        const borderColor = isSell ? 'green' : 'red';

        // Section 1: Bag prices — one tab per size, showing tier columns
        let sizeTabs = P.SIZES.map((size, idx) =>
            `<button onclick="PricingAdmin._showKraftTab('bag', ${idx})" class="kb-bag-tab px-3 py-1 rounded text-sm ${idx === 0 ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700'}" data-tab-idx="${idx}">${size.nameAr}</button>`
        ).join('');

        let sizePanels = P.SIZES.map((size, idx) => {
            let rows = P.TIERS.map(tier => {
                const key = P.priceKey(size.id, tier.id);
                const val = prices[key] || 0;
                return `<tr>
                    <td class="border p-2 text-sm font-bold">${tier.baseQty}</td>
                    <td class="border p-2"><input type="number" step="0.01" min="0" value="${val}" data-kb-key="${key}" class="w-full border-2 border-${borderColor}-300 p-2 rounded-lg focus:border-${borderColor}-500 outline-none text-sm"></td>
                </tr>`;
            }).join('');
            return `<div class="kb-bag-panel ${idx === 0 ? '' : 'hidden'}" data-panel-idx="${idx}">
                <table class="w-full border-collapse"><thead><tr><th class="border p-2 bg-gray-100 text-sm">الكمية</th><th class="border p-2 bg-gray-100 text-sm">سعر القطعة</th></tr></thead><tbody>${rows}</tbody></table>
            </div>`;
        }).join('');

        // Section 2: Printing prices — one tab per size, showing tier columns
        let printTabs = P.SIZES.map((size, idx) =>
            `<button onclick="PricingAdmin._showKraftTab('print', ${idx})" class="kb-print-tab px-3 py-1 rounded text-sm ${idx === 0 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'}" data-tab-idx="${idx}">${size.nameAr}</button>`
        ).join('');

        let printPanels = P.SIZES.map((size, idx) => {
            let rows = P.PRINTING_TIERS.map(tier => {
                const key = P.printingPriceKey(size.id, tier.id);
                const val = prices[key] || 0;
                return `<tr>
                    <td class="border p-2 text-sm font-bold">${tier.baseQty}</td>
                    <td class="border p-2"><input type="number" step="0.01" min="0" value="${val}" data-kb-key="${key}" class="w-full border-2 border-${borderColor}-300 p-2 rounded-lg focus:border-${borderColor}-500 outline-none text-sm"></td>
                </tr>`;
            }).join('');
            return `<div class="kb-print-panel ${idx === 0 ? '' : 'hidden'}" data-panel-idx="${idx}">
                <table class="w-full border-collapse"><thead><tr><th class="border p-2 bg-gray-100 text-sm">الكمية</th><th class="border p-2 bg-gray-100 text-sm">سعر طباعة القطعة</th></tr></thead><tbody>${rows}</tbody></table>
            </div>`;
        }).join('');

        return `<div class="space-y-6">
                <h3 class="text-xl font-bold text-amber-800 border-b-2 border-amber-300 pb-2">أسعار الشنط (بدون طباعة)</h3>
                <div class="flex flex-wrap gap-2 mb-3">${sizeTabs}</div>
                ${sizePanels}

                <h3 class="text-xl font-bold text-orange-700 border-b-2 border-orange-300 pb-2 mt-8">أسعار الطباعة (لكل مقاس)</h3>
                <div class="flex flex-wrap gap-2 mb-3">${printTabs}</div>
                ${printPanels}

                <!-- Save Button -->
                <div class="mt-6 text-center">
                    <button onclick="PricingAdmin.saveAllKraftBagsPrices('${pricingMode}')" class="bg-brandGold text-white px-8 py-3 rounded-xl font-bold hover:bg-brandGoldDark transition text-lg">
                        <i class="fas fa-save ml-2"></i> حفظ جميع الأسعار
                    </button>
                </div>
            </div>`;
    },

    _showKraftTab(section, idx) {
        const tabClass = section === 'bag' ? 'kb-bag-tab' : 'kb-print-tab';
        const panelClass = section === 'bag' ? 'kb-bag-panel' : 'kb-print-panel';
        const activeColor = section === 'bag' ? 'bg-amber-600' : 'bg-orange-600';
        document.querySelectorAll(`.${tabClass}`).forEach(t => { t.className = t.className.replace(activeColor, 'bg-gray-200').replace('text-white', 'text-gray-700'); });
        document.querySelectorAll(`.${panelClass}`).forEach(p => p.classList.add('hidden'));
        const activeTab = document.querySelector(`.${tabClass}[data-tab-idx="${idx}"]`);
        if (activeTab) { activeTab.className = activeTab.className.replace('bg-gray-200', activeColor).replace('text-gray-700', 'text-white'); }
        const activePanel = document.querySelector(`.${panelClass}[data-panel-idx="${idx}"]`);
        if (activePanel) activePanel.classList.remove('hidden');
    },

    async saveAllKraftBagsPrices(pricingMode) {
        const P = (typeof KraftBagsPricing !== 'undefined') ? KraftBagsPricing : null;
        if (!P) return;
        const isSell = pricingMode === 'selling';
        const collName = isSell ? P.SELL_COLLECTION : P.COST_COLLECTION;
        try {
            const inputs = document.querySelectorAll('[data-kb-key]');
            const prices = {};
            inputs.forEach(input => {
                prices[input.dataset.kbKey] = parseFloat(input.value) || 0;
            });
            await this._getColl(collName).doc('default').set({ prices, updatedAt: new Date().toISOString() }, { merge: true });
            Swal.fire({ icon: 'success', title: 'تم الحفظ', text: 'تم حفظ جميع أسعار شنط الكرافت', timer: 2000, showConfirmButton: false, toast: true, position: 'top-end' });
        } catch (error) {
            console.error('Error saving kraft_bags prices:', error);
            Swal.fire('خطأ', 'فشل حفظ الأسعار', 'error');
        }
    }
};
