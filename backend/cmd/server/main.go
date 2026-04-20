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
    ratingHandler := &handlers.RatingHandler{DB: database}
    workersHandler := &handlers.WorkersHandler{DB: database}
    favoritesHandler := &handlers.FavoritesHandler{DB: database}
    shopHandler := &handlers.ShopHandler{DB: database}
    uploadHandler := &handlers.UploadHandler{}

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

    // Serve static files from uploads directory
    router.Static("/uploads", "./uploads")

    // Health check
    router.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "ok"})
    })

    // Public routes (no authentication required)
    router.POST("/api/register", authHandler.Register)
    router.POST("/api/login", authHandler.Login)
    router.POST("/api/recover-account", authHandler.RecoverAccount) // Add this
    router.GET("/api/jobs", jobHandler.GetJobs)              // Anyone can view jobs
    router.GET("/api/jobs/search", jobHandler.SearchJobs)    // Anyone can search jobs
    router.GET("/api/jobs/:id", jobHandler.GetJob)           // Anyone can view job details
    router.GET("/api/categories", jobHandler.GetCategories)  // Anyone can view categories
    router.GET("/api/shops/:id", shopHandler.GetShop)        // Public shop profile
    router.GET("/api/shops/:id/images", shopHandler.GetShopImages) // Public shop images
    router.GET("/api/shops/:id/jobs", shopHandler.GetShopJobs)     // Public shop jobs

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
        protected.GET("/jobs/my", middleware.EmployerOnly(), jobHandler.GetMyJobs)
        protected.DELETE("/jobs/:id", middleware.EmployerOnly(), jobHandler.DeleteJob)
        protected.PUT("/jobs/:id/hire/:workerId", middleware.EmployerOnly(), jobHandler.HireWorker)

        // Private offers
        protected.POST("/jobs/offers", middleware.EmployerOnly(), jobHandler.CreatePrivateOffer)
        protected.GET("/jobs/offers", middleware.WorkerOnly(), jobHandler.GetMyOffers)
        protected.PUT("/jobs/:id/offer-response", middleware.WorkerOnly(), jobHandler.RespondToOffer)

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
        protected.DELETE("/notifications/clear-all", notificationHandler.ClearAllNotifications)
        protected.DELETE("/notifications/:id", notificationHandler.DeleteNotification)

        // Rating routes
        protected.POST("/ratings", ratingHandler.CreateRating)
        protected.GET("/ratings/user/:id", ratingHandler.GetUserRatings)

        // Workers browsing
        protected.GET("/workers", workersHandler.ListWorkers)
        
        // Help Requests (Worker Only)
        hr := protected.Group("/workers/help-requests", middleware.WorkerOnly())
        {
            hr.POST("", workersHandler.SendHelpRequest)
            hr.GET("/received", workersHandler.GetReceivedHelpRequests)
            hr.GET("/sent", workersHandler.GetSentHelpRequests)
            hr.PUT("/:id/respond", workersHandler.RespondHelpRequest)
            hr.DELETE("/:id", workersHandler.DeleteHelpRequest)
        }

        // Favorite workers (employers only)
        protected.GET("/favorites/workers", middleware.EmployerOnly(), favoritesHandler.ListFavoriteWorkers)
        protected.POST("/favorites/workers/:workerId", middleware.EmployerOnly(), favoritesHandler.AddFavoriteWorker)
        protected.DELETE("/favorites/workers/:workerId", middleware.EmployerOnly(), favoritesHandler.RemoveFavoriteWorker)

        // Shop routes (shopkeeper only for mutations)
        protected.POST("/shops", middleware.ShopkeeperOnly(), shopHandler.CreateShop)
        protected.GET("/shops/my", middleware.ShopkeeperOnly(), shopHandler.GetMyShops)
        protected.PUT("/shops/:id", middleware.ShopkeeperOnly(), shopHandler.UpdateShop)
        protected.POST("/shops/:id/images", middleware.ShopkeeperOnly(), shopHandler.AddShopImage)

        // Upload route
        protected.POST("/upload", uploadHandler.UploadFile)
    }

    // Get port from environment or default to 8080
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Server starting on port %s", port)
    router.Run(":" + port)
}
