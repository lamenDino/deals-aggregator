import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Percorsi file per persistenza dati
const DATA_DIR = path.join(dirname, 'data');
const DEALS_FILE = path.join(DATA_DIR, 'deals.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const VIDEOS_FILE = path.join(DATA_DIR, 'videos.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

// Assicurati che la directory data esista
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Carica dati dai file
function loadData(filepath, defaultValue = []) {
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Errore caricamento ${filepath}:`, error.message);
  }
  return defaultValue;
}

// Salva dati nei file
function saveData(filepath, data) {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`✅ Dati salvati: ${filepath}`);
  } catch (error) {
    console.error(`❌ Errore salvataggio ${filepath}:`, error.message);
  }
}

let dealsData = loadData(DEALS_FILE, []);
let articlesData = loadData(ARTICLES_FILE, []);
let newsData = loadData(NEWS_FILE, []);
let videosData = loadData(VIDEOS_FILE, []);
let historyData = loadData(HISTORY_FILE, []);
let lastUpdateTime = new Date();

console.log('🚀 Groq API inizializzata');
console.log(`📊 Dati caricati: ${dealsData.length} offerte, ${articlesData.length} articoli, ${newsData.length} news, ${videosData.length} video`);

const amazonProducts = [
  { name: 'Cuffie Bluetooth Premium ANC Sony WH-1000XM5', category: 'elettronica', basePrice: 379.99 },
  { name: 'Robot Aspirapolvere iRobot Roomba j7', category: 'casa', basePrice: 799.99 },
  { name: 'Apple Watch Series 9 45mm GPS', category: 'sport', basePrice: 429.99 },
  { name: 'Frullatore Vitamix A3500i Ascent', category: 'casa', basePrice: 749.99 },
  { name: 'Zaino Fotografico Peak Design Everyday 30L', category: 'moda', basePrice: 299.99 },
];

// Dati fissi per news e videos
const newsCategories = ['apple', 'android', 'google', 'hardware', 'vrar'];
const videoCategories = ['smartphone', 'computer', 'tablet', 'audio'];

function generateImageUrl(category) {
  const urls = {
    elettronica: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    casa: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
    sport: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
  };
  return urls[category] || urls.elettronica;
}

async function generateProductDescription(productName, category) {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Scrivi una descrizione breve (60 caratteri max) per "${productName}". Solo testo.`,
      }],
      max_tokens: 80,
      temperature: 0.7,
    });
    return response.choices[0].message.content.trim().substring(0, 60);
  } catch (error) {
    return 'Prodotto premium di qualità superiore';
  }
}

function generateRealisticDeal() {
  const product = amazonProducts[Math.floor(Math.random() * amazonProducts.length)];
  const discount = Math.floor((Math.random() * 45 - 10) + 10);
  const discountPrice = product.basePrice * (1 - discount / 100);
  const rating = (Math.random() * 0.8 + 4.2).toFixed(1);
  const reviews = Math.floor(Math.random() * (8000 - 400) + 400);

  return {
    id: Math.floor(Math.random() * 1000000),
    title: product.name,
    category: product.category,
    originalPrice: parseFloat(product.basePrice.toFixed(2)),
    discountPrice: parseFloat(discountPrice.toFixed(2)),
    discount: discount,
    rating: parseFloat(rating),
    reviews: reviews,
    description: 'Prodotto di qualità premium - Spedizione rapida',
    image: generateImageUrl(product.category),
    addedAt: new Date().toISOString(),
  };
}

async function generateDailyDeals() {
  console.log('🔄 Generando offerte giornaliere...');
  const newDeals = [];
  const usedProducts = new Set();

  for (let i = 0; i < 12; i++) {
    let deal;
    let attempts = 0;
    do {
      deal = generateRealisticDeal();
      attempts++;
    } while (usedProducts.has(deal.title) && attempts < 5);

    if (!usedProducts.has(deal.title)) {
      usedProducts.add(deal.title);
      deal.description = await generateProductDescription(deal.title, deal.category);
      newDeals.push(deal);
      console.log(`✅ ${deal.title} - ${deal.discount}%`);
    }
  }

  if (dealsData.length > 0) {
    historyData.push({
      date: new Date().toISOString(),
      deals: dealsData,
      type: 'deals',
    });
  }

  dealsData = newDeals;
  saveData(DEALS_FILE, dealsData);
  saveData(HISTORY_FILE, historyData);
}

async function generateDailyArticles() {
  console.log('📝 Generando articoli del giorno...');
  const newArticles = [];
  const topics = [
    'Migliori cuffie wireless con cancellazione del rumore',
    'Come scegliere il robot aspirapolvere ideale',
    'Smartwatch: Guida completa all\'acquisto',
    'Accessori smart home più convenienti',
  ];

  for (let i = 0; i < 3; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    newArticles.push({
      id: i + 1,
      title: topic,
      excerpt: `Scopri i migliori prodotti e consigli per ${topic.toLowerCase()}`,
      category: 'Tecnologia',
      date: new Date().toISOString().split('T')[0],
      readTime: Math.floor(Math.random() * 5 + 3),
      addedAt: new Date().toISOString(),
    });
    console.log(`✅ ${topic}`);
  }

  if (articlesData.length > 0) {
    historyData.push({
      date: new Date().toISOString(),
      articles: articlesData,
      type: 'articles',
    });
  }

  articlesData = newArticles;
  saveData(ARTICLES_FILE, articlesData);
  saveData(HISTORY_FILE, historyData);
}

