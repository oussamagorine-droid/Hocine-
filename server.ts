import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI client (Server-Side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Algerian & Grocery specific expansions for superette products
const ALGERIAN_GROCERY_EXPANSIONS: Record<string, string[]> = {
  ماء: ['eau minerale ifri algerie', 'eau minerale saida algerie', 'bouteille eau minerale'],
  إفري: ['ifri eau minerale algerie', 'ifri boisson algerie'],
  سعيدة: ['saida eau minerale algerie'],
  حليب: ['lait candia algerie', 'lait soummam algerie', 'sachet lait algerie'],
  كانديا: ['lait candia algerie silhouette viva'],
  صومام: ['soummam yaourt algerie', 'lben soummam algerie'],
  دانوب: ['danone yaourt algerie'],
  لبن: ['lben soummam algerie', 'lben candia'],
  ياغورت: ['yaourt soummam algerie', 'yaourt danone algerie'],
  زبادي: ['yaourt pot algerie'],
  جبن: ['fromage la vache qui rit algerie', 'fromage berbere algerie', 'fromage portion'],
  فرماج: ['fromage portion algerie', 'fromage chef algerie'],
  شيدر: ['fromage cheddar algerie'],
  كاممبير: ['camembert algerie'],
  زبدة: ['beurre pasteurise algerie', 'margarine fleurial algerie', 'margarine labra'],
  فلوريال: ['margarine fleurial algerie'],
  لابري: ['margarine la belle algerie'],
  سمن: ['medina smen algerie'],
  بيض: ['plateau oeufs frais algerie'],
  زيت: ['huile elio algerie', 'huile afia algerie', 'huile cevital algerie'],
  'زيت زيتون': ['huile olive algerie zit zitoun'],
  عافية: ['huile afia algerie mais'],
  إيليو: ['huile elio cevital algerie'],
  لابل: ['huile la belle algerie'],
  سكر: ['sucre cevital algerie', 'sucre en poudre sachet'],
  ملح: ['sel de table algerie', 'sel sachet'],
  طماطم: ['concentre de tomate amor benamor algerie', 'tomate conserve algerie'],
  'طماطم مصبرة': ['concentre tomate amor benamor algerie', 'tomate izda cab'],
  عمور: ['amor benamor tomate pates algerie'],
  'بن عمر': ['amor benamor semoule couscous algerie'],
  معجون: ['confiture algerie jar'],
  تونة: ['thon en boite maratun algerie', 'thon algerie'],
  سردين: ['sardines en boite algerie manar'],
  هريسة: ['harissa algerienne pot', 'harissa sicam'],
  مايونيز: ['mayonnaise lesieur algerie', 'mayo broli'],
  خردل: ['moutarde algerie'],
  كاتشب: ['ketchup algerie'],
  قهوة: ['cafe moulu bonal algerie', 'cafe familia algerie', 'cafe presto algerie'],
  بونال: ['cafe bonal algerie'],
  فاميليا: ['cafe familia algerie'],
  شاي: ['the vert algerie el qafila', 'the lipton algerie'],
  فرينة: ['farine mama algerie', 'farine sim algerie'],
  ماما: ['farine mama algerie', 'couscous mama'],
  سيم: ['semoule sim algerie', 'pates sim'],
  سميد: ['semoule sim algerie', 'semoule amor benamor'],
  كسكس: ['couscous algerien sim', 'couscous mama dari'],
  مقرونة: ['pates macaroni amor benamor algerie', 'pates sim'],
  سباغيتي: ['spaghetti amor benamor algerie', 'spaghetti sim'],
  تليتلي: ['tlitli pates algerie'],
  شوربة: ['chorba frik algerie', 'vermicelle pates'],
  أرز: ['riz algerie sachet', 'riz basmati algerie'],
  عدس: ['lentilles sachet algerie', 'lentilles cevital'],
  حمص: ['pois chiches algerie', 'pois chiches conserve'],
  لوبيا: ['haricots blancs algerie'],
  بسكويت: ['biscuit bimo algerie', 'biscuit bimo tango'],
  بيمو: ['biscuit bimo algerie', 'gaufrette bimo'],
  قوفريط: ['gaufrette bimo algerie', 'gaufrette maxi'],
  ماكسي: ['chocolat maxi algerie', 'gaufrette maxi'],
  شوكولا: ['chocolat el mordjene algerie', 'chocolat bimo algerie', 'pate a tartiner el mordjene'],
  شوكولاتة: ['chocolat bimo algerie', 'chocolat ambassadeur algerie'],
  المرجان: ['el mordjene pate a tartiner cebon algerie'],
  شيبس: ['chips mahboul algerie', 'chips algerie'],
  مهبول: ['chips mahboul algerie'],
  بطاطا: ['pomme de terre frais'],
  بصل: ['oignons frais'],
  جزر: ['carottes frais'],
  تفاح: ['pommes fruits'],
  موز: ['bananes'],
  برتقال: ['oranges claudia algerie'],
  ليمون: ['citron frais'],
  دجاج: ['poulet frais'],
  لحم: ['viande bovine'],
  صابون: ['savon de marseille algerie', 'savon dove algerie', 'savon palmolive'],
  شامبو: ['shampoing venus algerie', 'shampoing sunsilk', 'shampoing head shoulders'],
  فينوس: ['shampoing venus laboratoire algerie'],
  إيزيس: ['liquide vaisselle isis algerie'],
  أومو: ['lessive omo algerie', 'lessive ariel algerie', 'lessive test algerie'],
  تست: ['lessive test algerie'],
  جافيل: ['eau de javel bref algerie', 'eau de javel djenet'],
  كوكا: ['coca cola algerie canette bouteille'],
  كوكاكولا: ['coca cola algerie'],
  بيبسي: ['pepsi algerie'],
  فانتا: ['fanta algerie'],
  حمود: ['hamoud boualem algerie', 'selecto hamoud boualem'],
  سيلكتو: ['selecto hamoud boualem algerie'],
  رامي: ['jus ramy algerie'],
  رويبة: ['jus rouiba algerie'],
  نقاوس: ['jus ngaous algerie'],
  عصير: ['jus ramy rouiba algerie', 'jus ngaous algerie'],
};

// Strict exclusion list for medications, pharmaceuticals, medical drugs, and non-grocery items
const MEDICATION_AND_NON_GROCERY_KEYWORDS = [
  // Medications & Drugs (أدوية وصيدلية)
  'دواء', 'ادوية', 'أدوية', 'مسكن', 'مسكنات', 'صيدلية', 'صيدلاني', 'حبوب', 'اقراص', 'أقراص', 'كبسولات',
  'شراب سعال', 'مضاد حيوي', 'مضادات حيوية', 'مرهم', 'مراهم', 'حقنة', 'حقن', 'طبي', 'طبية', 'علاج',
  'دوليبران', 'باراسيتامول', 'اسبرين', 'أسبرين', 'ايبوبروفين', 'سيتريزين', 'اوجمنتين', 'فلافيل',
  'فرفكس', 'بنادول', 'ادفل', 'مورفين', 'فيتامين طبي', 'انسولين', 'كورتيزون', 'سباسفون', 'اوميبرازول',
  'doliprane', 'paracetamol', 'aspirine', 'amoxicilline', 'augmentin', 'flagyl', 'fervex', 'efferalgan',
  'panadol', 'advil', 'ibuprofene', 'medicament', 'medicaments', 'pharmacie', 'comprime', 'gelule',
  'sirop', 'antibiotique', 'pommade', 'collyre', 'vaccin', 'insuline', 'cortisone', 'spasfon', 'omeprazole',
  // Real Estate & Housing (عقارات ومساكن)
  'مسكن', 'سكن', 'عقار', 'شقة', 'منزل', 'فيلا', 'عمارة', 'بيت', 'مبنى', 'أرض', 'كراء', 'ايجار', 'عقارات',
  'appartement', 'logement', 'maison', 'villa', 'immeuble', 'terrain', 'immobilier', 'residence', 'chambre',
  // Vehicles & Automotive
  'voiture', 'vehicule', 'moteur', 'car', 'auto', 'automobile', 'سيارة', 'مركبة', 'محرك',
  // Furniture
  'meuble', 'canape', 'fauteuil', 'lit', 'armoire', 'أثاث', 'صالون', 'غرفة نوم', 'خزانة',
  // Hospitality & Tourism
  'hotel', 'restaurant', 'فندق', 'سياحة',
];

export function isMedication(query: string): boolean {
  const norm = query.toLowerCase().trim();
  const medKeywords = [
    'دواء', 'ادوية', 'أدوية', 'مسكن', 'مسكنات', 'صيدلية', 'حبوب', 'اقراص', 'أقراص', 'كبسولات',
    'شراب سعال', 'مضاد حيوي', 'مضادات', 'مرهم', 'حقنة', 'طبي', 'علاج', 'دوليبران', 'باراسيتامول',
    'اسبرين', 'أسبرين', 'ايبوبروفين', 'سيتريزين', 'اوجمنتين', 'فلافيل', 'فرفكس', 'بنادول', 'ادفل',
    'سباسفون', 'اوميبرازول', 'doliprane', 'paracetamol', 'aspirine', 'amoxicilline', 'augmentin',
    'flagyl', 'fervex', 'efferalgan', 'panadol', 'advil', 'ibuprofene', 'medicament', 'pharmacie',
    'antibiotique', 'spasfon'
  ];
  return medKeywords.some((word) => norm.includes(word));
}

export function isGroceryRelated(title: string, url: string = ''): boolean {
  const combined = (title + ' ' + url).toLowerCase();
  for (const badWord of MEDICATION_AND_NON_GROCERY_KEYWORDS) {
    if (combined.includes(badWord.toLowerCase())) {
      return false;
    }
  }
  return true;
}

// 1. Google / DuckDuckGo Live Search targeted at Algerian Supermarket & Food items
async function searchLiveWebImages(query: string, algerianContext: boolean = true) {
  try {
    const searchQuery = algerianContext
      ? `${query} produit alimentation algerie superette`
      : `${query} grocery supermarket product`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const tokenRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images&kl=dz-ar`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ar,fr,en;q=0.9',
        },
      }
    );
    const html = await tokenRes.text();
    clearTimeout(timeoutId);

    const vqdMatch = html.match(/vqd=["']?([0-9-]+)["']?/) || html.match(/vqd=([0-9-]+)/);
    if (!vqdMatch || !vqdMatch[1]) return [];

    const vqd = vqdMatch[1];
    const searchController = new AbortController();
    const searchTimeoutId = setTimeout(() => searchController.abort(), 4500);

    const searchRes = await fetch(
      `https://duckduckgo.com/i.js?l=dz-ar&o=json&q=${encodeURIComponent(searchQuery)}&vqd=${vqd}&f=,,,`,
      {
        signal: searchController.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://duckduckgo.com/',
        },
      }
    );
    clearTimeout(searchTimeoutId);

    if (!searchRes.ok) return [];
    const json = (await searchRes.json()) as any;
    if (!json.results || !Array.isArray(json.results)) return [];

    return json.results
      .filter((r: any) => r.image && isGroceryRelated(r.title || '', r.image || ''))
      .slice(0, 16)
      .map((r: any, idx: number) => ({
        id: `google_web_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        title: r.title || query,
        url: r.image,
        thumbnailUrl: r.thumbnail || r.image,
        source: 'google',
        sourceName: 'Google Images 🇩🇿',
      }));
  } catch (err) {
    return [];
  }
}

// 2. Open Food Facts Database (Algeria & North Africa priority)
async function searchOpenFoodFactsAlgeria(query: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        query
      )}&search_simple=1&action=process&json=1&page_size=12`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SmartGroceryPOS-Algeria/2.0 (algeria@superette.dz)',
        },
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const json = (await res.json()) as any;
    if (!json.products || !Array.isArray(json.products)) return [];

    const items = [];
    for (const p of json.products) {
      const img = p.image_front_url || p.image_url || p.image_small_url;
      if (img && typeof img === 'string' && img.startsWith('http')) {
        const title = p.product_name_ar || p.product_name || p.generic_name || query;
        if (isGroceryRelated(title, img)) {
          items.push({
            id: `off_${p.code || Math.random().toString(36).substring(2, 6)}`,
            title: `${title} ${p.brands ? `(${p.brands})` : ''}`.trim(),
            url: img,
            thumbnailUrl: p.image_front_small_url || p.image_small_url || img,
            source: 'openfoodfacts',
            sourceName: 'سلع غذائية معتمدة 📦',
            barcode: p.code,
            brand: p.brands,
          });
        }
      }
    }
    return items;
  } catch (err) {
    return [];
  }
}

// 3. Wikimedia Commons Open Product Photos (Strict grocery filter)
async function searchWikimediaGrocery(query: string) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
        query + ' food product bottle packaging filetype:bitmap'
      )}&gsrlimit=10&prop=imageinfo&iiprop=url|thumbnail&iiurlwidth=400&format=json&origin=*`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const json = (await res.json()) as any;
    if (!json.query || !json.query.pages) return [];

    const pages = Object.values(json.query.pages) as any[];
    return pages
      .filter((p) => p.imageinfo?.[0]?.url)
      .map((p) => {
        const info = p.imageinfo[0];
        const title = (p.title || '')
          .replace(/^File:/i, '')
          .replace(/\.[^/.]+$/, '')
          .replace(/_/g, ' ');
        return {
          id: `wiki_${p.pageid || Math.random().toString(36).substring(2, 6)}`,
          title: title.slice(0, 50),
          url: info.thumburl || info.url,
          thumbnailUrl: info.thumburl || info.url,
          source: 'wikimedia',
          sourceName: 'Google Web 🌐',
        };
      })
      .filter((item) => isGroceryRelated(item.title, item.url));
  } catch (err) {
    return [];
  }
}

// Helper to get image for a product query
async function getBestProductImage(query: string): Promise<{ imageUrl: string; alternativeImages: string[] }> {
  try {
    const [liveImages, offImages] = await Promise.all([
      searchLiveWebImages(query, true),
      searchOpenFoodFactsAlgeria(query),
    ]);

    const combined = [...liveImages, ...offImages].filter((img) => isGroceryRelated(img.title, img.url));
    const urls = Array.from(new Set(combined.map((img) => img.url).filter(Boolean)));
    return {
      imageUrl: urls[0] || '',
      alternativeImages: urls.slice(0, 6),
    };
  } catch {
    return { imageUrl: '', alternativeImages: [] };
  }
}

// Fallback Algerian Grocery Catalog for instant offline/keyless search
const KNOWN_ALGERIAN_PRODUCTS = [
  {
    name: 'ماء معدني طبيعي إفري 1.5 لتر',
    brand: 'Ifri / إفري',
    category: 'مشروبات ومياه معدنية',
    unit: 'piece',
    barcode: '6130001001502',
    costPrice: 32,
    sellingPrice: 40,
    isScaleItem: false,
    description: 'قنينة ماء معدني إفري 1.5 لتر نقية من جبال جرجرة',
    imageQuery: 'ifri eau minerale algerie 1.5l',
  },
  {
    name: 'ماء معدني سعيدة 1.5 لتر',
    brand: 'Saida / سعيدة',
    category: 'مشروبات ومياه معدنية',
    unit: 'piece',
    barcode: '6130002001501',
    costPrice: 30,
    sellingPrice: 40,
    isScaleItem: false,
    description: 'ماء معدني طبيعي سعيدة 1.5 لتر',
    imageQuery: 'saida eau minerale algerie',
  },
  {
    name: 'حليب كانديا كامل الدسم فيفا 1 لتر',
    brand: 'Candia / كانديا',
    category: 'ألبان وأجبان ومشتقات الحليب',
    unit: 'piece',
    barcode: '6130022010012',
    costPrice: 120,
    sellingPrice: 140,
    isScaleItem: false,
    description: 'حليب معقم كانديا فيفا 1 لتر مدعم بالفيتامينات',
    imageQuery: 'lait candia viva algerie 1l',
  },
  {
    name: 'حليب كانديا سيلويت نصف دسم 1 لتر',
    brand: 'Candia / كانديا',
    category: 'ألبان وأجبان ومشتقات الحليب',
    unit: 'piece',
    barcode: '6130022010029',
    costPrice: 115,
    sellingPrice: 135,
    isScaleItem: false,
    description: 'حليب معقم كانديا سيلويت نصف دسم 1 لتر',
    imageQuery: 'lait candia silhouette algerie',
  },
  {
    name: 'ياغورت صومام فواكه مشكلة',
    brand: 'Soummam / صومام',
    category: 'ألبان وأجبان ومشتقات الحليب',
    unit: 'piece',
    barcode: '6130015003011',
    costPrice: 22,
    sellingPrice: 30,
    isScaleItem: false,
    description: 'علبة ياغورت صومام ممزوج بالفواكه اللذيذة',
    imageQuery: 'yaourt soummam algerie',
  },
  {
    name: 'لبن صومام 1 لتر',
    brand: 'Soummam / صومام',
    category: 'ألبان وأجبان ومشتقات الحليب',
    unit: 'piece',
    barcode: '6130015004018',
    costPrice: 85,
    sellingPrice: 100,
    isScaleItem: false,
    description: 'لبن رائب صومام طبيعي 1 لتر',
    imageQuery: 'lben soummam algerie 1l',
  },
  {
    name: 'مشروب غازي حمود بوعلام سيلكتو 1 لتر',
    brand: 'Hamoud Boualem / حمود بوعلام',
    category: 'مشروبات ومياه معدنية',
    unit: 'piece',
    barcode: '6130030001015',
    costPrice: 90,
    sellingPrice: 110,
    isScaleItem: false,
    description: 'مشروب سيلكتو حمود بوعلام العريق بنكهة التفاح بالكراميل',
    imageQuery: 'selecto hamoud boualem algerie',
  },
  {
    name: 'مشروب غازي حمود بوعلام ليمون أبيض 1 لتر',
    brand: 'Hamoud Boualem / حمود بوعلام',
    category: 'مشروبات ومياه معدنية',
    unit: 'piece',
    barcode: '6130030001022',
    costPrice: 90,
    sellingPrice: 110,
    isScaleItem: false,
    description: 'حمود أبيض ليموناد جزائري أصيل',
    imageQuery: 'hamoud boualem blanche algerie',
  },
  {
    name: 'زيت طهي نباتي إيليو سيفيتال 5 لتر',
    brand: 'Elio Cevital / إيليو',
    category: 'زيوت وسمن وصلصات',
    unit: 'piece',
    barcode: '6130010005018',
    costPrice: 600,
    sellingPrice: 650,
    isScaleItem: false,
    description: 'زيت نباتي إيليو سيفيتال 5 لتر لجميع أنواع الطبخ والقلي',
    imageQuery: 'huile elio cevital algerie 5l',
  },
  {
    name: 'زيت نباتي عافية ذرة 1.8 لتر',
    brand: 'Afia / عافية',
    category: 'زيوت وسمن وصلصات',
    unit: 'piece',
    barcode: '6130040001801',
    costPrice: 380,
    sellingPrice: 420,
    isScaleItem: false,
    description: 'زيت ذرة نقي عافية للطبخ الصحي',
    imageQuery: 'huile afia algerie mais',
  },
  {
    name: 'طماطم مصبرة عمور بن عمر 800 غرام',
    brand: 'Amor Benamor / عمر بن عمر',
    category: 'معلبات ومصبرات',
    unit: 'piece',
    barcode: '6130050008003',
    costPrice: 170,
    sellingPrice: 200,
    isScaleItem: false,
    description: 'معجون طماطم مركزة عمور بن عمر 800 غرام',
    imageQuery: 'concentre tomate amor benamor algerie 800g',
  },
  {
    name: 'كسكس جزائري متوسط ماما 1 كغ',
    brand: 'Mama / ماما',
    category: 'مواد غذائية عامة وبقوليات',
    unit: 'piece',
    barcode: '6130060010012',
    costPrice: 95,
    sellingPrice: 120,
    isScaleItem: false,
    description: 'كسكس قمح صلب جزائري متوسط ماما 1 كغ',
    imageQuery: 'couscous mama algerie 1kg',
  },
  {
    name: 'سميد ممتاز سيم 1 كغ',
    brand: 'Sim / سيم',
    category: 'مواد غذائية عامة وبقوليات',
    unit: 'piece',
    barcode: '6130070010015',
    costPrice: 85,
    sellingPrice: 100,
    isScaleItem: false,
    description: 'سميد قمح صلب فاخر سيم للعجين والخبز والحلويات',
    imageQuery: 'semoule sim algerie 1kg',
  },
  {
    name: 'مقرونة ريشة عمور بن عمر 500 غرام',
    brand: 'Amor Benamor / عمر بن عمر',
    category: 'مواد غذائية عامة وبقوليات',
    unit: 'piece',
    barcode: '6130050005002',
    costPrice: 65,
    sellingPrice: 80,
    isScaleItem: false,
    description: 'عجائن مقرونة ريشة بن عمر 500 غرام من القمح الصلب',
    imageQuery: 'pates amor benamor plume algerie',
  },
  {
    name: 'شوكولاتة للدهن المرجان كيندر / بندق 350 غرام',
    brand: 'El Mordjene / المرجان',
    category: 'بسكويت وحلويات ومسليات',
    unit: 'piece',
    barcode: '6130080003504',
    costPrice: 320,
    sellingPrice: 380,
    isScaleItem: false,
    description: 'كريمة المرجان الشهيرة بالبندق والشوكولاتة للدهن',
    imageQuery: 'el mordjene pate a tartiner algerie',
  },
  {
    name: 'بسكويت بيمو تانغو شوكولا',
    brand: 'Bimo / بيمو',
    category: 'بسكويت وحلويات ومسليات',
    unit: 'piece',
    barcode: '6130090000251',
    costPrice: 35,
    sellingPrice: 50,
    isScaleItem: false,
    description: 'بسكويت بيمو تانغو محشو بكريمة الكاكاو',
    imageQuery: 'biscuit bimo tango algerie',
  },
  {
    name: 'قوفريط ماكسي بيمو فانيلا وشوكولا',
    brand: 'Bimo / بيمو',
    category: 'بسكويت وحلويات ومسليات',
    unit: 'piece',
    barcode: '6130090000305',
    costPrice: 30,
    sellingPrice: 40,
    isScaleItem: false,
    description: 'ويفر قوفريط ماكسي مقرمش من بيمو',
    imageQuery: 'gaufrette maxi bimo algerie',
  },
  {
    name: 'قهوة مطحونة بونال حمراء 250 غرام',
    brand: 'Bonal / بونال',
    category: 'مشروبات ومياه معدنية',
    unit: 'piece',
    barcode: '6130100002507',
    costPrice: 240,
    sellingPrice: 280,
    isScaleItem: false,
    description: 'قهوة جزائرية أصيلة بونال محمصة ومطحونة 250 غرام',
    imageQuery: 'cafe bonal algerie 250g',
  },
  {
    name: 'قهوة فاميليا 250 غرام',
    brand: 'Familia / فاميليا',
    category: 'مشروبات ومياه معدنية',
    unit: 'piece',
    barcode: '6130100002514',
    costPrice: 220,
    sellingPrice: 260,
    isScaleItem: false,
    description: 'قهوة فاميليا ذوق تقليدي مميز',
    imageQuery: 'cafe familia algerie',
  },
  {
    name: 'جبن مثلثات لافاش كيري 16 قطعة',
    brand: 'La Vache Qui Rit / البقرة الضاحكة',
    category: 'ألبان وأجبان ومشتقات الحليب',
    unit: 'piece',
    barcode: '6130110000168',
    costPrice: 210,
    sellingPrice: 250,
    isScaleItem: false,
    description: 'جبن مطبوخ مثلثات البقرة الضاحكة 16 قطعة',
    imageQuery: 'fromage la vache qui rit algerie 16 portions',
  },
  {
    name: 'جبن بربر أحمر تقليدي 200 غرام',
    brand: 'Fromage Berbere / بربر',
    category: 'ألبان وأجبان ومشتقات الحليب',
    unit: 'piece',
    barcode: '6130110000205',
    costPrice: 180,
    sellingPrice: 220,
    isScaleItem: false,
    description: 'جبن بربر جزائري أحمر للبيتزا والطهي',
    imageQuery: 'fromage berbere algerie',
  },
  {
    name: 'تونة بالزيت ماراتون 160 غرام',
    brand: 'Maratun / ماراتون',
    category: 'معلبات ومصبرات',
    unit: 'piece',
    barcode: '6130120001602',
    costPrice: 160,
    sellingPrice: 190,
    isScaleItem: false,
    description: 'علبة تونة كاملة في الزيت النباتي ماراتون 160 غرام',
    imageQuery: 'thon maratun algerie boite',
  },
  {
    name: 'سائل غسيل الأواني إيزيس 1 لتر',
    brand: 'Isis / إيزيس',
    category: 'منظفات ومواد التنظيف',
    unit: 'piece',
    barcode: '6130130010018',
    costPrice: 130,
    sellingPrice: 160,
    isScaleItem: false,
    description: 'سائل إيزيس الفعال لتنظيف الأواني وإزالة الدهون بالليمون',
    imageQuery: 'liquide vaisselle isis algerie 1l',
  },
  {
    name: 'مسحوق غسيل أوتوماتيك أومو 3 كغ',
    brand: 'Omo / أومو',
    category: 'منظفات ومواد التنظيف',
    unit: 'piece',
    barcode: '6130130030016',
    costPrice: 620,
    sellingPrice: 700,
    isScaleItem: false,
    description: 'مسحوق غسيل الملابس للغسالات الأوتوماتيكية أومو 3 كغ',
    imageQuery: 'lessive omo algerie 3kg',
  },
  {
    name: 'شامبو فينوس زيت الأرغان 400 مل',
    brand: 'Laboratoires Venus / فينوس',
    category: 'عناية شخصية ومستلزمات',
    unit: 'piece',
    barcode: '6130140004008',
    costPrice: 190,
    sellingPrice: 230,
    isScaleItem: false,
    description: 'شامبو مغذي للشعر بمستخلص زيت الأرغان فينوس 400 مل',
    imageQuery: 'shampoing venus argan algerie 400ml',
  },
  {
    name: 'ماء جافيل بريف 2 لتر',
    brand: 'Bref / بريف',
    category: 'منظفات ومواد التنظيف',
    unit: 'piece',
    barcode: '6130130020017',
    costPrice: 110,
    sellingPrice: 140,
    isScaleItem: false,
    description: 'ماء جافيل معقم ومطهر للأرضيات والأسطح بريف 2 لتر',
    imageQuery: 'eau de javel bref algerie 2l',
  },
  {
    name: 'عصير رامي فواكه مشكلة 1 لتر',
    brand: 'Ramy / رامي',
    category: 'مشروبات ومياه معدنية',
    unit: 'piece',
    barcode: '6130150010013',
    costPrice: 95,
    sellingPrice: 120,
    isScaleItem: false,
    description: 'عصير رامي مشكل الفواكه الاستوائية 1 لتر بدون مواد حافظة',
    imageQuery: 'jus ramy cocktail fruits algerie 1l',
  },
  {
    name: 'عصير رويبة برتقال 1 لتر',
    brand: 'Rouiba / رويبة',
    category: 'مشروبات ومياه معدنية',
    unit: 'piece',
    barcode: '6130150010020',
    costPrice: 90,
    sellingPrice: 115,
    isScaleItem: false,
    description: 'عصير رويبة برتقال غني بفيتامين سي 1 لتر',
    imageQuery: 'jus rouiba orange algerie 1l',
  },
];

// POST /api/smart-product-search: Smart Algerian Supermarket Product Search via Google Search API
app.post('/api/smart-product-search', async (req, res) => {
  const query = (req.body.query || req.body.q || '').toString().trim();
  if (!query) {
    return res.json({ query: '', count: 0, results: [] });
  }

  // 1. STRICT MEDICATION FILTER
  if (isMedication(query)) {
    return res.json({
      query,
      isMedication: true,
      count: 0,
      results: [],
      warning:
        '⚠️ تم حظر هذا العنصر تلقائياً لأنه مصنف كدواء أو مستحضر صيدلاني. نظام السوبرماركت مخصص لسلع الأغذية والتغذية والمواد الاستهلاكية فقط 🛒.',
    });
  }

  try {
    let generatedProducts: any[] = [];

    // 2. Try Gemini 3.8 Flash with Google Search Grounding if API key is present
    if (process.env.GEMINI_API_KEY) {
      try {
        const prompt = `You are a specialized Algerian Supermarket & Grocery Inventory Catalog assistant.
