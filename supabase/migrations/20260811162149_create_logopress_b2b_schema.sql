-- LogoPress B2B product catalogue, account, inquiry, quote, and content model.
-- Supplier ownership, inventory, payment, order fulfilment, and shipping are
-- intentionally outside this migration's scope.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create schema if not exists app_private;

-- Identity and authorization -------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  locale text not null default 'en-US',
  account_status text not null default 'pending'
    check (account_status in ('pending', 'active', 'suspended')),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  legal_name text,
  website text,
  industry text,
  tax_identifier text,
  billing_email text,
  phone text,
  status text not null default 'active'
    check (status in ('active', 'suspended', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_addresses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  address_type text not null
    check (address_type in ('billing', 'shipping', 'office', 'other')),
  label text,
  contact_name text,
  company_name text,
  line1 text not null,
  line2 text,
  city text not null,
  state_region text,
  postal_code text,
  country_code text not null check (char_length(country_code) = 2),
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index organization_addresses_one_default_per_type
  on public.organization_addresses (organization_id, address_type)
  where is_default;

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role text not null default 'member'
    check (membership_role in ('owner', 'admin', 'buyer', 'member')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'suspended', 'left')),
  job_title text,
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_idx
  on public.organization_members (user_id, status);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  scope text not null default 'system' check (scope in ('system', 'organization')),
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now()
);

create unique index user_roles_global_unique
  on public.user_roles (user_id, role_id)
  where organization_id is null;

create unique index user_roles_organization_unique
  on public.user_roles (user_id, role_id, organization_id)
  where organization_id is not null;

create index user_roles_user_idx on public.user_roles (user_id);

-- Controlled vocabularies and catalogue -------------------------------------

create table public.currencies (
  code text primary key check (code ~ '^[A-Z]{3}$'),
  name text not null,
  symbol text,
  decimal_places smallint not null default 2
    check (decimal_places between 0 and 4),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.price_codes (
  code text primary key,
  name text not null,
  description text,
  multiplier numeric(12,6) check (multiplier is null or multiplier >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.taxonomies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_hierarchical boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.taxonomy_terms (
  id uuid primary key default gen_random_uuid(),
  taxonomy_id uuid not null references public.taxonomies(id) on delete cascade,
  parent_id uuid,
  code text not null,
  slug text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, taxonomy_id),
  unique (taxonomy_id, code),
  unique (taxonomy_id, slug),
  foreign key (parent_id, taxonomy_id)
    references public.taxonomy_terms(id, taxonomy_id) on delete cascade,
  check (parent_id is null or parent_id <> id)
);

create index taxonomy_terms_parent_idx
  on public.taxonomy_terms (taxonomy_id, parent_id, sort_order);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  product_number text not null unique,
  slug text not null unique,
  name text not null,
  short_description text,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  default_currency_code text not null default 'USD'
    references public.currencies(code),
  minimum_order_quantity bigint
    check (minimum_order_quantity is null or minimum_order_quantity > 0),
  production_lead_time_min_days integer
    check (production_lead_time_min_days is null or production_lead_time_min_days >= 0),
  production_lead_time_max_days integer
    check (production_lead_time_max_days is null or production_lead_time_max_days >= 0),
  customizable boolean not null default true,
  sample_available boolean not null default false,
  proof_available boolean not null default false,
  design_support_available boolean not null default false,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, product_number),
  check (
    production_lead_time_max_days is null
    or production_lead_time_min_days is null
    or production_lead_time_max_days >= production_lead_time_min_days
  )
);

create index products_status_published_idx
  on public.products (status, published_at desc);

create table public.product_translations (
  product_id uuid not null references public.products(id) on delete cascade,
  locale text not null,
  name text not null,
  short_description text,
  description text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, locale)
);

create table public.product_taxonomy_terms (
  product_id uuid not null references public.products(id) on delete cascade,
  taxonomy_term_id uuid not null references public.taxonomy_terms(id) on delete cascade,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, taxonomy_term_id)
);

