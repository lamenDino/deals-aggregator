import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dealsData = [];
let articlesData = [];
let newsData = [];
let videosData = [];
let historyData = [];
let lastUpdateTime = new Date();

console.log('✅ Server inizializzato');

const amazonProducts = [
  { name: "Cuffie Bluetooth Premium ANC Sony WH-1000XM5", category: "elettronica", basePrice: 379.99 },
  { name: "Robot Aspirapolvere iRobot Roomba j7+", category: "casa", basePrice: 799.99 },
  { name: "Apple Watch Series 9 45mm GPS", category: "sport", basePrice: 429.99 },
  { name: "Frullatore Vitamix A3500i Ascent", category: "casa", basePrice: 749.99 },
  { name: "Zaino Fotografico Peak Design Everyday 30L", category: "moda", basePrice: 299.99 },
  { name: "eReader Kindle Oasis 10 generazione", category: "libri", basePrice: 249.99 },
  { name: "Powerbank Anker 737 100W 40000mAh", category: "elettronica", basePrice: 129.99 },
  { name: "Speaker JBL Flip 6 Waterproof", category: "elettronica", basePrice: 149.99 },
  { name: "Bottiglia Termica YETI Rambler 26oz", category: "casa", basePrice: 89.99 },
  { name: "Lampada Intelligente Philips Hue White Ambiance", category: "casa", basePrice: 29.99 },
  { name: "Webcam Logitech 4K Pro Stream", category: "elettronica", basePrice: 199.99 },
  { name: "Tappetino Yoga Lululemon 5mm Purple", category: "sport", basePrice: 128.00 },
  { name: "Monitor BenQ 27 pollici 2K 144Hz", category: "elettronica", basePrice: 349.99 },
  { name: "Tastiera Meccanica Corsair K95 RGB", category: "elettronica", basePrice: 229.99 },
  { name: "Mouse Logitech MX Master 3S", category: "elettronica", basePrice: 99.99 },
  { name: "Cuscino Ergonomico Memory Foam Serta", category: "casa", basePrice: 79.99 }
];

const youtubeVideos = [
  { product: "Apple Vision Pro - Hands On", youtuber: "MKBHD", channel: "MKBHD", videoId: "kTwBLy8nnLs" },
  { product: "iPhone 15 Pro Max Review", youtuber: "Unbox Therapy", channel: "Unbox Therapy", videoId: "GhpLv0lH7EU" },
  { product: "PS5 Game Highlight", youtuber: "PlayStation", channel: "PlayStation Official", videoId: "G3DTTPLy1Vc" },
  { product: "Samsung Galaxy Z Fold 5", youtuber: "Dave2D", channel: "Dave2D", videoId: "v4pGZR6TZC4" },
  { product: "MacBook Pro M3 Review", youtuber: "Linus Tech Tips", channel: "Linus Tech Tips", videoId: "7n-qBpMM8Gg" },
  { product: "Google Pixel 8 Pro Review", youtuber: "Marques Brownlee", channel: "MKBHD", videoId: "jvVP7Y6Jk2M" },
  { product: "Meta Quest 3 Unboxing", youtuber: "Austin Evans", channel: "Austin Evans", videoId: "WZHqm2T5FvU" },
  { product: "RTX 4090 Gaming Test", youtuber: "Techpowerup", channel: "TechPowerUp", videoId: "tJ5tUZvpuAo" }
];

function generateImageUrl(category) {
  const categoryUrls = {
    'elettronica': ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop'],
    'casa': ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop'],
    'sport': ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop'],
    'moda': ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop'],
    'libri': ['https://images.unsplash.com/photo-1507842217343-583f20270319?w=300&h=300&fit=crop']
  };
  const urls = categoryUrls[category] || categoryUrls['elettronica'];
  return urls[Math.floor(Math.random() * urls.length)];
}

function generateRealisticDeal() {
  const product = amazonProducts[Math.floor(Math.random() * amazonProducts.length)];
  const discount = Math.floor(Math.random() * (45 - 10 + 1)) + 10;
  const discountPrice = product.basePrice * (1 - discount / 100);
  const baseRating = 4.2;
  const variance = (Math.random() - 0.5) * 0.8;
  const rating = Math.max(3.5, Math.min(4.9, baseRating + variance)).toFixed(1);
  const reviews = Math.floor(Math.random() * (8000 - 400 + 1)) + 400;

  return {
    id: Math.floor(Math.random() * 1000000),
    title: product.name,
    category: product.category,
    originalPrice: parseFloat(product.basePrice.toFixed(2)),
    discountPrice: parseFloat(discountPrice.toFixed(2)),
    discount,
    rating: parseFloat(rating),
    reviews,
    description: 'Prodotto di qualità premium - Spedizione rapida e gratuita su ordini sopra 25€',
    image: generateImageUrl(product.category)
  };
}