function generateDailyNews() {
  console.log('📰 Generando news quotidiane...');
  const newsTemplates = [
    { title: 'Apple annuncia nuovi prodotti con AI integrata', category: 'apple', icon: '🍎' },
    { title: 'Samsung Galaxy S25 con display innovativo', category: 'android', icon: '📱' },
    { title: 'Google Pixel 9 Pro Fold il pieghevole sottile', category: 'google', icon: '🔍' },
    { title: 'Nvidia RTX 6000 Ada la GPU più potente', category: 'hardware', icon: '💻' },
    { title: 'Meta Quest 4 headset VR di nuova generazione', category: 'vrar', icon: '🥽' },
  ];

  const newNews = newsTemplates.map((item, idx) => ({
    id: idx + 1,
    title: item.title,
    excerpt: `Scopri le ultime novità su ${item.title.toLowerCase()}`,
    category: item.category,
    date: new Date().toISOString().split('T')[0],
    author: 'LamenDino News',
    icon: item.icon,
    content: `${item.title} - Ultimo aggiornamento: ${new Date().toLocaleDateString('it-IT')}`,
    addedAt: new Date().toISOString(),
  }));

  newsData = newNews;
  saveData(NEWS_FILE, newsData);
  console.log(`📰 ${newsData.length} news generate`);
}

function generateDailyVideos() {
  console.log('🎬 Generando video giornalieri...');
  const videoTemplates = [
    { product: 'Sony WH-1000XM5', youtuber: 'Sony Official', videoId: 'wwUIUKZ7D8', category: 'audio', views: '5.2M' },
    { product: 'iPhone 16 Pro Max', youtuber: 'Apple', videoId: 'sB0yBZz3wLY', category: 'smartphone', views: '12.5M' },
    { product: 'Samsung Galaxy S25', youtuber: 'Samsung Mobile', videoId: 'jTRrKdHdHEo', category: 'smartphone', views: '8.9M' },
    { product: 'MacBook Pro M4', youtuber: 'Apple', videoId: 'rDz-hKGxFQg', category: 'computer', views: '9.7M' },
    { product: 'iPad Pro 2025', youtuber: 'Apple', videoId: 'N0ZXvPDQS1s', category: 'tablet', views: '7.3M' },
  ];

  const newVideos = videoTemplates.map((item, idx) => ({
    id: idx + 1,
    product: item.product,
    youtuber: item.youtuber,
    channel: `${item.youtuber} Official Channel`,
    views: item.views,
    rating: (Math.random() * 0.5 + 4.5).toFixed(1),
    videoId: item.videoId,
    category: item.category,
    thumbnail: `https://img.youtube.com/vi/${item.videoId}/maxresdefault.jpg`,
    description: `Presentazione ufficiale di ${item.product}`,
    addedAt: new Date().toISOString(),
  }));

  videosData = newVideos;
  saveData(VIDEOS_FILE, videosData);
  console.log(`🎬 ${videosData.length} video generate`);
}

// Scheduling: ogni giorno alle 08:00
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Task schedulato - Generazione giornaliera');
  await generateDailyDeals();
  await generateDailyArticles();
  generateDailyNews();
  generateDailyVideos();
  lastUpdateTime = new Date();
});

// Generazione iniziale
console.log('🚀 Generazione iniziale al startup...');
await generateDailyDeals();
await generateDailyArticles();
generateDailyNews();
generateDailyVideos();

// API Endpoints
app.get('/api/deals', (req, res) => {
  res.json({
    deals: dealsData,
    articles: articlesData,
    news: newsData,
    videos: videosData,
    lastUpdate: lastUpdateTime,
    history: historyData.slice(-30),
  });
});

app.post('/api/regenerate', async (req, res) => {
  try {
    console.log('🔄 Rigenerazione manuale...');
    await generateDailyDeals();
    await generateDailyArticles();
    generateDailyNews();
    generateDailyVideos();
    lastUpdateTime = new Date();
    res.json({
      success: true,
      message: 'Tutti i dati rigenerati',
      deals: dealsData.length,
      articles: articlesData.length,
      news: newsData.length,
      videos: videosData.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Errore:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', (req, res) => {
  res.json(historyData.slice(-60));
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    deals: dealsData.length,
    articles: articlesData.length,
    news: newsData.length,
    videos: videosData.length,
    lastUpdate: lastUpdateTime,
  });
});

app.use(express.static(dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌟 Server avviato su http://localhost:${PORT}`);
  console.log(`📊 Deals: ${dealsData.length} | Articoli: ${articlesData.length} | News: ${newsData.length} | Video: ${videosData.length}`);
  console.log('⏰ Prossima generazione domani alle 08:00 AM');
});
