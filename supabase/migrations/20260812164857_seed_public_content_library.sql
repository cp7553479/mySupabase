insert into public.content_entries (
  id, content_type, slug, title, excerpt, body, status, published_at
) values
  ('e1ce4000-0000-4000-8000-000000000001', 'case_study', 'event-ready-brand-kits', 'Event-ready brand kits', 'A practical way to align product selection, decoration and quantities before an event.', 'A clear product brief starts with the audience, quantity, timeline and the brand material that is ready to use. This case format helps teams prepare a structured enquiry before detailed quotation work begins.', 'published', now()),
  ('e1ce4000-0000-4000-8000-000000000002', 'faq', 'how-pricing-works', 'How does quantity pricing work?', 'Quantity tiers provide an initial planning reference for each product.', 'Select a quantity on the product page to see the applicable tier. Final pricing is confirmed after configuration, artwork, timing and delivery requirements have been reviewed.', 'published', now()),
  ('e1ce4000-0000-4000-8000-000000000003', 'faq', 'what-to-include-in-an-enquiry', 'What should I include in an enquiry?', 'A strong enquiry provides product, quantity, timing and customisation context.', 'Add the products you are considering, choose the relevant options, and explain the intended use, timing and any available artwork or reference material. This gives the sales team the context needed for a focused response.', 'published', now()),
  ('e1ce4000-0000-4000-8000-000000000004', 'resource', 'custom-product-enquiry-checklist', 'Custom product enquiry checklist', 'A concise checklist for preparing your next custom-product discussion.', 'Use this resource to prepare the product, quantity, brand and timing details that make a quotation discussion more efficient.', 'published', now())
on conflict (id) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  body = excluded.body,
  status = excluded.status,
  published_at = excluded.published_at;

insert into public.content_translations (
  content_entry_id, locale, title, excerpt, body
) values
  ('e1ce4000-0000-4000-8000-000000000001', 'zh', '活动场景品牌物料准备', '在活动前统一商品选择、定制方式与数量规划。', '清晰的商品需求应从受众、数量、时间和已有品牌资料开始。该案例帮助团队在进入详细报价前，准备结构化询单。'),
  ('e1ce4000-0000-4000-8000-000000000002', 'zh', '数量阶梯价格如何计算？', '数量阶梯为每个商品提供初步采购参考。', '在商品页面选择数量后，系统会展示适用价格档。最终价格将在确认配置、图稿、时间和交付要求后由业务团队确认。'),
  ('e1ce4000-0000-4000-8000-000000000003', 'zh', '询单中应包含哪些信息？', '清晰的询单应包含商品、数量、时间和定制背景。', '加入关注的商品，选择相关配置，并说明使用场景、时间以及已有的 Logo、图稿或参考资料。这样业务团队可以更有针对性地回复。'),
  ('e1ce4000-0000-4000-8000-000000000004', 'zh', '定制商品询单清单', '用于准备下一次定制商品沟通的简要清单。', '使用这份资料准备商品、数量、品牌和时间信息，让报价沟通更高效。')
on conflict (content_entry_id, locale) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  body = excluded.body;
