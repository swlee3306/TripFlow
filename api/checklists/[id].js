// Vercel API Route for individual checklist operations
import { createClient } from 'redis';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  console.log('Checklist [id] API called:', {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body
  });

  try {
    const { id } = req.query;
    
    // For now, return a simple test response
    if (req.method === 'GET') {
      res.status(200).json({
        id: id,
        name: 'Test Checklist',
        type: 'domestic',
        duration: 'weekend',
        items: {
          '여행 준비': ['여행 계획', '숙소 예약'],
          '짐 준비': ['여행 가방', '의류']
        },
        completed: {},
        createdAt: new Date().toISOString(),
        message: 'Test checklist from [id] API'
      });
    } else if (req.method === 'PUT') {
      res.status(200).json({
        message: 'Checklist updated successfully',
        checklist: req.body,
      });
    } else if (req.method === 'DELETE') {
      res.status(200).json({
        message: 'Checklist deleted successfully',
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}