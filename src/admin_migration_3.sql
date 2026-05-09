-- Migration 3: Branding & Storage

-- 1. Add Logo and Favicon tracking to global platform settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '';

-- 2. Establish public Storage Bucket for branding assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies
CREATE POLICY "Allow public read on branding" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'branding');

CREATE POLICY "Allow authenticated uploads on branding" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'branding' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated updates on branding" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'branding' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated deletes on branding" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'branding' AND auth.role() = 'authenticated');
