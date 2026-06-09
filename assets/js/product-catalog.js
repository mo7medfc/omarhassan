/**
 * Product Catalog Module — dynamic catalog with tier pricing & admin management
 */

function _stampVariants(full, machine, seal) {
    return [
        { id: 'full', label: 'ختم كامل', price: full },
        { id: 'machine', label: 'ماكينة فقط', price: machine },
        { id: 'seal', label: 'سريل فقط', price: seal }
    ];
}

function _stampSize(id, label, variants) {
    return { id, label, variants };
}

function _woodSize(id, label, price) {
    return { id, label, price };
}

function getStampsCatalogGroup() {
    return {
        id: 'stamps',
        name: 'الأختام',
        icon: 'fa-stamp',
        catalogType: 'group',
        active: true,
        sortOrder: 8,
        codeSync: true,
        subcategories: [
            {
                id: 'automatic',
                name: 'ماكينة أوتوماتيك',
                icon: 'fa-pen-fancy',
                sortOrder: 1,
                configType: 'stamp_automatic',
                notes: [
                    'لا يوجد ماكينة أوتوماتيك مقاس 5×5 مربع',
                    'الأسعار لا تنطبق على ماكينة Trodat'
                ],
                stampTypes: [
                    {
                        id: 'rect', label: 'مستطيل',
                        sizes: [
                            _stampSize('1.5x4', '1.5 × 4 سم', _stampVariants(200, 140, 75)),
                            _stampSize('2x5', '2 × 5 سم', _stampVariants(200, 150, 90)),
                            _stampSize('3x6', '3 × 6 سم', _stampVariants(375, 275, 110)),
                            _stampSize('3x7', '3 × 7 سم', _stampVariants(400, 300, 125))
                        ]
                    },
                    {
                        id: 'oval', label: 'بيضاوي',
                        sizes: [
                            _stampSize('2x5', '2 × 5 سم', _stampVariants(225, 150, 100)),
                            _stampSize('3x5', '3 × 5 سم', _stampVariants(450, 350, 135)),
                            _stampSize('3x6', '3 × 6 سم', _stampVariants(500, 400, 125))
                        ]
                    },
                    {
                        id: 'square', label: 'مربع',
                        sizes: [
                            _stampSize('4x4', '4 × 4 سم', _stampVariants(400, 300, 130))
                        ]
                    },
                    {
                        id: 'round', label: 'مدور',
                        sizes: [
                            _stampSize('4x4', '4 × 4 سم', _stampVariants(375, 275, 125)),
                            _stampSize('5x5', '5 × 5 سم', _stampVariants(750, 650, 150))
                        ]
                    }
                ]
            },
            {
                id: 'wood_hand',
                name: 'ختم يد خشب',
                icon: 'fa-tree',
                sortOrder: 2,
                configType: 'stamp_wood',
                customSizeMessage: 'سيتم التسعير حسب المقاس المطلوب',
                stampTypes: [
                    {
                        id: 'rect', label: 'مستطيل',
                        sizes: [
                            _woodSize('1.5x4', '1.5 × 4 سم', 120),
                            _woodSize('2x5', '2 × 5 سم', 150),
                            _woodSize('3x6', '3 × 6 سم', 175),
                            _woodSize('3x7', '3 × 7 سم', 200)
                        ]
                    },
                    {
                        id: 'oval', label: 'بيضاوي',
                        sizes: [
                            _woodSize('2x5', '2 × 5 سم', 175),
                            _woodSize('3x6', '3 × 6 سم', 200)
                        ]
                    },
                    {
                        id: 'square', label: 'مربع',
                        sizes: [_woodSize('4x4', '4 × 4 سم', 175)]
                    },
                    {
                        id: 'round', label: 'مدور',
                        sizes: [
                            _woodSize('4x4', '4 × 4 سم', 200),
                            _woodSize('5x5', '5 × 5 سم', 225)
                        ]
                    }
                ],
                allowCustomSize: true
            },
            {
                id: 'date_stamps',
                name: 'أختام التاريخ',
                icon: 'fa-calendar-days',
                sortOrder: 3,
                configType: 'stamp_simple',
                items: [
                    { id: 'arabic', label: 'ختم تاريخ عربي', price: 250 },
                    { id: 'english', label: 'ختم تاريخ إنجليزي', price: 250 },
                    { id: 'date_company', label: 'ختم تاريخ + اسم الشركة', price: 750 }
                ]
            },
            {
                id: 'special',
                name: 'أختام خاصة',
                icon: 'fa-star',
                sortOrder: 4,
                configType: 'stamp_special',
                items: [
                    { id: 'flash_pocket', label: 'فلاشة أو جيب 1.5 × 4 سم', price: 250 },
                    { id: 'custom_design', label: 'تصميم مخصص', manualPrice: true }
                ]
            }
        ]
    };
}

const StampPricing = {
    getStampType(sub, typeId) {
        return (sub.stampTypes || []).find(t => t.id === typeId);
    },

    getSize(stampType, sizeId) {
        return (stampType?.sizes || []).find(s => s.id === sizeId);
    },

    getVariant(size, variantId) {
        return (size?.variants || []).find(v => v.id === variantId);
    },

    getItem(sub, itemId) {
        return (sub.items || []).find(i => i.id === itemId);
    },

    calculate(sub, sel) {
        const qty = parseInt(sel.quantity, 10) || 0;
        const result = {
            quantity: qty,
            unitPrice: 0,
            total: 0,
            unitLabel: 'السعر',
            error: null,
            pendingPricing: false,
            stampTypeLabel: '',
            sizeLabel: '',
            variantLabel: '',
            itemName: '',
            productTypeLabel: ''
        };

        if (!qty || qty < 1) {
            result.error = 'أدخل الكمية';
            return result;
        }

        if (sub.configType === 'stamp_automatic') {
            if (!sel.stampType) { result.error = 'اختر نوع الختم'; return result; }
            if (!sel.size) { result.error = 'اختر المقاس'; return result; }
            if (!sel.variant) { result.error = 'اختر نوع المنتج'; return result; }
            const st = this.getStampType(sub, sel.stampType);
            const sz = this.getSize(st, sel.size);
            const vr = this.getVariant(sz, sel.variant);
            if (!st || !sz || !vr) { result.error = 'الخيارات غير صحيحة'; return result; }
            result.stampTypeLabel = st.label;
            result.sizeLabel = sz.label;
            result.variantLabel = vr.label;
            result.productTypeLabel = vr.label;
            result.itemName = `${st.label} — ${sz.label} — ${vr.label}`;
            result.unitPrice = vr.price;
            result.total = qty * vr.price;
        } else if (sub.configType === 'stamp_wood') {
            if (!sel.stampType) { result.error = 'اختر نوع الختم'; return result; }
            if (!sel.size) { result.error = 'اختر المقاس'; return result; }
            const st = this.getStampType(sub, sel.stampType);
            const sz = this.getSize(st, sel.size);
            if (!st) { result.error = 'اختر نوع الختم'; return result; }
            result.stampTypeLabel = st.label;
            if (sel.size === 'custom') {
                result.sizeLabel = sel.customSize ? sel.customSize.trim() : 'مقاس مخصص';
                result.pendingPricing = true;
                result.itemName = `${st.label} — ${result.sizeLabel}`;
                result.unitPrice = 0;
                result.total = 0;
                result.infoMessage = sub.customSizeMessage || 'سيتم التسعير حسب المقاس المطلوب';
            } else if (!sz) {
                result.error = 'اختر المقاس';
                return result;
            } else {
                result.sizeLabel = sz.label;
                result.itemName = `${st.label} — ${sz.label}`;
                result.unitPrice = sz.price;
                result.total = qty * sz.price;
            }
        } else if (sub.configType === 'stamp_simple' || sub.configType === 'stamp_special') {
            if (!sel.item) { result.error = 'اختر المنتج'; return result; }
            const item = this.getItem(sub, sel.item);
            if (!item) { result.error = 'اختر المنتج'; return result; }
            result.itemName = item.label;
            if (item.manualPrice) {
                const mp = parseFloat(sel.manualPrice);
                if (!mp || mp <= 0) {
                    result.error = 'أدخل السعر يدوياً لتصميم مخصص';
                    return result;
                }
                result.unitPrice = mp;
                result.total = qty * mp;
                result.productTypeLabel = 'تصميم مخصص';
            } else {
                result.unitPrice = item.price;
                result.total = qty * item.price;
            }
        } else {
            result.error = 'إعدادات القسم غير مكتملة';
        }

        result.total = Math.round(result.total * 100) / 100;
        return result;
    }
};

