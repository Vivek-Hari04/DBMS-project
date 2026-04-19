package handlers

import (
    "context"
    "database/sql"
    "net/http"
    "time"
    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
    "strconv"
    "strings"
)

type JobHandler struct {
    DB *pgxpool.Pool
}

type CreateJobRequest struct {
    //EmployerID   int      `json:"employer_id" binding:"required"` // Add this line
	  Title        string   `json:"title" binding:"required"`
    Description  string   `json:"description" binding:"required"`
    CategoryID   *int     `json:"category_id"`
    Location     string   `json:"location" binding:"required"`
    SalaryMin    *float64 `json:"salary_min"`
    SalaryMax    *float64 `json:"salary_max"`
    Duration     string   `json:"duration"`
    Requirements string   `json:"requirements"`
    ContactPhone string   `json:"contact_phone"`
    ContactEmail string   `json:"contact_email"`
    ExpiryDays   int      `json:"expiry_days" binding:"required,min=1,max=7"` // 1-7 days
}

type CreateOfferRequest struct {
    WorkerID     int     `json:"worker_id" binding:"required"`
    Title        string  `json:"title" binding:"required"`
    Description  string  `json:"description" binding:"required"`
    CategoryID   *int    `json:"category_id"`
    Location     string  `json:"location" binding:"required"`
    SalaryMin    *float64 `json:"salary_min"`
    SalaryMax    *float64 `json:"salary_max"`
    Duration     string  `json:"duration"`
    Requirements string  `json:"requirements"`
    ContactPhone string  `json:"contact_phone"`
    ContactEmail string  `json:"contact_email"`
    ExpiryDays   int     `json:"expiry_days" binding:"required,min=1,max=7"`
}

type OfferResponseRequest struct {
    Action string `json:"action" binding:"required,oneof=accept reject"`
}

// Create new job posting
func (h *JobHandler) CreateJob(c *gin.Context) {

    employerID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authorized"})
			return
		}

    var req CreateJobRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Get employer ID from JWT token
    
    /* employerID := c.GetInt("user_id") // We'll implement this with JWT later
    if employerID == 0 {
        // Temporary: accept from query param for testing
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Employer ID required"})
        return
    }*/
		// Use employer_id from request
empID := employerID.(int)

// Verify the user is an employer
var userType string
checkQuery := `SELECT user_type FROM users WHERE id = $1`
err := h.DB.QueryRow(context.Background(), checkQuery, employerID).Scan(&userType)

if err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid employer ID"})
    return
}

if userType != "customer" && userType != "shopkeeper" {
    c.JSON(http.StatusForbidden, gin.H{"error": "Only employers can post jobs"})
    return
}

    // Calculate expiry date
    expiresAt := time.Now().AddDate(0, 0, req.ExpiryDays)

    query := `
        INSERT INTO jobs (
            employer_id, title, description, category_id, location,
            salary_min, salary_max, duration, requirements,
            contact_phone, contact_email, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, employer_id, title, description, category_id, location,
                  salary_min, salary_max, duration, requirements,
                  contact_phone, contact_email, expires_at, status, is_active, created_at
    `

    var job struct {
        ID          int
        EmployerID  int
        Title       string
        Description string
        CategoryID  sql.NullInt64
        Location    string
        SalaryMin   sql.NullFloat64
        SalaryMax   sql.NullFloat64
        Duration    sql.NullString
        Requirements sql.NullString
        ContactPhone sql.NullString
        ContactEmail sql.NullString
        ExpiresAt   time.Time
        Status      string
        IsActive    bool
        CreatedAt   time.Time
    }

    err = h.DB.QueryRow(context.Background(), query,
        empID, req.Title, req.Description, req.CategoryID, req.Location,
        req.SalaryMin, req.SalaryMax, req.Duration, req.Requirements,
        req.ContactPhone, req.ContactEmail, expiresAt,
    ).Scan(
        &job.ID, &job.EmployerID, &job.Title, &job.Description, &job.CategoryID,
        &job.Location, &job.SalaryMin, &job.SalaryMax, &job.Duration,
        &job.Requirements, &job.ContactPhone, &job.ContactEmail,
        &job.ExpiresAt, &job.Status, &job.IsActive, &job.CreatedAt,
    )

    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create job", "details": err.Error()})
        return
    }
    h.DB.Exec(context.Background(), `
        INSERT INTO notifications (user_id, type, title, message)
        SELECT id, 'job_created', 'New Job Posted', 'A new job "' || $1 || '" has been posted in ' || $2
        FROM users 
        WHERE user_type IN ('worker', 'handyman')
    `, req.Title, req.Location)

    c.JSON(http.StatusCreated, gin.H{
        "message": "Job created successfully",
        "job": job,
    })
}

