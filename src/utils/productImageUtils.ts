/**
 * Downloads an external HTTP/HTTPS image URL and converts it into a Base64 Data URI string
 * so it is stored 100% locally in the database and included offline in JSON backups.
 */
export async function ensureImageAsBase64(imageUrl: string): Promise<string> {
  if (!imageUrl || imageUrl.startsWith('data:image/')) {
    return imageUrl;
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      // 1. Try local proxy endpoint first (avoids CORS issues)
      const proxyRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json.dataUri) {
          return json.dataUri;
        }
      }
    } catch (e) {
      console.warn('Proxy image convert warning:', e);
    }

    try {
      // 2. Fallback to direct client fetch
      const res = await fetch(imageUrl, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        return await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || imageUrl);
          reader.onerror = () => resolve(imageUrl);
          reader.readAsDataURL(blob);
        });
      }
    } catch (err) {
      console.warn('Direct image convert warning:', err);
    }
  }

  return imageUrl;
}

/**
 * Matches keywords in Arabic, French, and English (e.g. "إفري 1 لتر" -> Water bottle, "كوكاكولا" -> Soda, "حليب كانديا" -> Milk, etc.)
 * Provides high-quality images with instant offline SVG vector fallback and interactive suggestion selection.
 */

export interface GroceryImageItem {
  id: string;
  name: string;
  keywords: string[];
  url: string;
  category: string;
  emoji: string;
  bgColor: string;
  textColor: string;
}

