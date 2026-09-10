\set ON_ERROR_STOP on

BEGIN;

-- =========================================================
-- 1. СХЕМА И РОЛЬ ПРИЛОЖЕНИЯ
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

CREATE SCHEMA pr;

REVOKE ALL ON SCHEMA pr FROM PUBLIC;

CREATE ROLE pr_app
    LOGIN
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    NOREPLICATION;

-- app_password передаётся командой запуска миграции.
SELECT format(
    'ALTER ROLE pr_app PASSWORD %L',
    :'app_password'
)
\gexec

ALTER ROLE pr_app SET search_path = pr, public;
ALTER ROLE pr_app SET timezone = 'UTC';


-- =========================================================
-- 2. ТИПЫ
-- =========================================================

CREATE TYPE pr.meeting_status AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TYPE pr.skill_outcome AS ENUM (
    'DISCUSSED',
    'CONFIRMED'
);

CREATE TYPE pr.problem_status AS ENUM (
    'OPEN',
    'RESOLVED'
);


-- =========================================================
-- 3. НАПРАВЛЕНИЯ
-- =========================================================

CREATE TABLE pr.directions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL
        CHECK (
            name = btrim(name)
            AND char_length(name) BETWEEN 1 AND 100
        ),

    archived_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX directions_name_uq
    ON pr.directions (lower(name));


-- =========================================================
-- 4. ПОДРАЗДЕЛЕНИЯ
-- =========================================================

CREATE TABLE pr.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL
        CHECK (
            name = btrim(name)
            AND char_length(name) BETWEEN 1 AND 150
        ),

    parent_id UUID,

    head_id UUID NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT department_not_own_parent
        CHECK (parent_id IS DISTINCT FROM id),

    CONSTRAINT department_parent_fk
        FOREIGN KEY (parent_id)
        REFERENCES pr.departments(id)
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED,

    CONSTRAINT department_head_unique
        UNIQUE(head_id)
        DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX departments_one_root_uq
    ON pr.departments ((true))
    WHERE parent_id IS NULL;

CREATE UNIQUE INDEX departments_sibling_name_uq
    ON pr.departments(parent_id, lower(name))
    WHERE parent_id IS NOT NULL;

CREATE INDEX departments_parent_idx
    ON pr.departments(parent_id);


-- =========================================================
-- 5. ПОЛЬЗОВАТЕЛИ
-- =========================================================

CREATE TABLE pr.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    login TEXT NOT NULL
        CHECK (
            login = lower(btrim(login))
            AND char_length(login) BETWEEN 3 AND 254
            AND login !~ '[[:space:]]'
        ),

    password_hash TEXT NOT NULL
        CHECK (
            char_length(password_hash) BETWEEN 40 AND 512
        ),

    full_name TEXT NOT NULL
        CHECK (
            full_name = btrim(full_name)
            AND char_length(full_name) BETWEEN 1 AND 200
        ),

    direction_id UUID NOT NULL
        REFERENCES pr.directions(id)
        ON DELETE RESTRICT,

    department_id UUID NOT NULL,

    is_admin BOOLEAN NOT NULL DEFAULT false,

    is_active BOOLEAN NOT NULL DEFAULT true,

    auth_version INTEGER NOT NULL DEFAULT 1
        CHECK (auth_version > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT users_login_uq UNIQUE(login),

    CONSTRAINT users_department_fk
        FOREIGN KEY(department_id)
        REFERENCES pr.departments(id)
        ON DELETE NO ACTION
        DEFERRABLE INITIALLY DEFERRED
);

ALTER TABLE pr.departments
    ADD CONSTRAINT departments_head_fk
    FOREIGN KEY(head_id)
    REFERENCES pr.users(id)
    ON DELETE NO ACTION
    DEFERRABLE INITIALLY DEFERRED;

CREATE INDEX users_department_idx
    ON pr.users(department_id);

CREATE INDEX users_direction_idx
    ON pr.users(direction_id);

CREATE INDEX users_active_department_idx
    ON pr.users(department_id)
    WHERE is_active;


-- =========================================================
-- 6. НАВЫКИ
-- =========================================================

CREATE TABLE pr.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    direction_id UUID NOT NULL
        REFERENCES pr.directions(id)
        ON DELETE RESTRICT,

    name TEXT NOT NULL
        CHECK (
            name = btrim(name)
            AND char_length(name) BETWEEN 1 AND 200
        ),

    description TEXT
        CHECK (
            description IS NULL
            OR char_length(description) <= 5000
        ),

    archived_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX skills_direction_name_uq
    ON pr.skills(direction_id, lower(name));


-- =========================================================
-- 7. ГОДОВЫЕ ПЛАНЫ
-- =========================================================

CREATE TABLE pr.learning_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    employee_id UUID NOT NULL
        REFERENCES pr.users(id)
        ON DELETE RESTRICT,

    year INTEGER NOT NULL
        CHECK (year BETWEEN 2000 AND 2200),

    created_by UUID NOT NULL
        REFERENCES pr.users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT learning_plan_employee_year_uq
        UNIQUE(employee_id, year)
);


-- =========================================================
-- 8. ПУНКТЫ ГОДОВОГО ПЛАНА
-- =========================================================

