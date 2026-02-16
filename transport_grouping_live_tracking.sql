-- Transport grouping + routing + live tracking (MVP)
-- Run this file in Supabase SQL editor after base tables are created.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1) Extend bookings with lifecycle fields and assignment guardrails
-- -----------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'booking_created'
    CHECK (lifecycle_status IN ('booking_created', 'grouped', 'trip_pending', 'trip_started', 'trip_completed')),
  ADD COLUMN IF NOT EXISTS assigned_trip_id UUID,
  ADD COLUMN IF NOT EXISTS grouped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS grouped_key TEXT,
  ADD COLUMN IF NOT EXISTS lock_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS bookings_lifecycle_status_idx ON public.bookings(lifecycle_status);
CREATE INDEX IF NOT EXISTS bookings_grouped_key_idx ON public.bookings(grouped_key);
CREATE INDEX IF NOT EXISTS bookings_assigned_trip_idx ON public.bookings(assigned_trip_id);

-- -----------------------------------------------------------------------------
-- 2) Transport trips and membership (grouped multi-student trips)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('PICKUP', 'DROPOFF')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'trip_pending'
    CHECK (status IN ('trip_pending', 'trip_started', 'trip_completed')),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL,
  capacity INTEGER,
  members_count INTEGER NOT NULL DEFAULT 0,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMPTZ,
  school_location JSONB,
  route_polyline JSONB,
  total_distance_m INTEGER,
  total_duration_s INTEGER,
  eta_by_member JSONB,
  live_location JSONB,
  live_location_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT transport_trips_time_range CHECK (end_time > start_time)
);

CREATE UNIQUE INDEX IF NOT EXISTS transport_trips_slot_unique_idx
  ON public.transport_trips(school_id, type, start_time, end_time)
  WHERE status = 'trip_pending' AND is_locked = false;

CREATE INDEX IF NOT EXISTS transport_trips_driver_idx ON public.transport_trips(driver_id, status);
CREATE INDEX IF NOT EXISTS transport_trips_slot_idx ON public.transport_trips(school_id, start_time, end_time, type);

CREATE TABLE IF NOT EXISTS public.transport_trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.transport_trips(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  pickup_order INTEGER,
  distance_to_school_m INTEGER,
  eta_to_school_s INTEGER,
  no_show BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (trip_id, student_id)
);

CREATE INDEX IF NOT EXISTS transport_trip_members_trip_idx
  ON public.transport_trip_members(trip_id, pickup_order);

