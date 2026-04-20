-- Shops table
CREATE TABLE shops (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shop images table
CREATE TABLE shop_images (
    id SERIAL PRIMARY KEY,
    shop_id INTEGER REFERENCES shops(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add shop_id and job_type to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS shop_id INTEGER REFERENCES shops(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(20) DEFAULT 'temporary' CHECK (job_type IN ('temporary', 'permanent'));

CREATE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_shop_images_shop ON shop_images(shop_id);
CREATE INDEX idx_jobs_shop ON jobs(shop_id);
