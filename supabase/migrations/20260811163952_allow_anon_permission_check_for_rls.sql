-- Public read policies share a single expression with manager draft access.
-- For an anonymous request this private helper returns false because auth.uid()
-- is null; EXECUTE is required only so PostgreSQL can evaluate that branch.
grant execute on function app_private.has_permission(text) to anon;
