-- Atomic daily copilot quota reservation (UTC day boundary).
-- Run in Supabase SQL editor or via `supabase db push`.

CREATE OR REPLACE FUNCTION public.reserve_copilot_slot(p_user_id uuid, p_limit int)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_row_id bigint;
BEGIN
  SELECT count(*)::int
  INTO v_count
  FROM user_usage
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', (now() AT TIME ZONE 'utc'));

  IF v_count >= p_limit THEN
    RETURN NULL;
  END IF;

  INSERT INTO user_usage (user_id)
  VALUES (p_user_id)
  RETURNING id INTO v_row_id;

  RETURN v_row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_copilot_slot(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_copilot_slot(uuid, int) TO service_role;
