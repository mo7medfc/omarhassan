// ==========================================
// BranchService - Branch Management
// ==========================================
const BranchService = {
    STORAGE_KEY: 'makram_branch',
    _currentBranchId: null,
    _branches: [],

    async ensureDefaultBranch() {
        try {
            const snap = await db.collection('branches').doc('default').get();
            if (!snap.exists) {
                await db.collection('branches').doc('default').set({
                    id: 'default',
                    name: 'الفرع الرئيسي',
                    createdAt: new Date().toISOString()
                });
            }
        } catch (e) {
            console.warn('BranchService: Could not ensure default branch', e);
        }
    },

    getCurrentBranchId() {
        if (this._currentBranchId) return this._currentBranchId;
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) { this._currentBranchId = stored; return stored; }
        } catch {}
        return 'default';
    },

    setCurrentBranch(id) {
        this._currentBranchId = id;
        try { localStorage.setItem(this.STORAGE_KEY, id); } catch {}
    },

    async getBranches() {
        try {
            const snap = await db.collection('branches').get();
            this._branches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
            this._branches = [{ id: 'default', name: 'الفرع الرئيسي' }];
        }
        return this._branches;
    }
};

window.BranchService = BranchService;
