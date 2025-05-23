import { json } from '@remix-run/node';
import type { LoaderFunction } from '@remix-run/node';
import { getCitySuggestions } from '~/services/weather.server';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  if (!query) {
    return json({ suggestions: [] });
  }

  try {
    const suggestions = await getCitySuggestions(query);
    return json({ suggestions });
  } catch (error) {
    return json({ suggestions: [], error: 'Failed to fetch suggestions' });
  }
}; 