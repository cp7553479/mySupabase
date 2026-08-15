-- The owner predicate must be available during INSERT ... RETURNING so a
-- customer can receive the newly-created draft inquiry identifier.
alter policy inquiries_select
on public.inquiries
using (
  customer_user_id = (select auth.uid())
  or app_private.can_access_inquiry(id)
);
