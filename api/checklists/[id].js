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
    // Connect to Redis Cloud
    const redisClient = createClient({
      url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
    });

    await redisClient.connect();

    const { id } = req.query;
    const checklistKey = `checklist:${id}`;

    if (req.method === 'GET') {
      // Get specific checklist
      const checklistData = await redisClient.get(checklistKey);
      
      if (checklistData) {
        const checklist = JSON.parse(checklistData);
        res.status(200).json(checklist);
      } else {
        res.status(404).json({ error: 'Checklist not found' });
      }
    } else if (req.method === 'PUT') {
      // Update checklist
      const updatedChecklist = req.body;
      
      // Check if checklist exists
      const existingData = await redisClient.get(checklistKey);
      if (!existingData) {
        res.status(404).json({ error: 'Checklist not found' });
        return;
      }
      
      // Preserve original creation date
      const existingChecklist = JSON.parse(existingData);
      updatedChecklist.createdAt = existingChecklist.createdAt;
      updatedChecklist.id = id; // Ensure ID matches
      
      // Update total and completed counts
      if (updatedChecklist.items) {
        updatedChecklist.total = updatedChecklist.items.length;
        // Count completed items
        updatedChecklist.completed = updatedChecklist.items.filter(item => item.completed).length;
      }
      
      // Save updated checklist
      await redisClient.set(checklistKey, JSON.stringify(updatedChecklist));
      
      res.status(200).json({
        message: 'Checklist updated successfully',
        checklist: updatedChecklist,
      });
    } else if (req.method === 'DELETE') {
      // Delete checklist
      const existingData = await redisClient.get(checklistKey);
      if (!existingData) {
        res.status(404).json({ error: 'Checklist not found' });
        return;
      }
      
      await redisClient.del(checklistKey);
      
      res.status(200).json({
        message: 'Checklist deleted successfully',
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
    await redisClient.disconnect();
  } catch (error) {
    console.error('Error handling checklist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}