const CatalogSvc = {
    COLLECTION: 'catalog_products',
    _cache: [],
    _initialized: false,

    DEFAULTS: [
        {
            id: 'notebook',
            name: 'نوت بوك',
            icon: 'fa-book-open',
            codeSync: true,
            active: true,
            sortOrder: 1,
            pricingMode: 'tier_unit',
            minQty: 50,
            minQtyMessage: 'الحد الأدنى للنوت بوك هو 50 نسخة',
            unitLabel: 'سعر الوحدة',
            fixedSpecs: [
                { label: 'الغلاف', value: '350 جرام' },
                { label: 'الداخلي', value: '80 جرام' },
                { label: 'عدد الأوراق', value: '50 ورقة' }
            ],
            fields: [
                {
                    id: 'binding',
                    label: 'نوع التجليد',
                    type: 'select',
                    required: true,
                    options: [
                        { value: 'wire_top', label: 'سلك من فوق' },
                        { value: 'wire_side', label: 'سلك من الجانب' }
                    ]
                },
                {
                    id: 'size',
                    label: 'المقاس',
                    type: 'select',
                    required: true,
                    options: [{ value: 'A5', label: 'A5' }]
                },
                {
                    id: 'quantity',
                    label: 'الكمية',
                    type: 'number',
                    required: true,
                    min: 50,
                    step: 1
                }
            ],
            priceTiers: [
                { min: 50, max: 99, unitPrice: 35 },
                { min: 100, max: 499, unitPrice: 30 },
                { min: 500, max: null, unitPrice: 25 }
            ]
        },
        {
            id: 'letterhead',
            name: 'ليترهيد',
            icon: 'fa-file-signature',
            codeSync: true,
            active: true,
            sortOrder: 2,
            pricingMode: 'option_thousand',
            minQty: 1000,
            minQtyMessage: 'الحد الأدنى لطلب الليترهيد هو 1000 نسخة',
            unitLabel: 'سعر الألف',
            fixedSpecs: [],
            fields: [
                {
                    id: 'paper_weight',
                    label: 'نوع الورق',
                    type: 'select',
                    required: true,
                    options: [
                        { value: '80g', label: '80 جرام', pricePerThousand: 1300 },
                        { value: '100g', label: '100 جرام', pricePerThousand: 1700 }
                    ]
                },
                {
                    id: 'quantity',
                    label: 'الكمية',
                    type: 'number',
                    required: true,
                    min: 1000,
                    step: 1
                }
            ],
            priceTiers: []
        },
        {
            id: 'folders',
            name: 'فولدرات',
            icon: 'fa-folder-open',
            active: true,
            sortOrder: 3,
            codeSync: true,
            pricingMode: 'option_thousand',
            minQty: 1000,
            minQtyMessage: 'الحد الأدنى لطلب الفولدرات هو 1000 نسخة',
            unitLabel: 'سعر الألف',
            fixedSpecs: [
                { label: 'التشطيب', value: 'سلوفان وجيب النتش' }
            ],
            fields: [
                {
                    id: 'folder_type',
                    label: 'الجرامات',
                    type: 'select',
                    display: 'scroll',
                    required: true,
                    options: [
                        { value: '250g', label: '250 جرام', description: 'بالسلوفان وجيب النتش', pricePerThousand: 7500 },
                        { value: '300g', label: '300 جرام', description: 'بالسلوفان وجيب النتش', pricePerThousand: 9000 },
                        { value: '350g', label: '350 جرام', description: 'بالسلوفان وجيب النتش', pricePerThousand: 10500 }
                    ]
                },
                {
                    id: 'quantity',
                    label: 'الكمية',
                    type: 'number',
                    required: true,
                    min: 1000,
                    step: 1
                }
            ],
            priceTiers: []
        },
        {
            id: 'envelopes',
            name: 'الأظرف',
            icon: 'fa-envelopes-bulk',
            active: true,
            sortOrder: 4,
            codeSync: true,
            pricingMode: 'option_qty_tiers',
            minQty: 500,
            minQtyMessage: 'الحد الأدنى للطلب 500 نسخة',
            unitLabel: 'سعر الوحدة',
            fixedSpecs: [],
            fields: [
                {
                    id: 'envelope_type',
                    label: 'نوع الظرف',
                    type: 'select',
                    display: 'scroll',
                    required: true,
                    options: [
                        {
                            value: 'a4', label: 'ظرف غزالة A4',
                            description: 'من 500: 6 ج.م/ظرف — من 1000: 4.8 ج.م/ظرف',
                            qtyTiers: [
                                { min: 500, max: 999, unitPrice: 6, label: '500+' },
                                { min: 1000, max: null, unitPrice: 4.8, label: '1000+' }
                            ]
                        },
                        {
                            value: 'a5', label: 'ظرف غزالة A5',
                            description: 'من 500: 4.6 ج.م/ظرف — من 1000: 3.5 ج.م/ظرف',
                            qtyTiers: [
                                { min: 500, max: 999, unitPrice: 4.6, label: '500+' },
                                { min: 1000, max: null, unitPrice: 3.5, label: '1000+' }
                            ]
                        },
                        {
                            value: 'dl', label: 'ظرف أمريكاني أو DL',
                            description: 'من 500: 3.6 ج.م/ظرف — من 1000: 2.5 ج.م/ظرف',
                            qtyTiers: [
                                { min: 500, max: 999, unitPrice: 3.6, label: '500+' },
                                { min: 1000, max: null, unitPrice: 2.5, label: '1000+' }
                            ]
                        }
                    ]
                },
                {
                    id: 'quantity',
                    label: 'الكمية',
                    type: 'number',
                    required: true,
                    min: 500,
                    step: 1
                }
            ],
            priceTiers: []
        },
        {
            id: 'flyers',
            name: 'الفلايرات',
            icon: 'fa-newspaper',
            active: true,
            sortOrder: 5,
            codeSync: true,
            pricingMode: 'option_floor_tiers',
            minQty: 1000,
            minQtyMessage: 'الحد الأدنى للطلب 1000 نسخة',
            unitLabel: 'سعر النسخة',
            unitSuffix: 'نسخة',
            qtyUnit: 'نسخة',
            fixedSpecs: [],
            fields: [
                {
                    id: 'size',
                    label: 'المقاس',
                    type: 'select',
                    display: 'scroll',
                    required: true,
                    options: [
                        {
                            value: 'a5',
                            label: 'A5',
                            description: '150 جرام — 1000→1500 — 2000→2000 — 4000→3500 — 10000→9000',
                            nearestTiers: [
                                { qty: 1000, totalPrice: 1500 },
                                { qty: 2000, totalPrice: 2000 },
                                { qty: 4000, totalPrice: 3500 },
                                { qty: 10000, totalPrice: 9000 }
                            ]
                        },
                        {
                            value: 'a4',
                            label: 'A4',
                            description: '150 جرام — 1000→2100 ج.م',
                            nearestTiers: [
                                { qty: 1000, totalPrice: 2100 }
                            ]
                        }
                    ]
                },
                {
                    id: 'paper_weight',
                    label: 'نوع الورق',
                    type: 'select',
                    display: 'scroll',
                    required: true,
                    options: [
                        { value: '150g', label: '150 جرام' }
                    ]
                },
                {
                    id: 'quantity',
                    label: 'الكمية',
                    type: 'number',
                    required: true,
                    min: 1000,
                    step: 1
                }
            ],
            priceTiers: []
        },
        {
            id: 'cards_double_sided',
            name: 'كروت طباعة وجهين',
            icon: 'fa-address-card',
            active: true,
            sortOrder: 6,
            codeSync: true,
            pricingMode: 'option_floor_tiers',
            minQty: 100,
            minQtyMessage: 'الحد الأدنى للطلب 100 كارت',
            unitLabel: 'سعر الكارت',
            unitSuffix: 'كارت',
            qtyUnit: 'كارت',
            fixedSpecs: [
                { label: 'الطباعة', value: 'طباعة وجهين' },
                { label: 'التشطيب', value: 'سلوفان وجهين' },
                { label: 'نوع الطباعة', value: 'طباعة ديجيتال' }
            ],
            fields: [
                {
                    id: 'material',
                    label: 'نوع الخامة',
                    type: 'select',
                    display: 'scroll',
                    required: true,
                    options: [
                        {
                            value: 'coated_350g',
                            label: 'كوشيه 350 جرام',
                            description: '100 كارت→120 ج.م — 1000 كارت→750 ج.م',
                            nearestTiers: [
                                { qty: 100, totalPrice: 120 },
                                { qty: 1000, totalPrice: 750 }
                            ]
                        },
                        {
                            value: 'coated_300g',
                            label: 'كوشيه 300 جرام',
                            description: '100 كارت→110 ج.م — 1000 كارت→650 ج.م',
                            nearestTiers: [
                                { qty: 100, totalPrice: 110 },
                                { qty: 1000, totalPrice: 650 }
                            ]
                        }
                    ]
                },
                {
                    id: 'quantity',
                    label: 'الكمية',
                    type: 'number',
                    required: true,
                    min: 100,
                    step: 1
                }
            ],
            priceTiers: []
        },
        {
            id: 'promotional_gifts',
            name: 'الهدايا الدعائية والتكريمات',
            icon: 'fa-gifts',
            catalogType: 'group',
            active: true,
            sortOrder: 7,
            codeSync: true,
            subcategories: [
                {
                    id: 'sublimation',
                    name: 'منتجات السليميشن',
                    icon: 'fa-mug-saucer',
                    image: '',
                    sortOrder: 1,
                    itemFieldLabel: 'المنتج',
                    items: [
                        { id: 'porcelain_mug', name: 'مج بورسلين', icon: 'fa-mug-saucer', unitPrice: 150 },
                        { id: 'sublimation_coaster', name: 'كوستر سليميشن', icon: 'fa-circle', unitPrice: 20 },
                        { id: 'acrylic_coaster_2mm', name: 'كوستر أكريلك طبقتين 2 مم', icon: 'fa-layer-group', unitPrice: 60 },
                        { id: 'acrylic_coaster_velvet', name: 'كوستر أكريلك طبقة واحدة ظهر قطيفة', icon: 'fa-square', unitPrice: 45 },
                        { id: 'sublimation_vest', name: 'فيست سليميشن', icon: 'fa-vest', unitPrice: 150 }
                    ]
                },
                {
                    id: 'shields_awards',
                    name: 'الدروع والتكريمات',
                    icon: 'fa-trophy',
                    image: '',
                    sortOrder: 2,
                    itemFieldLabel: 'نوع الدرع',
                    items: [
                        { id: 'crystal_large', name: 'درع كريستال كبير', icon: 'fa-gem', unitPrice: 650 },
                        { id: 'crystal_medium', name: 'درع كريستال وسط', icon: 'fa-award', unitPrice: 450 },
                        { id: 'crystal_small', name: 'درع كريستال صغير', icon: 'fa-medal', unitPrice: 350 },
                        { id: 'wood_shield', name: 'درع خشب', icon: 'fa-shield-halved', unitPrice: 1300 },
                        { id: 'velvet_shield', name: 'درع قطيفة طباعة سليميشن', icon: 'fa-ribbon', unitPrice: 200 }
                    ]
                },
                {
                    id: 'installation_supplies',
                    name: 'مستلزمات التركيب والتجهيز',
                    icon: 'fa-screwdriver-wrench',
                    image: '',
                    sortOrder: 3,
                    itemFieldLabel: 'المنتج',
                    items: [
                        { id: 'stretch_foil', name: 'استرتش بول', icon: 'fa-film', unitPrice: 50 },
                        { id: 'balloon', name: 'بالونة', icon: 'fa-burst', unitPrice: 10 },
                        { id: 'stan_roll_25_2_5', name: 'بكرة ستان 25 متر عرض 2.5 سم', icon: 'fa-scroll', unitPrice: 400 },
                        { id: 'stan_roll_25_5', name: 'بكرة ستان 25 متر عرض 5 سم', icon: 'fa-scroll', unitPrice: 750 }
                    ]
                }
            ]
        },
        getStampsCatalogGroup()
    ],

    buildGroupItemProduct(group, subcategory) {
        const items = subcategory.items || [];
        return {
            id: `${group.id}_${subcategory.id}`,
            name: subcategory.name,
            icon: subcategory.icon || group.icon,
            catalogType: 'group_item',
            parentGroupId: group.id,
            parentGroupName: group.name,
            subcategoryId: subcategory.id,
            subcategoryName: subcategory.name,
            pricingMode: 'option_flat_unit',
            minQty: 1,
            minQtyMessage: 'أدخل الكمية',
            unitLabel: 'سعر الوحدة',
            unitSuffix: 'قطعة',
            hideDesign: true,
            fixedSpecs: [],
            fields: [
                {
                    id: 'item',
                    label: subcategory.itemFieldLabel || 'المنتج',
                    type: 'select',
                    display: 'scroll',
                    required: true,
                    options: items.map(it => ({
                        value: it.id,
                        label: it.name,
                        unitPrice: it.unitPrice,
                        icon: it.icon || ProductCatalog.getItemIcon(it.id)
                    }))
                },
                {
                    id: 'quantity',
                    label: 'الكمية',
                    type: 'number',
                    required: true,
                    min: 1,
                    step: 1
                }
            ],
            priceTiers: []
        };
    },

    ref() {
        return db.collection(this.COLLECTION);
    },

    async init() {
        if (this._initialized) return;
        try {
            const snap = await this.ref().get();
            if (!snap.empty) {
                this._cache = snap.docs.map(d => ({ ...d.data(), id: d.id }));
            } else {
                this._cache = [];
            }
            const existingIds = this._cache.map(p => p.id);
            for (const def of this.DEFAULTS) {
                const cleanDef = { ...def };
                delete cleanDef.codeSync;
                if (!existingIds.includes(def.id)) {
                    try {
                        await this.ref().doc(def.id).set(cleanDef);
                        this._cache.push({ ...cleanDef });
                    } catch (e) { console.warn('Catalog seed error:', def.id, e); }
                } else if (def.codeSync) {
                    try {
                        await this.ref().doc(def.id).set(cleanDef);
                        const idx = this._cache.findIndex(p => p.id === def.id);
                        if (idx >= 0) this._cache[idx] = { ...cleanDef };
                    } catch (e) { console.warn('Catalog sync error:', def.id, e); }
                }
            }
            this._cache.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
            this._initialized = true;
        } catch (e) {
            console.error('CatalogSvc init error:', e);
            this._cache = [...this.DEFAULTS];
            this._initialized = true;
        }
    },

    getAll() { return this._cache; },
    getActive() { return this._cache.filter(p => p.active !== false); },
    getById(id) { return this._cache.find(p => p.id === id); },

    async save(product) {
        if (!product.id) product.id = 'cat_' + Date.now();
        product.updatedAt = Date.now();
        await this.ref().doc(product.id).set(product, { merge: true });
        const idx = this._cache.findIndex(p => p.id === product.id);
        if (idx >= 0) this._cache[idx] = { ...product };
        else this._cache.push({ ...product });
        this._cache.sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
        return product;
    },

    async remove(id) {
        await this.ref().doc(id).delete();
        this._cache = this._cache.filter(p => p.id !== id);
    }
};

