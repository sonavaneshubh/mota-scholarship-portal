-- =============================================================================
-- Allow 'demo_admin' in public.profiles.role
-- =============================================================================
-- What was wrong
--   public.profiles.role carries an inline check constraint, which Postgres
--   auto-names `profiles_role_check`:
--
--     role text not null default 'applicant' check (role in ('applicant', 'admin'))
--
--   That pair is declared in 20260925120000_create_profiles.sql and repeated in
--   20260926090000_applicant_profile_extend.sql. No migration has ever widened it.
--
--   So promoting the Demo Admin fails at the constraint, before any policy is even
--   consulted:
--
--     ERROR: 23514: new row for relation "profiles" violates check constraint
--     "profiles_role_check"
--
--   and the account stays 'applicant' forever, because that is the only role the
--   signup trigger (20260927000240) will ever assign it. Note the failure is
--   invisible from the client: it is a role update the Demo Admin cannot perform
--   on itself, so it has to be done by an operator in the SQL Editor, and until
--   this lands the operator sees only the 23514.
--
-- Why the role list is read at runtime instead of hardcoded
--   Writing `check (role in ('applicant', 'admin', 'demo_admin'))` would be a
--   guess, and the guess is not safe to guess twice.
--
--   * 20260927000000_create_scholarship_master_tables.sql grants administrative
--     rights with `role in ('admin', 'super_admin')`. 'super_admin' is therefore a
--     role this codebase already reasons about, but the constraint does not list
--     it. If a live database has had it added by hand, hardcoding the source list
--     would silently drop it here and break those policies for every super admin.
--   * profiles predates the migration folder in practice and this project has
--     hand-edited schema in the SQL Editor before, so the live constraint is not
--     guaranteed to be byte-identical to the file in this repository.
--
--   So the allowed set is taken from the live constraint via pg_get_constraintdef
--   and `demo_admin` is added to whatever is actually there. Every role that is
--   valid right now stays valid afterwards; nothing is removed.
--
-- Why one atomic ALTER TABLE
--   `drop constraint ..., add constraint ...` in a single ALTER TABLE, not two
--   statements. The single statement takes the ACCESS EXCLUSIVE lock once and
--   re-checks the new predicate inside it, so the constraint is never absent, not
--   even for an instant, and the change cannot half-apply if the ADD is rejected.
--   Two separate statements would leave a window where profiles.role is
--   unconstrained for any concurrent session, which is the one thing this
--   migration must never do.
--
-- Why validation cannot fail
--   CHECK constraints are enforced against existing rows when added, so it is
--   worth being explicit that this one cannot fail here: the new predicate is a
--   strict superset of the old one, so every row that satisfied the previous
--   constraint still satisfies the next. Adding a permitted value cannot
--   invalidate a stored one. No data is touched either way.
--
-- What this migration deliberately does not do
--   * It does not touch any RLS policy. The Demo Admin's visibility is decided by
--     the submitted-only views in 20260927000270 and by the storage gate in
--     20260927000280; this file only makes the role *representable*.
--   * It does not add a grant on any base table. Widening the constraint grants
--     nothing: after the UPDATE the Demo Admin still has no direct SELECT on
--     applications or applicant_documents, and reads through the views as before.
--   * It does not modify the signup trigger, so new self-registered users are
--     still created as 'applicant'.
--   * It does not change the applicant account, create data, or hold any
--     service-role credential.
--   * It keeps the original constraint name, so anything that references the
--     constraint by name keeps working and future error messages stay familiar.
-- =============================================================================

do $$
declare
  v_con      record;
  v_roles    text[] := '{}';
  v_quoted   text;
  v_new_def  text;
  v_is_valid boolean;
  v_mismatch text;
