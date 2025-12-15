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
let historyData = loadData(HISTORY_FILE, []);
let lastUpdateTime = new Date();

console.log('🚀 Groq API inizializzata');
console.log(`📊 Dati caricati: ${dealsData.length} offerte, ${articlesData.length} articoli`);

const amazonProducts = [
  { name: 'Cuffie Bluetooth Premium ANC Sony WH-1000XM5', category: 'elettronica', basePrice: 379.99, imageSearch: 'headphones sony wireless noise cancelling' },
  { name: 'Robot Aspirapolvere iRobot Roomba j7', category: 'casa', basePrice: 799.99, imageSearch: 'robot vacuum cleaner' },
  { name: 'Apple Watch Series 9 45mm GPS', category: 'sport', basePrice: 429.99, imageSearch: 'smartwatch apple watch sport' },
  { name: 'Frullatore Vitamix A3500i Ascent', category: 'casa', basePrice: 749.99, imageSearch: 'blender professional kitchen' },
  { name: 'Zaino Fotografico Peak Design Everyday 30L', category: 'moda', basePrice: 299.99, imageSearch: 'photography backpack camera bag' },
  { name: 'eReader Kindle Oasis 10 generazione', category: 'libri', basePrice: 249.99, imageSearch: 'ereader kindle tablet' },
  { name: 'Powerbank Anker 737 100W 40000mAh', category: 'elettronica', basePrice: 129.99, imageSearch: 'power bank portable charger' },
  { name: 'Speaker JBL Flip 6 Waterproof', category: 'elettronica', basePrice: 149.99, imageSearch: 'bluetooth speaker portable waterproof' },
  { name: 'Bottiglia Termica YETI Rambler 26oz', category: 'casa', basePrice: 89.99, imageSearch: 'thermos water bottle insulated' },
  { name: 'Lampada Intelligente Philips Hue White Ambiance', category: 'casa', basePrice: 29.99, imageSearch: 'smart light bulb led' },
  { name: 'Webcam Logitech 4K Pro Stream', category: 'elettronica', basePrice: 199.99, imageSearch: 'webcam 4k streaming' },
  { name: 'Tappetino Yoga Lululemon 5mm Purple', category: 'sport', basePrice: 128.00, imageSearch: 'yoga mat purple exercise' },
  { name: 'Monitor BenQ 27 pollici 2K 144Hz', category: 'elettronica', basePrice: 349.99, imageSearch: 'gaming monitor 27 inch' },
  { name: 'Tastiera Meccanica Corsair K95 RGB Platinum', category: 'elettronica', basePrice: 229.99, imageSearch: 'mechanical keyboard gaming rgb' },
  { name: 'Mouse Logitech MX Master 3S', category: 'elettronica', basePrice: 99.99, imageSearch: 'wireless mouse professional' },
];

function generateImageUrl(category, productName) {
  const categoryUrls = {
    elettronica: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1598933015220-04419ba12e28?w=300&h=300&fit=crop',
    ],
    casa: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1570222094114-d054a0be6070?w=300&h=300&fit=crop',
    ],
    sport: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&h=300&fit=crop',
    ],
    moda: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop'],
    libri: ['https://images.unsplash.com/photo-1507842217343-583f20270319?w=300&h=300&fit=crop'],
  };

  const urls = categoryUrls[category] || categoryUrls.elettronica;
  return urls[Math.floor(Math.random() * urls.length)];
}

