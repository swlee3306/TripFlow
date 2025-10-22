// Vercel API Route for files
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
    if (req.method === 'GET') {
      // Connect to Redis Cloud
      const redisClient = createClient({
        url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
      });

      await redisClient.connect();
      
      // Get files list from Redis
      const fileList = await redisClient.get('files:list');
      
      if (fileList) {
        const files = JSON.parse(fileList);
        res.status(200).json(files);
      } else {
        res.status(200).json([]);
      }
      
      await redisClient.disconnect();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