CREATE INDEX IF NOT EXISTS transport_trip_members_student_idx
  ON public.transport_trip_members(student_id);

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_assigned_trip_id_fkey;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_assigned_trip_id_fkey
  FOREIGN KEY (assigned_trip_id)
  REFERENCES public.transport_trips(id)
  ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- 3) Live location and trip event stream
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transport_trip_locations (
  id BIGSERIAL PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.transport_trips(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  location JSONB NOT NULL,
  speed_mps DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS transport_trip_locations_trip_time_idx
  ON public.transport_trip_locations(trip_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.transport_trip_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.transport_trips(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'driver', 'student')),
  actor_id UUID,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS transport_trip_events_trip_idx
  ON public.transport_trip_events(trip_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4) Utility functions
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.haversine_km(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r DOUBLE PRECISION := 6371;
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN r * c;
END;
$$;

CREATE OR REPLACE FUNCTION public.find_available_driver_for_trip(
  p_trip_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_required_capacity INTEGER
)
RETURNS TABLE(driver_id UUID, bus_id UUID, bus_capacity INTEGER)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, b.id, b.capacity
  FROM public.drivers d
  JOIN public.buses b ON b.driver_id = d.id
  WHERE d.status = 'APPROVED'
    AND b.capacity >= COALESCE(p_required_capacity, 1)
    AND NOT EXISTS (
      SELECT 1
      FROM public.transport_trips t
      WHERE t.driver_id = d.id
        AND t.status IN ('trip_pending', 'trip_started')
        AND tstzrange(t.start_time, t.end_time, '[)') && tstzrange(p_start_time, p_end_time, '[)')
        AND t.id <> p_trip_id
    )
  ORDER BY b.capacity ASC, d.created_at ASC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_member_order_for_trip(p_trip_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  WITH ranked AS (
    SELECT
      m.id,
      row_number() OVER (
        ORDER BY m.distance_to_school_m DESC NULLS LAST, m.created_at ASC
      ) AS rn
    FROM public.transport_trip_members m
    WHERE m.trip_id = p_trip_id
  )
  UPDATE public.transport_trip_members m
  SET pickup_order = r.rn
  FROM ranked r
  WHERE m.id = r.id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5) Core deterministic grouping function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.group_booking_into_trip(p_booking_id UUID)
RETURNS TABLE(
  booking_id UUID,
  trip_id UUID,
  booking_lifecycle_status TEXT,
  trip_status TEXT,
  assigned_driver_id UUID,
  assigned_bus_id UUID,
  members_count INTEGER,
  capacity INTEGER,
  locked BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking RECORD;
  v_trip RECORD;
  v_bus RECORD;
  v_distance_km DOUBLE PRECISION;
  v_members_count INTEGER;
  v_key TEXT;
BEGIN
  SELECT
    b.id,
    b.student_id,
    b.type,
    b.start_time,
    b.end_time,
    b.lifecycle_status,
    s.school_id,
    s.home_location,
    sc.latitude AS school_lat,
    sc.longitude AS school_lng
  INTO v_booking
  FROM public.bookings b
  JOIN public.students s ON s.id = b.student_id
  JOIN public.schools sc ON sc.id = s.school_id
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found', p_booking_id;
  END IF;

  v_key := concat_ws('|', v_booking.school_id::TEXT, v_booking.type, v_booking.start_time::TEXT, v_booking.end_time::TEXT);

  PERFORM pg_advisory_xact_lock(hashtext(v_key));

  v_distance_km := public.haversine_km(
    (v_booking.home_location ->> 'latitude')::DOUBLE PRECISION,
    (v_booking.home_location ->> 'longitude')::DOUBLE PRECISION,
    v_booking.school_lat,
    v_booking.school_lng
  );

  IF v_distance_km > 15 THEN
    UPDATE public.bookings
    SET grouped_key = v_key,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_booking.id;

    RETURN QUERY
    SELECT v_booking.id, NULL::UUID, 'booking_created'::TEXT, NULL::TEXT, NULL::UUID, NULL::UUID, 0, NULL::INTEGER, false, 'distance_exceeds_15km'::TEXT;
    RETURN;
  END IF;

  SELECT t.*
  INTO v_trip
  FROM public.transport_trips t
  WHERE t.school_id = v_booking.school_id
    AND t.type = v_booking.type
    AND t.start_time = v_booking.start_time
    AND t.end_time = v_booking.end_time
    AND t.status = 'trip_pending'
    AND t.is_locked = false
    AND t.bus_id IS NOT NULL
    AND t.capacity IS NOT NULL
    AND t.members_count < t.capacity
  ORDER BY t.created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT
      b.id,
      b.capacity,
      b.driver_id
    INTO v_bus
    FROM public.buses b
    WHERE b.status = 'AVAILABLE'
      AND b.capacity > 0
      AND NOT EXISTS (
        SELECT 1
        FROM public.transport_trips t2
        WHERE t2.bus_id = b.id
          AND t2.status IN ('trip_pending', 'trip_started')
          AND tstzrange(t2.start_time, t2.end_time, '[)') && tstzrange(v_booking.start_time, v_booking.end_time, '[)')
      )
    ORDER BY b.capacity ASC, b.created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      UPDATE public.bookings
      SET grouped_key = v_key,
          updated_at = timezone('utc'::text, now())
      WHERE id = v_booking.id;

      RETURN QUERY
      SELECT v_booking.id, NULL::UUID, 'booking_created'::TEXT, NULL::TEXT, NULL::UUID, NULL::UUID, 0, NULL::INTEGER, false, 'no_available_bus'::TEXT;
      RETURN;
    END IF;

    INSERT INTO public.transport_trips (
      school_id,
      type,
      start_time,
      end_time,
      status,
      bus_id,
      driver_id,
      capacity,
      school_location
    ) VALUES (
      v_booking.school_id,
      v_booking.type,
      v_booking.start_time,
      v_booking.end_time,
      'trip_pending',
      v_bus.id,
      v_bus.driver_id,
      v_bus.capacity,
      jsonb_build_object('latitude', v_booking.school_lat, 'longitude', v_booking.school_lng)
    )
    RETURNING * INTO v_trip;
  END IF;

  INSERT INTO public.transport_trip_members (
    trip_id,
    booking_id,
    student_id,
    distance_to_school_m
  ) VALUES (
    v_trip.id,
    v_booking.id,
    v_booking.student_id,
    round(v_distance_km * 1000)
  )
  ON CONFLICT ON CONSTRAINT transport_trip_members_booking_id_key DO NOTHING;

  SELECT count(*)::INTEGER INTO v_members_count
  FROM public.transport_trip_members m
  WHERE m.trip_id = v_trip.id;

  UPDATE public.transport_trips
  SET members_count = v_members_count,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_trip.id
  RETURNING * INTO v_trip;

  UPDATE public.bookings
  SET assigned_trip_id = v_trip.id,
      lifecycle_status = 'grouped',
      grouped_at = timezone('utc'::text, now()),
      grouped_key = v_key,
      lock_version = lock_version + 1,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_booking.id;

  PERFORM public.recompute_member_order_for_trip(v_trip.id);

  IF v_trip.capacity IS NOT NULL AND v_members_count >= v_trip.capacity THEN
    UPDATE public.transport_trips
    SET is_locked = true,
        locked_at = timezone('utc'::text, now()),
        driver_id = COALESCE(
          driver_id,
          (SELECT b.driver_id FROM public.buses b WHERE b.id = v_trip.bus_id)
        ),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_trip.id
    RETURNING * INTO v_trip;

    UPDATE public.bookings
    SET lifecycle_status = 'trip_pending',
        lock_version = lock_version + 1,
        updated_at = timezone('utc'::text, now())
    WHERE assigned_trip_id = v_trip.id;
  END IF;

  RETURN QUERY
  SELECT
    v_booking.id,
    v_trip.id,
    (SELECT lifecycle_status FROM public.bookings WHERE id = v_booking.id),
    v_trip.status,
    v_trip.driver_id,
    v_trip.bus_id,
    v_trip.members_count,
    v_trip.capacity,
    v_trip.is_locked,
    'grouped'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_and_group(
  p_student_id UUID,
  p_type TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS TABLE(
  booking_id UUID,
  trip_id UUID,
  booking_lifecycle_status TEXT,
  trip_status TEXT,
  assigned_driver_id UUID,
  assigned_bus_id UUID,
  members_count INTEGER,
  capacity INTEGER,
  locked BOOLEAN,
  reason TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_booking_id UUID;
BEGIN
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'end_time must be after start_time';
  END IF;

  INSERT INTO public.bookings (
    student_id,
    type,
    start_time,
    end_time,
    status,
    lifecycle_status
  ) VALUES (
    p_student_id,
    p_type,
    p_start_time,
    p_end_time,
    'PENDING',
    'booking_created'
  )
  RETURNING id INTO v_booking_id;

  RETURN QUERY
  SELECT * FROM public.group_booking_into_trip(v_booking_id);
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Trip lifecycle + live location
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_transport_trip(p_trip_id UUID, p_driver_id UUID)
RETURNS public.transport_trips
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip public.transport_trips;
BEGIN
  UPDATE public.transport_trips
  SET status = 'trip_started',
      driver_id = COALESCE(driver_id, p_driver_id),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  UPDATE public.bookings
  SET lifecycle_status = 'trip_started',
      status = 'IN_PROGRESS',
      lock_version = lock_version + 1,
      updated_at = timezone('utc'::text, now())
  WHERE assigned_trip_id = p_trip_id;

  INSERT INTO public.transport_trip_events(trip_id, actor_type, actor_id, event_type)
  VALUES (p_trip_id, 'driver', p_driver_id, 'trip_started');

  RETURN v_trip;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_transport_trip(p_trip_id UUID, p_driver_id UUID)
RETURNS public.transport_trips
LANGUAGE plpgsql
AS $$
DECLARE
  v_trip public.transport_trips;
BEGIN
  UPDATE public.transport_trips
  SET status = 'trip_completed',
      updated_at = timezone('utc'::text, now())
  WHERE id = p_trip_id
  RETURNING * INTO v_trip;

  UPDATE public.bookings
  SET lifecycle_status = 'trip_completed',
      status = 'COMPLETED',
      lock_version = lock_version + 1,
      updated_at = timezone('utc'::text, now())
  WHERE assigned_trip_id = p_trip_id;

  INSERT INTO public.transport_trip_events(trip_id, actor_type, actor_id, event_type)
  VALUES (p_trip_id, 'driver', p_driver_id, 'trip_completed');

  RETURN v_trip;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_trip_live_location(
  p_trip_id UUID,
  p_driver_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_speed_mps DOUBLE PRECISION DEFAULT NULL,
  p_heading DOUBLE PRECISION DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_location JSONB;
BEGIN
  v_location := jsonb_build_object(
    'latitude', p_latitude,
    'longitude', p_longitude,
    'speed_mps', p_speed_mps,
    'heading', p_heading,
    'recorded_at', timezone('utc'::text, now())
  );

  UPDATE public.transport_trips
  SET live_location = v_location,
      live_location_updated_at = timezone('utc'::text, now()),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_trip_id;

  INSERT INTO public.transport_trip_locations(trip_id, driver_id, location, speed_mps, heading)
  VALUES (
    p_trip_id,
    p_driver_id,
    jsonb_build_object('latitude', p_latitude, 'longitude', p_longitude),
    p_speed_mps,
    p_heading
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7) Prevent booking time edits after grouping
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_grouped_booking_time_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.lifecycle_status IN ('grouped', 'trip_pending', 'trip_started', 'trip_completed')
     AND (OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.end_time IS DISTINCT FROM NEW.end_time)
  THEN
    RAISE EXCEPTION 'Cannot modify booking times once grouped';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_grouped_booking_time_updates_trigger ON public.bookings;
CREATE TRIGGER prevent_grouped_booking_time_updates_trigger
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.prevent_grouped_booking_time_updates();

-- -----------------------------------------------------------------------------
-- 8) Trigger for updated_at on new tables
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_transport_trips_updated_at ON public.transport_trips;
CREATE TRIGGER update_transport_trips_updated_at
BEFORE UPDATE ON public.transport_trips
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 9) Open RLS policies for MVP parity with existing app
-- -----------------------------------------------------------------------------
ALTER TABLE public.transport_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_trip_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_trip_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select transport trips" ON public.transport_trips;
DROP POLICY IF EXISTS "Allow public insert transport trips" ON public.transport_trips;
DROP POLICY IF EXISTS "Allow public update transport trips" ON public.transport_trips;
CREATE POLICY "Allow public select transport trips" ON public.transport_trips FOR SELECT USING (true);
CREATE POLICY "Allow public insert transport trips" ON public.transport_trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update transport trips" ON public.transport_trips FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public select transport members" ON public.transport_trip_members;
DROP POLICY IF EXISTS "Allow public insert transport members" ON public.transport_trip_members;
DROP POLICY IF EXISTS "Allow public update transport members" ON public.transport_trip_members;
CREATE POLICY "Allow public select transport members" ON public.transport_trip_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert transport members" ON public.transport_trip_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update transport members" ON public.transport_trip_members FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public select transport locations" ON public.transport_trip_locations;
DROP POLICY IF EXISTS "Allow public insert transport locations" ON public.transport_trip_locations;
CREATE POLICY "Allow public select transport locations" ON public.transport_trip_locations FOR SELECT USING (true);
CREATE POLICY "Allow public insert transport locations" ON public.transport_trip_locations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select transport events" ON public.transport_trip_events;
DROP POLICY IF EXISTS "Allow public insert transport events" ON public.transport_trip_events;
CREATE POLICY "Allow public select transport events" ON public.transport_trip_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert transport events" ON public.transport_trip_events FOR INSERT WITH CHECK (true);

COMMIT;
