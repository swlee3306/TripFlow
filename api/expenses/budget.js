// Vercel API Route for budget management
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Get budget
      res.status(200).json({
        budget: 0,
      });
    } else if (req.method === 'POST') {
      // Set budget
      const { budget } = req.body;
      
      res.status(200).json({
        message: 'Budget set successfully',
        budget: budget,
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