create index product_taxonomy_terms_term_idx
  on public.product_taxonomy_terms (taxonomy_term_id, product_id);

create table public.product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  specification_group text,
  name text not null,
  value text not null,
  unit text,
  locale text,
  is_filterable boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_specifications_product_idx
  on public.product_specifications (product_id, sort_order);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  media_kind text not null
    check (media_kind in ('image', 'document', 'video', 'other')),
  bucket_id text,
  object_path text,
  external_url text,
  filename text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  title text,
  alt_text text,
  locale text,
  is_public boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (bucket_id is not null and object_path is not null and external_url is null)
    or (bucket_id is null and object_path is null and external_url is not null)
  ),
  unique (bucket_id, object_path)
);

create table public.product_media (
  product_id uuid not null references public.products(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  usage_type text not null default 'gallery'
    check (usage_type in ('primary', 'gallery', 'document', 'specification', 'video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, media_asset_id, usage_type)
);

create unique index product_media_one_primary
  on public.product_media (product_id)
  where usage_type = 'primary';

create table public.product_compliance_records (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  compliance_term_id uuid references public.taxonomy_terms(id) on delete set null,
  name text not null,
  reference_number text,
  issuer text,
  status text not null default 'active'
    check (status in ('pending', 'active', 'expired', 'withdrawn')),
  issued_on date,
  expires_on date,
  certificate_media_asset_id uuid references public.media_assets(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_on is null or issued_on is null or expires_on >= issued_on)
);

create index product_compliance_records_product_idx
  on public.product_compliance_records (product_id, status, expires_on);

create table public.product_related_products (
  product_id uuid not null references public.products(id) on delete cascade,
  related_product_id uuid not null references public.products(id) on delete cascade,
  relationship_type text not null default 'related'
    check (relationship_type in ('related', 'alternative', 'accessory')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, related_product_id, relationship_type),
  check (product_id <> related_product_id)
);

create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  input_type text not null default 'single_select'
    check (input_type in ('single_select', 'multi_select', 'text', 'number', 'file')),
  is_required boolean not null default false,
  minimum_selections smallint not null default 0 check (minimum_selections >= 0),
  maximum_selections smallint check (maximum_selections is null or maximum_selections > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, code),
  check (maximum_selections is null or maximum_selections >= minimum_selections)
);

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_group_id uuid not null references public.product_option_groups(id) on delete cascade,
  code text not null,
  label text not null,
  description text,
  swatch_value text,
  media_asset_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (option_group_id, code),
  unique (id, option_group_id)
);

create table public.product_option_rules (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  subject_option_value_id uuid not null references public.product_option_values(id) on delete cascade,
  related_option_value_id uuid not null references public.product_option_values(id) on delete cascade,
  rule_type text not null check (rule_type in ('requires', 'excludes')),
  message text,
  created_at timestamptz not null default now(),
  unique (subject_option_value_id, related_option_value_id, rule_type),
  check (subject_option_value_id <> related_option_value_id)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text,
  name text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, sku),
  unique (id, product_id)
);

