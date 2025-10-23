// Vercel API Route for checklists - Simple version
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Simple response for all requests
    if (req.method === 'GET') {
      res.status(200).json({
        checklists: [],
        message: 'Checklists API is working!'
      });
    } else if (req.method === 'POST') {
      const checklist = req.body;
      res.status(200).json({
        message: 'Checklist created successfully',
        checklist: {
          id: Date.now().toString(),
          ...checklist,
          createdAt: new Date().toISOString()
        }
      });
    } else {
      res.status(200).json({
        message: 'Checklist operation completed',
        method: req.method
      });
    }
  } catch (error) {
    console.error('Error handling checklists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
