-- Run with the project owner's Meoo database command. Existing Sites D1 data is
-- left intact; this creates a separate, persistent competition demonstration.
BEGIN;
CREATE SCHEMA IF NOT EXISTS route_rescue;
REVOKE ALL ON SCHEMA route_rescue FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA route_rescue TO service_role;

CREATE TABLE IF NOT EXISTS route_rescue.audit (
  id text PRIMARY KEY, actor text NOT NULL, action text NOT NULL, created bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS route_rescue.facilities (
  id text PRIMARY KEY, station text NOT NULL, name text NOT NULL,
  status text NOT NULL, updated bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS route_rescue.login_limits (
  key text PRIMARY KEY, count integer NOT NULL, until bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS route_rescue.sessions (
  token text PRIMARY KEY, account text NOT NULL, expires bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS route_rescue.tasks (
  id text PRIMARY KEY, passenger text NOT NULL, location text NOT NULL,
  needs text NOT NULL, note text NOT NULL, plan text NOT NULL,
  origin text NOT NULL, target text NOT NULL, status text NOT NULL,
  assigned text, receiver text, escalated integer NOT NULL DEFAULT 0,
  archived integer NOT NULL DEFAULT 0, version integer NOT NULL DEFAULT 1,
  last_event text NOT NULL, created bigint NOT NULL, updated bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS route_rescue.events (
  id text PRIMARY KEY, task text NOT NULL REFERENCES route_rescue.tasks(id),
  actor text NOT NULL, label text NOT NULL, created bigint NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS route_rescue_one_active_task_per_passenger
ON route_rescue.tasks(passenger)
WHERE archived=0 AND status NOT IN ('completed','cancelled');

ALTER TABLE route_rescue.audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_rescue.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_rescue.login_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_rescue.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_rescue.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_rescue.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA route_rescue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA route_rescue TO service_role;

-- SECURITY INVOKER: this does not elevate the caller's database privileges.
-- The private service role is provisioned to the HTTP server, never the browser.
CREATE OR REPLACE FUNCTION public.route_rescue_execute(statements jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, route_rescue, public
AS $function$
DECLARE
  statement jsonb;
  arguments jsonb;
  pieces text[];
  query text;
  rows jsonb;
  result jsonb := '[]'::jsonb;
  affected bigint;
  i integer;
BEGIN
  IF jsonb_typeof(statements) IS DISTINCT FROM 'array'
     OR jsonb_array_length(statements) NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'Invalid statement batch';
  END IF;
  FOR statement IN SELECT value FROM jsonb_array_elements(statements) LOOP
    query := statement->>'sql';
    arguments := statement->'args';
    IF query IS NULL OR length(query)>10000
       OR query !~ '^(SELECT|INSERT|UPDATE|DELETE) '
       OR query ~ ';|--|/\*'
       OR jsonb_typeof(arguments) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Invalid statement';
    END IF;
    pieces := string_to_array(query, '?');
    IF cardinality(pieces) <> jsonb_array_length(arguments)+1 THEN
      RAISE EXCEPTION 'Invalid argument count';
    END IF;
    query := pieces[1];
    FOR i IN 1..jsonb_array_length(arguments) LOOP
      IF jsonb_typeof(arguments->(i-1)) NOT IN ('string','number','null') THEN
        RAISE EXCEPTION 'Invalid argument';
      END IF;
      -- Each argument is quoted independently. Quotes and question marks in
      -- user notes remain data, including in multi-statement transactions.
      query := query || quote_nullable(arguments->(i-1)#>>'{}') || pieces[i+1];
    END LOOP;
    rows := '[]'::jsonb;
    affected := 0;
    IF query ~ '^SELECT ' THEN
      EXECUTE 'SELECT coalesce(jsonb_agg(to_jsonb(r)), ''[]''::jsonb) FROM (' || query || ') r'
        INTO rows;
    ELSE
      EXECUTE query;
      GET DIAGNOSTICS affected = ROW_COUNT;
    END IF;
    result := result || jsonb_build_array(jsonb_build_object(
      'success', true, 'results', rows, 'meta', jsonb_build_object('changes', affected)
    ));
  END LOOP;
  RETURN result;
END;
$function$;
REVOKE ALL ON FUNCTION public.route_rescue_execute(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.route_rescue_execute(jsonb) TO service_role;
COMMIT;
