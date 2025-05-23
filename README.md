# Weather App

A full-stack weather application built with Remix, React, Material-UI, and MongoDB.

## Features

- User authentication
- Weather information for favorite cities
- Add/remove cities from favorites (max 5 cities)
- Persistent user sessions
- Responsive design

## Tech Stack

- Remix (React framework)
- Material-UI (Component library)
- MongoDB (Database)
- TypeScript
- WeatherAPI (Weather data)

## Prerequisites

- Node.js >= 20.0.0
- MongoDB database
- WeatherAPI account and API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd weather-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=random_long_string
WEATHER_API_KEY=your_weatherapi_key
```
For demo purposes, I have uploaded my .env temporarily

4. Seed the database with the default user:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```


## Default User

- Username: ipgautomotive
- Password: carmaker

