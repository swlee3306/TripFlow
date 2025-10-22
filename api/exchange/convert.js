// Vercel API Route for currency conversion
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
    const { from, to, amount } = req.query;
    
    if (!from || !to || !amount) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }
    
    // Mock conversion (simplified)
    const convertedAmount = amountNum * 0.00075; // Mock rate
    
    res.status(200).json({
      from: from,
      to: to,
      amount: amountNum,
      converted_amount: convertedAmount,
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
