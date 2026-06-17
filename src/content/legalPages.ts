export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalPageContent = {
  slug: 'privacy' | 'terms';
  title: string;
  metaDescription: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const LEGAL_PAGES: LegalPageContent[] = [
  {
    slug: 'privacy',
    title: 'Privacy Policy',
    metaDescription:
      'How DataViews.pro collects, uses, and protects information when you use the SFMC schema browser, SQL sandbox, and AI Copilot.',
    lastUpdated: '2026-06-17',
    sections: [
      {
        heading: 'Overview',
        paragraphs: [
          'DataViews.pro ("we", "the Service") is operated by Ujjwal Tiwari. This policy explains what information we collect when you use the website, optional account features, and AI Copilot.',
        ],
      },
      {
        heading: 'Information we collect',
        paragraphs: ['Depending on how you use the Service, we may process:'],
        bullets: [
          'Account data — email address and authentication identifiers when you sign up for AI Copilot (via Supabase Auth).',
          'Usage data — anonymous analytics such as page views and feature interactions (Vercel Analytics; Google Analytics 4 when configured).',
          'AI Copilot prompts — messages you send to the assistant and related workspace context (selected data views, current SQL) to generate responses.',
          'Technical data — browser type, approximate location from IP, and standard server logs required to operate the Service.',
        ],
      },
      {
        heading: 'How we use information',
        paragraphs: [
          'We use collected information to provide and improve the Service, enforce daily AI usage limits, prevent abuse, diagnose errors, and understand aggregate product usage. We do not sell your personal information.',
        ],
      },
      {
        heading: 'Third-party services',
        paragraphs: [
          'The Service relies on trusted processors including Vercel (hosting), Supabase (authentication), and OpenAI (AI Copilot responses). Each provider processes data under their own terms and privacy policies. Copilot queries are sent to OpenAI only when you are signed in and submit a prompt.',
        ],
      },
      {
        heading: 'Cookies and local storage',
        paragraphs: [
          'We use browser local storage for theme preference and workspace state. Optional staging access may set a short-lived HttpOnly cookie. Analytics providers may set their own cookies when enabled.',
        ],
      },
      {
        heading: 'Data retention',
        paragraphs: [
          'Authentication records are retained per Supabase configuration. AI usage counters reset daily. Analytics data retention follows Vercel and Google Analytics settings. You may request account deletion by contacting us.',
        ],
      },
      {
        heading: 'Your choices',
        paragraphs: [
          'You may use the schema browser and SQL sandbox without an account. You can disable non-essential cookies via your browser. To access AI Copilot you must create an account and accept these terms.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'Privacy questions or data requests: contact Ujjwal Tiwari via LinkedIn (https://www.linkedin.com/in/ujjwaltiwari/) or https://ujjwaltiwari.com.',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of Use',
    metaDescription:
      'Terms governing use of DataViews.pro — SFMC data view reference, SQL sandbox, templates, and AI Copilot.',
    lastUpdated: '2026-06-17',
    sections: [
      {
        heading: 'Agreement',
        paragraphs: [
          'By accessing DataViews.pro you agree to these Terms of Use. If you do not agree, do not use the Service.',
        ],
      },
      {
        heading: 'Service description',
        paragraphs: [
          'DataViews.pro provides reference schemas, relationship visualization, SQL generation utilities, templates, and optional AI-assisted query design for Salesforce Marketing Cloud practitioners. The Service is an independent tool and is not affiliated with, endorsed by, or sponsored by Salesforce, Inc.',
        ],
      },
      {
        heading: 'No warranty on schema accuracy',
        paragraphs: [
          'Data view field definitions, relationships, and generated SQL are provided for practitioner convenience. SFMC behavior varies by account, business unit, stack, and release. Always validate queries in your own tenant before production use. We do not guarantee completeness, correctness, or fitness for a particular purpose.',
        ],
      },
      {
        heading: 'Acceptable use',
        paragraphs: ['You agree not to:'],
        bullets: [
          'Attempt to disrupt, scrape, or overload the Service or its APIs.',
          'Use the Service to process regulated data you are not authorized to handle.',
          'Misrepresent generated SQL or schema content as official Salesforce documentation.',
          'Circumvent AI Copilot usage limits or authentication controls.',
        ],
      },
      {
        heading: 'Accounts and AI Copilot',
        paragraphs: [
          'AI Copilot requires a verified account. You are responsible for safeguarding your credentials. Daily query limits may apply. AI outputs may be inaccurate — review all SQL before running it in Marketing Cloud.',
        ],
      },
      {
        heading: 'Intellectual property',
        paragraphs: [
          'The Service, branding, and original content are owned by Ujjwal Tiwari. Salesforce, Marketing Cloud, and related marks are trademarks of Salesforce, Inc. Schema reference material is informed by official documentation and community sources cited in Platform Info.',
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          'To the fullest extent permitted by law, the Service is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages arising from use of generated SQL, schema reference material, or AI suggestions — including data loss, send errors, or query timeouts in your SFMC account.',
        ],
      },
      {
        heading: 'Changes',
        paragraphs: [
          'We may update these Terms or the Service at any time. Continued use after changes constitutes acceptance. Material changes will be reflected in the "Last updated" date above.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'Questions about these Terms: contact Ujjwal Tiwari via LinkedIn (https://www.linkedin.com/in/ujjwaltiwari/) or https://ujjwaltiwari.com.',
        ],
      },
    ],
  },
];
