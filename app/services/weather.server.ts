// app/services/weather.server.ts
import { WEATHER_API_KEY } from '~/config.server';

export class WeatherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherError';
  }
}

export interface WeatherData {
  location: {
    name: string;
    country: string;
    region: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
      icon: string;
    };
    humidity: number;
    precip_mm: number;
  };
}

export interface CitySuggestion {
  name: string;
  country: string;
  region: string;
  id: string;
}

export async function getWeatherForCity(city: string): Promise<WeatherData> {
  const response = await fetch(
    `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new WeatherError(`City "${city}" not found`);
    }
    throw new WeatherError('Failed to fetch weather data');
  }

  const data = await response.json();
  return data;
}

export async function getCitySuggestions(query: string): Promise<CitySuggestion[]> {
  if (query.length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/search.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new WeatherError('Failed to fetch city suggestions');
    }

    const data = await response.json();
    return data.map((city: any) => ({
      name: city.name,
      country: city.country,
      region: city.region,
      id: `${city.name}-${city.country}`,
    }));
  } catch (error) {
    if (error instanceof WeatherError) {
      throw error;
    }
    throw new WeatherError('Failed to fetch city suggestions');
  }
} 