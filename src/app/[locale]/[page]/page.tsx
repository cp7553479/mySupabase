import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCopy, isLocale, type Locale } from "@/lib/i18n";
import { getPublicSiteData } from "@/lib/site/queries";

type PageContent = {
  body: string;
  eyebrow: string;
  points: string[];
  title: string;
};

const pageContent: Record<string, Record<Locale, PageContent>> = {
  account: {
    en: {
      eyebrow: "Member account",
      title: "Sign in to keep product ideas and enquiries together.",
      body: "Account access will support saved products, enterprise details and enquiry history. Authentication is introduced in the account phase of this project.",
      points: ["Saved products", "Enterprise details", "Enquiry history"],
    },
    zh: {
      eyebrow: "会员账户",
      title: "登录后统一管理选品和询单。",
      body: "账户将支持收藏商品、企业资料和询单记录。身份认证将在本项目的账户阶段接入。",
      points: ["收藏商品", "企业资料", "询单记录"],
    },
  },
  about: {
    en: {
      eyebrow: "About LogoPress",
      title: "A clearer starting point for custom-product sourcing.",
      body: "LogoPress brings product discovery, quantity guidance and structured enquiries into one B2B catalogue experience. It gives procurement teams a practical place to compare possibilities before a tailored quotation is prepared.",
      points: [
        "Product discovery",
        "Configuration context",
        "Structured enquiries",
      ],
    },
    zh: {
      eyebrow: "关于 LogoPress",
      title: "让定制商品采购从清晰的信息开始。",
      body: "LogoPress 将商品发现、数量参考与结构化询单整合为统一的企业采购目录体验，帮助采购团队在进入人工报价前，更高效地比较和确认选品方向。",
      points: ["商品发现", "配置参考", "结构化询单"],
    },
  },
  contact: {
    en: {
      eyebrow: "Contact",
      title: "Bring your next custom-product brief into one conversation.",
      body: "Share the product, quantity, timing and customisation context you have. The enquiry workflow will keep the relevant details together for a considered response.",
      points: [
        "Product and quantity",
        "Artwork or reference files",
        "Delivery context",
      ],
    },
    zh: {
      eyebrow: "联系我们",
      title: "从一次清晰的沟通，开始下一份定制商品需求。",
      body: "提交商品、数量、时间和定制要求。询单流程会将相关信息集中保存，便于后续进行针对性的沟通与报价。",
      points: ["商品与数量", "Logo 或参考资料", "交付要求"],
    },
  },
  inquiry: {
    en: {
      eyebrow: "Enquiry",
      title:
        "Build a request from the products and configurations that matter.",
      body: "The enquiry list and submission flow are delivered in the enquiry phase. This entry point will remain consistent across the catalogue and content pages.",
      points: [
        "Multiple product items",
        "Configuration details",
        "Clear follow-up context",
      ],
    },
    zh: {
      eyebrow: "询单",
      title: "从需要的商品和配置开始整理采购需求。",
      body: "询单列表和提交流程将在询单阶段交付。该入口会在商品目录和内容页面保持一致。",
      points: ["多个商品项目", "配置细节", "清晰的后续沟通上下文"],
    },
  },
  insights: {
    en: {
      eyebrow: "Insights",
      title: "Guidance that supports better product decisions.",
      body: "Published articles, cases and resource material will be managed through the content phase. Each item can lead readers into a relevant catalogue or enquiry path.",
      points: ["Articles", "Case studies", "Useful resources"],
    },
    zh: {
      eyebrow: "行业洞察",
      title: "帮助客户做出更好选品决策的内容。",
      body: "文章、案例和资料将在内容管理阶段交付，并可引导客户进入相关目录或询单路径。",
      points: ["文章", "案例", "实用资料"],
    },
  },
  cookies: {
    en: {
      eyebrow: "Cookie notice",
      title: "Your choices should be clear and easy to change.",
      body: "The website will present choices for non-essential analytics and marketing technologies before they are enabled. Necessary technologies support security, language preference and basic site operation.",
      points: [
        "Purpose-based choices",
        "Visible preference controls",
        "Withdrawal at any time",
      ],
    },
    zh: {
      eyebrow: "Cookie 说明",
      title: "你的选择应当清晰，也应当随时可以调整。",
      body: "网站会在启用非必要的分析与营销技术前提供选择。必要技术用于安全、语言偏好和网站基本运行。",
      points: ["按用途选择", "清晰的偏好设置", "随时撤回同意"],
    },
  },
  privacy: {
    en: {
      eyebrow: "Privacy",
      title:
        "Information is collected to support a real business conversation.",
      body: "Contact details, enquiry information and files are used to respond to the request, support account access and maintain the agreed business relationship. Detailed privacy controls will be managed through the published policy and account settings.",
      points: [
        "Purpose-led collection",
        "Access-controlled records",
        "Clear contact route",
      ],
    },
    zh: {
      eyebrow: "隐私政策",
      title: "收集信息是为了支持真实、必要的业务沟通。",
      body: "联系方式、询单资料和文件用于回复需求、支持账户访问和维护双方确认的业务关系。详细的隐私控制将通过正式政策和账户设置提供。",
      points: ["按用途收集", "受权限控制的记录", "清晰的联系渠道"],
    },
  },
  products: {
    en: {
      eyebrow: "Catalogue",
      title: "Find a product that fits your next brief.",
      body: "Search, categories, product details, quantity tiers and configurable options are delivered in the catalogue phase. This route is kept ready for the published catalogue.",
      points: [
        "Published products",
        "Quantity pricing",
        "Configuration options",
      ],
    },
    zh: {
      eyebrow: "商品目录",
      title: "发现适合下一次采购需求的商品。",
      body: "搜索、分类、商品详情、阶梯价格和可选配置将在商品目录阶段交付。本入口已为已发布商品目录准备就绪。",
      points: ["已发布商品", "数量阶梯价格", "可选配置"],
    },
  },
  services: {
    en: {
      eyebrow: "Services",
      title: "Support that keeps a custom-product brief moving.",
      body: "The catalogue experience is designed to help teams move from an initial product idea to an enquiry with the right configuration, quantity and supporting material attached.",
      points: [
        "Product selection",
        "Configuration guidance",
        "Quote-ready enquiries",
      ],
    },
    zh: {
      eyebrow: "服务能力",
      title: "让定制商品需求持续向前推进的支持。",
      body: "商品目录体验帮助团队从初步想法进入包含配置、数量和相关资料的询单，让后续报价更有上下文。",
      points: ["选品支持", "配置参考", "适合报价的询单"],
    },
  },
  terms: {
    en: {
      eyebrow: "Website terms",
      title:
        "Catalogue information supports enquiries and quotation discussions.",
      body: "Displayed product information and quantity guidance help users prepare an enquiry. A final commercial quotation confirms the applicable specification, price, timing and other business terms for each request.",
      points: [
        "Enquiry-first workflow",
        "Quote-based confirmation",
        "Request-specific terms",
      ],
    },
    zh: {
      eyebrow: "网站条款",
      title: "目录信息用于支持询单和报价沟通。",
      body: "前台展示的商品信息和数量参考帮助用户准备询单。每项需求最终适用的规格、价格、时间和其他商业条款，以确认后的正式报价为准。",
      points: ["以询单为核心", "以报价确认", "按需求适用条款"],
    },
  },
};

