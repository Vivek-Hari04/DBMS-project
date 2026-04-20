package handlers

import (
    "context"
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/jackc/pgx/v5/pgxpool"
)

type ShopHandler struct {
    DB *pgxpool.Pool
}

type Shop struct {
    ID          int       `json:"id"`
    OwnerID     int       `json:"owner_id"`
    Name        string    `json:"name"`
    Category    string    `json:"category"`
    Description string    `json:"description"`
    Location    string    `json:"location"`
    CreatedAt   time.Time `json:"created_at"`
}

type ShopImage struct {
    ID        int       `json:"id"`
    ShopID    int       `json:"shop_id"`
    ImageURL  string    `json:"image_url"`
    CreatedAt time.Time `json:"created_at"`
}

// POST /api/shops — create a new shop (shopkeeper only)
func (h *ShopHandler) CreateShop(c *gin.Context) {
    userID := c.GetInt("user_id")

    var req struct {
        Name        string `json:"name" binding:"required"`
        Category    string `json:"category"`
        Description string `json:"description"`
        Location    string `json:"location"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    var shop Shop
    err := h.DB.QueryRow(context.Background(),
        `INSERT INTO shops (owner_id, name, category, description, location)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, owner_id, name, COALESCE(category, ''), COALESCE(description, ''), COALESCE(location, ''), created_at`,
        userID, req.Name, req.Category, req.Description, req.Location,
    ).Scan(&shop.ID, &shop.OwnerID, &shop.Name, &shop.Category, &shop.Description, &shop.Location, &shop.CreatedAt)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shop", "details": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, gin.H{"shop": shop})
}

// GET /api/shops/my — all shops owned by current user
func (h *ShopHandler) GetMyShops(c *gin.Context) {
    userID := c.GetInt("user_id")

    rows, err := h.DB.Query(context.Background(),
        `SELECT id, owner_id, name, COALESCE(category, ''), COALESCE(description, ''), COALESCE(location, ''), created_at
         FROM shops WHERE owner_id = $1 ORDER BY created_at DESC`,
        userID,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shops"})
        return
    }
    defer rows.Close()

    shops := []Shop{}
    for rows.Next() {
        var s Shop
        if err := rows.Scan(&s.ID, &s.OwnerID, &s.Name, &s.Category, &s.Description, &s.Location, &s.CreatedAt); err != nil {
            continue
        }
        shops = append(shops, s)
    }
    c.JSON(http.StatusOK, gin.H{"shops": shops})
}

// GET /api/shops/:id — public shop profile
func (h *ShopHandler) GetShop(c *gin.Context) {
    shopID := c.Param("id")

    var shop Shop
    err := h.DB.QueryRow(context.Background(),
        `SELECT id, owner_id, name, COALESCE(category, ''), COALESCE(description, ''), COALESCE(location, ''), created_at FROM shops WHERE id = $1`,
        shopID,
    ).Scan(&shop.ID, &shop.OwnerID, &shop.Name, &shop.Category, &shop.Description, &shop.Location, &shop.CreatedAt)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Shop not found"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"shop": shop})
}

// PUT /api/shops/:id — update shop (owner only)
func (h *ShopHandler) UpdateShop(c *gin.Context) {
    shopID := c.Param("id")
    userID := c.GetInt("user_id")

    // Verify ownership
    var ownerID int
    if err := h.DB.QueryRow(context.Background(),
        `SELECT owner_id FROM shops WHERE id = $1`, shopID,
    ).Scan(&ownerID); err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Shop not found"})
        return
    }
    if ownerID != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this shop"})
        return
    }

    var req struct {
        Name        string `json:"name"`
        Category    string `json:"category"`
        Description string `json:"description"`
        Location    string `json:"location"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    var shop Shop
    err := h.DB.QueryRow(context.Background(),
        `UPDATE shops SET name=$1, category=$2, description=$3, location=$4
         WHERE id=$5
         RETURNING id, owner_id, name, COALESCE(category, ''), COALESCE(description, ''), COALESCE(location, ''), created_at`,
        req.Name, req.Category, req.Description, req.Location, shopID,
    ).Scan(&shop.ID, &shop.OwnerID, &shop.Name, &shop.Category, &shop.Description, &shop.Location, &shop.CreatedAt)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update shop"})
        return
    }
    c.JSON(http.StatusOK, gin.H{"shop": shop})
}

// POST /api/shops/:id/images — add image to shop (owner only)
func (h *ShopHandler) AddShopImage(c *gin.Context) {
    shopID := c.Param("id")
    userID := c.GetInt("user_id")

    // Verify ownership
    var ownerID int
    if err := h.DB.QueryRow(context.Background(),
        `SELECT owner_id FROM shops WHERE id = $1`, shopID,
    ).Scan(&ownerID); err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Shop not found"})
        return
    }
    if ownerID != userID {
        c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this shop"})
        return
    }

    var req struct {
        ImageURL string `json:"image_url" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    var img ShopImage
    err := h.DB.QueryRow(context.Background(),
        `INSERT INTO shop_images (shop_id, image_url) VALUES ($1, $2)
         RETURNING id, shop_id, image_url, created_at`,
        shopID, req.ImageURL,
    ).Scan(&img.ID, &img.ShopID, &img.ImageURL, &img.CreatedAt)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add image"})
        return
    }
    c.JSON(http.StatusCreated, gin.H{"image": img})
}

// GET /api/shops/:id/images
func (h *ShopHandler) GetShopImages(c *gin.Context) {
    shopID := c.Param("id")

    rows, err := h.DB.Query(context.Background(),
        `SELECT id, shop_id, image_url, created_at FROM shop_images WHERE shop_id = $1 ORDER BY created_at DESC`,
        shopID,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch images"})
        return
    }
    defer rows.Close()

    images := []ShopImage{}
    for rows.Next() {
        var img ShopImage
        if err := rows.Scan(&img.ID, &img.ShopID, &img.ImageURL, &img.CreatedAt); err != nil {
            continue
        }
        images = append(images, img)
    }
    c.JSON(http.StatusOK, gin.H{"images": images})
}

// GET /api/shops/:id/jobs — jobs posted by a shop (public)
func (h *ShopHandler) GetShopJobs(c *gin.Context) {
    shopID := c.Param("id")

    rows, err := h.DB.Query(context.Background(),
        `SELECT j.id, j.title, j.description, j.location, j.job_type, j.status, j.expires_at, j.created_at,
                COALESCE(s.name, '') as shop_name
         FROM jobs j
         LEFT JOIN shops s ON j.shop_id = s.id
         WHERE j.shop_id = $1
         ORDER BY j.created_at DESC`,
        shopID,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shop jobs"})
        return
    }
    defer rows.Close()

    type ShopJob struct {
        ID          int       `json:"id"`
        Title       string    `json:"title"`
        Description string    `json:"description"`
        Location    string    `json:"location"`
        JobType     string    `json:"job_type"`
        Status      string    `json:"status"`
        ExpiresAt   time.Time `json:"expires_at"`
        CreatedAt   time.Time `json:"created_at"`
        ShopName    string    `json:"shop_name"`
    }

    jobs := []ShopJob{}
    for rows.Next() {
        var j ShopJob
        if err := rows.Scan(&j.ID, &j.Title, &j.Description, &j.Location, &j.JobType, &j.Status, &j.ExpiresAt, &j.CreatedAt, &j.ShopName); err != nil {
            continue
        }
        jobs = append(jobs, j)
    }
    c.JSON(http.StatusOK, gin.H{"jobs": jobs})
}
