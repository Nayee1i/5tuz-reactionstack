# База данных Performance Review

PostgreSQL 16. Схема: pr. Backend: Node.js + pg.

## Первый запуск

1. Скопировать корневой .env.example в .env.
2. Заменить значения паролей и JWT_SECRET.
   DEMO_PASSWORD: от 12 до 72 байт.
3. Из корня проекта выполнить:

```sh
docker compose up -d postgres
docker compose ps -a
```

Дождаться healthy, затем:

```sh
docker compose exec postgres sh
```

Следующие команды выполняются внутри контейнера:

```sh
psql -v ON_ERROR_STOP=1 -v app_password="$APP_DB_PASSWORD" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /scripts/001_schema.sql
```

Только после успешного COMMIT загрузить демо-данные:

```sh
psql -v ON_ERROR_STOP=1 -v demo_password="$DEMO_PASSWORD" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /scripts/002_seed.sql
```

Проверочный тест на свежих демо-данных:

```sh
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /scripts/003_test.sql
```

Ожидаемый результат: ALL TESTS PASSED.
ROLLBACK в конце теста намеренный.

```sh
exit
```

001 и 002 запускать только один раз на новой базе.
При первой ошибке остановиться.

## Подключение backend внутри Compose

- Host: postgres
- Port: 5432
- Database: tomsk_org
- User: pr_app
- Password: APP_DB_PASSWORD из .env
- Schema: pr

DATABASE_URL уже передаётся backend через docker-compose.yml.

Порт БД на Windows не опубликован.
localhost с другого компьютера не ведёт к этой базе.
Git хранит скрипты, а не текущее содержимое БД.

## Демо-аккаунты

admin, backend.lead, anna, frontend.lead, api.lead, oleg.

Пароль: DEMO_PASSWORD из .env.
Хеши: bcrypt. Backend должен использовать совместимую библиотеку.

## Обязательные правила backend

- actor_id получать только из проверенной серверной сессии.
- Чтение проверять через pr.can_read_employee(actor_id, employee_id).
- Управление развитием — pr.can_manage_development(actor_id, employee_id).
- Административные операции разрешать только активному администратору.
- Ограничивать списки, встречи и аналитику по доступу.
- password_hash не возвращать в API.
- RLS не настроен: база доступна только доверенному backend.
- Завершать встречи через pr.complete_meeting.
- Закрывать проблемы через pr.resolve_problem.
- Многошаговые изменения выполнять на одном соединении:
  BEGIN → SELECT pr.lock_writes() → проверка прав → изменения → COMMIT.
  Уровень изоляции: READ COMMITTED.

## Ограничения

Один сотрудник руководит максимум одним подразделением.
Завершённые протоколы неизменяемы; отзыв подтверждения не реализован.
Материалы встречи — ссылки, без загрузки файлов.
Аудит пока фиксирует завершение встреч и закрытие проблем.

Не удалять Docker volumes для исправления обычных ошибок.
Изменение пароля в .env не меняет пароль уже созданной роли PostgreSQL.