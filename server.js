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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

let dealsData = [];
let articlesData = [];
let reviewsData = [];
let videosData = [];
let lastUpdateTime = new Date();
let dealsArchive = []; // Archivio storico offerte
let articlesArchive = []; // Archivio storico articoli
let reviewsArchive = []; // Archivio storico recensioni
let videosArchive = []; // Archivio storico video
const ARCHIVE_FILE = path.join(__dirname, 'data-archive.json');
const ARCHIVE_MAX_DAYS = 30; // Mantieni i dati degli ultimi 30 giorni

console.log('✅ Groq API inizializzata');
console.log('🔑 API Key caricata:', process.env.GROQ_API_KEY.substring(0, 20) + '...');
console.log('🤖 Modello: llama-3.3-70b-versatile');

// ===================== FUNZIONI DI ARCHIVIO =====================

function loadArchive() {
 try {
   if (fs.existsSync(ARCHIVE_FILE)) {
     const data = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
     const archive = JSON.parse(data);
     dealsArchive = archive.dealsArchive || [];
     articlesArchive = archive.articlesArchive || [];
     reviewsArchive = archive.reviewsArchive || [];
     videosArchive = archive.videosArchive || [];
     console.log('\ud83d\udcc1 Archivio caricato:', {
       deals: dealsArchive.length,
       articles: articlesArchive.length,
       reviews: reviewsArchive.length,
       videos: videosArchive.length
     });
   } else {
     console.log('\ud83d\udccb Nessun archivio trovato - Creazione nuovo');
   }
 } catch (error) {
   console.error('\u274c Errore nel caricamento archivio:', error.message);
 }
}

function saveArchive() {
 try {
   const archive = {
     dealsArchive,
     articlesArchive,
     reviewsArchive,
     videosArchive,
     lastSaved: new Date().toISOString()
   };
   fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2));
   console.log('\ud83d\udcd1 Archivio salvato con successo');
 } catch (error) {
   console.error('\u274c Errore nel salvataggio archivio:', error.message);
 }
}

function addToArchive(newDeals, newArticles, newReviews, newVideos) {
 const now = new Date();
 const dateKey = now.toISOString().split('T')[0];

 const dealsWithDate = newDeals.map(d => ({...d, addedDate: dateKey, timestamp: now.getTime()}));
 const articlesWithDate = newArticles.map(a => ({...a, addedDate: dateKey, timestamp: now.getTime()}));
 const reviewsWithDate = newReviews.map(r => ({...r, addedDate: dateKey, timestamp: now.getTime()}));
 const videosWithDate = newVideos.map(v => ({...v, addedDate: dateKey, timestamp: now.getTime()}));

 dealsArchive.unshift(...dealsWithDate);
 articlesArchive.unshift(...articlesWithDate);
 reviewsArchive.unshift(...reviewsWithDate);
 videosArchive.unshift(...videosWithDate);

 const cutoffTime = now.getTime() - (ARCHIVE_MAX_DAYS * 24 * 60 * 60 * 1000);
 dealsArchive = dealsArchive.filter(d => d.timestamp > cutoffTime);
 articlesArchive = articlesArchive.filter(a => a.timestamp > cutoffTime);
 reviewsArchive = reviewsArchive.filter(r => r.timestamp > cutoffTime);
 videosArchive = videosArchive.filter(v => v.timestamp > cutoffTime);

 const MAX_ARCHIVE_SIZE = 500;
 dealsArchive = dealsArchive.slice(0, MAX_ARCHIVE_SIZE);
 articlesArchive = articlesArchive.slice(0, MAX_ARCHIVE_SIZE);
 reviewsArchive = reviewsArchive.slice(0, MAX_ARCHIVE_SIZE);
 videosArchive = videosArchive.slice(0, MAX_ARCHIVE_SIZE);

 saveArchive();
}

