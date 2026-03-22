    -- ============================================================================
    -- Active Driver Trip Scenario Seed (Test Data Only)
    -- Purpose:
    --   Seed one realistic PICKUP trip so the driver home screen can render:
    --   - active trip card
    --   - school marker
    --   - 3 ordered student markers
    --   - combined route (Driver -> S1 -> S2 -> S3 -> School)
    --   - trip summary (distance, duration, students, capacity)
    --
    -- Prerequisites:
    --   - Base tables already created (schools, drivers, buses, students, bookings)
    --   - Grouping/trip tables already created (transport_trips, transport_trip_members)
    --   - bookings has lifecycle/location fields (from transport_grouping_live_tracking.sql
    --     and add_location_fields_to_bookings.sql)
    -- ============================================================================

    BEGIN;

    -- ----------------------------------------------------------------------------
    -- 0) Stable UUIDs for repeatable runs
    -- ----------------------------------------------------------------------------
    -- school:   11111111-1111-4111-8111-111111111111
    -- driver:   22222222-2222-4222-8222-222222222222
    -- bus:      33333333-3333-4333-8333-333333333333
    -- student1: 44444444-4444-4444-8444-444444444444
    -- student2: 55555555-5555-4555-8555-555555555555
    -- student3: 66666666-6666-4666-8666-666666666666
    -- booking1: 77777777-7777-4777-8777-777777777777
    -- booking2: 88888888-8888-4888-8888-888888888888
    -- booking3: 99999999-9999-4999-8999-999999999999
    -- trip:     aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
    -- member1:  bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1
    -- member2:  bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2
    -- member3:  bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3

    -- ----------------------------------------------------------------------------
    -- 1) School
    -- ----------------------------------------------------------------------------
    INSERT INTO public.schools (
    id, name, name_ar, latitude, longitude, address, city, is_active
    )
    VALUES (
    '11111111-1111-4111-8111-111111111111',
    'Al Amal International School',
    'مدرسة الأمل الدولية',
    33.573100,
    -7.589800,
    'Boulevard Ghandi, Maarif',
    'Casablanca',
    true
    )
    ON CONFLICT (id) DO UPDATE
    SET
    name = EXCLUDED.name,
    name_ar = EXCLUDED.name_ar,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

    -- ----------------------------------------------------------------------------
    -- 2) Driver (verified/active via APPROVED status)
    -- ----------------------------------------------------------------------------
    INSERT INTO public.drivers (
    id, fullname, phone, email, cin, status
    )
    VALUES (
    '22222222-2222-4222-8222-222222222222',
    'Youssef Benali',
    '+212600111222',
    'driver.active.youssef@mobi.test',
    'DRV-CIN-0001',
    'APPROVED'
    )
    ON CONFLICT (id) DO UPDATE
    SET
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    cin = EXCLUDED.cin,
    status = EXCLUDED.status,
    updated_at = timezone('utc'::text, now());

    -- ----------------------------------------------------------------------------
    -- 3) Bus assigned to driver (capacity defined)
    -- ----------------------------------------------------------------------------
    DO $$
    DECLARE
    has_type BOOLEAN;
    has_brand BOOLEAN;
    has_year BOOLEAN;
    has_plate_number BOOLEAN;
    has_parking_location BOOLEAN;
    has_capacity BOOLEAN;
    has_updated_at BOOLEAN;
    col_sql TEXT;
    val_sql TEXT;
    upd_sql TEXT;
    BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'buses' AND column_name = 'type'
    ) INTO has_type;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'buses' AND column_name = 'brand'
    ) INTO has_brand;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'buses' AND column_name = 'year'
    ) INTO has_year;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'buses' AND column_name = 'plate_number'
    ) INTO has_plate_number;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'buses' AND column_name = 'parking_location'
    ) INTO has_parking_location;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'buses' AND column_name = 'capacity'
    ) INTO has_capacity;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'buses' AND column_name = 'updated_at'
    ) INTO has_updated_at;

    col_sql := 'id, driver_id';
    val_sql := quote_literal('33333333-3333-4333-8333-333333333333') || ', ' ||
                quote_literal('22222222-2222-4222-8222-222222222222');
    upd_sql := 'driver_id = EXCLUDED.driver_id';

    IF has_type THEN
        col_sql := col_sql || ', type';
        val_sql := val_sql || ', ' || quote_literal('MINIBUS');
        upd_sql := upd_sql || ', type = EXCLUDED.type';
    END IF;

    IF has_brand THEN
        col_sql := col_sql || ', brand';
        val_sql := val_sql || ', ' || quote_literal('Mercedes Sprinter');
        upd_sql := upd_sql || ', brand = EXCLUDED.brand';
    END IF;

    IF has_year THEN
        col_sql := col_sql || ', year';
        val_sql := val_sql || ', 2022';
        upd_sql := upd_sql || ', year = EXCLUDED.year';
    END IF;

    IF has_plate_number THEN
        col_sql := col_sql || ', plate_number';
        val_sql := val_sql || ', ' || quote_literal('CAS-24567');
        upd_sql := upd_sql || ', plate_number = EXCLUDED.plate_number';
    END IF;

    IF has_parking_location THEN
        col_sql := col_sql || ', parking_location';
        val_sql := val_sql || ', ' || quote_literal('{"latitude": 33.562800, "longitude": -7.607500}') || '::jsonb';
        upd_sql := upd_sql || ', parking_location = EXCLUDED.parking_location';
    END IF;

    IF has_capacity THEN
        col_sql := col_sql || ', capacity';
        val_sql := val_sql || ', 24';
        upd_sql := upd_sql || ', capacity = EXCLUDED.capacity';
    END IF;

    IF has_updated_at THEN
        upd_sql := upd_sql || ', updated_at = timezone(''utc''::text, now())';
    END IF;

    EXECUTE
        'INSERT INTO public.buses (' || col_sql || ') VALUES (' || val_sql || ')' ||
        ' ON CONFLICT (id) DO UPDATE SET ' || upd_sql;
    END $$;

    -- ----------------------------------------------------------------------------
    -- 4) Students (all linked to same school, home locations within < 15 km)
    -- ----------------------------------------------------------------------------
    INSERT INTO public.students (
    id, fullname, phone, email, cin, school_id, home_location
    )
    VALUES
    (
    '44444444-4444-4444-8444-444444444444',
    'Aya El Idrissi',
    '+212611000101',
    'aya.elidrissi@student.mobi.test',
    'STD-CIN-1001',
    '11111111-1111-4111-8111-111111111111',
    '{"latitude": 33.566200, "longitude": -7.603000}'
    ),
    (
    '55555555-5555-4555-8555-555555555555',
    'Omar Tazi',
    '+212611000102',
    'omar.tazi@student.mobi.test',
    'STD-CIN-1002',
    '11111111-1111-4111-8111-111111111111',
    '{"latitude": 33.570800, "longitude": -7.596200}'
    ),
    (
    '66666666-6666-4666-8666-666666666666',
    'Salma Rami',
    '+212611000103',
    'salma.rami@student.mobi.test',
    'STD-CIN-1003',
    '11111111-1111-4111-8111-111111111111',
    '{"latitude": 33.577900, "longitude": -7.584700}'
    )
    ON CONFLICT (id) DO UPDATE
    SET
    fullname = EXCLUDED.fullname,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    cin = EXCLUDED.cin,
    school_id = EXCLUDED.school_id,
    home_location = EXCLUDED.home_location,
    updated_at = timezone('utc'::text, now());

    -- ----------------------------------------------------------------------------
    -- 5) Bookings (1 per student, PICKUP, CONFIRMED, lifecycle grouped)
    -- ----------------------------------------------------------------------------
    INSERT INTO public.bookings (
    id,
    student_id,
    type,
    start_time,
    end_time,
    status,
    lifecycle_status,
    pickup_location,
    destination_location,
    route_coordinates,
    driver_id,
    bus_id,
    assigned_trip_id,
    grouped_at,
    grouped_key
    )
    VALUES
    (
    '77777777-7777-4777-8777-777777777777',
    '44444444-4444-4444-8444-444444444444',
    'PICKUP',
    timezone('utc'::text, now()) - interval '10 minutes',
    timezone('utc'::text, now()) + interval '50 minutes',
    'CONFIRMED',
    'grouped',
    '{"latitude": 33.566200, "longitude": -7.603000}',
    '{"latitude": 33.573100, "longitude": -7.589800}',
    '[{"latitude": 33.566200, "longitude": -7.603000}, {"latitude": 33.570100, "longitude": -7.596900}, {"latitude": 33.573100, "longitude": -7.589800}]',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    NULL,
    timezone('utc'::text, now()) - interval '8 minutes',
    'school:11111111-1111-4111-8111-111111111111|pickup|active-demo'
    ),
    (
    '88888888-8888-4888-8888-888888888888',
    '55555555-5555-4555-8555-555555555555',
    'PICKUP',
    timezone('utc'::text, now()) - interval '10 minutes',
    timezone('utc'::text, now()) + interval '50 minutes',
    'CONFIRMED',
    'grouped',
    '{"latitude": 33.570800, "longitude": -7.596200}',
    '{"latitude": 33.573100, "longitude": -7.589800}',
    '[{"latitude": 33.570800, "longitude": -7.596200}, {"latitude": 33.571900, "longitude": -7.592900}, {"latitude": 33.573100, "longitude": -7.589800}]',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    NULL,
    timezone('utc'::text, now()) - interval '8 minutes',
    'school:11111111-1111-4111-8111-111111111111|pickup|active-demo'
    ),
    (
    '99999999-9999-4999-8999-999999999999',
    '66666666-6666-4666-8666-666666666666',
    'PICKUP',
    timezone('utc'::text, now()) - interval '10 minutes',
    timezone('utc'::text, now()) + interval '50 minutes',
    'CONFIRMED',
    'grouped',
    '{"latitude": 33.577900, "longitude": -7.584700}',
    '{"latitude": 33.573100, "longitude": -7.589800}',
    '[{"latitude": 33.577900, "longitude": -7.584700}, {"latitude": 33.575900, "longitude": -7.587300}, {"latitude": 33.573100, "longitude": -7.589800}]',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    NULL,
    timezone('utc'::text, now()) - interval '8 minutes',
    'school:11111111-1111-4111-8111-111111111111|pickup|active-demo'
    )
    ON CONFLICT (id) DO UPDATE
    SET
    student_id = EXCLUDED.student_id,
    type = EXCLUDED.type,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    status = EXCLUDED.status,
    lifecycle_status = EXCLUDED.lifecycle_status,
    pickup_location = EXCLUDED.pickup_location,
    destination_location = EXCLUDED.destination_location,
    route_coordinates = EXCLUDED.route_coordinates,
    driver_id = EXCLUDED.driver_id,
    bus_id = EXCLUDED.bus_id,
    assigned_trip_id = EXCLUDED.assigned_trip_id,
    grouped_at = EXCLUDED.grouped_at,
    grouped_key = EXCLUDED.grouped_key,
    updated_at = timezone('utc'::text, now());

    -- ----------------------------------------------------------------------------
    -- 6) One active transport trip (PICKUP, assigned school/driver/bus)
    -- ----------------------------------------------------------------------------
    INSERT INTO public.transport_trips (
    id,
    school_id,
    type,
    start_time,
    end_time,
    status,
    driver_id,
    bus_id,
    capacity,
    members_count,
    is_locked,
    locked_at,
    school_location,
    route_polyline,
    total_distance_m,
    total_duration_s,
    eta_by_member,
    live_location,
    live_location_updated_at
    )
    VALUES (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'PICKUP',
    timezone('utc'::text, now()) - interval '10 minutes',
    timezone('utc'::text, now()) + interval '50 minutes',
    'trip_started',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    24,
    3,
    true,
    timezone('utc'::text, now()) - interval '9 minutes',
    '{"latitude": 33.573100, "longitude": -7.589800}',
    '[
        {"latitude": 33.562800, "longitude": -7.607500},
        {"latitude": 33.566200, "longitude": -7.603000},
        {"latitude": 33.568700, "longitude": -7.600000},
        {"latitude": 33.570800, "longitude": -7.596200},
        {"latitude": 33.574100, "longitude": -7.590400},
        {"latitude": 33.577900, "longitude": -7.584700},
        {"latitude": 33.575000, "longitude": -7.587900},
        {"latitude": 33.573100, "longitude": -7.589800}
    ]',
    6800,
    1620,
    '{
        "44444444-4444-4444-8444-444444444444": 420,
        "55555555-5555-4555-8555-555555555555": 870,
        "66666666-6666-4666-8666-666666666666": 1260
    }',
    '{"latitude": 33.568700, "longitude": -7.600000}',
    timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE
    SET
    school_id = EXCLUDED.school_id,
    type = EXCLUDED.type,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    status = EXCLUDED.status,
    driver_id = EXCLUDED.driver_id,
    bus_id = EXCLUDED.bus_id,
    capacity = EXCLUDED.capacity,
    members_count = EXCLUDED.members_count,
    is_locked = EXCLUDED.is_locked,
    locked_at = EXCLUDED.locked_at,
    school_location = EXCLUDED.school_location,
    route_polyline = EXCLUDED.route_polyline,
    total_distance_m = EXCLUDED.total_distance_m,
    total_duration_s = EXCLUDED.total_duration_s,
    eta_by_member = EXCLUDED.eta_by_member,
    live_location = EXCLUDED.live_location,
    live_location_updated_at = EXCLUDED.live_location_updated_at,
    updated_at = timezone('utc'::text, now());

    -- ----------------------------------------------------------------------------
    -- 7) Trip members (ordered pickup list + distance/ETA metadata)
    -- ----------------------------------------------------------------------------
    INSERT INTO public.transport_trip_members (
    id, trip_id, booking_id, student_id, pickup_order, distance_to_school_m, eta_to_school_s, no_show
    )
    VALUES
    (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '77777777-7777-4777-8777-777777777777',
    '44444444-4444-4444-8444-444444444444',
    1,
    1570,
    660,
    false
    ),
    (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '88888888-8888-4888-8888-888888888888',
    '55555555-5555-4555-8555-555555555555',
    2,
    760,
    450,
    false
    ),
    (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '99999999-9999-4999-8999-999999999999',
    '66666666-6666-4666-8666-666666666666',
    3,
    640,
    300,
    false
    )
    ON CONFLICT (booking_id) DO UPDATE
    SET
    id = EXCLUDED.id,
    trip_id = EXCLUDED.trip_id,
    booking_id = EXCLUDED.booking_id,
    student_id = EXCLUDED.student_id,
    pickup_order = EXCLUDED.pickup_order,
    distance_to_school_m = EXCLUDED.distance_to_school_m,
    eta_to_school_s = EXCLUDED.eta_to_school_s,
    no_show = EXCLUDED.no_show;

    -- ----------------------------------------------------------------------------
    -- 8) Safety sync: ensure bookings remain linked to this trip after upserts
    -- ----------------------------------------------------------------------------
    UPDATE public.bookings
    SET
    assigned_trip_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    lifecycle_status = 'grouped',
    status = 'CONFIRMED',
    grouped_at = COALESCE(grouped_at, timezone('utc'::text, now())),
    grouped_key = 'school:11111111-1111-4111-8111-111111111111|pickup|active-demo',
    updated_at = timezone('utc'::text, now())
    WHERE id IN (
    '77777777-7777-4777-8777-777777777777',
    '88888888-8888-4888-8888-888888888888',
    '99999999-9999-4999-8999-999999999999'
    );

    COMMIT;

    -- Quick verification query (optional):
    -- SELECT
    --   t.id AS trip_id,
    --   t.status,
    --   t.members_count,
    --   t.capacity,
    --   t.total_distance_m,
    --   t.total_duration_s,
    --   d.fullname AS driver_name,
    --   b.plate_number,
    --   s.name AS school_name
    -- FROM public.transport_trips t
    -- JOIN public.drivers d ON d.id = t.driver_id
    -- JOIN public.buses b ON b.id = t.bus_id
    -- JOIN public.schools s ON s.id = t.school_id
    -- WHERE t.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
