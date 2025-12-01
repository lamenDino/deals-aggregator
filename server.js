import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inizializza Groq con la tua API key
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Dati in memoria
let dealsData = [];
let articlesData = [];
let lastUpdateTime = new Date();

console.log('✅ Groq API inizializzata');
console.log('🔑 API Key caricata:', process.env.GROQ_API_KEY.substring(0, 20) + '...');
console.log('🤖 Modello: llama-3.3-70b-versatile');

// === FUNZIONI PER GENERARE CONTENUTI CON GROQ ===

async function generateProductDescription(productName, category) {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: `Scrivi una descrizione breve (100 caratteri max) e accattivante per: ${productName} (${category})`
                }
            ],
            max_tokens: 100,
            temperature: 0.7
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('❌ Errore nella generazione della descrizione:', error.message);
        return `Prodotto di qualità nella categoria ${category}.`;
    }
}

async function generateArticle(topic, category) {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "user",
                    content: `Scrivi un breve articolo su: "${topic}" (Categoria: ${category}). Formato: Titolo | Estratto (80 parole). Separa con |`
                }
            ],
            max_tokens: 250,
            temperature: 0.8
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error('❌ Errore nella generazione dell\'articolo:', error.message);
        return `${topic}|Articolo interessante su ${topic}`;
    }
}

// === FUNZIONI PER GENERARE OFFERTE FITTIZIE ===

function generateRandomDeal() {
    const products = [
        { name: "Cuffie Bluetooth Premium ANC", category: "elettronica", basePrice: 299.99 },
        { name: "Robot Aspirapolvere Smart 4G", category: "casa", basePrice: 449.99 },
        { name: "Smartwatch Sportivo GPS", category: "sport", basePrice: 249.99 },
        { name: "Frullatore ad Alta Potenza 3000W", category: "casa", basePrice: 199.99 },
        { name: "Zaino Fotografico Impermeabile", category: "moda", basePrice: 89.99 },
        { name: "Lettore eBook 7\" con Luce", category: "libri", basePrice: 159.99 },
        { name: "Caricabatterie Solare Portatile 20W", category: "elettronica", basePrice: 79.99 },
        { name: "Altoparlante Portatile Bluetooth 360°", category: "elettronica", basePrice: 129.99 },
        { name: "Borraccia Termica Acciaio 500ml", category: "casa", basePrice: 49.99 },
        { name: "Lampada LED Smart WiFi RGB", category: "casa", basePrice: 89.99 },
        { name: "Webcam 4K con Autofocus", category: "elettronica", basePrice: 119.99 },
        { name: "Tappetino Yoga Antiscivolo Premium", category: "sport", basePrice: 59.99 }
    ];

    const product = products[Math.floor(Math.random() * products.length)];
    const discount = Math.floor(Math.random() * (50 - 15 + 1)) + 15;
    const discountPrice = product.basePrice * (1 - discount / 100);
    const rating = (Math.random() * (4.9 - 4.0) + 4.0).toFixed(1);
    const reviews = Math.floor(Math.random() * (5000 - 300 + 1)) + 300;

    return {
        id: Math.floor(Math.random() * 100000),
        title: product.name,
        category: product.category,
        originalPrice: parseFloat(product.basePrice.toFixed(2)),
        discountPrice: parseFloat(discountPrice.toFixed(2)),
        discount,
        rating: parseFloat(rating),
        reviews,
        description: `Prodotto di qualità premium nella categoria ${product.category}.`,
        image: ""
    };
}

// === FUNZIONE PER GENERARE OFFERTE GIORNALIERE ===

async function generateDailyDeals() {
    console.log('\n🔄 Generando offerte giornaliere...');
    
    dealsData = [];
    
    for (let i = 0; i < 6; i++) {
        const deal = generateRandomDeal();
        deal.description = await generateProductDescription(deal.title, deal.category);
        dealsData.push(deal);
        console.log(`  ✓ Generato: ${deal.title}`);
    }
    
    console.log(`✅ ${dealsData.length} offerte generate con successo`);
    lastUpdateTime = new Date();
}

// === FUNZIONE PER GENERARE ARTICOLI GIORNALIERI ===

async function generateDailyArticles() {
    console.log('\n📝 Generando articoli del giorno...');
    
    const topics = [
        { topic: "Migliori auricolari wireless 2024", category: "Tecnologia" },
        { topic: "Come scegliere il robot aspirapolvere ideale", category: "Casa" },
        { topic: "Smartwatch: Guida completa all'acquisto", category: "Sporttech" },
        { topic: "Prodotti smart home più convenienti", category: "Tecnologia" },
        { topic: "Le migliori marche di zaini da viaggio", category: "Lifestyle" }
    ];

    articlesData = [];

    for (let i = 0; i < 3; i++) {
        const { topic, category } = topics[Math.floor(Math.random() * topics.length)];
        const content = await generateArticle(topic, category);
        
        if (content) {
            const [title, excerpt] = content.split('|').map(s => s.trim());
            
            articlesData.push({
                id: i + 1,
                title: title.substring(0, 100),
                excerpt: excerpt.substring(0, 150),
                category,
                date: new Date().toISOString().split('T')[0],
                readTime: `${Math.floor(Math.random() * 5) + 3} min`
            });
            console.log(`  ✓ Generato: ${title}`);
        }
    }
    
    console.log(`✅ ${articlesData.length} articoli generati con successo`);
}

// === SCHEDULER - Task automatici giornalieri ===

// Esegui la generazione alle 8:00 AM ogni giorno
cron.schedule('0 8 * * *', async () => {
    console.log('\n⏰ [' + new Date().toLocaleString('it-IT') + '] Task schedulato: Generazione giornaliera');
    await generateDailyDeals();
    await generateDailyArticles();
});

// Esegui una volta all'avvio del server
console.log('\n🚀 Generazione iniziale al startup...');
await generateDailyDeals();
await generateDailyArticles();

// === ENDPOINTS API ===

app.get('/api/deals', (req, res) => {
    res.json({
        deals: dealsData,
        articles: articlesData,
        lastUpdate: lastUpdateTime
    });
});

// Endpoint per rigenerare manualmente
app.post('/api/regenerate', async (req, res) => {
    try {
        console.log('\n🔄 Rigenerazione manuale richiesta...');
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
        console.error('❌ Errore nella rigenerazione:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        deals: dealsData.length, 
        articles: articlesData.length,
        lastUpdate: lastUpdateTime
    });
});

// Serve il frontend statico
app.use(express.static(__dirname));

// Serve index.html per tutte le rotte (SPA)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ Server avviato su http://localhost:${PORT}`);
    console.log(`📊 Deals: ${dealsData.length} | Articoli: ${articlesData.length}`);
    console.log(`⏰ Prossima generazione: domani alle 08:00 AM`);
    console.log(`🔄 Per rigenerare manualmente: POST http://localhost:${PORT}/api/regenerate`);
});