const amazonProducts = [
    { name: "Cuffie Bluetooth Premium ANC Sony WH-1000XM5", category: "elettronica", basePrice: 379.99, imageSearch: "headphones sony wireless noise cancelling" },
    { name: "Robot Aspirapolvere iRobot Roomba j7+", category: "casa", basePrice: 799.99, imageSearch: "robot vacuum cleaner" },
    { name: "Apple Watch Series 9 45mm GPS", category: "sport", basePrice: 429.99, imageSearch: "smartwatch apple watch sport" },
    { name: "Frullatore Vitamix A3500i Ascent", category: "casa", basePrice: 749.99, imageSearch: "blender professional kitchen" },
    { name: "Zaino Fotografico Peak Design Everyday 30L", category: "moda", basePrice: 299.99, imageSearch: "photography backpack camera bag" },
    { name: "eReader Kindle Oasis 10 generazione", category: "libri", basePrice: 249.99, imageSearch: "ereader kindle tablet" },
    { name: "Powerbank Anker 737 100W 40000mAh", category: "elettronica", basePrice: 129.99, imageSearch: "power bank portable charger" },
    { name: "Speaker JBL Flip 6 Waterproof", category: "elettronica", basePrice: 149.99, imageSearch: "bluetooth speaker portable waterproof" },
    { name: "Bottiglia Termica YETI Rambler 26oz", category: "casa", basePrice: 89.99, imageSearch: "thermos water bottle insulated" },
    { name: "Lampada Intelligente Philips Hue White Ambiance", category: "casa", basePrice: 29.99, imageSearch: "smart light bulb led" },
    { name: "Webcam Logitech 4K Pro Stream", category: "elettronica", basePrice: 199.99, imageSearch: "webcam 4k streaming" },
    { name: "Tappetino Yoga Lululemon 5mm Purple", category: "sport", basePrice: 128.00, imageSearch: "yoga mat purple exercise" },
    { name: "Monitor BenQ 27 pollici 2K 144Hz", category: "elettronica", basePrice: 349.99, imageSearch: "gaming monitor 27 inch" },
    { name: "Tastiera Meccanica Corsair K95 RGB Platinum", category: "elettronica", basePrice: 229.99, imageSearch: "mechanical keyboard gaming rgb" },
    { name: "Mouse Logitech MX Master 3S", category: "elettronica", basePrice: 99.99, imageSearch: "wireless mouse professional" },
    { name: "Cuscino Ergonomico Memory Foam Serta", category: "casa", basePrice: 79.99, imageSearch: "pillow memory foam ergonomic" }
];

function generateImageUrl(category, productName) {
    const categoryUrls = {
        'elettronica': [
            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1598933015220-04419ba12e28?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1587829191301-47ec45cf1487?w=300&h=300&fit=crop'
        ],
        'casa': [
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1570222094114-d054a0be6070?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1565182999555-2174d92991d4?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1584197674293-fc1ee136ebda?w=300&h=300&fit=crop'
        ],
        'sport': [
            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop',
            'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=300&h=300&fit=crop'
        ],
        'moda': [
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop'
        ],
        'libri': [
            'https://images.unsplash.com/photo-1507842217343-583f20270319?w=300&h=300&fit=crop'
        ]
    };
    
    const urls = categoryUrls[category] || categoryUrls['elettronica'];
    return urls[Math.floor(Math.random() * urls.length)];
}

async function generateProductDescription(productName, category) {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{
                role: "user",
                content: `Scrivi una descrizione breve (60 caratteri max) per: ${productName}. Solo testo, niente numeri.`
            }],
            max_tokens: 80,
            temperature: 0.7
        });
        return response.choices[0].message.content.trim().substring(0, 60);
    } catch (error) {
        console.error('❌ Errore descrizione:', error.message);
        return 'Prodotto premium di qualità superiore';
    }
}

async function generateArticle(topic, category) {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{
                role: "user",
                content: `Scrivi articolo su: "${topic}". Formato: [Titolo] | [Testo 100 parole]. Usa SOLO il separatore |`
            }],
            max_tokens: 300,
            temperature: 0.8
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('❌ Errore articolo:', error.message);
        return `${topic}|Articolo interessante su ${topic}`;
    }
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
        image: generateImageUrl(product.category, product.name)
    };
}

async function generateDailyDeals() {
    console.log('\n🔄 Generando offerte giornaliere...');
    dealsData = [];
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
            dealsData.push(deal);
            console.log(`  ✓ Generato: ${deal.title} (-${deal.discount}%) 🖼️`);
        }
    }
    console.log(`✅ ${dealsData.length} offerte generate con immagini`);
    lastUpdateTime = new Date();
     addToArchive(dealsData, [], [], []);
}