// Get all active jobs
func (h *JobHandler) GetJobs(c *gin.Context) {
    query := `
        SELECT j.id, j.employer_id, j.title, j.description, j.category_id, j.location,
               j.salary_min, j.salary_max, j.duration, j.requirements,
               j.contact_phone, j.contact_email, j.expires_at, j.status, j.is_active, j.created_at,
               j.hired_worker_id,
               u.full_name as employer_name,
               c.name as category_name,
               COALESCE((SELECT AVG(rating) FROM ratings WHERE reviewee_id = j.employer_id), 0) as average_rating
        FROM jobs j
        JOIN users u ON j.employer_id = u.id
        LEFT JOIN categories c ON j.category_id = c.id
        WHERE j.is_active = true AND (j.is_private = false OR j.is_private IS NULL)
        ORDER BY j.created_at DESC
    `

    rows, err := h.DB.Query(context.Background(), query)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch jobs"})
        return
    }
    defer rows.Close()

    var jobs []map[string]interface{}

    for rows.Next() {
        var (
            id, employerID int
            title, description, location, status, employerName string
            categoryID sql.NullInt64
            salaryMin, salaryMax sql.NullFloat64
            duration, requirements, contactPhone, contactEmail, categoryName sql.NullString
            expiresAt, createdAt time.Time
            isActive bool
            hiredWorkerID sql.NullInt64
            averageRating float64
        )

        err := rows.Scan(
            &id, &employerID, &title, &description, &categoryID, &location,
            &salaryMin, &salaryMax, &duration, &requirements,
            &contactPhone, &contactEmail, &expiresAt, &status, &isActive, &createdAt,
            &hiredWorkerID,
            &employerName, &categoryName, &averageRating,
        )

        if err != nil {
            continue
        }

        job := map[string]interface{}{
            "id":            id,
            "employer_id":   employerID,
            "employer_name": employerName,
            "title":         title,
            "description":   description,
            "location":      location,
            "status":        status,
            "is_active":     isActive,
            "expires_at":    expiresAt,
            "created_at":    createdAt,
            "average_rating": averageRating,
        }

        if hiredWorkerID.Valid {
            job["hired_worker_id"] = hiredWorkerID.Int64
        }
        if categoryID.Valid {
            job["category_id"] = categoryID.Int64
        }
        if categoryName.Valid {
            job["category_name"] = categoryName.String
        }
        if salaryMin.Valid {
            job["salary_min"] = salaryMin.Float64
        }
        if salaryMax.Valid {
            job["salary_max"] = salaryMax.Float64
        }
        if duration.Valid {
            job["duration"] = duration.String
        }
        if requirements.Valid {
            job["requirements"] = requirements.String
        }
        if contactPhone.Valid {
            job["contact_phone"] = contactPhone.String
        }
        if contactEmail.Valid {
            job["contact_email"] = contactEmail.String
        }

        jobs = append(jobs, job)
    }

    c.JSON(http.StatusOK, gin.H{
        "jobs": jobs,
        "count": len(jobs),
    })
}

