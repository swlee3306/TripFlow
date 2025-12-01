// Vercel API Route for files - unified handler
import { createClient } from 'redis';
import busboy from 'busboy';

const REDIS_URL = 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928';

function setCORSHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    
    // Extract filename from path: /api/files/filename or /api/files/by-id
    const pathParts = pathname.split('/').filter(p => p);
    const isById = pathParts[2] === 'by-id';
    const filename = pathParts[2] && !isById ? decodeURIComponent(pathParts[2]) : null;

    // Connect to Redis
    const redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();

    try {
      // GET /api/files - List all files
      if (req.method === 'GET' && pathParts.length === 2) {
        const fileList = await redisClient.get('files:list');
        if (fileList) {
          const files = JSON.parse(fileList);
          const result = files.map((file, index) => ({
            id: `file_${index}`,
            name: file.filename || file.Filename || file.name || 'unknown',
            size: file.size || file.Size || 0
          }));
          res.status(200).json(result);
        } else {
          res.status(200).json([]);
        }
        return;
      }

      // GET /api/files/by-id - Get file by ID (if needed)
      if (req.method === 'GET' && isById) {
        const { id } = req.query;
        if (!id) {
          res.status(400).json({ error: 'ID is required' });
          return;
        }
        // Implementation for by-id if needed
        res.status(200).json({ message: 'by-id endpoint' });
        return;
      }

      // GET /api/files/:filename - Get specific file
      if (req.method === 'GET' && filename) {
        const content = await redisClient.get(`file:${filename}`);
        if (content) {
          const download = url.searchParams.get('download') === 'true';
          if (download) {
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'application/octet-stream');
          } else {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          }
          res.status(200).send(content);
        } else {
          res.status(404).json({ error: 'File not found', message: '파일을 찾을 수 없습니다' });
        }
        return;
      }

      // PUT /api/files/:filename - Update file
      if (req.method === 'PUT' && filename) {
        const { content } = req.body;
        if (!content) {
          res.status(400).json({ error: 'Content is required', message: '요청 데이터가 올바르지 않습니다' });
          return;
        }

        // Security check
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          res.status(400).json({ error: 'Invalid filename', message: '잘못된 파일명입니다' });
          return;
        }

        await redisClient.set(`file:${filename}`, content);

        // Update file list
        const fileList = await redisClient.get('files:list');
        let files = [];
        if (fileList) {
          try {
            files = JSON.parse(fileList);
          } catch (e) {
            files = [];
          }
        }

        const existingIndex = files.findIndex(f => 
          (f.filename || f.Filename || f.name) === filename
        );

        const now = new Date().toISOString();
        if (existingIndex >= 0) {
          files[existingIndex] = {
            filename: filename,
            content: content,
            size: content.length,
            created_at: now,
          };
        } else {
          files.push({
            filename: filename,
            content: content,
            size: content.length,
            created_at: now,
          });
        }

        await redisClient.set('files:list', JSON.stringify(files));

        res.status(200).json({
          success: true,
          filename: filename,
          message: '파일이 성공적으로 업데이트되었습니다',
        });
        return;
      }

      // DELETE /api/files/:filename - Delete file
      if (req.method === 'DELETE' && filename) {
        // Security check
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          res.status(400).json({ error: 'Invalid filename', message: '잘못된 파일명입니다' });
          return;
        }

        await redisClient.del(`file:${filename}`);

        // Update file list
        const fileList = await redisClient.get('files:list');
        if (fileList) {
          const files = JSON.parse(fileList);
          const updatedFiles = files.filter(f => 
            (f.filename || f.Filename || f.name) !== filename
          );
          await redisClient.set('files:list', JSON.stringify(updatedFiles));
        }

        res.status(200).json({
          success: true,
          filename: filename,
          message: '파일이 성공적으로 삭제되었습니다',
        });
        return;
      }

      res.status(405).json({ error: 'Method not allowed' });
    } finally {
      await redisClient.disconnect();
    }
  } catch (error) {
    console.error('Error handling files:', error);
    res.status(500).json({ error: 'Internal server error', message: '서버 오류가 발생했습니다' });
  }
}

