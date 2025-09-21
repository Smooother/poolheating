-- Add unique constraint to price_data table for upsert operations
ALTER TABLE price_data ADD CONSTRAINT price_data_unique_constraint 
UNIQUE (bidding_zone, start_time, provider);