// Search active jobs by keyword and/or location (ILIKE).
// Query params:
// - q: matches title or description
// - location: matches location string
func (h *JobHandler) SearchJobs(c *gin.Context) {
    q := strings.TrimSpace(c.Query("q"))
    loc := strings.TrimSpace(c.Query("location"))

    baseQuery := `
        SELECT j.id, j.employer_id, j.title, j.description, j.category_id, j.location,
               j.salary_min, j.salary_max, j.duration, j.requirements,
               j.contact_phone, j.contact_email, j.expires_at, j.status, j.is_active, j.created_at,
               j.hired_worker_id,
               u.full_name as employer_name,
               c.name as category_name,
               COALESCE((SELECT AVG(rating) FROM ratings WHERE reviewee_id = j.employer_id), 0) as average_rating
        FROM jobs j
        JOIN users u ON j.employer_id = u.id
        LEFT JOIN categories c ON j.category_id = c.id
        WHERE j.is_active = true AND (j.is_private = false OR j.is_private IS NULL)
    `

    var args []interface{}
    argN := 1

    if q != "" {
        baseQuery += ` AND (j.title ILIKE $` + strconv.Itoa(argN) + ` OR j.description ILIKE $` + strconv.Itoa(argN) + `)`
        args = append(args, "%"+q+"%")
        argN++
    }

    if loc != "" {
        baseQuery += ` AND j.location ILIKE $` + strconv.Itoa(argN)
        args = append(args, "%"+loc+"%")
        argN++
    }

    baseQuery += ` ORDER BY j.created_at DESC`

    rows, err := h.DB.Query(context.Background(), baseQuery, args...)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search jobs"})
        return
    }
    defer rows.Close()

    var jobs []map[string]interface{}

    for rows.Next() {
        var (
            id, employerID int
            title, description, location, status, employerName string
            categoryID sql.NullInt64
            salaryMin, salaryMax sql.NullFloat64
            duration, requirements, contactPhone, contactEmail, categoryName sql.NullString
            expiresAt, createdAt time.Time
            isActive bool
            hiredWorkerID sql.NullInt64
            averageRating float64
        )

        err := rows.Scan(
            &id, &employerID, &title, &description, &categoryID, &location,
            &salaryMin, &salaryMax, &duration, &requirements,
            &contactPhone, &contactEmail, &expiresAt, &status, &isActive, &createdAt,
            &hiredWorkerID,
            &employerName, &categoryName, &averageRating,
        )
        if err != nil {
            continue
        }

        job := map[string]interface{}{
            "id":             id,
            "employer_id":    employerID,
            "employer_name":  employerName,
            "title":          title,
            "description":    description,
            "location":       location,
            "status":         status,
            "is_active":      isActive,
            "expires_at":     expiresAt,
            "created_at":     createdAt,
            "average_rating": averageRating,
        }

        if hiredWorkerID.Valid {
            job["hired_worker_id"] = hiredWorkerID.Int64
        }
        if categoryID.Valid {
            job["category_id"] = categoryID.Int64
        }
        if categoryName.Valid {
            job["category_name"] = categoryName.String
        }
        if salaryMin.Valid {
            job["salary_min"] = salaryMin.Float64
        }
        if salaryMax.Valid {
            job["salary_max"] = salaryMax.Float64
        }
        if duration.Valid {
            job["duration"] = duration.String
        }
        if requirements.Valid {
            job["requirements"] = requirements.String
        }
        if contactPhone.Valid {
            job["contact_phone"] = contactPhone.String
        }
        if contactEmail.Valid {
            job["contact_email"] = contactEmail.String
        }

        jobs = append(jobs, job)
    }

    c.JSON(http.StatusOK, gin.H{
        "jobs":  jobs,
        "count": len(jobs),
    })
}