export function generateStaticParams() {
  return Object.keys(pageContent).flatMap((page) =>
    ["en", "zh"].map((locale) => ({ locale, page })),
  );
}

export default async function PublicPage({
  params,
}: Readonly<{ params: Promise<{ locale: string; page: string }> }>) {
  const { locale, page } = await params;

  if (!isLocale(locale) || !(page in pageContent)) {
    notFound();
  }

  const [content, site] = await Promise.all([
    Promise.resolve(pageContent[page][locale]),
    getPublicSiteData(locale),
  ]);
  const copy = getCopy(locale);

  return (
    <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="flex max-w-3xl flex-col gap-6">
          <p className="text-muted-foreground text-sm font-semibold tracking-[0.16em] uppercase">
            {content.eyebrow}
          </p>
          <h1 className="text-5xl font-semibold tracking-[-0.04em] text-balance sm:text-6xl">
            {content.title}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg leading-8">
            {content.body}
          </p>
          <Button asChild className="w-fit" size="lg">
            <Link href={`/${locale}/inquiry`}>
              {copy.inquire}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{site.siteName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm leading-6">
            {content.points.map((point) => (
              <p className="flex items-center gap-3" key={point}>
                <CheckIcon className="size-4" />
                {point}
              </p>
            ))}
            {page === "contact" && site.contactEmail ? (
              <a
                className="font-medium underline"
                href={`mailto:${site.contactEmail}`}
              >
                {site.contactEmail}
              </a>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
