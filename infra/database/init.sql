-- Port Surveillance Database Initialization
-- Creates tables and seed data for demo mode

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (already created via SQLAlchemy, but adding sample admin)
INSERT INTO users (username, email, hashed_password, is_active, is_admin)
VALUES ('admin', 'admin@portvision.local', '$2b$12$KIXn3j5Qp1Nqr3VW5VmxGOdR4dL.0YH5J9x5R8V5YH5J9x5R8V5Y', true, true)
ON CONFLICT (username) DO NOTHING;

-- Seed cameras for demo
INSERT INTO cameras (camera_id, name, location, enabled, fps_target, is_demo, status, confidence_threshold, min_object_size, roi_x, roi_y, roi_width, roi_height)
VALUES
    ('CAM-PORT-01', 'Port Entrance North', 'North Entrance', true, 10, true, 'online', 0.5, 50, 0, 0, 1920, 1080),
    ('CAM-PORT-02', 'Port Entrance East', 'East Pier', true, 10, true, 'online', 0.5, 50, 0, 0, 1920, 1080),
    ('CAM-PORT-03', 'Harbor West', 'West Harbor', true, 10, true, 'offline', 0.5, 50, 0, 0, 1920, 1080)
ON CONFLICT (camera_id) DO NOTHING;

-- Seed rules
INSERT INTO rules (rule_id, name, camera_id, event_type, object_classes, confidence_threshold, enabled, cooldown_seconds, severity, take_snapshot, webhook_enabled, digifort_enabled)
VALUES
    ('RULE-001', 'Detect Ships Entering Port', NULL, 'object_detected', '["ship", "boat"]', 0.6, true, 60, 'high', true, false, true),
    ('RULE-002', 'Zone Entry Alert', NULL, 'zone_entry', '["ship", "boat", "unknown"]', 0.5, true, 30, 'medium', true, false, true),
    ('RULE-003', 'Line Crossing Detection', NULL, 'line_crossing', '["ship", "boat"]', 0.5, true, 60, 'medium', true, false, false)
ON CONFLICT (rule_id) DO NOTHING;

-- Seed zones
INSERT INTO zones (zone_id, name, camera_id, polygon_points, enabled)
VALUES
    ('ZONE-001', 'Port Entrance Zone', 1, '[[100, 200], [500, 200], [500, 600], [100, 600]]', true),
    ('ZONE-002', ' Pier Safe Zone', 2, '[[200, 300], [400, 300], [400, 500], [200, 500]]', true)
ON CONFLICT (zone_id) DO NOTHING;

-- Seed virtual lines
INSERT INTO virtual_lines (line_id, name, camera_id, start_point, end_point, direction, enabled)
VALUES
    ('LINE-001', 'Port Entry Line', 1, '[0, 400]', '[1920, 400]', 'both', true),
    ('LINE-002', 'Pier Boundary', 2, '[960, 0]', '[960, 1080]', 'both', true)
ON CONFLICT (line_id) DO NOTHING;