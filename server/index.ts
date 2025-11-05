// server/index.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import generateRoutes from './routes/generate';
import lessonsRoutes from './routes/lessons';
import cheatSheetRoutes from './routes/cheat-sheet';
import sentenceAnalysisRoutes from './routes/sentence-analysis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  //console.log(`[SERVER] ${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Special logging for /api/generate
  if (req.url.includes('/api/generate')) {
    console.log(`[SERVER] 🚨 GENERATE REQUEST DETECTED! ${req.method} ${req.url}`);
    console.log(`[SERVER] Generate Headers:`, req.headers);
    console.log(`[SERVER] Generate Body:`, req.body);
  }
  
  next();
});

app.use('/output', express.static(path.join(process.cwd(), 'output')));
app.use('/assets', express.static(path.join(process.cwd(), 'assets')));

// Add a simple health check
app.get('/api/health', (req, res) => {
  console.log('[SERVER] 💚 GET /api/health - Health check');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add test route for generate
app.post('/api/generate-test', (req, res) => {
  console.log('[SERVER] 🧪 TEST GENERATE ROUTE HIT!', req.body);
  res.json({ test: 'success', received: req.body });
});

console.log('[SERVER] 🔧 Mounting routes...');
app.use('/api/generate', generateRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/cheat-sheet', cheatSheetRoutes);
app.use('/api/sentence-analysis', sentenceAnalysisRoutes);
console.log('[SERVER] 📁 Routes mounted successfully');

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
});