export const locales = ["en", "zh"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localePreferenceCookie = "logopress_locale";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

type Copy = {
  about: string;
  blog: string;
  browseProducts: string;
  contact: string;
  footerDescription: string;
  heroDescription: string;
  heroEyebrow: string;
  heroTitle: string;
  inquire: string;
  languageLabel: string;
  learnMore: string;
  logoAlt: string;
  products: string;
  resources: string;
  signIn: string;
  trustLine: string;
};

const copy: Record<Locale, Copy> = {
  en: {
    about: "About",
    blog: "Insights",
    browseProducts: "Browse catalogue",
    contact: "Contact",
    footerDescription:
      "A B2B catalogue for custom products, designed for confident sourcing and clear enquiries.",
    heroDescription:
      "Explore configurable products, transparent quantity pricing and a guided enquiry experience for every procurement brief.",
    heroEyebrow: "Custom products for business",
    heroTitle: "Make every product carry your brand.",
    inquire: "Start an enquiry",
    languageLabel: "Language",
    learnMore: "Explore services",
    logoAlt: "LogoPress",
    products: "Products",
    resources: "Resources",
    signIn: "Sign in",
    trustLine: "Clear pricing · Flexible quantities · Personal support",
  },
  zh: {
    about: "关于我们",
    blog: "行业洞察",
    browseProducts: "浏览商品目录",
    contact: "联系我们",
    footerDescription:
      "面向企业定制采购的商品目录，让选品、询价与后续沟通更清晰、更高效。",
    heroDescription:
      "浏览可定制商品、数量阶梯价格与服务信息，围绕每一次采购需求提交结构化询单。",
    heroEyebrow: "企业定制商品目录",
    heroTitle: "让每一件商品，都承载你的品牌。",
    inquire: "发起询单",
    languageLabel: "语言",
    learnMore: "了解服务能力",
    logoAlt: "LogoPress",
    products: "商品目录",
    resources: "资源中心",
    signIn: "登录",
    trustLine: "清晰价格 · 灵活数量 · 专人支持",
  },
};

export function getCopy(locale: Locale): Copy {
  return copy[locale];
}
