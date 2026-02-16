-- Persist grouping output into transport tables in one transaction.
-- Execute in Supabase SQL editor.

CREATE OR REPLACE FUNCTION public.persist_grouping_plan(p_plan JSONB)
RETURNS TABLE(
  trips_created INTEGER,
  members_created INTEGER,
  bookings_grouped INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  group_item JSONB;
  member_item JSONB;
  v_trip_id UUID;
  v_members_for_trip INTEGER;
  v_inserted_member_id UUID;
BEGIN
  trips_created := 0;
  members_created := 0;
  bookings_grouped := 0;

  IF p_plan IS NULL OR jsonb_typeof(p_plan) <> 'array' THEN
    RETURN;
  END IF;

  FOR group_item IN SELECT * FROM jsonb_array_elements(p_plan)
  LOOP
    INSERT INTO public.transport_trips (
      school_id,
      type,
      start_time,
      end_time,
      status,
      capacity,
      members_count,
      school_location,
      total_distance_m,
      total_duration_s,
      is_locked
    ) VALUES (
      (group_item ->> 'school_id')::UUID,
      COALESCE(group_item ->> 'type', 'PICKUP'),
      (group_item ->> 'start_time')::timestamptz,
      (group_item ->> 'end_time')::timestamptz,
      'trip_pending',
      COALESCE((group_item ->> 'capacity')::INTEGER, 0),
      0,
      jsonb_build_object(
        'latitude', (group_item ->> 'school_latitude')::DOUBLE PRECISION,
        'longitude', (group_item ->> 'school_longitude')::DOUBLE PRECISION
      ),
      ROUND(COALESCE((group_item ->> 'estimated_total_distance_km')::NUMERIC, 0) * 1000),
      ROUND(COALESCE((group_item ->> 'estimated_total_time_minutes')::NUMERIC, 0) * 60),
      false
    )
    RETURNING id INTO v_trip_id;

    v_members_for_trip := 0;

    FOR member_item IN SELECT * FROM jsonb_array_elements(group_item -> 'members')
    LOOP
      INSERT INTO public.transport_trip_members (
        trip_id,
        booking_id,
        student_id,
        pickup_order,
        distance_to_school_m,
        eta_to_school_s
      ) VALUES (
        v_trip_id,
        (member_item ->> 'booking_id')::UUID,
        (member_item ->> 'student_id')::UUID,
        COALESCE((member_item ->> 'pickup_order')::INTEGER, 1),
        COALESCE((member_item ->> 'distance_to_school_m')::INTEGER, 0),
        COALESCE((member_item ->> 'eta_to_school_s')::INTEGER, 60)
      )
      ON CONFLICT (booking_id) DO NOTHING
      RETURNING id INTO v_inserted_member_id;

      IF v_inserted_member_id IS NOT NULL THEN
        v_members_for_trip := v_members_for_trip + 1;
        members_created := members_created + 1;

        UPDATE public.bookings
        SET assigned_trip_id = v_trip_id,
            lifecycle_status = 'grouped',
            grouped_at = timezone('utc'::text, now()),
            grouped_key = concat_ws(
              '|',
              group_item ->> 'school_id',
              COALESCE(group_item ->> 'type', 'PICKUP'),
              group_item ->> 'start_time',
              group_item ->> 'end_time'
            ),
            lock_version = lock_version + 1,
            updated_at = timezone('utc'::text, now())
        WHERE id = (member_item ->> 'booking_id')::UUID
          AND assigned_trip_id IS NULL;

        IF FOUND THEN
          bookings_grouped := bookings_grouped + 1;
        END IF;
      END IF;

      v_inserted_member_id := NULL;
    END LOOP;

    IF v_members_for_trip = 0 THEN
      DELETE FROM public.transport_trips WHERE id = v_trip_id;
    ELSE
      UPDATE public.transport_trips
      SET members_count = v_members_for_trip,
          updated_at = timezone('utc'::text, now())
      WHERE id = v_trip_id;

      trips_created := trips_created + 1;
    END IF;
  END LOOP;

  RETURN NEXT;
END;
$$;