CREATE TABLE pr.plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    plan_id UUID NOT NULL
        REFERENCES pr.learning_plans(id)
        ON DELETE RESTRICT,

    skill_id UUID NOT NULL
        REFERENCES pr.skills(id)
        ON DELETE RESTRICT,

    due_date DATE NOT NULL,

    cancelled_at TIMESTAMPTZ,

    cancellation_reason TEXT,

    version INTEGER NOT NULL DEFAULT 1
        CHECK (version > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT plan_item_skill_uq
        UNIQUE(plan_id, skill_id),

    CONSTRAINT plan_item_cancellation_valid
        CHECK (
            (
                cancelled_at IS NULL
                AND cancellation_reason IS NULL
            )
            OR
            (
                cancelled_at IS NOT NULL
                AND cancellation_reason IS NOT NULL
                AND char_length(btrim(cancellation_reason))
                    BETWEEN 1 AND 2000
            )
        )
);

CREATE INDEX plan_items_active_due_idx
    ON pr.plan_items(due_date)
    WHERE cancelled_at IS NULL;


-- =========================================================
-- 9. ВСТРЕЧИ
-- =========================================================

CREATE TABLE pr.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    employee_id UUID NOT NULL
        REFERENCES pr.users(id)
        ON DELETE RESTRICT,

    created_by UUID NOT NULL
        REFERENCES pr.users(id)
        ON DELETE RESTRICT,

    reviewer_id UUID
        REFERENCES pr.users(id)
        ON DELETE RESTRICT,

    status pr.meeting_status NOT NULL DEFAULT 'DRAFT',

    scheduled_at TIMESTAMPTZ,

    occurred_at TIMESTAMPTZ,

    summary TEXT,

    draft_payload JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (
            jsonb_typeof(draft_payload) = 'object'
            AND octet_length(draft_payload::text) <= 262144
        ),

    completion_request_id UUID UNIQUE,

    version INTEGER NOT NULL DEFAULT 1
        CHECK (version > 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT meeting_not_self_created
        CHECK(employee_id <> created_by),

    CONSTRAINT meeting_not_self_reviewed
        CHECK(
            reviewer_id IS NULL
            OR reviewer_id <> employee_id
        ),

    CONSTRAINT scheduled_meeting_has_date
        CHECK(
            status <> 'SCHEDULED'
            OR scheduled_at IS NOT NULL
        ),

    CONSTRAINT meeting_completed_fields
        CHECK(
            (
                status = 'COMPLETED'
                AND reviewer_id IS NOT NULL
                AND occurred_at IS NOT NULL
                AND summary IS NOT NULL
                AND char_length(btrim(summary))
                    BETWEEN 1 AND 20000
                AND completion_request_id IS NOT NULL
            )
            OR
            (
                status <> 'COMPLETED'
                AND reviewer_id IS NULL
                AND occurred_at IS NULL
                AND summary IS NULL
                AND completion_request_id IS NULL
            )
        )
);

CREATE INDEX meetings_employee_date_idx
    ON pr.meetings(employee_id, occurred_at DESC);

CREATE INDEX meetings_scheduled_idx
    ON pr.meetings(scheduled_at)
    WHERE status = 'SCHEDULED';


-- =========================================================
-- 10. РЕЗУЛЬТАТЫ ОБСУЖДЕНИЯ НАВЫКОВ
-- =========================================================

CREATE TABLE pr.meeting_skills (
    meeting_id UUID NOT NULL
        REFERENCES pr.meetings(id)
        ON DELETE RESTRICT,

    plan_item_id UUID NOT NULL
        REFERENCES pr.plan_items(id)
        ON DELETE RESTRICT,

    outcome pr.skill_outcome NOT NULL,

    skill_name_snapshot TEXT NOT NULL,

    comment TEXT
        CHECK(
            comment IS NULL
            OR char_length(comment) <= 5000
        ),

    PRIMARY KEY(meeting_id, plan_item_id),

    CONSTRAINT meeting_skill_result_uq
        UNIQUE(meeting_id, plan_item_id, outcome)
);

CREATE INDEX meeting_skills_plan_item_idx
    ON pr.meeting_skills(plan_item_id);


-- =========================================================
-- 11. ПОДТВЕРЖДЕНИЯ НАВЫКОВ
-- =========================================================

