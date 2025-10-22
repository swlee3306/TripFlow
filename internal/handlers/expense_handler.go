package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// Expense represents a single expense entry
type Expense struct {
	ID               string    `json:"id"`
	Amount           float64   `json:"amount"`
	OriginalAmount   float64   `json:"originalAmount"`
	OriginalCurrency string    `json:"originalCurrency"`
	Category         string    `json:"category"`
	Description      string    `json:"description"`
	Date             time.Time `json:"date"`
}

// Budget represents the total budget
type Budget struct {
	Amount float64 `json:"budget"`
}

// Global Redis client for serverless optimization
var redisClient *redis.Client

// initRedis initializes Redis Cloud client
func initRedis() {
	redisURL := "redis://default:27MKL27G0P2cVEUvV7WShJOMnbgtIbtK@redis-17928.c57.us-east-1-4.ec2.redns.redis-cloud.com:17928"
	
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		fmt.Printf("Failed to parse Redis URL: %v", err)
		return
	}
	
	redisClient = redis.NewClient(opt)
	
	// Test connection
	ctx := context.Background()
	_, err = redisClient.Ping(ctx).Result()
	if err != nil {
		fmt.Printf("Failed to connect to Redis: %v", err)
		redisClient = nil
	} else {
		fmt.Printf("Redis Cloud connected successfully")
	}
}

// kvGet retrieves a value from Redis Cloud
func kvGet(key string) (string, error) {
	if redisClient == nil {
		initRedis()
		if redisClient == nil {
			return "", fmt.Errorf("Redis not configured")
		}
	}

	ctx := context.Background()
	val, err := redisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", fmt.Errorf("key not found")
	}
	if err != nil {
		return "", err
	}

	return val, nil
}

// kvSet stores a value in Redis Cloud
func kvSet(key, value string) error {
	if redisClient == nil {
		initRedis()
		if redisClient == nil {
			return fmt.Errorf("Redis not configured")
		}
	}

	ctx := context.Background()
	err := redisClient.Set(ctx, key, value, 0).Err()
	if err != nil {
		return err
	}

	return nil
}

// kvDelete deletes a key from Redis Cloud
func kvDelete(key string) error {
	if redisClient == nil {
		initRedis()
		if redisClient == nil {
			return fmt.Errorf("Redis not configured")
		}
	}

	ctx := context.Background()
	err := redisClient.Del(ctx, key).Err()
	if err != nil {
		return err
	}

	return nil
}

// ExpenseHandler handles expense-related requests
type ExpenseHandler struct {
	redisClient *redis.Client
}

// NewExpenseHandler creates a new ExpenseHandler
func NewExpenseHandler(redisClient *redis.Client) *ExpenseHandler {
	// Initialize Redis Cloud connection
	initRedis()
	
	return &ExpenseHandler{
		redisClient: redisClient,
	}
}

// GetExpenses retrieves all expenses from Redis Cloud
func (h *ExpenseHandler) GetExpenses(c *gin.Context) {
	// Get expenses list from Redis Cloud
	expensesList, err := kvGet("expenses:list")
	if err != nil {
		// If no expenses exist, return empty list
		c.JSON(http.StatusOK, gin.H{
			"expenses": []Expense{},
		})
		return
	}

	var expenses []Expense
	if err := json.Unmarshal([]byte(expensesList), &expenses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to parse expenses: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"expenses": expenses,
	})
}

