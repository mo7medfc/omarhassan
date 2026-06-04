// Product Schemas - Part 1: Core + Printing + Banners
const ProductSchemas = {
'Offset': { name:'أوفست', icon:'fa-print', fields:[
  {id:'paperType',label:'نوع الورق',type:'select',required:true,options:[{value:'couche',label:'كوشيه'},{value:'couche_matt',label:'كوشيه مط'},{value:'bristol',label:'بريستول'},{value:'cardboard',label:'كرتون مقوى'},{value:'kraft',label:'كرافت'},{value:'bond',label:'بوند'},{value:'carbonless',label:'كاربون ليس'},{value:'sticker',label:'استيكر'},{value:'other',label:'أخرى'}]},
  {id:'paperWeight',label:'وزن الورق',type:'select',options:[{value:'80',label:'80 جرام'},{value:'100',label:'100 جرام'},{value:'115',label:'115 جرام'},{value:'130',label:'130 جرام'},{value:'150',label:'150 جرام'},{value:'170',label:'170 جرام'},{value:'200',label:'200 جرام'},{value:'250',label:'250 جرام'},{value:'300',label:'300 جرام'},{value:'350',label:'350 جرام'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'A3',label:'A3'},{value:'A4',label:'A4'},{value:'A5',label:'A5'},{value:'A6',label:'A6'},{value:'17x24',label:'17×24 سم'},{value:'20x28',label:'20×28 سم'},{value:'25x35',label:'25×35 سم'},{value:'33x48',label:'33×48 سم'},{value:'35x50',label:'35×50 سم'},{value:'50x70',label:'50×70 سم'},{value:'70x100',label:'70×100 سم'},{value:'custom',label:'مقاس مخصوص'}]},
  {id:'customSize',label:'المقاس المخصوص',type:'text',showIf:{field:'size',value:'custom'},placeholder:'مثال: 22×32'},
  {id:'colors',label:'عدد الألوان',type:'select',required:true,options:[{value:'1_0',label:'1 لون وجه'},{value:'1_1',label:'1 لون وجهين'},{value:'2_0',label:'2 لون وجه'},{value:'2_2',label:'2 لون وجهين'},{value:'4_0',label:'4 لون وجه (فل كلر)'},{value:'4_1',label:'4 لون وجه + 1 ظهر'},{value:'4_4',label:'4 لون وجهين'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:100,step:100,defaultValue:1000},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'lamination_glossy',label:'سلوفان لامع'},{value:'lamination_matt',label:'سلوفان مط'},{value:'uv_spot',label:'سبوت UV'},{value:'uv_full',label:'UV كامل'},{value:'embossing',label:'بصمة'},{value:'foil_gold',label:'فويل ذهبي'},{value:'foil_silver',label:'فويل فضي'},{value:'die_cut',label:'داي كت'},{value:'creasing',label:'بيغ'},{value:'perforation',label:'تخريم'},{value:'numbering',label:'ترقيم'},{value:'folding',label:'طي'},{value:'binding_staple',label:'تدبيس'},{value:'binding_spiral',label:'سلك سبيرال'},{value:'shrink_wrap',label:'شرنك'}]},
  {id:'notes',label:'ملاحظات',type:'textarea',placeholder:'تفاصيل إضافية...'}
]},
'digital_printing': { name:'قسم الدجيتال', icon:'fa-desktop', fields:[
  {id:'printType',label:'نوع الطباعة',type:'select',required:true,options:[{value:'color',label:'ألوان'},{value:'bw',label:'أبيض وأسود'},{value:'large_format',label:'كبيرة الحجم'}]},
  {id:'paperType',label:'نوع الورق',type:'select',options:[{value:'glossy',label:'لامع'},{value:'matt',label:'مط'},{value:'sticker',label:'استيكر'},{value:'transparent',label:'شفاف'},{value:'canvas',label:'كانفس'},{value:'photo_paper',label:'فوتو'},{value:'bond_80',label:'بوند 80g'},{value:'couche_130',label:'كوشيه 130g'},{value:'couche_200',label:'كوشيه 200g'},{value:'couche_300',label:'كوشيه 300g'},{value:'cardboard',label:'كرتون'},{value:'other',label:'أخرى'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'A4',label:'A4'},{value:'A3',label:'A3'},{value:'A3+',label:'A3+'},{value:'SRA3',label:'SRA3'},{value:'custom',label:'مخصوص'}]},
  {id:'customSize',label:'المقاس المخصوص',type:'text',showIf:{field:'size',value:'custom'}},
  {id:'sides',label:'الوجوه',type:'select',options:[{value:'single',label:'وجه'},{value:'double',label:'وجهين'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'lamination_glossy',label:'سلوفان لامع'},{value:'lamination_matt',label:'سلوفان مط'},{value:'rounded_corners',label:'حواف دائرية'},{value:'die_cut',label:'داي كت'},{value:'folding',label:'طي'},{value:'binding',label:'تجليد'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'inkjet_paper_printing': { name:'إنك جيت ورق', icon:'fa-fill-drip', fields:[
  {id:'paperType',label:'نوع الورق',type:'select',required:true,options:[{value:'glossy_photo',label:'فوتو لامع'},{value:'matt_photo',label:'فوتو مط'},{value:'satin',label:'ساتان'},{value:'canvas',label:'كانفس'},{value:'fine_art',label:'فاين آرت'},{value:'backlit',label:'باك لايت'},{value:'sticker_glossy',label:'استيكر لامع'},{value:'sticker_matt',label:'استيكر مط'},{value:'sticker_transparent',label:'استيكر شفاف'},{value:'other',label:'أخرى'}]},
  {id:'width',label:'العرض (سم)',type:'number',required:true,min:1},
  {id:'height',label:'الارتفاع (سم)',type:'number',required:true,min:1},
  {id:'resolution',label:'الدقة',type:'select',options:[{value:'standard',label:'عادية 720dpi'},{value:'high',label:'عالية 1440dpi'},{value:'photo',label:'صور 2880dpi'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'lamination_glossy',label:'سلوفان لامع'},{value:'lamination_matt',label:'سلوفان مط'},{value:'lamination_cold',label:'سلوفان بارد'},{value:'mounting_foam',label:'فوم'},{value:'mounting_kapabond',label:'كابابوند'},{value:'frame',label:'برواز'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'UVPrinting': { name:'طباعة UV', icon:'fa-lightbulb', fields:[
  {id:'material',label:'الخامة',type:'select',required:true,options:[{value:'acrylic',label:'أكريليك'},{value:'wood',label:'خشب MDF'},{value:'metal',label:'معدن'},{value:'glass',label:'زجاج'},{value:'plastic',label:'بلاستيك'},{value:'leather',label:'جلد'},{value:'pvc_foam',label:'فوم PVC'},{value:'phone_case',label:'جراب موبايل'},{value:'other',label:'أخرى'}]},
  {id:'printArea',label:'مساحة الطباعة',type:'select',options:[{value:'A4',label:'A4'},{value:'A3',label:'A3'},{value:'60x90',label:'60×90 سم'},{value:'custom',label:'مخصوص'}]},
  {id:'customSize',label:'المقاس المخصوص',type:'text',showIf:{field:'printArea',value:'custom'}},
  {id:'colorMode',label:'نوع الطباعة',type:'select',options:[{value:'cmyk',label:'ألوان CMYK'},{value:'cmyk_white',label:'ألوان + أبيض'},{value:'cmyk_varnish',label:'ألوان + ورنيش'},{value:'emboss',label:'بارز UV'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'clientMaterial',label:'مصدر الخامة',type:'select',options:[{value:'ours',label:'من عندنا'},{value:'client',label:'من العميل'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'DTF': { name:'طباعة DTF', icon:'fa-fire', fields:[
  {id:'size',label:'المقاس',type:'select',required:true,options:[{value:'A4',label:'A4'},{value:'A3',label:'A3'},{value:'30x42',label:'30×42 سم'},{value:'60x90',label:'60×90 سم'},{value:'meter',label:'بالمتر'},{value:'custom',label:'مخصوص'}]},
  {id:'customSize',label:'المقاس المخصوص',type:'text',showIf:{field:'size',value:'custom'}},
  {id:'filmType',label:'نوع الفيلم',type:'select',options:[{value:'normal',label:'عادي'},{value:'glitter',label:'جليتر'},{value:'neon',label:'نيون'},{value:'reflective',label:'عاكس'},{value:'glow',label:'يضيء بالظلام'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'application',label:'التطبيق',type:'select',options:[{value:'tshirt',label:'تيشيرت'},{value:'hoodie',label:'هودي'},{value:'cap',label:'كاب'},{value:'bag',label:'شنطة'},{value:'other',label:'أخرى'}]},
  {id:'includePress',label:'الكبس الحراري',type:'select',options:[{value:'yes',label:'مع الكبس'},{value:'no',label:'فيلم فقط'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'safety_printing': { name:'سيفتي بالطباعة', icon:'fa-shield-alt', fields:[
  {id:'productType',label:'نوع المنتج',type:'select',required:true,options:[{value:'vest',label:'سترة سيفتي'},{value:'helmet_sticker',label:'استيكر خوذة'},{value:'id_card',label:'كارنيه عمل'},{value:'sign',label:'لوحة سلامة'},{value:'sticker',label:'استيكر سيفتي'},{value:'banner',label:'بانر سيفتي'},{value:'other',label:'أخرى'}]},
  {id:'printMethod',label:'طريقة الطباعة',type:'select',options:[{value:'screen',label:'سلك سكرين'},{value:'dtf',label:'DTF'},{value:'vinyl',label:'فينيل حراري'},{value:'sublimation',label:'سبلميشن'},{value:'digital',label:'ديجيتال'}]},
  {id:'size',label:'المقاس',type:'text',placeholder:'المقاس المطلوب'},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'Outdoor': { name:'الأوت دور', icon:'fa-sun', fields:[
  {id:'material',label:'نوع الخامة',type:'select',required:true,options:[{value:'flex_front',label:'فليكس فرونت لايت'},{value:'flex_back',label:'فليكس باك لايت'},{value:'vinyl',label:'فينيل'},{value:'mesh',label:'ميش (شبك)'},{value:'one_way',label:'وان واي فيجن'},{value:'reflective',label:'عاكس'},{value:'canvas',label:'كانفس خارجي'},{value:'sticker_vinyl',label:'استيكر فينيل'},{value:'perforated',label:'مثقب'}]},
  {id:'width',label:'العرض (متر)',type:'number',required:true,min:0.1,step:0.01},
  {id:'height',label:'الارتفاع (متر)',type:'number',required:true,min:0.1,step:0.01},
  {id:'resolution',label:'دقة الطباعة',type:'select',options:[{value:'eco',label:'إيكو سولفنت'},{value:'solvent',label:'سولفنت'},{value:'uv',label:'UV'},{value:'latex',label:'لاتكس'}]},
  {id:'quantity',label:'عدد النسخ',type:'number',required:true,min:1,defaultValue:1},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'eyelets',label:'عيون (أوتار)'},{value:'hemming',label:'خياطة أطراف'},{value:'pocket',label:'جيب لماسورة'},{value:'welding',label:'لحام حراري'},{value:'frame_wood',label:'برواز خشب'},{value:'frame_metal',label:'برواز حديد'},{value:'frame_aluminum',label:'برواز ألمنيوم'},{value:'led_backlight',label:'إضاءة LED'}]},
  {id:'installation',label:'التركيب',type:'select',options:[{value:'no',label:'بدون'},{value:'yes',label:'مع التركيب'},{value:'delivery_only',label:'توصيل فقط'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'Indoor': { name:'الإندور', icon:'fa-home', fields:[
  {id:'material',label:'نوع الخامة',type:'select',required:true,options:[{value:'photo_paper',label:'ورق فوتو'},{value:'pp_paper',label:'ورق PP'},{value:'canvas',label:'كانفس'},{value:'backlit_film',label:'فيلم باك لايت'},{value:'frosted',label:'ساند بلاست'},{value:'sticker',label:'استيكر داخلي'},{value:'wallpaper',label:'ورق حائط'},{value:'fabric',label:'قماش'},{value:'self_adhesive',label:'لاصق ذاتي'}]},
  {id:'width',label:'العرض (سم)',type:'number',required:true,min:1},
  {id:'height',label:'الارتفاع (سم)',type:'number',required:true,min:1},
  {id:'quantity',label:'عدد النسخ',type:'number',required:true,min:1,defaultValue:1},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'lamination_glossy',label:'سلوفان لامع'},{value:'lamination_matt',label:'سلوفان مط'},{value:'lamination_cold',label:'سلوفان بارد'},{value:'mounting_foam',label:'فوم بورد'},{value:'mounting_kapabond',label:'كابابوند'},{value:'frame_wood',label:'برواز خشب'},{value:'frame_aluminum',label:'برواز ألمنيوم'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'Stands': { name:'الاستندات', icon:'fa-columns', fields:[
  {id:'standType',label:'نوع الاستاند',type:'select',required:true,options:[{value:'roll_up_80',label:'رول أب 80×200'},{value:'roll_up_100',label:'رول أب 100×200'},{value:'roll_up_120',label:'رول أب 120×200'},{value:'roll_up_150',label:'رول أب 150×200'},{value:'x_banner_60',label:'X بانر 60×160'},{value:'x_banner_80',label:'X بانر 80×180'},{value:'popup',label:'بوب أب'},{value:'spider',label:'سبايدر'},{value:'gate',label:'جيت بانر'},{value:'L_stand',label:'L ستاند'},{value:'a_frame',label:'A فريم'},{value:'poster_stand',label:'بوستر ستاند'},{value:'counter',label:'كاونتر'},{value:'fabric_stand',label:'استاند قماش'}]},
  {id:'quality',label:'الجودة',type:'select',options:[{value:'economy',label:'اقتصادي'},{value:'standard',label:'ستاندرد'},{value:'premium',label:'بريميوم'}]},
  {id:'printSides',label:'أوجه الطباعة',type:'select',options:[{value:'single',label:'وجه'},{value:'double',label:'وجهين'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'bag',label:'شنطة حمل',type:'select',options:[{value:'no',label:'بدون'},{value:'yes',label:'مع شنطة'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'Tableaux': { name:'تابلوهات', icon:'fa-image', fields:[
  {id:'material',label:'الخامة',type:'select',required:true,options:[{value:'canvas',label:'كانفس'},{value:'acrylic',label:'أكريليك'},{value:'mdf',label:'خشب MDF'},{value:'glass',label:'زجاج'},{value:'foam',label:'فوم بورد'},{value:'metal',label:'معدن'},{value:'fabric',label:'قماش'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'20x30',label:'20×30 سم'},{value:'30x40',label:'30×40 سم'},{value:'40x60',label:'40×60 سم'},{value:'50x70',label:'50×70 سم'},{value:'60x90',label:'60×90 سم'},{value:'70x100',label:'70×100 سم'},{value:'80x120',label:'80×120 سم'},{value:'100x150',label:'100×150 سم'},{value:'custom',label:'مخصوص'}]},
  {id:'customSize',label:'المقاس المخصوص',type:'text',showIf:{field:'size',value:'custom'}},
  {id:'pieces',label:'عدد القطع',type:'select',options:[{value:'1',label:'قطعة'},{value:'2',label:'قطعتين'},{value:'3',label:'3 قطع'},{value:'4',label:'4 قطع'},{value:'5',label:'5 قطع'}]},
  {id:'frameType',label:'البرواز',type:'select',options:[{value:'none',label:'بدون'},{value:'wooden_thick',label:'خشب سميك'},{value:'wooden_thin',label:'خشب رفيع'},{value:'aluminum',label:'ألمنيوم'},{value:'floating',label:'فلوتينج'},{value:'shadow_box',label:'شادو بوكس'}]},
  {id:'quantity',label:'عدد الطقوم',type:'number',required:true,min:1,defaultValue:1},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'Flag': { name:'أعلام', icon:'fa-flag', fields:[
  {id:'flagType',label:'نوع العلم',type:'select',required:true,options:[{value:'feather',label:'ريشة (فيذر)'},{value:'teardrop',label:'قطرة'},{value:'rectangle',label:'مستطيل'},{value:'table_flag',label:'علم مكتبي'},{value:'car_flag',label:'علم سيارة'},{value:'custom',label:'شكل مخصوص'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'S',label:'صغير 2م'},{value:'M',label:'وسط 3م'},{value:'L',label:'كبير 4م'},{value:'XL',label:'كبير جداً 5م'},{value:'custom',label:'مخصوص'}]},
  {id:'material',label:'الخامة',type:'select',options:[{value:'polyester',label:'بوليستر'},{value:'satin',label:'ساتان'},{value:'mesh',label:'شبك'},{value:'nylon',label:'نايلون'}]},
  {id:'printSides',label:'الطباعة',type:'select',options:[{value:'single',label:'وجه'},{value:'double',label:'وجهين'},{value:'through',label:'نفاذ'}]},
  {id:'pole',label:'العمود/القاعدة',type:'select',options:[{value:'none',label:'بدون'},{value:'pole_ground',label:'عمود أرضي'},{value:'cross_base',label:'قاعدة صليب'},{value:'water_base',label:'قاعدة مياه'},{value:'wall_mount',label:'حائط'},{value:'table_base',label:'مكتبية'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'cladding_letters': { name:'كلادينج و حروف', icon:'fa-building', fields:[
  {id:'productType',label:'نوع المنتج',type:'select',required:true,options:[{value:'cladding_sign',label:'لوحة كلادينج'},{value:'channel_letters',label:'حروف بارزة'},{value:'acrylic_letters',label:'حروف أكريليك'},{value:'metal_letters',label:'حروف ستانلس'},{value:'neon_flex',label:'نيون فليكس'},{value:'led_sign',label:'لوحة LED'},{value:'totem',label:'توتم'},{value:'box_sign',label:'لايت بوكس'}]},
  {id:'width',label:'العرض (متر)',type:'number',min:0.1,step:0.01},
  {id:'height',label:'الارتفاع (متر)',type:'number',min:0.1,step:0.01},
  {id:'material',label:'خامة الكلادينج',type:'select',options:[{value:'alucobond',label:'ألوكوبوند'},{value:'galvanized',label:'مجلفن'},{value:'acrylic',label:'أكريليك'},{value:'stainless',label:'ستانلس'},{value:'copper',label:'نحاس'}]},
  {id:'lighting',label:'الإضاءة',type:'select',options:[{value:'none',label:'بدون'},{value:'front_led',label:'أمامية LED'},{value:'back_led',label:'خلفية LED'},{value:'side_led',label:'جانبية'},{value:'neon',label:'نيون'}]},
  {id:'installation',label:'التركيب',type:'select',options:[{value:'no',label:'بدون'},{value:'yes',label:'مع التركيب'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'notes',label:'ملاحظات',type:'textarea',placeholder:'النص المطلوب / تفاصيل...'}
]}
};
window.ProductSchemas = ProductSchemas;
