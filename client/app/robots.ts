import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/docs', '/solutions', '/llms.txt', '/llms-full.txt'],
        disallow: [
          '/admin',
          '/admin/*',
          '/auth',
          '/auth/*',
          '/reset-password',
          '/reset-password/*',
          '/verify-otp',
          '/verify-otp/*',
          '/api/*',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
          'Google-Extended',
          'Applebot-Extended',
        ],
        allow: ['/', '/pricing', '/docs', '/solutions', '/llms.txt', '/llms-full.txt'],
        disallow: [
          '/admin',
          '/admin/*',
          '/auth/*',
          '/api/*',
        ],
      },
    ],
    sitemap: 'https://tryora.live/sitemap.xml',
  };
}
