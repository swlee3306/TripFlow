// Vercel API Route for checklists
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

  console.log('Checklist index API called:', {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body
  });

  try {
    // Connect to Redis Cloud
    const redisClient = createClient({
      url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
    });

    await redisClient.connect();

    if (req.method === 'GET') {
      // Get all checklists from Redis
      const keys = await redisClient.keys('checklist:*');
      const checklists = [];
      
      for (const key of keys) {
        const checklistData = await redisClient.get(key);
        if (checklistData) {
          const checklist = JSON.parse(checklistData);
          checklists.push(checklist);
        }
      }
      
      // Sort by creation date (newest first)
      checklists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      console.log('Returning checklists:', checklists);
      
      res.status(200).json({
        checklists: checklists,
        message: 'Checklists loaded successfully'
      });
    } else if (req.method === 'POST') {
      // Create new checklist
      const checklist = req.body;
      
      // Generate unique ID if not provided
      if (!checklist.id) {
        checklist.id = Date.now().toString();
      }
      
      // Set creation date if not provided
      if (!checklist.createdAt) {
        checklist.createdAt = new Date().toISOString();
      }
      
      // Calculate total items
      if (checklist.items) {
        checklist.total = checklist.items.length;
        checklist.completed = 0; // Initialize completed count
      }
      
      // Save to Redis with key pattern: checklist:id
      await redisClient.set(`checklist:${checklist.id}`, JSON.stringify(checklist));
      
      res.status(200).json({
        message: 'Checklist created successfully',
        checklist: checklist,
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
    await redisClient.disconnect();
  } catch (error) {
    console.error('Error handling checklists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
