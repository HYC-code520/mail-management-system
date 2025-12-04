-- Create todos table for task management
-- Mimics Apple Notes checklist functionality

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS todos (
  todo_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Task details
  title TEXT NOT NULL,
  notes TEXT, -- Optional detailed notes
  is_completed BOOLEAN DEFAULT FALSE,
  
  -- Organization
  date_header DATE, -- Optional date grouping (like "8-20-25")
  priority INTEGER DEFAULT 0, -- 0 = normal, 1 = important, 2 = priority
  category TEXT, -- e.g., "Social Media", "Mail", "Consignments"
  
  -- Collaboration tracking (like Apple Notes)
  created_by_name TEXT, -- Name of person who created this
  created_by_email TEXT, -- Email of person who created this
  last_edited_by_name TEXT, -- Name of last person to edit
  last_edited_by_email TEXT, -- Email of last person to edit
  
  -- Ordering
  sort_order INTEGER DEFAULT 0, -- For custom ordering within a date
  
  -- Timestamps
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_date_header ON todos(date_header);
CREATE INDEX idx_todos_completed ON todos(is_completed);
CREATE INDEX idx_todos_deleted ON todos(deleted_at);

-- Create updated_at trigger
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own todos
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

-- Add helpful comment
COMMENT ON TABLE todos IS 'Task management system mimicking Apple Notes checklist functionality';

