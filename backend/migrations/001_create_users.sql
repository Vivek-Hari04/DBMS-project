CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  user_type VARCHAR(20) CHECK (user_type IN('handyman','customer','shopkeeper')) NOT NULL,
  phone VARCHAR(20),
  location VARCHAR(255),
  bio TEXT,
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);
ALTER TABLE users ADD COLUMN specification VARCHAR(255) DEFAULT 'worker';
CREATE INDEX idx_users_email ON users(email);
