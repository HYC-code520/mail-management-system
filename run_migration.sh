#!/bin/bash
# Run this migration in your Supabase SQL Editor
# Or execute it using: psql <your-connection-string> < this-file

echo "==================================================================="
echo "  Migration: Allow Editing Default Templates"
echo "==================================================================="
echo ""
echo "Copy and paste the following SQL into your Supabase SQL Editor:"
echo ""
echo "-------------------------------------------------------------------"
cat << 'EOF'

-- Allow editing default templates while preventing deletion
-- Drop the old policy
DROP POLICY IF EXISTS "Users can manage their templates." ON message_templates;

-- Create separate policies for different operations
-- SELECT: Users can see their own templates + all default templates
CREATE POLICY "Users can view templates." ON message_templates
    FOR SELECT USING (auth.uid() = user_id OR is_default = TRUE);

-- INSERT: Users can create their own templates
CREATE POLICY "Users can create templates." ON message_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own templates + default templates
CREATE POLICY "Users can update templates." ON message_templates
    FOR UPDATE USING (auth.uid() = user_id OR is_default = TRUE)
    WITH CHECK (auth.uid() = user_id OR is_default = TRUE);

-- DELETE: Users can only delete their own non-default templates
CREATE POLICY "Users can delete own templates." ON message_templates
    FOR DELETE USING (auth.uid() = user_id AND is_default = FALSE);

EOF
echo "-------------------------------------------------------------------"
echo ""
echo "Steps:"
echo "1. Go to your Supabase project: https://supabase.com/dashboard"
echo "2. Click 'SQL Editor' in the left sidebar"
echo "3. Copy the SQL above and paste it"
echo "4. Click 'Run' button"
echo ""
echo "After running, restart your backend server:"
echo "  cd backend && npm start"
echo ""










