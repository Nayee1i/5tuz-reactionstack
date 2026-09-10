\set ON_ERROR_STOP on

BEGIN;

SET LOCAL ROLE pr_app;

DO $$
DECLARE
    v_meeting_id UUID;
    v_bad_meeting_id UUID;

    v_request_id UUID := gen_random_uuid();

    v_problem_id UUID;

    v_count BIGINT;
    v_progress NUMERIC;

    v_rejected BOOLEAN;
BEGIN
    -- =====================================================
    -- 1. ПРАВА
    -- =====================================================

    IF NOT pr.can_manage_development(
        '20000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000003'
    )
    THEN
        RAISE EXCEPTION
            'TEST FAILED: leader cannot manage direct employee';
    END IF;

    IF NOT pr.can_manage_development(
        '20000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000006'
    )
    THEN
        RAISE EXCEPTION
            'TEST FAILED: leader cannot manage nested employee';
    END IF;

    IF pr.can_manage_development(
        '20000000-0000-0000-0000-000000000002',
        '20000000-0000-0000-0000-000000000002'
    )
    THEN
        RAISE EXCEPTION
            'TEST FAILED: self-management is allowed';
    END IF;

    IF pr.can_read_employee(
        '20000000-0000-0000-0000-000000000004',
        '20000000-0000-0000-0000-000000000003'
    )
    THEN
        RAISE EXCEPTION
            'TEST FAILED: sibling branch can read Anna';
    END IF;

    IF NOT pr.can_read_employee(
        '20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000003'
    )
    THEN
        RAISE EXCEPTION
            'TEST FAILED: employee cannot read own profile';
    END IF;


    -- =====================================================
    -- 2. ДУБЛЬ НАВЫКА В ПЛАНЕ
    -- =====================================================

    v_rejected := false;

    BEGIN
        INSERT INTO pr.plan_items(
            plan_id,
            skill_id,
            due_date
        )
        VALUES(
            '50000000-0000-0000-0000-000000000001',
            '40000000-0000-0000-0000-000000000001',
            current_date
        );
    EXCEPTION
        WHEN unique_violation THEN
            v_rejected := true;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'TEST FAILED: duplicate plan item accepted';
    END IF;


    -- =====================================================
    -- 3. СОЗДАНИЕ ЧЕРНОВИКА
    -- =====================================================

    INSERT INTO pr.meetings(
        employee_id,
        created_by,
        draft_payload
    )
    VALUES(
        '20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000002',
        '{
          "summary": "Проверили практическое применение PostgreSQL.",
          "skills": [
            {
              "plan_item_id": "60000000-0000-0000-0000-000000000001",
              "outcome": "CONFIRMED",
              "comment": "Навык подтверждён"
            }
          ],
          "links": [
            {
              "title": "Практическая работа",
              "url": "https://example.com/postgresql"
            }
          ],
          "problems": [
            {
              "plan_item_id": "60000000-0000-0000-0000-000000000002",
              "comment": "Нужна дополнительная практика Docker"
            }
          ]
        }'::jsonb
    )
    RETURNING id INTO v_meeting_id;


    -- =====================================================
    -- 4. ЗАВЕРШЕНИЕ ВСТРЕЧИ
    -- =====================================================

    PERFORM pr.complete_meeting(
        '20000000-0000-0000-0000-000000000002',
        v_meeting_id,
        1,
        v_request_id,
        now()
    );


    -- =====================================================
    -- 5. ПОВТОР ТОГО ЖЕ ЗАПРОСА
    -- =====================================================

    PERFORM pr.complete_meeting(
        '20000000-0000-0000-0000-000000000002',
        v_meeting_id,
        1,
        v_request_id,
        now()
    );

    SELECT count(*)
    INTO v_count
    FROM pr.skill_confirmations c
    WHERE c.meeting_id = v_meeting_id;

    IF v_count <> 1 THEN
        RAISE EXCEPTION
            'TEST FAILED: expected 1 confirmation, got %',
            v_count;
    END IF;


    -- =====================================================
    -- 6. ПРОГРЕСС 1 ИЗ 3
    -- =====================================================

    SELECT progress_percent
    INTO v_progress
    FROM pr.plan_progress
    WHERE plan_id =
        '50000000-0000-0000-0000-000000000001';

    IF v_progress IS DISTINCT FROM 33.3::NUMERIC THEN
        RAISE EXCEPTION
            'TEST FAILED: expected progress 33.3, got %',
            v_progress;
    END IF;


    -- =====================================================
    -- 7. ЗАКРЫТИЕ ПРОБЛЕМЫ
    -- =====================================================

    SELECT id
    INTO v_problem_id
    FROM pr.problems
    WHERE meeting_id = v_meeting_id;

    IF v_problem_id IS NULL THEN
        RAISE EXCEPTION
            'TEST FAILED: problem was not created';
    END IF;

    PERFORM pr.resolve_problem(
        '20000000-0000-0000-0000-000000000002',
        v_problem_id,
        'Выделили время и подготовили практическое задание'
    );

    IF NOT EXISTS(
        SELECT 1
        FROM pr.problems
        WHERE id = v_problem_id
          AND status = 'RESOLVED'
    )
    THEN
        RAISE EXCEPTION
            'TEST FAILED: problem was not resolved';
    END IF;


    -- =====================================================
    -- 8. ЗАПРЕТ ПРЯМОЙ ЗАПИСИ ПОДТВЕРЖДЕНИЯ
    -- =====================================================

    v_rejected := false;

    BEGIN
        INSERT INTO pr.skill_confirmations(
            plan_item_id,
            meeting_id
        )
        VALUES(
            '60000000-0000-0000-0000-000000000002',
            v_meeting_id
        );
    EXCEPTION
        WHEN insufficient_privilege THEN
            v_rejected := true;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'TEST FAILED: direct confirmation insert is allowed';
    END IF;


    -- =====================================================
    -- 9. ОШИБОЧНОЕ ЗАВЕРШЕНИЕ ДОЛЖНО ОТКАТИТЬ ВСЁ
    -- Сначала подтверждается Docker,
    -- затем встречается опасная ссылка.
    -- Подтверждение Docker не должно остаться.
    -- =====================================================

    INSERT INTO pr.meetings(
        employee_id,
        created_by,
        draft_payload
    )
    VALUES(
        '20000000-0000-0000-0000-000000000003',
        '20000000-0000-0000-0000-000000000002',
        '{
          "summary": "Проверка атомарности.",
          "skills": [
            {
              "plan_item_id": "60000000-0000-0000-0000-000000000002",
              "outcome": "CONFIRMED"
            }
          ],
          "links": [
            {
              "title": "Некорректная ссылка",
              "url": "javascript:alert(1)"
            }
          ],
          "problems": []
        }'::jsonb
    )
    RETURNING id INTO v_bad_meeting_id;

    v_rejected := false;

    BEGIN
        PERFORM pr.complete_meeting(
            '20000000-0000-0000-0000-000000000002',
            v_bad_meeting_id,
            1,
            gen_random_uuid(),
            now()
        );
    EXCEPTION
        WHEN check_violation THEN
            v_rejected := true;
    END;

    IF NOT v_rejected THEN
        RAISE EXCEPTION
            'TEST FAILED: invalid link was accepted';
    END IF;

    IF EXISTS(
        SELECT 1
        FROM pr.skill_confirmations
        WHERE plan_item_id =
            '60000000-0000-0000-0000-000000000002'
    )
    THEN
        RAISE EXCEPTION
            'TEST FAILED: partial confirmation survived rollback';
    END IF;

    IF EXISTS(
        SELECT 1
        FROM pr.meeting_skills
        WHERE meeting_id = v_bad_meeting_id
    )
    THEN
        RAISE EXCEPTION
            'TEST FAILED: partial meeting results survived rollback';
    END IF;

    IF NOT EXISTS(
        SELECT 1
        FROM pr.meetings
        WHERE id = v_bad_meeting_id
          AND status = 'DRAFT'
    )
    THEN
        RAISE EXCEPTION
            'TEST FAILED: failed meeting is not a draft';
    END IF;

    RAISE NOTICE 'ALL TESTS PASSED';
END;
$$;

ROLLBACK;