const CatalogPricing = {
    getQuantity(product, selections) {
        const qtyField = (product.fields || []).find(f =>
            (f.id === 'quantity' || (f.label && f.label.includes('كمية')))
        );
        const key = qtyField ? qtyField.id : 'quantity';
        return parseInt(selections[key], 10) || 0;
    },

    getFieldLabel(product, fieldId, value) {
        const field = (product.fields || []).find(f => f.id === fieldId);
        if (!field) return value;
        if (field.type === 'select') {
            const opt = (field.options || []).find(o => o.value === value);
            return opt ? opt.label : value;
        }
        return value;
    },

    getOptionDetail(product, fieldId, value) {
        const field = (product.fields || []).find(f => f.id === fieldId);
        if (!field || field.type !== 'select') return '';
        const opt = (field.options || []).find(o => o.value === value);
        if (!opt) return '';
        const parts = [opt.label];
        if (opt.description) parts.push(opt.description);
        return parts.join(' — ');
    },

    calculate(product, selections) {
        const qty = this.getQuantity(product, selections);
        const result = {
            quantity: qty,
            unitPrice: 0,
            pricePerThousand: 0,
            total: 0,
            unitLabel: product.unitLabel || 'سعر الوحدة',
            error: null,
            tierLabel: ''
        };

        if (product.minQty && qty < product.minQty) {
            result.error = product.minQtyMessage || `الحد الأدنى للكمية هو ${product.minQty}`;
            return result;
        }

        if (product.pricingMode === 'tier_unit') {
            const tier = (product.priceTiers || []).find(t => {
                const max = t.max == null ? Infinity : t.max;
                return qty >= t.min && qty <= max;
            });
            if (!tier) {
                result.error = 'لا يوجد شريحة سعر لهذه الكمية';
                return result;
            }
            result.unitPrice = tier.unitPrice;
            result.total = qty * tier.unitPrice;
            result.tierLabel = tier.max == null ? `${tier.min}+` : `${tier.min}-${tier.max}`;
        } else if (product.pricingMode === 'option_thousand') {
            const optionField = (product.fields || []).find(f => f.options?.some(o => o.pricePerThousand != null));
            if (!optionField) {
                result.error = 'إعدادات التسعير غير مكتملة';
                return result;
            }
            const opt = (optionField.options || []).find(o => o.value === selections[optionField.id]);
            if (!opt || !opt.pricePerThousand) {
                result.error = 'اختر ' + (optionField.label || 'النوع');
                return result;
            }
            result.pricePerThousand = opt.pricePerThousand;
            result.unitPrice = opt.pricePerThousand;
            result.total = (qty / 1000) * opt.pricePerThousand;
            result.unitLabel = 'سعر الألف';
        } else if (product.pricingMode === 'per_thousand') {
            const ppt = product.pricePerThousand || (product.priceTiers?.[0]?.unitPrice) || 0;
            result.pricePerThousand = ppt;
            result.unitPrice = ppt;
            result.total = (qty / 1000) * ppt;
            result.unitLabel = 'سعر الألف';
        } else if (product.pricingMode === 'flat_unit') {
            result.unitPrice = product.unitPrice || 0;
            result.total = qty * result.unitPrice;
        } else if (product.pricingMode === 'option_qty_tiers') {
            const typeField = (product.fields || []).find(f => f.options?.some(o => o.qtyTiers || o.qtyPrices));
            if (!typeField) {
                result.error = 'إعدادات التسعير غير مكتملة';
                return result;
            }
            const opt = (typeField.options || []).find(o => o.value === selections[typeField.id]);
            if (!opt) {
                result.error = 'اختر ' + (typeField.label || 'النوع');
                return result;
            }
            if (!qty) {
                result.error = 'أدخل الكمية';
                return result;
            }
            if (opt.qtyTiers && opt.qtyTiers.length) {
                const tier = opt.qtyTiers.find(t => {
                    const max = t.max == null ? Infinity : t.max;
                    return qty >= t.min && qty <= max;
                });
                if (!tier) {
                    result.error = `لا توجد شريحة سعر لهذه الكمية (الحد الأدنى ${product.minQty || 500})`;
                    return result;
                }
                result.unitPrice = tier.unitPrice;
                result.total = qty * tier.unitPrice;
                result.unitLabel = 'سعر الوحدة';
                result.tierLabel = tier.label || (tier.max == null ? `${tier.min}+` : `${tier.min}-${tier.max}`);
            } else if (opt.qtyPrices) {
                const packagePrice = opt.qtyPrices[String(qty)];
                if (packagePrice == null) {
                    result.error = `الكمية المتاحة: ${Object.keys(opt.qtyPrices).join(' أو ')} نسخة`;
                    return result;
                }
                result.total = packagePrice;
                result.unitPrice = qty > 0 ? packagePrice / qty : packagePrice;
                result.unitLabel = 'السعر';
                result.tierLabel = qty + ' نسخة';
            } else {
                result.error = 'إعدادات التسعير غير مكتملة';
            }
        } else if (product.pricingMode === 'option_floor_tiers') {
            const typeField = (product.fields || []).find(f => f.options?.some(o => o.nearestTiers));
            if (!typeField) {
                result.error = 'إعدادات التسعير غير مكتملة';
                return result;
            }
            const opt = (typeField.options || []).find(o => o.value === selections[typeField.id]);
            if (!opt) {
                result.error = 'اختر ' + (typeField.label || 'النوع');
                return result;
            }
            if (!qty) {
                result.error = 'أدخل الكمية';
                return result;
            }
            const tiers = (opt.nearestTiers || []).slice().sort((a, b) => b.qty - a.qty);
            const tier = tiers.find(t => qty >= t.qty);
            if (!tier) {
                const minTier = tiers.length ? Math.min(...tiers.map(t => t.qty)) : (product.minQty || 1000);
                const qtyUnit = product.qtyUnit || 'نسخة';
                result.error = `الحد الأدنى ${minTier.toLocaleString('ar-EG')} ${qtyUnit}`;
                return result;
            }
            result.unitPrice = tier.totalPrice / tier.qty;
            result.total = qty * result.unitPrice;
            result.unitLabel = product.unitLabel || 'سعر الوحدة';
            result.tierLabel = tier.qty.toLocaleString('ar-EG') + ' ' + (product.qtyUnit || 'نسخة');
            result.usedTierQty = tier.qty;
            result.usedTierTotal = tier.totalPrice;
        } else if (product.pricingMode === 'option_flat_unit') {
            const optionField = (product.fields || []).find(f => f.options?.some(o => o.unitPrice != null));
            if (!optionField) {
                result.error = 'إعدادات التسعير غير مكتملة';
                return result;
            }
            const opt = (optionField.options || []).find(o => o.value === selections[optionField.id]);
            if (!opt) {
                result.error = 'اختر ' + (optionField.label || 'المنتج');
                return result;
            }
            if (!qty) {
                result.error = 'أدخل الكمية';
                return result;
            }
            result.unitPrice = opt.unitPrice;
            result.total = qty * opt.unitPrice;
            result.unitLabel = product.unitLabel || 'سعر الوحدة';
            result.itemName = opt.label;
            result.itemId = opt.value;
        }

        result.total = Math.round(result.total * 100) / 100;
        return result;
    },

    buildSpecsSummary(product, selections) {
        const parts = [];
        (product.fields || []).forEach(f => {
            if (f.type === 'number' && f.id === 'quantity') return;
            const val = selections[f.id];
            if (val != null && val !== '') {
                parts.push(`${f.label}: ${this.getOptionDetail(product, f.id, val) || this.getFieldLabel(product, f.id, val)}`);
            }
        });
        (product.fixedSpecs || []).forEach(s => {
            parts.push(`${s.label}: ${s.value}`);
        });
        return parts;
    }
};

