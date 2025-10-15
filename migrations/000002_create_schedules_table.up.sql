CREATE TABLE schedules (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    file_id TEXT NOT NULL,
    share_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX idx_schedules_user_id ON schedules(user_id);
CREATE INDEX idx_schedules_file_id ON schedules(file_id);
CREATE INDEX idx_schedules_is_public ON schedules(is_public);
CREATE INDEX idx_schedules_deleted_at ON schedules(deleted_at);
