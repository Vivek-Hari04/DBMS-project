package models

import "time"

type User struct {
    ID           int       `json:"id" db:"id"`
    Email        string    `json:"email" db:"email"`
    PasswordHash string    `json:"-" db:"password_hash"` // "-" means don't show in JSON
    FullName     string    `json:"full_name" db:"full_name"`
    UserType     string    `json:"user_type" db:"user_type"`
    Phone        string    `json:"phone" db:"phone"`
    Location     string    `json:"location" db:"location"`
    Bio          string    `json:"bio" db:"bio"`
    AvatarURL    string    `json:"avatar_url" db:"avatar_url"`
    CreatedAt    time.Time  `json:"created_at" db:"created_at"`
    DeletedAt    *time.Time `json:"deleted_at" db:"deleted_at"`
}
