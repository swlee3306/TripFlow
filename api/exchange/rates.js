// Vercel API Route for exchange rates
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { base = 'KRW' } = req.query;
    
    // Mock exchange rates for demo
    const rates = {
      USD: 0.00075,
      EUR: 0.00069,
      JPY: 0.11,
      CNY: 0.0054,
      GBP: 0.00059,
      AUD: 0.0011,
      CAD: 0.0010,
    };
    
    res.status(200).json({
      base: base,
      date: new Date().toISOString().split('T')[0],
      rates: rates,
    });
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