function generateDailyDeals() {
  console.log('\n🔄 Generando offerte giornaliere...');
  dealsData = [];
  const dealsCount = 16;

  for (let i = 0; i < dealsCount; i++) {
    const deal = generateRealisticDeal();
    dealsData.push(deal);
    console.log(` ✓ Generato: ${deal.title} (-${deal.discount}%)`);
  }

  console.log(`✅ ${dealsData.length} offerte generate`);
  lastUpdateTime = new Date();
}

function generateDailyArticles() {
  console.log('\n📝 Generando articoli del giorno...');
  
  const articles = [
    {
      title: "Migliori cuffie wireless con cancellazione del rumore 2024",
      category: "Tecnologia",
      excerpt: "Scopri le migliori cuffie wireless con ANC attivo. Confronto dettagliato tra i modelli più popolari.",
      content: "Le cuffie wireless con cancellazione del rumore attiva sono diventate essenziali per chi vuole godersi la musica senza distrazioni. In questa guida analizziamo i modelli più popolari del 2024: Sony WH-1000XM5, Bose QuietComfort Ultra, Apple AirPods Max. Ogni modello offre caratteristiche uniche, dalla qualità audio alla durata della batteria. Scopri quale fa per te con i nostri pro e contro dettagliati."
    },
    {
      title: "Come scegliere il robot aspirapolvere ideale per casa",
      category: "Casa",
      excerpt: "Guida completa per scegliere il robot aspirapolvere perfetto per le tue esigenze domestiche.",
      content: "Scegliere un robot aspirapolvere può essere complicato con così tante opzioni disponibili. Questa guida ti aiuta a capire le caratteristiche importanti: potenza di aspirazione, capacità del serbatoio, funzioni di mappatura, controllo da app. Analizziamo i migliori modelli 2024 da iRobot Roomba, Ecovacs Deebot e Roborock. Scopri come risparmiare tempo e ottenere pavimenti impeccabili."
    },
    {
      title: "Smartwatch: Guida completa all'acquisto e confronto modelli",
      category: "Sporttech",
      excerpt: "Confronto dettagliato tra i migliori smartwatch del mercato per tutti gli usi.",
      content: "Gli smartwatch sono ormai indispensabili per chi vuole monitorare la propria salute e attività fisica. Questa guida completa esamina i migliori modelli 2024: Apple Watch Series 9, Samsung Galaxy Watch 6, Garmin Fenix 7X. Confrontiamo monitoraggio della frequenza cardiaca, GPS, autonomia della batteria e resistenza all'acqua. Scopri quale smartwatch è perfetto per il tuo stile di vita."
    },
    {
      title: "Accessori smart home per automatizzare casa nel 2024",
      category: "Lifestyle",
      excerpt: "I migliori accessori smart home per trasformare la tua casa in una abitazione intelligente.",
      content: "Trasformare la tua casa in una smart home è più facile che mai con gli accessori giusti. Analizziamo i migliori prodotti 2024: luci intelligenti Philips Hue, termostati smart Nest, videocamere di sorveglianza Arlo. Scopri come creare routine automatiche, controllare tutto dal tuo smartphone e risparmiare energia. Una guida completa per principianti e utenti esperti."
    },
    {
      title: "I migliori monitor gaming per giocare al massimo",
      category: "Tecnologia",
      excerpt: "Scopri i monitor gaming con le migliori specifiche per l'esperienza di gioco ottimale.",
      content: "Un buon monitor gaming può fare la differenza nella tua esperienza di gioco. Analizziamo i fattori chiave: frequenza di aggiornamento, tempo di risposta, risoluzione, sincronizzazione verticale. I migliori modelli 2024 includono monitor 144Hz, 240Hz e persino 360Hz per i giochi competitivi. Scopri come scegliere il monitor perfetto per il tuo setup gaming."
    },
    {
      title: "Tastiere meccaniche: quale scegliere per programmare e giocare",
      category: "Tecnologia",
      excerpt: "Guida alle migliori tastiere meccaniche con switch personalizzabili e design premium.",
      content: "Le tastiere meccaniche offrono un'esperienza di digitazione superiore rispetto alle tastiere a membrana. Scopri i diversi tipi di switch meccanici, dal Cherry MX al Corsair, e come scelgono influisce sul tuo lavoro e gioco. Analizziamo le migliori tastiere gaming e per produttività 2024, con illuminazione RGB personalizzabile e build quality premium."
    },
    {
      title: "Fotocamere digitali compatte per viaggiare leggeri",
      category: "Lifestyle",
      excerpt: "Le migliori fotocamere compatte per catturare momenti perfetti senza peso extra.",
      content: "Se ami fotografare ma non vuoi portare attrezzatura pesante, le fotocamere compatte sono la soluzione ideale. Analizziamo modelli come Sony RX100, Ricoh GR III e Canon PowerShot G7X con sensori di qualità superiore e zoom potente. Perfette per viaggi, escursioni e documenti di vita quotidiana con qualità professionale."
    },
    {
      title: "Cuffie over-ear vs in-ear: quale scegliere",
      category: "Tecnologia",
      excerpt: "Confronto tra cuffie over-ear e in-ear per capire quale tipo è meglio per te.",
      content: "La scelta tra cuffie over-ear e in-ear dipende dalle tue preferenze e necessità. Le cuffie over-ear offrono comfort prolungato e isolamento migliore, mentre le in-ear sono portatili e discrete. Scopri i pro e i contro di ogni tipo, i migliori modelli 2024 e come scegliere in base al tuo uso principale: ascolto, gaming o sport."
    }
  ];

  articlesData = articles.map((article, i) => ({
    id: i + 1,
    ...article,
    date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    readTime: Math.floor(Math.random() * 10) + 5
  }));

  console.log(`✅ ${articlesData.length} articoli generati`);
}

