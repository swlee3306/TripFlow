// Vercel API Route for expenses
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
      // Get all expenses
      res.status(200).json({
        expenses: [],
      });
    } else if (req.method === 'POST') {
      // Add new expense
      const expense = req.body;
      expense.id = Date.now().toString();
      expense.date = new Date().toISOString();
      
      res.status(200).json({
        message: 'Expense added successfully',
        expense: expense,
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
