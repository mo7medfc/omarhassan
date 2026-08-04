/**
 * Print Machines — Arabic names + images + linked pricing categories
 * أول ماكينة جاهزة للتسعير: الديجيتال
 */
const PrintMachines = {
    MACHINES: [
        {
            id: 'offset',
            nameAr: 'ماكينة طباعة أوفست',
            image: 'assets/images/machines/offset.jpg',
            pricingCategory: 'Offset',
            ready: true,
            color: '#4f46e5',
            items: []
        },
        {
            id: 'digital',
            nameAr: 'ماكينة طباعة رقمية',
            image: 'assets/images/machines/digital.jpg',
            pricingCategory: 'digital_printing',
            ready: true,
            color: '#7c3aed',
            items: [
                { id: 'business_cards', nameAr: 'كروت شخصية' },
                { id: 'flyers', nameAr: 'فلايرات ومنشورات' },
                { id: 'brochures', nameAr: 'بروشورات' },
                { id: 'posters', nameAr: 'بوسترات' },
                { id: 'certificates', nameAr: 'شهادات تقدير' },
                { id: 'sticker_plastic', nameAr: 'استيكر بلاستيك' },
                { id: 'sticker_paper', nameAr: 'استيكر ورق' },
                { id: 'folders', nameAr: 'فولدرات' }
            ]
        },
        {
            id: 'outdoor',
            nameAr: 'ماكينة طباعة أوت دور',
            image: 'assets/images/machines/outdoor.jpg',
            pricingCategory: 'Outdoor',
            ready: true,
            color: '#ea580c',
            items: []
        },
        {
            id: 'indoor',
            nameAr: 'ماكينة طباعة إن دور',
            image: 'assets/images/machines/indoor.jpg',
            pricingCategory: 'Indoor',
            ready: true,
            color: '#9333ea',
            items: []
        },
        {
            id: 'uv_flatbed',
            nameAr: 'ماكينة طباعة UV فلات بيد',
            image: 'assets/images/machines/uv-flatbed.jpg',
            pricingCategory: 'UVPrinting',
            ready: true,
            color: '#7c3aed',
            items: []
        },
        {
            id: 'sublimation',
            nameAr: 'ماكينة طباعة سبلميشن',
            image: 'assets/images/machines/sublimation.jpg',
            pricingCategory: 'SublimationGift',
            ready: true,
            color: '#c026d3',
            items: []
        },
        {
            id: 'inkjet',
            nameAr: 'طابعة إن جيت',
            image: 'assets/images/machines/inkjet.jpg',
            pricingCategory: 'inkjet_paper_printing',
            ready: true,
            color: '#0ea5e9',
            items: []
        },
        {
            id: 'dtf',
            nameAr: 'ماكينة طباعة DTF',
            image: 'assets/images/machines/dtf.jpg',
            pricingCategory: 'DTF',
            ready: true,
            color: '#db2777',
            items: []
        },
        {
            id: 'uv_dtf',
            nameAr: 'ماكينة طباعة UV DTF',
            image: 'assets/images/machines/uv-dtf.jpg',
            pricingCategory: 'DTF',
            ready: false,
            color: '#be185d',
            items: []
        },
        {
            id: 'stamps',
            nameAr: 'ماكينة أختام',
            image: 'assets/images/machines/stamps.jpg',
            pricingCategory: 'Stamps',
            ready: true,
            color: '#e11d48',
            items: []
        }
    ],

    getAll() {
        return this.MACHINES;
    },

    getById(id) {
        return this.MACHINES.find(m => m.id === id) || null;
    },

    getByPricingCategory(category) {
        return this.MACHINES.find(m => m.pricingCategory === category) || null;
    },

    cardHtml(machine, { onclick } = {}) {
        const click = onclick || (machine.ready && machine.pricingCategory
            ? `PricingAdmin.openMachine('${machine.id}')`
            : `Swal.fire({icon:'info',title:'قريباً',text:'تسعير هذه الماكينة هيظهر قريباً',timer:1800,showConfirmButton:false})`);
        const hasItems = machine.items && machine.items.length;
        const itemsHint = hasItems
            ? `<p class="text-[11px] text-white/80 mt-1">${machine.items.length} بنود تسعير</p>`
            : '';
        const itemsList = hasItems
            ? `<div class="px-3 pb-3 pt-2 bg-white border-t border-gray-100 flex flex-wrap gap-1">
                ${machine.items.map(it => `<span class="text-[10px] font-bold text-gray-600 bg-gray-100 rounded-full px-2 py-0.5">${it.nameAr}</span>`).join('')}
               </div>`
            : '';
        const searchName = [machine.nameAr, ...(machine.items || []).map(i => i.nameAr)].join(' ');
        return `
        <button type="button" onclick="${click}" data-name="${searchName}" class="machine-card group text-right rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2" style="focus-ring-color:${machine.color}">
            <div class="relative aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
                <img src="${machine.image}" alt="${machine.nameAr}" loading="lazy"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                <div class="hidden absolute inset-0 items-center justify-center bg-slate-800">
                    <i class="fas fa-print text-4xl text-white/40"></i>
                </div>
                ${!machine.ready ? `<span class="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">قريباً</span>` : ''}
            </div>
            <div class="px-3 py-3" style="background:linear-gradient(135deg,#0F1B2D,#1a3050)">
                <h4 class="font-extrabold text-sm text-white leading-snug">${machine.nameAr}</h4>
                ${itemsHint}
            </div>
            ${itemsList}
        </button>`;
    },

    galleryHtml() {
        return `
        <div class="mb-10">
            <div class="flex items-center justify-between gap-3 mb-4 px-1">
                <div>
                    <h3 class="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        <i class="fas fa-industry text-violet-600"></i> الماكينات
                    </h3>
                    <p class="text-sm text-gray-500 mt-1">اختر الماكينة للتسعير — التكلفة والبيع</p>
                </div>
                <span class="text-[11px] font-bold text-violet-700 bg-violet-50 px-3 py-1 rounded-full">${this.MACHINES.length} ماكينة</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                ${this.MACHINES.map(m => this.cardHtml(m)).join('')}
            </div>
        </div>`;
    }
};

window.PrintMachines = PrintMachines;
