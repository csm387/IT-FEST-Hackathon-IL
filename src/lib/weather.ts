import { queryOptions } from "@tanstack/react-query";

export interface Weather {
  current: { temperature_2m: number; cloud_cover: number; wind_speed_10m: number; weather_code: number; shortwave_radiation: number };
  hourly: { time: string[]; temperature_2m: number[]; cloud_cover: number[]; shortwave_radiation: number[] };
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; weather_code: number[]; sunrise: string[]; sunset: string[]; shortwave_radiation_sum: number[] };
}

export const weatherQuery = (lat: number, lng: number) =>
  queryOptions({
    queryKey: ["weather", lat.toFixed(2), lng.toFixed(2)],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Weather> => {
      const u = new URL("https://api.open-meteo.com/v1/forecast");
      u.search = new URLSearchParams({
        latitude: String(lat), longitude: String(lng), timezone: "Europe/Bucharest", forecast_days: "7",
        current: "temperature_2m,cloud_cover,wind_speed_10m,weather_code,shortwave_radiation",
        hourly: "temperature_2m,cloud_cover,shortwave_radiation",
        daily: "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,shortwave_radiation_sum",
      }).toString();
      const res = await fetch(u);
      if (!res.ok) throw new Error("Weather unavailable");
      return res.json();
    },
  });

export function weatherLabel(code: number) {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Showers";
  return "Thunderstorm";
}

/** Simple PV forecast from irradiance (W/m²): P = kWp * G/1000 * PR, temperature derate. */
export function pvFromIrradiance(kWp: number, ghi: number, tempC: number, pr = 0.82) {
  const derate = 1 - Math.max(0, tempC + ghi / 40 - 25) * 0.004;
  return Math.max(0, kWp * (ghi / 1000) * pr * derate);
}