create table public.product_variant_option_values (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  option_value_id uuid not null references public.product_option_values(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (variant_id, option_value_id)
);

create table public.services (
  code text primary key,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_services (
  product_id uuid not null references public.products(id) on delete cascade,
  service_code text not null references public.services(code) on delete restrict,
  is_available boolean not null default true,
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, service_code)
);

-- Role-visible tiered pricing and upcharges -------------------------------

create table public.price_books (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  currency_code text not null references public.currencies(code),
  visibility text not null default 'public'
    check (visibility in ('public', 'authenticated', 'role')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  valid_from timestamptz,
  valid_until timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table public.price_book_roles (
  price_book_id uuid not null references public.price_books(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (price_book_id, role_id)
);

create table public.product_price_grids (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  product_variant_id uuid,
  price_book_id uuid not null references public.price_books(id) on delete cascade,
  code text not null,
  name text not null,
  price_type text not null default 'base'
    check (price_type in ('base', 'service', 'promotional')),
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, price_book_id, code),
  unique (id, product_id),
  foreign key (product_variant_id, product_id)
    references public.product_variants(id, product_id) on delete cascade
);

create unique index product_price_grids_one_default
  on public.product_price_grids (product_id, price_book_id)
  where is_default and is_active;

create table public.product_price_criteria (
  id uuid primary key default gen_random_uuid(),
  price_grid_id uuid not null references public.product_price_grids(id) on delete cascade,
  criterion_key text not null,
  operator text not null default 'equals'
    check (operator in ('equals', 'not_equals', 'includes', 'excludes')),
  option_value_id uuid references public.product_option_values(id) on delete cascade,
  taxonomy_term_id uuid references public.taxonomy_terms(id) on delete cascade,
  criterion_value text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(option_value_id, taxonomy_term_id, criterion_value) = 1)
);

create index product_price_criteria_grid_idx
  on public.product_price_criteria (price_grid_id, criterion_key);

create table public.product_price_tiers (
  id uuid primary key default gen_random_uuid(),
  price_grid_id uuid not null references public.product_price_grids(id) on delete cascade,
  minimum_quantity bigint not null check (minimum_quantity > 0),
  maximum_quantity bigint
    check (maximum_quantity is null or (
      maximum_quantity >= minimum_quantity
      and maximum_quantity < 9223372036854775807
    )),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  setup_price numeric(14,4) not null default 0 check (setup_price >= 0),
  price_code text references public.price_codes(code) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (price_grid_id, minimum_quantity),
  unique (id, price_grid_id),
  exclude using gist (
    price_grid_id with =,
    int8range(
      minimum_quantity,
      case when maximum_quantity is null then null else maximum_quantity + 1 end,
      '[)'
    ) with &&
  )
);

create table public.product_upcharge_grids (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  price_book_id uuid not null references public.price_books(id) on delete cascade,
  code text not null,
  name text not null,
  adjustment_type text not null
    check (adjustment_type in ('fixed', 'per_unit', 'percentage')),
  application_level text not null default 'item'
    check (application_level in ('item', 'option', 'service')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, price_book_id, code),
  unique (id, product_id)
);

create table public.product_upcharge_criteria (
  id uuid primary key default gen_random_uuid(),
  upcharge_grid_id uuid not null references public.product_upcharge_grids(id) on delete cascade,
  criterion_key text not null,
  operator text not null default 'equals'
    check (operator in ('equals', 'not_equals', 'includes', 'excludes')),
  option_value_id uuid references public.product_option_values(id) on delete cascade,
  taxonomy_term_id uuid references public.taxonomy_terms(id) on delete cascade,
  criterion_value text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(option_value_id, taxonomy_term_id, criterion_value) = 1)
);

create index product_upcharge_criteria_grid_idx
  on public.product_upcharge_criteria (upcharge_grid_id, criterion_key);

create table public.product_upcharge_tiers (
  id uuid primary key default gen_random_uuid(),
  upcharge_grid_id uuid not null references public.product_upcharge_grids(id) on delete cascade,
  minimum_quantity bigint not null check (minimum_quantity > 0),
  maximum_quantity bigint
    check (maximum_quantity is null or (
      maximum_quantity >= minimum_quantity
      and maximum_quantity < 9223372036854775807
    )),
  amount numeric(14,4) not null check (amount >= 0),
  price_code text references public.price_codes(code) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (upcharge_grid_id, minimum_quantity),
  exclude using gist (
    upcharge_grid_id with =,
    int8range(
      minimum_quantity,
      case when maximum_quantity is null then null else maximum_quantity + 1 end,
      '[)'
    ) with &&
  )
);

-- Content management ---------------------------------------------------------

create table public.content_entries (
  id uuid primary key default gen_random_uuid(),
  content_type text not null
    check (content_type in ('page', 'blog', 'case_study', 'faq', 'resource')),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_entries_status_published_idx
  on public.content_entries (status, published_at desc);

create table public.content_translations (
  content_entry_id uuid not null references public.content_entries(id) on delete cascade,
  locale text not null,
  title text not null,
  excerpt text,
  body text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_entry_id, locale)
);

create table public.content_media (
  content_entry_id uuid not null references public.content_entries(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  usage_type text not null default 'inline'
    check (usage_type in ('cover', 'inline', 'attachment')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (content_entry_id, media_asset_id, usage_type)
);

create unique index content_media_one_cover
  on public.content_media (content_entry_id)
  where usage_type = 'cover';

create table public.content_taxonomy_terms (
  content_entry_id uuid not null references public.content_entries(id) on delete cascade,
  taxonomy_term_id uuid not null references public.taxonomy_terms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_entry_id, taxonomy_term_id)
);

create table public.content_products (
  content_entry_id uuid not null references public.content_entries(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (content_entry_id, product_id)
);

-- Inquiry, files, communication, and versioned quotes -----------------------

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_number text not null unique default (
    'INQ-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  customer_user_id uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete set null,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text not null default 'draft'
    check (status in (
      'draft', 'submitted', 'reviewing', 'quoting', 'quoted',
      'customer_review', 'confirmed', 'closed', 'cancelled'
    )),
  assigned_to uuid references auth.users(id) on delete set null,
  customer_message text,
  internal_notes text,
  submitted_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, customer_user_id)
);

create index inquiries_customer_idx
  on public.inquiries (customer_user_id, created_at desc);
create index inquiries_organization_idx
  on public.inquiries (organization_id, created_at desc);
create index inquiries_assignee_status_idx
  on public.inquiries (assigned_to, status, updated_at desc);

create table public.inquiry_items (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  product_number_snapshot text not null,
  product_name_snapshot text not null,
  quantity bigint not null check (quantity > 0),
  currency_code text not null references public.currencies(code),
  price_grid_id uuid references public.product_price_grids(id) on delete set null,
  price_tier_id uuid references public.product_price_tiers(id) on delete set null,
  unit_price_snapshot numeric(14,4)
    check (unit_price_snapshot is null or unit_price_snapshot >= 0),
  setup_price_snapshot numeric(14,4)
    check (setup_price_snapshot is null or setup_price_snapshot >= 0),
  estimated_total_snapshot numeric(16,4)
    check (estimated_total_snapshot is null or estimated_total_snapshot >= 0),
  price_note_snapshot text,
  customer_note text,
  required_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, inquiry_id)
);

create index inquiry_items_inquiry_idx
  on public.inquiry_items (inquiry_id, sort_order);

create table public.inquiry_item_option_selections (
  id uuid primary key default gen_random_uuid(),
  inquiry_item_id uuid not null references public.inquiry_items(id) on delete cascade,
  option_group_id uuid references public.product_option_groups(id) on delete set null,
  option_value_id uuid references public.product_option_values(id) on delete set null,
  option_group_name_snapshot text not null,
  option_value_snapshot text,
  entered_value text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (option_value_snapshot is not null or entered_value is not null)
);

create index inquiry_item_options_item_idx
  on public.inquiry_item_option_selections (inquiry_item_id, sort_order);

create table public.inquiry_item_service_requests (
  id uuid primary key default gen_random_uuid(),
  inquiry_item_id uuid not null references public.inquiry_items(id) on delete cascade,
  service_code text not null references public.services(code) on delete restrict,
  service_name_snapshot text not null,
  details text,
  status text not null default 'requested'
    check (status in ('requested', 'reviewing', 'approved', 'declined', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (inquiry_item_id, service_code)
);

create table public.inquiry_attachments (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  inquiry_item_id uuid,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  attachment_kind text not null default 'other'
    check (attachment_kind in ('artwork', 'logo', 'reference', 'proof', 'other')),
  bucket_id text not null default 'inquiry-attachments',
  object_path text not null unique,
  filename text not null,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  description text,
  created_at timestamptz not null default now(),
  foreign key (inquiry_item_id, inquiry_id)
    references public.inquiry_items(id, inquiry_id) on delete cascade,
  check (bucket_id = 'inquiry-attachments'),
  check (split_part(object_path, '/', 1) = uploaded_by::text)
);

create index inquiry_attachments_inquiry_idx
  on public.inquiry_attachments (inquiry_id, created_at);

create table public.inquiry_status_history (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  visible_to_customer boolean not null default true,
  created_at timestamptz not null default now()
);

create index inquiry_status_history_inquiry_idx
  on public.inquiry_status_history (inquiry_id, created_at desc);

create table public.inquiry_communications (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  inquiry_item_id uuid,
  direction text not null
    check (direction in ('inbound', 'outbound', 'internal')),
  channel text not null
    check (channel in ('site', 'email', 'phone', 'whatsapp', 'wechat', 'other')),
  subject text,
  message text not null,
  external_message_id text,
  visible_to_customer boolean not null default true,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (inquiry_item_id, inquiry_id)
    references public.inquiry_items(id, inquiry_id) on delete cascade
);

create index inquiry_communications_inquiry_idx
  on public.inquiry_communications (inquiry_id, occurred_at desc);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null unique references public.inquiries(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quote_versions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'superseded')),
  currency_code text not null references public.currencies(code),
  subtotal numeric(16,4) not null default 0 check (subtotal >= 0),
  adjustments_total numeric(16,4) not null default 0,
  tax_total numeric(16,4) not null default 0 check (tax_total >= 0),
  total numeric(16,4) not null default 0 check (total >= 0),
  valid_until timestamptz,
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  customer_notes text,
  internal_notes text,
  terms text,
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quote_id, version_number)
);

