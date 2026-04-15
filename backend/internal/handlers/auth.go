package handlers

import (
    "context"
    "net/http"
		"time"
    "golang.org/x/crypto/bcrypt"
    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
		"github.com/Sabari-Vijayan/DBMS-project/internal/auth"
)

type AuthHandler struct {
    DB *pgxpool.Pool
}

type RegisterRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required,min=6"`
    FullName string `json:"full_name" binding:"required"`
    UserType string `json:"user_type" binding:"required,oneof=handyman customer shopkeeper"`
    Phone    string `json:"phone"`
    Location string `json:"location"`
}

func (h *AuthHandler) Register(c *gin.Context) {
    var req RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
        return
    }

    // Insert user into database
    query := `
        INSERT INTO users (email, password_hash, full_name, user_type, phone, location)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, full_name, user_type, created_at
    `
    
    var user struct {
        ID        int    `json:"id"`
        Email     string `json:"email"`
        FullName  string `json:"full_name"`
        UserType  string `json:"user_type"`
        CreatedAt time.Time `json:"created_at"`
    }

    err = h.DB.QueryRow(context.Background(), query, 
        req.Email, string(hashedPassword), req.FullName, req.UserType, req.Phone, req.Location,
    ).Scan(&user.ID, &user.Email, &user.FullName, &user.UserType, &user.CreatedAt)

    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user", "details": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "message": "User registered successfully",
        "user": user,
    })
}

type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
    Message string `json:"message"`
    User    struct {
        ID       int    `json:"id"`
        Email    string `json:"email"`
        FullName string `json:"full_name"`
        UserType string `json:"user_type"`
    } `json:"user"`
    Token string `json:"token"` // We'll add JWT later
}

func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Get user from database
    query := `
        SELECT id, email, password_hash, full_name, user_type 
        FROM users 
        WHERE email = $1
    `
    
    var user struct {
        ID           int
        Email        string
        PasswordHash string
        FullName     string
        UserType     string
    }

    err := h.DB.QueryRow(context.Background(), query, req.Email).Scan(
        &user.ID, &user.Email, &user.PasswordHash, &user.FullName, &user.UserType,
    )

    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
        return
    }

    // Compare password
    err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
        return
    }

		// Generate JWT token
    token, err := auth.GenerateToken(user.ID, user.Email, user.UserType)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
        return
    }

    // Success! Return user data (we'll add JWT token later)
    c.JSON(http.StatusOK, gin.H{
        "message": "Login successful",
				"token":   token,
        "user": gin.H{
            "id":        user.ID,
            "email":     user.Email,
            "full_name": user.FullName,
            "user_type": user.UserType,
        },
    })
}
