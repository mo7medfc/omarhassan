// ==========================================
// CustomerSources - Manages customer acquisition sources
// ==========================================
const CustomerSources = {
    _sources: ['فيسبوك', 'انستجرام', 'واتساب', 'زيارة مباشرة', 'توصية عميل', 'جوجل', 'أخرى'],

    loadSources() {
        try {
            const stored = localStorage.getItem('ah_customerSources');
            if (stored) return JSON.parse(stored);
        } catch {}
        return this._sources;
    },

    saveSources(sources) {
        try {
            localStorage.setItem('ah_customerSources', JSON.stringify(sources));
        } catch {}
    },

    getSources() {
        return this.loadSources();
    },

    addSource(name) {
        const sources = this.loadSources();
        if (!sources.includes(name)) {
            sources.push(name);
            this.saveSources(sources);
        }
        return sources;
    },

    removeSource(name) {
        let sources = this.loadSources();
        sources = sources.filter(s => s !== name);
        this.saveSources(sources);
        return sources;
    },

    buildOptionsHTML(selected) {
        const sources = this.loadSources();
        return sources.map(s =>
            `<option value="${s}" ${selected === s ? 'selected' : ''}>${s}</option>`
        ).join('');
    }
};

window.CustomerSources = CustomerSources;
