const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const config = require('./config/config');

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Явная раздача roadmap.json: UTF-8, без BOM, с fallback на data/roadmap.json
app.get('/data/roadmap.json', (req, res) => {
  const frontendPath = path.join(__dirname, '../frontend/data/roadmap.json');
  const rootDataPath = path.join(__dirname, '../data/roadmap.json');

  function trySend(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return null;
    try {
      let raw = fs.readFileSync(filePath, 'utf8');
      raw = raw.replace(/^\uFEFF/, '');
      JSON.parse(raw);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.send(raw);
      return true;
    } catch (err) {
      console.error('roadmap.json parse error at', filePath, err.message);
      return false;
    }
  }

  if (trySend(frontendPath)) return;
  if (trySend(rootDataPath)) return;
  res.status(404).set('Content-Type', 'application/json').send(JSON.stringify({ error: 'roadmap.json not found or invalid' }));
});

// Статические файлы фронтенда
app.use(express.static(path.join(__dirname, '../frontend')));

// Статические файлы данных (остальное в /data)
app.use('/data', express.static(path.join(__dirname, '../data')));

// API Routes
app.use('/api/blog', require('./routes/blog'));
app.use('/api/portfolio', require('./routes/portfolio'));

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Запуск сервера
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
});

module.exports = app;

