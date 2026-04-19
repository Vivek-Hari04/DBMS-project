package handlers

import (
    "context"
    "database/sql"
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
		"strings"
)

type ApplicationHandler struct {
    DB *pgxpool.Pool
}

type CreateApplicationRequest struct {
    JobID       int    `json:"job_id" binding:"required"`
    CoverLetter string `json:"cover_letter"`
}

type UpdateApplicationRequest struct {
    Status string `json:"status" binding:"required,oneof=accepted rejected"`
}

// Worker applies to a job
/*func (h *ApplicationHandler) ApplyToJob(c *gin.Context) {

    workerID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    var req CreateApplicationRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Verify worker exists and is actually a worker
    var userType string
    checkQuery := `SELECT user_type FROM users WHERE id = $1`
    err := h.DB.QueryRow(context.Background(), checkQuery, req.WorkerID).Scan(&userType)

		workID := workerID.(int)
    

    // Check if job exists and is still open
    var jobStatus string
    var expiresAt time.Time
    jobQuery := `SELECT status, expires_at FROM jobs WHERE id = $1`
    err = h.DB.QueryRow(context.Background(), jobQuery, req.JobID).Scan(&jobStatus, &expiresAt)
    
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
        return
    }

    if jobStatus != "open" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "This job is no longer accepting applications"})
        return
    }

    if expiresAt.Before(time.Now()) {
        c.JSON(http.StatusBadRequest, gin.H{"error": "This job has expired"})
        return
    }

    // Create application
    query := `
        INSERT INTO applications (job_id, worker_id, cover_letter)
        VALUES ($1, $2, $3)
        RETURNING id, job_id, worker_id, cover_letter, status, applied_at
    `

    var application struct {
        ID          int
        JobID       int
        WorkerID    int
        CoverLetter sql.NullString
        Status      string
        AppliedAt   time.Time
    }

    err = h.DB.QueryRow(context.Background(), query,
        req.JobID, workID, req.CoverLetter,
    ).Scan(
        &application.ID,
        &application.JobID,
        &application.WorkerID,
        &application.CoverLetter,
        &application.Status,
        &application.AppliedAt,
    )

    if err != nil {
        // Check if it's a duplicate application error
        if err.Error() == "ERROR: duplicate key value violates unique constraint \"applications_job_id_worker_id_key\" (SQLSTATE 23505)" {
            c.JSON(http.StatusConflict, gin.H{"error": "You have already applied to this job"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit application", "details": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "message": "Application submitted successfully",
        "application": application,
    })
}*/

// Worker applies to a job
func (h *ApplicationHandler) ApplyToJob(c *gin.Context) {
    // Get worker ID from JWT token
    workerID, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
        return
    }

    var req CreateApplicationRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    workID := workerID.(int)

    // Check if job exists and is still open
    var jobStatus string
    var expiresAt time.Time
    jobQuery := `SELECT status, expires_at FROM jobs WHERE id = $1`
    err := h.DB.QueryRow(context.Background(), jobQuery, req.JobID).Scan(&jobStatus, &expiresAt)
    
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
        return
    }

    if jobStatus != "open" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "This job is no longer accepting applications"})
        return
    }

    if expiresAt.Before(time.Now()) {
        c.JSON(http.StatusBadRequest, gin.H{"error": "This job has expired"})
        return
    }

    // Create application
    query := `
        INSERT INTO applications (job_id, worker_id, cover_letter)
        VALUES ($1, $2, $3)
        RETURNING id, job_id, worker_id, cover_letter, status, applied_at
    `

    var application struct {
        ID          int
        JobID       int
        WorkerID    int
        CoverLetter sql.NullString
        Status      string
        AppliedAt   time.Time
    }

    err = h.DB.QueryRow(context.Background(), query,
        req.JobID, workID, req.CoverLetter,
    ).Scan(
        &application.ID,
        &application.JobID,
        &application.WorkerID,
        &application.CoverLetter,
        &application.Status,
        &application.AppliedAt,
    )

    if err != nil {
        if strings.Contains(err.Error(), "duplicate key") {
            c.JSON(http.StatusConflict, gin.H{"error": "You have already applied to this job"})
            return
        }
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit application", "details": err.Error()})
        return
    }

    var employerID int
    h.DB.QueryRow(context.Background(), `SELECT employer_id FROM jobs WHERE id = $1`, req.JobID).Scan(&employerID)
    h.DB.Exec(context.Background(), `
        INSERT INTO notifications (user_id, type, title, message) 
        VALUES ($1, 'application_received', 'New Application', 'Someone applied to your job.')
    `, employerID)

    c.JSON(http.StatusCreated, gin.H{
        "message": "Application submitted successfully",
        "application": application,
    })
}

