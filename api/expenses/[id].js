// Vercel API Route for deleting expenses by ID
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
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        res.status(400).json({ error: 'Missing expense ID' });
        return;
      }
      
      // Mock deletion (in real app, delete from database)
      res.status(200).json({
        message: 'Expense deleted successfully',
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