create index quote_versions_quote_status_idx
  on public.quote_versions (quote_id, version_number desc, status);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  inquiry_item_id uuid references public.inquiry_items(id) on delete set null,
  product_number_snapshot text not null,
  product_name_snapshot text not null,
  description text,
  quantity bigint not null check (quantity > 0),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  setup_price numeric(14,4) not null default 0 check (setup_price >= 0),
  line_total numeric(16,4) not null check (line_total >= 0),
  price_code text references public.price_codes(code) on delete set null,
  customer_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quote_items_version_idx
  on public.quote_items (quote_version_id, sort_order);

create table public.quote_item_options (
  id uuid primary key default gen_random_uuid(),
  quote_item_id uuid not null references public.quote_items(id) on delete cascade,
  option_group_name_snapshot text not null,
  option_value_snapshot text not null,
  price_adjustment numeric(14,4) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.quote_adjustments (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  quote_item_id uuid references public.quote_items(id) on delete cascade,
  description text not null,
  adjustment_type text not null
    check (adjustment_type in ('fixed', 'percentage')),
  amount numeric(16,4) not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index quote_adjustments_version_idx
  on public.quote_adjustments (quote_version_id, sort_order);

create table public.quote_responses (
  id uuid primary key default gen_random_uuid(),
  quote_version_id uuid not null references public.quote_versions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  response text not null check (response in ('accepted', 'rejected', 'comment')),
  comment text,
  created_at timestamptz not null default now()
);

create index quote_responses_version_idx
  on public.quote_responses (quote_version_id, created_at desc);

-- Shared trigger functions ---------------------------------------------------

create function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

create function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

insert into public.profiles (id, email)
select id, email
from auth.users
on conflict (id) do nothing;

create function app_private.record_inquiry_status_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status is distinct from old.status then
    insert into public.inquiry_status_history (
      inquiry_id,
      from_status,
      to_status,
      changed_by
    ) values (
      new.id,
      old.status,
      new.status,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger inquiries_record_status_change
  after update of status on public.inquiries
  for each row execute function app_private.record_inquiry_status_change();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'organizations', 'organization_addresses', 'organization_members',
    'roles', 'currencies', 'price_codes', 'taxonomies', 'taxonomy_terms', 'products',
    'product_translations', 'product_specifications', 'media_assets',
    'product_compliance_records', 'product_option_groups',
    'product_option_values', 'product_variants', 'services', 'product_services',
    'price_books', 'product_price_grids', 'product_price_tiers',
    'product_upcharge_grids', 'product_upcharge_tiers', 'content_entries',
    'content_translations', 'inquiries', 'inquiry_items',
    'inquiry_item_service_requests', 'quotes', 'quote_versions', 'quote_items'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I '
      'for each row execute function app_private.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

-- Initial controlled values. These are deliberately small and extensible.

insert into public.currencies (code, name, symbol)
values ('USD', 'US Dollar', '$');

insert into public.taxonomies (code, name, is_hierarchical, sort_order)
values
  ('category', 'Categories', true, 10),
  ('keyword', 'Keywords', false, 20),
  ('color', 'Colors', false, 30),
  ('material', 'Materials', false, 40),
  ('theme', 'Themes', false, 50),
  ('certification', 'Certifications and Compliance', false, 60),
  ('size', 'Sizes', false, 70),
  ('imprint_method', 'Imprint Methods', false, 80);

insert into public.services (code, name, description)
values
  ('sample', 'Sample', 'Customer requests a physical product sample.'),
  ('proof', 'Proof or Mockup', 'Customer requests a virtual proof or product mockup.'),
  ('design_support', 'Design Support', 'Customer requests artwork or design assistance.');

insert into public.permissions (code, name, description)
values
  ('admin.access', 'Access administration', 'Access the administration application.'),
  ('catalog.manage', 'Manage catalogue', 'Create and maintain products and catalogue vocabularies.'),
  ('pricing.manage', 'Manage pricing', 'Create and maintain price books, tiers, and upcharges.'),
  ('members.manage', 'Manage members', 'Review accounts, organizations, and role assignments.'),
  ('inquiries.manage', 'Manage inquiries', 'Assign, communicate on, and quote customer inquiries.'),
  ('content.manage', 'Manage content', 'Create and publish site content.');

insert into public.roles (code, name, description, scope)
values
  ('super_admin', 'Super Administrator', 'Full administration access.', 'system'),
  ('catalog_manager', 'Catalogue Manager', 'Product and catalogue administration.', 'system'),
  ('pricing_manager', 'Pricing Manager', 'Pricing administration.', 'system'),
  ('member_manager', 'Member Manager', 'Account and enterprise member administration.', 'system'),
  ('inquiry_manager', 'Inquiry Manager', 'Inquiry and quotation administration.', 'system'),
  ('content_manager', 'Content Manager', 'Site content administration.', 'system'),
  ('approved_member', 'Approved Member', 'Approved customer price visibility.', 'organization');

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
cross join public.permissions as permission
where role.code = 'super_admin';

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
join public.permissions as permission
  on permission.code in ('admin.access', 'catalog.manage')
where role.code = 'catalog_manager';

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
join public.permissions as permission
  on permission.code in ('admin.access', 'pricing.manage')
where role.code = 'pricing_manager';

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
join public.permissions as permission
  on permission.code in ('admin.access', 'members.manage')
where role.code = 'member_manager';

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
join public.permissions as permission
  on permission.code in ('admin.access', 'inquiries.manage')
where role.code = 'inquiry_manager';

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles as role
join public.permissions as permission
  on permission.code in ('admin.access', 'content.manage')
where role.code = 'content_manager';

comment on schema app_private is
  'Non-exposed helper functions for LogoPress RLS and database triggers.';

comment on table public.products is
  'LogoPress sellable catalogue products; no supplier ownership or inventory fields.';

comment on table public.inquiries is
  'Customer multi-product inquiry lifecycle; this is not an order or payment record.';
