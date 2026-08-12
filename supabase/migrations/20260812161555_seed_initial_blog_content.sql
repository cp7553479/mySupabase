insert into public.content_entries (
  id, content_type, slug, title, excerpt, body, status, published_at, seo_title, seo_description
)
values
  (
    'e1ce4000-0000-4000-8000-000000000001',
    'blog',
    'preparing-a-b2b-custom-product-enquiry',
    'Preparing a B2B custom-product enquiry',
    'A practical checklist for putting product, quantity and artwork context into the first enquiry.',
    'A stronger enquiry begins with a clear product direction, expected quantity, timing and the available brand or artwork material. Gathering this context early helps the next conversation focus on options and quote requirements.',
    'published', now(),
    'Preparing a B2B custom-product enquiry | LogoPress',
    'A practical checklist for preparing a clearer custom-product enquiry.'
  ),
  (
    'e1ce4000-0000-4000-8000-000000000002',
    'blog',
    'understanding-quantity-tier-pricing',
    'Understanding quantity-tier pricing',
    'How quantity thresholds support early product budgeting and a more focused quotation conversation.',
    'Quantity tiers help customers understand how quantity affects product pricing. They provide useful context for exploration, while the final quotation confirms the specification and conditions for each request.',
    'published', now(),
    'Understanding quantity-tier pricing | LogoPress',
    'Learn how quantity tiers support custom-product budgeting and enquiries.'
  );

insert into public.content_translations (
  content_entry_id, locale, title, excerpt, body, seo_title, seo_description
)
values
  (
    'e1ce4000-0000-4000-8000-000000000001', 'en',
    'Preparing a B2B custom-product enquiry',
    'A practical checklist for putting product, quantity and artwork context into the first enquiry.',
    'A stronger enquiry begins with a clear product direction, expected quantity, timing and the available brand or artwork material. Gathering this context early helps the next conversation focus on options and quote requirements.',
    'Preparing a B2B custom-product enquiry | LogoPress',
    'A practical checklist for preparing a clearer custom-product enquiry.'
  ),
  (
    'e1ce4000-0000-4000-8000-000000000001', 'zh',
    '如何准备一份企业定制商品询单',
    '在首次询单中整理商品、数量和设计资料的实用清单。',
    '一份更清晰的询单通常从明确的商品方向、预期数量、时间和现有品牌或设计资料开始。尽早整理这些信息，可以让后续沟通更聚焦于配置和报价要求。',
    '如何准备一份企业定制商品询单 | LogoPress',
    '了解如何更清晰地准备企业定制商品询单。'
  ),
  (
    'e1ce4000-0000-4000-8000-000000000002', 'en',
    'Understanding quantity-tier pricing',
    'How quantity thresholds support early product budgeting and a more focused quotation conversation.',
    'Quantity tiers help customers understand how quantity affects product pricing. They provide useful context for exploration, while the final quotation confirms the specification and conditions for each request.',
    'Understanding quantity-tier pricing | LogoPress',
    'Learn how quantity tiers support custom-product budgeting and enquiries.'
  ),
  (
    'e1ce4000-0000-4000-8000-000000000002', 'zh',
    '理解数量阶梯价格',
    '数量门槛如何帮助客户进行前期预算并聚焦报价沟通。',
    '数量阶梯帮助客户理解数量对商品价格的影响。它为前期选品提供参考，而每一次需求的最终规格和适用条件以正式报价为准。',
    '理解数量阶梯价格 | LogoPress',
    '了解数量阶梯如何支持定制商品预算与询单。'
  );