// AddExpense adds a new expense to Redis Cloud
func (h *ExpenseHandler) AddExpense(c *gin.Context) {
	var expense Expense
	if err := c.ShouldBindJSON(&expense); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Invalid request body: %v", err),
		})
		return
	}

	// Generate ID if not provided
	if expense.ID == "" {
		expense.ID = fmt.Sprintf("%d", time.Now().UnixNano())
	}

	// Set current time if not provided
	if expense.Date.IsZero() {
		expense.Date = time.Now()
	}

	// Validate required fields
	if expense.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Amount must be greater than 0",
		})
		return
	}

	if expense.Category == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Category is required",
		})
		return
	}

	if expense.Description == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Description is required",
		})
		return
	}

	// Get existing expenses list
	expensesList, err := kvGet("expenses:list")
	var expenses []Expense
	if err == nil && expensesList != "" {
		if err := json.Unmarshal([]byte(expensesList), &expenses); err != nil {
			expenses = []Expense{}
		}
	}

	// Add new expense
	expenses = append(expenses, expense)

	// Save updated expenses list
	expensesData, err := json.Marshal(expenses)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to serialize expenses: %v", err),
		})
		return
	}

	if err := kvSet("expenses:list", string(expensesData)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to store expenses: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Expense added successfully",
		"expense": expense,
	})
}

// DeleteExpense removes an expense from Redis Cloud
func (h *ExpenseHandler) DeleteExpense(c *gin.Context) {
	expenseID := c.Param("id")
	if expenseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Expense ID is required",
		})
		return
	}

	// Get existing expenses list
	expensesList, err := kvGet("expenses:list")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "No expenses found",
		})
		return
	}

	var expenses []Expense
	if err := json.Unmarshal([]byte(expensesList), &expenses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to parse expenses: %v", err),
		})
		return
	}

	// Find and remove expense
	var updatedExpenses []Expense
	found := false
	for _, expense := range expenses {
		if expense.ID != expenseID {
			updatedExpenses = append(updatedExpenses, expense)
		} else {
			found = true
		}
	}

	if !found {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Expense not found",
		})
		return
	}

	// Save updated expenses list
	expensesData, err := json.Marshal(updatedExpenses)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to serialize expenses: %v", err),
		})
		return
	}

	if err := kvSet("expenses:list", string(expensesData)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to update expenses: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Expense deleted successfully",
	})
}

// GetBudget retrieves the current budget from Redis Cloud
func (h *ExpenseHandler) GetBudget(c *gin.Context) {
	budgetData, err := kvGet("budget")
	if err != nil {
		// No budget set
		c.JSON(http.StatusOK, gin.H{
			"budget": 0,
		})
		return
	}

	var budget Budget
	if err := json.Unmarshal([]byte(budgetData), &budget); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to parse budget: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, budget)
}

// SetBudget sets the budget in Redis Cloud
func (h *ExpenseHandler) SetBudget(c *gin.Context) {
	var budget Budget
	if err := c.ShouldBindJSON(&budget); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Invalid request body: %v", err),
		})
		return
	}

	if budget.Amount < 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Budget amount cannot be negative",
		})
		return
	}

	budgetData, err := json.Marshal(budget)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to serialize budget: %v", err),
		})
		return
	}

	if err := kvSet("budget", string(budgetData)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to store budget: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Budget set successfully",
		"budget":  budget,
	})
}

// GetExpenseStats retrieves expense statistics from Redis Cloud
func (h *ExpenseHandler) GetExpenseStats(c *gin.Context) {
	// Get expenses list
	expensesList, err := kvGet("expenses:list")
	var expenses []Expense
	if err == nil && expensesList != "" {
		if err := json.Unmarshal([]byte(expensesList), &expenses); err != nil {
			expenses = []Expense{}
		}
	}

	var totalSpent float64
	categoryStats := make(map[string]float64)
	
	for _, expense := range expenses {
		totalSpent += expense.Amount
		categoryStats[expense.Category] += expense.Amount
	}

	// Get budget
	budgetData, err := kvGet("budget")
	var budget float64
	if err == nil {
		var budgetObj Budget
		if err := json.Unmarshal([]byte(budgetData), &budgetObj); err == nil {
			budget = budgetObj.Amount
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"total_spent":      totalSpent,
		"budget":          budget,
		"remaining_budget": budget - totalSpent,
		"category_stats":  categoryStats,
	})
}