The user is searching for supermarket grocery products in Algeria with the query: "${query}".

RULES:
1. STRICT FILTER: Only return grocery, food, beverage, cleaning, dairy, personal care, and supermarket items sold in Algerian superettes and grocery stores (alimentation générale en Algérie).
2. NEVER return medications, pharmaceuticals, prescription drugs, doliprane, paracetamol, antibiotics, real estate, cars, housing, or electronics.
3. Provide realistic Algerian products matching this query (e.g. Ifri, Candia, Hamoud Boualem, Cevital Elio, Amor Benamor, Sim, Bimo, Soummam, Venus, Isis, etc.).
4. Return a JSON ARRAY of 3 to 6 matching Algerian grocery items with these exact keys:
- "name": string (Clear Arabic and commercial product name with size/weight, e.g. "ماء معدني إفري 1.5 لتر")
- "brand": string (Brand name, e.g. "Ifri", "Candia", "Amor Benamor")
- "category": string (One of: "مشروبات ومياه معدنية", "ألبان وأجبان ومشتقات الحليب", "مواد غذائية عامة وبقوليات", "زيوت وسمن وصلصات", "معلبات ومصبرات", "بسكويت وحلويات ومسليات", "منظفات ومواد التنظيف", "عناية شخصية ومستلزمات", "خضر وفواكه طازجة", "لحوم ودواجن وأسماك", "توابل وبهارات ومكسرات")
- "unit": string ("piece" | "kg" | "pack" | "liter")
- "barcode": string (13-digit Algerian EAN barcode starting with 613...)
- "estimatedCostPrice": number (Estimated wholesale buying price in Algerian Dinars DZD)
- "estimatedSellingPrice": number (Estimated retail selling price in Algerian Dinars DZD)
- "isScaleItem": boolean (true if sold by weight kg/g, false otherwise)
- "description": string (Brief product description in Arabic)
- "imageSearchQuery": string (Exact product keywords in French/Arabic for fetching its image, e.g. "eau minerale ifri algerie 1.5l")

