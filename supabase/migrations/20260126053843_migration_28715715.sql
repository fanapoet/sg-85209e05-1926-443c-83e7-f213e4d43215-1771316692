-- Add check constraint for tier values
ALTER TABLE profiles
  ADD CONSTRAINT check_tier_values 
    CHECK (tier IN ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'));