/**
 * MÓDULO 1: API Open-Meteo & Processor de Atractores
 * Archivo: api.js
 */

import { fetchWeatherApi } from "openmeteo";

const DEFAULT_PARAMS = {
  latitude: 4.6097, // Bogotá
  longitude: -74.0817,
  hourly: [
    "precipitation_probability",
    "temperature_180m",
    "wind_speed_180m",
    "relative_humidity_2m",
    "shortwave_radiation",
    "surface_pressure",
    "wind_direction_10m",
  ],
  forecast_days: 3,
};

function buildRequestParams(options = {}) {
  return {
    ...DEFAULT_PARAMS,
    ...options,
    hourly: options.hourly ?? DEFAULT_PARAMS.hourly,
  };
}

function formatDate(date) {
  return date.toISOString().slice(0, 16).replace("T", " ");
}

function createMockWeatherData() {
  const mock = [];
  const startTime = new Date();

  for (let i = 0; i < 72; i += 1) {
    const timeSlot = new Date(startTime.getTime() + i * 3600 * 1000);
    mock.push({
      datetime: formatDate(timeSlot),
      precipitation_probability: Math.floor(Math.sin(i * 0.2) * 50 + 50),
      temperature_180m: Number((12 + Math.cos(i * 0.1) * 8).toFixed(1)),
      wind_speed_180m: Number((10 + Math.sin(i * 0.3) * 25).toFixed(1)),
      relative_humidity_2m: Math.floor(60 + Math.cos(i * 0.15) * 30),
      shortwave_radiation: Number(
        (Math.max(0, Math.sin(i * 0.26)) * 800).toFixed(1),
      ),
      surface_pressure: Number((750 + Math.cos(i * 0.05) * 15).toFixed(1)),
      wind_direction_10m: Math.floor((180 + Math.sin(i * 0.1) * 90) % 360),
    });
  }

  return mock;
}

function mapWeatherData(hourly, utcOffsetSeconds) {
  const totalPoints = Math.max(
    1,
    (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval(),
  );

  const time = Array.from(
    { length: totalPoints },
    (_, index) =>
      new Date(
        (Number(hourly.time()) + index * hourly.interval() + utcOffsetSeconds) *
          1000,
      ),
  );

  const precipitationProbability = hourly.variables(0).valuesArray();
  const temperature180m = hourly.variables(1).valuesArray();
  const windSpeed180m = hourly.variables(2).valuesArray();
  const relativeHumidity2m = hourly.variables(3).valuesArray();
  const shortwaveRadiation = hourly.variables(4).valuesArray();
  const surfacePressure = hourly.variables(5).valuesArray();
  const windDirection10m = hourly.variables(6).valuesArray();

  return time.map((date, index) => ({
    datetime: formatDate(date),
    precipitation_probability: precipitationProbability[index],
    temperature_180m: temperature180m[index],
    wind_speed_180m: windSpeed180m[index],
    relative_humidity_2m: relativeHumidity2m[index],
    shortwave_radiation: shortwaveRadiation[index],
    surface_pressure: surfacePressure[index],
    wind_direction_10m: windDirection10m[index],
  }));
}

export function processWeatherAttractors(rawRecords) {
  if (!rawRecords || rawRecords.length === 0) {
    return {
      avgTemp: 14.0,
      maxTemp: 20.0,
      minTemp: 8.0,
      avgWind: 15.0,
      maxWind: 30.0,
      avgPrecip: 20.0,
      maxPrecip: 50.0,
      avgHumidity: 65.0,
      avgRadiation: 250.0,
      avgPressure: 750.0,
      volatility: 0.3,
      records: [],
    };
  }

  let totalTemp = 0,
    maxTemp = -Infinity,
    minTemp = Infinity;
  let totalWind = 0,
    maxWind = 0;
  let totalPrecip = 0,
    maxPrecip = 0;
  let totalHumidity = 0;
  let totalRadiation = 0;
  let totalPressure = 0;

  rawRecords.forEach((r) => {
    const temp = r.temperature_180m || 14;
    const wind = r.wind_speed_180m || 0;
    const precip = r.precipitation_probability || 0;
    const humidity = r.relative_humidity_2m || 50;
    const rad = r.shortwave_radiation || 0;
    const press = r.surface_pressure || 750;

    totalTemp += temp;
    if (temp > maxTemp) maxTemp = temp;
    if (temp < minTemp) minTemp = temp;

    totalWind += wind;
    if (wind > maxWind) maxWind = wind;

    totalPrecip += precip;
    if (precip > maxPrecip) maxPrecip = precip;

    totalHumidity += humidity;
    totalRadiation += rad;
    totalPressure += press;
  });

  const count = rawRecords.length;
  const avgTemp = totalTemp / count;
  const avgWind = totalWind / count;
  const avgPrecip = totalPrecip / count;
  const avgHumidity = totalHumidity / count;
  const avgRadiation = totalRadiation / count;
  const avgPressure = totalPressure / count;

  const precipVariance =
    rawRecords.reduce(
      (sq, r) =>
        sq + Math.pow((r.precipitation_probability || 0) - avgPrecip, 2),
      0,
    ) / count;

  const volatility = Math.min(1.0, Math.sqrt(precipVariance) / 50.0);

  return {
    avgTemp: Number(avgTemp.toFixed(1)),
    maxTemp: Number(maxTemp.toFixed(1)),
    minTemp: Number(minTemp.toFixed(1)),
    avgWind: Number(avgWind.toFixed(2)),
    maxWind: Number(maxWind.toFixed(2)),
    avgPrecip: Number(avgPrecip.toFixed(2)),
    maxPrecip: Number(maxPrecip.toFixed(2)),
    avgHumidity: Number(avgHumidity.toFixed(2)),
    avgRadiation: Number(avgRadiation.toFixed(1)),
    avgPressure: Number(avgPressure.toFixed(1)),
    volatility: Number(volatility.toFixed(2)),
    records: rawRecords,
  };
}

export async function fetchWeatherData(options = {}) {
  const params = buildRequestParams(options);

  try {
    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);
    const response = responses[0];
    const utcOffsetSeconds = response.utcOffsetSeconds();
    const hourly = response.hourly();

    const rawRecords = mapWeatherData(hourly, utcOffsetSeconds);
    return processWeatherAttractors(rawRecords);
  } catch (error) {
    console.warn(
      "⚠️ No se pudo consultar Open-Meteo. Se usará el mock de respaldo.",
      error,
    );
    const mockRecords = createMockWeatherData();
    return processWeatherAttractors(mockRecords);
  }
}

export default fetchWeatherData;
