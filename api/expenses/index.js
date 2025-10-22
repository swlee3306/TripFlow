// Vercel API Route for expenses
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
      // Get all expenses from Redis
      const expensesList = await redisClient.get('expenses:list');
      if (expensesList) {
        const expenses = JSON.parse(expensesList);
        res.status(200).json({
          expenses: expenses,
        });
      } else {
        res.status(200).json({
          expenses: [],
        });
      }
    } else if (req.method === 'POST') {
      // Add new expense
      const expense = req.body;
      expense.id = Date.now().toString();
      expense.date = new Date().toISOString();
      
      // Get existing expenses
      const expensesList = await redisClient.get('expenses:list');
      let expenses = [];
      if (expensesList) {
        expenses = JSON.parse(expensesList);
      }
      
      // Add new expense
      expenses.push(expense);
      
      // Save back to Redis
      await redisClient.set('expenses:list', JSON.stringify(expenses));
      
      res.status(200).json({
        message: 'Expense added successfully',
        expense: expense,
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
    await redisClient.disconnect();
  } catch (error) {
    console.error('Error handling expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