// Get single job by ID
func (h *JobHandler) GetJob(c *gin.Context) {
    jobID := c.Param("id")

    query := `
        SELECT j.id, j.employer_id, j.title, j.description, j.category_id, j.location,
               j.salary_min, j.salary_max, j.duration, j.requirements,
               j.contact_phone, j.contact_email, j.expires_at, j.status, j.is_active, j.created_at,
               j.hired_worker_id,
               u.full_name as employer_name,
               c.name as category_name,
               COALESCE((SELECT AVG(rating) FROM ratings WHERE reviewee_id = j.employer_id), 0) as average_rating
        FROM jobs j
        JOIN users u ON j.employer_id = u.id
        LEFT JOIN categories c ON j.category_id = c.id
        WHERE j.id = $1 AND (j.is_private = false OR j.is_private IS NULL)
    `

    var (
        id, employerID int
        title, description, location, status, employerName string
        categoryID sql.NullInt64
        salaryMin, salaryMax sql.NullFloat64
        duration, requirements, contactPhone, contactEmail, categoryName sql.NullString
        expiresAt, createdAt time.Time
        isActive bool
        hiredWorkerID sql.NullInt64
        averageRating float64
    )

    err := h.DB.QueryRow(context.Background(), query, jobID).Scan(
        &id, &employerID, &title, &description, &categoryID, &location,
        &salaryMin, &salaryMax, &duration, &requirements,
        &contactPhone, &contactEmail, &expiresAt, &status, &isActive, &createdAt,
        &hiredWorkerID,
        &employerName, &categoryName, &averageRating,
    )

    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Job not found"})
        return
    }

    job := map[string]interface{}{
        "id":            id,
        "employer_id":   employerID,
        "employer_name": employerName,
        "title":         title,
        "description":   description,
        "location":      location,
        "status":        status,
        "is_active":     isActive,
        "expires_at":    expiresAt,
        "created_at":    createdAt,
        "average_rating": averageRating,
    }

    if hiredWorkerID.Valid {
        job["hired_worker_id"] = hiredWorkerID.Int64
    }
    if categoryID.Valid {
        job["category_id"] = categoryID.Int64
    }
    if categoryName.Valid {
        job["category_name"] = categoryName.String
    }
    if salaryMin.Valid {
        job["salary_min"] = salaryMin.Float64
    }
    if salaryMax.Valid {
        job["salary_max"] = salaryMax.Float64
    }
    if duration.Valid {
        job["duration"] = duration.String
    }
    if requirements.Valid {
        job["requirements"] = requirements.String
    }
    if contactPhone.Valid {
        job["contact_phone"] = contactPhone.String
    }
    if contactEmail.Valid {
        job["contact_email"] = contactEmail.String
    }

    c.JSON(http.StatusOK, job)
}