// Get all applications for a worker
func (h *ApplicationHandler) GetWorkerApplications(c *gin.Context) {
    workerID := c.Param("workerId")

    query := `
        SELECT a.id, a.job_id, a.worker_id, a.cover_letter, a.status, a.applied_at,
               j.title as job_title, j.location, j.salary_min, j.salary_max,
               j.status as job_status, j.employer_id, j.hired_worker_id,
               u.full_name as employer_name
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        JOIN users u ON j.employer_id = u.id
        WHERE a.worker_id = $1
        ORDER BY a.applied_at DESC
    `

    rows, err := h.DB.Query(context.Background(), query, workerID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch applications"})
        return
    }
    defer rows.Close()

    var applications []map[string]interface{}

    for rows.Next() {
        var (
            id, jobID, workerID int
            status, jobTitle, location, jobStatus, employerName string
            coverLetter sql.NullString
            salaryMin, salaryMax sql.NullFloat64
            employerID int
            hiredWorkerID sql.NullInt64
            appliedAt time.Time
        )

        err := rows.Scan(
            &id, &jobID, &workerID, &coverLetter, &status, &appliedAt,
            &jobTitle, &location, &salaryMin, &salaryMax,
            &jobStatus, &employerID, &hiredWorkerID,
            &employerName,
        )

        if err != nil {
            continue
        }

        app := map[string]interface{}{
            "id":            id,
            "job_id":        jobID,
            "worker_id":     workerID,
            "status":        status,
            "applied_at":    appliedAt,
            "job_title":     jobTitle,
            "location":      location,
            "job_status":    jobStatus,
            "employer_id":   employerID,
            "employer_name": employerName,
        }

        if coverLetter.Valid {
            app["cover_letter"] = coverLetter.String
        }
        if salaryMin.Valid {
            app["salary_min"] = salaryMin.Float64
        }
        if salaryMax.Valid {
            app["salary_max"] = salaryMax.Float64
        }
        if hiredWorkerID.Valid {
            app["hired_worker_id"] = hiredWorkerID.Int64
        }

        applications = append(applications, app)
    }

    c.JSON(http.StatusOK, gin.H{
        "applications": applications,
        "count": len(applications),
    })
}

// Get all applications for a specific job (for employers)
func (h *ApplicationHandler) GetJobApplications(c *gin.Context) {
    jobID := c.Param("jobId")

    query := `
        SELECT a.id, a.job_id, a.worker_id, a.cover_letter, a.status, a.applied_at,
               u.full_name as worker_name, u.email as worker_email, 
               u.phone as worker_phone, u.location as worker_location, u.profile_pic,
               COALESCE((SELECT AVG(rating) FROM ratings WHERE reviewee_id = a.worker_id), 0) as average_rating
        FROM applications a
        JOIN users u ON a.worker_id = u.id
        WHERE a.job_id = $1
        ORDER BY a.applied_at DESC
    `

    rows, err := h.DB.Query(context.Background(), query, jobID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch applications"})
        return
    }
    defer rows.Close()

    var applications []map[string]interface{}

    for rows.Next() {
        var (
            id, jobID, workerID int
            status, workerName, workerEmail string
            coverLetter, workerPhone, workerLocation, profilePic sql.NullString
            appliedAt time.Time
            averageRating float64
        )

        err := rows.Scan(
            &id, &jobID, &workerID, &coverLetter, &status, &appliedAt,
            &workerName, &workerEmail, &workerPhone, &workerLocation, &profilePic, &averageRating,
        )

        if err != nil {
            continue
        }

        app := map[string]interface{}{
            "id":           id,
            "job_id":       jobID,
            "worker_id":    workerID,
            "status":       status,
            "applied_at":   appliedAt,
            "worker_name":  workerName,
            "worker_email": workerEmail,
            "average_rating": averageRating,
        }

        if coverLetter.Valid {
            app["cover_letter"] = coverLetter.String
        }
        if workerPhone.Valid {
            app["worker_phone"] = workerPhone.String
        }
        if workerLocation.Valid {
            app["worker_location"] = workerLocation.String
        }
        if profilePic.Valid {
            app["profile_pic"] = profilePic.String
        }

        applications = append(applications, app)
    }

    c.JSON(http.StatusOK, gin.H{
        "applications": applications,
        "count": len(applications),
    })
}