async function generateProductDescription(productName, category) {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Scrivi una descrizione breve (60 caratteri max) per "${productName}". Solo testo, niente numeri.`,
        },
      ],
      max_tokens: 80,
      temperature: 0.7,
    });
    return response.choices[0].message.content.trim().substring(0, 60);
  } catch (error) {
    console.error('Errore descrizione:', error.message);
    return 'Prodotto premium di qualità superiore';
  }
}

function generateRealisticDeal() {
  const product = amazonProducts[Math.floor(Math.random() * amazonProducts.length)];
  const discount = Math.floor((Math.random() * 45 - 10) + 10);
  const discountPrice = product.basePrice * (1 - discount / 100);
  const baseRating = 4.2;
  const variance = Math.random() - 0.5;
  const rating = Math.max(3.5, Math.min(4.9, baseRating + variance)).toFixed(1);
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
    image: generateImageUrl(product.category, product.name),
    addedAt: new Date().toISOString(),
  };
}

async function generateDailyDeals() {
  console.log('🔄 Generando offerte giornaliere...');
  
  const newDeals = [];
  const dealsCount = 12;
  const usedProducts = new Set();

  for (let i = 0; i < dealsCount; i++) {
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

  // Salva i vecchi deal nella storia
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

  console.log(`📊 ${dealsData.length} offerte generate con immagini`);
  return dealsData;
}

async function generateDailyArticles() {
  console.log('📝 Generando articoli del giorno...');

  const topics = [
    { topic: 'Migliori cuffie wireless con cancellazione del rumore 2024', category: 'Tecnologia' },
    { topic: 'Come scegliere il robot aspirapolvere ideale per casa', category: 'Casa' },
    { topic: 'Smartwatch: Guida completa all\'acquisto e confronto modelli', category: 'Sporttech' },
    { topic: 'Accessori smart home più convenienti per automatizzare', category: 'Tecnologia' },
  ];

  const newArticles = [];

  for (let i = 0; i < 3; i++) {
    const { topic, category } = topics[Math.floor(Math.random() * topics.length)];
    const content = await generateArticle(topic, category);

    if (content && content.includes('|')) {
      const parts = content.split('|');
      const title = parts[0].trim().substring(0, 100);
      const excerpt = parts[1].trim().substring(0, 150);

      newArticles.push({
        id: i + 1,
        title: title,
        excerpt: excerpt,
        category: category,
        date: new Date().toISOString().split('T')[0],
        readTime: Math.floor(Math.random() * 5 + 3),
        addedAt: new Date().toISOString(),
      });
      console.log(`✅ ${title}`);
    }
  }

  // Salva i vecchi articoli nella storia
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

  console.log(`📊 ${articlesData.length} articoli generati`);
  return articlesData;
}

async function generateArticle(topic, category) {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: `Scrivi articolo su "${topic}". Formato: Titolo | Testo (100 parole). Usa SOLO il separatore |`,
        },
      ],
      max_tokens: 300,
      temperature: 0.8,
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Errore articolo:', error.message);
    return topic;
  }
}

// Scheduling: ogni giorno alle 08:00
cron.schedule('0 8 * * *', async () => {
  console.log('⏰ Task schedulato - Generazione giornaliera');
  await generateDailyDeals();
  await generateDailyArticles();
  lastUpdateTime = new Date();
});

// Generazione iniziale al startup
console.log('🚀 Generazione iniziale al startup...');
await generateDailyDeals();
await generateDailyArticles();

// API Endpoints
app.get('/api/deals', (req, res) => {
  res.json({
    deals: dealsData,
    articles: articlesData,
    lastUpdate: lastUpdateTime,
    history: historyData.slice(-30), // Ultimi 30 giorni
  });
});

app.post('/api/regenerate', async (req, res) => {
  try {
    console.log('🔄 Rigenerazione manuale...');
    await generateDailyDeals();
    await generateDailyArticles();
    lastUpdateTime = new Date();
    res.json({
      success: true,
      message: 'Offerte e articoli rigenerati',
      deals: dealsData.length,
      articles: articlesData.length,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Errore:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', (req, res) => {
  res.json(historyData.slice(-60)); // Ultimi 60 giorni
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    deals: dealsData.length,
    articles: articlesData.length,
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
  console.log(`📊 Deals: ${dealsData.length} | Articoli: ${articlesData.length}`);
  console.log('⏰ Prossima generazione domani alle 08:00 AM');
});