CREATE TABLE pr.skill_confirmations (
    plan_item_id UUID PRIMARY KEY
        REFERENCES pr.plan_items(id)
        ON DELETE RESTRICT,

    meeting_id UUID NOT NULL,

    outcome pr.skill_outcome NOT NULL DEFAULT 'CONFIRMED'
        CHECK(outcome = 'CONFIRMED'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT confirmation_has_confirmed_result
        FOREIGN KEY(meeting_id, plan_item_id, outcome)
        REFERENCES pr.meeting_skills(
            meeting_id,
            plan_item_id,
            outcome
        )
        ON DELETE RESTRICT
);

CREATE INDEX skill_confirmations_meeting_idx
    ON pr.skill_confirmations(meeting_id);


-- =========================================================
-- 12. ССЫЛКИ
-- =========================================================

CREATE TABLE pr.meeting_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    meeting_id UUID NOT NULL
        REFERENCES pr.meetings(id)
        ON DELETE RESTRICT,

    title TEXT NOT NULL
        CHECK(
            char_length(btrim(title)) BETWEEN 1 AND 200
        ),

    url TEXT NOT NULL
        CHECK(
            char_length(url) BETWEEN 8 AND 2048
            AND url ~* '^https?://[^[:space:]]+$'
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(meeting_id, url)
);

CREATE INDEX meeting_links_meeting_idx
    ON pr.meeting_links(meeting_id);


-- =========================================================
-- 13. ПРОБЛЕМЫ
-- =========================================================

CREATE TABLE pr.problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    employee_id UUID NOT NULL
        REFERENCES pr.users(id)
        ON DELETE RESTRICT,

    meeting_id UUID NOT NULL
        REFERENCES pr.meetings(id)
        ON DELETE RESTRICT,

    plan_item_id UUID
        REFERENCES pr.plan_items(id)
        ON DELETE RESTRICT,

    comment TEXT NOT NULL
        CHECK(
            char_length(btrim(comment)) BETWEEN 1 AND 5000
        ),

    status pr.problem_status NOT NULL DEFAULT 'OPEN',

    created_by UUID NOT NULL
        REFERENCES pr.users(id)
        ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    resolved_by UUID
        REFERENCES pr.users(id)
        ON DELETE RESTRICT,

    resolved_at TIMESTAMPTZ,

    resolution_comment TEXT,

    CONSTRAINT problem_resolution_valid
        CHECK(
            (
                status = 'OPEN'
                AND resolved_by IS NULL
                AND resolved_at IS NULL
                AND resolution_comment IS NULL
            )
            OR
            (
                status = 'RESOLVED'
                AND resolved_by IS NOT NULL
                AND resolved_at IS NOT NULL
                AND resolution_comment IS NOT NULL
                AND char_length(btrim(resolution_comment))
                    BETWEEN 1 AND 5000
            )
        )
);

CREATE INDEX problems_employee_status_idx
    ON pr.problems(employee_id, status);

CREATE INDEX problems_meeting_idx
    ON pr.problems(meeting_id);

CREATE INDEX problems_plan_item_idx
    ON pr.problems(plan_item_id)
    WHERE plan_item_id IS NOT NULL;


-- =========================================================
-- 14. АУДИТ ОСНОВНЫХ ОПЕРАЦИЙ
-- =========================================================

CREATE TABLE pr.audit_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    actor_id UUID
        REFERENCES pr.users(id)
        ON DELETE RESTRICT,

    action TEXT NOT NULL,

    entity_type TEXT NOT NULL,

    entity_id UUID,

    details JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_entity_idx
    ON pr.audit_events(
        entity_type,
        entity_id,
        created_at DESC
    );


-- =========================================================
-- 15. БЛОКИРОВКА КРИТИЧЕСКИХ ЗАПИСЕЙ
-- Для небольшого MVP сериализуем изменения.
-- =========================================================

CREATE FUNCTION pr.lock_writes()
RETURNS void
LANGUAGE sql
VOLATILE
SET search_path = pg_catalog, pr, pg_temp
AS $$
    SELECT pg_advisory_xact_lock(41024, 1);
$$;


CREATE FUNCTION pr.serialize_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pr, pg_temp
AS $$
BEGIN
    PERFORM pr.lock_writes();
    RETURN NULL;
END;
$$;


DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'directions',
        'departments',
        'users',
        'skills',
        'learning_plans',
        'plan_items',
        'meetings',
        'meeting_skills',
        'skill_confirmations',
        'meeting_links',
        'problems'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER serialize_write
             BEFORE INSERT OR UPDATE OR DELETE ON pr.%I
             FOR EACH STATEMENT
             EXECUTE FUNCTION pr.serialize_write()',
            v_table
        );
    END LOOP;
END;
$$;


-- =========================================================
-- 16. ОБНОВЛЕНИЕ updated_at
-- =========================================================

CREATE FUNCTION pr.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'directions',
        'departments',
        'users',
        'skills',
        'plan_items',
        'meetings'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER touch_updated_at
             BEFORE UPDATE ON pr.%I
             FOR EACH ROW
             EXECUTE FUNCTION pr.touch_updated_at()',
            v_table
        );
    END LOOP;
END;
$$;


-- =========================================================
-- 17. ПРОВЕРКА ДЕРЕВА И РУКОВОДИТЕЛЕЙ
-- Выполняется к концу транзакции.
-- =========================================================