// Employer: list my jobs including private offers.
func (h *JobHandler) GetMyJobs(c *gin.Context) {
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

    query := `
        SELECT j.id, j.employer_id, j.title, j.description, j.category_id, j.location,
               j.salary_min, j.salary_max, j.duration, j.requirements,
               j.contact_phone, j.contact_email, j.expires_at, j.status, j.is_active, j.created_at,
               j.hired_worker_id, j.is_private, j.assigned_worker_id,
               u.full_name as employer_name,
               c.name as category_name,
               COALESCE((SELECT AVG(rating) FROM ratings WHERE reviewee_id = j.employer_id), 0) as average_rating
        FROM jobs j
        JOIN users u ON j.employer_id = u.id
        LEFT JOIN categories c ON j.category_id = c.id
        WHERE j.is_active = true AND j.employer_id = $1
        ORDER BY j.created_at DESC
    `

    rows, err := h.DB.Query(context.Background(), query, employerID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch jobs"})
        return
    }
    defer rows.Close()

    var jobs []map[string]interface{}
    for rows.Next() {
        var (
            id, empID int
            title, description, location, status, employerName string
            categoryID sql.NullInt64
            salaryMin, salaryMax sql.NullFloat64
            duration, requirements, contactPhone, contactEmail, categoryName sql.NullString
            expiresAt, createdAt time.Time
            isActive bool
            hiredWorkerID sql.NullInt64
            isPrivate bool
            assignedWorkerID sql.NullInt64
            averageRating float64
        )

        err := rows.Scan(
            &id, &empID, &title, &description, &categoryID, &location,
            &salaryMin, &salaryMax, &duration, &requirements,
            &contactPhone, &contactEmail, &expiresAt, &status, &isActive, &createdAt,
            &hiredWorkerID, &isPrivate, &assignedWorkerID,
            &employerName, &categoryName, &averageRating,
        )
        if err != nil {
            continue
        }

        job := map[string]interface{}{
            "id":             id,
            "employer_id":    empID,
            "employer_name":  employerName,
            "title":          title,
            "description":    description,
            "location":       location,
            "status":         status,
            "is_active":      isActive,
            "expires_at":     expiresAt,
            "created_at":     createdAt,
            "average_rating": averageRating,
            "is_private":     isPrivate,
        }
        if hiredWorkerID.Valid {
            job["hired_worker_id"] = hiredWorkerID.Int64
        }
        if assignedWorkerID.Valid {
            job["assigned_worker_id"] = assignedWorkerID.Int64
        }
        if categoryID.Valid {
            job["category_id"] = categoryID.Int64
        }
        if categoryName.Valid {
            job["category_name"] = categoryName.String
        }
        if salaryMin.Valid {
            job["salary_min"] = salaryMin.Float64
        }
        if salaryMax.Valid {
            job["salary_max"] = salaryMax.Float64
        }
        if duration.Valid {
            job["duration"] = duration.String
        }
        if requirements.Valid {
            job["requirements"] = requirements.String
        }
        if contactPhone.Valid {
            job["contact_phone"] = contactPhone.String
        }
        if contactEmail.Valid {
            job["contact_email"] = contactEmail.String
        }

        jobs = append(jobs, job)
    }

    c.JSON(http.StatusOK, gin.H{"jobs": jobs, "count": len(jobs)})
}

// Employer: create a private job offer assigned to a specific worker.
func (h *JobHandler) CreatePrivateOffer(c *gin.Context) {
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

    var req CreateOfferRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    expiresAt := time.Now().AddDate(0, 0, req.ExpiryDays)

    query := `
        INSERT INTO jobs (
            employer_id, title, description, category_id, location,
            salary_min, salary_max, duration, requirements,
            contact_phone, contact_email, expires_at,
            is_private, assigned_worker_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13)
        RETURNING id
    `

    var id int
    err := h.DB.QueryRow(context.Background(), query,
        employerID, req.Title, req.Description, req.CategoryID, req.Location,
        req.SalaryMin, req.SalaryMax, req.Duration, req.Requirements,
        req.ContactPhone, req.ContactEmail, expiresAt,
        req.WorkerID,
    ).Scan(&id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create offer"})
        return
    }

    // Notify the worker
    _, _ = h.DB.Exec(context.Background(), `
        INSERT INTO notifications (user_id, type, title, message)
        VALUES ($1, 'job_offer', 'New Job Offer', 'You have received a private job offer.')
    `, req.WorkerID)

    c.JSON(http.StatusCreated, gin.H{"message": "Offer created", "job_id": id})
}

