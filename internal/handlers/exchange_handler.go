package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// ExchangeRateResponse represents the response from ExchangeRate-API
type ExchangeRateResponse struct {
	Base  string             `json:"base"`
	Date  string             `json:"date"`
	Rates map[string]float64 `json:"rates"`
}

// ExchangeHandler handles exchange rate related requests
type ExchangeHandler struct {
	client *http.Client
}

// NewExchangeHandler creates a new exchange handler
func NewExchangeHandler() *ExchangeHandler {
	return &ExchangeHandler{
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// GetExchangeRates fetches exchange rates from ExchangeRate-API
func (h *ExchangeHandler) GetExchangeRates(c *gin.Context) {
	// Get base currency from query parameter, default to KRW
	base := c.DefaultQuery("base", "KRW")

	// Fetch exchange rates from ExchangeRate-API
	url := fmt.Sprintf("https://api.exchangerate-api.com/v4/latest/%s", base)
	
	resp, err := h.client.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to fetch exchange rates: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Exchange rate API returned status: %d", resp.StatusCode),
		})
		return
	}

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to read response: %v", err),
		})
		return
	}

	// Parse the response
	var exchangeData ExchangeRateResponse
	if err := json.Unmarshal(body, &exchangeData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to parse exchange rate data: %v", err),
		})
		return
	}

	// Return the exchange rates
	c.JSON(http.StatusOK, exchangeData)
}

// ConvertCurrency converts amount from one currency to another
func (h *ExchangeHandler) ConvertCurrency(c *gin.Context) {
	// Parse query parameters
	from := c.Query("from")
	to := c.Query("to")
	amount := c.Query("amount")

	if from == "" || to == "" || amount == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing required parameters: from, to, amount",
		})
		return
	}

	// Fetch exchange rates
	url := fmt.Sprintf("https://api.exchangerate-api.com/v4/latest/%s", from)
	
	resp, err := h.client.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to fetch exchange rates: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Exchange rate API returned status: %d", resp.StatusCode),
		})
		return
	}

	// Read and parse response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to read response: %v", err),
		})
		return
	}

	var exchangeData ExchangeRateResponse
	if err := json.Unmarshal(body, &exchangeData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Failed to parse exchange rate data: %v", err),
		})
		return
	}

	// Get exchange rate for target currency
	rate, exists := exchangeData.Rates[to]
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Exchange rate not found for currency: %s", to),
		})
		return
	}

	// Parse amount
	var amountFloat float64
	if _, err := fmt.Sscanf(amount, "%f", &amountFloat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid amount format",
		})
		return
	}

	// Calculate converted amount
	convertedAmount := amountFloat * rate

	// Return conversion result
	result := gin.H{
		"from":             from,
		"to":               to,
		"amount":           amountFloat,
		"rate":             rate,
		"converted_amount": convertedAmount,
		"date":             exchangeData.Date,
	}

	c.JSON(http.StatusOK, result)
}
