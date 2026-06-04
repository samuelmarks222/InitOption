-- Guides content management system
-- Allows admins to manage trading guides, tutorials with images and videos

CREATE TABLE IF NOT EXISTS guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Platform',
  is_published BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS guide_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  section_title TEXT,
  section_order INTEGER DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'video', 'note'
  content_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guide_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  content_id UUID REFERENCES guide_content(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL, -- 'image', 'video', 'thumbnail'
  media_url TEXT NOT NULL,
  alt_text TEXT,
  file_size INTEGER,
  mime_type TEXT,
  storage_bucket TEXT DEFAULT 'guide-media',
  storage_path TEXT,
  youtube_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_guides_category ON guides(category);
CREATE INDEX idx_guides_slug ON guides(slug);
CREATE INDEX idx_guides_published ON guides(is_published);
CREATE INDEX idx_guide_content_guide ON guide_content(guide_id);
CREATE INDEX idx_guide_media_guide ON guide_media(guide_id);
CREATE INDEX idx_guide_media_content ON guide_media(content_id);

-- Enable RLS
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_media ENABLE ROW LEVEL SECURITY;

-- Policies for guides
CREATE POLICY "Allow reading published guides"
  ON guides FOR SELECT
  USING (
    is_published = true
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager')
  );

CREATE POLICY "Allow staff to manage guides"
  ON guides FOR ALL
  USING (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'))
  WITH CHECK (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'));

-- Policies for guide content
CREATE POLICY "Allow reading published guide content"
  ON guide_content FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM guides WHERE id = guide_id AND is_published = true)
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager')
  );

CREATE POLICY "Allow staff to manage guide content"
  ON guide_content FOR ALL
  USING (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'))
  WITH CHECK (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'));

-- Policies for guide media
CREATE POLICY "Allow reading media from published guides"
  ON guide_media FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM guides WHERE id = guide_id AND is_published = true)
    OR COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager')
  );

CREATE POLICY "Allow staff to manage guide media"
  ON guide_media FOR ALL
  USING (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'))
  WITH CHECK (COALESCE((auth.jwt() -> 'user_metadata' ->> 'role'), '') IN ('admin', 'content-manager'));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_guide_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guides_timestamp BEFORE UPDATE ON guides
FOR EACH ROW EXECUTE FUNCTION update_guide_timestamp();

CREATE TRIGGER update_guide_content_timestamp BEFORE UPDATE ON guide_content
FOR EACH ROW EXECUTE FUNCTION update_guide_timestamp();

CREATE TRIGGER update_guide_media_timestamp BEFORE UPDATE ON guide_media
FOR EACH ROW EXECUTE FUNCTION update_guide_timestamp();