// Worker: list private job offers assigned to me.
func (h *JobHandler) GetMyOffers(c *gin.Context) {
    workerIDRaw, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }
    var workerID int
    switch v := workerIDRaw.(type) {
    case float64:
        workerID = int(v)
    case int:
        workerID = v
    default:
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    query := `
        SELECT j.id, j.employer_id, j.title, j.description, j.category_id, j.location,
               j.salary_min, j.salary_max, j.duration, j.requirements,
               j.contact_phone, j.contact_email, j.expires_at, j.status, j.is_active, j.created_at,
               j.hired_worker_id, j.is_private, j.assigned_worker_id,
               u.full_name as employer_name,
               c.name as category_name,
               COALESCE((SELECT AVG(rating) FROM ratings WHERE reviewee_id = j.employer_id), 0) as average_rating
        FROM jobs j
        JOIN users u ON j.employer_id = u.id
        LEFT JOIN categories c ON j.category_id = c.id
        WHERE j.is_active = true
          AND j.assigned_worker_id = $1
        ORDER BY j.created_at DESC
    `

    rows, err := h.DB.Query(context.Background(), query, workerID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch offers"})
        return
    }
    defer rows.Close()

    var jobs []map[string]interface{}
    for rows.Next() {
        var (
            id, employerID int
            title, description, location, status, employerName string
            categoryID sql.NullInt64
            salaryMin, salaryMax sql.NullFloat64
            duration, requirements, contactPhone, contactEmail, categoryName sql.NullString
            expiresAt, createdAt time.Time
            isActive bool
            hiredWorkerID sql.NullInt64
            isPrivate bool
            assignedWorkerID sql.NullInt64
            averageRating float64
        )

        err := rows.Scan(
            &id, &employerID, &title, &description, &categoryID, &location,
            &salaryMin, &salaryMax, &duration, &requirements,
            &contactPhone, &contactEmail, &expiresAt, &status, &isActive, &createdAt,
            &hiredWorkerID, &isPrivate, &assignedWorkerID,
            &employerName, &categoryName, &averageRating,
        )
        if err != nil {
            continue
        }

        job := map[string]interface{}{
            "id":             id,
            "employer_id":    employerID,
            "employer_name":  employerName,
            "title":          title,
            "description":    description,
            "location":       location,
            "status":         status,
            "is_active":      isActive,
            "expires_at":     expiresAt,
            "created_at":     createdAt,
            "average_rating": averageRating,
            "is_private":     isPrivate,
        }
        if hiredWorkerID.Valid {
            job["hired_worker_id"] = hiredWorkerID.Int64
        }
        if assignedWorkerID.Valid {
            job["assigned_worker_id"] = assignedWorkerID.Int64
        }
        if categoryID.Valid {
            job["category_id"] = categoryID.Int64
        }
        if categoryName.Valid {
            job["category_name"] = categoryName.String
        }
        if salaryMin.Valid {
            job["salary_min"] = salaryMin.Float64
        }
        if salaryMax.Valid {
            job["salary_max"] = salaryMax.Float64
        }
        if duration.Valid {
            job["duration"] = duration.String
        }
        if requirements.Valid {
            job["requirements"] = requirements.String
        }
        if contactPhone.Valid {
            job["contact_phone"] = contactPhone.String
        }
        if contactEmail.Valid {
            job["contact_email"] = contactEmail.String
        }

        jobs = append(jobs, job)
    }

    c.JSON(http.StatusOK, gin.H{"jobs": jobs, "count": len(jobs)})
}

// Worker: accept/reject a private offer.
func (h *JobHandler) RespondToOffer(c *gin.Context) {
    workerIDRaw, exists := c.Get("user_id")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }
    var workerID int
    switch v := workerIDRaw.(type) {
    case float64:
        workerID = int(v)
    case int:
        workerID = v
    default:
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    jobID, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job id"})
        return
    }

    var req OfferResponseRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Validate that this job is an open private offer assigned to this worker.
    var employerID int
    var status string
    err = h.DB.QueryRow(context.Background(), `
        SELECT employer_id, status
        FROM jobs
        WHERE id = $1 AND is_private = true AND assigned_worker_id = $2 AND is_active = true
    `, jobID, workerID).Scan(&employerID, &status)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Offer not found"})
        return
    }
    if status != "open" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Offer is no longer open"})
        return
    }

    if req.Action == "reject" {
        _, err := h.DB.Exec(context.Background(), `
            UPDATE jobs
            SET status = 'closed'
            WHERE id = $1 AND assigned_worker_id = $2
        `, jobID, workerID)
        if err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject offer"})
            return
        }
        c.JSON(http.StatusOK, gin.H{"message": "Offer rejected"})
        return
    }

    // accept
    _, err = h.DB.Exec(context.Background(), `
        UPDATE jobs
        SET hired_worker_id = $1, status = 'closed'
        WHERE id = $2 AND assigned_worker_id = $1
    `, workerID, jobID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to accept offer"})
        return
    }

    // notify employer
    _, _ = h.DB.Exec(context.Background(), `
        INSERT INTO notifications (user_id, type, title, message)
        VALUES ($1, 'offer_accepted', 'Offer Accepted', 'Your private job offer was accepted.')
    `, employerID)

    c.JSON(http.StatusOK, gin.H{"message": "Offer status updated"})
}

