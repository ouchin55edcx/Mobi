# Students-Schools One-to-Many Relationship

## Overview
This document describes the one-to-many relationship between `students` and `schools` tables.

## Relationship Type
**One-to-Many (1:N)**
- **One** school can have **many** students
- **Each** student belongs to **exactly one** school

## Database Schema

### Schools Table (Parent)
```sql
CREATE TABLE public.schools (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    city TEXT,
    is_active BOOLEAN DEFAULT true,
    ...
);
```

### Students Table (Child)
```sql
CREATE TABLE public.students (
    id UUID PRIMARY KEY,
    fullname TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cin TEXT NOT NULL UNIQUE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    home_location JSONB NOT NULL,
    ...
);
```

## Foreign Key Constraint

- **Column**: `students.school_id`
- **References**: `schools.id`
- **Constraint Name**: `students_school_id_fkey`
- **On Delete**: `RESTRICT` (prevents deleting a school that has students)

## Indexes

For optimal query performance:
- `students_school_id_idx` - Index on `school_id` for fast lookups and joins

## Migration Files

### For New Installations
1. Run `create_schools_table.sql` first
2. Run `create_students_table_with_school_relation.sql`

### For Existing Installations
1. Run `create_schools_table.sql` first
2. Run `migrate_students_school_to_foreign_key.sql`
3. Map existing school TEXT values to school_id
4. Make school_id NOT NULL
5. Drop old school TEXT column

## Service Functions

### Student Service
- `createStudent()` - Creates student with school_id
- `getStudentById()` - Gets student with school details (join)
- `getStudentByEmail()` - Gets student with school details (join)
- `getStudentsBySchoolId(schoolId)` - Gets all students for a school
- `updateStudent()` - Updates student (can change school_id)

### School Service
- `getAllSchools()` - Gets all schools
- `getSchoolById(schoolId)` - Gets school details
- `getSchoolWithStudents(schoolId)` - Gets school with all its students

## Example Queries

### Get all students for a school
```javascript
const { data, error } = await getStudentsBySchoolId(schoolId);
```

### Get school with all its students
```javascript
const { data, error } = await getSchoolWithStudents(schoolId);
// data.students contains array of all students
```

### Get student with school details
```javascript
const { data, error } = await getStudentById(studentId);
// data.schools contains school object
```

## Data Integrity

- **Referential Integrity**: Ensured by foreign key constraint
- **Cascade Behavior**: `ON DELETE RESTRICT` prevents orphaned records
- **Required Field**: `school_id` is NOT NULL, every student must have a school

## Notes

- The relationship is enforced at the database level
- Students cannot exist without a valid school_id
- Schools cannot be deleted if they have students (RESTRICT)
- The service layer automatically joins school data when fetching students

