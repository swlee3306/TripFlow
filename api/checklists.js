// Vercel API Route for checklists - unified handler
import { createClient } from 'redis';

const REDIS_URL = 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928';

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

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(p => p);
    const checklistId = pathParts[2] || null;

    // Connect to Redis
    const redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();

    try {
      // GET /api/checklists/:id - Get specific checklist
      if (checklistId && req.method === 'GET') {
        const checklistKey = `checklist:${checklistId}`;
        const checklistData = await redisClient.get(checklistKey);
        
        if (checklistData) {
          const checklist = JSON.parse(checklistData);
          res.status(200).json(checklist);
        } else {
          res.status(404).json({ error: 'Checklist not found' });
        }
        return;
      }

      // PUT /api/checklists/:id - Update checklist
      if (checklistId && req.method === 'PUT') {
        const checklistKey = `checklist:${checklistId}`;
        const existingData = await redisClient.get(checklistKey);
        
        if (!existingData) {
          res.status(404).json({ error: 'Checklist not found' });
          return;
        }

        const updatedChecklist = req.body;
        const existingChecklist = JSON.parse(existingData);
        
        updatedChecklist.createdAt = existingChecklist.createdAt;
        updatedChecklist.id = checklistId;

        if (updatedChecklist.items) {
          updatedChecklist.total = updatedChecklist.items.length;
          updatedChecklist.completed = updatedChecklist.items.filter(item => item.completed).length;
        }

        await redisClient.set(checklistKey, JSON.stringify(updatedChecklist));

        res.status(200).json({
          message: 'Checklist updated successfully',
          checklist: updatedChecklist,
        });
        return;
      }

      // DELETE /api/checklists/:id - Delete checklist
      if (checklistId && req.method === 'DELETE') {
        const checklistKey = `checklist:${checklistId}`;
        const existingData = await redisClient.get(checklistKey);
        
        if (!existingData) {
          res.status(404).json({ error: 'Checklist not found' });
          return;
        }

        await redisClient.del(checklistKey);

        res.status(200).json({
          message: 'Checklist deleted successfully',
        });
        return;
      }

      // GET /api/checklists - List all checklists
      if (req.method === 'GET' && !checklistId) {
        const keys = await redisClient.keys('checklist:*');
        const checklists = [];
        
        for (const key of keys) {
          const checklistData = await redisClient.get(key);
          if (checklistData) {
            const checklist = JSON.parse(checklistData);
            checklists.push(checklist);
          }
        }
        
        checklists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        res.status(200).json({
          checklists: checklists,
          message: 'Checklists loaded successfully'
        });
        return;
      }

      // POST /api/checklists - Create new checklist
      if (req.method === 'POST' && !checklistId) {
        const checklist = req.body;
        
        if (!checklist.id) {
          checklist.id = Date.now().toString();
        }
        
        if (!checklist.createdAt) {
          checklist.createdAt = new Date().toISOString();
        }
        
        if (checklist.items) {
          checklist.total = checklist.items.length;
          checklist.completed = 0;
        }
        
        await redisClient.set(`checklist:${checklist.id}`, JSON.stringify(checklist));
        
        res.status(200).json({
          message: 'Checklist created successfully',
          checklist: checklist,
        });
        return;
      }

      res.status(405).json({ error: 'Method not allowed' });
    } finally {
      await redisClient.disconnect();
    }
  } catch (error) {
    console.error('Error handling checklists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

