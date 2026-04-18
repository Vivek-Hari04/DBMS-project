-- Favorite workers (employer -> worker)
CREATE TABLE IF NOT EXISTS favorite_workers (
    employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    worker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (employer_id, worker_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_workers_employer ON favorite_workers(employer_id);
CREATE INDEX IF NOT EXISTS idx_favorite_workers_worker ON favorite_workers(worker_id);

-- Private jobs / offers
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_worker_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_jobs_is_private ON jobs(is_private);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_worker_id ON jobs(assigned_worker_id);

