package handlers

import (
    "context"
    "database/sql"
    "net/http"
    "time"
    "golang.org/x/crypto/bcrypt"
    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
)

type ProfileHandler struct {
    DB *pgxpool.Pool
}

type UserProfile struct {
    ID        int       `json:"id"`
    Email     string    `json:"email"`
    FullName  string    `json:"full_name"`
    UserType  string    `json:"user_type"`
    Phone     *string   `json:"phone"`     // Use pointer for nullable fields
    Location  *string   `json:"location"`  // Use pointer for nullable fields
    Bio       *string   `json:"bio"`       // Use pointer for nullable fields
    AvatarURL *string   `json:"avatar_url"` // Use pointer for nullable fields
    CreatedAt time.Time `json:"created_at"`
}

// Get profile by user ID
func (h *ProfileHandler) GetProfile(c *gin.Context) {
    userID := c.Param("id")
    
    query := `
        SELECT id, email, full_name, user_type, phone, location, bio, avatar_url, created_at
        FROM users
        WHERE id = $1
    `
    
    var profile UserProfile
    var phone, location, bio, avatarURL sql.NullString
    
    err := h.DB.QueryRow(context.Background(), query, userID).Scan(
        &profile.ID,
        &profile.Email,
        &profile.FullName,
        &profile.UserType,
        &phone,
        &location,
        &bio,
        &avatarURL,
        &profile.CreatedAt,
    )
    
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found", "details": err.Error()})
        return
    }
    
    // Convert sql.NullString to *string
    if phone.Valid {
        profile.Phone = &phone.String
    }
    if location.Valid {
        profile.Location = &location.String
    }
    if bio.Valid {
        profile.Bio = &bio.String
    }
    if avatarURL.Valid {
        profile.AvatarURL = &avatarURL.String
    }
    
    c.JSON(http.StatusOK, profile)
}

// Update profile
func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
    userID := c.Param("id")
    
    var req struct {
        FullName string `json:"full_name"`
        Phone    string `json:"phone"`
        Location string `json:"location"`
        Bio      string `json:"bio"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    query := `
        UPDATE users
        SET full_name = $1, phone = $2, location = $3, bio = $4
        WHERE id = $5
        RETURNING id, email, full_name, user_type, phone, location, bio, avatar_url, created_at
    `
    
    var profile UserProfile
    var phone, location, bio, avatarURL sql.NullString
    
    err := h.DB.QueryRow(context.Background(), query,
        req.FullName, req.Phone, req.Location, req.Bio, userID,
    ).Scan(
        &profile.ID,
        &profile.Email,
        &profile.FullName,
        &profile.UserType,
        &phone,
        &location,
        &bio,
        &avatarURL,
        &profile.CreatedAt,
    )
    
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile", "details": err.Error()})
        return
    }
    
    // Convert sql.NullString to *string
    if phone.Valid {
        profile.Phone = &phone.String
    }
    if location.Valid {
        profile.Location = &location.String
    }
    if bio.Valid {
        profile.Bio = &bio.String
    }
    if avatarURL.Valid {
        profile.AvatarURL = &avatarURL.String
    }
    
    c.JSON(http.StatusOK, gin.H{
        "message": "Profile updated successfully",
        "profile": profile,
    })
}

// Delete account request body
type DeleteAccountRequest struct {
    Password string `json:"password" binding:"required"`
}

// Soft delete account
func (h *ProfileHandler) DeleteAccount(c *gin.Context) {
    userID := c.Param("id")

    var req DeleteAccountRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
        return
    }

    // 1. Verify password
    var passwordHash string
    err := h.DB.QueryRow(context.Background(), `SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&passwordHash)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
        return
    }

    err = bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password))
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Incorrect password"})
        return
    }

    // 2. Soft delete
    _, err = h.DB.Exec(context.Background(), `UPDATE users SET deleted_at = NOW() WHERE id = $1`, userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Account scheduled for deletion"})
}
