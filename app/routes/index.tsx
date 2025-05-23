// app/routes/index.tsx
import { useLoaderData, Form } from "@remix-run/react";
import type { LoaderFunction, ActionFunction } from "@remix-run/node";
import { requireUser } from "~/utils/session.server";
import { User } from "~/models/user.server";

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await requireUser(request);
  const user = await User.findById(userId);
  const weatherData = await Promise.all(
    user!.favorites.map((city) =>
      fetch(
        `https://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${city}`
      ).then((r) => r.json())
    )
  );
  return { username: user!.username, favorites: user!.favorites, weatherData };
};

export const action: ActionFunction = async ({ request }) => {
  const form = await request.formData();
  const city = form.get("city")?.toString();
  const remove = form.get("remove")?.toString();
  const userId = await requireUser(request);
  const user = await User.findById(userId);

  if (remove) {
    user!.favorites = user!.favorites.filter((c) => c !== remove);
  } else if (city && user!.favorites.length < 5) {
    user!.favorites.push(city);
  }

  await user!.save();
  return null;
};

export default function Index() {
  const { username, favorites, weatherData } = useLoaderData<typeof loader>();
  return (
    <div style={{ padding: 20 }}>
      <h1>Welcome, {username}!</h1>

      <Form method="post" style={{ marginBottom: 20 }}>
        <input name="city" placeholder="Add city" required />
        <button type="submit" disabled={favorites.length >= 5}>
          Add
        </button>
      </Form>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {weatherData.map((w: any) => (
          <div
            key={w.location.name}
            style={{
              border: "1px solid #ccc",
              padding: 16,
              borderRadius: 8,
              width: 200,
            }}
          >
            <h2>{w.location.name}</h2>
            <img src={w.current.condition.icon} alt={w.current.condition.text} />
            <p>{w.current.condition.text}</p>
            <p>Temp: {w.current.temp_c}°C</p>
            <p>Humidity: {w.current.humidity}%</p>
            <p>Precip: {w.current.precip_mm} mm</p>
            <Form method="post">
              <input type="hidden" name="remove" value={w.location.name} />
              <button type="submit">Remove</button>
            </Form>
          </div>
        ))}
      </div>
    </div>
  );
}
