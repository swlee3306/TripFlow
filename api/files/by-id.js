// Vercel API Route for file operations by ID
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
    const { id } = req.query;
    
    if (!id) {
      res.status(400).json({ error: 'File ID is required' });
      return;
    }

    console.log('🔍 Requested file ID:', id);

    // Connect to Redis Cloud
    const redisClient = createClient({
      url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
    });

    await redisClient.connect();

    // Get file list to find the actual filename
    const fileList = await redisClient.get('files:list');
    if (!fileList) {
      res.status(404).json({ error: 'File list not found' });
      await redisClient.disconnect();
      return;
    }

    const files = JSON.parse(fileList);
    const fileIndex = parseInt(id.replace('file_', ''));
    
    if (fileIndex < 0 || fileIndex >= files.length) {
      res.status(404).json({ error: 'File not found' });
      await redisClient.disconnect();
      return;
    }

    const file = files[fileIndex];
    const filename = file.filename || file.Filename || file.name;

    if (req.method === 'GET') {
      // Get file content
      const content = await redisClient.get(`file:${filename}`);
      
      if (content) {
        // Check if this is a download request
        const download = req.query.download === 'true';
        
        if (download) {
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Type', 'application/octet-stream');
        } else {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        }
        res.status(200).send(content);
      } else {
        res.status(404).json({ error: 'File content not found' });
      }
    } else if (req.method === 'PUT') {
      const { content } = req.body;
      if (!content) {
        res.status(400).json({ error: 'Content is required' });
        await redisClient.disconnect();
        return;
      }

      // Update file content
      await redisClient.set(`file:${filename}`, content);
      
      // Update file list
      files[fileIndex].content = content;
      files[fileIndex].size = content.length;
      await redisClient.set('files:list', JSON.stringify(files));
      
      res.status(200).json({ 
        message: 'File updated successfully',
        filename: filename 
      });
    } else if (req.method === 'DELETE') {
      // Delete file content
      await redisClient.del(`file:${filename}`);
      
      // Remove from file list
      const updatedFiles = files.filter((_, index) => index !== fileIndex);
      await redisClient.set('files:list', JSON.stringify(updatedFiles));
      
      res.status(200).json({ 
        message: 'File deleted successfully',
        filename: filename 
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
    await redisClient.disconnect();
  } catch (error) {
    console.error('Error handling file by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
