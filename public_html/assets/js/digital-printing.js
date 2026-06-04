// ==========================================
// DigitalPrinting - Smart Pricing Engine
// ==========================================
const DigitalPrinting = {
    // ========== CONFIG ==========
    SHEET_W: 32,
    SHEET_H: 47,
    BLEED: 0, // mm bleed per side (can be adjusted)

    // Default paper types
    _defaultPapers: [
        { id: 'p100',  name: 'ورق 100 جم',        singlePrice: 2.5,  doublePrice: 4.0,  lamSinglePrice: 1.5, lamDoublePrice: 2.5, allowDoubleSide: true,  allowLamSingle: true,  allowLamDouble: true  },
        { id: 'p150c', name: 'كوشيه 150 جم',       singlePrice: 3.0,  doublePrice: 5.0,  lamSinglePrice: 1.5, lamDoublePrice: 2.5, allowDoubleSide: true,  allowLamSingle: true,  allowLamDouble: false },
        { id: 'p200c', name: 'كوشيه 200 جم',       singlePrice: 3.5,  doublePrice: 5.5,  lamSinglePrice: 1.5, lamDoublePrice: 2.5, allowDoubleSide: true,  allowLamSingle: true,  allowLamDouble: true  },
        { id: 'p250c', name: 'كوشيه 250 جم',       singlePrice: 4.0,  doublePrice: 6.5,  lamSinglePrice: 1.5, lamDoublePrice: 2.5, allowDoubleSide: true,  allowLamSingle: true,  allowLamDouble: true  },
        { id: 'p300c', name: 'كوشيه 300 جم',       singlePrice: 5.0,  doublePrice: 8.0,  lamSinglePrice: 1.5, lamDoublePrice: 2.5, allowDoubleSide: true,  allowLamSingle: true,  allowLamDouble: true  },
        { id: 'p350c', name: 'كوشيه 350 جم',       singlePrice: 6.0,  doublePrice: 9.0,  lamSinglePrice: 1.5, lamDoublePrice: 2.5, allowDoubleSide: true,  allowLamSingle: true,  allowLamDouble: true  },
        { id: 'trace', name: 'ورق كلك (شفاف)',     singlePrice: 5.0,  doublePrice: 0,    lamSinglePrice: 0,   lamDoublePrice: 0,   allowDoubleSide: false, allowLamSingle: false, allowLamDouble: false },
        { id: 'brist', name: 'ورق بريستول',        singlePrice: 4.0,  doublePrice: 6.0,  lamSinglePrice: 1.5, lamDoublePrice: 2.5, allowDoubleSide: true,  allowLamSingle: true,  allowLamDouble: true  },
        { id: 'cryst', name: 'ورق كريستال',        singlePrice: 5.5,  doublePrice: 8.5,  lamSinglePrice: 1.5, lamDoublePrice: 0,   allowDoubleSide: true,  allowLamSingle: true,  allowLamDouble: false },
        { id: 'opal',  name: 'ورق أوبالين',        singlePrice: 5.0,  doublePrice: 7.5,  lamSinglePrice: 1.5, lamDoublePrice: 2.5, allowDoubleSide: true,  allowLamSingle: true,  allowLamDouble: true  },
        { id: 'stick', name: 'ورق استيكر',         singlePrice: 6.0,  doublePrice: 0,    lamSinglePrice: 1.5, lamDoublePrice: 0,   allowDoubleSide: false, allowLamSingle: true,  allowLamDouble: false },
        { id: 'tstic', name: 'استيكر شفاف',        singlePrice: 8.0,  doublePrice: 0,    lamSinglePrice: 0,   lamDoublePrice: 0,   allowDoubleSide: false, allowLamSingle: false, allowLamDouble: false },
        { id: 'pstic', name: 'استيكر بلاستيك',     singlePrice: 9.0,  doublePrice: 0,    lamSinglePrice: 0,   lamDoublePrice: 0,   allowDoubleSide: false, allowLamSingle: false, allowLamDouble: false },
    ],

    // Default extras
    _defaultExtras: {
        matteLamPerSheet: 1.5,
        glossLamPerSheet: 1.5,
        specialColorPerSheet: 2.0,
        stickerCuttingPerSheet: 1.0,
        paperDieCuttingPerSheet: 2.0,
        creasingPer1000: 50,
        drillingPer1000: 30,
        cornerRounding: 20,
        folderPocketPerPiece: 3.0,
        bagClosingPerBag: 2.0,
        paperCuttingPer1000: 25,
    },

    _papers: [],
    _extras: {},
    _loaded: false,

    // ========== FIREBASE LOAD/SAVE ==========
    async loadConfig() {
        if (this._loaded) return;
        try {
            const docRef = typeof Branch !== 'undefined'
                ? Branch.getCollection('digital_printing_config').doc('settings')
                : db.collection('branches').doc('default').collection('digital_printing_config').doc('settings');
            const snap = await docRef.get();
            if (snap.exists) {
                const data = snap.data();
                if (data.papers && data.papers.length > 0) this._papers = data.papers;
                else this._papers = JSON.parse(JSON.stringify(this._defaultPapers));
                if (data.extras) this._extras = data.extras;
                else this._extras = { ...this._defaultExtras };
                if (data.sheetW) this.SHEET_W = data.sheetW;
                if (data.sheetH) this.SHEET_H = data.sheetH;
            } else {
                this._papers = JSON.parse(JSON.stringify(this._defaultPapers));
                this._extras = { ...this._defaultExtras };
                await this.saveConfig();
            }
        } catch (e) {
            console.error('DigitalPrinting loadConfig error:', e);
            this._papers = JSON.parse(JSON.stringify(this._defaultPapers));
            this._extras = { ...this._defaultExtras };
        }
        this._loaded = true;
    },

    async saveConfig() {
        try {
            const docRef = typeof Branch !== 'undefined'
                ? Branch.getCollection('digital_printing_config').doc('settings')
                : db.collection('branches').doc('default').collection('digital_printing_config').doc('settings');
            await docRef.set({
                papers: this._papers,
                extras: this._extras,
                sheetW: this.SHEET_W,
                sheetH: this.SHEET_H,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error('DigitalPrinting saveConfig error:', e);
        }
    },

    // ========== CALCULATION ENGINE ==========
    calcPiecesPerSheet(pieceW, pieceH) {
        const sw = this.SHEET_W, sh = this.SHEET_H;
        // Try both orientations
        const fit1 = Math.floor(sw / pieceW) * Math.floor(sh / pieceH);
        const fit2 = Math.floor(sw / pieceH) * Math.floor(sh / pieceW);
        return Math.max(fit1, fit2, 1);
    },

    calcSheetsNeeded(quantity, piecesPerSheet) {
        return Math.ceil(quantity / piecesPerSheet);
    },

    calcFullPrice(opts) {
        const { paperId, pieceW, pieceH, quantity, doubleSide, lamType, extras } = opts;
        const paper = this._papers.find(p => p.id === paperId);
        if (!paper) return null;

        const pps = this.calcPiecesPerSheet(pieceW, pieceH);
        const sheets = this.calcSheetsNeeded(quantity, pps);

        // Paper + printing price
        const sheetPrice = doubleSide ? paper.doublePrice : paper.singlePrice;
        const printingCost = sheets * sheetPrice;

        // Lamination
        let lamCost = 0;
        if (lamType === 'single' && paper.allowLamSingle) {
            lamCost = sheets * paper.lamSinglePrice;
        } else if (lamType === 'double' && paper.allowLamDouble) {
            lamCost = sheets * paper.lamDoublePrice;
        }

        // Extras
        let extrasCost = 0;
        const extrasBreakdown = [];
        const ex = this._extras;

        if (extras) {
            if (extras.matteLam) {
                const c = sheets * ex.matteLamPerSheet;
                extrasCost += c;
                extrasBreakdown.push({ name: 'تغليف مات', cost: c });
            }
            if (extras.glossLam) {
                const c = sheets * ex.glossLamPerSheet;
                extrasCost += c;
                extrasBreakdown.push({ name: 'تغليف لامع', cost: c });
            }
            if (extras.specialColors > 0) {
                const c = extras.specialColors * ex.specialColorPerSheet * sheets;
                extrasCost += c;
                extrasBreakdown.push({ name: `ألوان خاصة (${extras.specialColors})`, cost: c });
            }
            if (extras.stickerCutting) {
                const c = sheets * ex.stickerCuttingPerSheet;
                extrasCost += c;
                extrasBreakdown.push({ name: 'قص استيكر', cost: c });
            }
            if (extras.dieCutting) {
                const c = sheets * ex.paperDieCuttingPerSheet;
                extrasCost += c;
                extrasBreakdown.push({ name: 'قص داي كت', cost: c });
            }
            if (extras.creases > 0) {
                const c = Math.ceil(quantity / 1000) * ex.creasingPer1000 * extras.creases;
                extrasCost += c;
                extrasBreakdown.push({ name: `بيغ / تكسير (${extras.creases})`, cost: c });
            }
            if (extras.drills > 0) {
                const c = Math.ceil(quantity / 1000) * ex.drillingPer1000 * extras.drills;
                extrasCost += c;
                extrasBreakdown.push({ name: `تخريم (${extras.drills})`, cost: c });
            }
            if (extras.cornerRounding) {
                extrasCost += ex.cornerRounding;
                extrasBreakdown.push({ name: 'تدوير أركان', cost: ex.cornerRounding });
            }
            if (extras.folderPockets > 0) {
                const c = extras.folderPockets * ex.folderPocketPerPiece;
                extrasCost += c;
                extrasBreakdown.push({ name: `جيب فولدر + لصق (${extras.folderPockets})`, cost: c });
            }
            if (extras.bagClosing > 0) {
                const c = extras.bagClosing * ex.bagClosingPerBag;
                extrasCost += c;
                extrasBreakdown.push({ name: `قفل شنطة (${extras.bagClosing})`, cost: c });
            }
            if (extras.paperCuts > 0) {
                const c = Math.ceil(quantity / 1000) * ex.paperCuttingPer1000 * extras.paperCuts;
                extrasCost += c;
                extrasBreakdown.push({ name: `قص ورق (${extras.paperCuts})`, cost: c });
            }
        }

        const total = printingCost + lamCost + extrasCost;

        return {
            piecesPerSheet: pps,
            sheets,
            sheetPrice,
            printingCost,
            lamCost,
            lamType: lamType || 'none',
            extrasCost,
            extrasBreakdown,
            total,
            unitPrice: total / quantity,
            paper: paper.name,
            quantity,
            pieceW,
            pieceH,
            doubleSide
        };
    },

    // ========== CALCULATOR UI (Order Modal) ==========
    async openCalculator() {
        await this.loadConfig();
        if (typeof closeModal === 'function') closeModal('productSelectionModal');

        const papersOpts = this._papers.map(p =>
            `<option value="${p.id}" data-double="${p.allowDoubleSide}" data-lam-s="${p.allowLamSingle}" data-lam-d="${p.allowLamDouble}">${p.name} — وجه: ${p.singlePrice} ج.م${p.allowDoubleSide ? ' | وجهين: ' + p.doublePrice + ' ج.م' : ''}</option>`
        ).join('');

        const content = document.getElementById('productConfigContent');
        const title = document.getElementById('productConfigModalTitle');
        if (!content || !title) return;

        title.innerHTML = `<i class="fas fa-desktop text-accent ml-2"></i> حاسبة الطباعة الديجيتال`;

        content.innerHTML = `
        <div id="dpCalcRoot" class="space-y-4" style="direction:rtl">
            <!-- Sheet Info -->
            <div class="bg-gradient-to-l from-accent/5 to-transparent p-4 rounded-xl border border-accent/10 flex items-center gap-3">
                <div class="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <i class="fas fa-desktop text-accent text-xl"></i>
                </div>
                <div>
                    <h4 class="font-bold text-primary">الطباعة الديجيتال</h4>
                    <p class="text-xs text-gray-400">مقاس الفرخ: <strong>${this.SHEET_W} × ${this.SHEET_H} سم</strong> — الحساب تلقائي</p>
                </div>
            </div>

            <!-- Paper Selection -->
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1.5"><i class="fas fa-scroll text-accent/60 ml-1"></i> نوع الورق</label>
                <select id="dpPaper" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-accent outline-none" onchange="DigitalPrinting._onCalcChange()">
                    <option value="">-- اختر نوع الورق --</option>
                    ${papersOpts}
                </select>
            </div>

            <!-- Piece Size -->
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1.5"><i class="fas fa-ruler-combined text-accent/60 ml-1"></i> مقاس القطعة (سم)</label>
                <div class="flex gap-3">
                    <div class="flex-1">
                        <label class="text-[10px] text-gray-400 block mb-0.5">العرض</label>
                        <input type="number" id="dpPieceW" step="0.1" min="1" placeholder="10" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-accent outline-none" oninput="DigitalPrinting._onCalcChange()">
                    </div>
                    <div class="flex items-end pb-3 text-gray-300 font-bold">×</div>
                    <div class="flex-1">
                        <label class="text-[10px] text-gray-400 block mb-0.5">الطول</label>
                        <input type="number" id="dpPieceH" step="0.1" min="1" placeholder="15" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-accent outline-none" oninput="DigitalPrinting._onCalcChange()">
                    </div>
                </div>
                <div id="dpPiecesInfo" class="hidden mt-2 bg-blue-50 text-blue-700 rounded-lg px-3 py-2 text-xs font-bold text-center"></div>
            </div>

            <!-- Quantity -->
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1.5"><i class="fas fa-layer-group text-accent/60 ml-1"></i> الكمية</label>
                <input type="number" id="dpQuantity" min="1" placeholder="500" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-accent outline-none" oninput="DigitalPrinting._onCalcChange()">
            </div>

            <!-- Printing Side -->
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1.5"><i class="fas fa-copy text-accent/60 ml-1"></i> طباعة</label>
                <div class="flex gap-2">
                    <button type="button" id="dpSideSingle" onclick="DigitalPrinting._setSide(false)" class="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition bg-accent text-white border-accent">وجه واحد</button>
                    <button type="button" id="dpSideDouble" onclick="DigitalPrinting._setSide(true)" class="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition bg-white text-gray-600 border-gray-200 hover:border-gray-400">وجهين</button>
                </div>
                <div id="dpDoubleNotAllowed" class="hidden mt-1 text-red-400 text-[11px]"><i class="fas fa-info-circle ml-1"></i> هذا الورق لا يدعم الطباعة على وجهين</div>
            </div>

            <!-- Lamination -->
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-1.5"><i class="fas fa-gem text-accent/60 ml-1"></i> التغليف (سلوفان)</label>
                <div class="flex gap-2">
                    <button type="button" id="dpLamNone" onclick="DigitalPrinting._setLam('none')" class="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition bg-accent text-white border-accent">بدون</button>
                    <button type="button" id="dpLamSingle" onclick="DigitalPrinting._setLam('single')" class="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition bg-white text-gray-600 border-gray-200 hover:border-gray-400">وجه واحد</button>
                    <button type="button" id="dpLamDouble" onclick="DigitalPrinting._setLam('double')" class="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition bg-white text-gray-600 border-gray-200 hover:border-gray-400">وجهين</button>
                </div>
            </div>

            <!-- Extras -->
            <div>
                <label class="block text-sm font-bold text-gray-700 mb-2"><i class="fas fa-puzzle-piece text-accent/60 ml-1"></i> إضافات</label>
                <div class="grid grid-cols-2 gap-2 text-sm">
                    <label class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 transition"><input type="checkbox" id="dpExMatteLam" class="accent-[#45A5C4]" onchange="DigitalPrinting._onCalcChange()"> تغليف مات</label>
                    <label class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 transition"><input type="checkbox" id="dpExGlossLam" class="accent-[#45A5C4]" onchange="DigitalPrinting._onCalcChange()"> تغليف لامع</label>
                    <label class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 transition"><input type="checkbox" id="dpExStickerCut" class="accent-[#45A5C4]" onchange="DigitalPrinting._onCalcChange()"> قص استيكر</label>
                    <label class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 transition"><input type="checkbox" id="dpExDieCut" class="accent-[#45A5C4]" onchange="DigitalPrinting._onCalcChange()"> قص داي كت</label>
                    <label class="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100 transition"><input type="checkbox" id="dpExCorner" class="accent-[#45A5C4]" onchange="DigitalPrinting._onCalcChange()"> تدوير أركان</label>
                </div>
                <!-- Number-based extras -->
                <div class="grid grid-cols-2 gap-2 mt-2">
                    <div class="bg-gray-50 rounded-lg px-3 py-2">
                        <label class="text-xs font-semibold text-gray-500">ألوان خاصة</label>
                        <input type="number" id="dpExSpecialColors" min="0" value="0" class="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm" oninput="DigitalPrinting._onCalcChange()">
                    </div>
                    <div class="bg-gray-50 rounded-lg px-3 py-2">
                        <label class="text-xs font-semibold text-gray-500">عدد البيغ (تكسير)</label>
                        <input type="number" id="dpExCreases" min="0" value="0" class="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm" oninput="DigitalPrinting._onCalcChange()">
                    </div>
                    <div class="bg-gray-50 rounded-lg px-3 py-2">
                        <label class="text-xs font-semibold text-gray-500">عدد التخريم</label>
                        <input type="number" id="dpExDrills" min="0" value="0" class="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm" oninput="DigitalPrinting._onCalcChange()">
                    </div>
                    <div class="bg-gray-50 rounded-lg px-3 py-2">
                        <label class="text-xs font-semibold text-gray-500">عدد القصات (ورق)</label>
                        <input type="number" id="dpExPaperCuts" min="0" value="0" class="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm" oninput="DigitalPrinting._onCalcChange()">
                    </div>
                    <div class="bg-gray-50 rounded-lg px-3 py-2">
                        <label class="text-xs font-semibold text-gray-500">جيب فولدر (عدد)</label>
                        <input type="number" id="dpExFolderPockets" min="0" value="0" class="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm" oninput="DigitalPrinting._onCalcChange()">
                    </div>
                    <div class="bg-gray-50 rounded-lg px-3 py-2">
                        <label class="text-xs font-semibold text-gray-500">قفل شنطة (عدد)</label>
                        <input type="number" id="dpExBagClosing" min="0" value="0" class="w-full mt-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm" oninput="DigitalPrinting._onCalcChange()">
                    </div>
                </div>
            </div>

            <!-- Selling price override -->
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <label class="block text-sm font-bold text-gray-700 mb-1.5"><i class="fas fa-tag text-accent/60 ml-1"></i> سعر البيع (ج.م)</label>
                <input type="number" id="dpSellingPrice" step="0.01" min="0" placeholder="سيتم حسابه تلقائياً — أو أدخل يدوي" class="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm focus:border-accent outline-none">
                <p class="text-[10px] text-gray-400 mt-1">اتركه فارغ لاستخدام السعر المحسوب تلقائياً، أو أدخل سعر بيع مختلف</p>
            </div>

            <!-- LIVE PRICE BREAKDOWN -->
            <div id="dpBreakdown" class="hidden">
                <div class="bg-gradient-to-b from-[#f0f9fc] to-white border-2 border-accent/30 rounded-2xl p-5 space-y-3">
                    <h4 class="font-black text-primary text-sm flex items-center gap-2"><i class="fas fa-receipt text-accent"></i> تفاصيل التسعير</h4>
                    <div id="dpBreakdownContent"></div>
                </div>
            </div>

            <!-- Add Button -->
            <button type="button" id="dpAddBtn" onclick="DigitalPrinting._addToOrder()" disabled class="w-full bg-gradient-to-l from-accent to-primary text-white py-3.5 rounded-xl font-bold text-base hover:shadow-lg hover:shadow-accent/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <i class="fas fa-plus-circle"></i> إضافة للطلب
            </button>
        </div>`;

        this._doubleSide = false;
        this._lamType = 'none';
        if (typeof openModal === 'function') openModal('productConfigModal');
    },

    _doubleSide: false,
    _lamType: 'none',
    _lastCalc: null,

    _setSide(dbl) {
        const paper = this._getSelectedPaper();
        if (dbl && paper && !paper.allowDoubleSide) return;
        this._doubleSide = dbl;
        const sBtn = document.getElementById('dpSideSingle');
        const dBtn = document.getElementById('dpSideDouble');
        if (dbl) {
            dBtn.className = 'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition bg-accent text-white border-accent';
            sBtn.className = 'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition bg-white text-gray-600 border-gray-200 hover:border-gray-400';
        } else {
            sBtn.className = 'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition bg-accent text-white border-accent';
            dBtn.className = 'flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition bg-white text-gray-600 border-gray-200 hover:border-gray-400';
        }
        this._onCalcChange();
    },

    _setLam(type) {
        const paper = this._getSelectedPaper();
        if (type === 'single' && paper && !paper.allowLamSingle) return;
        if (type === 'double' && paper && !paper.allowLamDouble) return;
        this._lamType = type;
        ['None', 'Single', 'Double'].forEach(t => {
            const btn = document.getElementById('dpLam' + t);
            if (btn) {
                const active = t.toLowerCase() === type;
                btn.className = `flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition ${active ? 'bg-accent text-white border-accent' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`;
            }
        });
        this._onCalcChange();
    },

    _getSelectedPaper() {
        const sel = document.getElementById('dpPaper');
        if (!sel || !sel.value) return null;
        return this._papers.find(p => p.id === sel.value);
    },

    _onCalcChange() {
        const paper = this._getSelectedPaper();
        const pieceW = parseFloat(document.getElementById('dpPieceW')?.value) || 0;
        const pieceH = parseFloat(document.getElementById('dpPieceH')?.value) || 0;
        const quantity = parseInt(document.getElementById('dpQuantity')?.value) || 0;

        // Update double-side button state
        const dBtn = document.getElementById('dpSideDouble');
        const dWarn = document.getElementById('dpDoubleNotAllowed');
        if (paper && !paper.allowDoubleSide) {
            dBtn.classList.add('opacity-40', 'cursor-not-allowed');
            dWarn.classList.remove('hidden');
            if (this._doubleSide) this._setSide(false);
        } else {
            dBtn.classList.remove('opacity-40', 'cursor-not-allowed');
            dWarn.classList.add('hidden');
        }

        // Update lamination button states
        const lamSBtn = document.getElementById('dpLamSingle');
        const lamDBtn = document.getElementById('dpLamDouble');
        if (paper) {
            lamSBtn.classList.toggle('opacity-40', !paper.allowLamSingle);
            lamSBtn.classList.toggle('cursor-not-allowed', !paper.allowLamSingle);
            lamDBtn.classList.toggle('opacity-40', !paper.allowLamDouble);
            lamDBtn.classList.toggle('cursor-not-allowed', !paper.allowLamDouble);
            if (!paper.allowLamSingle && this._lamType === 'single') this._setLam('none');
            if (!paper.allowLamDouble && this._lamType === 'double') this._setLam('none');
        }

        // Pieces info
        const piecesDiv = document.getElementById('dpPiecesInfo');
        if (pieceW > 0 && pieceH > 0) {
            const pps = this.calcPiecesPerSheet(pieceW, pieceH);
            piecesDiv.classList.remove('hidden');
            piecesDiv.innerHTML = `<i class="fas fa-th ml-1"></i> ${pps} قطعة في الفرخ الواحد${quantity > 0 ? ` — يحتاج <strong>${this.calcSheetsNeeded(quantity, pps)}</strong> فرخ` : ''}`;
        } else {
            piecesDiv.classList.add('hidden');
        }

        // Full calc
        const breakdown = document.getElementById('dpBreakdown');
        const addBtn = document.getElementById('dpAddBtn');
        if (!paper || pieceW <= 0 || pieceH <= 0 || quantity <= 0) {
            breakdown.classList.add('hidden');
            addBtn.disabled = true;
            this._lastCalc = null;
            return;
        }

        const extras = {
            matteLam: document.getElementById('dpExMatteLam')?.checked,
            glossLam: document.getElementById('dpExGlossLam')?.checked,
            specialColors: parseInt(document.getElementById('dpExSpecialColors')?.value) || 0,
            stickerCutting: document.getElementById('dpExStickerCut')?.checked,
            dieCutting: document.getElementById('dpExDieCut')?.checked,
            creases: parseInt(document.getElementById('dpExCreases')?.value) || 0,
            drills: parseInt(document.getElementById('dpExDrills')?.value) || 0,
            cornerRounding: document.getElementById('dpExCorner')?.checked,
            folderPockets: parseInt(document.getElementById('dpExFolderPockets')?.value) || 0,
            bagClosing: parseInt(document.getElementById('dpExBagClosing')?.value) || 0,
            paperCuts: parseInt(document.getElementById('dpExPaperCuts')?.value) || 0,
        };

        const calc = this.calcFullPrice({
            paperId: paper.id, pieceW, pieceH, quantity,
            doubleSide: this._doubleSide, lamType: this._lamType, extras
        });
        this._lastCalc = calc;

        // Render breakdown
        breakdown.classList.remove('hidden');
        addBtn.disabled = false;

        let bHTML = `
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div class="flex justify-between"><span class="text-gray-500">نوع الورق:</span><span class="font-bold">${calc.paper}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">مقاس القطعة:</span><span class="font-bold">${calc.pieceW}×${calc.pieceH} سم</span></div>
                <div class="flex justify-between"><span class="text-gray-500">قطع / فرخ:</span><span class="font-bold text-blue-600">${calc.piecesPerSheet}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">عدد الأفرخ:</span><span class="font-bold text-blue-600">${calc.sheets}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">الطباعة:</span><span class="font-bold">${calc.doubleSide ? 'وجهين' : 'وجه واحد'} — ${calc.sheetPrice} ج.م/فرخ</span></div>
                <div class="flex justify-between"><span class="text-gray-500">تكلفة الطباعة:</span><span class="font-bold text-accent">${calc.printingCost.toFixed(2)} ج.م</span></div>
            </div>`;

        if (calc.lamCost > 0) {
            bHTML += `<div class="flex justify-between text-sm mt-1"><span class="text-gray-500">تغليف (${calc.lamType === 'single' ? 'وجه' : 'وجهين'}):</span><span class="font-bold text-purple-600">+${calc.lamCost.toFixed(2)} ج.م</span></div>`;
        }

        if (calc.extrasBreakdown.length > 0) {
            bHTML += `<div class="border-t border-gray-200 mt-2 pt-2 space-y-1">`;
            calc.extrasBreakdown.forEach(ex => {
                bHTML += `<div class="flex justify-between text-sm"><span class="text-gray-500">${ex.name}:</span><span class="font-bold text-orange-600">+${ex.cost.toFixed(2)} ج.م</span></div>`;
            });
            bHTML += `</div>`;
        }

        bHTML += `
            <div class="border-t-2 border-accent/30 mt-3 pt-3 flex justify-between items-center">
                <span class="font-black text-primary">الإجمالي:</span>
                <span class="font-black text-2xl text-accent">${calc.total.toFixed(2)} ج.م</span>
            </div>
            <div class="flex justify-between text-xs text-gray-400 mt-1">
                <span>سعر القطعة: ${calc.unitPrice.toFixed(2)} ج.م</span>
                <span>${calc.quantity} قطعة × ${calc.piecesPerSheet} قطعة/فرخ = ${calc.sheets} فرخ</span>
            </div>`;

        document.getElementById('dpBreakdownContent').innerHTML = bHTML;
    },

    _addToOrder() {
        const calc = this._lastCalc;
        if (!calc) return;

        const sellingOverride = parseFloat(document.getElementById('dpSellingPrice')?.value);
        const finalPrice = (sellingOverride > 0) ? sellingOverride : calc.total;

        const extrasDesc = calc.extrasBreakdown.map(e => e.name).join('، ');

        const product = {
            id: Date.now(),
            type: 'digital_printing',
            productName: `دجيتال — ${calc.paper} — ${calc.pieceW}×${calc.pieceH} سم`,
            description: `${calc.doubleSide ? 'وجهين' : 'وجه واحد'}${calc.lamType !== 'none' ? ' + تغليف ' + (calc.lamType === 'single' ? 'وجه' : 'وجهين') : ''}${extrasDesc ? ' + ' + extrasDesc : ''}`,
            size: `${calc.pieceW}×${calc.pieceH} سم`,
            quantity: calc.quantity,
            unitPrice: finalPrice / calc.quantity,
            sellingPrice: finalPrice,
            costPrice: calc.total,
            productionCost: calc.total,
            price: finalPrice,
            config: {
                paperId: this._getSelectedPaper()?.id,
                paperName: calc.paper,
                pieceW: calc.pieceW,
                pieceH: calc.pieceH,
                piecesPerSheet: calc.piecesPerSheet,
                sheets: calc.sheets,
                doubleSide: calc.doubleSide,
                lamType: calc.lamType,
                printingCost: calc.printingCost,
                lamCost: calc.lamCost,
                extrasCost: calc.extrasCost,
                extrasBreakdown: calc.extrasBreakdown,
                calcTotal: calc.total
            }
        };

        if (typeof OrderProducts !== 'undefined') {
            OrderProducts.addProduct(product);
        }
        if (typeof closeModal === 'function') closeModal('productConfigModal');
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: 'تم الإضافة', text: `دجيتال — ${calc.paper} — ${calc.quantity} قطعة`, timer: 1500, showConfirmButton: false });
        }
    },

    // ========== ADMIN PRICING PANEL ==========
    async renderAdminPanel(container) {
        await this.loadConfig();
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container) return;

        // Papers table
        let papersHTML = this._papers.map((p, i) => `
            <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition text-sm">
                <td class="py-2.5 px-3 font-bold text-primary">${p.name}</td>
                <td class="py-2.5 px-2"><input type="number" step="0.1" min="0" value="${p.singlePrice}" data-idx="${i}" data-field="singlePrice" class="dp-admin-input w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center" onchange="DigitalPrinting._onAdminChange(this)"></td>
                <td class="py-2.5 px-2">${p.allowDoubleSide ? `<input type="number" step="0.1" min="0" value="${p.doublePrice}" data-idx="${i}" data-field="doublePrice" class="dp-admin-input w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center" onchange="DigitalPrinting._onAdminChange(this)">` : '<span class="text-gray-300 text-xs">—</span>'}</td>
                <td class="py-2.5 px-2">${p.allowLamSingle ? `<input type="number" step="0.1" min="0" value="${p.lamSinglePrice}" data-idx="${i}" data-field="lamSinglePrice" class="dp-admin-input w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center" onchange="DigitalPrinting._onAdminChange(this)">` : '<span class="text-gray-300 text-xs">—</span>'}</td>
                <td class="py-2.5 px-2">${p.allowLamDouble ? `<input type="number" step="0.1" min="0" value="${p.lamDoublePrice}" data-idx="${i}" data-field="lamDoublePrice" class="dp-admin-input w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center" onchange="DigitalPrinting._onAdminChange(this)">` : '<span class="text-gray-300 text-xs">—</span>'}</td>
                <td class="py-2.5 px-2 text-center">
                    <label class="inline-flex items-center gap-1 text-[10px]"><input type="checkbox" ${p.allowDoubleSide ? 'checked' : ''} data-idx="${i}" data-field="allowDoubleSide" class="accent-[#45A5C4]" onchange="DigitalPrinting._onAdminToggle(this)"> وجهين</label>
                    <label class="inline-flex items-center gap-1 text-[10px] ml-1"><input type="checkbox" ${p.allowLamSingle ? 'checked' : ''} data-idx="${i}" data-field="allowLamSingle" class="accent-[#45A5C4]" onchange="DigitalPrinting._onAdminToggle(this)"> تغليف١</label>
                    <label class="inline-flex items-center gap-1 text-[10px] ml-1"><input type="checkbox" ${p.allowLamDouble ? 'checked' : ''} data-idx="${i}" data-field="allowLamDouble" class="accent-[#45A5C4]" onchange="DigitalPrinting._onAdminToggle(this)"> تغليف٢</label>
                </td>
                <td class="py-2.5 px-2 text-center"><button onclick="DigitalPrinting._removeAdminPaper(${i})" class="text-red-400 hover:text-red-600 transition"><i class="fas fa-trash-alt text-xs"></i></button></td>
            </tr>
        `).join('');

        const ex = this._extras;

        container.innerHTML = `
        <div style="direction:rtl" class="space-y-6">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                        <i class="fas fa-desktop text-accent text-xl"></i>
                    </div>
                    <div>
                        <h2 class="text-xl font-black text-primary">أسعار الطباعة الديجيتال</h2>
                        <p class="text-xs text-gray-400">مقاس الفرخ: ${this.SHEET_W} × ${this.SHEET_H} سم — التعديلات تُحفظ تلقائياً</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="DigitalPrinting._addNewPaper()" class="bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-xl text-sm font-bold transition"><i class="fas fa-plus ml-1"></i> إضافة ورق</button>
                    <button onclick="DigitalPrinting._editSheetSize()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold transition"><i class="fas fa-ruler ml-1"></i> تعديل مقاس الفرخ</button>
                </div>
            </div>

            <!-- Papers Table -->
            <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div class="bg-primary/5 px-4 py-3 border-b border-gray-200">
                    <h3 class="font-bold text-sm text-primary"><i class="fas fa-scroll ml-2 text-accent"></i> جدول أنواع الورق والأسعار</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-gray-50 text-gray-500 text-xs">
                                <th class="py-2.5 px-3 text-right font-bold">نوع الورق</th>
                                <th class="py-2.5 px-2 text-center font-bold">وجه واحد</th>
                                <th class="py-2.5 px-2 text-center font-bold">وجهين</th>
                                <th class="py-2.5 px-2 text-center font-bold">تغليف وجه</th>
                                <th class="py-2.5 px-2 text-center font-bold">تغليف وجهين</th>
                                <th class="py-2.5 px-2 text-center font-bold">خيارات</th>
                                <th class="py-2.5 px-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody id="dpAdminPapersBody">${papersHTML}</tbody>
                    </table>
                </div>
            </div>

            <!-- Extras Pricing -->
            <div class="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div class="bg-primary/5 px-4 py-3 border-b border-gray-200">
                    <h3 class="font-bold text-sm text-primary"><i class="fas fa-puzzle-piece ml-2 text-accent"></i> أسعار الإضافات</h3>
                </div>
                <div class="p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">تغليف مات (لكل فرخ)</label>
                        <input type="number" step="0.1" min="0" value="${ex.matteLamPerSheet}" data-extra="matteLamPerSheet" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">تغليف لامع (لكل فرخ)</label>
                        <input type="number" step="0.1" min="0" value="${ex.glossLamPerSheet}" data-extra="glossLamPerSheet" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">لون خاص (لكل فرخ)</label>
                        <input type="number" step="0.1" min="0" value="${ex.specialColorPerSheet}" data-extra="specialColorPerSheet" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">قص استيكر (لكل فرخ)</label>
                        <input type="number" step="0.1" min="0" value="${ex.stickerCuttingPerSheet}" data-extra="stickerCuttingPerSheet" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">قص داي كت (لكل فرخ)</label>
                        <input type="number" step="0.1" min="0" value="${ex.paperDieCuttingPerSheet}" data-extra="paperDieCuttingPerSheet" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">بيغ / تكسير (لكل 1000)</label>
                        <input type="number" step="1" min="0" value="${ex.creasingPer1000}" data-extra="creasingPer1000" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">تخريم (لكل 1000)</label>
                        <input type="number" step="1" min="0" value="${ex.drillingPer1000}" data-extra="drillingPer1000" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">تدوير أركان (سعر ثابت)</label>
                        <input type="number" step="1" min="0" value="${ex.cornerRounding}" data-extra="cornerRounding" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">جيب فولدر + لصق (للقطعة)</label>
                        <input type="number" step="0.1" min="0" value="${ex.folderPocketPerPiece}" data-extra="folderPocketPerPiece" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">قفل شنطة (للشنطة)</label>
                        <input type="number" step="0.1" min="0" value="${ex.bagClosingPerBag}" data-extra="bagClosingPerBag" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <label class="text-xs font-bold text-gray-500 block mb-1">قص ورق (لكل 1000)</label>
                        <input type="number" step="1" min="0" value="${ex.paperCuttingPer1000}" data-extra="paperCuttingPer1000" class="dp-extra-input w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" onchange="DigitalPrinting._onExtraChange(this)">
                    </div>
                </div>
            </div>
        </div>`;
    },

    _onAdminChange(input) {
        const idx = parseInt(input.dataset.idx);
        const field = input.dataset.field;
        this._papers[idx][field] = parseFloat(input.value) || 0;
        this.saveConfig();
    },

    _onAdminToggle(input) {
        const idx = parseInt(input.dataset.idx);
        const field = input.dataset.field;
        this._papers[idx][field] = input.checked;
        this.saveConfig();
        // Re-render to update disabled states
        const container = document.getElementById('dpAdminPapersBody')?.closest('.space-y-6')?.parentElement;
        if (container) this.renderAdminPanel(container);
    },

    _onExtraChange(input) {
        const key = input.dataset.extra;
        this._extras[key] = parseFloat(input.value) || 0;
        this.saveConfig();
    },

    async _addNewPaper() {
        const { value: formData } = await Swal.fire({
            title: '<i class="fas fa-plus-circle text-accent"></i> إضافة نوع ورق جديد',
            html: `<div style="text-align:right;direction:rtl" class="space-y-3">
                <div><label class="text-xs font-bold text-gray-500">اسم الورق</label><input id="swalPaperName" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="مثال: كوشيه 400 جم"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-gray-500">سعر وجه واحد</label><input type="number" id="swalPaperSingle" step="0.1" min="0" value="0" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>
                    <div><label class="text-xs font-bold text-gray-500">سعر وجهين</label><input type="number" id="swalPaperDouble" step="0.1" min="0" value="0" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>
                    <div><label class="text-xs font-bold text-gray-500">تغليف وجه</label><input type="number" id="swalPaperLamS" step="0.1" min="0" value="1.5" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>
                    <div><label class="text-xs font-bold text-gray-500">تغليف وجهين</label><input type="number" id="swalPaperLamD" step="0.1" min="0" value="2.5" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>
                </div>
                <div class="flex gap-4 text-sm">
                    <label><input type="checkbox" id="swalPaperAllowDouble" checked class="accent-[#45A5C4] ml-1"> وجهين</label>
                    <label><input type="checkbox" id="swalPaperAllowLamS" checked class="accent-[#45A5C4] ml-1"> تغليف وجه</label>
                    <label><input type="checkbox" id="swalPaperAllowLamD" checked class="accent-[#45A5C4] ml-1"> تغليف وجهين</label>
                </div>
            </div>`,
            showCancelButton: true, confirmButtonText: 'إضافة', cancelButtonText: 'إلغاء', confirmButtonColor: '#45A5C4',
            preConfirm: () => {
                const name = document.getElementById('swalPaperName').value.trim();
                if (!name) { Swal.showValidationMessage('أدخل اسم الورق'); return false; }
                return {
                    name,
                    singlePrice: parseFloat(document.getElementById('swalPaperSingle').value) || 0,
                    doublePrice: parseFloat(document.getElementById('swalPaperDouble').value) || 0,
                    lamSinglePrice: parseFloat(document.getElementById('swalPaperLamS').value) || 0,
                    lamDoublePrice: parseFloat(document.getElementById('swalPaperLamD').value) || 0,
                    allowDoubleSide: document.getElementById('swalPaperAllowDouble').checked,
                    allowLamSingle: document.getElementById('swalPaperAllowLamS').checked,
                    allowLamDouble: document.getElementById('swalPaperAllowLamD').checked,
                };
            }
        });
        if (!formData) return;
        formData.id = 'p' + Date.now();
        this._papers.push(formData);
        await this.saveConfig();
        const container = document.getElementById('dpAdminPapersBody')?.closest('.space-y-6')?.parentElement;
        if (container) this.renderAdminPanel(container);
        Swal.fire({ icon: 'success', title: 'تم', text: 'تمت إضافة ' + formData.name, timer: 1200, showConfirmButton: false });
    },

    async _removeAdminPaper(idx) {
        const paper = this._papers[idx];
        const { isConfirmed } = await Swal.fire({
            title: 'حذف ورق',
            text: `هل تريد حذف "${paper.name}"؟`,
            icon: 'warning',
            showCancelButton: true, confirmButtonText: 'حذف', cancelButtonText: 'إلغاء', confirmButtonColor: '#EF4444'
        });
        if (!isConfirmed) return;
        this._papers.splice(idx, 1);
        await this.saveConfig();
        const container = document.getElementById('dpAdminPapersBody')?.closest('.space-y-6')?.parentElement;
        if (container) this.renderAdminPanel(container);
    },

    async _editSheetSize() {
        const { value: formData } = await Swal.fire({
            title: '<i class="fas fa-ruler text-accent"></i> مقاس الفرخ',
            html: `<div style="text-align:right;direction:rtl" class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-gray-500">العرض (سم)</label><input type="number" id="swalSheetW" step="0.1" value="${this.SHEET_W}" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>
                    <div><label class="text-xs font-bold text-gray-500">الطول (سم)</label><input type="number" id="swalSheetH" step="0.1" value="${this.SHEET_H}" class="w-full mt-1 px-3 py-2 border rounded-lg text-sm"></div>
                </div>
            </div>`,
            showCancelButton: true, confirmButtonText: 'حفظ', cancelButtonText: 'إلغاء', confirmButtonColor: '#45A5C4',
            preConfirm: () => ({
                w: parseFloat(document.getElementById('swalSheetW').value) || 32,
                h: parseFloat(document.getElementById('swalSheetH').value) || 47
            })
        });
        if (!formData) return;
        this.SHEET_W = formData.w;
        this.SHEET_H = formData.h;
        await this.saveConfig();
        const container = document.getElementById('dpAdminPapersBody')?.closest('.space-y-6')?.parentElement;
        if (container) this.renderAdminPanel(container);
        Swal.fire({ icon: 'success', title: 'تم', text: `مقاس الفرخ: ${this.SHEET_W} × ${this.SHEET_H} سم`, timer: 1200, showConfirmButton: false });
    }
};

window.DigitalPrinting = DigitalPrinting;
