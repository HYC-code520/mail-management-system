-- Complete clean installation for todos table
-- Run this to completely reset the todos feature

-- 1. Drop everything first (cleanup)
DROP TABLE IF EXISTS todos CASCADE;
DROP INDEX IF EXISTS idx_todos_user_id;
DROP INDEX IF EXISTS idx_todos_date_header;
DROP INDEX IF EXISTS idx_todos_completed;
DROP INDEX IF EXISTS idx_todos_deleted;

-- 2. Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Create todos table with collaboration tracking
CREATE TABLE todos (
  todo_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task details
  title TEXT NOT NULL,
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  
  -- Organization
  date_header DATE,
  priority INTEGER DEFAULT 0,
  category TEXT,
  
  -- Collaboration tracking (like Apple Notes)
  created_by_name TEXT,
  created_by_email TEXT,
  last_edited_by_name TEXT,
  last_edited_by_email TEXT,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- 4. Create indexes
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_date_header ON todos(date_header);
CREATE INDEX idx_todos_completed ON todos(is_completed);
CREATE INDEX idx_todos_deleted ON todos(deleted_at);

-- 5. Create trigger
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable RLS
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can view their own todos"
  ON todos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own todos"
  ON todos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own todos"
  ON todos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own todos"
  ON todos FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Add comment
COMMENT ON TABLE todos IS 'Task management system mimicking Apple Notes checklist functionality';

