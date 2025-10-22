// Vercel API Route for individual file operations
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
    const { filename } = req.query;
    
    if (!filename) {
      res.status(400).json({ error: 'Filename is required' });
      return;
    }

    // Decode the filename properly
    let decodedFilename;
    try {
      // Try standard URL decoding first
      decodedFilename = decodeURIComponent(filename);
      console.log('🔍 Method 1 - decodeURIComponent:', decodedFilename);
    } catch (e) {
      try {
        // Try Base64 decoding as fallback
        decodedFilename = decodeURIComponent(escape(atob(filename)));
        console.log('🔍 Method 2 - Base64 decoding:', decodedFilename);
      } catch (e2) {
        // Use original filename as last resort
        decodedFilename = filename;
        console.log('🔍 Method 3 - Using original:', decodedFilename);
      }
    }
    
    console.log('🔍 Final decoded filename:', decodedFilename);

    // Connect to Redis Cloud
    const redisClient = createClient({
      url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
    });

    await redisClient.connect();

    if (req.method === 'GET') {
      // Get file content using decoded filename
      const content = await redisClient.get(`file:${decodedFilename}`);
      
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
        res.status(404).json({ error: 'File not found' });
      }
    } else if (req.method === 'PUT') {
      // Update file content
      const { content } = req.body;
      
      if (!content) {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      // Update file content using decoded filename
      await redisClient.set(`file:${decodedFilename}`, content);
      
      // Update file list
      const fileList = await redisClient.get('files:list');
      if (fileList) {
        const files = JSON.parse(fileList);
        const updatedFiles = files.map(file => {
          if (file.filename === decodedFilename) {
            return { ...file, content, size: content.length };
          }
          return file;
        });
        await redisClient.set('files:list', JSON.stringify(updatedFiles));
      }
      
      res.status(200).json({ 
        message: 'File updated successfully',
        filename: filename 
      });
    } else if (req.method === 'DELETE') {
      // Delete file using decoded filename
      await redisClient.del(`file:${decodedFilename}`);
      
      // Update file list
      const fileList = await redisClient.get('files:list');
      if (fileList) {
        const files = JSON.parse(fileList);
        const updatedFiles = files.filter(file => file.filename !== decodedFilename);
        await redisClient.set('files:list', JSON.stringify(updatedFiles));
      }
      
      res.status(200).json({ 
        message: 'File deleted successfully',
        filename: filename 
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

    await redisClient.disconnect();
  } catch (error) {
    console.error('Error handling file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
