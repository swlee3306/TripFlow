// Vercel API Route for file upload
import { createClient } from 'redis';
import busboy from 'busboy';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // 캐시 비활성화
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Connect to Redis Cloud
    const redisClient = createClient({
      url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
    });

    await redisClient.connect();

    // Parse multipart form data using busboy
    const bb = busboy({ headers: req.headers });
    let filename = null;
    let fileContent = '';
    let fileSize = 0;

    bb.on('file', (name, file, info) => {
      const { filename: originalFilename, encoding, mimeType } = info;
      
      // Validate file type
      const allowedTypes = ['.md', '.markdown', '.txt'];
      const fileExt = originalFilename
        ? originalFilename.substring(originalFilename.lastIndexOf('.'))
        : '';
      
      if (!allowedTypes.includes(fileExt.toLowerCase())) {
        file.resume(); // Drain the file stream
        return;
      }

      filename = originalFilename;
      const chunks = [];

      file.on('data', (chunk) => {
        chunks.push(chunk);
        fileSize += chunk.length;
        
        // Check file size limit (10MB)
        if (fileSize > 10 * 1024 * 1024) {
          file.resume();
          return;
        }
      });

      file.on('end', () => {
        fileContent = Buffer.concat(chunks).toString('utf-8');
      });
    });

    bb.on('finish', async () => {
      if (!filename) {
        await redisClient.disconnect();
        res.status(400).json({
          error: 'No file uploaded',
          message: '파일을 선택해주세요',
        });
        return;
      }

      // Validate file type again (in case it was skipped)
      const allowedTypes = ['.md', '.markdown', '.txt'];
      const fileExt = filename.substring(filename.lastIndexOf('.'));
      if (!allowedTypes.includes(fileExt.toLowerCase())) {
        await redisClient.disconnect();
        res.status(400).json({
          error: 'Invalid file type',
          message: '마크다운 또는 텍스트 파일만 업로드 가능합니다',
        });
        return;
      }

      // Validate file size
      if (fileSize > 10 * 1024 * 1024) {
        await redisClient.disconnect();
        res.status(400).json({
          error: 'File too large',
          message: '파일 크기는 10MB를 초과할 수 없습니다',
        });
        return;
      }

      try {
        // Save file content to Redis
        await redisClient.set(`file:${filename}`, fileContent);

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

        // Check if file already exists and update it
        const existingIndex = files.findIndex(f => 
          (f.filename || f.Filename || f.name) === filename
        );
        
        const now = new Date().toISOString();
        if (existingIndex >= 0) {
          files[existingIndex] = {
            filename: filename,
            content: fileContent,
            size: fileSize,
            created_at: now,
          };
        } else {
          files.push({
            filename: filename,
            content: fileContent,
            size: fileSize,
            created_at: now,
          });
        }

        // Save updated file list
        await redisClient.set('files:list', JSON.stringify(files));

        await redisClient.disconnect();

        res.status(200).json({
          success: true,
          filename: filename,
          size: fileSize,
          message: '파일이 성공적으로 업로드되었습니다',
        });
      } catch (error) {
        await redisClient.disconnect();
        console.error('Save error:', error);
        res.status(500).json({
          error: 'Failed to save file',
          message: '파일 저장 중 오류가 발생했습니다',
          details: error.message,
        });
      }
    });

    bb.on('error', async (error) => {
      await redisClient.disconnect();
      console.error('Busboy error:', error);
      res.status(400).json({
        error: 'Failed to parse file',
        message: '파일 파싱 중 오류가 발생했습니다',
      });
    });

    req.pipe(bb);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: '서버 오류가 발생했습니다',
      details: error.message,
    });
  }
}

