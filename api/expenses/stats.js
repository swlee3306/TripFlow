// Vercel API Route for expense statistics
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

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Connect to Redis Cloud
    const redisClient = createClient({
      url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
    });

    await redisClient.connect();
    
    // Get expenses from Redis
    const expensesList = await redisClient.get('expenses:list');
    let expenses = [];
    if (expensesList) {
      expenses = JSON.parse(expensesList);
    }
    
    // Calculate statistics
    let totalExpenses = 0;
    const categoryBreakdown = {};
    const dailyBreakdown = {};
    
    expenses.forEach(expense => {
      // Total expenses
      totalExpenses += expense.amount || 0;
      
      // Category breakdown
      const category = expense.category || '기타';
      if (categoryBreakdown[category]) {
        categoryBreakdown[category] += expense.amount || 0;
      } else {
        categoryBreakdown[category] = expense.amount || 0;
      }
      
      // Daily breakdown
      const date = new Date(expense.date).toISOString().split('T')[0];
      if (dailyBreakdown[date]) {
        dailyBreakdown[date] += expense.amount || 0;
      } else {
        dailyBreakdown[date] = expense.amount || 0;
      }
    });
    
    res.status(200).json({
      total_expenses: totalExpenses,
      category_breakdown: categoryBreakdown,
      daily_breakdown: dailyBreakdown,
    });
    
    await redisClient.disconnect();
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
