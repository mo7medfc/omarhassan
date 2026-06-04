// ==========================================
// Suppliers Module - الموردين
// ==========================================
const SuppliersModule = {
    _cache: [],
    _loaded: false,
    _currentSupplier: null,

    // ---------- Firestore ----------
    _col() { return Branch.getCollection('suppliers'); },

    async load() {
        if (this._loaded) return this._cache;
        try {
            const snap = await this._col().get();
            this._cache = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
            this._loaded = true;
        } catch (e) {
            console.error('Suppliers load error:', e);
            this._cache = [];
        }
        return this._cache;
    },

    async addSupplier(supplier) {
        const doc = this._col().doc(supplier.id.toString());
        await doc.set(supplier);
        if (Branch.isDefault()) db.collection('suppliers').doc(supplier.id.toString()).set(supplier).catch(() => {});
        this._cache.push(supplier);
    },

    async updateSupplier(id, data) {
        await this._col().doc(id.toString()).update(data);
        if (Branch.isDefault()) db.collection('suppliers').doc(id.toString()).update(data).catch(() => {});
        const idx = this._cache.findIndex(s => s.id == id);
        if (idx !== -1) Object.assign(this._cache[idx], data);
    },

    async deleteSupplier(id) {
        await this._col().doc(id.toString()).delete();
        if (Branch.isDefault()) db.collection('suppliers').doc(id.toString()).delete().catch(() => {});
        this._cache = this._cache.filter(s => s.id != id);
    },

    // ---------- Helpers ----------
    _getSupplier(id) { return this._cache.find(s => s.id == id); },

    _totalOwed(supplier) {
        const items = supplier.items || [];
        return items.reduce((s, i) => s + ((i.price || 0) * (i.qty || 1)), 0);
    },

    _totalPaid(supplier) {
        const payments = supplier.payments || [];
        return payments.reduce((s, p) => s + (p.amount || 0), 0);
    },

    _balance(supplier) {
        return this._totalOwed(supplier) - this._totalPaid(supplier);
    },

    _walletTotals() {
        const totals = {};
        this._cache.forEach(s => {
            (s.payments || []).forEach(p => {
                const w = p.wallet || 'cash';
                totals[w] = (totals[w] || 0) + (p.amount || 0);
            });
        });
        return totals;
    },

    _totalAllOwed() {
        return this._cache.reduce((s, sup) => s + this._balance(sup), 0);
    },

    _totalAllPaid() {
        return this._cache.reduce((s, sup) => s + this._totalPaid(sup), 0);
    },

    // ---------- Render ----------
    async render() {
        await this.load();
        const c = document.getElementById('suppliersContent');
        if (!c) return;

        const totalOwed = this._cache.reduce((s, sup) => s + this._totalOwed(sup), 0);
        const totalPaid = this._totalAllPaid();
        const totalRemaining = totalOwed - totalPaid;

        // Wallet breakdown
        const walletNames = { cash: 'نقدي', instapay: 'إنستاباي', wallet: 'محفظة' };
        const walletIcons = { cash: 'fa-money-bill-wave', instapay: 'fa-bolt', wallet: 'fa-wallet' };
        const walletColors = { cash: 'emerald', instapay: 'blue', wallet: 'purple' };
        const wTotals = this._walletTotals();
        // Add custom wallets
        try {
            if (typeof WalletMgr !== 'undefined') {
                WalletMgr.getCustomWallets().forEach(w => {
                    if (!walletNames[w.id]) {
                        walletNames[w.id] = w.name;
                        walletIcons[w.id] = 'fa-building-columns';
                        walletColors[w.id] = 'indigo';
                    }
                });
            }
        } catch(e) {}

        c.innerHTML = `
            <!-- Wallet Summary Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg shadow-red-200">
                    <div class="flex items-center gap-2 mb-2 opacity-80">
                        <i class="fas fa-file-invoice-dollar text-lg"></i>
                        <span class="text-sm font-bold">إجمالي المستحق</span>
                    </div>
                    <p class="text-3xl font-black">${formatCurrency(totalOwed)}</p>
                    <p class="text-xs opacity-70 mt-1">${this._cache.length} مورد</p>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-green-200">
                    <div class="flex items-center gap-2 mb-2 opacity-80">
                        <i class="fas fa-hand-holding-dollar text-lg"></i>
                        <span class="text-sm font-bold">إجمالي المدفوع</span>
                    </div>
                    <p class="text-3xl font-black">${formatCurrency(totalPaid)}</p>
                </div>
                <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-200">
                    <div class="flex items-center gap-2 mb-2 opacity-80">
                        <i class="fas fa-scale-unbalanced text-lg"></i>
                        <span class="text-sm font-bold">المتبقي عليك</span>
                    </div>
                    <p class="text-3xl font-black">${formatCurrency(totalRemaining)}</p>
                </div>
                <div class="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-violet-200">
                    <div class="flex items-center gap-2 mb-2 opacity-80">
                        <i class="fas fa-layer-group text-lg"></i>
                        <span class="text-sm font-bold">المحافظ</span>
                    </div>
                    <div class="space-y-1 mt-1">
                        ${Object.keys(wTotals).length > 0 ? Object.entries(wTotals).map(([k,v]) => `
                            <div class="flex justify-between text-sm">
                                <span class="opacity-80"><i class="fas ${walletIcons[k] || 'fa-circle'} text-xs ml-1"></i>${walletNames[k] || k}</span>
                                <span class="font-bold">${formatCurrency(v)}</span>
                            </div>
                        `).join('') : '<p class="text-sm opacity-60">لا توجد دفعات بعد</p>'}
                    </div>
                </div>
            </div>

            <!-- Supplier List -->
            <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div class="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 class="font-bold text-gray-900 text-lg flex items-center gap-2">
                        <i class="fas fa-truck-field text-accent"></i> الموردين
                        <span class="text-sm text-gray-400 font-normal">(${this._cache.length})</span>
                    </h3>
                    <button onclick="SuppliersModule.showAddSupplier()" class="bg-gradient-to-l from-accent to-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg transition flex items-center gap-2">
                        <i class="fas fa-plus"></i> إضافة مورد
                    </button>
                </div>
                <div class="divide-y divide-gray-50">
                    ${this._cache.length === 0 ? `
                        <div class="text-center py-16 text-gray-400">
                            <i class="fas fa-truck-field text-5xl mb-4 block opacity-30"></i>
                            <p class="text-lg font-bold mb-1">لا يوجد موردين</p>
                            <p class="text-sm">اضغط على "إضافة مورد" لبدء التسجيل</p>
                        </div>
                    ` : this._cache.map(s => {
                        const owed = this._totalOwed(s);
                        const paid = this._totalPaid(s);
                        const bal = owed - paid;
                        const pct = owed > 0 ? Math.round((paid / owed) * 100) : 100;
                        return `
                        <div class="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition" onclick="SuppliersModule.showDetail('${s.id}')">
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center shrink-0">
                                <i class="fas fa-store text-accent text-lg"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 mb-1">
                                    <h4 class="font-bold text-gray-900 truncate">${s.name}</h4>
                                    ${s.phone ? `<span class="text-xs text-gray-400"><i class="fas fa-phone text-[10px] ml-0.5"></i>${s.phone}</span>` : ''}
                                </div>
                                <div class="flex items-center gap-3 text-xs">
                                    <span class="text-gray-500"><i class="fas fa-boxes-stacked text-accent/50 ml-0.5"></i> ${(s.items||[]).length} صنف</span>
                                    <span class="text-gray-500"><i class="fas fa-receipt text-green-400 ml-0.5"></i> ${(s.payments||[]).length} دفعة</span>
                                </div>
                                <div class="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                                    <div class="bg-gradient-to-l from-green-400 to-emerald-500 h-1.5 rounded-full transition-all" style="width:${pct}%"></div>
                                </div>
                            </div>
                            <div class="text-left shrink-0">
                                <p class="text-xs text-gray-400">المتبقي</p>
                                <p class="font-black ${bal > 0 ? 'text-red-500' : 'text-green-500'} text-lg">${formatCurrency(bal)}</p>
                                <p class="text-[10px] text-gray-400">من ${formatCurrency(owed)}</p>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    },

    // ---------- Add Supplier ----------
    async showAddSupplier() {
        const { value: formData } = await Swal.fire({
            title: '<i class="fas fa-truck-field text-accent"></i> إضافة مورد جديد',
            html: `<div style="text-align:right;direction:rtl">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">اسم المورد *</label>
                <input type="text" id="swalSupName" placeholder="مثال: مطبعة النور" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">رقم الهاتف</label>
                <input type="text" id="swalSupPhone" placeholder="01xxxxxxxxx" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">ملاحظات</label>
                <textarea id="swalSupNotes" rows="2" placeholder="أي ملاحظات..." style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:none"></textarea>
            </div>`,
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: '<i class="fas fa-plus ml-1"></i> إضافة',
            confirmButtonColor: '#45A5C4',
            preConfirm: () => {
                const name = document.getElementById('swalSupName').value.trim();
                if (!name) { Swal.showValidationMessage('أدخل اسم المورد'); return false; }
                return {
                    name,
                    phone: document.getElementById('swalSupPhone').value.trim(),
                    notes: document.getElementById('swalSupNotes').value.trim()
                };
            }
        });
        if (!formData) return;
        try {
            const supplier = {
                id: Date.now(),
                name: formData.name,
                phone: formData.phone,
                notes: formData.notes,
                items: [],
                payments: [],
                createdAt: new Date().toISOString()
            };
            await this.addSupplier(supplier);
            Swal.fire({ icon: 'success', title: 'تمت الإضافة', timer: 1200, showConfirmButton: false });
            this.render();
        } catch (e) {
            Swal.fire('خطأ', 'فشل إضافة المورد: ' + e.message, 'error');
        }
    },

    // ---------- Detail View ----------
    async showDetail(id) {
        const s = this._getSupplier(id);
        if (!s) return;
        this._currentSupplier = s;

        const owed = this._totalOwed(s);
        const paid = this._totalPaid(s);
        const bal = owed - paid;
        const pct = owed > 0 ? Math.round((paid / owed) * 100) : 100;

        const walletNames = { cash: 'نقدي', instapay: 'إنستاباي', wallet: 'محفظة' };
        try {
            if (typeof WalletMgr !== 'undefined') {
                WalletMgr.getCustomWallets().forEach(w => { if (!walletNames[w.id]) walletNames[w.id] = w.name; });
            }
        } catch(e) {}

        const c = document.getElementById('suppliersContent');
        c.innerHTML = `
            <!-- Back Button + Header -->
            <div class="flex items-center gap-3 mb-6">
                <button onclick="SuppliersModule.render()" class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition">
                    <i class="fas fa-arrow-right text-gray-600"></i>
                </button>
                <div class="flex-1">
                    <h2 class="text-xl font-black text-gray-900">${s.name}</h2>
                    <p class="text-sm text-gray-400">${s.phone || 'بدون رقم'} ${s.notes ? '• ' + s.notes : ''}</p>
                </div>
                <button onclick="SuppliersModule.editSupplierInfo('${s.id}')" class="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-sm text-gray-600" title="تعديل البيانات">
                    <i class="fas fa-pen"></i>
                </button>
                <button onclick="SuppliersModule.confirmDeleteSupplier('${s.id}')" class="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 transition text-sm text-red-500" title="حذف المورد">
                    <i class="fas fa-trash"></i>
                </button>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-3 gap-4 mb-6">
                <div class="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
                    <p class="text-sm opacity-80 mb-1"><i class="fas fa-file-invoice-dollar ml-1"></i> إجمالي المستحق</p>
                    <p class="text-2xl font-black">${formatCurrency(owed)}</p>
                </div>
                <div class="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg">
                    <p class="text-sm opacity-80 mb-1"><i class="fas fa-check-circle ml-1"></i> المدفوع</p>
                    <p class="text-2xl font-black">${formatCurrency(paid)}</p>
                </div>
                <div class="bg-gradient-to-br ${bal > 0 ? 'from-red-500 to-rose-600' : 'from-green-400 to-emerald-500'} rounded-2xl p-5 text-white shadow-lg">
                    <p class="text-sm opacity-80 mb-1"><i class="fas fa-scale-unbalanced ml-1"></i> المتبقي</p>
                    <p class="text-2xl font-black">${formatCurrency(bal)}</p>
                </div>
            </div>

            <!-- Progress -->
            <div class="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
                <div class="flex justify-between text-sm mb-2">
                    <span class="text-gray-500">نسبة السداد</span>
                    <span class="font-bold text-accent">${pct}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="bg-gradient-to-l from-green-400 to-emerald-500 h-3 rounded-full transition-all" style="width:${pct}%"></div>
                </div>
            </div>

            <!-- Items Section -->
            <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
                <div class="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2">
                        <i class="fas fa-boxes-stacked text-amber-500"></i> الأصناف
                        <span class="text-sm text-gray-400 font-normal">(${(s.items||[]).length})</span>
                    </h3>
                    <button onclick="SuppliersModule.addItem('${s.id}')" class="bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-600 transition">
                        <i class="fas fa-plus ml-1"></i> إضافة صنف
                    </button>
                </div>
                <div class="divide-y divide-gray-50">
                    ${(s.items||[]).length === 0 ? `
                        <div class="text-center py-8 text-gray-400">
                            <i class="fas fa-box-open text-3xl mb-2 block opacity-30"></i>
                            <p class="text-sm">لا توجد أصناف</p>
                        </div>
                    ` : (s.items||[]).map((item, idx) => `
                        <div class="flex items-center gap-3 p-4 hover:bg-gray-50 transition group">
                            <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                <i class="fas fa-box text-amber-500"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-bold text-gray-800 text-sm">${item.name}</h4>
                                <div class="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                    <span>الكمية: <strong class="text-gray-600">${item.qty || 1}</strong></span>
                                    <span>سعر الوحدة: <strong class="text-gray-600">${formatCurrency(item.price || 0)}</strong></span>
                                    ${item.date ? `<span><i class="fas fa-calendar text-[10px] ml-0.5"></i> ${new Date(item.date).toLocaleDateString('ar-EG')}</span>` : ''}
                                </div>
                                ${item.notes ? `<p class="text-xs text-gray-400 mt-1">${item.notes}</p>` : ''}
                            </div>
                            <div class="text-left shrink-0">
                                <p class="font-black text-accent">${formatCurrency((item.price || 0) * (item.qty || 1))}</p>
                            </div>
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                <button onclick="SuppliersModule.editItem('${s.id}', ${idx})" class="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition">
                                    <i class="fas fa-pen text-blue-500 text-xs"></i>
                                </button>
                                <button onclick="SuppliersModule.deleteItem('${s.id}', ${idx})" class="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition">
                                    <i class="fas fa-trash text-red-500 text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${(s.items||[]).length > 0 ? `
                <div class="bg-amber-50 p-4 flex justify-between items-center border-t border-amber-100">
                    <span class="font-bold text-amber-700"><i class="fas fa-sigma ml-1"></i> إجمالي الأصناف</span>
                    <span class="font-black text-amber-700 text-lg">${formatCurrency(owed)}</span>
                </div>` : ''}
            </div>

            <!-- Payments Section -->
            <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div class="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2">
                        <i class="fas fa-receipt text-green-500"></i> الدفعات
                        <span class="text-sm text-gray-400 font-normal">(${(s.payments||[]).length})</span>
                    </h3>
                    <button onclick="SuppliersModule.addPayment('${s.id}')" class="bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-600 transition ${bal <= 0 ? 'opacity-50 cursor-not-allowed' : ''}">
                        <i class="fas fa-plus ml-1"></i> إضافة دفعة
                    </button>
                </div>
                <div class="divide-y divide-gray-50">
                    ${(s.payments||[]).length === 0 ? `
                        <div class="text-center py-8 text-gray-400">
                            <i class="fas fa-receipt text-3xl mb-2 block opacity-30"></i>
                            <p class="text-sm">لا توجد دفعات</p>
                        </div>
                    ` : (s.payments||[]).map((pay, idx) => `
                        <div class="flex items-center gap-3 p-4 hover:bg-gray-50 transition group">
                            <div class="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                                <i class="fas fa-hand-holding-dollar text-green-500"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center gap-2 text-sm">
                                    <span class="font-bold text-green-600">${formatCurrency(pay.amount)}</span>
                                    <span class="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500"><i class="fas fa-${pay.wallet === 'instapay' ? 'bolt' : pay.wallet === 'wallet' ? 'wallet' : pay.wallet === 'cash' ? 'money-bill-wave' : 'building-columns'} text-[10px] ml-0.5"></i> ${walletNames[pay.wallet] || pay.wallet}</span>
                                </div>
                                <div class="flex items-center gap-3 text-xs text-gray-400 mt-1">
                                    ${pay.date ? `<span><i class="fas fa-calendar text-[10px] ml-0.5"></i> ${new Date(pay.date).toLocaleDateString('ar-EG')}</span>` : ''}
                                    ${pay.notes ? `<span>${pay.notes}</span>` : ''}
                                </div>
                            </div>
                            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                <button onclick="SuppliersModule.deletePayment('${s.id}', ${idx})" class="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition">
                                    <i class="fas fa-trash text-red-500 text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                ${(s.payments||[]).length > 0 ? `
                <div class="bg-green-50 p-4 flex justify-between items-center border-t border-green-100">
                    <span class="font-bold text-green-700"><i class="fas fa-sigma ml-1"></i> إجمالي المدفوع</span>
                    <span class="font-black text-green-700 text-lg">${formatCurrency(paid)}</span>
                </div>` : ''}
            </div>
        `;
    },

    // ---------- Item CRUD ----------
    async addItem(supplierId) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const { value: data } = await Swal.fire({
            title: '<i class="fas fa-box text-amber-500"></i> إضافة صنف',
            html: `<div style="text-align:right;direction:rtl">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">اسم الصنف *</label>
                <input type="text" id="swalItemName" placeholder="مثال: ورق كوشيه 300 جرام" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
                    <div>
                        <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">سعر الوحدة *</label>
                        <input type="number" id="swalItemPrice" step="0.01" min="0" placeholder="0.00" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
                    </div>
                    <div>
                        <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">الكمية</label>
                        <input type="number" id="swalItemQty" min="1" value="1" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
                    </div>
                </div>
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">التاريخ</label>
                <input type="date" id="swalItemDate" value="${todayStr}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">ملاحظات</label>
                <input type="text" id="swalItemNotes" placeholder="اختياري" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
            </div>`,
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: '<i class="fas fa-plus ml-1"></i> إضافة',
            confirmButtonColor: '#F59E0B',
            preConfirm: () => {
                const name = document.getElementById('swalItemName').value.trim();
                const price = parseFloat(document.getElementById('swalItemPrice').value);
                if (!name) { Swal.showValidationMessage('أدخل اسم الصنف'); return false; }
                if (!price || price <= 0) { Swal.showValidationMessage('أدخل سعر صحيح'); return false; }
                return {
                    name,
                    price,
                    qty: parseInt(document.getElementById('swalItemQty').value) || 1,
                    date: document.getElementById('swalItemDate').value,
                    notes: document.getElementById('swalItemNotes').value.trim()
                };
            }
        });
        if (!data) return;
        try {
            const s = this._getSupplier(supplierId);
            if (!s) return;
            const items = [...(s.items || []), { ...data, id: Date.now() }];
            await this.updateSupplier(supplierId, { items });
            Swal.fire({ icon: 'success', title: 'تمت الإضافة', timer: 1000, showConfirmButton: false });
            this.showDetail(supplierId);
        } catch (e) {
            Swal.fire('خطأ', e.message, 'error');
        }
    },

    async editItem(supplierId, idx) {
        const s = this._getSupplier(supplierId);
        if (!s || !s.items || !s.items[idx]) return;
        const item = s.items[idx];
        const { value: data } = await Swal.fire({
            title: '<i class="fas fa-pen text-blue-500"></i> تعديل صنف',
            html: `<div style="text-align:right;direction:rtl">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">اسم الصنف *</label>
                <input type="text" id="swalItemName" value="${item.name || ''}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
                    <div>
                        <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">سعر الوحدة *</label>
                        <input type="number" id="swalItemPrice" step="0.01" min="0" value="${item.price || 0}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
                    </div>
                    <div>
                        <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">الكمية</label>
                        <input type="number" id="swalItemQty" min="1" value="${item.qty || 1}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
                    </div>
                </div>
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">التاريخ</label>
                <input type="date" id="swalItemDate" value="${item.date || ''}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">ملاحظات</label>
                <input type="text" id="swalItemNotes" value="${item.notes || ''}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
            </div>`,
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: '<i class="fas fa-check ml-1"></i> حفظ',
            confirmButtonColor: '#3B82F6',
            preConfirm: () => {
                const name = document.getElementById('swalItemName').value.trim();
                const price = parseFloat(document.getElementById('swalItemPrice').value);
                if (!name) { Swal.showValidationMessage('أدخل اسم الصنف'); return false; }
                if (!price || price <= 0) { Swal.showValidationMessage('أدخل سعر صحيح'); return false; }
                return {
                    name,
                    price,
                    qty: parseInt(document.getElementById('swalItemQty').value) || 1,
                    date: document.getElementById('swalItemDate').value,
                    notes: document.getElementById('swalItemNotes').value.trim()
                };
            }
        });
        if (!data) return;
        try {
            const items = [...s.items];
            items[idx] = { ...items[idx], ...data };
            await this.updateSupplier(supplierId, { items });
            Swal.fire({ icon: 'success', title: 'تم التعديل', timer: 1000, showConfirmButton: false });
            this.showDetail(supplierId);
        } catch (e) {
            Swal.fire('خطأ', e.message, 'error');
        }
    },

    async deleteItem(supplierId, idx) {
        const { isConfirmed } = await Swal.fire({
            title: 'حذف الصنف؟',
            text: 'هل أنت متأكد من حذف هذا الصنف؟',
            icon: 'warning',
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: 'حذف',
            confirmButtonColor: '#EF4444'
        });
        if (!isConfirmed) return;
        try {
            const s = this._getSupplier(supplierId);
            const items = [...(s.items || [])];
            items.splice(idx, 1);
            await this.updateSupplier(supplierId, { items });
            Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1000, showConfirmButton: false });
            this.showDetail(supplierId);
        } catch (e) {
            Swal.fire('خطأ', e.message, 'error');
        }
    },

    // ---------- Payment CRUD ----------
    async addPayment(supplierId) {
        const s = this._getSupplier(supplierId);
        if (!s) return;
        const bal = this._balance(s);
        if (bal <= 0) { Swal.fire('تنبيه', 'لا يوجد رصيد متبقي', 'info'); return; }
        const todayStr = new Date().toISOString().slice(0, 10);
        const walletOptions = typeof WalletMgr !== 'undefined' ? WalletMgr.buildOptionsHTML('cash') : '<option value="cash">نقدي</option><option value="instapay">إنستاباي</option><option value="wallet">محفظة</option>';

        const { value: data } = await Swal.fire({
            title: '<i class="fas fa-hand-holding-dollar text-green-500"></i> إضافة دفعة',
            html: `<div style="text-align:right;direction:rtl">
                <div style="background:#FEF2F2;border-radius:12px;padding:12px;margin-bottom:16px;text-align:center">
                    <p style="font-size:13px;color:#666;margin-bottom:4px">المتبقي على المورد</p>
                    <p style="font-size:24px;font-weight:900;color:#EF4444">${formatCurrency(bal)}</p>
                </div>
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">المبلغ *</label>
                <input type="number" id="swalPayAmount" step="0.01" min="0.01" max="${bal}" placeholder="0.00" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">المحفظة</label>
                <select id="swalPayWallet" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                    ${walletOptions}
                </select>
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">التاريخ</label>
                <input type="date" id="swalPayDate" value="${todayStr}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">ملاحظات</label>
                <input type="text" id="swalPayNotes" placeholder="اختياري" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
            </div>`,
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: '<i class="fas fa-check ml-1"></i> تأكيد الدفعة',
            confirmButtonColor: '#22C55E',
            preConfirm: () => {
                const amount = parseFloat(document.getElementById('swalPayAmount').value);
                if (!amount || amount <= 0) { Swal.showValidationMessage('أدخل مبلغ صحيح'); return false; }
                if (amount > bal) { Swal.showValidationMessage('المبلغ أكبر من المتبقي'); return false; }
                return {
                    amount,
                    wallet: document.getElementById('swalPayWallet').value,
                    date: document.getElementById('swalPayDate').value,
                    notes: document.getElementById('swalPayNotes').value.trim()
                };
            }
        });
        if (!data) return;
        try {
            const payments = [...(s.payments || []), { ...data, id: Date.now() }];
            await this.updateSupplier(supplierId, { payments });
            Swal.fire({ icon: 'success', title: 'تم تسجيل الدفعة', text: `تم دفع ${formatCurrency(data.amount)} بنجاح`, timer: 1500, showConfirmButton: false });
            this.showDetail(supplierId);
        } catch (e) {
            Swal.fire('خطأ', e.message, 'error');
        }
    },

    async deletePayment(supplierId, idx) {
        const { isConfirmed } = await Swal.fire({
            title: 'حذف الدفعة؟',
            text: 'هل أنت متأكد من حذف هذه الدفعة؟',
            icon: 'warning',
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: 'حذف',
            confirmButtonColor: '#EF4444'
        });
        if (!isConfirmed) return;
        try {
            const s = this._getSupplier(supplierId);
            const payments = [...(s.payments || [])];
            payments.splice(idx, 1);
            await this.updateSupplier(supplierId, { payments });
            Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1000, showConfirmButton: false });
            this.showDetail(supplierId);
        } catch (e) {
            Swal.fire('خطأ', e.message, 'error');
        }
    },

    // ---------- Supplier Edit/Delete ----------
    async editSupplierInfo(id) {
        const s = this._getSupplier(id);
        if (!s) return;
        const { value: data } = await Swal.fire({
            title: '<i class="fas fa-pen text-accent"></i> تعديل بيانات المورد',
            html: `<div style="text-align:right;direction:rtl">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">اسم المورد *</label>
                <input type="text" id="swalSupName" value="${s.name || ''}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">رقم الهاتف</label>
                <input type="text" id="swalSupPhone" value="${s.phone || ''}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">ملاحظات</label>
                <textarea id="swalSupNotes" rows="2" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:none">${s.notes || ''}</textarea>
            </div>`,
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: '<i class="fas fa-check ml-1"></i> حفظ',
            confirmButtonColor: '#45A5C4',
            preConfirm: () => {
                const name = document.getElementById('swalSupName').value.trim();
                if (!name) { Swal.showValidationMessage('أدخل اسم المورد'); return false; }
                return {
                    name,
                    phone: document.getElementById('swalSupPhone').value.trim(),
                    notes: document.getElementById('swalSupNotes').value.trim()
                };
            }
        });
        if (!data) return;
        try {
            await this.updateSupplier(id, data);
            Swal.fire({ icon: 'success', title: 'تم التعديل', timer: 1000, showConfirmButton: false });
            this.showDetail(id);
        } catch (e) {
            Swal.fire('خطأ', e.message, 'error');
        }
    },

    async confirmDeleteSupplier(id) {
        const s = this._getSupplier(id);
        if (!s) return;
        const { isConfirmed } = await Swal.fire({
            title: 'حذف المورد؟',
            html: `<p>هل أنت متأكد من حذف المورد <strong>${s.name}</strong>؟</p><p class="text-sm text-red-500 mt-2">سيتم حذف جميع الأصناف والدفعات المرتبطة به.</p>`,
            icon: 'warning',
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: 'حذف نهائي',
            confirmButtonColor: '#EF4444'
        });
        if (!isConfirmed) return;
        try {
            await this.deleteSupplier(id);
            Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1000, showConfirmButton: false });
            this.render();
        } catch (e) {
            Swal.fire('خطأ', e.message, 'error');
        }
    }
};

window.SuppliersModule = SuppliersModule;
