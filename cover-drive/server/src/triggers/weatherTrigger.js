const axios = require('axios');
const supabase = require('../utils/supabase');
const { processAutoClaims } = require('./autoClaimProcessor');

// City → lat/lon mapping
const CITY_COORDS = {
  Chennai:    { lat: 13.0827, lon: 80.2707 },
  Mumbai:     { lat: 19.0760, lon: 72.8777 },
  Bengaluru:  { lat: 12.9716, lon: 77.5946 },
  Hyderabad:  { lat: 17.3850, lon: 78.4867 },
  Delhi:      { lat: 28.7041, lon: 77.1025 },
};

// Zone codes by city
const CITY_ZONES = {
  Chennai:   ['CHN-ANN','CHN-VEL','CHN-TNG','CHN-TAM','CHN-SHO','CHN-PER','CHN-ADY','CHN-CHR','CHN-POR','CHN-KOD'],
  Mumbai:    ['MUM-KUR','MUM-BAN','MUM-AND'],
  Bengaluru: ['BLR-KOR','BLR-WHI','BLR-MAR'],
  Hyderabad: ['HYD-HIT','HYD-LBN'],
};

async function runWeatherTrigger() {
  console.log('[WeatherTrigger] Checking...');
  const API_KEY = process.env.OPENWEATHER_API_KEY;

  if (!API_KEY || API_KEY === 'your_openweather_api_key') {
    // Use mock data when no real API key
    return runMockWeatherTrigger();
  }

  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    try {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather`,
        {
          params: {
            lat: coords.lat,
            lon: coords.lon,
            appid: API_KEY,
            units: 'metric'
          },
          timeout: 8000
        }
      );

      const weather = res.data;
      const rain1h   = weather.rain?.['1h'] || 0;
      const windSpeed = weather.wind?.speed || 0;
      const weatherId = weather.weather[0]?.id;

      // Thunderstorm: 2xx, Heavy rain: rain > 15mm/hr, High wind: > 20 m/s
      const isStorm     = weatherId >= 200 && weatherId < 300;
      const isHeavyRain = rain1h > 15;
      const isHighWind  = windSpeed > 20;

      if (isStorm || isHeavyRain || isHighWind) {
        const severity = rain1h > 40 || isStorm ? 'critical'
                       : rain1h > 25 ? 'high'
                       : rain1h > 15 ? 'medium' : 'low';

        const affectedZones = CITY_ZONES[city] || [];
        const title = isStorm ? `Thunderstorm in ${city}`
                    : isHeavyRain ? `Heavy Rainfall in ${city}`
                    : `High Wind Alert in ${city}`;

        // Check if already active trigger for this city in last 2h
        const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
        const { data: existing } = await supabase
          .from('disruption_triggers')
          .select('id')
          .eq('trigger_type', 'weather_storm')
          .eq('is_active', true)
          .contains('affected_zones', [affectedZones[0]])
          .gte('triggered_at', twoHoursAgo)
          .maybeSingle();

        if (existing) {
          console.log(`[WeatherTrigger] Already active for ${city}, skipping`);
          continue;
        }

        const { data: trigger } = await supabase
          .from('disruption_triggers')
          .insert({
            trigger_type:   'weather_storm',
            severity,
            affected_zones: affectedZones,
            title,
            description:    `Rain: ${rain1h}mm/hr, Wind: ${windSpeed}m/s, Conditions: ${weather.weather[0]?.description}`,
            api_source:     'OpenWeatherMap',
            raw_payload:    weather,
            is_active:      true,
          })
          .select('id')
          .single();

        await processAutoClaims(trigger.id, affectedZones, 'weather_storm', severity);
        console.log(`[WeatherTrigger] ⛈️  Alert created for ${city} — ${severity}`);
      } else {
        console.log(`[WeatherTrigger] ${city}: Clear (rain: ${rain1h}mm, wind: ${windSpeed}m/s)`);
      }
    } catch (err) {
      console.error(`[WeatherTrigger] Error for ${city}:`, err.message);
    }
  }
}

async function runMockWeatherTrigger() {
  console.log('[WeatherTrigger] Using mock data (no API key)');
  // Randomly simulate an alert 20% of the time
  if (Math.random() > 0.8) {
    const city = 'Chennai';
    const affectedZones = ['CHN-VEL', 'CHN-ADY', 'CHN-SHO'];
    const { data: trigger } = await supabase
      .from('disruption_triggers')
      .insert({
        trigger_type:   'weather_storm',
        severity:       'medium',
        affected_zones: affectedZones,
        title:          `Heavy Rainfall Alert — ${city} (Mock)`,
        description:    'Mock: Rain: 22mm/hr, Wind: 12m/s, Conditions: heavy intensity rain',
        api_source:     'Mock-OpenWeatherMap',
        raw_payload:    { mock: true, rain: { '1h': 22 }, wind: { speed: 12 } },
        is_active:      true,
      })
      .select('id')
      .single();

    if (trigger) {
      await processAutoClaims(trigger.id, affectedZones, 'weather_storm', 'medium');
      console.log('[WeatherTrigger] 🌧️  Mock alert fired for Chennai');
    }
  }
}

module.exports = { runWeatherTrigger };