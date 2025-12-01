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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

let dealsData = [];
let articlesData = [];
let lastUpdateTime = new Date();

console.log('✅ Groq API inizializzata');
console.log('🔑 API Key caricata:', process.env.GROQ_API_KEY.substring(0, 20) + '...');
console.log('🤖 Modello: llama-3.3-70b-versatile');

const amazonProducts = [
    { name: "Cuffie Bluetooth Premium ANC Sony WH-1000XM5", category: "elettronica", basePrice: 379.99, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop" },
    { name: "Robot Aspirapolvere iRobot Roomba j7+", category: "casa", basePrice: 799.99, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop" },
    { name: "Apple Watch Series 9 45mm GPS", category: "sport", basePrice: 429.99, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&h=300&fit=crop" },
    { name: "Frullatore Vitamix A3500i Ascent", category: "casa", basePrice: 749.99, image: "https://images.unsplash.com/photo-1570222094114-d054a0be6070?w=300&h=300&fit=crop" },
    { name: "Zaino Fotografico Peak Design Everyday 30L", category: "moda", basePrice: 299.99, image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop" },
    { name: "eReader Kindle Oasis 10 generazione", category: "libri", basePrice: 249.99, image: "https://images.unsplash.com/photo-1507842217343-583f20270319?w=300&h=300&fit=crop" },
    { name: "Powerbank Anker 737 100W 40000mAh", category: "elettronica", basePrice: 129.99, image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5
