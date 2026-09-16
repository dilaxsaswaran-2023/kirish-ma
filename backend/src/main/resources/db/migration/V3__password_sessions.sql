ALTER TABLE users ADD COLUMN email VARCHAR(180);
ALTER TABLE users ADD COLUMN password_hash VARCHAR(100);
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE TABLE auth_sessions (
  token_hash VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id),
  corporation_id VARCHAR(64) NOT NULL REFERENCES corporations(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id, expires_at);
