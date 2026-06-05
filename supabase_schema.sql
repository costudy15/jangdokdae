-- ════════════════════════════════════════════════════════════
--  장독대 국어 · 개념어 학습기 — Supabase 스키마
--  SQL Editor 에 전체를 붙여넣고 Run 하세요. 다시 실행해도 안전합니다.
--  (개념어 298개 콘텐츠는 앱에 내장되어 있어 DB에 넣지 않습니다.)
-- ════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- 학생
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  name text not null, school text, grade text not null,
  password_hash text not null, created_at timestamptz default now()
);

-- 풀이 기록(이벤트 로그) — 숙련도·복습·오답·대시보드를 모두 여기서 계산
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  mode text not null,            -- 구별 | 적용 | 해석
  term_id text not null,         -- 개념 id (앱 내장 데이터 기준)
  term_name text not null,
  correct boolean not null,
  picked_term text,              -- 오답 시 고른 개념(혼동 분석용)
  hint_used boolean default false,
  latency_ms int,                -- 풀이 시간(ms, 적응형 숙련도 계산용)
  created_at timestamptz default now()
);
create index if not exists attempts_student_idx on attempts(student_id);

-- 강사 비밀번호 보관
create table if not exists app_config (key text primary key, value text);
insert into app_config(key, value)
values ('teacher_pw', crypt('jangdokdae', gen_salt('bf')))
on conflict (key) do nothing;   -- 기본 비번: jangdokdae (반드시 변경하세요, 맨 아래 참고)

-- ── 보안 ──
alter table students enable row level security;
alter table attempts enable row level security;
alter table app_config enable row level security;   -- 직접 접근 차단(함수로만)

grant select, insert, delete on attempts to anon;
drop policy if exists "att_sel" on attempts;
drop policy if exists "att_ins" on attempts;
drop policy if exists "att_del" on attempts;
create policy "att_sel" on attempts for select to anon using (true);
create policy "att_ins" on attempts for insert to anon with check (true);
create policy "att_del" on attempts for delete to anon using (true);

-- ── 함수 (search_path 에 extensions 포함: crypt/gen_salt 사용) ──
create or replace function list_students()
returns table(id uuid, name text, school text, grade text)
language sql security definer set search_path = public, extensions as $$
  select id, name, school, grade from students order by created_at;
$$;

create or replace function create_student(p_name text, p_school text, p_grade text, p_password text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare new_id uuid;
begin
  insert into students(name, school, grade, password_hash)
  values (p_name, p_school, p_grade, crypt(p_password, gen_salt('bf')))
  returning id into new_id; return new_id;
end; $$;

create or replace function login_student(p_id uuid, p_password text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists(select 1 from students where id = p_id and password_hash = crypt(p_password, password_hash));
$$;

create or replace function delete_student(p_id uuid)
returns void language sql security definer set search_path = public, extensions as $$
  delete from students where id = p_id;
$$;

create or replace function verify_teacher(p_password text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists(select 1 from app_config where key = 'teacher_pw' and value = crypt(p_password, value));
$$;

grant execute on function list_students()                     to anon;
grant execute on function create_student(text,text,text,text) to anon;
grant execute on function login_student(uuid,text)            to anon;
grant execute on function delete_student(uuid)                to anon;
grant execute on function verify_teacher(text)                to anon;

-- ── 강사 비밀번호 변경 방법 ──
-- 아래 한 줄에서 '새비밀번호' 만 바꿔 실행하세요.
-- update app_config set value = crypt('새비밀번호', gen_salt('bf')) where key = 'teacher_pw';
