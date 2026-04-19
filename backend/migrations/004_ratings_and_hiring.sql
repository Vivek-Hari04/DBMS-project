-- Alter jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hired_worker_id INTEGER REFERENCES users(id);

-- Optional: ensure unique applications if not there
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'applications_job_id_worker_id_key'
    ) THEN
        ALTER TABLE applications ADD CONSTRAINT applications_job_id_worker_id_key UNIQUE(job_id, worker_id);
    END IF;
END $$;

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    reviewee_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, reviewer_id)
);
