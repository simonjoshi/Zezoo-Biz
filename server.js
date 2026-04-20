import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app  = express();
const PORT = process.env.PORT || 3000;
const KEY  = process.env.BRAVE_API_KEY || '';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');

app.use(express.static(DIST));

app.get('/api/search', async (req, res) => {
  const { q = '', location = '', type = 'search' } = req.query;
  let query;
  if (type === 'featured') {
    query = 'small business for sale USA (site:bizbuysell.com OR site:loopnet.com OR site:businessesforsale.com)';
  } else {
    const loc = location ? ` ${location}` : ' United States';
    query = `${q} business for sale${loc} (site:bizbuysell.com OR site:loopnet.com OR site:businessesforsale.com OR site:flippa.com)`;
  }
  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&search_lang=en&country=us`;
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': KEY }
    });
    const data = await r.json();
    const results = (data.web?.results || []).map(item => {
      const name = item.title.split(/\s[-–|]\s|\s\|\s/)[0].trim();
      const priceM = (item.description || '').match(/\$[\d,]+(?:[KkMm])?/);
      const locM   = (item.title + ' ' + (item.description||'')).match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)?),\s*([A-Z]{2})\b/);
      return {
        name,
        description: item.description || '',
        sourceUrl:   item.url,
        location:    locM ? locM[0] : 'United States',
        price:       priceM ? priceM[0] : null,
        revenue:     null,
        cashFlow:    null,
      };
    });
    res.json(results);
  } catch (e) {
    console.error('Search error:', e);
    res.status(500).json([]);
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));

app.listen(PORT, () => console.log(`ZeeZoo-Biz running on ${PORT}`));
