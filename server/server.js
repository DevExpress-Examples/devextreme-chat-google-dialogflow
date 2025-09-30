import express from 'express';
import path from 'node:path';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'node:url';
import detectIntent from './dialogflow.js';

const app = express();
const port = 3000;

// eslint-disable-next-line no-underscore-dangle
const __filename = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(__filename);

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  return next();
});

app.use(express.static(path.join(__dirname, './public')));

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/webhook', async (request, response) => {
  const { message, sessionId } = request.body;

  if (!message || !sessionId) {
    return response.status(400).json({ error: 'Message and sessionId are required' });
  }

  try {
    const result = await detectIntent(message, sessionId);

    return response.json({ response: result });
  } catch (error) {
    return response.status(500).json({ error: 'Error processing request' });
  }
});

app.listen(port, () => {
});
