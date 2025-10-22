// Vercel API Route for file deletion (POST method to avoid URL encoding issues)
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

      console.log('🔍 Deleting filename:', filename);

      // Connect to Redis Cloud
      const redisClient = createClient({
        url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
      });

      await redisClient.connect();

      // Delete file content
      await redisClient.del(`file:${filename}`);
      
      // Update file list
      const fileList = await redisClient.get('files:list');
      if (fileList) {
        const files = JSON.parse(fileList);
        const updatedFiles = files.filter(file => file.filename !== filename);
        await redisClient.set('files:list', JSON.stringify(updatedFiles));
      }
      
      res.status(200).json({ 
        message: 'File deleted successfully',
        filename: filename 
      });

      await redisClient.disconnect();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