async function generateDailyArticles() {
    console.log('\n📝 Generando articoli del giorno...');
    const topics = [
        { topic: "Migliori cuffie wireless con cancellazione del rumore 2024", category: "Tecnologia" },
        { topic: "Come scegliere il robot aspirapolvere ideale per casa", category: "Casa" },
        { topic: "Smartwatch: Guida completa all'acquisto e confronto modelli", category: "Sporttech" },
        { topic: "Accessori smart home più convenienti per automatizzare", category: "Tecnologia" },
        { topic: "Le migliori marche di zaini da viaggio e fotografia", category: "Lifestyle" },
        { topic: "Prodotti hi-fi: come trovare il miglior rapporto qualità-prezzo", category: "Tecnologia" }
    ];

    articlesData = [];
    for (let i = 0; i < 4; i++) {
        const { topic, category } = topics[Math.floor(Math.random() * topics.length)];
        const content = await generateArticle(topic, category);
        
        if (content && content.includes('|')) {
            const parts = content.split('|');
            const title = parts[0].trim().substring(0, 100);
            const excerpt = parts[1].trim().substring(0, 150);
            articlesData.push({
                id: i + 1,
                title: title,
                excerpt: excerpt,
                category,
                date: new Date().toISOString().split('T')[0],
                readTime: `${Math.floor(Math.random() * 5) + 3} min`
            });
            console.log(`  ✓ Generato: ${title}`);
        }
         }
     console.log(`✅ ${articlesData.length} articoli generati`);
     addToArchive([], articlesData, [], []);
    }

        async function generateDailyReviews() {
 console.log('\n\ud83d\udcd1 Generando recensioni del giorno...');
 reviewsData = dealsData.slice(0, 6).map((deal, idx) => ({
 id: idx + 1,
 title: deal.title,
 rating: deal.rating,
 reviews: Math.floor(Math.random() * (500 - 50 + 1)) + 50,
 description: `Recensione completa del prodotto: ${deal.title}`,
 category: deal.category,
 date: new Date().toISOString().split('T')[0]
 }));
 addToArchive([], [], reviewsData, []);
 console.log(`✅ ${reviewsData.length} recensioni generate`);
}

async function generateDailyVideos() {
 console.log('\n🎥 Generando video del giorno...');
 videosData = dealsData.slice(0, 6).map((deal, idx) => ({
 id: idx + 1,
 product: deal.title,
 youtuber: ['TechReviewer', 'UnboxingPro', 'ProductTest', 'ReviewHub'][Math.floor(Math.random() * 4)],
 channel: 'Channel Ufficiale',
 views: Math.floor(Math.random() * (1000000 - 100000 + 1)) + 100000,
 rating: (Math.random() * 0.5 + 4.5).toFixed(1),
 videoId: 'dQw4w9WgXcQ',
 category: deal.category,
 thumbnail: deal.image,
 description: `Video review ufficiale: ${deal.title}`
 }));
 addToArchive([], [], [], videosData);
 console.log(`✅ ${videosData.length} video generati`);
}

cron.schedule('0 8 * * *', async () => {
    console.log('\n⏰ Task schedulato: Generazione giornaliera');
    await generateDailyDeals();
    await generateDailyArticles();
    			await generateDailyReviews();
    			await generateDailyVideos();
});

console.log('\n🚀 Generazione iniziale al startup...');
loadArchive();
await generateDailyDeals();
await generateDailyArticles();
await generateDailyReviews();
await generateDailyVideos();

app.get('/api/deals', (req, res) => {
    res.json({
        deals: dealsData,
     articles: articlesData,
     reviews: reviewsData || [],
     videos: videosData || [],
     lastUpdate: lastUpdateTime,
     ...(req.query.includeArchive === 'true' && {
       dealsArchive: dealsArchive.slice(0, 50),
       articlesArchive: articlesArchive.slice(0, 50),
       reviewsArchive: reviewsArchive.slice(0, 50),
       videosArchive: videosArchive.slice(0, 50)
     })
   
    });
});

app.post('/api/regenerate', async (req, res) => {
    try {
        console.log('\n🔄 Rigenerazione manuale...');
        await generateDailyDeals();
        await generateDailyArticles();
        res.json({
            success: true,
            message: 'Offerte e articoli rigenerati',
            deals: dealsData.length,
            articles: articlesData.length,
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
        lastUpdate: lastUpdateTime
    });
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server avviato su http://localhost:${PORT}`);
    console.log(`📊 Deals: ${dealsData.length} | Articoli: ${articlesData.length}`);
    console.log(`⏰ Prossima generazione: domani alle 08:00 AM`);
    console.log(`🎨 Immagini: Generate da Unsplash (vere foto di prodotti)`);
});
