package handlers

import (
    "context"
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
)

type NotificationHandler struct {
    DB *pgxpool.Pool
}

func (h *NotificationHandler) GetUserNotifications(c *gin.Context) {
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }
    
    // Basic pagination
    // can be extended with query params limit/offset
    var limit = 50
    var offset = 0

    query := `
        SELECT id, type, title, message, is_read, created_at 
        FROM notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
    `
    rows, err := h.DB.Query(context.Background(), query, userID.(int), limit, offset)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
        return
    }
    defer rows.Close()

    notifications := make([]map[string]interface{}, 0)
    for rows.Next() {
        var (
            id int
            ntype, title, message string
            isRead bool
            createdAt time.Time
        )
        if err := rows.Scan(&id, &ntype, &title, &message, &isRead, &createdAt); err == nil {
            notifications = append(notifications, map[string]interface{}{
                "id":         id,
                "type":       ntype,
                "title":      title,
                "message":    message,
                "is_read":    isRead,
                "created_at": createdAt,
            })
        }
    }
    c.JSON(http.StatusOK, gin.H{"notifications": notifications})
}

func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }
    notifID := c.Param("id")
    
    _, err := h.DB.Exec(context.Background(), "UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2", notifID, userID.(int))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark as read"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Marked as read"})
}

func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }
    
    _, err := h.DB.Exec(context.Background(), "UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false", userID.(int))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark all as read"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "All sorted"})
}

func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
    userID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }
    notifID := c.Param("id")
    
    _, err := h.DB.Exec(context.Background(), "DELETE FROM notifications WHERE id = $1 AND user_id = $2", notifID, userID.(int))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"message": "Deleted"})
}
