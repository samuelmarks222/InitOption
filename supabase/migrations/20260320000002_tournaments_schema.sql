-- Create ENUM for tournament status (safe check before creating)
DO $$ BEGIN
  CREATE TYPE tournament_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    entry_fee NUMERIC NOT NULL DEFAULT 0,
    prize_pool NUMERIC NOT NULL DEFAULT 0,
    starting_balance NUMERIC NOT NULL DEFAULT 100.00,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status tournament_status DEFAULT 'upcoming'::tournament_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Ensure RLS is enabled and appropriate policies are set if necessary.
-- For now, allow all read and admin-write, but to keep it simple we disable RLS if standard platform handles auth elsewhere,
-- or we can open read access to everyone:
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to tournaments" 
ON public.tournaments FOR SELECT 
USING (true);

CREATE POLICY "Allow authenticated full access to tournaments" 
ON public.tournaments FOR ALL 
USING (auth.role() = 'authenticated');


-- Create tournament_participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_balance NUMERIC NOT NULL DEFAULT 0.00, -- will be initialized to tournament's starting_balance
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to participants" 
ON public.tournament_participants FOR SELECT 
USING (true);

CREATE POLICY "Allow users to update own participation" 
ON public.tournament_participants FOR ALL 
USING (auth.uid() = user_id);

-- Optional: Create trigger to initialize current_balance automatically based on the tournament starting balance
CREATE OR REPLACE FUNCTION set_initial_tournament_balance()
RETURNS TRIGGER AS $$
BEGIN
  SELECT starting_balance INTO NEW.current_balance FROM public.tournaments WHERE id = NEW.tournament_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_tournament_balance
BEFORE INSERT ON public.tournament_participants
FOR EACH ROW
EXECUTE FUNCTION set_initial_tournament_balance();
