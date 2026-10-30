import { SEED_CARS } from '@/lib/seed';

export default function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const approvedCars = SEED_CARS.filter((c) => c.status === 'approved');

  const staticRoutes = [
    {
      url: `${baseUrl}`,
      lastModified: '2026-10-21T00:00:00.000Z',
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cars`,
      lastModified: '2026-10-21T00:00:00.000Z',
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/signin`,
      lastModified: '2026-10-21T00:00:00.000Z',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: '2026-10-21T00:00:00.000Z',
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  const carRoutes = approvedCars.map((car) => ({
    url: `${baseUrl}/cars/${car.id}`,
    lastModified: car.createdAt || '2026-10-21T00:00:00.000Z',
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...carRoutes];
}
