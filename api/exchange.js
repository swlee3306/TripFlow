// Vercel API Route for exchange - unified handler
function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // 캐시 비활성화
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

export default async function handler(req, res) {
  setCORSHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(p => p);
    const isConvert = pathParts[2] === 'convert';

    // Mock exchange rates
    const rates = {
      USD: 0.00075,
      EUR: 0.00069,
      JPY: 0.11,
      CNY: 0.0054,
      GBP: 0.00059,
      AUD: 0.0011,
      CAD: 0.0010,
    };

    // GET /api/exchange/convert
    if (isConvert) {
      const { from, to, amount } = Object.fromEntries(url.searchParams);
      
      if (!from || !to || !amount) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum)) {
        res.status(400).json({ error: 'Invalid amount' });
        return;
      }

      // Mock conversion
      const convertedAmount = amountNum * 0.00075;

      res.status(200).json({
        from: from,
        to: to,
        amount: amountNum,
        converted_amount: convertedAmount,
      });
      return;
    }

    // GET /api/exchange/rates
    const { base = 'KRW' } = Object.fromEntries(url.searchParams);
    
    res.status(200).json({
      base: base,
      date: new Date().toISOString().split('T')[0],
      rates: rates,
    });
  } catch (error) {
    console.error('Error handling exchange:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

