package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"
	"strings"

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
	locationQ := strings.TrimSpace(c.Query("location"))
	nameQ := strings.TrimSpace(c.Query("name"))
	specQ := strings.TrimSpace(c.Query("specification"))

	query := `
		SELECT u.id, u.full_name, u.avatar_url, u.location, u.specification,
		       COALESCE((SELECT AVG(rating) FROM ratings r WHERE r.reviewee_id = u.id), 0) as average_rating
		FROM users u
		WHERE u.user_type = 'handyman'
	`

	var args []interface{}
	argCount := 1

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
			specification sql.NullString
			avgRating float64
		)

		if err := rows.Scan(&id, &fullName, &avatarURL, &location, &specification, &avgRating); err != nil {
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
		workers = append(workers, w)
	}

	c.JSON(http.StatusOK, gin.H{
		"workers": workers,
		"count":   len(workers),
	})
}

