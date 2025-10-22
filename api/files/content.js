// Vercel API Route for file content operations (POST method to avoid URL encoding issues)
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
    if (req.method === 'POST') {
      const { filename } = req.body;
      
      if (!filename) {
        res.status(400).json({ error: 'Filename is required' });
        return;
      }

      console.log('🔍 Requested filename:', filename);

      // Connect to Redis Cloud
      const redisClient = createClient({
        url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
      });

      await redisClient.connect();

      // Get file content
      const content = await redisClient.get(`file:${filename}`);
      
      if (content) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.status(200).send(content);
      } else {
        res.status(404).json({ error: 'File not found' });
      }

      await redisClient.disconnect();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling file content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
