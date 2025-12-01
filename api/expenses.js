// Vercel API Route for expenses - unified handler
import { createClient } from 'redis';

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
    const pathParts = pathname.split('/').filter(p => p);
    
    // Determine endpoint: expenses, expenses/:id, expenses/budget, expenses/stats
    const isBudget = pathParts[2] === 'budget';
    const isStats = pathParts[2] === 'stats';
    const expenseId = pathParts[2] && !isBudget && !isStats ? pathParts[2] : null;

    // Connect to Redis
    const redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();

    try {
      // GET/POST /api/expenses/budget
      if (isBudget) {
        if (req.method === 'GET') {
          const budget = await redisClient.get('budget');
          res.status(200).json({
            budget: budget ? parseFloat(budget) : 0,
          });
          return;
        } else if (req.method === 'POST') {
          const { budget } = req.body;
          await redisClient.set('budget', budget.toString());
          res.status(200).json({
            message: 'Budget set successfully',
            budget: budget,
          });
          return;
        }
      }

      // GET /api/expenses/stats
      if (isStats && req.method === 'GET') {
        const expensesList = await redisClient.get('expenses:list');
        let expenses = [];
        if (expensesList) {
          expenses = JSON.parse(expensesList);
        }

        let totalExpenses = 0;
        const categoryBreakdown = {};
        const dailyBreakdown = {};

        expenses.forEach(expense => {
          totalExpenses += expense.amount || 0;
          const category = expense.category || '기타';
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + (expense.amount || 0);
          const date = new Date(expense.date).toISOString().split('T')[0];
          dailyBreakdown[date] = (dailyBreakdown[date] || 0) + (expense.amount || 0);
        });

        res.status(200).json({
          total_expenses: totalExpenses,
          category_breakdown: categoryBreakdown,
          daily_breakdown: dailyBreakdown,
        });
        return;
      }

      // DELETE /api/expenses/:id
      if (expenseId && req.method === 'DELETE') {
        const expensesList = await redisClient.get('expenses:list');
        if (!expensesList) {
          res.status(404).json({ error: 'No expenses found' });
          return;
        }

        const expenses = JSON.parse(expensesList);
        const filteredExpenses = expenses.filter(expense => expense.id !== expenseId);

        if (filteredExpenses.length === expenses.length) {
          res.status(404).json({ error: 'Expense not found' });
          return;
        }

        await redisClient.set('expenses:list', JSON.stringify(filteredExpenses));
        res.status(200).json({ message: 'Expense deleted successfully' });
        return;
      }

      // GET /api/expenses - List all expenses
      if (req.method === 'GET' && !expenseId) {
        const expensesList = await redisClient.get('expenses:list');
        if (expensesList) {
          const expenses = JSON.parse(expensesList);
          res.status(200).json({ expenses: expenses });
        } else {
          res.status(200).json({ expenses: [] });
        }
        return;
      }

      // POST /api/expenses - Create new expense
      if (req.method === 'POST' && !expenseId) {
        const expense = req.body;
        expense.id = Date.now().toString();
        expense.date = new Date().toISOString();

        const expensesList = await redisClient.get('expenses:list');
        let expenses = [];
        if (expensesList) {
          expenses = JSON.parse(expensesList);
        }

        expenses.push(expense);
        await redisClient.set('expenses:list', JSON.stringify(expenses));

        res.status(200).json({
          message: 'Expense added successfully',
          expense: expense,
        });
        return;
      }

      res.status(405).json({ error: 'Method not allowed' });
    } finally {
      await redisClient.disconnect();
    }
  } catch (error) {
    console.error('Error handling expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