// Curated comprehensive grocery database of realistic supermarket items with reliable Unsplash CDNs
export const GROCERY_IMAGE_LIBRARY: GroceryImageItem[] = [
  // ==================== المشروبات والماء ====================
  {
    id: 'water_bottle_1',
    name: 'قارورة ماء معدني (إفري / سعيدة / للا خديجة)',
    keywords: ['إفري', 'افري', 'ifri', 'سعيدة', 'saida', 'للا خديجة', 'ماء', 'eau', 'water', 'معدني', 'منيرال', 'قرورة ماء', 'مياه', 'guedila', 'قديلا'],
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80',
    category: 'مشروبات وعصائر',
    emoji: '💧',
    bgColor: '#E0F2FE',
    textColor: '#0369A1',
  },
  {
    id: 'water_glass_pack',
    name: 'ماء نقي معبأ / حزمة قوارير',
    keywords: ['حزمة ماء', 'باك ماء', 'pack eau', 'ماء 5 لتر', 'بيدون ماء', 'ماء نقي'],
    url: 'https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=400&q=80',
    category: 'مشروبات وعصائر',
    emoji: '🧊',
    bgColor: '#E0F2FE',
    textColor: '#0284C7',
  },
  {
    id: 'coca_cola_can',
    name: 'كوكاكولا / كولا (علبة معدنية)',
    keywords: ['كوكا', 'كوكاكولا', 'coca', 'coca cola', 'كولا', 'cola', 'مشروب غازي'],
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80',
    category: 'مشروبات وعصائر',
    emoji: '🥤',
    bgColor: '#FEE2E2',
    textColor: '#B91C1C',
  },
  {
    id: 'pepsi_can',
    name: 'بيبسي / بيبسي كولا',
    keywords: ['بيبسي', 'pepsi', 'pepsi cola'],
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80',
    category: 'مشروبات وعصائر',
    emoji: '🥤',
    bgColor: '#DBEAFE',
    textColor: '#1D4ED8',
  },
  {
    id: 'hamoud_selecto',
    name: 'حمود بوعلام / سيلكتو / مشروب غازي جزائري',
    keywords: ['حمود', 'حمود بوعلام', 'hamoud', 'سيلكتو', 'selecto', 'gazouz', 'قازوز', 'ليمونادا', 'بلانش', 'سليم'],
    url: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=400&q=80',
    category: 'مشروبات وعصائر',
    emoji: '🍾',
    bgColor: '#FEF3C7',
    textColor: '#92400E',
  },
  {
    id: 'fanta_orange_soda',
    name: 'فانتا / مشروب غازي برتقال',
    keywords: ['فانتا', 'fanta', 'صودا برتقال', 'ميراندا', 'mirinda', 'قازوز برتقال', 'شريحة'],
    url: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?auto=format&fit=crop&w=400&q=80',
    category: 'مشروبات وعصائر',
    emoji: '🍊',
    bgColor: '#FFEDD5',
    textColor: '#C2410C',
  },
  {
    id: 'fruit_juice_orange',
    name: 'عصير برتقال طبيعي (رامي / رويبة / نقاوس)',
    keywords: ['عصير', 'jus', 'juice', 'رامي', 'rami', 'رويبة', 'rouiba', 'نقاوس', 'تروبيكانا', 'tropicana', 'عصير برتقال', 'عصير فواكه'],
    url: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=400&q=80',
    category: 'مشروبات وعصائر',
    emoji: '🧃',
    bgColor: '#FFEDD5',
    textColor: '#EA580C',
  },
  {
    id: 'fruit_juice_apple_cocktail',
    name: 'عصير تفاح / كوكتيل فواكه مشكلة',
    keywords: ['عصير تفاح', 'كوكتيل', 'cocktail', 'عصير مشكل', 'ifruit', 'إفروي'],
    url: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=400&q=80',
    category: 'مشروبات وعصائر',
    emoji: '🍹',
    bgColor: '#FEF08A',
    textColor: '#A16207',
  },
  {
    id: 'energy_drink',
    name: 'مشروب طاقة (ريد بول / مونستر / باور)',
    keywords: ['مشروب طاقة', 'energy drink', 'red bull', 'ريد بول', 'monster', 'مونستر', 'power'],
    url: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=400&q=80',
    category: 'مشروبات وعصائر',
    emoji: '⚡',
    bgColor: '#FEE2E2',
    textColor: '#991B1B',
  },

  // ==================== الألبان والأجبان ====================
  {
    id: 'milk_pack_candia',
    name: 'حليب كانديا معقم / علبة حليب UHT',
    keywords: ['حليب', 'lait', 'milk', 'كانديا', 'candia', 'كونديا', 'حليب بقر', 'حليب كامل الدسم', 'حليب معقم'],
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    category: 'ألبان وأجبان',
    emoji: '🥛',
    bgColor: '#F1F5F9',
    textColor: '#334155',
  },
  {
    id: 'pasteurized_milk_bag',
    name: 'شكارة حليب مبستر / لبن طازج / رايب',
    keywords: ['شكارة حليب', 'حليب مبستر', 'لبن', 'رايب', 'lben', 'rayeb', 'حليب الشكارة'],
    url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
    category: 'ألبان وأجبان',
    emoji: '🥛',
    bgColor: '#F8FAFC',
    textColor: '#475569',
  },
  {
    id: 'yogurt_pots_pack',
    name: 'ياغورت دانون / صومام / زبادي بنكهات',
    keywords: ['ياغورت', 'زبادي', 'yogurt', 'yaourt', 'صومام', 'soummam', 'دانون', 'danone', 'كريم ديسير', 'موز ياغورت', 'فراولة ياغورت', 'بتي سويس'],
    url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80',
    category: 'ألبان وأجبان',
    emoji: '🍧',
    bgColor: '#FCE7F3',
    textColor: '#BE185D',
  },
  {
    id: 'cheese_portions_box',
    name: 'جبن مثلثات (لافاش كيري / كيري / بربر)',
    keywords: ['جبن', 'fromage', 'cheese', 'لافاش', 'كيري', 'kiri', 'مثلثات', 'بربر', 'berbere', 'تارتينو', 'tartino', 'جبن طري'],
    url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=400&q=80',
    category: 'ألبان وأجبان',
    emoji: '🧀',
    bgColor: '#FEF3C7',
    textColor: '#B45309',
  },
  {
    id: 'cheese_cheddar_gouda',
    name: 'جبن أحمر / شيدر / غودا / موزاريلا مبشورة',
    keywords: ['شيدر', 'cheddar', 'غودا', 'gouda', 'موزاريلا', 'mozzarella', 'جبن احمر', 'فرماج روج', 'بارميزان', 'جبن مبشور'],
    url: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?auto=format&fit=crop&w=400&q=80',
    category: 'ألبان وأجبان',
    emoji: '🧀',
    bgColor: '#FEF08A',
    textColor: '#A16207',
  },
  {
    id: 'butter_margarine',
    name: 'زبدة طازجة / مارغرين لابيل / صول',
    keywords: ['زبدة', 'beurre', 'butter', 'مارغرين', 'margarine', 'لابيل', 'labelle', 'صول', 'sol', 'فلوريال', 'سمن', 'مدينة'],
    url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=400&q=80',
    category: 'ألبان وأجبان',
    emoji: '🧈',
    bgColor: '#FEF9C3',
    textColor: '#854D0E',
  },
  {
    id: 'fresh_eggs_plate',
    name: 'طبق بيض طازج (بلاطو بيض 30 حبة)',
    keywords: ['بيض', 'oeufs', 'eggs', 'بيضة', 'بلاطو بيض', 'طبق بيض', 'بيض عرب'],
    url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80',
    category: 'ألبان وأجبان',
    emoji: '🥚',
    bgColor: '#FEF3C7',
    textColor: '#B45309',
  },

  // ==================== الزيوت والمواد الغذائية الأساسية ====================
  {
    id: 'cooking_oil_bottle',
    name: 'زيت المائدة (إيليو 5 لتر / عافية / سيم)',
    keywords: ['زيت', 'huile', 'oil', 'إيليو', 'ايليو', 'elio', 'عافية', 'afia', 'سولين', 'زيت نباتي', 'زيت قلي', 'زيت المائدة'],
    url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
    category: 'زيوت وسكريات وتوابل',
    emoji: '🫒',
    bgColor: '#FEF9C3',
    textColor: '#854D0E',
  },
  {
    id: 'olive_oil_extra_virgin',
    name: 'زيت زيتون بكر ممتاز جزائري',
    keywords: ['زيت زيتون', 'huile d olive', 'olive oil', 'زيت قبايل', 'زيت بكر'],
    url: 'https://images.unsplash.com/photo-1471193945509-9ad0617afabf?auto=format&fit=crop&w=400&q=80',
    category: 'زيوت وسكريات وتوابل',
    emoji: '🫒',
    bgColor: '#ECFCCB',
    textColor: '#4D7C0F',
  },
  {
    id: 'sugar_bag_pack',
    name: 'سكر أبيض ناعم / قطع سكر سيفيتال',
    keywords: ['سكر', 'sucre', 'sugar', 'سيفيتال', 'cevital', 'سكر حبيبات', 'سكر قطع', 'سكر بودرة'],
    url: 'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&w=400&q=80',
    category: 'زيوت وسكريات وتوابل',
    emoji: '🧂',
    bgColor: '#F8FAFC',
    textColor: '#475569',
  },
  {
    id: 'table_salt_pack',
    name: 'ملح طعام يودي مكرر',
    keywords: ['ملح', 'sel', 'salt', 'ملح طعام', 'ملح مكرر'],
    url: 'https://images.unsplash.com/photo-1626197031507-c17099753214?auto=format&fit=crop&w=400&q=80',
    category: 'زيوت وسكريات وتوابل',
    emoji: '🧂',
    bgColor: '#F1F5F9',
    textColor: '#334155',
  },
  {
    id: 'spices_and_seasonings',
    name: 'توابل مشكلة / رأس الحانوت / فلفل أسود',
    keywords: ['توابل', 'بهارات', 'epices', 'spices', 'راس الحانوت', 'فلفل اسود', 'كمون', 'كركم', 'قرفة', 'زعفران', 'بابريكا', 'فلفل عكري'],
    url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80',
    category: 'زيوت وسكريات وتوابل',
    emoji: '🌶️',
    bgColor: '#FFEDD5',
    textColor: '#C2410C',
  },

  // ==================== البقوليات والمعجنات ====================
  {
    id: 'flour_bag_sim',
    name: 'فرينة فاخرة سيم / ماما 1 كغ و 5 كغ',
    keywords: ['فرينة', 'دقيق', 'farine', 'flour', 'سيم', 'sim', 'ماما', 'mama', 'عمر بن عمر', 'طحين'],
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    category: 'مواد غذائية عامة وبقوليات',
    emoji: '🌾',
    bgColor: '#FEF3C7',
    textColor: '#92400E',
  },
  {
    id: 'semolina_bag_durum',
    name: 'سميد متوسط ودقيق القمح الصلب',
    keywords: ['سميد', 'semoule', 'semolina', 'سميد رقيق', 'سميد خشين', 'سميد متوسط', 'دقيق قمح'],
    url: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=400&q=80',
    category: 'مواد غذائية عامة وبقوليات',
    emoji: '🌾',
    bgColor: '#FEF3C7',
    textColor: '#B45309',
  },
  {
    id: 'couscous_traditional_pack',
    name: 'كسكس جزائري (عمر بن عمر / سيم / ماما)',
    keywords: ['كسكس', 'couscous', 'طعام', 'كسكسي', 'عمر بن عمر', 'كسكس متوسط', 'كسكس رقيق', 'بربوشة'],
    url: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=400&q=80',
    category: 'مواد غذائية عامة وبقوليات',
    emoji: '🍲',
    bgColor: '#FEF3C7',
    textColor: '#B45309',
  },
  {
    id: 'pasta_spaghetti_pack',
    name: 'مقرونة / سباغيتي / معكرونة ريشة',
    keywords: ['مقرونة', 'معكرونة', 'سباغيتي', 'spaghetti', 'pasta', 'ريشة', 'شعرية', 'شوربة', 'دويدة', 'تليتلي', 'لسان طير', 'كوكيليت'],
    url: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=400&q=80',
    category: 'مواد غذائية عامة وبقوليات',
    emoji: '🍝',
    bgColor: '#FEF08A',
    textColor: '#854D0E',
  },
  {
    id: 'rice_basmati_grain',
    name: 'أرز بسمتي / أرز مفور حبة طويلة',
    keywords: ['أرز', 'ارز', 'riz', 'rice', 'بسمتي', 'روز', 'ارز مفور', 'ارز ابيض'],
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
    category: 'مواد غذائية عامة وبقوليات',
    emoji: '🍚',
    bgColor: '#F1F5F9',
    textColor: '#475569',
  },
  {
    id: 'lentils_and_legumes',
    name: 'عدس / لوبيا يابسة / حمص حب',
    keywords: ['عدس', 'lentilles', 'lentils', 'لوبيا', 'حمص', 'فول', 'بقوليات', 'جلبانة يابسة', 'حمص مصلوق'],
    url: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=400&q=80',
    category: 'مواد غذائية عامة وبقوليات',
    emoji: '🥣',
    bgColor: '#FED7AA',
    textColor: '#9A3412',
  },

  // ==================== المعلبات والمصبرات ====================
  {
    id: 'tomato_paste_can',
    name: 'طماطم مصبرة (عمور / جابور / كاب)',
    keywords: ['طماطم مصبرة', 'معجون طماطم', 'صلصة طماطم', 'tomato paste', 'sauce tomate', 'طماطم علب', 'عمور', 'amor benamor', 'كاب', 'cab', 'حارة'],
    url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80',
    category: 'معلبات ومصبرات',
    emoji: '🥫',
    bgColor: '#FEE2E2',
    textColor: '#991B1B',
  },
  {
    id: 'canned_tuna_oil',
    name: 'تونة بالزيت النباتي / تونة طماطم (إيزابيل / ماريو)',
    keywords: ['تونة', 'thon', 'tuna', 'سردين', 'sardine', 'سمك معلب', 'طونة', 'ايزابيل', 'isabel', 'تونة زيت', 'تونة طماطم'],
    url: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?auto=format&fit=crop&w=400&q=80',
    category: 'معلبات ومصبرات',
    emoji: '🐟',
    bgColor: '#E0E7FF',
    textColor: '#3730A3',
  },
  {
    id: 'harissa_can_jar',
    name: 'هريسة حارة مصبرة / صلصة فلفل',
    keywords: ['هريسة', 'harissa', 'فلفل حار', 'صلصة حارة', 'هريسة دياري'],
    url: 'https://images.unsplash.com/photo-1588165171080-c89acfa5ee83?auto=format&fit=crop&w=400&q=80',
    category: 'معلبات ومصبرات',
    emoji: '🌶️',
    bgColor: '#FEE2E2',
    textColor: '#B91C1C',
  },
  {
    id: 'mayonnaise_mustard_jar',
    name: 'مايونيز / خردل / كيتشاب صوص',
    keywords: ['مايونيز', 'mayonnaise', 'خردل', 'moutarde', 'mustard', 'كاتشب', 'ketchup', 'كيتشاب', 'صلصة برجر', 'صوص الجبن'],
    url: 'https://images.unsplash.com/photo-1585238342024-78d387f4a707?auto=format&fit=crop&w=400&q=80',
    category: 'معلبات ومصبرات',
    emoji: '🧴',
    bgColor: '#FEF9C3',
    textColor: '#854D0E',
  },
  {
    id: 'olives_pickles_jar',
    name: 'زيتون أخضر / أسود / مخللات مشكلة',
    keywords: ['زيتون', 'olives', 'مخلل', 'كورنيشون', 'زيتون اخضر', 'زيتون اسود', 'زيتون منزوع النواة'],
    url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?auto=format&fit=crop&w=400&q=80',
    category: 'معلبات ومصبرات',
    emoji: '🫒',
    bgColor: '#ECFCCB',
    textColor: '#3F6212',
  },

  // ==================== القهوة والشاي والمخبوزات والحلويات ====================
  {
    id: 'ground_coffee_famico',
    name: 'قهوة مطحونة (فاميكو / بون / الفارس)',
    keywords: ['قهوة', 'café', 'coffee', 'فاميكو', 'famico', 'بون', 'bon', 'بن', 'إسبريسو', 'نسكافيه', 'nescafe', 'قهوة فاميكو', 'قهوة سريعة'],
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
    category: 'مخبوزات وحلويات',
    emoji: '☕',
    bgColor: '#ECE0D1',
    textColor: '#4A2C11',
  },
  {
    id: 'green_black_tea_lipton',
    name: 'شاي أخضر جزائري / شاي ليبتون أسود',
    keywords: ['شاي', 'thé', 'tea', 'ليبتون', 'lipton', 'تاي', 'شاي اخضر', 'شاي احمر', 'شاي الصحراء', 'شاي الصمان', 'نعناع'],
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
    category: 'مخبوزات وحلويات',
    emoji: '🍵',
    bgColor: '#DCFCE7',
    textColor: '#166534',
  },
  {
    id: 'biscuit_bimo_major',
    name: 'بسكويت بيمو (ماجور / برينس / قوفريط)',
    keywords: ['بسكويت', 'biscuit', 'بيمو', 'bimo', 'ماجور', 'major', 'كوفريط', 'قوفريط', 'gaufrette', 'cookies', 'ميراندا', 'كوكيز'],
    url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80',
    category: 'مخبوزات وحلويات',
    emoji: '🍪',
    bgColor: '#FED7AA',
    textColor: '#9A3412',
  },
  {
    id: 'chocolate_bar_maxon',
    name: 'شوكولاتة ماكسون / نوتيلا / شوكولا للدهن',
    keywords: ['شوكولا', 'chocolat', 'chocolate', 'ماكسون', 'maxon', 'نوتيلا', 'nutella', 'تويلا', 'twirla', 'كيندر', 'kinder', 'شوكولاتة'],
    url: 'https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=400&q=80',
    category: 'مخبوزات وحلويات',
    emoji: '🍫',
    bgColor: '#3E2723',
    textColor: '#EFEBE9',
  },
  {
    id: 'potato_chips_pack',
    name: 'شيبس مقرمشات (مهراس / لايز / دوريتوس)',
    keywords: ['شيبس', 'chips', 'رقائق', 'سناك', 'مقرمشات', 'مهراس', 'chips potato', 'لايز', 'doritos'],
    url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80',
    category: 'مخبوزات وحلويات',
    emoji: '🥔',
    bgColor: '#FEF08A',
    textColor: '#A16207',
  },
  {
    id: 'fresh_baguette_bread',
    name: 'خبز باغات طازج / مطلوع تقليدي / بريوش',
    keywords: ['خبز', 'pain', 'bread', 'باغات', 'باغيت', 'baguette', 'مطلوع', 'كسرة', 'خبز الدار', 'بريوش', 'كرواسون', 'croissant'],
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    category: 'مخبوزات وحلويات',
    emoji: '🥖',
    bgColor: '#FFEDD5',
    textColor: '#9A3412',
  },

  // ==================== الخضر والفواكه (بالميزان) ====================
  {
    id: 'fresh_red_tomatoes',
    name: 'طماطم طازجة حمراء (بالميزان)',
    keywords: ['طماطم طازجة', 'طماطم حب', 'طماطم سلطة', 'tomate', 'طماطم'],
    url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🍅',
    bgColor: '#FEE2E2',
    textColor: '#DC2626',
  },
  {
    id: 'fresh_potatoes_sack',
    name: 'بطاطا طازجة محلية (بالميزان)',
    keywords: ['بطاطا', 'بطاطس', 'pomme de terre', 'potato', 'بطاطا بيضاء', 'بطاطا حمراء'],
    url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🥔',
    bgColor: '#FEF3C7',
    textColor: '#78350F',
  },
  {
    id: 'fresh_onions_dry',
    name: 'بصل جاف أحمر / أبيض (بالميزان)',
    keywords: ['بصل', 'oignon', 'onion', 'بصل يابس', 'بصل اخضر'],
    url: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🧅',
    bgColor: '#EDE9FE',
    textColor: '#6D28D9',
  },
  {
    id: 'fresh_carrots_bunch',
    name: 'جزر طازج / زرودية (بالميزان)',
    keywords: ['جزر', 'carotte', 'carrot', 'زرودية', 'سنارية'],
    url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🥕',
    bgColor: '#FFEDD5',
    textColor: '#C2410C',
  },
  {
    id: 'fresh_apples_red_yellow',
    name: 'تفاح محلي / مستورد (بالميزان)',
    keywords: ['تفاح', 'pomme', 'apple', 'تفاح احمر', 'تفاح اصفر', 'تفاح اخضر', 'غولدن'],
    url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🍎',
    bgColor: '#FEE2E2',
    textColor: '#B91C1C',
  },
  {
    id: 'fresh_bananas_cluster',
    name: 'موز إكوادور طازج (بالميزان)',
    keywords: ['موز', 'banane', 'banana', 'بنان', 'موز كافنديش'],
    url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🍌',
    bgColor: '#FEF08A',
    textColor: '#854D0E',
  },
  {
    id: 'fresh_oranges_citrus',
    name: 'برتقال طومسون / ليمون قارص (بالميزان)',
    keywords: ['برتقال', 'orange', 'تشينة', 'ليمون', 'citron', 'lemon', 'قارص', 'مندرين', 'يوسفي', 'حمضيات'],
    url: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🍊',
    bgColor: '#FFEDD5',
    textColor: '#EA580C',
  },
  {
    id: 'fresh_deglet_noor_dates',
    name: 'تمر دقلة نور بسكرة الفاخر',
    keywords: ['تمر', 'dattes', 'dates', 'دقلة', 'دقلة نور', 'غرس', 'رطب'],
    url: 'https://images.unsplash.com/photo-1587393855524-087f83d95bc9?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🌴',
    bgColor: '#FEF3C7',
    textColor: '#78350F',
  },
  {
    id: 'fresh_poultry_chicken',
    name: 'دجاج طازج كامل / إسكالوب صدر دجاج',
    keywords: ['دجاج', 'poulet', 'chicken', 'إسكالوب', 'اسكالوب', 'escalope', 'صدر دجاج', 'فخذ دجاج', 'كويس', 'بولي'],
    url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🍗',
    bgColor: '#FEF2F2',
    textColor: '#991B1B',
  },
  {
    id: 'fresh_red_meat_beef',
    name: 'لحم بقري طازج / لحم غنم / مفروم (كفتة)',
    keywords: ['لحم', 'viande', 'meat', 'بقري', 'غنمي', 'كفتة', 'مفروم', 'ستيك', 'هبرة'],
    url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=400&q=80',
    category: 'خضر وفواكه (بالميزان)',
    emoji: '🥩',
    bgColor: '#FEE2E2',
    textColor: '#991B1B',
  },

  // ==================== مواد التنظيف والمستلزمات المنزلية ====================
  {
    id: 'dishwashing_liquid_isis',
    name: 'سائل غسيل الأواني (إيزيس / بريل / فيري)',
    keywords: ['إيزيس', 'ايزيس', 'isis', 'غسيل اواني', 'سائل غسيل', 'صابون سائل', 'بريل', 'pril', 'فيري', 'fairy'],
    url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=400&q=80',
    category: 'منظفات ومستلزمات منزلية',
    emoji: '🧼',
    bgColor: '#E0F2FE',
    textColor: '#0369A1',
  },
  {
    id: 'laundry_detergent_powder',
    name: 'مسحوق غسيل الملابس (أومو / أريال / بونكس)',
    keywords: ['أومو', 'اومو', 'omo', 'اريال', 'ariel', 'بونكس', 'bonux', 'مسحوق غسيل', 'غسالة', 'تيد', 'lessive'],
    url: 'https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=400&q=80',
    category: 'منظفات ومستلزمات منزلية',
    emoji: '🧺',
    bgColor: '#DBEAFE',
    textColor: '#1E40AF',
  },
  {
    id: 'bleach_javel_bottle',
    name: 'ماء جافيل معقم / منظف أرضيات',
    keywords: ['جافيل', 'javel', 'ماء جافيل', 'كلور', 'برافو', 'bravo', 'منظف ارضيات', 'ديتول', 'معقم'],
    url: 'https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?auto=format&fit=crop&w=400&q=80',
    category: 'منظفات ومستلزمات منزلية',
    emoji: '🧴',
    bgColor: '#E0E7FF',
    textColor: '#4338CA',
  },
  {
    id: 'toilet_paper_tissues',
    name: 'ورق تواليت / مناديل ورقية / سيلولوز',
    keywords: ['ورق تواليت', 'مناديل', 'كلينكس', 'tissues', 'papier toilette', 'رولور', 'محرقة', 'حفاظات'],
    url: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=400&q=80',
    category: 'منظفات ومستلزمات منزلية',
    emoji: '🧻',
    bgColor: '#F8FAFC',
    textColor: '#475569',
  },
  {
    id: 'shampoo_and_body_soap',
    name: 'شامبو شعر / صابون استحمام معطر',
    keywords: ['شامبو', 'shampoo', 'صابون', 'savon', 'soap', 'دوف', 'dove', 'بالموليف', 'لوكس', 'جل استحمام'],
    url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=400&q=80',
    category: 'منظفات ومستلزمات منزلية',
    emoji: '🧴',
    bgColor: '#FDF2F8',
    textColor: '#9D174D',
  },
];

