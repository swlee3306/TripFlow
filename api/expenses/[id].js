// Vercel API Route for deleting expenses by ID
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
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        res.status(400).json({ error: 'Missing expense ID' });
        return;
      }
      
      // Connect to Redis Cloud
      const redisClient = createClient({
        url: 'redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928'
      });

      await redisClient.connect();
      
      // Get existing expenses
      const expensesList = await redisClient.get('expenses:list');
      if (!expensesList) {
        res.status(404).json({ error: 'No expenses found' });
        await redisClient.disconnect();
        return;
      }
      
      const expenses = JSON.parse(expensesList);
      
      // Find and remove the expense
      const filteredExpenses = expenses.filter(expense => expense.id !== id);
      
      if (filteredExpenses.length === expenses.length) {
        res.status(404).json({ error: 'Expense not found' });
        await redisClient.disconnect();
        return;
      }
      
      // Save updated expenses list
      await redisClient.set('expenses:list', JSON.stringify(filteredExpenses));
      
      res.status(200).json({
        message: 'Expense deleted successfully',
      });
      
      await redisClient.disconnect();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
