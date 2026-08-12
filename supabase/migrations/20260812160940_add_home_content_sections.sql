create table public.home_sections (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index home_sections_public_idx
  on public.home_sections (sort_order)
  where status = 'published';

create table public.home_section_translations (
  home_section_id uuid not null references public.home_sections(id) on delete cascade,
  locale text not null references public.site_locales(code) on delete cascade,
  eyebrow text,
  title text not null,
  description text not null,
  cta_label text,
  cta_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (home_section_id, locale),
  check ((cta_label is null and cta_path is null) or (cta_label is not null and cta_path is not null))
);

create trigger home_sections_set_updated_at
before update on public.home_sections
for each row execute function app_private.set_updated_at();

create trigger home_section_translations_set_updated_at
before update on public.home_section_translations
for each row execute function app_private.set_updated_at();

alter table public.home_sections enable row level security;
alter table public.home_section_translations enable row level security;

create policy home_sections_read_published_anon
on public.home_sections for select to anon
using (status = 'published' and (published_at is null or published_at <= now()));

create policy home_sections_read_published_authenticated
on public.home_sections for select to authenticated
using (status = 'published' and (published_at is null or published_at <= now()));

create policy home_sections_manage
on public.home_sections for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

create policy home_section_translations_read_published_anon
on public.home_section_translations for select to anon
using (
  exists (
    select 1 from public.home_sections as section
    join public.site_locales as site_locale on site_locale.code = home_section_translations.locale
    where section.id = home_section_id
      and section.status = 'published'
      and (section.published_at is null or section.published_at <= now())
      and site_locale.is_active
  )
);

create policy home_section_translations_read_published_authenticated
on public.home_section_translations for select to authenticated
using (
  exists (
    select 1 from public.home_sections as section
    join public.site_locales as site_locale on site_locale.code = home_section_translations.locale
    where section.id = home_section_id
      and section.status = 'published'
      and (section.published_at is null or section.published_at <= now())
      and site_locale.is_active
  )
);

create policy home_section_translations_manage
on public.home_section_translations for all to authenticated
using (app_private.has_permission('content.manage'))
with check (app_private.has_permission('content.manage'));

grant select on public.home_sections, public.home_section_translations to anon;
grant select, insert, update, delete on public.home_sections, public.home_section_translations to authenticated;

insert into public.home_sections (id, code, status, sort_order, published_at)
values
  ('e1ce3000-0000-4000-8000-000000000001', 'catalogue', 'published', 10, now()),
  ('e1ce3000-0000-4000-8000-000000000002', 'services', 'published', 20, now()),
  ('e1ce3000-0000-4000-8000-000000000003', 'enquiry', 'published', 30, now()),
  ('e1ce3000-0000-4000-8000-000000000004', 'insights', 'published', 40, now());

insert into public.home_section_translations (home_section_id, locale, eyebrow, title, description, cta_label, cta_path)
values
  ('e1ce3000-0000-4000-8000-000000000001', 'en', 'Explore the catalogue', 'Find a strong starting point for your next brief.', 'Browse published product categories and move from initial discovery into configuration and enquiry.', 'Browse catalogue', '/products'),
  ('e1ce3000-0000-4000-8000-000000000001', 'zh', '浏览商品目录', '为下一次采购需求找到清晰的起点。', '浏览已发布商品分类，从初步选品进入配置与询单。', '浏览商品目录', '/products'),
  ('e1ce3000-0000-4000-8000-000000000002', 'en', 'Service context', 'Bring the right details into the quotation conversation.', 'Use product, quantity and customisation context to make each enquiry easier to review and respond to.', 'Explore services', '/services'),
  ('e1ce3000-0000-4000-8000-000000000002', 'zh', '服务支持', '让关键资料进入报价沟通。', '围绕商品、数量和定制要求整理信息，让每次询单更容易处理和回复。', '了解服务能力', '/services'),
  ('e1ce3000-0000-4000-8000-000000000003', 'en', 'Ready when you are', 'Collect multiple product ideas in one enquiry.', 'The enquiry list keeps quantities, options and supporting information together before your request is submitted.', 'Start an enquiry', '/inquiry'),
  ('e1ce3000-0000-4000-8000-000000000003', 'zh', '准备开始', '把多个商品想法集中到一次询单中。', '询单列表会在提交前集中保留数量、选项和支持资料。', '发起询单', '/inquiry'),
  ('e1ce3000-0000-4000-8000-000000000004', 'en', 'Useful guidance', 'Content that supports a better sourcing decision.', 'Read product, sourcing and customisation guidance, then continue into the catalogue when a product is relevant.', 'Read insights', '/insights'),
  ('e1ce3000-0000-4000-8000-000000000004', 'zh', '实用内容', '帮助客户进行更好采购决策的内容。', '阅读商品、采购和定制相关内容，并在需要时继续浏览商品目录。', '查看行业洞察', '/insights');