CREATE FUNCTION pr.validate_organization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pr, pg_temp
AS $$
BEGIN
    IF EXISTS(SELECT 1 FROM pr.departments)
       AND (
           SELECT count(*)
           FROM pr.departments
           WHERE parent_id IS NULL
       ) <> 1
    THEN
        RAISE EXCEPTION
            'Organization must have exactly one root'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS(
        SELECT 1
        FROM pr.departments d
        JOIN pr.users u ON u.id = d.head_id
        WHERE NOT u.is_active
           OR u.department_id <> d.id
    )
    THEN
        RAISE EXCEPTION
            'Head must be active and belong to the department'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS(
        WITH RECURSIVE walk AS (
            SELECT
                d.id,
                d.parent_id,
                ARRAY[d.id]::UUID[] AS path,
                false AS cycle
            FROM pr.departments d

            UNION ALL

            SELECT
                p.id,
                p.parent_id,
                w.path || p.id,
                p.id = ANY(w.path)
            FROM walk w
            JOIN pr.departments p
                ON p.id = w.parent_id
            WHERE NOT w.cycle
        )
        SELECT 1
        FROM walk
        WHERE cycle
    )
    THEN
        RAISE EXCEPTION
            'Department hierarchy contains a cycle'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS(SELECT 1 FROM pr.users)
       AND NOT EXISTS(
           SELECT 1
           FROM pr.users
           WHERE is_admin AND is_active
       )
    THEN
        RAISE EXCEPTION
            'At least one active administrator is required'
            USING ERRCODE = '23514';
    END IF;

    RETURN NULL;
END;
$$;


CREATE CONSTRAINT TRIGGER departments_organization_valid
AFTER INSERT OR UPDATE OR DELETE ON pr.departments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION pr.validate_organization();


CREATE CONSTRAINT TRIGGER users_organization_valid
AFTER INSERT OR UPDATE OR DELETE ON pr.users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION pr.validate_organization();


CREATE FUNCTION pr.protect_root()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.parent_id IS NULL THEN
        RAISE EXCEPTION
            'Root department cannot be deleted'
            USING ERRCODE = '23514';
    END IF;

    RETURN OLD;
END;
$$;


CREATE TRIGGER protect_root
BEFORE DELETE ON pr.departments
FOR EACH ROW
EXECUTE FUNCTION pr.protect_root();


-- =========================================================
-- 18. ЗАЩИТА ПОЛЬЗОВАТЕЛЕЙ И СПРАВОЧНИКОВ
-- =========================================================

CREATE FUNCTION pr.guard_user()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pr, pg_temp
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.password_hash IS DISTINCT FROM OLD.password_hash
           OR NEW.is_active IS DISTINCT FROM OLD.is_active
           OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
        THEN
            NEW.auth_version := OLD.auth_version + 1;
        ELSIF NEW.auth_version < OLD.auth_version THEN
            RAISE EXCEPTION
                'auth_version cannot decrease'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF NEW.is_active AND EXISTS(
        SELECT 1
        FROM pr.directions
        WHERE id = NEW.direction_id
          AND archived_at IS NOT NULL
    )
    THEN
        RAISE EXCEPTION
            'Active user cannot use archived direction'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER guard_user
BEFORE INSERT OR UPDATE ON pr.users
FOR EACH ROW
EXECUTE FUNCTION pr.guard_user();


CREATE FUNCTION pr.guard_direction()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pr, pg_temp
AS $$
BEGIN
    IF NEW.archived_at IS NOT NULL THEN
        IF EXISTS(
            SELECT 1
            FROM pr.users
            WHERE direction_id = NEW.id
              AND is_active
        )
        OR EXISTS(
            SELECT 1
            FROM pr.skills
            WHERE direction_id = NEW.id
              AND archived_at IS NULL
        )
        THEN
            RAISE EXCEPTION
                'Move active users and archive skills first'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER guard_direction
BEFORE UPDATE ON pr.directions
FOR EACH ROW
EXECUTE FUNCTION pr.guard_direction();


CREATE FUNCTION pr.guard_skill()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pr, pg_temp
AS $$
BEGIN
    IF NEW.archived_at IS NULL AND EXISTS(
        SELECT 1
        FROM pr.directions
        WHERE id = NEW.direction_id
          AND archived_at IS NOT NULL
    )
    THEN
        RAISE EXCEPTION
            'Active skill cannot use archived direction'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER guard_skill
BEFORE INSERT OR UPDATE ON pr.skills
FOR EACH ROW
EXECUTE FUNCTION pr.guard_skill();


-- =========================================================
-- 19. ЗАПРЕТ ФИЗИЧЕСКОГО УДАЛЕНИЯ ИСТОРИИ
-- =========================================================

CREATE FUNCTION pr.reject_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Physical deletion from % is forbidden',
        TG_TABLE_NAME
        USING ERRCODE = '23514';
END;
$$;


DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'users',
        'directions',
        'skills',
        'learning_plans',
        'plan_items',
        'meetings',
        'meeting_skills',
        'skill_confirmations',
        'meeting_links',
        'problems',
        'audit_events'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER reject_delete
             BEFORE DELETE ON pr.%I
             FOR EACH ROW
             EXECUTE FUNCTION pr.reject_delete()',
            v_table
        );
    END LOOP;
END;
$$;


CREATE FUNCTION pr.reject_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Rows in % are immutable',
        TG_TABLE_NAME
        USING ERRCODE = '23514';
END;
$$;


DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'learning_plans',
        'meeting_skills',
        'skill_confirmations',
        'meeting_links',
        'audit_events'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER reject_update
             BEFORE UPDATE ON pr.%I
             FOR EACH ROW
             EXECUTE FUNCTION pr.reject_update()',
            v_table
        );
    END LOOP;
END;
$$;


-- =========================================================
-- 20. ПРОВЕРКА ПУНКТОВ ПЛАНА
-- =========================================================