/**
 * Clean & normalize string for Arabic/French keyword matching
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ئ|ؤ/g, 'ء')
    .replace(/[٠-٩]/g, '')
    .replace(/[0-9]/g, '')
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate a lightweight, self-contained SVG Data URI for an item when offline
 */
export function generateOfflineProductSvg(name: string, category: string = ''): string {
  const normName = normalizeText(name);
  const matchedItem = GROCERY_IMAGE_LIBRARY.find((item) =>
    item.keywords.some((k) => normName.includes(normalizeText(k)))
  );

  const bgColor = matchedItem ? matchedItem.bgColor : '#F1F5F9';
  const textColor = matchedItem ? matchedItem.textColor : '#1E293B';
  const emoji = matchedItem ? matchedItem.emoji : '🛍️';
  const shortName = (name || 'منتج').slice(0, 16);

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="${bgColor}" rx="16"/>
    <circle cx="100" cy="80" r="46" fill="#FFFFFF" opacity="0.9"/>
    <text x="100" y="94" font-size="44" text-anchor="middle" dominant-baseline="central">${emoji}</text>
    <rect x="14" y="142" width="172" height="42" fill="#FFFFFF" rx="10" opacity="0.95"/>
    <text x="100" y="166" font-size="13" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${shortName}</text>
  </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Intelligent primary image finder for any product name.
 */
export function getSmartProductImage(name: string, category: string = ''): string {
  if (!name) return generateOfflineProductSvg('منتج');

  const norm = normalizeText(name);

  // 1. Direct keyword match
  for (const item of GROCERY_IMAGE_LIBRARY) {
    for (const kw of item.keywords) {
      if (norm.includes(normalizeText(kw))) {
        return item.url;
      }
    }
  }

  // 2. Category match
  if (category) {
    const normCat = normalizeText(category);
    const catMatch = GROCERY_IMAGE_LIBRARY.find((item) =>
      normalizeText(item.category).includes(normCat) || normCat.includes(normalizeText(item.category))
    );
    if (catMatch) return catMatch.url;
  }

  // 3. Fallback
  return generateOfflineProductSvg(name, category);
}

/**
 * Return ranked suggestions for a given product name with match scores
 * Returns multiple matching options so the user can easily select!
 */
export function getSmartImageSuggestions(name: string, category: string = ''): GroceryImageItem[] {
  const normName = normalizeText(name);
  const normCat = normalizeText(category);

  if (!normName && !normCat) {
    // Return top popular items
    return GROCERY_IMAGE_LIBRARY.slice(0, 8);
  }

  // Score each item in library
  const scored = GROCERY_IMAGE_LIBRARY.map((item) => {
    let score = 0;

    // Check keyword exact / partial matches
    for (const kw of item.keywords) {
      const normKw = normalizeText(kw);
      if (normName === normKw) {
        score += 100;
      } else if (normName.includes(normKw)) {
        score += 50 + normKw.length;
      } else if (normKw.includes(normName) && normName.length > 2) {
        score += 30;
      }
    }

    // Check name match
    if (normalizeText(item.name).includes(normName)) {
      score += 40;
    }

    // Category boost
    if (category && item.category === category) {
      score += 15;
    } else if (normCat && normalizeText(item.category).includes(normCat)) {
      score += 10;
    }

    return { item, score };
  });

  // Filter items with score > 0 or matching category, sort descending
  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.item);

  if (matches.length > 0) {
    return matches.slice(0, 10);
  }

  // If no match found by name, return items from the same category
  if (category) {
    const catItems = GROCERY_IMAGE_LIBRARY.filter((item) => item.category === category);
    if (catItems.length > 0) {
      return catItems.slice(0, 8);
    }
  }

  // General fallback: return top diverse picks
  return GROCERY_IMAGE_LIBRARY.slice(0, 6);
}

/**
 * Backward compatible alias for suggestions
 */
export function getMatchingImageSuggestions(name: string): { label: string; url: string; emoji: string }[] {
  const suggestions = getSmartImageSuggestions(name);
  return suggestions.map((s) => ({
    label: s.name,
    url: s.url,
    emoji: s.emoji,
  }));
}