function generateDailyNews() {
  console.log('\n⚡ Generando tech news...');
  
  const newsList = [
    { title: "Apple rilascia iOS 18 con nuove feature AI rivoluzionarie", icon: "🍎", category: "Apple", author: "Tech News Italia" },
    { title: "Google presenta Pixel 9 con fotocamera rivoluzionaria e Gemini IA", icon: "🔍", category: "Google", author: "Tech Daily" },
    { title: "Samsung Galaxy S25 Ultra confermato per gennaio 2025 con display AMOLED", icon: "📱", category: "Samsung", author: "Mobile News" },
    { title: "Meta lancerà nuovi occhiali AR Quest 4 entro il 2025", icon: "👓", category: "Meta", author: "AR Tech" },
    { title: "Intel annuncia nuovi processori Core Ultra con IA integrata", icon: "⚙️", category: "Intel", author: "Hardware News" },
    { title: "NVIDIA GTX 5090 confermata con architettura Blackwell", icon: "🎮", category: "NVIDIA", author: "Gaming News" },
    { title: "OpenAI GPT-5 in arrivo con capacità ancora più avanzate", icon: "🤖", category: "IA", author: "Tech Insider" },
    { title: "Tesla annuncia Cybertruck Model 2 con design rivoluzionario", icon: "🚗", category: "Tesla", author: "Innovation Daily" }
  ];

  newsData = newsList.map((news, i) => ({
    id: i + 1,
    title: news.title,
    excerpt: news.title.substring(0, 100),
    content: `${news.title}. Questa è una notizia importante nel settore della tecnologia. Gli esperti prevedono un grande impatto sul mercato nei prossimi mesi. La comunità tech è entusiasta dei potenziali risvolti e delle innovazioni che potranno derivare da questo annuncio. Continua a seguire gli aggiornamenti per rimanere informato sugli ultimi sviluppi.`,
    icon: news.icon,
    category: news.category,
    author: news.author,
    date: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }));

  console.log(`✅ ${newsData.length} news generate`);
}

function generateDailyVideos() {
  console.log('\n🎬 Generando video reviews...');

  videosData = youtubeVideos.map((video, i) => ({
    id: i + 1,
    product: video.product,
    youtuber: video.youtuber,
    channel: video.channel,
    videoId: video.videoId,
    thumbnail: `https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`,
    views: Math.floor(Math.random() * 5000000).toLocaleString('it-IT'),
    rating: (Math.random() * 2 + 3).toFixed(1),
    description: `Review completo e dettagliato di ${video.product}. ${video.youtuber} analizza tutte le caratteristiche principali, i vantaggi e gli svantaggi di questo prodotto. Scopri le prestazioni reali, la qualità costruttiva e il rapporto qualità-prezzo. Perfetto per chi sta considerando l'acquisto. Guarda il video completo per tutte le informazioni tecniche approfondite e i test pratici.`
  }));

  console.log(`✅ ${videosData.length} video generati`);
}

// Genera i dati al startup
console.log('\n🚀 Generazione iniziale al startup...');
generateDailyDeals();
generateDailyArticles();
generateDailyNews();
generateDailyVideos();

// API Endpoints
app.get('/api/deals', (req, res) => {
  res.json({
    deals: dealsData,
    articles: articlesData,
    news: newsData,
    videos: videosData,
    history: historyData,
    lastUpdate: lastUpdateTime
  });
});

app.post('/api/regenerate', (req, res) => {
  try {
    console.log('\n🔄 Rigenerazione manuale...');
    generateDailyDeals();
    generateDailyArticles();
    generateDailyNews();
    generateDailyVideos();

    res.json({
      success: true,
      message: 'Tutti i dati rigenerati',
      deals: dealsData.length,
      articles: articlesData.length,
      news: newsData.length,
      videos: videosData.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('❌ Errore:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    deals: dealsData.length,
    articles: articlesData.length,
    news: newsData.length,
    videos: videosData.length,
    lastUpdate: lastUpdateTime
  });
});

// Serve static files
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n✅ Server avviato su http://localhost:${PORT}`);
  console.log(`📊 Dati caricati: ${dealsData.length} offerte | ${articlesData.length} articoli | ${newsData.length} news | ${videosData.length} video`);
  console.log(`🌐 Accedi a http://localhost:${PORT}`);
});
