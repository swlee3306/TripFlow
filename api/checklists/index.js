// Vercel API Route for checklists - Simple version without Redis
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
    // Parse URL to check if it's a specific checklist request
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const checklistId = pathParts[pathParts.length - 1];

    // Check if this is a request for a specific checklist (not just /api/checklists)
    if (checklistId && checklistId !== 'checklists' && checklistId !== '') {
      // Handle individual checklist operations
      if (req.method === 'GET') {
        // For now, return a simple response
        res.status(200).json({
          id: checklistId,
          name: 'Test Checklist',
          type: 'domestic',
          duration: 'weekend',
          items: {
            '여행 준비': ['여행 계획', '숙소 예약'],
            '짐 준비': ['여행 가방', '의류']
          },
          completed: {},
          createdAt: new Date().toISOString()
        });
      } else if (req.method === 'PUT') {
        // Update checklist
        res.status(200).json({
          message: 'Checklist updated successfully',
          checklist: req.body,
        });
      } else if (req.method === 'DELETE') {
        // Delete checklist
        res.status(200).json({
          message: 'Checklist deleted successfully',
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    } else {
      // Handle general checklist operations
      if (req.method === 'GET') {
        // Return empty list for now
        res.status(200).json({
          checklists: [],
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
        
        res.status(200).json({
          message: 'Checklist created successfully',
          checklist: checklist,
        });
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (error) {
    console.error('Error handling checklists:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
