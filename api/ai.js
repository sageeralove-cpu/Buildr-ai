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
      maxTokens = 8000;
      systemPrompt = `You are Buildr AI, an expert web developer that generates complete, production-ready single-page HTML projects. You create beautiful, modern, responsive websites and apps.

RULES:
- Output ONLY valid HTML. No markdown, no explanation, no code fences.
- Include all CSS in a <style> tag and all JS in a <script> tag.
- Use modern CSS (grid, flexbox, variables, gradients, backdrop-filter).
- Use vanilla JavaScript only — no frameworks.
- Make it fully responsive (mobile-first).
- Add smooth animations and transitions.
- Include realistic placeholder content that matches the description.
- Use the Inter and Space Grotesk fonts from Google Fonts.
- The design should feel premium, clean, and modern.

THEME: ${theme || 'dark mode with cyan (#00D4FF), indigo (#6366F1), emerald (#10B981) accents on dark (#09090B) background'}

PROJECT TYPE: ${type || 'website'}

${wizardData ? 'WIZARD SETTINGS: ' + JSON.stringify(wizardData) : ''}

${wizardData && wizardData.backend && wizardData.backend !== 'localstorage' ?
  wizardData.backend === 'firebase' ?
    'BACKEND: Include Firebase SDK setup with commented placeholders for config. Add Firestore read/write examples and Firebase Auth UI.' :
    'BACKEND: Include Supabase JS client setup with commented placeholders for config. Add example queries and auth flow.'
  : 'BACKEND: Use localStorage for data persistence.'
}`;

      userMessage = `Build a ${type || 'website'}: ${description}`;

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
- Free plan: 3 projects, Buildr AI watermark
- Pro Creator: $29/mo, unlimited projects, no watermark, publishing
- Business: $99/mo, team collab, white-label, API
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
      const { description, docType } = body;
      maxTokens = 8000;
      systemPrompt = `You are Buildr AI, an expert document designer that generates beautiful, print-ready HTML documents styled for PDF output.

RULES:
- Output ONLY valid HTML. No markdown, no explanation, no code fences.
- Include all CSS in a <style> tag. No JavaScript needed.
- Design for A4 paper (210mm x 297mm). Use @page { size: A4; margin: 0.6in; }.
- Use print-color-adjust: exact for colors and backgrounds.
- Use professional, clean typography — Inter or system fonts.
- Include realistic placeholder content that matches the description.
- Use proper document structure: headers, sections, tables where appropriate.
- Make it visually stunning — use subtle color accents, clean spacing, and modern layout.
- For resumes: include name header, contact info, experience, education, skills sections.
- For invoices: include company header, bill-to, line items table, totals, payment terms.
- For reports: include title page, table of contents, sections with headings, charts/data.
- For proposals: include cover, executive summary, scope, timeline, pricing, terms.
- For menus: include restaurant name, categories, items with descriptions and prices.
- For certificates: include decorative borders, recipient name, achievement, date, signature line.

DOCUMENT TYPE: ${docType || 'general document'}`;

      userMessage = `Create a PDF document: ${description}`;

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
