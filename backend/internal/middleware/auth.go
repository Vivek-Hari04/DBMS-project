package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/Sabari-Vijayan/DBMS-project/internal/auth"
)

// JWT Authentication Middleware
func AuthRequired() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get token from Authorization header
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }

        // Extract token (format: "Bearer <token>")
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
            c.Abort()
            return
        }

        tokenString := parts[1]

        // Verify token
        claims, err := auth.VerifyToken(tokenString)
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
            c.Abort()
            return
        }

        // Store user info in context
        c.Set("user_id", claims.UserID)
        c.Set("email", claims.Email)
        c.Set("user_type", claims.UserType)

        c.Next()
    }
}

// Middleware to check if user is an employer
func EmployerOnly() gin.HandlerFunc {
    return func(c *gin.Context) {
        userType, exists := c.Get("user_type")
        if !exists || (userType != "customer" && userType != "shopkeeper") {
            c.JSON(http.StatusForbidden, gin.H{"error": "Only employers can access this resource"})
            c.Abort()
            return
        }
        c.Next()
    }
}

// Middleware to check if user is a worker
func WorkerOnly() gin.HandlerFunc {
    return func(c *gin.Context) {
        userType, exists := c.Get("user_type")
        if !exists || userType != "handyman" {
            c.JSON(http.StatusForbidden, gin.H{"error": "Only workers can access this resource"})
            c.Abort()
            return
        }
        c.Next()
    }
}

// Middleware to check if user is a shopkeeper
func ShopkeeperOnly() gin.HandlerFunc {
    return func(c *gin.Context) {
        userType, exists := c.Get("user_type")
        if !exists || userType != "shopkeeper" {
            c.JSON(http.StatusForbidden, gin.H{"error": "Only shopkeepers can access this resource"})
            c.Abort()
            return
        }
        c.Next()
    }
}