begin
  -- ---------------------------------------------------------------------------
  -- 1. Find the existing check constraint, and confirm it is the role check
  -- ---------------------------------------------------------------------------
  --   The name is preferred, but the name is only a Postgres convention for an
  --   inline column constraint, so the column test is what actually establishes
  --   that this is the right constraint. Both must reference the role column and
  --   nothing else: without that, a match on a different check would be rebuilt
  --   from the wrong literals and the role check would be left untouched.
  select c.conname,
         c.convalidated,
         pg_get_constraintdef(c.oid) as def
    into v_con
    from pg_constraint c
    join pg_class t     on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
     and t.relname  = 'profiles'
     and c.contype  = 'c'
     and exists (select 1
                   from pg_attribute a
                  where a.attrelid   = c.conrelid
                    and a.attnum      = any (c.conkey)
                    and a.attname     = 'role'
                    and not a.attisdropped)
     and not exists (select 1
                     from pg_attribute a
                    where a.attrelid   = c.conrelid
                      and a.attnum      = any (c.conkey)
                      and a.attname     <> 'role'
                      and not a.attisdropped)
     order by (c.conname = 'profiles_role_check') desc, c.conname
     limit 1;

  if not found then
    raise exception
      'No check constraint on public.profiles.role was found, so there is nothing to widen. Expected a constraint named profiles_role_check. Inspect it manually with: select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = ''public.profiles''::regclass and contype = ''c'';';
  end if;

  -- ---------------------------------------------------------------------------
  -- 2. Recover the live role list from the constraint definition
  -- ---------------------------------------------------------------------------
  --   pg_get_constraintdef() normalises the source expression, so
  --   `role in ('applicant', 'admin')` comes back as
  --   `CHECK ((role = ANY (ARRAY['applicant'::text, 'admin'::text])))`.
  --   The literals are therefore recovered from the normalised text rather than
  --   from the original source, which is the point: this reads the database, not
  --   this repository.
  --
  --   The capture group is `((?:[^']|'')*)`, so an embedded quote survives as a
  --   doubled ''. The guard below rejects anything it did not expect rather than
  --   rebuilding a constraint from misread text.
  for v_mismatch in
    select (regexp_matches(v_con.def, '''((?:[^'']|'''')*)''', 'g'))[1]
  loop
    if v_mismatch !~ '^[A-Za-z0-9_]+$' then
      raise exception
        'Refusing to rewrite public.% on constraint %: the recovered role % is not a plain identifier, so the constraint definition was not understood. Definition was: %',
        'profiles', v_con.conname, quote_literal(v_mismatch), v_con.def;
    end if;

    if not (v_mismatch = any (v_roles)) then
      v_roles := array_append(v_roles, v_mismatch);
    end if;
  end loop;

  if coalesce(array_length(v_roles, 1), 0) = 0 then
    raise exception
      'No role literals could be read from % on public.profiles, so the constraint was left untouched rather than replaced with a guessed list. Definition was: %',
      v_con.conname, v_con.def;
  end if;

  --   The one shape that must never be rewritten this way is a check that is not
  --   a positive allow-list. `role <> 'contractor'` also yields exactly one
  --   string literal, and rebuilding that as `role = ANY (ARRAY['contractor',
  --   'demo_admin'])` would invert it and leave only two roles valid. So the
  --   operator is required to be a membership test, not an inequality. Postgres
  --   normalises `in` to `= ANY`, so both spellings are accepted.
  if v_con.def !~ '=\s*ANY|\bIN\b' or v_con.def ~ '<>|!=' then
    raise exception
      'The check constraint % on public.profiles is not a positive allow-list, so it was left untouched rather than rewritten. Add demo_admin to it by hand. Definition was: %',
      v_con.conname, v_con.def;
  end if;

  raise notice 'Existing roles allowed by %: %', v_con.conname, array_to_string(v_roles, ', ');

  -- ---------------------------------------------------------------------------
  -- 3. Add demo_admin, and only if it is missing
  -- ---------------------------------------------------------------------------
  --   The membership test is what makes this file re-runnable: applied twice, the
  --   second run takes no action at all rather than raising a duplicate-role
  --   error or appending the value twice.
  if 'demo_admin' = any (v_roles) then
    raise notice 'Role demo_admin is already allowed by %. No change made.', v_con.conname;
    return;
  end if;

  v_roles := array_append(v_roles, 'demo_admin');

  -- quote_literal() escapes each value, and the ::text cast is added because the
  -- column is text and the original constraint compared against text literals.
  -- Without the cast a bare literal is untyped and the comparison would depend on
  -- the column's type rather than on the column and the literal agreeing.
  select string_agg(quote_literal(r) || '::text', ', ' order by ord)
    into v_quoted
    from unnest(v_roles) with ordinality as u(r, ord);

  v_new_def := 'CHECK (role = ANY (ARRAY[' || v_quoted || '::text]))';

  v_is_valid := v_con.convalidated;

  -- ---------------------------------------------------------------------------
  -- 4. Replace the constraint atomically
  -- ---------------------------------------------------------------------------
  --   NOT VALID is carried over only if the original had it, so this migration
  --   does not quietly upgrade an unvalidated constraint to a validated one and
  --   turn a cheap re-add into a full table scan. In practice the inline
  --   declaration produced a validated constraint, so this branch is not taken.
  execute format(
    'alter table public.profiles drop constraint %I, add constraint %I %s%s',
    v_con.conname,
    v_con.conname,
    v_new_def,
    case when v_is_valid then '' else ' not valid' end
  );

  raise notice 'Constraint % on public.profiles now allows: %', v_con.conname, array_to_string(v_roles, ', ');

end $$;

notify pgrst, 'reload schema';