const ProductCatalog = {
    _currentProduct: null,
    _currentGroup: null,
    _currentStampSub: null,
    _stampSel: {},
    _stampDesignTab: 'file',
    _selections: {},
    _designFile: { url: '', name: '', data: '' },
    ALLOWED_EXT: ['pdf', 'psd', 'ai', 'cdr', 'png', 'jpg', 'jpeg'],

    ITEM_ICONS: {
        porcelain_mug: 'fa-mug-saucer',
        sublimation_coaster: 'fa-circle',
        acrylic_coaster_2mm: 'fa-layer-group',
        acrylic_coaster_velvet: 'fa-square',
        sublimation_vest: 'fa-vest',
        crystal_large: 'fa-gem',
        crystal_medium: 'fa-award',
        crystal_small: 'fa-medal',
        wood_shield: 'fa-shield-halved',
        velvet_shield: 'fa-ribbon',
        stretch_foil: 'fa-film',
        balloon: 'fa-burst',
        stan_roll_25_2_5: 'fa-scroll',
        stan_roll_25_5: 'fa-scroll'
    },

    SUBCATEGORY_THEMES: {
        sublimation: {
            card: 'from-[#2a1838] via-[#3d2450] to-[#1a0f24]',
            glow: 'group-hover:shadow-[0_20px_50px_-12px_rgba(219,39,119,0.45)]',
            ring: 'group-hover:ring-rose-400/50',
            iconWrap: 'from-rose-300/20 via-pink-400/10 to-rose-600/5',
            iconColor: 'text-rose-200',
            accent: 'via-rose-400/80',
            icon: 'fa-mug-saucer'
        },
        shields_awards: {
            card: 'from-[#2a2210] via-[#3d3218] to-[#1a1508]',
            glow: 'group-hover:shadow-[0_20px_50px_-12px_rgba(217,169,56,0.5)]',
            ring: 'group-hover:ring-amber-400/50',
            iconWrap: 'from-amber-300/25 via-yellow-400/12 to-amber-600/8',
            iconColor: 'text-amber-200',
            accent: 'via-amber-400/80',
            icon: 'fa-trophy'
        },
        installation_supplies: {
            card: 'from-[#14202e] via-[#1e3347] to-[#0c141c]',
            glow: 'group-hover:shadow-[0_20px_50px_-12px_rgba(56,189,248,0.4)]',
            ring: 'group-hover:ring-sky-400/45',
            iconWrap: 'from-sky-300/20 via-cyan-400/10 to-blue-600/8',
            iconColor: 'text-sky-200',
            accent: 'via-sky-400/75',
            icon: 'fa-screwdriver-wrench'
        },
        automatic: {
            card: 'from-[#1a2040] via-[#2a3060] to-[#101828]',
            glow: 'group-hover:shadow-[0_20px_50px_-12px_rgba(99,102,241,0.45)]',
            ring: 'group-hover:ring-indigo-400/50',
            iconWrap: 'from-indigo-300/25 via-violet-400/12 to-indigo-600/8',
            iconColor: 'text-indigo-200',
            accent: 'via-indigo-400/80',
            icon: 'fa-pen-fancy'
        },
        wood_hand: {
            card: 'from-[#2a1c10] via-[#3d2a18] to-[#1a1008]',
            glow: 'group-hover:shadow-[0_20px_50px_-12px_rgba(180,120,60,0.45)]',
            ring: 'group-hover:ring-amber-600/50',
            iconWrap: 'from-amber-600/25 via-orange-500/12 to-amber-800/8',
            iconColor: 'text-amber-200',
            accent: 'via-amber-500/75',
            icon: 'fa-tree'
        },
        date_stamps: {
            card: 'from-[#102a20] via-[#1a4030] to-[#081a14]',
            glow: 'group-hover:shadow-[0_20px_50px_-12px_rgba(52,211,153,0.4)]',
            ring: 'group-hover:ring-emerald-400/45',
            iconWrap: 'from-emerald-300/20 via-green-400/10 to-teal-600/8',
            iconColor: 'text-emerald-200',
            accent: 'via-emerald-400/75',
            icon: 'fa-calendar-days'
        },
        special: {
            card: 'from-[#2a1840] via-[#3d2460] to-[#180c28]',
            glow: 'group-hover:shadow-[0_20px_50px_-12px_rgba(168,85,247,0.45)]',
            ring: 'group-hover:ring-purple-400/50',
            iconWrap: 'from-purple-300/25 via-fuchsia-400/12 to-violet-600/8',
            iconColor: 'text-purple-200',
            accent: 'via-purple-400/80',
            icon: 'fa-star'
        },
        _default: {
            card: 'from-[#1c1c28] via-[#252535] to-[#12121a]',
            glow: 'group-hover:shadow-[0_20px_50px_-12px_rgba(212,175,55,0.35)]',
            ring: 'group-hover:ring-accent/40',
            iconWrap: 'from-accent/20 via-amber-400/10 to-primary/10',
            iconColor: 'text-amber-200',
            accent: 'via-accent/70',
            icon: 'fa-box'
        }
    },

    getItemIcon(itemId) {
        return this.ITEM_ICONS[itemId] || 'fa-box';
    },

    CATALOG_PICKER_THEMES: {
        notebook:       { icon: 'fa-book-open',         wrap: 'from-blue-100 via-indigo-50 to-blue-50',   color: 'text-indigo-600',  hover: 'hover:ring-indigo-200' },
        letterhead:     { icon: 'fa-file-signature',    wrap: 'from-slate-100 via-gray-50 to-zinc-100',   color: 'text-slate-600',   hover: 'hover:ring-slate-300' },
        folders:        { icon: 'fa-folder-open',       wrap: 'from-amber-100 via-yellow-50 to-orange-50', color: 'text-amber-700',  hover: 'hover:ring-amber-200' },
        envelopes:      { icon: 'fa-envelopes-bulk',    wrap: 'from-teal-100 via-emerald-50 to-cyan-50',  color: 'text-teal-600',    hover: 'hover:ring-teal-200' },
        flyers:         { icon: 'fa-newspaper',         wrap: 'from-orange-100 via-amber-50 to-yellow-50', color: 'text-orange-600', hover: 'hover:ring-orange-200' },
        cards_double_sided: { icon: 'fa-address-card',  wrap: 'from-violet-100 via-purple-50 to-fuchsia-50', color: 'text-violet-600', hover: 'hover:ring-violet-200' },
        promotional_gifts: { icon: 'fa-gifts',          wrap: 'from-rose-100 via-pink-50 to-amber-50',    color: 'text-rose-600',    hover: 'hover:ring-rose-200' },
        stamps:         { icon: 'fa-stamp',             wrap: 'from-stone-100 via-amber-50 to-orange-50', color: 'text-amber-800',  hover: 'hover:ring-amber-300' },
        _default:       { icon: 'fa-box',               wrap: 'from-gray-100 via-white to-gray-50',       color: 'text-primary',     hover: 'hover:ring-accent/30' }
    },

    _getPickerTheme(product) {
        const t = this.CATALOG_PICKER_THEMES[product.id] || this.CATALOG_PICKER_THEMES._default;
        return { ...t, icon: product.icon || t.icon };
    },

    _pickerCardHtml(product) {
        const theme = this._getPickerTheme(product);
        const isGroup = product.catalogType === 'group';
        const click = isGroup ? `ProductCatalog.openGroup('${product.id}')` : `ProductCatalog.openConfigurator('${product.id}')`;
        return `<div onclick="${click}"
            class="group cursor-pointer rounded-3xl border-2 border-gray-100 bg-white p-6 sm:p-7 flex flex-col items-center justify-center text-center min-h-[10.5rem] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-accent/40 ring-0 hover:ring-4 ${theme.hover}">
            <div class="w-[5.5rem] h-[5.5rem] sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br ${theme.wrap} border border-white shadow-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <i class="fas ${theme.icon} text-4xl sm:text-5xl ${theme.color} drop-shadow-sm"></i>
            </div>
            <h4 class="font-black text-gray-900 text-base sm:text-lg leading-snug px-1">${this._esc(product.name)}</h4>
        </div>`;
    },

    _getSubTheme(subId) {
        return this.SUBCATEGORY_THEMES[subId] || this.SUBCATEGORY_THEMES._default;
    },

    _subcategoryCardHtml(sub) {
        const theme = this._getSubTheme(sub.id);
        const icon = sub.icon || theme.icon || 'fa-box';
        const visual = sub.image
            ? `<div class="relative h-36 overflow-hidden rounded-t-3xl">
                <img src="${this._esc(sub.image)}" alt="" class="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-500">
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
               </div>`
            : `<div class="relative h-36 flex items-center justify-center overflow-hidden rounded-t-3xl">
                <div class="absolute inset-0 bg-gradient-to-br ${theme.card}"></div>
                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-white/5 blur-2xl"></div>
                <div class="relative w-24 h-24 rounded-3xl bg-gradient-to-br ${theme.iconWrap} border border-white/15 flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:border-white/30 transition-all duration-300">
                    <i class="fas ${icon} text-4xl ${theme.iconColor} drop-shadow-lg"></i>
                </div>
               </div>`;
        return `<div onclick="ProductCatalog.openSubcategory('${this._esc(sub.id)}')"
            class="group cursor-pointer relative rounded-3xl overflow-hidden ring-1 ring-white/10 ${theme.ring} ${theme.glow} transition-all duration-300 hover:-translate-y-2 bg-[#12121a]">
            ${visual}
            <div class="relative px-5 py-5 bg-gradient-to-b from-[#16161f] to-[#0e0e14] border-t border-white/5">
                <div class="h-px w-full bg-gradient-to-r from-transparent ${theme.accent} to-transparent mb-4 opacity-70"></div>
                <h4 class="font-black text-white text-base text-center leading-snug tracking-wide">${this._esc(sub.name)}</h4>
                <p class="text-[10px] text-white/35 text-center mt-2 uppercase tracking-widest">اضغط للدخول</p>
            </div>
        </div>`;
    },

    _luxuryItemGridHtml(field, product, selected) {
        const theme = this._getSubTheme(product.subcategoryId);
        return `<div class="form-group-catalog">
            <label class="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span class="w-8 h-8 rounded-lg bg-gradient-to-br ${theme.iconWrap} flex items-center justify-center">
                    <i class="fas ${product.subcategoryId ? (this._getSubTheme(product.subcategoryId).icon) : 'fa-box'} text-sm ${theme.iconColor}"></i>
                </span>
                ${this._esc(field.label)} ${field.required ? '<span class="text-red-500">*</span>' : ''}
            </label>
            <input type="hidden" id="catField_${field.id}" value="${this._esc(selected)}">
            <div class="cat-lux-grid grid grid-cols-2 gap-3 max-h-[22rem] overflow-y-auto p-1" style="scrollbar-width:thin">
                ${(field.options || []).map(o => {
                    const active = selected === o.value;
                    const ic = o.icon || this.getItemIcon(o.value);
                    const activeCls = 'border-accent/80 bg-gradient-to-br from-accent/12 to-primary/8 shadow-lg shadow-accent/15 ring-2 ring-accent/30';
                    const idleCls = 'border-gray-200/80 bg-white hover:border-accent/40 hover:shadow-md hover:bg-gradient-to-br hover:from-gray-50 hover:to-white';
                    return `<button type="button" data-value="${this._esc(o.value)}" data-icon="${ic}" onclick="ProductCatalog.selectScrollOption('${field.id}','${this._esc(o.value)}')"
                        class="cat-lux-item cat-scroll-opt flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ${active ? activeCls : idleCls}">
                        <div class="w-[4.5rem] h-[4.5rem] rounded-2xl bg-gradient-to-br from-primary/6 via-white to-accent/8 border border-gray-100 flex items-center justify-center mb-3 shadow-inner">
                            <i class="fas ${ic} text-3xl ${active ? 'text-accent' : 'text-primary/70'}"></i>
                        </div>
                        <span class="font-bold text-xs text-center text-gray-800 leading-relaxed px-1">${this._esc(o.label)}</span>
                    </button>`;
                }).join('')}
            </div>
        </div>`;
    },

    _setConfigModalLuxury(isLuxury) {
        const modal = document.getElementById('catalogProductConfigModal');
        const inner = modal?.querySelector('.bg-white.rounded-3xl');
        if (inner) {
            inner.classList.toggle('max-w-lg', !isLuxury);
            inner.classList.toggle('max-w-2xl', isLuxury);
        }
        const header = modal?.querySelector('.bg-primary');
        if (header && isLuxury) {
            header.className = 'bg-gradient-to-l from-[#1a1a24] via-primary to-[#2a2010] p-4 px-6 flex justify-between items-center sticky top-0 z-10 rounded-t-3xl border-b border-accent/20';
        } else if (header) {
            header.className = 'bg-primary p-4 px-6 flex justify-between items-center sticky top-0 z-10 rounded-t-3xl';
        }
    },

    async init() {
        await CatalogSvc.init();
    },

    async openPicker() {
        try {
            Swal.fire({ title: 'جاري تحميل الكتالوج...', allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
            await CatalogSvc.init();
            Swal.close();
            this.renderPicker();
            openModal('catalogPickerModal');
        } catch (e) {
            Swal.close();
            console.error('Catalog picker error:', e);
            Swal.fire('خطأ', 'تعذر تحميل الكتالوج', 'error');
        }
    },

    renderPicker() {
        const grid = document.getElementById('catalogPickerGrid');
        if (!grid) return;
        const products = CatalogSvc.getActive();
        if (!products.length) {
            grid.innerHTML = '<p class="text-center text-gray-400 py-12 col-span-full">لا توجد منتجات في الكتالوج</p>';
            return;
        }
        grid.innerHTML = products.map(p => this._pickerCardHtml(p)).join('');
    },

    openGroup(groupId) {
        const group = CatalogSvc.getById(groupId);
        if (!group || group.catalogType !== 'group') return;
        this._currentGroup = group;
        closeModal('catalogPickerModal');
        const title = document.getElementById('catalogSubcategoryTitle');
        const subtitle = document.getElementById('catalogSubcategorySubtitle');
        const grid = document.getElementById('catalogSubcategoryGrid');
        if (title) title.textContent = group.name;
        if (subtitle) subtitle.textContent = 'اختر القسم الفرعي';
        if (grid) {
            const subs = (group.subcategories || []).slice().sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
            grid.innerHTML = subs.length
                ? subs.map(s => this._subcategoryCardHtml(s)).join('')
                : '<p class="text-center text-gray-400 py-12 col-span-full">لا توجد أقسام فرعية</p>';
        }
        openModal('catalogSubcategoryModal');
    },

    backToPicker() {
        closeModal('catalogSubcategoryModal');
        this._currentGroup = null;
        this.renderPicker();
        openModal('catalogPickerModal');
    },

    openSubcategory(subcategoryId) {
        const group = this._currentGroup;
        if (!group) return;
        const sub = (group.subcategories || []).find(s => s.id === subcategoryId);
        if (!sub) return;
        if (sub.configType && sub.configType.startsWith('stamp_')) {
            this.openStampConfigurator(sub);
            return;
        }
        if (!(sub.items || []).length) {
            Swal.fire('تنبيه', 'لا توجد منتجات في هذا القسم', 'info');
            return;
        }
        closeModal('catalogSubcategoryModal');
        this._currentProduct = CatalogSvc.buildGroupItemProduct(group, sub);
        this._selections = {};
        this._designFile = { url: '', name: '', data: '' };
        const f = this._currentProduct.fields || [];
        f.forEach(field => {
            if (field.type === 'number') this._selections[field.id] = field.min || 1;
            else if (field.type === 'select' && field.options?.length) this._selections[field.id] = field.options[0].value;
        });
        this.renderConfigurator();
        openModal('catalogProductConfigModal');
    },

    openConfigurator(productId) {
        const product = CatalogSvc.getById(productId);
        if (!product) return;
        closeModal('catalogPickerModal');
        this._currentProduct = product;
        this._selections = {};
        this._designFile = { url: '', name: '', data: '' };
        (product.fields || []).forEach(f => {
            if (f.type === 'number') this._selections[f.id] = f.min || '';
            else if (f.type === 'select' && f.options?.length) this._selections[f.id] = f.options[0].value;
        });
        this.renderConfigurator();
        openModal('catalogProductConfigModal');
    },

    openStampConfigurator(sub) {
        const group = this._currentGroup;
        if (!group || !sub) return;
        closeModal('catalogSubcategoryModal');
        this._currentStampSub = sub;
        this._stampSel = { stampType: '', size: '', variant: '', item: '', quantity: 1, customSize: '', manualPrice: '' };
        this._stampDesignTab = 'file';
        this._designFile = { url: '', name: '', data: '' };
        this._currentProduct = {
            id: `${group.id}_${sub.id}`,
            name: sub.name,
            catalogType: 'stamp_config',
            parentGroupId: group.id,
            parentGroupName: group.name,
            subcategoryId: sub.id,
            subcategoryName: sub.name,
            pricingMode: 'stamp_matrix'
        };
        if (sub.configType === 'stamp_simple' || sub.configType === 'stamp_special') {
            this._stampSel.item = sub.items?.[0]?.id || '';
        } else if (sub.stampTypes?.length) {
            this._stampSel.stampType = sub.stampTypes[0].id;
            const firstSizes = sub.stampTypes[0].sizes || [];
            if (firstSizes.length) {
                this._stampSel.size = firstSizes[0].id;
                if (firstSizes[0].variants?.length) this._stampSel.variant = firstSizes[0].variants[0].id;
            }
        }
        this.renderStampConfigurator();
        openModal('catalogProductConfigModal');
    },

    _stampChip(value, label, selected, field) {
        const active = selected === value;
        return `<button type="button" onclick="ProductCatalog.onStampSelect('${field}','${this._esc(value)}')"
            class="px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${active
                ? 'border-accent bg-accent/15 text-gray-900 shadow-sm ring-2 ring-accent/25'
                : 'border-gray-200 bg-white text-gray-600 hover:border-accent/50'}">${this._esc(label)}</button>`;
    },

    _renderStampTypeSection(sub) {
        if (!sub.stampTypes?.length) return '';
        const sel = this._stampSel.stampType;
        return `<div class="form-group-catalog" id="stampTypeSection">
            <label class="block text-sm font-bold text-gray-800 mb-2">نوع الختم <span class="text-red-500">*</span></label>
            <div class="flex flex-wrap gap-2">${sub.stampTypes.map(t => this._stampChip(t.id, t.label, sel, 'stampType')).join('')}</div>
        </div>`;
    },

    _renderStampSizeSection(sub) {
        if (!sub.stampTypes?.length) return '';
        const st = StampPricing.getStampType(sub, this._stampSel.stampType);
        if (!st) return '';
        const sel = this._stampSel.size;
        let chips = (st.sizes || []).map(s => this._stampChip(s.id, s.label, sel, 'size')).join('');
        if (sub.configType === 'stamp_wood' && sub.allowCustomSize) {
            chips += this._stampChip('custom', 'مقاس مخصص', sel, 'size');
        }
        let customInput = '';
        if (sub.configType === 'stamp_wood' && sel === 'custom') {
            customInput = `<input type="text" id="catStampCustomSize" value="${this._esc(this._stampSel.customSize || '')}"
                oninput="ProductCatalog.onStampCustomSizeInput()" placeholder="اكتب المقاس المطلوب"
                class="w-full mt-3 border border-gray-300 p-3 rounded-xl focus:border-accent outline-none text-sm">`;
        }
        return `<div class="form-group-catalog" id="stampSizeSection">
            <label class="block text-sm font-bold text-gray-800 mb-2">المقاس <span class="text-red-500">*</span></label>
            <div class="flex flex-wrap gap-2">${chips}</div>${customInput}
        </div>`;
    },

    _renderStampVariantSection(sub) {
        if (sub.configType !== 'stamp_automatic') return '';
        const st = StampPricing.getStampType(sub, this._stampSel.stampType);
        const sz = StampPricing.getSize(st, this._stampSel.size);
        if (!sz?.variants?.length) return '';
        const sel = this._stampSel.variant;
        return `<div class="form-group-catalog" id="stampVariantSection">
            <label class="block text-sm font-bold text-gray-800 mb-2">نوع المنتج <span class="text-red-500">*</span></label>
            <div class="flex flex-wrap gap-2">${sz.variants.map(v => this._stampChip(v.id, v.label, sel, 'variant')).join('')}</div>
        </div>`;
    },

    _renderStampItemSection(sub) {
        if (!sub.items?.length) return '';
        const sel = this._stampSel.item;
        return `<div class="form-group-catalog" id="stampItemSection">
            <label class="block text-sm font-bold text-gray-800 mb-2">الخيار <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-1 gap-2">${sub.items.map(it => {
                const active = sel === it.id;
                return `<button type="button" onclick="ProductCatalog.onStampSelect('item','${this._esc(it.id)}')"
                    class="w-full text-right p-4 rounded-xl border-2 transition ${active ? 'border-accent bg-accent/10' : 'border-gray-200 bg-white hover:border-accent/40'}">
                    <span class="font-bold text-gray-800">${this._esc(it.label)}</span>
                    ${it.manualPrice ? '<span class="block text-xs text-gray-400 mt-1">يتم تحديد السعر يدوياً</span>' : ''}
                </button>`;
            }).join('')}</div>
        </div>`;
    },

    _renderStampManualPriceSection(sub) {
        const item = StampPricing.getItem(sub, this._stampSel.item);
        if (!item?.manualPrice) return '';
        return `<div class="form-group-catalog" id="stampManualPriceSection">
            <label class="block text-sm font-bold text-gray-800 mb-1">السعر (يدوي) <span class="text-red-500">*</span></label>
            <input type="number" id="catStampManualPrice" min="1" step="1" value="${this._stampSel.manualPrice || ''}"
                oninput="ProductCatalog.onStampManualPriceInput()" class="w-full border border-gray-300 p-3 rounded-xl focus:border-accent outline-none text-sm" placeholder="أدخل السعر">
        </div>`;
    },

    _renderStampNotes(sub) {
        if (!sub.notes?.length) return '';
        return `<div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p class="text-xs font-bold text-amber-800 mb-1"><i class="fas fa-info-circle ml-1"></i> ملاحظات</p>
            ${sub.notes.map(n => `<p class="text-xs text-amber-700">• ${this._esc(n)}</p>`).join('')}
        </div>`;
    },

    _renderStampDesignSection() {
        const isFile = this._stampDesignTab === 'file';
        return `<div class="border-t border-gray-200 pt-4 mb-4">
            <label class="block text-sm font-bold text-gray-800 mb-2"><i class="fas fa-stamp text-accent ml-1"></i> تصميم الختم</label>
            <div class="flex gap-2 mb-3">
                <button type="button" id="catStampTabFile" onclick="ProductCatalog.setStampDesignTab('file')"
                    class="flex-1 py-2 rounded-lg text-xs font-bold border-2 ${isFile ? 'border-accent bg-accent text-white' : 'border-gray-200 text-gray-600'}">رفع ملف</button>
                <button type="button" id="catStampTabText" onclick="ProductCatalog.setStampDesignTab('text')"
                    class="flex-1 py-2 rounded-lg text-xs font-bold border-2 ${!isFile ? 'border-accent bg-accent text-white' : 'border-gray-200 text-gray-600'}">نص الختم</button>
            </div>
            <div id="catStampFileSection" class="${isFile ? '' : 'hidden-section'}">
                <input type="file" id="catDesignFileInput" accept=".pdf,.psd,.ai,.cdr,.png,.jpg,.jpeg" onchange="ProductCatalog.onDesignFileSelect(this)"
                    class="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-accent/10 file:text-accent file:font-bold file:cursor-pointer">
                <div id="catDesignFilePreview" class="mt-2 text-xs text-green-600"></div>
            </div>
            <div id="catStampTextSection" class="${!isFile ? '' : 'hidden-section'}">
                <textarea id="catStampDesignText" rows="3" oninput="ProductCatalog.onStampDesignTextInput()"
                    placeholder="اكتب نص الختم المطلوب..." class="w-full border border-gray-300 p-3 rounded-xl focus:border-accent outline-none text-sm resize-none"></textarea>
            </div>
        </div>`;
    },

    renderStampConfigurator() {
        const sub = this._currentStampSub;
        const body = document.getElementById('catalogConfigBody');
        const title = document.getElementById('catalogConfigTitle');
        if (!body || !sub) return;
        if (title) title.textContent = sub.name;
        this._setConfigModalLuxury(true);
        body.innerHTML = `
            ${this._renderStampNotes(sub)}
            ${sub.stampTypes ? this._renderStampTypeSection(sub) : ''}
            <div id="stampDynamicSections">
                ${sub.stampTypes ? this._renderStampSizeSection(sub) + this._renderStampVariantSection(sub) : ''}
                ${sub.items ? this._renderStampItemSection(sub) + this._renderStampManualPriceSection(sub) : ''}
            </div>
            <div class="form-group-catalog mt-4">
                <label class="block text-sm font-bold text-gray-800 mb-1">الكمية <span class="text-red-500">*</span></label>
                <input type="number" id="catStampQuantity" min="1" step="1" value="${this._stampSel.quantity || 1}"
                    oninput="ProductCatalog.onStampQuantityInput()" class="w-full border border-gray-300 p-3 rounded-xl focus:border-accent outline-none text-sm">
            </div>
            <div id="catalogPricePreview" class="bg-gradient-to-l from-accent/5 to-primary/5 border border-accent/20 rounded-2xl p-4 mt-4"></div>
        `;
        this.updateStampPreview();
    },

    _refreshStampDynamicSections() {
        const sub = this._currentStampSub;
        const wrap = document.getElementById('stampDynamicSections');
        if (!wrap || !sub) return;
        if (sub.stampTypes) {
            wrap.innerHTML = this._renderStampSizeSection(sub) + this._renderStampVariantSection(sub);
        } else if (sub.items) {
            wrap.innerHTML = this._renderStampItemSection(sub) + this._renderStampManualPriceSection(sub);
        }
    },

    onStampSelect(field, value) {
        this._stampSel[field] = value;
        if (field === 'stampType') {
            const sub = this._currentStampSub;
            const st = StampPricing.getStampType(sub, value);
            const first = st?.sizes?.[0];
            this._stampSel.size = first?.id || '';
            this._stampSel.variant = first?.variants?.[0]?.id || '';
            this._stampSel.customSize = '';
        }
        if (field === 'size') {
            const sub = this._currentStampSub;
            const st = StampPricing.getStampType(sub, this._stampSel.stampType);
            const sz = StampPricing.getSize(st, value);
            this._stampSel.variant = sz?.variants?.[0]?.id || '';
            if (value !== 'custom') this._stampSel.customSize = '';
        }
        this._refreshStampDynamicSections();
        this.updateStampPreview();
    },

    onStampCustomSizeInput() {
        this._stampSel.customSize = document.getElementById('catStampCustomSize')?.value || '';
        this.updateStampPreview();
    },

    onStampManualPriceInput() {
        this._stampSel.manualPrice = document.getElementById('catStampManualPrice')?.value || '';
        this.updateStampPreview();
    },

    onStampQuantityInput() {
        this._stampSel.quantity = parseInt(document.getElementById('catStampQuantity')?.value, 10) || 1;
        this.updateStampPreview();
    },

    onStampDesignTextInput() {
        this._stampDesignText = document.getElementById('catStampDesignText')?.value || '';
    },

    setStampDesignTab(tab) {
        this._stampDesignTab = tab;
        const fileSec = document.getElementById('catStampFileSection');
        const textSec = document.getElementById('catStampTextSection');
        const fileBtn = document.getElementById('catStampTabFile');
        const textBtn = document.getElementById('catStampTabText');
        if (tab === 'file') {
            fileSec?.classList.remove('hidden-section');
            textSec?.classList.add('hidden-section');
            fileBtn?.classList.add('border-accent', 'bg-accent', 'text-white');
            fileBtn?.classList.remove('border-gray-200', 'text-gray-600');
            textBtn?.classList.remove('border-accent', 'bg-accent', 'text-white');
            textBtn?.classList.add('border-gray-200', 'text-gray-600');
        } else {
            fileSec?.classList.add('hidden-section');
            textSec?.classList.remove('hidden-section');
            textBtn?.classList.add('border-accent', 'bg-accent', 'text-white');
            textBtn?.classList.remove('border-gray-200', 'text-gray-600');
            fileBtn?.classList.remove('border-accent', 'bg-accent', 'text-white');
            fileBtn?.classList.add('border-gray-200', 'text-gray-600');
        }
    },

    collectStampSelections() {
        const sub = this._currentStampSub;
        if (!sub) return {};
        const sel = { ...this._stampSel };
        sel.quantity = parseInt(document.getElementById('catStampQuantity')?.value, 10) || sel.quantity || 1;
        if (sel.size === 'custom') sel.customSize = document.getElementById('catStampCustomSize')?.value?.trim() || sel.customSize || '';
        const item = StampPricing.getItem(sub, sel.item);
        if (item?.manualPrice) sel.manualPrice = document.getElementById('catStampManualPrice')?.value || sel.manualPrice || '';
        return sel;
    },

    updateStampPreview() {
        const preview = document.getElementById('catalogPricePreview');
        const sub = this._currentStampSub;
        const product = this._currentProduct;
        if (!preview || !sub || !product) return;
        this._stampSel = this.collectStampSelections();
        const calc = StampPricing.calculate(sub, this._stampSel);

        if (calc.error) {
            preview.innerHTML = `<div class="text-red-500 text-sm font-bold text-center"><i class="fas fa-exclamation-circle ml-1"></i> ${this._esc(calc.error)}</div>`;
            return;
        }

        const infoBlock = calc.infoMessage
            ? `<div class="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 text-center mb-2"><i class="fas fa-info-circle ml-1"></i> ${this._esc(calc.infoMessage)}</div>` : '';

        const rows = [];
        rows.push(`<div class="flex justify-between"><span class="text-gray-500 text-xs">القسم الرئيسي</span><span class="text-xs font-semibold">${this._esc(product.parentGroupName)}</span></div>`);
        rows.push(`<div class="flex justify-between"><span class="text-gray-500 text-xs">القسم الفرعي</span><span class="text-xs font-semibold">${this._esc(product.subcategoryName)}</span></div>`);
        if (calc.stampTypeLabel) rows.push(`<div class="flex justify-between"><span class="text-gray-500 text-xs">نوع الختم</span><span class="text-xs font-semibold">${this._esc(calc.stampTypeLabel)}</span></div>`);
        if (calc.sizeLabel) rows.push(`<div class="flex justify-between"><span class="text-gray-500 text-xs">المقاس</span><span class="text-xs font-semibold">${this._esc(calc.sizeLabel)}</span></div>`);
        if (calc.productTypeLabel) rows.push(`<div class="flex justify-between"><span class="text-gray-500 text-xs">نوع المنتج</span><span class="text-xs font-semibold">${this._esc(calc.productTypeLabel)}</span></div>`);
        if (calc.itemName && !calc.stampTypeLabel) rows.push(`<div class="flex justify-between"><span class="text-gray-500">المنتج</span><span class="font-bold">${this._esc(calc.itemName)}</span></div>`);

        const priceRow = calc.pendingPricing
            ? `<div class="flex justify-between"><span class="text-gray-500">السعر</span><span class="font-bold text-amber-600">حسب المقاس</span></div>`
            : `<div class="flex justify-between"><span class="text-gray-500">${calc.unitLabel}</span><span class="font-bold text-accent">${calc.unitPrice.toLocaleString('ar-EG')} ج.م</span></div>`;

        const totalRow = calc.pendingPricing
            ? `<div class="flex justify-between pt-2 border-t border-accent/20"><span class="font-bold text-gray-800">الإجمالي</span><span class="font-bold text-amber-600">يُحدد لاحقاً</span></div>`
            : `<div class="flex justify-between pt-2 border-t border-accent/20"><span class="font-bold text-gray-800">الإجمالي</span><span class="font-black text-xl text-accent">${calc.total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span></div>`;

        preview.innerHTML = `
            <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2"><i class="fas fa-receipt text-accent"></i> ملخص السعر</h4>
            ${infoBlock}
            <div class="space-y-2 text-sm">${rows.join('')}
                <div class="flex justify-between"><span class="text-gray-500">الكمية</span><span class="font-bold">${calc.quantity.toLocaleString('ar-EG')}</span></div>
                ${priceRow}
                ${totalRow}
            </div>
        `;
    },

    confirmStampAdd() {
        const sub = this._currentStampSub;
        const product = this._currentProduct;
        if (!sub || !product) return;
        const selections = this.collectStampSelections();
        const calc = StampPricing.calculate(sub, selections);
        if (calc.error) {
            Swal.fire('تنبيه', calc.error, 'warning');
            return;
        }

        const parts = [
            `القسم الرئيسي: ${product.parentGroupName}`,
            `القسم الفرعي: ${product.subcategoryName}`
        ];
        if (calc.stampTypeLabel) parts.push(`نوع الختم: ${calc.stampTypeLabel}`);
        if (calc.sizeLabel) parts.push(`المقاس: ${calc.sizeLabel}`);
        if (calc.productTypeLabel) parts.push(`نوع المنتج: ${calc.productTypeLabel}`);
        if (calc.itemName) parts.push(`المنتج: ${calc.itemName}`);
        parts.push(`الكمية: ${calc.quantity}`);
        if (calc.pendingPricing) parts.push('السعر: حسب المقاس');
        else parts.push(`السعر: ${Number(calc.unitPrice).toFixed(2)} ج.م`);
        const orderProduct = {
            id: Date.now(),
            type: 'catalog',
            catalogProductId: product.parentGroupId,
            productName: calc.itemName || product.subcategoryName,
            catalogName: product.parentGroupName,
            quantity: calc.quantity,
            unitPrice: calc.unitPrice,
            sellingPrice: calc.total,
            price: calc.total,
            pricingMode: 'stamp_matrix',
            unitLabel: calc.unitLabel,
            catalogSpecsText: parts.join(' | '),
            catalogSpecs: {
                stampType: calc.stampTypeLabel ? { label: 'نوع الختم', display: calc.stampTypeLabel } : null,
                size: calc.sizeLabel ? { label: 'المقاس', display: calc.sizeLabel } : null,
                productType: calc.productTypeLabel ? { label: 'نوع المنتج', display: calc.productTypeLabel } : null
            },
            catalogSelections: { ...selections },
            catalogGroupId: product.parentGroupId,
            catalogGroupName: product.parentGroupName,
            catalogSubcategoryId: product.subcategoryId,
            catalogSubcategoryName: product.subcategoryName,
            designFileUrl: '',
            designFileName: '',
            hasDesignFile: false,
            pendingPricing: calc.pendingPricing || false
        };
        Object.keys(orderProduct.catalogSpecs).forEach(k => { if (!orderProduct.catalogSpecs[k]) delete orderProduct.catalogSpecs[k]; });

        OrderProducts.addProduct(orderProduct);
        closeModal('catalogProductConfigModal');
        Swal.fire({ icon: 'success', title: 'تمت الإضافة', text: calc.itemName || product.subcategoryName, timer: 1200, showConfirmButton: false });
    },

    renderConfigurator() {
        const product = this._currentProduct;
        if (product?.catalogType === 'stamp_config') return;
        const body = document.getElementById('catalogConfigBody');
        const title = document.getElementById('catalogConfigTitle');
        if (!body || !product) return;
        if (title) title.textContent = product.name;
        this._setConfigModalLuxury(product.catalogType === 'group_item');

        let fieldsHtml = (product.fields || []).map(f => {
            if (f.type === 'select' && f.display === 'scroll' && product.catalogType === 'group_item') {
                const selected = this._selections[f.id] || (f.options?.[0]?.value);
                return this._luxuryItemGridHtml(f, product, selected);
            }
            if (f.type === 'select' && f.display === 'scroll') {
                const selected = this._selections[f.id] || (f.options?.[0]?.value);
                const hidePrices = product.catalogType === 'group_item';
                return `<div class="form-group-catalog">
                    <label class="block text-sm font-bold text-gray-700 mb-2">${this._esc(f.label)} ${f.required ? '<span class="text-red-500">*</span>' : ''}</label>
                    <input type="hidden" id="catField_${f.id}" value="${this._esc(selected)}">
                    <div class="cat-scroll-list max-h-52 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-2 bg-gray-50/50" style="scrollbar-width:thin">
                        ${(f.options || []).map(o => {
                            const active = selected === o.value;
                            const priceHint = hidePrices ? '' : (o.pricePerThousand
                                ? `<span class="text-[10px] font-bold text-accent">${Number(o.pricePerThousand).toLocaleString('ar-EG')} ج.م / ألف</span>`
                                : (o.unitPrice != null ? `<span class="text-[10px] font-bold text-accent">${Number(o.unitPrice).toLocaleString('ar-EG')} ج.م / قطعة</span>` : ''));
                            const descBlock = (hidePrices || !o.description) ? '' : `<p class="text-xs text-gray-500 mt-1 leading-relaxed">${this._esc(o.description)}</p>`;
                            return `<button type="button" data-value="${this._esc(o.value)}" onclick="ProductCatalog.selectScrollOption('${f.id}','${this._esc(o.value)}')"
                                class="cat-scroll-opt w-full text-right p-3 rounded-xl border-2 transition ${active ? 'border-accent bg-accent/10 shadow-sm' : 'border-gray-200 bg-white hover:border-accent/40'}">
                                <div class="flex items-center justify-between gap-2">
                                    <span class="font-black text-base text-gray-800">${this._esc(o.label)}</span>
                                    ${priceHint}
                                </div>
                                ${descBlock}
                            </button>`;
                        }).join('')}
                    </div>
                </div>`;
            }
            if (f.type === 'select') {
                return `<div class="form-group-catalog">
                    <label class="block text-sm font-bold text-gray-700 mb-1">${this._esc(f.label)} ${f.required ? '<span class="text-red-500">*</span>' : ''}</label>
                    <select id="catField_${f.id}" onchange="ProductCatalog.onFieldChange()" class="w-full border border-gray-300 p-3 rounded-xl focus:border-accent outline-none text-sm">
                        ${(f.options || []).map(o => `<option value="${this._esc(o.value)}">${this._esc(o.label)}</option>`).join('')}
                    </select>
                </div>`;
            }
            if (f.type === 'number') {
                return `<div class="form-group-catalog">
                    <label class="block text-sm font-bold text-gray-700 mb-1">${this._esc(f.label)} ${f.required ? '<span class="text-red-500">*</span>' : ''}</label>
                    <input type="number" id="catField_${f.id}" min="${f.min || 1}" step="${f.step || 1}" value="${this._selections[f.id] || ''}"
                        oninput="ProductCatalog.onFieldChange()" class="w-full border border-gray-300 p-3 rounded-xl focus:border-accent outline-none text-sm" placeholder="أدخل ${this._esc(f.label)}">
                    ${product.minQty && f.id === 'quantity' ? `<p class="text-[10px] text-gray-400 mt-1">الحد الأدنى: ${product.minQty}</p>` : ''}
                </div>`;
            }
            return '';
        }).join('');

        const fixedHtml = (product.fixedSpecs || []).length ? `
            <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <p class="text-xs font-bold text-gray-500 mb-2"><i class="fas fa-list-check text-accent ml-1"></i> المواصفات الثابتة</p>
                <div class="space-y-1">
                    ${product.fixedSpecs.map(s => `<p class="text-sm text-gray-700"><span class="font-bold">${this._esc(s.label)}:</span> ${this._esc(s.value)}</p>`).join('')}
                </div>
            </div>` : '';

        body.innerHTML = `
            ${fixedHtml}
            <div class="space-y-4 mb-4">${fieldsHtml}</div>
            <div id="catalogPricePreview" class="bg-gradient-to-l from-accent/5 to-primary/5 border border-accent/20 rounded-2xl p-4"></div>
        `;
        this.updatePricePreview();
    },

    setDesignTab(tab) {
        const fileSec = document.getElementById('catDesignFileSection');
        const urlSec = document.getElementById('catDesignUrlSection');
        const fileBtn = document.getElementById('catDesignTabFile');
        const urlBtn = document.getElementById('catDesignTabUrl');
        if (tab === 'file') {
            fileSec?.classList.remove('hidden-section');
            urlSec?.classList.add('hidden-section');
            fileBtn?.classList.add('border-accent', 'bg-accent', 'text-white');
            fileBtn?.classList.remove('border-gray-200', 'text-gray-600');
            urlBtn?.classList.remove('border-accent', 'bg-accent', 'text-white');
            urlBtn?.classList.add('border-gray-200', 'text-gray-600');
        } else {
            fileSec?.classList.add('hidden-section');
            urlSec?.classList.remove('hidden-section');
            urlBtn?.classList.add('border-accent', 'bg-accent', 'text-white');
            urlBtn?.classList.remove('border-gray-200', 'text-gray-600');
            fileBtn?.classList.remove('border-accent', 'bg-accent', 'text-white');
            fileBtn?.classList.add('border-gray-200', 'text-gray-600');
        }
    },

    onDesignFileSelect(input) {
        const file = input.files?.[0];
        const preview = document.getElementById('catDesignFilePreview');
        if (!file) {
            this._designFile = { url: '', name: '', data: '' };
            if (preview) preview.innerHTML = '';
            return;
        }
        const ext = file.name.split('.').pop().toLowerCase();
        if (!this.ALLOWED_EXT.includes(ext)) {
            Swal.fire('خطأ', 'امتداد الملف غير مسموح. المسموح: PDF, PSD, AI, CDR, PNG, JPG', 'error');
            input.value = '';
            return;
        }
        if (file.size > 500 * 1024) {
            Swal.fire('تنبيه', 'الملف كبير وقد يبطّئ النظام. استخدم «رابط ملف» بدلاً من الرفع (الحد 500 كيلو).', 'warning');
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            this._designFile = { url: e.target.result, name: file.name, data: '' };
            if (preview) preview.innerHTML = `<i class="fas fa-check-circle ml-1"></i> ${this._esc(file.name)}`;
        };
        reader.readAsDataURL(file);
    },

    onDesignUrlInput() {
        const url = document.getElementById('catDesignUrlInput')?.value?.trim() || '';
        this._designFile = { url, name: url.split('/').pop() || 'ملف التصميم', data: '' };
    },

    collectSelections() {
        const product = this._currentProduct;
        if (!product) return {};
        const sel = {};
        (product.fields || []).forEach(f => {
            const el = document.getElementById('catField_' + f.id);
            if (el) sel[f.id] = f.type === 'number' ? (parseInt(el.value, 10) || 0) : el.value;
        });
        return sel;
    },

    selectScrollOption(fieldId, value) {
        const hidden = document.getElementById('catField_' + fieldId);
        if (hidden) hidden.value = value;
        this._selections[fieldId] = value;
        const group = hidden?.closest('.form-group-catalog');
        const list = group?.querySelector('.cat-scroll-list');
        if (list) {
            list.querySelectorAll('.cat-scroll-opt').forEach(btn => {
                const active = btn.getAttribute('data-value') === value;
                btn.className = 'cat-scroll-opt w-full text-right p-3 rounded-xl border-2 transition ' +
                    (active ? 'border-accent bg-accent/10 shadow-sm' : 'border-gray-200 bg-white hover:border-accent/40');
            });
        }
        const luxGrid = group?.querySelector('.cat-lux-grid');
        if (luxGrid) {
            luxGrid.querySelectorAll('.cat-lux-item').forEach(btn => {
                const active = btn.getAttribute('data-value') === value;
                const ic = btn.querySelector('i.fas');
                const iconName = btn.getAttribute('data-icon') || 'fa-box';
                if (ic) ic.className = `fas ${iconName} text-3xl ${active ? 'text-accent' : 'text-primary/70'}`;
                btn.className = 'cat-lux-item cat-scroll-opt flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 ' +
                    (active
                        ? 'border-accent/80 bg-gradient-to-br from-accent/12 to-primary/8 shadow-lg shadow-accent/15 ring-2 ring-accent/30'
                        : 'border-gray-200/80 bg-white hover:border-accent/40 hover:shadow-md hover:bg-gradient-to-br hover:from-gray-50 hover:to-white');
            });
        }
        this.onFieldChange();
    },

    onFieldChange() {
        this._selections = this.collectSelections();
        this.updatePricePreview();
    },

    updatePricePreview() {
        const product = this._currentProduct;
        if (product?.catalogType === 'stamp_config') {
            this.updateStampPreview();
            return;
        }
        const preview = document.getElementById('catalogPricePreview');
        if (!preview || !product) return;
        this._selections = this.collectSelections();
        const calc = CatalogPricing.calculate(product, this._selections);
        const specs = CatalogPricing.buildSpecsSummary(product, this._selections);

        if (calc.error) {
            preview.innerHTML = `<div class="text-red-500 text-sm font-bold text-center"><i class="fas fa-exclamation-circle ml-1"></i> ${this._esc(calc.error)}</div>`;
            return;
        }

        let unitDisplay;
        if (product.pricingMode === 'option_qty_tiers') {
            unitDisplay = `${calc.unitPrice.toLocaleString('ar-EG')} ج.م / ظرف` +
                (calc.tierLabel ? ` <span class="text-[10px] text-gray-400">(شريحة ${calc.tierLabel})</span>` : '');
        } else if (product.pricingMode === 'option_floor_tiers') {
            const unitSuffix = product.unitSuffix || 'نسخة';
            unitDisplay = `${calc.unitPrice.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ج.م / ${unitSuffix}`;
        } else if (product.pricingMode === 'option_flat_unit') {
            const unitSuffix = product.unitSuffix || 'قطعة';
            unitDisplay = `${calc.unitPrice.toLocaleString('ar-EG')} ج.م / ${unitSuffix}`;
        } else if (product.pricingMode === 'option_thousand' || product.pricingMode === 'per_thousand') {
            unitDisplay = `${calc.pricePerThousand.toLocaleString('ar-EG')} ج.م / ألف`;
        } else {
            unitDisplay = `${calc.unitPrice.toLocaleString('ar-EG')} ج.م / وحدة`;
        }

        const tierRow = product.pricingMode === 'option_floor_tiers' && calc.tierLabel
            ? `<div class="flex justify-between"><span class="text-gray-500">الشريحة المستخدمة</span><span class="font-bold">${this._esc(calc.tierLabel)}</span></div>`
            : '';

        const productTitle = calc.itemName || product.name;
        const groupRows = product.catalogType === 'group_item' ? `
                <div class="flex justify-between"><span class="text-gray-500 text-xs">القسم الرئيسي</span><span class="text-xs font-semibold">${this._esc(product.parentGroupName)}</span></div>
                <div class="flex justify-between"><span class="text-gray-500 text-xs">القسم الفرعي</span><span class="text-xs font-semibold">${this._esc(product.subcategoryName)}</span></div>` : '';

        preview.innerHTML = `
            <h4 class="font-bold text-gray-800 mb-3 flex items-center gap-2"><i class="fas fa-receipt text-accent"></i> ملخص السعر</h4>
            <div class="space-y-2 text-sm">
                ${groupRows}
                <div class="flex justify-between"><span class="text-gray-500">المنتج</span><span class="font-bold">${this._esc(productTitle)}</span></div>
                ${product.catalogType !== 'group_item' ? specs.map(s => `<div class="flex justify-between"><span class="text-gray-500 text-xs">${this._esc(s.split(':')[0])}</span><span class="text-xs font-semibold">${this._esc(s.split(':').slice(1).join(':').trim())}</span></div>`).join('') : ''}
                <div class="flex justify-between"><span class="text-gray-500">الكمية</span><span class="font-bold">${calc.quantity.toLocaleString('ar-EG')}</span></div>
                ${tierRow}
                <div class="flex justify-between"><span class="text-gray-500">${calc.unitLabel}</span><span class="font-bold text-accent">${unitDisplay}</span></div>
                <div class="flex justify-between pt-2 border-t border-accent/20"><span class="font-bold text-gray-800">الإجمالي</span><span class="font-black text-xl text-accent">${calc.total.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ج.م</span></div>
            </div>
        `;
    },

    confirmAdd() {
        const product = this._currentProduct;
        if (!product) return;
        if (product.catalogType === 'stamp_config') {
            this.confirmStampAdd();
            return;
        }
        const selections = this.collectSelections();
        const calc = CatalogPricing.calculate(product, selections);
        if (calc.error) {
            Swal.fire('تنبيه', calc.error, 'warning');
            return;
        }

        const specs = CatalogPricing.buildSpecsSummary(product, selections);
        const specsObj = {};
        (product.fields || []).forEach(f => {
            if (f.id !== 'quantity' && selections[f.id] != null) {
                specsObj[f.id] = {
                    label: f.label,
                    value: selections[f.id],
                    display: CatalogPricing.getOptionDetail(product, f.id, selections[f.id]) || CatalogPricing.getFieldLabel(product, f.id, selections[f.id])
                };
            }
        });

        const itemName = calc.itemName || product.name;
        let catalogSpecsText = specs.join(' | ');
        if (product.catalogType === 'group_item') {
            catalogSpecsText = [
                `القسم الرئيسي: ${product.parentGroupName}`,
                `القسم الفرعي: ${product.subcategoryName}`,
                `المنتج: ${itemName}`,
                `الكمية: ${calc.quantity}`,
                `${calc.unitLabel}: ${Number(calc.unitPrice).toFixed(2)} ج.م`
            ].join(' | ');
        }

        const orderProduct = {
            id: Date.now(),
            type: 'catalog',
            catalogProductId: product.parentGroupId || product.id,
            productName: itemName,
            catalogName: product.parentGroupName || product.name,
            quantity: calc.quantity,
            unitPrice: calc.unitPrice,
            pricePerThousand: calc.pricePerThousand || 0,
            sellingPrice: calc.total,
            price: calc.total,
            pricingMode: product.pricingMode,
            unitLabel: calc.unitLabel,
            catalogSpecs: specsObj,
            catalogSpecsText,
            fixedSpecs: product.fixedSpecs || [],
            catalogSelections: { ...selections },
            designFileUrl: '',
            designFileName: '',
            hasDesignFile: false
        };

        if (product.catalogType === 'group_item') {
            orderProduct.catalogGroupId = product.parentGroupId;
            orderProduct.catalogGroupName = product.parentGroupName;
            orderProduct.catalogSubcategoryId = product.subcategoryId;
            orderProduct.catalogSubcategoryName = product.subcategoryName;
            orderProduct.catalogItemId = calc.itemId || selections.item;
        }

        OrderProducts.addProduct(orderProduct);
        closeModal('catalogProductConfigModal');
        Swal.fire({ icon: 'success', title: 'تمت الإضافة', text: product.name, timer: 1200, showConfirmButton: false });
    },

    // --- Admin ---
    renderAdmin() {
        const container = document.getElementById('catalogAdminContent');
        if (!container) return;
        const products = CatalogSvc.getAll();
        container.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <p class="text-sm text-gray-500">إدارة منتجات الكتالوج والأسعار والمواصفات</p>
                <button onclick="ProductCatalog.adminAddProduct()" class="bg-accent text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-accent/80 transition">
                    <i class="fas fa-plus ml-1"></i> إضافة منتج
                </button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${products.map(p => `
                    <div class="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition">
                        <div class="flex items-start justify-between mb-3">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                    <i class="fas ${p.icon || 'fa-box'} text-accent"></i>
                                </div>
                                <div>
                                    <h4 class="font-bold text-gray-800">${this._esc(p.name)}</h4>
                                    <p class="text-[10px] text-gray-400">${p.catalogType === 'group' ? 'قسم رئيسي — ' + ((p.subcategories || []).length) + ' أقسام فرعية' : p.pricingMode === 'tier_unit' ? 'تسعير بالشرائح' : p.pricingMode === 'option_thousand' ? 'تسعير بالألف (حسب الخيار)' : p.pricingMode === 'option_qty_tiers' ? 'شرائح حسب النوع والكمية' : p.pricingMode === 'option_floor_tiers' ? 'أقرب شريحة أقل (حسب المقاس)' : p.pricingMode === 'option_flat_unit' ? 'سعر ثابت للقطعة' : 'تسعير بالألف'}</p>
                                </div>
                            </div>
                            <span class="text-[10px] px-2 py-1 rounded-full ${p.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}">${p.active !== false ? 'نشط' : 'معطل'}</span>
                        </div>
                        <p class="text-xs text-gray-500 mb-3">${p.catalogType === 'group' ? `أقسام فرعية: ${(p.subcategories || []).length}` : `حد أدنى: ${p.minQty || 1} | حقول: ${(p.fields || []).length} | شرائح: ${(p.priceTiers || []).length}`}</p>
                        <div class="flex gap-2 flex-wrap">
                            <button onclick="ProductCatalog.adminEditProduct('${p.id}')" class="flex-1 bg-accent/10 text-accent py-2 rounded-lg text-xs font-bold hover:bg-accent/20 transition"><i class="fas fa-pen ml-1"></i> تعديل</button>
                            ${p.catalogType === 'group' ? `<button onclick="ProductCatalog.adminEditSubcategories('${p.id}')" class="flex-1 bg-primary/10 text-primary py-2 rounded-lg text-xs font-bold hover:bg-primary/20 transition"><i class="fas fa-sitemap ml-1"></i> الأقسام</button>` : ''}
                            <button onclick="ProductCatalog.adminDeleteProduct('${p.id}')" class="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    async adminDeleteProduct(id) {
        const def = CatalogSvc.DEFAULTS.find(d => d.id === id);
        if (def) { Swal.fire('تنبيه', 'لا يمكن حذف المنتجات الافتراضية. يمكنك تعطيلها من التعديل.', 'info'); return; }
        const r = await Swal.fire({ title: 'حذف المنتج؟', icon: 'warning', showCancelButton: true, confirmButtonText: 'حذف', cancelButtonText: 'إلغاء' });
        if (!r.isConfirmed) return;
        await CatalogSvc.remove(id);
        this.renderAdmin();
        Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1000, showConfirmButton: false });
    },

    adminAddProduct() { this._adminEditForm(null); },

    adminEditProduct(id) {
        const p = CatalogSvc.getById(id);
        if (p) this._adminEditForm(p);
    },

    adminEditSubcategories(id) {
        const group = CatalogSvc.getById(id);
        if (!group || group.catalogType !== 'group') return;
        Swal.fire({
            title: 'إدارة الأقسام الفرعية: ' + group.name,
            html: `
                <p class="text-xs text-gray-500 mb-2 text-right">عدّل الأقسام الفرعية والمنتجات (JSON). كل قسم فرعي يحتوي items بصيغة { id, name, unitPrice }</p>
                <textarea id="admCatSubcats" rows="18" class="swal2-textarea w-full text-xs" dir="ltr">${this._esc(JSON.stringify(group.subcategories || [], null, 2))}</textarea>
            `,
            width: 700,
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                try {
                    const subcategories = JSON.parse(document.getElementById('admCatSubcats').value);
                    if (!Array.isArray(subcategories)) throw new Error('يجب أن تكون مصفوفة');
                    return subcategories;
                } catch (e) {
                    Swal.showValidationMessage('خطأ في JSON: ' + e.message);
                    return false;
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                await CatalogSvc.save({ ...group, subcategories: result.value });
                this.renderAdmin();
                Swal.fire({ icon: 'success', title: 'تم حفظ الأقسام الفرعية', timer: 1200, showConfirmButton: false });
            }
        });
    },

    _adminEditForm(product) {
        const isNew = !product;
        const p = product ? JSON.parse(JSON.stringify(product)) : {
            id: '', name: '', icon: 'fa-box', catalogType: 'product', active: true, sortOrder: 99,
            pricingMode: 'tier_unit', minQty: 1, minQtyMessage: '', unitLabel: 'سعر الوحدة',
            fixedSpecs: [], fields: [], priceTiers: [{ min: 1, max: null, unitPrice: 0 }], subcategories: []
        };

        Swal.fire({
            title: isNew ? 'إضافة منتج للكتالوج' : 'تعديل: ' + p.name,
            html: `
                <div class="text-right space-y-3 text-sm" style="max-height:60vh;overflow-y:auto">
                    <div><label class="font-bold text-gray-600 text-xs">اسم المنتج</label>
                    <input id="admCatName" class="swal2-input w-full" value="${this._esc(p.name)}"></div>
                    <div><label class="font-bold text-gray-600 text-xs">أيقونة FontAwesome (مثال: fa-book)</label>
                    <input id="admCatIcon" class="swal2-input w-full" value="${this._esc(p.icon || 'fa-box')}" dir="ltr"></div>
                    <div><label class="font-bold text-gray-600 text-xs">نوع القسم</label>
                    <select id="admCatType" class="swal2-input w-full">
                        <option value="product" ${p.catalogType !== 'group' ? 'selected' : ''}>منتج عادي</option>
                        <option value="group" ${p.catalogType === 'group' ? 'selected' : ''}>قسم رئيسي (أقسام فرعية)</option>
                    </select></div>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="font-bold text-gray-600 text-xs">الحد الأدنى للكمية</label>
                        <input id="admCatMinQty" type="number" class="swal2-input w-full" value="${p.minQty || 1}"></div>
                        <div><label class="font-bold text-gray-600 text-xs">ترتيب العرض</label>
                        <input id="admCatSort" type="number" class="swal2-input w-full" value="${p.sortOrder || 99}"></div>
                    </div>
                    <div><label class="font-bold text-gray-600 text-xs">رسالة الحد الأدنى</label>
                    <input id="admCatMinMsg" class="swal2-input w-full" value="${this._esc(p.minQtyMessage || '')}"></div>
                    <div><label class="font-bold text-gray-600 text-xs">نظام التسعير</label>
                    <select id="admCatPricingMode" class="swal2-input w-full">
                        <option value="tier_unit" ${p.pricingMode === 'tier_unit' ? 'selected' : ''}>شرائح — سعر الوحدة</option>
                        <option value="option_thousand" ${p.pricingMode === 'option_thousand' ? 'selected' : ''}>بالألف — حسب خيار (مثل الليترهيد)</option>
                        <option value="per_thousand" ${p.pricingMode === 'per_thousand' ? 'selected' : ''}>بالألف — سعر ثابت</option>
                        <option value="option_qty_tiers" ${p.pricingMode === 'option_qty_tiers' ? 'selected' : ''}>باقة — سعر حسب النوع والكمية (مثل الأظرف)</option>
                        <option value="option_floor_tiers" ${p.pricingMode === 'option_floor_tiers' ? 'selected' : ''}>أقرب شريحة أقل — حسب المقاس (مثل الفلايرات)</option>
                        <option value="option_flat_unit" ${p.pricingMode === 'option_flat_unit' ? 'selected' : ''}>سعر ثابت للقطعة (حسب الخيار)</option>
                    </select></div>
                    <div id="admCatSubcatsWrap" style="${p.catalogType === 'group' ? '' : 'display:none'}"><label class="font-bold text-gray-600 text-xs">الأقسام الفرعية والمنتجات (JSON)</label>
                    <textarea id="admCatSubcatsForm" rows="6" class="swal2-textarea w-full text-xs" dir="ltr">${this._esc(JSON.stringify(p.subcategories || [], null, 2))}</textarea></div>
                    <div id="admCatProductFieldsWrap" style="${p.catalogType === 'group' ? 'display:none' : ''}"><label class="font-bold text-gray-600 text-xs">الحقول والمواصفات (JSON)</label>
                    <textarea id="admCatFields" rows="4" class="swal2-textarea w-full text-xs" dir="ltr">${this._esc(JSON.stringify(p.fields || [], null, 2))}</textarea>
                    <div><label class="font-bold text-gray-600 text-xs">مواصفات ثابتة (JSON)</label>
                    <textarea id="admCatFixed" rows="2" class="swal2-textarea w-full text-xs" dir="ltr">${this._esc(JSON.stringify(p.fixedSpecs || [], null, 2))}</textarea></div>
                    <div><label class="font-bold text-gray-600 text-xs">شرائح الأسعار (JSON) — للنوت بوك مثلاً</label>
                    <textarea id="admCatTiers" rows="3" class="swal2-textarea w-full text-xs" dir="ltr">${this._esc(JSON.stringify(p.priceTiers || [], null, 2))}</textarea></div></div>
                    <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" id="admCatActive" ${p.active !== false ? 'checked' : ''}> <span class="font-bold text-gray-600 text-xs">نشط</span></label>
                </div>
            `,
            width: 600,
            showCancelButton: true,
            confirmButtonText: 'حفظ',
            cancelButtonText: 'إلغاء',
            didOpen: () => {
                const typeSel = document.getElementById('admCatType');
                const toggle = () => {
                    const isGroup = typeSel.value === 'group';
                    document.getElementById('admCatSubcatsWrap').style.display = isGroup ? '' : 'none';
                    document.getElementById('admCatProductFieldsWrap').style.display = isGroup ? 'none' : '';
                };
                typeSel?.addEventListener('change', toggle);
            },
            preConfirm: () => {
                try {
                    const catalogType = document.getElementById('admCatType').value;
                    const isGroup = catalogType === 'group';
                    const name = document.getElementById('admCatName').value.trim();
                    if (!name) throw new Error('اسم المنتج مطلوب');
                    const base = {
                        ...p,
                        id: p.id || ('cat_' + Date.now()),
                        name,
                        catalogType: isGroup ? 'group' : undefined,
                        icon: document.getElementById('admCatIcon').value.trim() || 'fa-box',
                        sortOrder: parseInt(document.getElementById('admCatSort').value, 10) || 99,
                        active: document.getElementById('admCatActive').checked
                    };
                    if (isGroup) {
                        const subcategories = JSON.parse(document.getElementById('admCatSubcatsForm').value);
                        if (!Array.isArray(subcategories)) throw new Error('الأقسام الفرعية يجب أن تكون مصفوفة');
                        const out = { ...base, catalogType: 'group', subcategories, fields: [], fixedSpecs: [], priceTiers: [] };
                        delete out.pricingMode;
                        delete out.minQty;
                        return out;
                    }
                    const fields = JSON.parse(document.getElementById('admCatFields').value);
                    const fixedSpecs = JSON.parse(document.getElementById('admCatFixed').value);
                    const priceTiers = JSON.parse(document.getElementById('admCatTiers').value);
                    const out = {
                        ...base,
                        minQty: parseInt(document.getElementById('admCatMinQty').value, 10) || 1,
                        minQtyMessage: document.getElementById('admCatMinMsg').value.trim(),
                        pricingMode: document.getElementById('admCatPricingMode').value,
                        fields, fixedSpecs, priceTiers
                    };
                    delete out.catalogType;
                    delete out.subcategories;
                    return out;
                } catch (e) {
                    Swal.showValidationMessage('خطأ في البيانات: ' + e.message);
                    return false;
                }
            }
        }).then(async (result) => {
            if (result.isConfirmed && result.value) {
                await CatalogSvc.save(result.value);
                this.renderAdmin();
                Swal.fire({ icon: 'success', title: 'تم الحفظ', timer: 1000, showConfirmButton: false });
            }
        });
    },

    _esc(str) {
        if (str == null) return '';
        const d = document.createElement('div');
        d.textContent = String(str);
        return d.innerHTML;
    }
};

/** Open design file from product or order item */
function openProductDesignFile(product) {
    if (!product) return;
    const url = product.designFileUrl || product.designFileData || '';
    if (!url) {
        Swal.fire('تنبيه', 'لا يوجد ملف تصميم مرفق', 'info');
        return;
    }
    if (url.startsWith('data:')) {
        const a = document.createElement('a');
        a.href = url;
        a.download = product.designFileName || 'design-file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        window.open(url, '_blank');
    }
}
window.openProductDesignFile = openProductDesignFile;
window.ProductCatalog = ProductCatalog;
