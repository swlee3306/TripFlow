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

  try {
    // Connect to Redis Cloud
    const redisClient = createClient({
      url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
    });

    await redisClient.connect();

    // Parse URL to check if it's a specific checklist request
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const checklistId = pathParts[pathParts.length - 1];

    // Check if this is a request for a specific checklist (not just /api/checklists)
    if (checklistId && checklistId !== 'checklists' && checklistId !== '') {
      // Handle individual checklist operations
      const checklistKey = `checklist:${checklistId}`;

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
        updatedChecklist.id = checklistId; // Ensure ID matches
        
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
    } else {
      // Handle general checklist operations
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
        
        res.status(200).json({
          checklists: checklists,
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
    }
    
    await redisClient.disconnect();
  } catch (error) {
    console.error('Error handling checklists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
