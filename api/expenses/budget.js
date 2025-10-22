// Vercel API Route for budget management
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

    if (req.method === 'GET') {
      // Get budget from Redis
      const budget = await redisClient.get('budget');
      if (budget) {
        res.status(200).json({
          budget: parseFloat(budget),
        });
      } else {
        res.status(200).json({
          budget: 0,
        });
      }
    } else if (req.method === 'POST') {
      // Set budget
      const { budget } = req.body;
      
      // Save budget to Redis
      await redisClient.set('budget', budget.toString());
      
      res.status(200).json({
        message: 'Budget set successfully',
        budget: budget,
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
    await redisClient.disconnect();
  } catch (error) {
    console.error('Error handling budget:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
