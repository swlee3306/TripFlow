package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var SugaredLogger *zap.SugaredLogger

// InitLogger initializes the structured logger based on the log level
func InitLogger(logLevel string) {
	var config zap.Config

	if logLevel == "debug" {
		config = zap.NewDevelopmentConfig()
	} else {
		config = zap.NewProductionConfig()
	}

	// Set the log level
	switch logLevel {
	case "debug":
		config.Level = zap.NewAtomicLevelAt(zapcore.DebugLevel)
	case "info":
		config.Level = zap.NewAtomicLevelAt(zapcore.InfoLevel)
	case "warn":
		config.Level = zap.NewAtomicLevelAt(zapcore.WarnLevel)
	case "error":
		config.Level = zap.NewAtomicLevelAt(zapcore.ErrorLevel)
	default:
		config.Level = zap.NewAtomicLevelAt(zapcore.InfoLevel)
	}

	logger, err := config.Build()
	if err != nil {
		panic("Failed to initialize logger: " + err.Error())
	}

	SugaredLogger = logger.Sugar()
}

// GetLogger returns the initialized logger
func GetLogger() *zap.SugaredLogger {
	if SugaredLogger == nil {
		InitLogger("info")
	}
	return SugaredLogger
}
