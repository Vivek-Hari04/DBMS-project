package main

import (
    "context"
    "log"
    "os"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gin-contrib/cors"
    "github.com/joho/godotenv"
    "github.com/jackc/pgx/v5/pgxpool" // Needed for cleanup
    "github.com/Sabari-Vijayan/DBMS-project/internal/db"
    "github.com/Sabari-Vijayan/DBMS-project/internal/handlers"
    "github.com/Sabari-Vijayan/DBMS-project/internal/middleware"
)

func main() {
    // Load environment variables
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }

    // Initialize database
    database, err := db.Connect()
    if err != nil {
        log.Fatal("Failed to connect to database:", err)
    }
    defer database.Close()

    // Start background cleanup task
    go func(db *pgxpool.Pool) {
        ticker := time.NewTicker(24 * time.Hour)
        for {
            <-ticker.C
            _, err := db.Exec(context.Background(), `DELETE FROM users WHERE deleted_at < NOW() - INTERVAL '30 days'`)
            if err != nil {
                log.Println("Error running cleanup task:", err)
            } else {
                log.Println("Successfully ran daily cleanup task for deleted accounts")
            }
        }
    }(database)

    // Create handlers
    authHandler := &handlers.AuthHandler{DB: database}
    profileHandler := &handlers.ProfileHandler{DB: database}
    jobHandler := &handlers.JobHandler{DB: database}
    applicationHandler := &handlers.ApplicationHandler{DB: database}
    notificationHandler := &handlers.NotificationHandler{DB: database}

    // Create Gin router
    router := gin.Default()

    // CORS middleware
    router.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"http://localhost:5173"},
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
    }))

    // Health check
    router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })

    // Public routes (no authentication required)
    router.POST("/api/register", authHandler.Register)
    router.POST("/api/login", authHandler.Login)
    router.POST("/api/recover-account", authHandler.RecoverAccount) // Add this
    router.GET("/api/jobs", jobHandler.GetJobs)              // Anyone can view jobs
    router.GET("/api/jobs/:id", jobHandler.GetJob)           // Anyone can view job details

    // Protected routes (authentication required)
    protected := router.Group("/api")
    protected.Use(middleware.AuthRequired())
    {
        // Profile routes
        protected.GET("/profile/:id", profileHandler.GetProfile)
        protected.PUT("/profile/:id", profileHandler.UpdateProfile)
        protected.POST("/profile/:id/delete", profileHandler.DeleteAccount) // Add this

        // Job routes (employers only)
        protected.POST("/jobs", middleware.EmployerOnly(), jobHandler.CreateJob)

        // Application routes (workers only)
        protected.POST("/applications", middleware.WorkerOnly(), applicationHandler.ApplyToJob)
        protected.GET("/applications/worker/:workerId", middleware.WorkerOnly(), applicationHandler.GetWorkerApplications)

        // Application routes (employers only)
        protected.GET("/applications/job/:jobId", middleware.EmployerOnly(), applicationHandler.GetJobApplications)
        protected.PUT("/applications/:id", middleware.EmployerOnly(), applicationHandler.UpdateApplicationStatus)

        // Notification routes
        protected.GET("/notifications", notificationHandler.GetUserNotifications)
        protected.PUT("/notifications/:id/read", notificationHandler.MarkAsRead)
        protected.PUT("/notifications/read-all", notificationHandler.MarkAllAsRead)
        protected.DELETE("/notifications/:id", notificationHandler.DeleteNotification)
    }

    // Get port from environment or default to 8080
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Server starting on port %s", port)
    router.Run(":" + port)
}
