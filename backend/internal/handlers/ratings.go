package handlers

import (
    "context"
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
)

type RatingHandler struct {
    DB *pgxpool.Pool
}

type CreateRatingRequest struct {
    JobID      int    `json:"job_id" binding:"required"`
    RevieweeID int    `json:"reviewee_id" binding:"required"`
    Rating     int    `json:"rating" binding:"required,min=1,max=5"`
    Review     string `json:"review"`
}

func (h *RatingHandler) CreateRating(c *gin.Context) {
    reviewerID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }
    
    var req CreateRatingRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    var job struct {
        EmployerID int
        HiredWorkerID *int
        Status string
    }
    err := h.DB.QueryRow(context.Background(), `SELECT employer_id, hired_worker_id, status FROM jobs WHERE id = $1`, req.JobID).Scan(&job.EmployerID, &job.HiredWorkerID, &job.Status)
    if err != nil {
         c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
         return
    }
    
    if job.Status != "closed" {
         c.JSON(http.StatusBadRequest, gin.H{"error": "Can only rate completed jobs"})
         return
    }
    
    if job.HiredWorkerID == nil {
         c.JSON(http.StatusBadRequest, gin.H{"error": "No worker was hired for this job"})
         return
    }
    
    // cast reviewer back
    // Ensure accurate types if float64 from c.Get
    var revID int
    switch v := reviewerID.(type) {
    case float64:
        revID = int(v)
    case int:
        revID = v
    }
    hwId := *job.HiredWorkerID
    empId := job.EmployerID
    
    // Valid pairs
    isValidPair := (revID == empId && req.RevieweeID == hwId) || (revID == hwId && req.RevieweeID == empId)
    
    if !isValidPair {
        c.JSON(http.StatusForbidden, gin.H{"error": "You are not authorized to rate this user for this job"})
        return
    }
    
    query := `INSERT INTO ratings (job_id, reviewer_id, reviewee_id, rating, review) VALUES ($1, $2, $3, $4, $5) RETURNING id`
    var id int
    err = h.DB.QueryRow(context.Background(), query, req.JobID, revID, req.RevieweeID, req.Rating, req.Review).Scan(&id)
    if err != nil {
         c.JSON(http.StatusConflict, gin.H{"error": "You have already rated this user for this job"})
         return
    }
    
    c.JSON(http.StatusCreated, gin.H{"message": "Rating submitted successfully"})
}

func (h *RatingHandler) GetUserRatings(c *gin.Context) {
    userID := c.Param("id")
    
    query := `
        SELECT r.id, r.job_id, r.rating, r.review, r.created_at,
               u.full_name as reviewer_name, u.user_type as reviewer_type
        FROM ratings r
        JOIN users u ON r.reviewer_id = u.id
        WHERE r.reviewee_id = $1
        ORDER BY r.created_at DESC
    `
    rows, err := h.DB.Query(context.Background(), query, userID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch ratings"})
        return
    }
    defer rows.Close()
    
    var ratings []map[string]interface{}
    for rows.Next() {
        var r map[string]interface{} = make(map[string]interface{})
        var id, jobId, rating int
        var review, reviewerName, reviewerType *string
        var createdAt time.Time
        err := rows.Scan(&id, &jobId, &rating, &review, &createdAt, &reviewerName, &reviewerType)
        if err == nil {
            r["id"] = id
            r["job_id"] = jobId
            r["rating"] = rating
            r["review"] = ""
            if review != nil { r["review"] = *review }
            r["reviewer_name"] = ""
            if reviewerName != nil { r["reviewer_name"] = *reviewerName }
            r["reviewer_type"] = ""
            if reviewerType != nil { r["reviewer_type"] = *reviewerType }
            r["created_at"] = createdAt
            ratings = append(ratings, r)
        }
    }
    
    c.JSON(http.StatusOK, gin.H{"ratings": ratings})
}
