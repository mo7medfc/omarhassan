// ==========================================
// Shipping Module - الشحن
// ==========================================
const ShippingModule = {
    _carriers: [],
    _loaded: false,

    // ---------- Firestore ----------
    _col() { return Branch.getCollection('shipping_carriers'); },

    async init() {
        await this.load();
        return this._carriers;
    },

    async load() {
        if (this._loaded) return this._carriers;
        try {
            const snap = await this._col().get();
            this._carriers = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
            this._loaded = true;
        } catch (e) {
            console.error('Shipping load error:', e);
            this._carriers = [];
        }
        return this._carriers;
    },

    async addCarrier(carrier) {
        const doc = this._col().doc(carrier.id.toString());
        await doc.set(carrier);
        if (Branch.isDefault()) db.collection('shipping_carriers').doc(carrier.id.toString()).set(carrier).catch(() => {});
        this._carriers.push(carrier);
    },

    async updateCarrier(id, data) {
        await this._col().doc(id.toString()).update(data);
        if (Branch.isDefault()) db.collection('shipping_carriers').doc(id.toString()).update(data).catch(() => {});
        const idx = this._carriers.findIndex(c => c.id == id);
        if (idx !== -1) Object.assign(this._carriers[idx], data);
    },

    async deleteCarrier(id) {
        await this._col().doc(id.toString()).delete();
        if (Branch.isDefault()) db.collection('shipping_carriers').doc(id.toString()).delete().catch(() => {});
        this._carriers = this._carriers.filter(c => c.id != id);
    },

    getCarrier(id) { return this._carriers.find(c => c.id == id); },

    getCarrierName(id) {
        const c = this.getCarrier(id);
        return c ? c.name : (id || '-');
    },

    // Build options for <select>
    buildCarrierOptions(selected) {
        return '<option value="">-- اختر شركة/مندوب --</option>' +
            this._carriers.filter(c => c.active !== false).map(c =>
                `<option value="${c.id}" ${selected == c.id ? 'selected' : ''}>${c.name} (${c.type === 'company' ? 'شركة' : 'مندوب'})</option>`
            ).join('');
    },

    // Populate shipping carrier selects
    injectCarrierOptions() {
        const el = document.getElementById('orderShippingCarrier');
        if (el) el.innerHTML = this.buildCarrierOptions(el.value);
    },

    // Get shipping orders
    getShippingOrders() {
        return (AppState.orders || []).filter(o => o.isShipping);
    },

    // Stats
    getStats() {
        const orders = this.getShippingOrders();
        const pending = orders.filter(o => o.status !== 'delivered' && o.status !== 'shipped' && o.status !== 'cancelled').length;
        const shipped = orders.filter(o => o.status === 'shipped').length;
        const delivered = orders.filter(o => o.status === 'delivered').length;
        const totalCost = orders.reduce((s, o) => s + (o.shippingCost || 0), 0);
        return { total: orders.length, pending, shipped, delivered, totalCost };
    },

    // ---------- Render ----------
    async render() {
        await this.load();
        const container = document.getElementById('shippingContent');
        if (!container) return;

        const stats = this.getStats();
        const carriers = this._carriers;
        const allShippingOrders = this.getShippingOrders().sort((a, b) => {
            const order = { 'pending': 0, 'in_design': 1, 'in_progress': 2, 'ready_at_branch': 3, 'shipped': 4, 'delivered': 5, 'cancelled': 6 };
            return (order[a.status] || 0) - (order[b.status] || 0);
        });
        const totalShipping = allShippingOrders.length;
        const shippingOrders = this._searchQuery
            ? allShippingOrders.filter(o => this._matchesSearch(o, this._searchQuery))
            : allShippingOrders;

        const formatCurrency = (v) => (v || 0).toFixed(2) + ' ج.م';

        // Stats cards
        let html = `
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div class="stat-card">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><i class="fas fa-truck-fast text-indigo-500"></i></div>
                </div>
                <p class="text-xl font-black text-gray-900">${stats.total}</p>
                <p class="text-xs text-gray-400 font-semibold mt-1">إجمالي الشحنات</p>
            </div>
            <div class="stat-card">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><i class="fas fa-clock text-amber-500"></i></div>
                </div>
                <p class="text-xl font-black text-gray-900">${stats.pending}</p>
                <p class="text-xs text-gray-400 font-semibold mt-1">في الانتظار</p>
            </div>
            <div class="stat-card">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><i class="fas fa-shipping-fast text-blue-500"></i></div>
                </div>
                <p class="text-xl font-black text-gray-900">${stats.shipped}</p>
                <p class="text-xs text-gray-400 font-semibold mt-1">في الطريق</p>
            </div>
            <div class="stat-card">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><i class="fas fa-coins text-emerald-500"></i></div>
                </div>
                <p class="text-xl font-black text-emerald-600">${formatCurrency(stats.totalCost)}</p>
                <p class="text-xs text-gray-400 font-semibold mt-1">إجمالي تكاليف الشحن</p>
            </div>
        </div>`;

        // Tabs
        html += `
        <div class="flex gap-2 mb-5">
            <button onclick="ShippingModule._tab='orders';ShippingModule.render()" class="px-4 py-2 rounded-xl text-sm font-bold transition ${this._tab !== 'carriers' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}">
                <i class="fas fa-boxes-stacked ml-1"></i> الشحنات
            </button>
            <button onclick="ShippingModule._tab='carriers';ShippingModule.render()" class="px-4 py-2 rounded-xl text-sm font-bold transition ${this._tab === 'carriers' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}">
                <i class="fas fa-building ml-1"></i> شركات/مندوبين الشحن
            </button>
        </div>`;

        if (this._tab === 'carriers') {
            html += this._renderCarriers(carriers);
        } else {
            html += this._renderShipments(shippingOrders, formatCurrency, totalShipping);
        }

        container.innerHTML = html;
    },

    _tab: 'orders',
    _searchQuery: '',

    _matchesSearch(order, query) {
        if (!query) return true;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const idStr = String(order.id || '');
        const name = (order.clientName || '').toLowerCase();
        const phoneRaw = order.phone || '';
        const phoneDigits = phoneRaw.replace(/\D/g, '');
        const qDigits = q.replace(/\D/g, '');
        if (idStr.includes(q) || idStr.endsWith(q)) return true;
        if (name.includes(q)) return true;
        if (phoneRaw.toLowerCase().includes(q)) return true;
        if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) return true;
        return false;
    },

    runSearch() {
        const el = document.getElementById('shippingSearchInput');
        this._searchQuery = el ? el.value.trim() : '';
        this._tab = 'orders';
        this.render();
    },

    clearSearch() {
        this._searchQuery = '';
        this.render();
    },

    _renderCarriers(carriers) {
        let html = `
        <div class="bg-white rounded-2xl p-6 border border-gray-100" style="box-shadow:0 1px 4px rgba(0,0,0,0.03);">
            <div class="flex items-center justify-between mb-5">
                <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">
                    <div class="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center"><i class="fas fa-building text-indigo-500 text-xs"></i></div>
                    شركات ومندوبين الشحن (${carriers.length})
                </h3>
                <button onclick="ShippingModule.addCarrierPrompt()" class="bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-600 transition flex items-center gap-1">
                    <i class="fas fa-plus"></i> إضافة جديد
                </button>
            </div>`;

        if (carriers.length === 0) {
            html += `<p class="text-center text-gray-300 py-8"><i class="fas fa-truck text-4xl mb-2 block"></i><span class="text-sm">لا توجد شركات أو مندوبين شحن</span></p>`;
        } else {
            html += `<div class="space-y-3">`;
            carriers.forEach(c => {
                const typeIcon = c.type === 'company' ? 'fa-building' : 'fa-user-tie';
                const typeLabel = c.type === 'company' ? 'شركة' : 'مندوب';
                const typeBg = c.type === 'company' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600';
                const activeClass = c.active !== false ? 'border-gray-100' : 'border-red-100 opacity-60';
                html += `
                <div class="flex items-center gap-4 p-4 rounded-xl border ${activeClass} hover:shadow-md transition">
                    <div class="w-12 h-12 rounded-xl ${typeBg} flex items-center justify-center flex-shrink-0">
                        <i class="fas ${typeIcon} text-lg"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-gray-900 text-sm">${c.name}</p>
                        <p class="text-xs text-gray-400 mt-0.5">
                            <span class="inline-flex items-center gap-1 ${typeBg} px-2 py-0.5 rounded-full text-[10px] font-bold">${typeLabel}</span>
                            ${c.phone ? `<span class="mr-2"><i class="fas fa-phone text-[10px]"></i> ${c.phone}</span>` : ''}
                            ${c.active === false ? '<span class="text-red-400 mr-2">معطّل</span>' : ''}
                        </p>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="ShippingModule.editCarrierPrompt('${c.id}')" class="w-8 h-8 rounded-lg bg-gray-50 hover:bg-accent/10 flex items-center justify-center transition" title="تعديل"><i class="fas fa-pen text-xs text-gray-400"></i></button>
                        <button onclick="ShippingModule.toggleCarrierActive('${c.id}')" class="w-8 h-8 rounded-lg bg-gray-50 hover:bg-amber-50 flex items-center justify-center transition" title="${c.active !== false ? 'تعطيل' : 'تفعيل'}"><i class="fas ${c.active !== false ? 'fa-pause' : 'fa-play'} text-xs text-gray-400"></i></button>
                        <button onclick="ShippingModule.deleteCarrierPrompt('${c.id}')" class="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 flex items-center justify-center transition" title="حذف"><i class="fas fa-trash text-xs text-red-400"></i></button>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }
        html += `</div>`;
        return html;
    },

    _renderShipments(orders, fmt, totalCount) {
        const total = totalCount != null ? totalCount : orders.length;
        const hasSearch = !!this._searchQuery;
        const countLabel = hasSearch
            ? `${orders.length} نتيجة من ${total}`
            : `${orders.length}`;

        let html = `
        <div class="bg-white rounded-2xl p-6 border border-gray-100" style="box-shadow:0 1px 4px rgba(0,0,0,0.03);">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">
                    <div class="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center"><i class="fas fa-boxes-stacked text-indigo-500 text-xs"></i></div>
                    الشحنات (${countLabel})
                </h3>
            </div>
            <div class="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                <div class="flex-1 min-w-[200px] relative">
                    <i class="fas fa-search absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 text-xs pointer-events-none"></i>
                    <input type="text" id="shippingSearchInput" value="${(this._searchQuery || '').replace(/"/g, '&quot;')}"
                        placeholder="رقم الطلب، اسم العميل، أو رقم الهاتف..."
                        class="w-full pr-9 pl-3 py-2.5 rounded-xl border border-indigo-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
                        onkeydown="if(event.key==='Enter')ShippingModule.runSearch()">
                </div>
                <button onclick="ShippingModule.runSearch()" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0">
                    <i class="fas fa-search"></i> بحث
                </button>
                ${hasSearch ? `<button onclick="ShippingModule.clearSearch()" class="bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-bold transition shrink-0">
                    <i class="fas fa-times ml-1"></i> مسح
                </button>` : ''}
            </div>`;

        if (orders.length === 0) {
            html += `<p class="text-center text-gray-300 py-8"><i class="fas fa-${hasSearch ? 'search' : 'box-open'} text-4xl mb-2 block"></i><span class="text-sm">${hasSearch ? 'لا توجد نتائج للبحث' : 'لا توجد شحنات'}</span></p>`;
        } else {
            html += `<div class="overflow-x-auto"><table class="data-table"><thead><tr>
                <th>#</th><th>العميل</th><th>شركة/مندوب الشحن</th><th>تكلفة الشحن</th><th>المحفظة</th><th>العنوان</th><th>الحالة</th>
            </tr></thead><tbody>`;
            orders.forEach(o => {
                const st = this._shipmentStatus(o);
                const carrierName = this.getCarrierName(o.shippingCarrierId);
                const walletLabel = (typeof WalletMgr !== 'undefined') ? WalletMgr.getLabel(o.shippingWallet || 'cash') : (o.shippingWallet || 'نقدي');
                html += `<tr class="cursor-pointer hover:bg-gray-50" onclick="OrdersModule.openOrderDetail(${o.id})">
                    <td class="font-bold text-accent">#${o.id}</td>
                    <td>
                        <span class="font-semibold text-gray-800">${o.clientName || '-'}</span>
                        ${o.phone ? `<br><span class="text-[10px] text-gray-400"><i class="fas fa-phone text-[8px] ml-0.5"></i>${o.phone}</span>` : ''}
                    </td>
                    <td><span class="text-xs font-bold"><i class="fas fa-truck text-indigo-400 ml-1"></i>${carrierName}</span></td>
                    <td class="font-bold">${fmt(o.shippingCost)}</td>
                    <td class="text-xs">${walletLabel}</td>
                    <td class="text-xs text-gray-500">${o.shippingAddress || '-'}</td>
                    <td>${st}</td>
                </tr>`;
            });
            html += `</tbody></table></div>`;
        }
        html += `</div>`;
        return html;
    },

    _shipmentStatus(order) {
        const s = order.status;
        if (s === 'delivered') return '<span class="status-badge status-delivered"><i class="fas fa-check-double"></i> تم التسليم</span>';
        if (s === 'shipped') return '<span class="status-badge status-shipped"><i class="fas fa-truck-fast"></i> في الطريق</span>';
        if (s === 'cancelled') return '<span class="status-badge status-cancelled"><i class="fas fa-ban"></i> ملغي</span>';
        if (s === 'ready_at_branch' || s === 'ready') return '<span class="status-badge status-ready"><i class="fas fa-check"></i> جاهز للشحن</span>';
        return '<span class="status-badge status-pending"><i class="fas fa-clock"></i> قيد التجهيز</span>';
    },

    // ---------- CRUD Prompts ----------
    async addCarrierPrompt() {
        const { value: formValues } = await Swal.fire({
            title: '<i class="fas fa-plus-circle" style="color:#6366f1"></i> إضافة شركة/مندوب شحن',
            html: `<div style="text-align:right;direction:rtl">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">الاسم *</label>
                <input id="swalCarrierName" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px" placeholder="اسم الشركة أو المندوب">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">النوع</label>
                <select id="swalCarrierType" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                    <option value="company">شركة شحن</option>
                    <option value="person">مندوب / شخص</option>
                </select>
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">رقم الهاتف</label>
                <input id="swalCarrierPhone" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px" placeholder="اختياري">
            </div>`,
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: '<i class="fas fa-check ml-1"></i> إضافة',
            confirmButtonColor: '#6366f1',
            preConfirm: () => {
                const name = document.getElementById('swalCarrierName').value.trim();
                if (!name) { Swal.showValidationMessage('يرجى إدخال الاسم'); return false; }
                return {
                    name,
                    type: document.getElementById('swalCarrierType').value,
                    phone: document.getElementById('swalCarrierPhone').value.trim()
                };
            }
        });
        if (!formValues) return;
        try {
            const carrier = {
                id: Date.now().toString(),
                name: formValues.name,
                type: formValues.type,
                phone: formValues.phone,
                active: true,
                createdAt: new Date().toISOString()
            };
            await this.addCarrier(carrier);
            this.injectCarrierOptions();
            Swal.fire({ icon: 'success', title: 'تمت الإضافة', timer: 1200, showConfirmButton: false });
            this.render();
        } catch (e) { Swal.fire('خطأ', e.message, 'error'); }
    },

    async editCarrierPrompt(id) {
        const c = this.getCarrier(id);
        if (!c) return;
        const { value: formValues } = await Swal.fire({
            title: '<i class="fas fa-pen" style="color:#6366f1"></i> تعديل',
            html: `<div style="text-align:right;direction:rtl">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">الاسم *</label>
                <input id="swalCarrierName" value="${c.name}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">النوع</label>
                <select id="swalCarrierType" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;margin-bottom:12px">
                    <option value="company" ${c.type === 'company' ? 'selected' : ''}>شركة شحن</option>
                    <option value="person" ${c.type === 'person' ? 'selected' : ''}>مندوب / شخص</option>
                </select>
                <label style="font-size:13px;font-weight:700;color:#555;display:block;margin-bottom:4px">رقم الهاتف</label>
                <input id="swalCarrierPhone" value="${c.phone || ''}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px">
            </div>`,
            showCancelButton: true,
            cancelButtonText: 'إلغاء',
            confirmButtonText: '<i class="fas fa-save ml-1"></i> حفظ',
            confirmButtonColor: '#6366f1',
            preConfirm: () => {
                const name = document.getElementById('swalCarrierName').value.trim();
                if (!name) { Swal.showValidationMessage('يرجى إدخال الاسم'); return false; }
                return {
                    name,
                    type: document.getElementById('swalCarrierType').value,
                    phone: document.getElementById('swalCarrierPhone').value.trim()
                };
            }
        });
        if (!formValues) return;
        try {
            await this.updateCarrier(id, formValues);
            this.injectCarrierOptions();
            Swal.fire({ icon: 'success', title: 'تم التعديل', timer: 1200, showConfirmButton: false });
            this.render();
        } catch (e) { Swal.fire('خطأ', e.message, 'error'); }
    },

    async toggleCarrierActive(id) {
        const c = this.getCarrier(id);
        if (!c) return;
        const newActive = c.active === false ? true : false;
        await this.updateCarrier(id, { active: newActive });
        this.injectCarrierOptions();
        this.render();
    },

    async deleteCarrierPrompt(id) {
        const c = this.getCarrier(id);
        if (!c) return;
        const { isConfirmed } = await Swal.fire({
            title: 'حذف ' + c.name + '؟',
            text: 'لا يمكن التراجع عن هذا الإجراء',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'حذف',
            cancelButtonText: 'إلغاء',
            confirmButtonColor: '#ef4444'
        });
        if (!isConfirmed) return;
        try {
            await this.deleteCarrier(id);
            this.injectCarrierOptions();
            Swal.fire({ icon: 'success', title: 'تم الحذف', timer: 1200, showConfirmButton: false });
            this.render();
        } catch (e) { Swal.fire('خطأ', e.message, 'error'); }
    }
};

window.ShippingModule = ShippingModule;