CREATE FUNCTION pr.guard_plan_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, pr, pg_temp
AS $$
DECLARE
    v_year INTEGER;
BEGIN
    SELECT year
    INTO v_year
    FROM pr.learning_plans
    WHERE id = NEW.plan_id;

    IF v_year IS NULL
       OR extract(year FROM NEW.due_date)::INTEGER <> v_year
    THEN
        RAISE EXCEPTION
            'Due date must belong to the plan year'
            USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF EXISTS(
            SELECT 1
            FROM pr.skills
            WHERE id = NEW.skill_id
              AND archived_at IS NOT NULL
        )
        THEN
            RAISE EXCEPTION
                'Archived skill cannot be added to a plan'
                USING ERRCODE = '23514';
        END IF;

        IF EXISTS(
            SELECT 1
            FROM pr.learning_plans p
            JOIN pr.users u ON u.id = p.employee_id
            WHERE p.id = NEW.plan_id
              AND NOT u.is_active
        )
        THEN
            RAISE EXCEPTION
                'Cannot add plan items for inactive employee'
                USING ERRCODE = '23514';
        END IF;

        RETURN NEW;
    END IF;

    IF NEW.plan_id <> OLD.plan_id
       OR NEW.skill_id <> OLD.skill_id
    THEN
        RAISE EXCEPTION
            'Plan and skill of an existing item cannot change'
            USING ERRCODE = '23514';
    END IF;

    IF EXISTS(
        SELECT 1
        FROM pr.skill_confirmations
        WHERE plan_item_id = OLD.id
    )
    THEN
        IF NEW.due_date IS DISTINCT FROM OLD.due_date
           OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at
           OR NEW.cancellation_reason
                IS DISTINCT FROM OLD.cancellation_reason
        THEN
            RAISE EXCEPTION
                'Confirmed item cannot be changed or cancelled'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF OLD.cancelled_at IS NOT NULL
       AND NEW.cancelled_at IS NULL
       AND EXISTS(
           SELECT 1
           FROM pr.skills
           WHERE id = NEW.skill_id
             AND archived_at IS NOT NULL
       )
    THEN
        RAISE EXCEPTION
            'Cannot restore item with archived skill'
            USING ERRCODE = '23514';
    END IF;

    NEW.version := OLD.version + 1;

    RETURN NEW;
END;
$$;


CREATE TRIGGER guard_plan_item
BEFORE INSERT OR UPDATE ON pr.plan_items
FOR EACH ROW
EXECUTE FUNCTION pr.guard_plan_item();


-- =========================================================
-- 21. ЗАЩИТА ЗАВЕРШЁННЫХ ВСТРЕЧ
-- =========================================================

CREATE FUNCTION pr.guard_meeting()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IN ('COMPLETED', 'CANCELLED') THEN
        RAISE EXCEPTION
            'Completed or cancelled meeting is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.employee_id <> OLD.employee_id
       OR NEW.created_by <> OLD.created_by
    THEN
        RAISE EXCEPTION
            'Meeting employee and creator cannot change'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'COMPLETED'
       AND NEW.occurred_at > now()
    THEN
        RAISE EXCEPTION
            'Completed meeting cannot be in the future'
            USING ERRCODE = '23514';
    END IF;

    NEW.version := OLD.version + 1;

    RETURN NEW;
END;
$$;


CREATE TRIGGER guard_meeting
BEFORE UPDATE ON pr.meetings
FOR EACH ROW
EXECUTE FUNCTION pr.guard_meeting();


-- =========================================================
-- 22. ПРОВЕРКА ПРАВ ЧТЕНИЯ
-- =========================================================

