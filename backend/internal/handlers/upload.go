package handlers

import (
    "fmt"
    "net/http"
    "os"
    "path/filepath"
    "time"

    "github.com/gin-gonic/gin"
)

type UploadHandler struct{}

func (h *UploadHandler) UploadFile(c *gin.Context) {
    file, err := c.FormFile("image")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
        return
    }

    // Create uploads directory if it doesn't exist
    if _, err := os.Stat("uploads"); os.IsNotExist(err) {
        os.Mkdir("uploads", 0755)
    }

    // Generate unique filename
    extension := filepath.Ext(file.Filename)
    filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), extension)
    savePath := filepath.Join("uploads", filename)

    if err := c.SaveUploadedFile(file, savePath); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
        return
    }

    // Return the URL (assuming server is on same host/port)
    // In production, this would be a full URL
    url := fmt.Sprintf("/uploads/%s", filename)
    c.JSON(http.StatusOK, gin.H{
        "message": "File uploaded successfully",
        "url":     url,
    })
}
