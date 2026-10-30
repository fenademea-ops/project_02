export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/cars', '/cars/*'],
        disallow: [
          '/dashboard',
          '/dashboard/*',
          '/bookings',
          '/bookings/*',
          '/owner',
          '/owner/*',
          '/admin',
          '/admin/*',
          '/checkout',
          '/checkout/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
