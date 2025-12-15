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
  { name: "Tappetino Yoga Lululemon 5mm Purple", category: "sport", basePrice: 128.00 }
];

const youtubeVideos = [
  { product: "Apple Vision Pro - Hands On", youtuber: "MKBHD", channel: "MKBHD", videoId: "kTwBLy8nnLs" },
  { product: "iPhone 15 Pro Max Review", youtuber: "Unbox Therapy", channel: "Unbox Therapy", videoId: "GhpLv0lH7EU" },
  { product: "PS5 Game Highlight", youtuber: "PlayStation", channel: "PlayStation Official", videoId: "G3DTTPLy1Vc" },
  { product: "Samsung Galaxy Z Fold 5", youtuber: "Dave2D", channel: "Dave2D", videoId: "v4pGZR6TZC4" },
  { product: "MacBook Pro M3 Review", youtuber: "Linus Tech Tips", channel: "Linus Tech Tips", videoId: "7n-qBpMM8Gg" }
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
    description: 'Prodotto di qualità premium - Spedizione rapida',
    image: generateImageUrl(product.category)
  };
}

function generateDailyDeals() {
  console.log('\n🔄 Generando offerte giornaliere...');
  dealsData = [];
  const dealsCount = 12;

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
  
  const topics = [
    "Migliori cuffie wireless con cancellazione del rumore 2024",
    "Come scegliere il robot aspirapolvere ideale per casa",
    "Smartwatch: Guida completa all'acquisto e confronto modelli",
    "Accessori smart home più convenienti per automatizzare"
  ];

  articlesData = [];

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const categories = ["Tecnologia", "Casa", "Sporttech", "Lifestyle"];
    
    articlesData.push({
      id: i + 1,
      title: topic,
      excerpt: topic.substring(0, 100),
      content: `Analisi approfondita su ${topic}. Scopri le migliori soluzioni disponibili su Amazon con rapporto qualità-prezzo eccezionale. Leggi le recensioni verificate dei clienti e scegli il prodotto più adatto alle tue esigenze.`,
      conclusion: `In conclusione, ${topic.toLowerCase()} è un'area con molte opzioni valide. Considera le tue priorità e scegli in base alle tue esigenze specifiche.`,
      category: categories[i % categories.length],
      date: new Date().toISOString().split('T')[0],
      readTime: '5'
    });
    console.log(` ✓ Generato: ${topic}`);
  }

  console.log(`✅ ${articlesData.length} articoli generati`);
}

function generateDailyNews() {
  console.log('\n⚡ Generando tech news...');
  
  const newsTopics = [
    { title: "Apple rilascia iOS 18 con nuove feature AI", icon: "🍎", category: "Apple", author: "Tech News" },
    { title: "Google presenta Pixel 9 con fotocamera rivoluzionaria", icon: "🔍", category: "Google", author: "Tech Daily" },
    { title: "Samsung Galaxy S25 Ultra confermato per gennaio 2025", icon: "📱", category: "Samsung", author: "Mobile News" },
    { title: "Meta lancerà nuovi occhiali AR entro il 2025", icon: "👓", category: "Meta", author: "AR Tech" },
    { title: "Intel annuncia nuovi processori Core Ultra con IA integrata", icon: "⚙️", category: "Intel", author: "Hardware News" }
  ];

  newsData = [];

  for (let i = 0; i < newsTopics.length; i++) {
    const news = newsTopics[i];
    newsData.push({
      id: i + 1,
      title: news.title,
      excerpt: news.title.substring(0, 80),
      content: `${news.title}. Questa è una notizia importante nel settore della tecnologia. Gli esperti prevedono un grande impatto sul mercato nei prossimi mesi. Continua a seguire gli aggiornamenti per rimanere informato sugli ultimi sviluppi.`,
      icon: news.icon,
      category: news.category,
      author: news.author,
      date: new Date().toISOString().split('T')[0]
    });
    console.log(` ✓ Generata news: ${news.title}`);
  }

  console.log(`✅ ${newsData.length} news generate`);
}

function generateDailyVideos() {
  console.log('\n🎬 Generando video reviews...');

  videosData = [];

  for (let i = 0; i < 5; i++) {
    const video = youtubeVideos[i % youtubeVideos.length];
    const thumbnailId = video.videoId;
    
    videosData.push({
      id: i + 1,
      product: video.product,
      youtuber: video.youtuber,
      channel: video.channel,
      videoId: video.videoId,
      thumbnail: `https://img.youtube.com/vi/${thumbnailId}/maxresdefault.jpg`,
      views: Math.floor(Math.random() * 5000000).toLocaleString('it-IT'),
      rating: (Math.random() * 2 + 3).toFixed(1),
      description: `Review completo e dettagliato di ${video.product}. ${video.youtuber} analizza tutte le caratteristiche, i pro e i contro di questo prodotto. Perfetto per chi sta considerando l'acquisto. Guarda il video completo per scoprire tutte le informazioni tecniche.`
    });
    console.log(` ✓ Generato video: ${video.product}`);
  }

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
