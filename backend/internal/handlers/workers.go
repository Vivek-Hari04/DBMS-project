package handlers

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WorkersHandler struct {
	DB *pgxpool.Pool
}

// List workers (handyman users) with optional location search.
// Query params:
// - location: partial match against users.location
func (h *WorkersHandler) ListWorkers(c *gin.Context) {
	senderID := c.GetInt("user_id")
	locationQ := strings.TrimSpace(c.Query("location"))
	nameQ := strings.TrimSpace(c.Query("name"))
	specQ := strings.TrimSpace(c.Query("specification"))

	query := `
		SELECT u.id, u.full_name, u.avatar_url, u.location, u.specification, u.email, u.phone, u.bio,
		       COALESCE((SELECT AVG(rating) FROM ratings r WHERE r.reviewee_id = u.id), 0) as average_rating
		FROM users u
		WHERE u.user_type = 'handyman' AND u.id != $1
	`
	argCount := 2
	args := []interface{}{senderID}

	if locationQ != "" {
		query += ` AND u.location ILIKE $` + strconv.Itoa(argCount)
		args = append(args, "%"+locationQ+"%")
		argCount++
	}

	if nameQ != "" {
		query += ` AND u.full_name ILIKE $` + strconv.Itoa(argCount)
		args = append(args, "%"+nameQ+"%")
		argCount++
	}

	if specQ != "" {
		query += ` AND u.specification ILIKE $` + strconv.Itoa(argCount)
		args = append(args, "%"+specQ+"%")
		argCount++
	}

	query += ` ORDER BY u.full_name ASC`

	rows, err := h.DB.Query(context.Background(), query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch workers"})
		return
	}
	defer rows.Close()

	var workers []map[string]interface{}
	for rows.Next() {
		var (
			id int
			fullName string
			avatarURL sql.NullString
			location sql.NullString
			specification, email, phone, bio sql.NullString
			avgRating float64
		)

		if err := rows.Scan(&id, &fullName, &avatarURL, &location, &specification, &email, &phone, &bio, &avgRating); err != nil {
			continue
		}

		w := map[string]interface{}{
			"id":             id,
			"full_name":      fullName,
			"average_rating": avgRating,
		}
		if avatarURL.Valid {
			w["avatar_url"] = avatarURL.String
		}
		if location.Valid {
			w["location"] = location.String
		}
		if specification.Valid {
			w["specification"] = specification.String
		}
		if email.Valid {
			w["email"] = email.String
		}
		if phone.Valid {
			w["phone"] = phone.String
		}
		if bio.Valid {
			w["bio"] = bio.String
		}
		workers = append(workers, w)
	}

	c.JSON(http.StatusOK, gin.H{
		"workers": workers,
		"count":   len(workers),
	})
}

type HelpRequestPayload struct {
	WorkerID int    `json:"worker_id" binding:"required"`
	Message  string `json:"message" binding:"required"`
}

func (h *WorkersHandler) SendHelpRequest(c *gin.Context) {
	senderID := c.GetInt("user_id")
	var req HelpRequestPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var senderName string
	err := h.DB.QueryRow(context.Background(), `SELECT full_name FROM users WHERE id = $1`, senderID).Scan(&senderName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get sender info"})
		return
	}

	// Insert into help_requests table
	var reqID int
	err = h.DB.QueryRow(context.Background(), `
		INSERT INTO help_requests (sender_id, receiver_id, message)
		VALUES ($1, $2, $3)
		RETURNING id
	`, senderID, req.WorkerID, req.Message).Scan(&reqID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create help request"})
		return
	}

	// Also send a notification
	_, _ = h.DB.Exec(context.Background(), `
		INSERT INTO notifications (user_id, type, title, message)
		VALUES ($1, 'help_request', 'Help Request from ' || $2, $3)
	`, req.WorkerID, senderName, req.Message)

	c.JSON(http.StatusOK, gin.H{"message": "Help request sent successfully", "id": reqID})
}