CREATE FUNCTION pr.can_read_employee(
    p_actor UUID,
    p_employee UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = pg_catalog, pr, pg_temp
AS $$
    WITH RECURSIVE ancestors AS (
        SELECT
            d.id,
            d.parent_id,
            d.head_id
        FROM pr.departments d
        JOIN pr.users e ON e.department_id = d.id
        WHERE e.id = p_employee

        UNION

        SELECT
            parent.id,
            parent.parent_id,
            parent.head_id
        FROM pr.departments parent
        JOIN ancestors child
            ON parent.id = child.parent_id
    )
    SELECT EXISTS(
        SELECT 1
        FROM pr.users actor
        WHERE actor.id = p_actor
          AND actor.is_active
          AND EXISTS(
              SELECT 1
              FROM pr.users
              WHERE id = p_employee
          )
          AND (
              actor.id = p_employee
              OR actor.is_admin
              OR EXISTS(
                  SELECT 1
                  FROM ancestors
                  WHERE head_id = actor.id
              )
          )
    );
$$;


-- =========================================================
-- 23. ПРОВЕРКА ПРАВ УПРАВЛЕНИЯ РАЗВИТИЕМ
-- =========================================================

CREATE FUNCTION pr.can_manage_development(
    p_actor UUID,
    p_employee UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = pg_catalog, pr, pg_temp
AS $$
    SELECT
        p_actor <> p_employee
        AND pr.can_read_employee(p_actor, p_employee)
        AND EXISTS(
            SELECT 1
            FROM pr.users
            WHERE id = p_employee
              AND is_active
        );
$$;


-- =========================================================
-- 24. АТОМАРНОЕ ЗАВЕРШЕНИЕ ВСТРЕЧИ
-- =========================================================

CREATE FUNCTION pr.complete_meeting(
    p_actor UUID,
    p_meeting UUID,
    p_expected_version INTEGER,
    p_request_id UUID,
    p_occurred_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pr, pg_temp
AS $$
DECLARE
    v_meeting pr.meetings%ROWTYPE;

    v_element JSONB;
    v_array_name TEXT;

    v_item_id UUID;
    v_employee_id UUID;
    v_cancelled_at TIMESTAMPTZ;
    v_skill_name TEXT;

    v_outcome pr.skill_outcome;
    v_summary TEXT;
BEGIN
    PERFORM pr.lock_writes();

    IF p_request_id IS NULL OR p_occurred_at IS NULL THEN
        RAISE EXCEPTION
            'request_id and occurred_at are required'
            USING ERRCODE = '22023';
    END IF;

    SELECT *
    INTO v_meeting
    FROM pr.meetings
    WHERE id = p_meeting
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Meeting not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT pr.can_manage_development(
        p_actor,
        v_meeting.employee_id
    )
    THEN
        RAISE EXCEPTION 'Access denied'
            USING ERRCODE = '42501';
    END IF;

    -- Идемпотентный повтор успешно выполненного запроса.
    IF v_meeting.status = 'COMPLETED' THEN
        IF v_meeting.completion_request_id = p_request_id
           AND v_meeting.reviewer_id = p_actor
        THEN
            RETURN v_meeting.id;
        END IF;

        RAISE EXCEPTION 'Meeting already completed'
            USING ERRCODE = '23514';
    END IF;

    IF v_meeting.status NOT IN ('DRAFT', 'SCHEDULED') THEN
        RAISE EXCEPTION 'Invalid meeting status'
            USING ERRCODE = '23514';
    END IF;

    IF p_expected_version IS DISTINCT FROM v_meeting.version THEN
        RAISE EXCEPTION 'Meeting version conflict'
            USING ERRCODE = '40001';
    END IF;

    IF p_occurred_at > now() THEN
        RAISE EXCEPTION 'Meeting date cannot be in the future'
            USING ERRCODE = '22023';
    END IF;

    IF jsonb_typeof(v_meeting.draft_payload->'summary')
       IS DISTINCT FROM 'string'
    THEN
        RAISE EXCEPTION 'Summary must be a string'
            USING ERRCODE = '22023';
    END IF;

    v_summary := btrim(
        v_meeting.draft_payload->>'summary'
    );

    IF char_length(v_summary) NOT BETWEEN 1 AND 20000 THEN
        RAISE EXCEPTION 'Summary is empty or too long'
            USING ERRCODE = '22023';
    END IF;

    FOREACH v_array_name IN ARRAY ARRAY[
        'skills',
        'links',
        'problems'
    ]
    LOOP
        IF jsonb_typeof(
            coalesce(
                v_meeting.draft_payload->v_array_name,
                '[]'::jsonb
            )
        ) IS DISTINCT FROM 'array'
        THEN
            RAISE EXCEPTION '% must be an array', v_array_name
                USING ERRCODE = '22023';
        END IF;
    END LOOP;

    IF jsonb_array_length(
        coalesce(v_meeting.draft_payload->'skills', '[]'::jsonb)
    ) > 100
    OR jsonb_array_length(
        coalesce(v_meeting.draft_payload->'links', '[]'::jsonb)
    ) > 20
    OR jsonb_array_length(
        coalesce(v_meeting.draft_payload->'problems', '[]'::jsonb)
    ) > 50
    THEN
        RAISE EXCEPTION 'Too many meeting elements'
            USING ERRCODE = '22023';
    END IF;

    -- Результаты обсуждения навыков.
    FOR v_element IN
        SELECT value
        FROM jsonb_array_elements(
            coalesce(
                v_meeting.draft_payload->'skills',
                '[]'::jsonb
            )
        )
    LOOP
        IF jsonb_typeof(v_element) IS DISTINCT FROM 'object'
           OR jsonb_typeof(v_element->'plan_item_id')
                IS DISTINCT FROM 'string'
           OR jsonb_typeof(v_element->'outcome')
                IS DISTINCT FROM 'string'
        THEN
            RAISE EXCEPTION 'Invalid skill result'
                USING ERRCODE = '22023';
        END IF;

        IF v_element ? 'comment'
           AND jsonb_typeof(v_element->'comment')
                NOT IN ('string', 'null')
        THEN
            RAISE EXCEPTION 'Skill comment must be a string'
                USING ERRCODE = '22023';
        END IF;

        v_item_id := (v_element->>'plan_item_id')::UUID;
        v_outcome := (v_element->>'outcome')::pr.skill_outcome;

        SELECT
            p.employee_id,
            pi.cancelled_at,
            s.name
        INTO
            v_employee_id,
            v_cancelled_at,
            v_skill_name
        FROM pr.plan_items pi
        JOIN pr.learning_plans p ON p.id = pi.plan_id
        JOIN pr.skills s ON s.id = pi.skill_id
        WHERE pi.id = v_item_id
        FOR UPDATE OF pi;

        IF NOT FOUND
           OR v_employee_id <> v_meeting.employee_id
           OR v_cancelled_at IS NOT NULL
        THEN
            RAISE EXCEPTION
                'Plan item is missing, cancelled or belongs to another employee'
                USING ERRCODE = '23514';
        END IF;

        INSERT INTO pr.meeting_skills(
            meeting_id,
            plan_item_id,
            outcome,
            skill_name_snapshot,
            comment
        )
        VALUES(
            v_meeting.id,
            v_item_id,
            v_outcome,
            v_skill_name,
            v_element->>'comment'
        );

        IF v_outcome = 'CONFIRMED' THEN
            INSERT INTO pr.skill_confirmations(
                plan_item_id,
                meeting_id
            )
            VALUES(
                v_item_id,
                v_meeting.id
            );
        END IF;
    END LOOP;

    -- Ссылки.
    FOR v_element IN
        SELECT value
        FROM jsonb_array_elements(
            coalesce(
                v_meeting.draft_payload->'links',
                '[]'::jsonb
            )
        )
    LOOP
        IF jsonb_typeof(v_element) IS DISTINCT FROM 'object'
           OR jsonb_typeof(v_element->'title')
                IS DISTINCT FROM 'string'
           OR jsonb_typeof(v_element->'url')
                IS DISTINCT FROM 'string'
        THEN
            RAISE EXCEPTION 'Invalid link'
                USING ERRCODE = '22023';
        END IF;

        INSERT INTO pr.meeting_links(
            meeting_id,
            title,
            url
        )
        VALUES(
            v_meeting.id,
            btrim(v_element->>'title'),
            btrim(v_element->>'url')
        );
    END LOOP;

    -- Проблемы.
    FOR v_element IN
        SELECT value
        FROM jsonb_array_elements(
            coalesce(
                v_meeting.draft_payload->'problems',
                '[]'::jsonb
            )
        )
    LOOP
        IF jsonb_typeof(v_element) IS DISTINCT FROM 'object'
           OR jsonb_typeof(v_element->'comment')
                IS DISTINCT FROM 'string'
        THEN
            RAISE EXCEPTION 'Invalid problem'
                USING ERRCODE = '22023';
        END IF;

        IF v_element ? 'plan_item_id'
           AND jsonb_typeof(v_element->'plan_item_id')
                NOT IN ('string', 'null')
        THEN
            RAISE EXCEPTION 'Invalid problem plan_item_id'
                USING ERRCODE = '22023';
        END IF;

        v_item_id := (v_element->>'plan_item_id')::UUID;

        IF v_item_id IS NOT NULL THEN
            SELECT
                p.employee_id,
                pi.cancelled_at
            INTO
                v_employee_id,
                v_cancelled_at
            FROM pr.plan_items pi
            JOIN pr.learning_plans p ON p.id = pi.plan_id
            WHERE pi.id = v_item_id
            FOR UPDATE OF pi;

            IF NOT FOUND
               OR v_employee_id <> v_meeting.employee_id
               OR v_cancelled_at IS NOT NULL
            THEN
                RAISE EXCEPTION 'Invalid problem plan item'
                    USING ERRCODE = '23514';
            END IF;
        END IF;

        INSERT INTO pr.problems(
            employee_id,
            meeting_id,
            plan_item_id,
            comment,
            created_by
        )
        VALUES(
            v_meeting.employee_id,
            v_meeting.id,
            v_item_id,
            btrim(v_element->>'comment'),
            p_actor
        );
    END LOOP;

    -- Завершение встречи.
    UPDATE pr.meetings
    SET
        status = 'COMPLETED',
        reviewer_id = p_actor,
        occurred_at = p_occurred_at,
        summary = v_summary,
        completion_request_id = p_request_id,
        draft_payload = '{}'::jsonb
    WHERE id = v_meeting.id;

    INSERT INTO pr.audit_events(
        actor_id,
        action,
        entity_type,
        entity_id
    )
    VALUES(
        p_actor,
        'MEETING_COMPLETED',
        'meeting',
        v_meeting.id
    );

    RETURN v_meeting.id;
END;
$$;


-- =========================================================
-- 25. ЗАКРЫТИЕ ПРОБЛЕМЫ
-- =========================================================

CREATE FUNCTION pr.resolve_problem(
    p_actor UUID,
    p_problem UUID,
    p_comment TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pr, pg_temp
AS $$
DECLARE
    v_problem pr.problems%ROWTYPE;
BEGIN
    PERFORM pr.lock_writes();

    SELECT *
    INTO v_problem
    FROM pr.problems
    WHERE id = p_problem
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Problem not found'
            USING ERRCODE = 'P0002';
    END IF;

    IF NOT pr.can_manage_development(
        p_actor,
        v_problem.employee_id
    )
    THEN
        RAISE EXCEPTION 'Access denied'
            USING ERRCODE = '42501';
    END IF;

    IF v_problem.status = 'RESOLVED' THEN
        RETURN v_problem.id;
    END IF;

    IF p_comment IS NULL
       OR char_length(btrim(p_comment)) NOT BETWEEN 1 AND 5000
    THEN
        RAISE EXCEPTION 'Resolution comment is required'
            USING ERRCODE = '22023';
    END IF;

    UPDATE pr.problems
    SET
        status = 'RESOLVED',
        resolved_by = p_actor,
        resolved_at = now(),
        resolution_comment = btrim(p_comment)
    WHERE id = v_problem.id;

    INSERT INTO pr.audit_events(
        actor_id,
        action,
        entity_type,
        entity_id
    )
    VALUES(
        p_actor,
        'PROBLEM_RESOLVED',
        'problem',
        v_problem.id
    );

    RETURN v_problem.id;
END;
$$;


-- =========================================================
-- 26. ПРЕДСТАВЛЕНИЕ ПРОФИЛЕЙ
-- =========================================================

CREATE VIEW pr.employee_profiles
WITH (security_invoker = true)
AS
SELECT
    u.id,
    u.login,
    u.full_name,

    u.direction_id,
    direction.name AS direction_name,

    u.department_id,
    department.name AS department_name,

    u.is_admin,
    u.is_active,

    CASE
        WHEN department.head_id = u.id
            THEN parent.head_id
        ELSE department.head_id
    END AS manager_id

FROM pr.users u

JOIN pr.directions direction
    ON direction.id = u.direction_id

JOIN pr.departments department
    ON department.id = u.department_id

LEFT JOIN pr.departments parent
    ON parent.id = department.parent_id;


-- =========================================================
-- 27. ДАННЫЕ ДЛЯ АНАЛИТИКИ
-- =========================================================

CREATE VIEW pr.plan_item_facts
WITH (security_invoker = true)
AS
SELECT
    pi.id AS plan_item_id,

    p.id AS plan_id,
    p.employee_id,
    p.year,

    pi.skill_id,
    s.name AS skill_name,

    pi.due_date,
    pi.cancelled_at,

    c.meeting_id AS confirmation_meeting_id,

    m.occurred_at AS confirmed_at,
    m.reviewer_id AS confirmed_by

FROM pr.plan_items pi

JOIN pr.learning_plans p
    ON p.id = pi.plan_id

JOIN pr.skills s
    ON s.id = pi.skill_id

LEFT JOIN pr.skill_confirmations c
    ON c.plan_item_id = pi.id

LEFT JOIN pr.meetings m
    ON m.id = c.meeting_id
   AND m.status = 'COMPLETED';


CREATE VIEW pr.plan_progress
WITH (security_invoker = true)
AS
SELECT
    p.id AS plan_id,
    p.employee_id,
    p.year,

    count(f.plan_item_id) AS total_items,

    count(f.plan_item_id) FILTER(
        WHERE f.confirmed_at IS NOT NULL
    ) AS confirmed_items,

    round(
        100.0
        * count(f.plan_item_id) FILTER(
            WHERE f.confirmed_at IS NOT NULL
        )
        / nullif(count(f.plan_item_id), 0),
        1
    ) AS progress_percent

FROM pr.learning_plans p

LEFT JOIN pr.plan_item_facts f
    ON f.plan_id = p.id
   AND f.cancelled_at IS NULL

GROUP BY p.id, p.employee_id, p.year;


-- =========================================================
-- 28. ПРАВА SQL-ПОЛЬЗОВАТЕЛЯ ПРИЛОЖЕНИЯ
-- =========================================================

GRANT USAGE ON SCHEMA pr TO pr_app;

GRANT USAGE ON TYPE
    pr.meeting_status,
    pr.skill_outcome,
    pr.problem_status
TO pr_app;

-- SQL-пользователь обслуживает доверенный backend.
-- Пользовательскую фильтрацию чтений выполняет backend.
GRANT SELECT ON ALL TABLES IN SCHEMA pr TO pr_app;

GRANT INSERT, UPDATE
ON
    pr.directions,
    pr.skills,
    pr.users,
    pr.departments
TO pr_app;

GRANT DELETE
ON pr.departments
TO pr_app;

GRANT INSERT
ON pr.learning_plans
TO pr_app;

GRANT INSERT
ON pr.plan_items
TO pr_app;

GRANT UPDATE(
    due_date,
    cancelled_at,
    cancellation_reason
)
ON pr.plan_items
TO pr_app;

GRANT INSERT(
    id,
    employee_id,
    created_by,
    status,
    scheduled_at,
    draft_payload
)
ON pr.meetings
TO pr_app;

GRANT UPDATE(
    status,
    scheduled_at,
    draft_payload
)
ON pr.meetings
TO pr_app;

-- Прямых прав записи в подтверждения, результаты,
-- ссылки, проблемы и аудит приложение не получает.

REVOKE EXECUTE
ON ALL FUNCTIONS IN SCHEMA pr
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION pr.lock_writes()
TO pr_app;

GRANT EXECUTE
ON FUNCTION pr.can_read_employee(UUID, UUID)
TO pr_app;

GRANT EXECUTE
ON FUNCTION pr.can_manage_development(UUID, UUID)
TO pr_app;

GRANT EXECUTE
ON FUNCTION pr.complete_meeting(
    UUID,
    UUID,
    INTEGER,
    UUID,
    TIMESTAMPTZ
)
TO pr_app;

GRANT EXECUTE
ON FUNCTION pr.resolve_problem(
    UUID,
    UUID,
    TEXT
)
TO pr_app;

COMMIT;