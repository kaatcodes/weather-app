// app/config.server.ts
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!WEATHER_API_KEY) {
  throw new Error('WEATHER_API_KEY must be set');
}

export { WEATHER_API_KEY }; 