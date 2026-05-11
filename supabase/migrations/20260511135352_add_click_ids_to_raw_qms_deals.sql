-- Add Google Ads click ID and extended UTM fields to raw_qms_deals
ALTER TABLE analytics.raw_qms_deals
  ADD COLUMN IF NOT EXISTS gclid TEXT,
  ADD COLUMN IF NOT EXISTS gbraid TEXT,
  ADD COLUMN IF NOT EXISTS wbraid TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT;

CREATE INDEX IF NOT EXISTS idx_qms_deals_gclid ON analytics.raw_qms_deals (gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qms_deals_gbraid ON analytics.raw_qms_deals (gbraid) WHERE gbraid IS NOT NULL;

COMMENT ON COLUMN analytics.raw_qms_deals.gclid IS 'Google Ads click ID — auto-tagged by Google when auto-tagging is on';
COMMENT ON COLUMN analytics.raw_qms_deals.gbraid IS 'Google Ads iOS attribution click ID';
COMMENT ON COLUMN analytics.raw_qms_deals.wbraid IS 'Google Ads web-to-app attribution click ID';
COMMENT ON COLUMN analytics.raw_qms_deals.utm_content IS 'utm_content from tracking template — carries {adgroupid}';
COMMENT ON COLUMN analytics.raw_qms_deals.utm_term IS 'utm_term from tracking template — carries {keyword}';
