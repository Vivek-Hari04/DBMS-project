package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type FavoritesHandler struct {
	DB *pgxpool.Pool
}

func getUserIDFromContext(c *gin.Context) (int, bool) {
	raw, ok := c.Get("user_id")
	if !ok {
		return 0, false
	}
	switch v := raw.(type) {
	case int:
		return v, true
	case float64:
		return int(v), true
	default:
		return 0, false
	}
}

// POST /api/favorites/workers/:workerId
func (h *FavoritesHandler) AddFavoriteWorker(c *gin.Context) {
	employerID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	workerID, err := strconv.Atoi(c.Param("workerId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid worker id"})
		return
	}

	_, err = h.DB.Exec(context.Background(), `
		INSERT INTO favorite_workers (employer_id, worker_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, employerID, workerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to favorite worker"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Favorited"})
}

// DELETE /api/favorites/workers/:workerId
func (h *FavoritesHandler) RemoveFavoriteWorker(c *gin.Context) {
	employerID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	workerID, err := strconv.Atoi(c.Param("workerId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid worker id"})
		return
	}

	_, err = h.DB.Exec(context.Background(), `
		DELETE FROM favorite_workers WHERE employer_id = $1 AND worker_id = $2
	`, employerID, workerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unfavorite worker"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Unfavorited"})
}

// GET /api/favorites/workers
func (h *FavoritesHandler) ListFavoriteWorkers(c *gin.Context) {
	employerID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	query := `
		SELECT u.id, u.full_name, u.avatar_url, u.location,
		       COALESCE((SELECT AVG(rating) FROM ratings r WHERE r.reviewee_id = u.id), 0) as average_rating
		FROM favorite_workers f
		JOIN users u ON u.id = f.worker_id
		WHERE f.employer_id = $1
		ORDER BY f.created_at DESC
	`

	rows, err := h.DB.Query(context.Background(), query, employerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch favorites"})
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
			avgRating float64
		)

		if err := rows.Scan(&id, &fullName, &avatarURL, &location, &avgRating); err != nil {
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
		workers = append(workers, w)
	}

	c.JSON(http.StatusOK, gin.H{"workers": workers, "count": len(workers)})
}