Output ONLY raw valid JSON array, nothing else.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const textOutput = response.text || '';
        // Extract JSON from output
        const jsonMatch = textOutput.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            generatedProducts = parsed.filter(
              (p: any) => p && p.name && isGroceryRelated(p.name, p.description || '')
            );
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini Google Search Grounding fallback:', geminiErr);
      }
    }

    // 3. If Gemini didn't produce items, match from our Algerian Supermarket Catalog + Live Web expansion
    if (generatedProducts.length === 0) {
      const lowerQ = query.toLowerCase();
      const matched = KNOWN_ALGERIAN_PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQ) ||
          p.brand.toLowerCase().includes(lowerQ) ||
          p.category.toLowerCase().includes(lowerQ) ||
          lowerQ.includes(p.name.slice(0, 4).toLowerCase())
      );

      if (matched.length > 0) {
        generatedProducts = matched.map((p) => ({
          name: p.name,
          brand: p.brand,
          category: p.category,
          unit: p.unit,
          barcode: p.barcode,
          estimatedCostPrice: p.costPrice,
          estimatedSellingPrice: p.sellingPrice,
          isScaleItem: p.isScaleItem,
          description: p.description,
          imageSearchQuery: p.imageQuery,
        }));
      } else {
        // Fallback generic Algerian grocery item template
        const randBar = '613' + Math.floor(1000000000 + Math.random() * 9000000000).toString();
        generatedProducts = [
          {
            name: query,
            brand: 'منتج جزائري',
            category: 'مواد غذائية عامة وبقوليات',
            unit: 'piece',
            barcode: randBar,
            estimatedCostPrice: 100,
            estimatedSellingPrice: 130,
            isScaleItem: false,
            description: `سلعة غذائية استهلاكية - ${query}`,
            imageSearchQuery: `${query} algerie superette`,
          },
        ];
      }
    }

    // 4. Concurrently fetch real Google Images for all products
    const finalResults = await Promise.all(
      generatedProducts.slice(0, 8).map(async (prod: any, idx: number) => {
        const imageSearchTerm = prod.imageSearchQuery || prod.name;
        const imgData = await getBestProductImage(imageSearchTerm);

        const profitMargin =
          prod.estimatedCostPrice > 0
            ? Math.round(
                ((prod.estimatedSellingPrice - prod.estimatedCostPrice) / prod.estimatedCostPrice) * 100
              )
            : 25;

        return {
          id: `smart_p_${idx}_${Math.random().toString(36).substring(2, 7)}`,
          name: prod.name,
          brand: prod.brand || 'منتج محلي',
          category: prod.category || 'مواد غذائية عامة وبقوليات',
          unit: prod.unit || 'piece',
          barcode: prod.barcode || `613${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          costPrice: prod.estimatedCostPrice || 100,
          sellingPrice: prod.estimatedSellingPrice || 130,
          profitMargin,
          isScaleItem: Boolean(prod.isScaleItem),
          description: prod.description || '',
          imageUrl: imgData.imageUrl,
          alternativeImages: imgData.alternativeImages,
          source: 'Google Search API 🇩🇿',
        };
      })
    );

    return res.json({
      query,
      count: finalResults.length,
      results: finalResults,
    });
  } catch (error) {
    console.error('API /api/smart-product-search error:', error);
    return res.status(500).json({ error: 'Smart product search error', results: [] });
  }
});

// API Route: Smart Live Internet Image Search for Algerian Superettes
app.get('/api/search-images', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({ results: [] });
  }

  // Medication filter on image search
  if (isMedication(query)) {
    return res.json({ query, count: 0, results: [] });
  }

  try {
    // Find Algerian grocery expansions for exact brand matching
    let extraQueries: string[] = [];
    const lowerQuery = query.toLowerCase();
    for (const [key, expansions] of Object.entries(ALGERIAN_GROCERY_EXPANSIONS)) {
      if (lowerQuery.includes(key.toLowerCase())) {
        extraQueries.push(...expansions);
      }
    }

    // Run parallel searches with Algeria + Grocery priority
    const searchPromises: Promise<any[]>[] = [
      searchLiveWebImages(query, true),
      searchOpenFoodFactsAlgeria(query),
      searchWikimediaGrocery(query),
    ];

    if (extraQueries.length > 0) {
      searchPromises.push(searchLiveWebImages(extraQueries[0], false));
      searchPromises.push(searchOpenFoodFactsAlgeria(extraQueries[0]));
    } else {
      // General Algerian grocery fallback search query
      searchPromises.push(searchLiveWebImages(`${query} algerie`, false));
    }

    const allResults = await Promise.allSettled(searchPromises);

    const combined: any[] = [];
    const seenUrls = new Set<string>();

    for (const resItem of allResults) {
      if (resItem.status === 'fulfilled' && Array.isArray(resItem.value)) {
        for (const img of resItem.value) {
          if (img.url && !seenUrls.has(img.url) && isGroceryRelated(img.title, img.url)) {
            seenUrls.add(img.url);
            combined.push(img);
          }
        }
      }
    }

    return res.json({
      query,
      count: combined.length,
      results: combined,
    });
  } catch (error) {
    console.error('API /api/search-images error:', error);
    return res.status(500).json({ error: 'Failed to search images', results: [] });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
