package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
)

// Expense represents a single expense entry
type Expense struct {
	ID          string    `json:"id"`
	Amount      float64   `json:"amount"`
	Category    string    `json:"category"`
	Description string    `json:"description"`
	Date        time.Time `json:"date"`
}

// Budget represents the total budget
type Budget struct {
	Amount float64 `json:"budget"`
}

// ExpenseHandler handles expense-related requests
type ExpenseHandler struct {
	redisClient *redis.Client
}

// NewExpenseHandler creates a new ExpenseHandler
func NewExpenseHandler(redisClient *redis.Client) *ExpenseHandler {
	return &ExpenseHandler{
		redisClient: redisClient,
	}
}

// GetExpenses retrieves all expenses from Redis
func (h *ExpenseHandler) GetExpenses(c *gin.Context) {
	ctx := c.Request.Context()
	
	// Get all expense keys
	keys, err := h.redisClient.Keys(ctx, "expense:*").Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to retrieve expenses: %v", err),
		})
		return
	}

	var expenses []Expense
	for _, key := range keys {
		expenseData, err := h.redisClient.Get(ctx, key).Result()
		if err != nil {
			continue // Skip invalid entries
		}

		var expense Expense
		if err := json.Unmarshal([]byte(expenseData), &expense); err != nil {
			continue // Skip invalid JSON
		}

		expenses = append(expenses, expense)
	}

	c.JSON(http.StatusOK, gin.H{
		"expenses": expenses,
	})
}

// AddExpense adds a new expense to Redis
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

	// Store expense in Redis
	ctx := c.Request.Context()
	expenseData, err := json.Marshal(expense)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to serialize expense: %v", err),
		})
		return
	}

	key := fmt.Sprintf("expense:%s", expense.ID)
	err = h.redisClient.Set(ctx, key, expenseData, 0).Err()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to store expense: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Expense added successfully",
		"expense": expense,
	})
}

// DeleteExpense removes an expense from Redis
func (h *ExpenseHandler) DeleteExpense(c *gin.Context) {
	expenseID := c.Param("id")
	if expenseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Expense ID is required",
		})
		return
	}

	ctx := c.Request.Context()
	key := fmt.Sprintf("expense:%s", expenseID)
	
	// Check if expense exists
	_, err := h.redisClient.Get(ctx, key).Result()
	if err == redis.Nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Expense not found",
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to check expense: %v", err),
		})
		return
	}

	// Delete expense
	err = h.redisClient.Del(ctx, key).Err()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to delete expense: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Expense deleted successfully",
	})
}

// GetBudget retrieves the current budget from Redis
func (h *ExpenseHandler) GetBudget(c *gin.Context) {
	ctx := c.Request.Context()
	
	budgetData, err := h.redisClient.Get(ctx, "budget").Result()
	if err == redis.Nil {
		// No budget set
		c.JSON(http.StatusOK, gin.H{
			"budget": 0,
		})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to retrieve budget: %v", err),
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

// SetBudget sets the budget in Redis
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

	ctx := c.Request.Context()
	budgetData, err := json.Marshal(budget)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to serialize budget: %v", err),
		})
		return
	}

	err = h.redisClient.Set(ctx, "budget", budgetData, 0).Err()
	if err != nil {
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

// GetExpenseStats retrieves expense statistics
func (h *ExpenseHandler) GetExpenseStats(c *gin.Context) {
	ctx := c.Request.Context()
	
	// Get all expenses
	keys, err := h.redisClient.Keys(ctx, "expense:*").Result()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to retrieve expenses: %v", err),
		})
		return
	}

	var totalSpent float64
	categoryStats := make(map[string]float64)
	
	for _, key := range keys {
		expenseData, err := h.redisClient.Get(ctx, key).Result()
		if err != nil {
			continue
		}

		var expense Expense
		if err := json.Unmarshal([]byte(expenseData), &expense); err != nil {
			continue
		}

		totalSpent += expense.Amount
		categoryStats[expense.Category] += expense.Amount
	}

	// Get budget
	budgetData, err := h.redisClient.Get(ctx, "budget").Result()
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
