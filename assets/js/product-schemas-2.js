// Product Schemas - Part 2: Cards, Bags, Gifts
Object.assign(ProductSchemas, {
'BusinessCard': { name:'كروت شخصية', icon:'fa-address-card', fields:[
  {id:'cardType',label:'نوع الكارت',type:'select',required:true,options:[{value:'standard',label:'كارت عادي'},{value:'special',label:'سبيشيال'},{value:'transparent',label:'شفاف PVC'},{value:'metal',label:'معدني'},{value:'wooden',label:'خشبي'},{value:'nfc',label:'NFC ذكي'}]},
  {id:'paperType',label:'نوع الورق',type:'select',options:[{value:'couche_300',label:'كوشيه 300g'},{value:'couche_350',label:'كوشيه 350g'},{value:'bristol',label:'بريستول'},{value:'linen',label:'كتان'},{value:'cotton',label:'قطن'},{value:'craft',label:'كرافت'},{value:'velvet',label:'قطيفة'},{value:'other',label:'أخرى'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'9x5',label:'ستاندرد 9×5 سم'},{value:'8.5x5.5',label:'8.5×5.5 سم'},{value:'square',label:'مربع'},{value:'mini',label:'ميني'},{value:'folded',label:'مطوي (دبل)'},{value:'custom',label:'مخصوص'}]},
  {id:'colors',label:'الألوان',type:'select',options:[{value:'4_0',label:'فل كلر وجه'},{value:'4_4',label:'فل كلر وجهين'},{value:'4_1',label:'فل كلر وجه + 1 ظهر'},{value:'1_0',label:'1 لون وجه'},{value:'1_1',label:'1 لون وجهين'}]},
  {id:'quantity',label:'الكمية',type:'select',required:true,options:[{value:'100',label:'100'},{value:'200',label:'200'},{value:'250',label:'250'},{value:'500',label:'500'},{value:'1000',label:'1000'},{value:'2000',label:'2000'},{value:'5000',label:'5000'},{value:'custom',label:'كمية مخصوصة'}]},
  {id:'customQty',label:'الكمية المخصوصة',type:'number',showIf:{field:'quantity',value:'custom'},min:1},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'lamination_glossy',label:'سلوفان لامع'},{value:'lamination_matt',label:'سلوفان مط'},{value:'soft_touch',label:'سوفت تاتش'},{value:'spot_uv',label:'سبوت UV'},{value:'foil_gold',label:'فويل ذهبي'},{value:'foil_silver',label:'فويل فضي'},{value:'embossing',label:'بصمة بارزة'},{value:'debossing',label:'بصمة غائرة'},{value:'rounded_corners',label:'حواف دائرية'},{value:'die_cut',label:'شكل مخصوص'},{value:'edge_color',label:'تلوين الحواف'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'IDCard': { name:'الكارنيهات', icon:'fa-id-badge', fields:[
  {id:'cardType',label:'نوع الكارنيه',type:'select',required:true,options:[{value:'pvc',label:'PVC بلاستيك'},{value:'paper_laminated',label:'ورقي مغلف'},{value:'smart',label:'ذكي (شريحة)'},{value:'rfid',label:'RFID'},{value:'nfc',label:'NFC'}]},
  {id:'sides',label:'الطباعة',type:'select',options:[{value:'single',label:'وجه'},{value:'double',label:'وجهين'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'accessories',label:'الإكسسوارات',type:'checkbox_group',options:[{value:'lanyard',label:'شريط رقبة'},{value:'clip',label:'مشبك'},{value:'holder',label:'حامل بلاستيك'},{value:'retractable',label:'يويو'},{value:'custom_lanyard',label:'لانيارد مطبوع'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'Envelopes': { name:'المظاريف', icon:'fa-envelope', fields:[
  {id:'size',label:'المقاس',type:'select',required:true,options:[{value:'A4',label:'A4 كبير'},{value:'A5',label:'A5 وسط'},{value:'DL',label:'DL طويل'},{value:'C5',label:'C5'},{value:'C4',label:'C4'},{value:'square',label:'مربع'},{value:'custom',label:'مخصوص'}]},
  {id:'paperType',label:'نوع الورق',type:'select',options:[{value:'bond_100',label:'بوند 100g'},{value:'bond_120',label:'بوند 120g'},{value:'couche_130',label:'كوشيه 130g'},{value:'kraft',label:'كرافت'},{value:'linen',label:'كتان'},{value:'cotton',label:'قطن'}]},
  {id:'colors',label:'الألوان',type:'select',options:[{value:'1_0',label:'1 لون'},{value:'2_0',label:'2 لون'},{value:'4_0',label:'فل كلر'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:100,step:100,defaultValue:500},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'foil',label:'هوت فويل'},{value:'embossing',label:'بصمة'},{value:'peel_seal',label:'لاصق ذاتي'},{value:'window',label:'نافذة شفافة'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'Stamps': { name:'الأختام', icon:'fa-stamp', fields:[
  {id:'stampType',label:'نوع الختم',type:'select',required:true,options:[{value:'self_inking',label:'ذاتي الحبر (أوتوماتيك)'},{value:'pre_inked',label:'ختم فلاش'},{value:'rubber_wood',label:'مطاط (خشب)'},{value:'pocket',label:'ختم جيب'},{value:'dater',label:'ختم تاريخ'},{value:'numbering',label:'ختم ترقيم'},{value:'dry_seal',label:'ختم بارز (نافر)'},{value:'wax',label:'ختم شمع'}]},
  {id:'shape',label:'الشكل',type:'select',options:[{value:'rectangle',label:'مستطيل'},{value:'round',label:'دائري'},{value:'square',label:'مربع'},{value:'oval',label:'بيضاوي'},{value:'custom',label:'مخصوص'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'small',label:'صغير'},{value:'medium',label:'وسط'},{value:'large',label:'كبير'},{value:'xlarge',label:'كبير جداً'}]},
  {id:'inkColor',label:'لون الحبر',type:'select',options:[{value:'blue',label:'أزرق'},{value:'red',label:'أحمر'},{value:'black',label:'أسود'},{value:'green',label:'أخضر'},{value:'violet',label:'بنفسجي'},{value:'multi',label:'متعدد'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'notes',label:'ملاحظات',type:'textarea',placeholder:'النص المطلوب / عدد الأسطر...'}
]},
'brochures': { name:'البرشورات', icon:'fa-book-open', fields:[
  {id:'size',label:'المقاس المفتوح',type:'select',required:true,options:[{value:'A4',label:'A4'},{value:'A3',label:'A3'},{value:'A5',label:'A5'},{value:'DL',label:'DL'},{value:'custom',label:'مخصوص'}]},
  {id:'folds',label:'الطيات',type:'select',options:[{value:'2',label:'نصف (طية)'},{value:'3',label:'ثلاثي (طيتين)'},{value:'4',label:'رباعي (3 طيات)'},{value:'z',label:'Z فولد'},{value:'gate',label:'جيت فولد'},{value:'accordion',label:'أكورديون'}]},
  {id:'paperType',label:'نوع الورق',type:'select',options:[{value:'couche_130',label:'كوشيه 130g'},{value:'couche_150',label:'كوشيه 150g'},{value:'couche_170',label:'كوشيه 170g'},{value:'couche_200',label:'كوشيه 200g'},{value:'couche_250',label:'كوشيه 250g'},{value:'couche_300',label:'كوشيه 300g'},{value:'other',label:'أخرى'}]},
  {id:'colors',label:'الألوان',type:'select',options:[{value:'4_4',label:'فل كلر وجهين'},{value:'4_0',label:'فل كلر وجه'},{value:'4_1',label:'فل كلر + 1 ظهر'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:100,step:100,defaultValue:1000},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'lamination_glossy',label:'سلوفان لامع'},{value:'lamination_matt',label:'سلوفان مط'},{value:'spot_uv',label:'سبوت UV'},{value:'foil',label:'هوت فويل'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'catalogs': { name:'الكتالوجات', icon:'fa-swatchbook', fields:[
  {id:'size',label:'المقاس',type:'select',required:true,options:[{value:'A4',label:'A4'},{value:'A5',label:'A5'},{value:'17x24',label:'17×24 سم'},{value:'20x20',label:'20×20 مربع'},{value:'custom',label:'مخصوص'}]},
  {id:'pages',label:'عدد الصفحات',type:'number',required:true,min:4,step:4,defaultValue:16,placeholder:'مضاعفات 4'},
  {id:'coverPaper',label:'ورق الغلاف',type:'select',options:[{value:'couche_250',label:'كوشيه 250g'},{value:'couche_300',label:'كوشيه 300g'},{value:'couche_350',label:'كوشيه 350g'},{value:'cardboard',label:'كرتون مقوى'},{value:'linen',label:'كتان'}]},
  {id:'innerPaper',label:'ورق الداخلي',type:'select',options:[{value:'couche_115',label:'كوشيه 115g'},{value:'couche_130',label:'كوشيه 130g'},{value:'couche_150',label:'كوشيه 150g'},{value:'couche_170',label:'كوشيه 170g'},{value:'bond_80',label:'بوند 80g'}]},
  {id:'binding',label:'التجليد',type:'select',options:[{value:'saddle_stitch',label:'تدبيس'},{value:'perfect_binding',label:'لصق حراري'},{value:'spiral',label:'سلك سبيرال'},{value:'hardcover',label:'هارد كوفر'},{value:'wire_o',label:'واير أو'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:100},
  {id:'finishing',label:'تشطيب الغلاف',type:'checkbox_group',options:[{value:'lamination_glossy',label:'سلوفان لامع'},{value:'lamination_matt',label:'سلوفان مط'},{value:'spot_uv',label:'سبوت UV'},{value:'foil',label:'هوت فويل'},{value:'embossing',label:'بصمة'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'annual_ads': { name:'دعاية سنوية', icon:'fa-calendar-alt', fields:[
  {id:'productType',label:'نوع المنتج',type:'select',required:true,options:[{value:'wall_calendar',label:'نتيجة حائط'},{value:'desk_calendar',label:'نتيجة مكتب'},{value:'pocket_calendar',label:'نتيجة جيب'},{value:'planner',label:'بلانر'},{value:'diary',label:'أجندة'},{value:'flyer',label:'فلاير'},{value:'poster',label:'بوستر'},{value:'folder',label:'فولدر'},{value:'notebook',label:'نوت بوك'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'A4',label:'A4'},{value:'A5',label:'A5'},{value:'A6',label:'A6'},{value:'custom',label:'مخصوص'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:100},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'lamination',label:'سلوفان'},{value:'foil',label:'هوت فويل'},{value:'spot_uv',label:'سبوت UV'},{value:'embossing',label:'بصمة'},{value:'spiral',label:'سلك سبيرال'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'notebooks_invoices': { name:'دفاتر وفواتير', icon:'fa-book', fields:[
  {id:'productType',label:'نوع المنتج',type:'select',required:true,options:[{value:'invoice_book',label:'دفتر فواتير'},{value:'receipt_book',label:'دفتر إيصالات'},{value:'notebook',label:'نوت بوك'},{value:'notepad',label:'بلوك نوت'},{value:'carbonless',label:'دفتر كاربون ليس'},{value:'forms',label:'نماذج / فورم'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'A4',label:'A4'},{value:'A5',label:'A5'},{value:'A6',label:'A6'},{value:'custom',label:'مخصوص'}]},
  {id:'copies',label:'عدد النسخ / الطبقات',type:'select',options:[{value:'1',label:'نسخة واحدة'},{value:'2',label:'نسختين (أصل + صورة)'},{value:'3',label:'3 نسخ'}]},
  {id:'sheets',label:'عدد الورقات',type:'select',options:[{value:'25',label:'25 ورقة'},{value:'50',label:'50 ورقة'},{value:'100',label:'100 ورقة'}]},
  {id:'numbering',label:'ترقيم',type:'select',options:[{value:'yes',label:'مع ترقيم'},{value:'no',label:'بدون'}]},
  {id:'quantity',label:'عدد الدفاتر',type:'number',required:true,min:1,defaultValue:10},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'paper_bags': { name:'شنط ورقية', icon:'fa-shopping-bag', fields:[
  {id:'size',label:'المقاس',type:'select',required:true,options:[{value:'small',label:'صغير 15×20'},{value:'medium',label:'وسط 25×30'},{value:'large',label:'كبير 30×40'},{value:'xlarge',label:'كبير جداً 35×45'},{value:'custom',label:'مخصوص'}]},
  {id:'customSize',label:'المقاس (عرض×ارتفاع×عمق)',type:'text',showIf:{field:'size',value:'custom'}},
  {id:'paperType',label:'نوع الورق',type:'select',options:[{value:'couche_200',label:'كوشيه 200g'},{value:'couche_250',label:'كوشيه 250g'},{value:'couche_300',label:'كوشيه 300g'},{value:'kraft_white',label:'كرافت أبيض'},{value:'kraft_brown',label:'كرافت بني'},{value:'cardboard',label:'كرتون'}]},
  {id:'handle',label:'نوع اليد',type:'select',options:[{value:'ribbon',label:'شريط ساتان'},{value:'rope',label:'حبل قطن'},{value:'flat',label:'مسطحة'},{value:'twisted',label:'ملفوفة'},{value:'die_cut',label:'مقصوصة'},{value:'none',label:'بدون'}]},
  {id:'colors',label:'الطباعة',type:'select',options:[{value:'4_0',label:'فل كلر'},{value:'1_0',label:'1 لون'},{value:'2_0',label:'2 لون'},{value:'none',label:'بدون'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:100,step:100,defaultValue:500},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'lamination_glossy',label:'سلوفان لامع'},{value:'lamination_matt',label:'سلوفان مط'},{value:'spot_uv',label:'سبوت UV'},{value:'foil',label:'هوت فويل'},{value:'embossing',label:'بصمة'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'kraft_bags': { name:'شنط كرافت', icon:'fa-bag-shopping', fields:[
  {id:'size',label:'المقاس',type:'select',required:true,options:[{value:'small',label:'صغير'},{value:'medium',label:'وسط'},{value:'large',label:'كبير'},{value:'custom',label:'مخصوص'}]},
  {id:'color',label:'لون الكرافت',type:'select',options:[{value:'brown',label:'بني'},{value:'white',label:'أبيض'},{value:'black',label:'أسود'}]},
  {id:'printing',label:'الطباعة',type:'select',options:[{value:'screen_1',label:'سلك 1 لون'},{value:'screen_2',label:'سلك 2 لون'},{value:'digital',label:'ديجيتال'},{value:'foil',label:'هوت فويل'},{value:'sticker',label:'استيكر'},{value:'none',label:'بدون'}]},
  {id:'handle',label:'اليد',type:'select',options:[{value:'twisted',label:'ملفوفة'},{value:'flat',label:'مسطحة'},{value:'ribbon',label:'شريط'},{value:'die_cut',label:'مقصوصة'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:50,defaultValue:200},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'plastic_bags': { name:'شنط بلاستيك', icon:'fa-recycle', fields:[
  {id:'bagType',label:'نوع الشنطة',type:'select',required:true,options:[{value:'loop_handle',label:'يد لوب'},{value:'die_cut',label:'يد مقصوصة'},{value:'zip_lock',label:'زيب لوك'},{value:'soft_loop',label:'يد ناعمة'},{value:'patch_handle',label:'يد باتش'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'small',label:'صغير'},{value:'medium',label:'وسط'},{value:'large',label:'كبير'},{value:'custom',label:'مخصوص'}]},
  {id:'printing',label:'الطباعة',type:'select',options:[{value:'screen_1',label:'1 لون'},{value:'screen_2',label:'2 لون'},{value:'full_color',label:'فل كلر'},{value:'none',label:'بدون'}]},
  {id:'material',label:'نوع البلاستيك',type:'select',options:[{value:'ldpe',label:'LDPE ناعم'},{value:'hdpe',label:'HDPE مقرمش'},{value:'biodegradable',label:'قابل للتحلل'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:100,defaultValue:1000},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'FabricBag': { name:'شنط قماش', icon:'fa-suitcase', fields:[
  {id:'fabric',label:'نوع القماش',type:'select',required:true,options:[{value:'canvas',label:'كانفس'},{value:'non_woven',label:'نون وفن'},{value:'cotton',label:'قطن'},{value:'jute',label:'جوت (خيش)'},{value:'polyester',label:'بوليستر'},{value:'denim',label:'جينز'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'small',label:'صغير 25×30'},{value:'medium',label:'وسط 30×40'},{value:'large',label:'كبير 40×45'},{value:'tote',label:'توت باج 35×40'},{value:'custom',label:'مخصوص'}]},
  {id:'printMethod',label:'طريقة الطباعة',type:'select',options:[{value:'screen',label:'سلك سكرين'},{value:'dtf',label:'DTF'},{value:'sublimation',label:'سبلميشن'},{value:'embroidery',label:'تطريز'},{value:'vinyl',label:'فينيل حراري'},{value:'none',label:'بدون'}]},
  {id:'colors',label:'ألوان الطباعة',type:'select',options:[{value:'1',label:'1 لون'},{value:'2',label:'2 لون'},{value:'3',label:'3 ألوان'},{value:'full',label:'فل كلر'}]},
  {id:'closure',label:'الإغلاق',type:'select',options:[{value:'none',label:'بدون'},{value:'button',label:'زرار'},{value:'zipper',label:'سوستة'},{value:'magnetic',label:'مغناطيس'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:50,defaultValue:100},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'boxes': { name:'البوكسات', icon:'fa-box-open', fields:[
  {id:'boxType',label:'نوع البوكس',type:'select',required:true,options:[{value:'tuck_end',label:'بوكس عادي'},{value:'sleeve',label:'سليف'},{value:'rigid',label:'صلب (ريجيد)'},{value:'corrugated',label:'كرتون مضلع'},{value:'pillow',label:'بيلو بوكس'},{value:'drawer',label:'درج'},{value:'magnetic',label:'مغناطيسي'},{value:'display',label:'بوكس عرض'},{value:'food',label:'بوكس طعام'},{value:'cake',label:'بوكس كيك'}]},
  {id:'size',label:'المقاس (ط×ع×إ) سم',type:'text',required:true,placeholder:'مثال: 20×15×10'},
  {id:'material',label:'الخامة',type:'select',options:[{value:'cardboard_300',label:'كرتون 300g'},{value:'cardboard_350',label:'كرتون 350g'},{value:'corrugated_e',label:'مضلع E'},{value:'corrugated_b',label:'مضلع B'},{value:'rigid',label:'ريجيد سميك'},{value:'kraft',label:'كرافت'}]},
  {id:'printing',label:'الطباعة',type:'select',options:[{value:'offset_full',label:'أوفست فل كلر'},{value:'digital',label:'ديجيتال'},{value:'screen_1',label:'سلك 1 لون'},{value:'sticker',label:'استيكر'},{value:'none',label:'بدون'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:50,defaultValue:200},
  {id:'finishing',label:'التشطيبات',type:'checkbox_group',options:[{value:'lamination_glossy',label:'سلوفان لامع'},{value:'lamination_matt',label:'سلوفان مط'},{value:'spot_uv',label:'سبوت UV'},{value:'foil',label:'هوت فويل'},{value:'embossing',label:'بصمة'},{value:'window',label:'نافذة شفافة'},{value:'insert',label:'حشوة داخلية'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'shipping_flyers_clear_bags': { name:'فلاير شحن وأكياس', icon:'fa-truck-fast', fields:[
  {id:'productType',label:'نوع المنتج',type:'select',required:true,options:[{value:'shipping_flyer',label:'فلاير شحن'},{value:'poly_mailer',label:'أكياس شحن'},{value:'bubble_mailer',label:'أكياس فقاعات'},{value:'clear_bag',label:'أكياس شفافة'},{value:'opp_bag',label:'أكياس OPP'},{value:'shrink_wrap',label:'شرنك'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'small',label:'صغير'},{value:'medium',label:'وسط'},{value:'large',label:'كبير'},{value:'custom',label:'مخصوص'}]},
  {id:'printing',label:'الطباعة',type:'select',options:[{value:'printed',label:'مطبوع'},{value:'sticker',label:'استيكر'},{value:'none',label:'بدون'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:100,defaultValue:500},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'TShirt': { name:'تيشرتات', icon:'fa-shirt', fields:[
  {id:'shirtType',label:'نوع التيشرت',type:'select',required:true,options:[{value:'round_neck',label:'رقبة دائرية'},{value:'v_neck',label:'رقبة V'},{value:'polo',label:'بولو'},{value:'hoodie',label:'هودي'},{value:'sweatshirt',label:'سويت شيرت'},{value:'tank_top',label:'تانك توب'},{value:'long_sleeve',label:'كم طويل'},{value:'kids',label:'أطفال'}]},
  {id:'material',label:'الخامة',type:'select',options:[{value:'cotton',label:'قطن 100%'},{value:'polyester',label:'بوليستر'},{value:'cotton_poly',label:'قطن/بوليستر'},{value:'dry_fit',label:'دراي فيت'}]},
  {id:'color',label:'لون التيشرت',type:'select',options:[{value:'white',label:'أبيض'},{value:'black',label:'أسود'},{value:'navy',label:'كحلي'},{value:'gray',label:'رمادي'},{value:'red',label:'أحمر'},{value:'other',label:'آخر'}]},
  {id:'sizes',label:'المقاسات والأعداد',type:'text',placeholder:'مثال: 2S, 3M, 5L, 2XL'},
  {id:'printMethod',label:'طريقة الطباعة',type:'select',options:[{value:'dtf',label:'DTF'},{value:'screen',label:'سلك سكرين'},{value:'sublimation',label:'سبلميشن'},{value:'vinyl',label:'فينيل حراري'},{value:'embroidery',label:'تطريز'},{value:'direct',label:'DTG مباشرة'}]},
  {id:'printArea',label:'مكان الطباعة',type:'checkbox_group',options:[{value:'front',label:'الصدر'},{value:'back',label:'الظهر'},{value:'sleeve_r',label:'كم أيمن'},{value:'sleeve_l',label:'كم أيسر'},{value:'pocket',label:'الجيب'},{value:'full_front',label:'أمام كامل'},{value:'full_back',label:'ظهر كامل'}]},
  {id:'quantity',label:'الكمية الإجمالية',type:'number',required:true,min:1,defaultValue:10},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'SublimationGift': { name:'هدايا سبلميشن', icon:'fa-gift', fields:[
  {id:'productType',label:'نوع المنتج',type:'select',required:true,options:[{value:'mug_white',label:'مج أبيض'},{value:'mug_magic',label:'مج ماجيك (حراري)'},{value:'mug_inner_color',label:'مج لون داخلي'},{value:'plate',label:'طبق'},{value:'puzzle',label:'بازل'},{value:'cushion',label:'مخدة'},{value:'mouse_pad',label:'ماوس باد'},{value:'keychain',label:'ميدالية'},{value:'photo_frame',label:'برواز صور'},{value:'phone_case',label:'جراب موبايل'},{value:'water_bottle',label:'مطارة مياه'},{value:'thermos',label:'ترمس'},{value:'rock_photo',label:'صخرة فوتو'},{value:'crystal',label:'كريستال'},{value:'other',label:'أخرى'}]},
  {id:'printSize',label:'مساحة الطباعة',type:'select',options:[{value:'small',label:'صغير'},{value:'medium',label:'وسط'},{value:'large',label:'كبير'},{value:'full_wrap',label:'لف كامل'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:1},
  {id:'packaging',label:'التغليف',type:'select',options:[{value:'none',label:'بدون'},{value:'box',label:'علبة'},{value:'gift_wrap',label:'تغليف هدايا'},{value:'foam_box',label:'علبة فوم'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'promotional_gifts': { name:'هدايا ترويجية', icon:'fa-gifts', fields:[
  {id:'productType',label:'نوع المنتج',type:'select',required:true,options:[{value:'pen',label:'أقلام'},{value:'usb',label:'فلاشة USB'},{value:'power_bank',label:'باور بانك'},{value:'notebook',label:'نوت بوك'},{value:'bag',label:'شنطة'},{value:'keychain',label:'ميدالية'},{value:'cap',label:'كاب'},{value:'umbrella',label:'شمسية'},{value:'magnet',label:'مغناطيس'},{value:'coaster',label:'كوستر'},{value:'sticker_roll',label:'رول استيكر'},{value:'lanyard',label:'لانيارد'},{value:'other',label:'أخرى'}]},
  {id:'printMethod',label:'طريقة الطباعة',type:'select',options:[{value:'screen',label:'سلك سكرين'},{value:'laser',label:'ليزر'},{value:'uv',label:'UV'},{value:'pad',label:'باد برنت'},{value:'embroidery',label:'تطريز'},{value:'sticker',label:'استيكر'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:50},
  {id:'packaging',label:'التغليف',type:'select',options:[{value:'none',label:'بدون'},{value:'box',label:'علبة'},{value:'pouch',label:'حقيبة'},{value:'gift_wrap',label:'تغليف هدايا'}]},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'ZikrMedal': { name:'مداليات أذكار', icon:'fa-medal', fields:[
  {id:'material',label:'الخامة',type:'select',required:true,options:[{value:'metal_gold',label:'معدن ذهبي'},{value:'metal_silver',label:'معدن فضي'},{value:'metal_copper',label:'معدن نحاسي'},{value:'acrylic',label:'أكريليك'},{value:'wood',label:'خشب'},{value:'resin',label:'ريزن'}]},
  {id:'shape',label:'الشكل',type:'select',options:[{value:'circle',label:'دائري'},{value:'rectangle',label:'مستطيل'},{value:'heart',label:'قلب'},{value:'oval',label:'بيضاوي'},{value:'custom',label:'مخصوص'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'small',label:'صغير 3 سم'},{value:'medium',label:'وسط 4 سم'},{value:'large',label:'كبير 5 سم'}]},
  {id:'chain',label:'السلسلة',type:'select',options:[{value:'keychain',label:'ميدالية مفاتيح'},{value:'necklace',label:'سلسلة رقبة'},{value:'car_mirror',label:'مرآة سيارة'},{value:'none',label:'بدون'}]},
  {id:'printMethod',label:'طريقة الطباعة',type:'select',options:[{value:'laser',label:'ليزر'},{value:'uv',label:'UV'},{value:'embossed',label:'بارز'},{value:'epoxy',label:'إيبوكسي'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:50},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'acrylic_badge': { name:'اكريلك و باج', icon:'fa-gem', fields:[
  {id:'productType',label:'نوع المنتج',type:'select',required:true,options:[{value:'badge_pin',label:'باج بدبوس'},{value:'badge_magnet',label:'باج مغناطيس'},{value:'acrylic_keychain',label:'ميدالية أكريليك'},{value:'acrylic_stand',label:'ستاند أكريليك'},{value:'acrylic_sign',label:'لوحة أكريليك'},{value:'acrylic_award',label:'درع أكريليك'},{value:'name_badge',label:'بطاقة اسم'}]},
  {id:'shape',label:'الشكل',type:'select',options:[{value:'circle',label:'دائري'},{value:'rectangle',label:'مستطيل'},{value:'custom',label:'شكل مخصوص'}]},
  {id:'size',label:'المقاس',type:'text',placeholder:'مثال: 5×3 سم'},
  {id:'printMethod',label:'الطباعة',type:'select',options:[{value:'uv',label:'UV'},{value:'laser',label:'ليزر'},{value:'sticker',label:'استيكر'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:10},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'card_rosary': { name:'كارت بسبحة', icon:'fa-hands-praying', fields:[
  {id:'cardType',label:'نوع الكارت',type:'select',required:true,options:[{value:'pvc',label:'PVC'},{value:'paper',label:'ورقي مغلف'},{value:'metal',label:'معدني'},{value:'wood',label:'خشبي'}]},
  {id:'rosaryType',label:'نوع السبحة',type:'select',options:[{value:'crystal',label:'كريستال'},{value:'wood',label:'خشب'},{value:'plastic',label:'بلاستيك'},{value:'stone',label:'حجر'},{value:'pearl',label:'لؤلؤ'}]},
  {id:'rosaryColor',label:'لون السبحة',type:'select',options:[{value:'transparent',label:'شفاف'},{value:'white',label:'أبيض'},{value:'green',label:'أخضر'},{value:'black',label:'أسود'},{value:'blue',label:'أزرق'},{value:'mixed',label:'مشكل'}]},
  {id:'beads',label:'عدد الخرزات',type:'select',options:[{value:'33',label:'33 خرزة'},{value:'99',label:'99 خرزة'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:50},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'cup_quran_bags': { name:'كوباية–مصاحف–شنط', icon:'fa-mug-hot', fields:[
  {id:'productType',label:'نوع المنتج',type:'select',required:true,options:[{value:'paper_cup',label:'كوباية ورقية'},{value:'plastic_cup',label:'كوباية بلاستيك'},{value:'quran_small',label:'مصحف صغير'},{value:'quran_pocket',label:'مصحف جيب'},{value:'quran_cover',label:'غلاف مصحف'},{value:'prayer_rug',label:'سجادة صلاة'},{value:'charity_bag',label:'شنطة صدقة'},{value:'ramadan_bag',label:'شنطة رمضان'}]},
  {id:'printing',label:'الطباعة',type:'select',options:[{value:'screen',label:'سلك سكرين'},{value:'sticker',label:'استيكر'},{value:'offset',label:'أوفست'},{value:'digital',label:'ديجيتال'},{value:'foil',label:'هوت فويل'},{value:'none',label:'بدون'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'small',label:'صغير'},{value:'medium',label:'وسط'},{value:'large',label:'كبير'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:100},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]},
'ruler_frames': { name:'برواز مسطرة', icon:'fa-ruler-combined', fields:[
  {id:'material',label:'الخامة',type:'select',required:true,options:[{value:'plastic',label:'بلاستيك'},{value:'metal',label:'معدن'},{value:'wood',label:'خشب'},{value:'acrylic',label:'أكريليك'}]},
  {id:'size',label:'المقاس',type:'select',options:[{value:'15cm',label:'15 سم'},{value:'20cm',label:'20 سم'},{value:'30cm',label:'30 سم'},{value:'custom',label:'مخصوص'}]},
  {id:'printMethod',label:'الطباعة',type:'select',options:[{value:'screen',label:'سلك سكرين'},{value:'uv',label:'UV'},{value:'pad',label:'باد برنت'},{value:'laser',label:'ليزر'}]},
  {id:'quantity',label:'الكمية',type:'number',required:true,min:1,defaultValue:100},
  {id:'notes',label:'ملاحظات',type:'textarea'}
]}
});