func (h *WorkersHandler) GetReceivedHelpRequests(c *gin.Context) {
	workerID := c.GetInt("user_id")

	query := `
		SELECT hr.id, hr.sender_id, hr.message, hr.status, hr.response_message, hr.created_at,
		       u.full_name as sender_name, u.avatar_url as sender_avatar
		FROM help_requests hr
		JOIN users u ON hr.sender_id = u.id
		WHERE hr.receiver_id = $1
		ORDER BY hr.created_at DESC
	`

	rows, err := h.DB.Query(context.Background(), query, workerID)
	if err != nil {
		log.Printf("Error fetching help requests: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch help requests"})
		return
	}
	defer rows.Close()

	var requests []map[string]interface{}
	for rows.Next() {
		var (
			id, senderID int
			message, status, senderName string
			responseMsg, senderAvatar sql.NullString
			createdAt time.Time
		)
		err := rows.Scan(&id, &senderID, &message, &status, &responseMsg, &createdAt, &senderName, &senderAvatar)
		if err != nil {
			continue
		}

		req := map[string]interface{}{
			"id":               id,
			"sender_id":        senderID,
			"sender_name":      senderName,
			"message":          message,
			"status":           status,
			"created_at":       createdAt,
		}
		if responseMsg.Valid { req["response_message"] = responseMsg.String }
		if senderAvatar.Valid { req["sender_avatar"] = senderAvatar.String }
		requests = append(requests, req)
	}

	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

func (h *WorkersHandler) GetSentHelpRequests(c *gin.Context) {
	workerID := c.GetInt("user_id")

	query := `
		SELECT hr.id, hr.receiver_id, hr.message, hr.status, hr.response_message, hr.created_at,
		       u.full_name as receiver_name, u.avatar_url as receiver_avatar
		FROM help_requests hr
		JOIN users u ON hr.receiver_id = u.id
		WHERE hr.sender_id = $1
		ORDER BY hr.created_at DESC
	`

	rows, err := h.DB.Query(context.Background(), query, workerID)
	if err != nil {
		log.Printf("Error fetching sent help requests: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sent help requests"})
		return
	}
	defer rows.Close()

	var requests []map[string]interface{}
	for rows.Next() {
		var (
			id, receiverID int
			message, status, receiverName string
			responseMsg, receiverAvatar sql.NullString
			createdAt time.Time
		)
		err := rows.Scan(&id, &receiverID, &message, &status, &responseMsg, &createdAt, &receiverName, &receiverAvatar)
		if err != nil {
			continue
		}

		req := map[string]interface{}{
			"id":               id,
			"receiver_id":      receiverID,
			"receiver_name":    receiverName,
			"message":          message,
			"status":           status,
			"created_at":       createdAt,
		}
		if responseMsg.Valid { req["response_message"] = responseMsg.String }
		if receiverAvatar.Valid { req["receiver_avatar"] = receiverAvatar.String }
		requests = append(requests, req)
	}

	c.JSON(http.StatusOK, gin.H{"requests": requests})
}

type RespondHelpRequestPayload struct {
	Status  string `json:"status" binding:"required"` // accepted | rejected
	Message string `json:"message"`
}

func (h *WorkersHandler) RespondHelpRequest(c *gin.Context) {
	workerID := c.GetInt("user_id")
	reqID := c.Param("id")

	var req RespondHelpRequestPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify the request exists and belongs to this worker
	var senderID int
	var receiverName string
	err := h.DB.QueryRow(context.Background(), `
		SELECT hr.sender_id, u.full_name
		FROM help_requests hr
		JOIN users u ON hr.receiver_id = u.id
		WHERE hr.id = $1 AND hr.receiver_id = $2
	`, reqID, workerID).Scan(&senderID, &receiverName)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Help request not found"})
		return
	}

	_, err = h.DB.Exec(context.Background(), `
		UPDATE help_requests
		SET status = $1, response_message = $2
		WHERE id = $3
	`, req.Status, req.Message, reqID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update status"})
		return
	}

	// Notify the sender
	title := "Help Request " + strings.Title(req.Status)
	msg := receiverName + " has " + req.Status + " your help request."
	if req.Message != "" {
		msg += " Note: " + req.Message
	}

	_, _ = h.DB.Exec(context.Background(), `
		INSERT INTO notifications (user_id, type, title, message)
		VALUES ($1, 'help_response', $2, $3)
	`, senderID, title, msg)

	c.JSON(http.StatusOK, gin.H{"message": "Response sent successfully"})
}

func (h *WorkersHandler) DeleteHelpRequest(c *gin.Context) {
	workerID := c.GetInt("user_id")
	reqID := c.Param("id")

	res, err := h.DB.Exec(context.Background(), `
		DELETE FROM help_requests
		WHERE id = $1 AND sender_id = $2
	`, reqID, workerID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete request"})
		return
	}

	if res.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found or unauthorized"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Help request deleted"})
}