// Get all categories
func (h *JobHandler) GetCategories(c *gin.Context) {
    query := `SELECT id, name, description FROM categories ORDER BY id ASC`
    rows, err := h.DB.Query(context.Background(), query)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
        return
    }
    defer rows.Close()

    var categories []map[string]interface{}
    for rows.Next() {
        var id int
        var name, description sql.NullString
        if err := rows.Scan(&id, &name, &description); err != nil {
            continue
        }
        category := map[string]interface{}{"id": id}
        if name.Valid { category["name"] = name.String }
        if description.Valid { category["description"] = description.String }
        categories = append(categories, category)
    }
    c.JSON(http.StatusOK, gin.H{"categories": categories})
}

// DeleteJob endpoint
func (h *JobHandler) DeleteJob(c *gin.Context) {
    jobIDStr := c.Param("id")
    jobID, err := strconv.Atoi(jobIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
        return
    }

    employerID, _ := c.Get("user_id")

    // Use empID safely
    var empID int
    switch v := employerID.(type) {
    case float64: empID = int(v)
    case int: empID = v
    }

    query := `DELETE FROM jobs WHERE id = $1 AND employer_id = $2`
    
    cmdTag, err := h.DB.Exec(context.Background(), query, jobID, empID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete job", "db_error": err.Error()})
        return
    }

    if cmdTag.RowsAffected() == 0 {
        c.JSON(http.StatusNotFound, gin.H{"error": "Job not found or not authorized"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Job deleted successfully"})
}

// HireWorker endpoint
func (h *JobHandler) HireWorker(c *gin.Context) {
    jobIDStr := c.Param("id")
    workerIDStr := c.Param("workerId")
    jobID, err := strconv.Atoi(jobIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid job ID"})
        return
    }
    workerID, err := strconv.Atoi(workerIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid worker ID"})
        return
    }

    employerID, _ := c.Get("user_id")

    var empID int
    switch v := employerID.(type) {
    case float64: empID = int(v)
    case int: empID = v
    }

    var status string
    err = h.DB.QueryRow(context.Background(), `SELECT status FROM jobs WHERE id = $1 AND employer_id = $2`, jobID, empID).Scan(&status)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Job not found or not authorized"})
        return
    }
    if status != "open" {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Job is already closed or in progress"})
        return
    }

    tx, err := h.DB.Begin(context.Background())
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start tx"})
        return
    }
    defer tx.Rollback(context.Background())

    _, err = tx.Exec(context.Background(), `UPDATE jobs SET status = 'closed', hired_worker_id = $1 WHERE id = $2`, workerID, jobID)
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update job"}); return }

    _, err = tx.Exec(context.Background(), `UPDATE applications SET status = 'accepted' WHERE job_id = $1 AND worker_id = $2`, jobID, workerID)
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update selected application"}); return }
    
    _, err = tx.Exec(context.Background(), `UPDATE applications SET status = 'rejected' WHERE job_id = $1 AND worker_id != $2`, jobID, workerID)
    if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject remaining applications"}); return }

    // notify the worker
    _, _ = tx.Exec(context.Background(), `INSERT INTO notifications (user_id, type, title, message) VALUES ($1, 'status_updated', 'You were Hired!', 'Congratulations! You have been hired for a job.')`, workerID)

    if err = tx.Commit(context.Background()); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit tx"})
        return
    }

    c.JSON(http.StatusOK, gin.H{"message": "Worker hired successfully"})
}
