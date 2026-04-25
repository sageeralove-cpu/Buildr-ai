// Buildr AI — Claude API Proxy (Vercel Serverless Function)
// Securely proxies requests to Anthropic's API using server-side env var
// Endpoints: ?action=generate | ?action=chat | ?action=publish

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { action } = req.query;
  const body = req.body;

  try {
    let systemPrompt = '';
    let userMessage = '';
    let maxTokens = 4096;

    if (action === 'generate') {
      // ── Project Generation ──
      const { type, description, theme, wizardData } = body;
      maxTokens = 16000;

      // Build type-specific guidance
      const typeGuidance = {
        website: `WEBSITE INTELLIGENCE:
- Read the user's description carefully. Identify the INDUSTRY, TARGET AUDIENCE, and PURPOSE.
- Generate a real business name if none is given (make it creative and memorable).
- Write REAL copy: headlines that sell, descriptions that explain value, CTAs that convert.
- Include these sections minimum: Hero with headline + subheadline + CTA, Features/Services (3-6 with icons), About/Story, Testimonials (2-3 realistic ones with names), Pricing or CTA section, Footer with links.
- Navigation must be sticky, smooth-scroll to sections, and collapse to hamburger on mobile.
- Hero should have a compelling visual element (gradient mesh, animated shapes, or pattern).
- Every section of text must be SPECIFIC to what the user described — never generic filler.`,

        app: `APP INTELLIGENCE:
- This is a FUNCTIONAL web app, not a brochure. It must DO something.
- Parse the description to understand: What data does it track? What actions can users take? What problem does it solve?
- Build a working UI with: sidebar or tab navigation, main content area, action buttons that work.
- Include localStorage CRUD operations — users should be able to add, view, edit, and delete entries.
- Add a realistic empty state with illustration and call-to-action.
- Show sample data that matches the app's purpose (pre-populate 3-5 realistic entries).
- Include search/filter functionality where relevant.
- Add status indicators, badges, and visual feedback for interactions.
- Modal dialogs for add/edit forms with proper validation.`,

        dashboard: `DASHBOARD INTELLIGENCE:
- Parse the description to identify what METRICS and DATA the user cares about.
- Build a real analytics layout: stat cards at top, charts in middle, data table at bottom.
- Use CSS-only charts (bar charts with div heights, progress rings with conic-gradient, sparklines with SVG).
- Stat cards must show: metric name, current value, trend indicator (up/down arrow + percentage).
- Include a date range selector and at least one filter dropdown.
- Sidebar navigation with sections relevant to the dashboard topic.
- Data table with sortable columns, alternating row colors, and pagination.
- All numbers must be REALISTIC for the industry described — research what real metrics look like.
- Add a notification bell with count badge and dark/light mode toggle.`,

        social: `SOCIAL CONTENT INTELLIGENCE:
- This generates VISUAL social media content, not a social media app.
- Create a set of 3-4 social post designs in different formats (story, square post, banner).
- Each design should be a self-contained card with: visual element, headline text, body copy, brand colors, CTA.
- Use the description to write SPECIFIC, engaging copy — hooks that stop scrolling.
- Include hashtag suggestions relevant to the topic.
- Add a "Copy Caption" button for each post's text.
- Layout: grid of post previews, each one clickable to expand.
- Generate captions that use proven social media copywriting formulas (PAS, AIDA, Hook-Story-Offer).`,

        ecommerce: `E-COMMERCE INTELLIGENCE:
- Parse the description to understand: What products? What price range? What brand personality?
- Build a real store layout: hero banner, featured products grid, category navigation.
- Product cards must have: image placeholder (use gradient + emoji as visual), product name, price, rating stars, "Add to Cart" button.
- Include a working cart system with localStorage: add items, show cart count, cart drawer/page with totals.
- Generate 6-8 realistic products with names, descriptions, and prices that match the described business.
- Add product quick-view modal, quantity selector, size/variant picker where relevant.
- Include trust badges, shipping info bar, and newsletter signup.
- Category filter sidebar or top tabs.`,

        saas: `SAAS INTELLIGENCE:
- This is a SaaS LANDING PAGE designed to convert visitors into signups.
- Parse the description to understand: What problem does it solve? Who is the target user? What's the core feature?
- Structure: Hero (problem statement + solution + CTA), Social proof bar (logos or stats), Feature deep-dives (3 with visuals), How it works (3 steps), Pricing table (3 tiers), Testimonials, FAQ, Final CTA.
- Write benefit-driven headlines, not feature-driven. "Save 10 hours/week" not "Task management tool."
- Pricing tiers must be realistic: Free/Starter, Pro, Enterprise with specific feature lists.
- Include micro-interactions: hover effects on cards, animated counters, scroll-triggered reveals.
- Add a floating "Get Started" button that appears after scrolling past the hero.`
      };

      systemPrompt = `You are Buildr AI, a world-class web developer and copywriter who builds production-ready single-page HTML projects. You don't just write code — you THINK about what the user needs, research the topic, and create something genuinely useful with real content.

CRITICAL RULES:
- Output ONLY valid HTML. No markdown, no explanation, no code fences. The first character must be < and the output must be a complete HTML document.
- All CSS in <style>, all JS in <script>. No external dependencies except Google Fonts.
- Mobile-first responsive design. Test every layout mentally at 375px, 768px, and 1440px.
- Vanilla JavaScript only — no React, Vue, or frameworks.

CONTENT RULES — THIS IS THE MOST IMPORTANT PART:
- NEVER use placeholder text like "Lorem ipsum", "[Your text here]", "Company Name", or "Description goes here."
- Read the user's description and UNDERSTAND their intent. What business is this? Who are their customers? What problem do they solve?
- Write REAL, specific content: real-sounding business names, real service descriptions, real testimonials with real names, real pricing that makes sense for the industry.
- Every word on the page should feel like it was written by a professional copywriter who understands the business.
- If the user says "dog grooming business" — write about specific grooming services, breed-specific care tips, real-sounding pricing ($35 for small dogs, $55 for large), testimonials from "Sarah M." about her golden retriever.

DESIGN SYSTEM:
- Fonts: Inter (body) and Space Grotesk (headings) from Google Fonts.
- Smooth animations: Use CSS transitions (0.3s ease), @keyframes for hero elements, IntersectionObserver for scroll-triggered fade-ins.
- Glass morphism where appropriate: backdrop-filter: blur(12px), semi-transparent backgrounds.
- Consistent spacing: Use CSS custom properties (--space-xs: 4px through --space-3xl: 64px).
- Border radius: Rounded corners (12-20px for cards, 50px for buttons).
- Shadows: Layered box-shadows for depth (small for cards, large for modals).
- Icons: Use simple SVG icons inline — no icon libraries. Draw clean, minimal icons.

THEME: ${theme || 'dark mode with cyan (#00D4FF), indigo (#6366F1), emerald (#10B981) accents on dark (#09090B) background'}

${typeGuidance[type] || typeGuidance.website}

PROJECT TYPE: ${type || 'website'}

${wizardData ? 'WIZARD SETTINGS: ' + JSON.stringify(wizardData) : ''}

${wizardData && wizardData.backend && wizardData.backend !== 'localstorage' ?
  wizardData.backend === 'firebase' ?
    'BACKEND: Include Firebase SDK setup with commented placeholders for config. Add Firestore read/write examples and Firebase Auth UI.' :
    'BACKEND: Include Supabase JS client setup with commented placeholders for config. Add example queries and auth flow.'
  : 'BACKEND: Use localStorage for data persistence where the project needs to store user data.'
}

Before writing code, mentally plan:
1. What is this project REALLY about? What does the user want to achieve?
2. What sections/pages/features does it need?
3. What real content should each section contain?
4. What interactions make it feel alive?
Then build it.`;

      userMessage = `Build a ${type || 'website'}: ${description}

Think step by step about what this project needs. Understand the purpose, the audience, and what would make this genuinely useful. Then generate the complete HTML.`;

    } else if (action === 'chat') {
      // ── Chat Assistant ──
      const { message, history } = body;
      maxTokens = 1024;
      systemPrompt = `You are Buildr AI Assistant, a friendly and helpful guide on the Buildr AI platform. You help users:
- Describe their project ideas clearly
- Choose the right project type (website, app, dashboard, social content)
- Understand features and pricing
- Navigate the build process

Keep responses concise (2-4 sentences max). Be warm, encouraging, and use simple language. The user may not know how to code — that's the whole point of Buildr AI.

Platform info:
- Free plan: 3,000 AI credits, basic templates (unlimited & free), Buildr AI watermark
- Pro Creator: $19/mo, 20,000 credits/month, no watermark, app store publishing, custom domain
- Business: $49/mo, 50,000 credits/month, team collab (5 seats), white-label, API access
- Credit costs: AI website/app/dashboard build = 100 credits, PDF = 50 credits/page, social content = 25 credits, chat = 5 credits, templates = free
- Web Publish: $5 one-time per project
- App Store Publish: $15 one-time per project
- Social Content Pro: $10/mo for daily auto-generated posts`;

      userMessage = message;

      // If there's conversation history, prepend it
      if (history && history.length > 0) {
        const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
        userMessage = `Previous conversation:\n${historyText}\n\nUser: ${message}`;
      }

    } else if (action === 'publish') {
      // ── Publish Agent ──
      const { message, projectType, history } = body;
      maxTokens = 1500;
      systemPrompt = `You are the Buildr AI Publishing Agent. You help users publish their projects step by step. Be specific, actionable, and encouraging.

The project type is: ${projectType || 'website'}

You know about:
- Vercel deployment (free hosting, custom domains)
- Apple App Store submission (Developer account $99/yr, Xcode, App Store Connect)
- Google Play Store submission (Developer account $25 one-time, Play Console, AAB files)
- Capacitor/Expo for wrapping web apps as native mobile apps
- Custom domain setup (DNS, CNAME records)
- Firebase & Supabase backend setup
- Analytics integration

Give step-by-step instructions. If the user seems stuck, offer to explain in more detail. Keep each response focused on 1-2 steps at a time so it's not overwhelming.`;

      userMessage = message;

      if (history && history.length > 0) {
        const historyText = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');
        userMessage = `Previous conversation:\n${historyText}\n\nUser: ${message}`;
      }

    } else if (action === 'pdf') {
      // ── PDF Document Generation ──
      const { description, docType, pages } = body;
      const pageCount = parseInt(pages) || 1;
      // Scale tokens based on page count (roughly 800 tokens per page of content)
      maxTokens = Math.min(16000, Math.max(4000, pageCount * 2000));
      systemPrompt = `You are Buildr AI, an expert document writer and designer. You RESEARCH topics thoroughly and generate complete, content-rich, print-ready HTML documents.

CRITICAL — CONTENT RULES:
- You are a RESEARCHER and WRITER, not just a designer. Write REAL, detailed, substantive content.
- DO NOT use placeholder text like "Lorem ipsum" or "[Insert here]" or "Company Name".
- Based on the user's description, use your knowledge to write factual, well-researched content.
- Include real statistics, data points, industry insights, and specific details where relevant.
- Write in a professional, authoritative tone appropriate to the document type.
- The document should be ${pageCount} page(s) long when printed on A4 paper.
- For ${pageCount} pages, write approximately ${pageCount * 400} words of actual content.

DESIGN RULES:
- Output ONLY valid HTML. No markdown, no explanation, no code fences.
- Include all CSS in a <style> tag. No JavaScript needed.
- Design for A4 paper: @page { size: A4; margin: 0.6in; }
- Use print-color-adjust: exact for colors and backgrounds.
- Use professional typography — Inter font from Google Fonts.
- Make it visually polished — clean spacing, subtle color accents, modern layout.
- Use CSS page-break-after/before to control multi-page layout.
${pageCount > 1 ? '- Add a table of contents for documents with multiple sections.' : ''}

DOCUMENT TYPE GUIDANCE:
- Report/Research: Title page, executive summary, detailed sections with data and analysis, conclusions, references.
- Resume/CV: Professional header, contact info, experience with achievements, education, skills, certifications.
- Proposal: Cover page, executive summary, problem statement, proposed solution, timeline, pricing, terms.
- Invoice: Company branding, bill-to/ship-to, itemized line items with quantities and prices, subtotals, tax, total due, payment terms.
- Guide/Tutorial: Introduction, numbered steps with detailed explanations, tips, troubleshooting, summary.
- Business Plan: Executive summary, market analysis, business model, marketing strategy, financial projections, team.
- Menu: Restaurant branding, categorized sections, items with descriptions and prices, specials.
- Certificate: Decorative border, institution name, recipient, achievement description, date, signature lines.
- Contract: Parties, recitals, terms and conditions, obligations, termination, signatures.
- Newsletter: Header banner, featured article, sections, sidebar content, call-to-action, footer.

DOCUMENT TYPE: ${docType || 'general document'}
TARGET LENGTH: ${pageCount} page(s)`;

      userMessage = `Research and write a complete ${pageCount}-page ${docType || 'document'}: ${description}`;

    } else {
      return res.status(400).json({ error: 'Invalid action. Use: generate, chat, publish, or pdf' });
    }

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', response.status, errorData);
      return res.status(response.status).json({
        error: 'AI service error',
        details: errorData.error?.message || 'Unknown error'
      });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    return res.status(200).json({
      content,
      usage: data.usage
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