// Update application status (accept/reject)
func (h *ApplicationHandler) UpdateApplicationStatus(c *gin.Context) {
    applicationID := c.Param("id")

    employerIDRaw, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }
    var employerID int
    switch v := employerIDRaw.(type) {
    case float64:
        employerID = int(v)
    case int:
        employerID = v
    default:
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    var req UpdateApplicationRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Validate ownership and current state.
    var (
        jobID        int
        workerID     int
        currentStatus string
        jobStatus     string
    )
    err := h.DB.QueryRow(
        context.Background(),
        `
        SELECT a.job_id, a.worker_id, a.status, j.status
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE a.id = $1 AND j.employer_id = $2
        `,
        applicationID, employerID,
    ).Scan(&jobID, &workerID, &currentStatus, &jobStatus)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Application not found or not authorized"})
        return
    }

    if currentStatus != "pending" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Only pending applications can be updated"})
        return
    }

    // Reject: just update the application status.
    if req.Status == "rejected" {
        var updated struct {
            ID        int
            JobID     int
            WorkerID  int
            Status    string
            UpdatedAt time.Time
        }
        err = h.DB.QueryRow(
            context.Background(),
            `
            UPDATE applications
            SET status = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, job_id, worker_id, status, updated_at
            `,
            req.Status, applicationID,
        ).Scan(&updated.ID, &updated.JobID, &updated.WorkerID, &updated.Status, &updated.UpdatedAt)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update application"})
            return
        }

        var jobTitle string
        _ = h.DB.QueryRow(context.Background(), `SELECT title FROM jobs WHERE id = $1`, jobID).Scan(&jobTitle)
        _, _ = h.DB.Exec(context.Background(), `
            INSERT INTO notifications (user_id, type, title, message) 
            VALUES ($1, 'status_updated', 'Application Update', 'Your application for "' || $2 || '" has been rejected')
        `, workerID, jobTitle)

        c.JSON(http.StatusOK, gin.H{
            "message":     "Application status updated",
            "application": updated,
        })
        return
    }

    // Accepted: close the job, set hired_worker_id, accept this application, reject others.
    if jobStatus != "open" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Job is already closed or not accepting updates"})
        return
    }

    tx, err := h.DB.Begin(context.Background())
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
        return
    }
    defer tx.Rollback(context.Background())

    _, err = tx.Exec(context.Background(), `UPDATE jobs SET status = 'closed', hired_worker_id = $1 WHERE id = $2`, workerID, jobID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update job"})
        return
    }

    _, err = tx.Exec(context.Background(), `UPDATE applications SET status = 'accepted', updated_at = NOW() WHERE id = $1`, applicationID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update selected application"})
        return
    }

    _, err = tx.Exec(context.Background(), `UPDATE applications SET status = 'rejected', updated_at = NOW() WHERE job_id = $1 AND id != $2 AND status = 'pending'`, jobID, applicationID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject remaining applications"})
        return
    }

    if err = tx.Commit(context.Background()); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
        return
    }

    var jobTitle string
    _ = h.DB.QueryRow(context.Background(), `SELECT title FROM jobs WHERE id = $1`, jobID).Scan(&jobTitle)
    
    _, _ = h.DB.Exec(context.Background(), `
        INSERT INTO notifications (user_id, type, title, message) 
        VALUES ($1, 'status_updated', 'You were Hired!', 'Congratulations! You have been hired for "' || $2 || '".')
    `, workerID, jobTitle)

    c.JSON(http.StatusOK, gin.H{
        "message": "Application accepted and job closed",
        "application": gin.H{
            "id":        applicationID,
            "job_id":    jobID,
            "worker_id": workerID,
            "status":    "accepted",
        },
    })
}
