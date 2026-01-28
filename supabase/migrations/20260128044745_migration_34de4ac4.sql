-- Create hardware_devices table
CREATE TABLE hardware_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  unique_device_id TEXT UNIQUE NOT NULL,
  qr_hash TEXT NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_connection TIMESTAMP WITH TIME ZONE,
  total_sessions INTEGER DEFAULT 0,
  total_xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for hardware_devices
ALTER TABLE hardware_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices" 
  ON hardware_devices FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can claim devices" 
  ON hardware_devices FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create hardware_sessions table
CREATE TABLE hardware_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES hardware_devices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL, -- 'connection', 'charge', 'discharge'
  xp_earned INTEGER NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for hardware_sessions
ALTER TABLE hardware_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" 
  ON hardware_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create sessions" 
  ON hardware_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);