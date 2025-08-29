const APIS = {
    OPENMETEO: 'openmeteo',
    WEATHERAPI: 'weatherapi'
}

class UnifiedWeatherApi {
    constructor() {
        // API configurations - easy to extend for future APIs
        this.apiConfigs = {
            openmeteo: {
                name: APIS.OPENMETEO,
                title: 'Open-Meteo (Free 16-day)',
                baseUrl: 'https://api.open-meteo.com/v1/forecast',
                geocodingUrl: 'https://geocoding-api.open-meteo.com/v1/search',
                apiKey: null, // No API key needed
                weatherCodes: {
                    0: { icon: '☀️', desc: { en: 'Clear sky', sk: 'Jasno' } },
                    1: { icon: '🌤️', desc: { en: 'Mainly clear', sk: 'Prevažne jasno' } },
                    2: { icon: '⛅', desc: { en: 'Partly cloudy', sk: 'Čiastočne oblačno' } },
                    3: { icon: '☁️', desc: { en: 'Overcast', sk: 'Zamračené' } },
                    45: { icon: '🌫️', desc: { en: 'Fog', sk: 'Hmla' } },
                    48: { icon: '🌫️', desc: { en: 'Depositing rime fog', sk: 'Námrazová hmla' } },
                    51: { icon: '🌦️', desc: { en: 'Light drizzle', sk: 'Slabé mrholenie' } },
                    53: { icon: '🌦️', desc: { en: 'Moderate drizzle', sk: 'Mierné mrholenie' } },
                    55: { icon: '🌦️', desc: { en: 'Dense drizzle', sk: 'Husté mrholenie' } },
                    56: { icon: '🌧️', desc: { en: 'Light freezing drizzle', sk: 'Slabé mrznúce mrholenie' } },
                    57: { icon: '🌧️', desc: { en: 'Dense freezing drizzle', sk: 'Husté mrznúce mrholenie' } },
                    61: { icon: '🌧️', desc: { en: 'Slight rain', sk: 'Slabý dážď' } },
                    63: { icon: '🌧️', desc: { en: 'Moderate rain', sk: 'Mierny dážď' } },
                    65: { icon: '🌧️', desc: { en: 'Heavy rain', sk: 'Silný dážď' } },
                    66: { icon: '🌧️', desc: { en: 'Light freezing rain', sk: 'Slabý mrznúci dážď' } },
                    67: { icon: '🌧️', desc: { en: 'Heavy freezing rain', sk: 'Silný mrznúci dážď' } },
                    71: { icon: '🌨️', desc: { en: 'Slight snow fall', sk: 'Slabé sneženie' } },
                    73: { icon: '🌨️', desc: { en: 'Moderate snow fall', sk: 'Mierné sneženie' } },
                    75: { icon: '❄️', desc: { en: 'Heavy snow fall', sk: 'Silné sneženie' } },
                    77: { icon: '❄️', desc: { en: 'Snow grains', sk: 'Snehové zrná' } },
                    80: { icon: '🌦️', desc: { en: 'Slight rain showers', sk: 'Slabé prehánky' } },
                    81: { icon: '🌧️', desc: { en: 'Moderate rain showers', sk: 'Mierné prehánky' } },
                    82: { icon: '🌧️', desc: { en: 'Violent rain showers', sk: 'Silné prehánky' } },
                    85: { icon: '🌨️', desc: { en: 'Slight snow showers', sk: 'Slabé snehové prehánky' } },
                    86: { icon: '❄️', desc: { en: 'Heavy snow showers', sk: 'Silné snehové prehánky' } },
                    95: { icon: '⛈️', desc: { en: 'Thunderstorm', sk: 'Búrka' } },
                    96: { icon: '⛈️', desc: { en: 'Thunderstorm with slight hail', sk: 'Búrka s miernym krupobitím' } },
                    99: { icon: '⛈️', desc: { en: 'Thunderstorm with heavy hail', sk: 'Búrka so silným krupobitím' } }
                }
            },
            weatherapi: {
                name: APIS.WEATHERAPI,
                title: 'WeatherAPI (3-day)',
                baseUrl: 'https://api.weatherapi.com/v1/forecast.json',
                geocodingUrl: null,
                apiKey: 'f98f99a02c5547fa8c692204252908', // Replace with your API key
                weatherCodes: null // Uses icon URLs instead
            }
        };
    }

    getCurrentDateString() {
        return new Date().toDateString();
    }

    async getLocationByCoordination(lat, lon) {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }
        const data = await response.json();
        return `${data.address.city ?? data.address.town?.split(' - ')[0]}, ${data.address.country}`;
    }

    async getLocationByCity(city) {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&addressdetails=1&limit=1`);
        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }
        const data = await response.json();
        return { latitude: data[0].lat, longitude: data[0].lon };
    }

    //////////////////////////////////////////////
    //////////////////////////////////////////////
    ////                                      //// 
    ////           Cache management           ////
    ////                                      ////
    //////////////////////////////////////////////
    //////////////////////////////////////////////

    getCacheData(apiName, location) {
        const data = this.loadFromCache(apiName);
        const today = new Date().toDateString();
        if (data?.timestamp !== today || location && (data?.location !== location)) {
            this.clearCache(apiName);
            return null;
        }
        else {
            return data;
        }
    }

    clearCache(apiName) {
        window.localStorage.removeItem(apiName);
    }

    saveToCache(apiName, data) {
        const today = new Date().toDateString();
        window.localStorage.setItem(apiName, JSON.stringify({ ...data, timestamp: today }));
    }

    loadFromCache(apiName) {
        return JSON.parse(window.localStorage.getItem(apiName));
    }

    //////////////////////////////////////////////
    //////////////////////////////////////////////
    ////                                      //// 
    ////            Open Meteo api            ////
    ////                                      ////
    //////////////////////////////////////////////
    //////////////////////////////////////////////

    async fetchOpenMeteoData(lat, lon) {
        const config = this.apiConfigs.openmeteo;
        const url = `${config.baseUrl}?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index` +
            `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
            `&hourly=temperature_2m,weather_code` +
            `&timezone=auto&forecast_days=16`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`OpenMeteo API error: ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return this.transformOpenMeteoData(data, await this.getLocationByCoordination(lat, lon));
    }

    transformOpenMeteoData(data, locationInfo = null) {
        const config = this.apiConfigs.openmeteo;
        const getWeatherInfo = (code) => {
            const weather = config.weatherCodes[code] || { icon: '❓', desc: { en: 'Unknown', sk: 'Neznáme' } };
            return {
                icon: weather.icon,
                description: weather.desc[currentLanguage] || weather.desc.en
            };
        };

        const current = data.current;
        const currentWeather = getWeatherInfo(current.weather_code);

        // Create forecast array
        const forecast = [];
        for (let i = 0; i < Math.min(16, data.daily.time.length); i++) {
            const dayHourIndex = i * 24 + 12;
            const nightHourIndex = i * 24;

            const dayWeatherCode = data.hourly.weather_code[dayHourIndex] || data.daily.weather_code[i];
            const nightWeatherCode = data.hourly.weather_code[nightHourIndex] || data.daily.weather_code[i];

            forecast.push({
                date: data.daily.time[i],
                maxTemp: Math.round(data.daily.temperature_2m_max[i]),
                minTemp: Math.round(data.daily.temperature_2m_min[i]),
                dayCondition: getWeatherInfo(dayWeatherCode),
                nightCondition: getWeatherInfo(nightWeatherCode)
            });
        }

        return {
            apiSource: 'openmeteo',
            location: locationInfo,
            current: {
                temp: Math.round(current.temperature_2m),
                feelsLike: Math.round(current.apparent_temperature),
                humidity: current.relative_humidity_2m,
                windSpeed: Math.round(current.wind_speed_10m),
                uvIndex: Math.round(current.uv_index),
                condition: currentWeather
            },
            forecast: forecast
        };
    }

    //////////////////////////////////////////////
    //////////////////////////////////////////////
    ////                                      //// 
    ////             Weather api              ////
    ////                                      ////
    //////////////////////////////////////////////
    //////////////////////////////////////////////

    async fetchWeatherApiData(lat, lon) {
        const config = this.apiConfigs.weatherapi;
        if (!config.apiKey) {
            throw new Error('WeatherAPI key not configured');
        }

        const lang = currentLanguage === 'sk' ? 'sk' : 'en';
        const url = `${config.baseUrl}?key=${config.apiKey}&q=${lat},${lon}&days=3&aqi=no&alerts=no&lang=${lang}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`WeatherAPI error: ${response.status}`);

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return this.transformWeatherApiData(data, await this.getLocationByCoordination(lat, lon));
    }

    transformWeatherApiData(data, locationInfo = null) {
        const forecast = data.forecast.forecastday.map(day => {
            const hourlyData = day.hour;
            const dayHour = hourlyData[11];
            const nightHour = hourlyData[hourlyData.length - 1];

            return {
                date: day.date,
                maxTemp: Math.round(day.day.maxtemp_c),
                minTemp: Math.round(day.day.mintemp_c),
                dayCondition: {
                    icon: `<img src="https:${dayHour.condition.icon}" alt="Day weather" style="width: 30px; height: 30px;">`,
                    description: dayHour.condition.text
                },
                nightCondition: {
                    icon: `<img src="https:${nightHour.condition.icon}" alt="Night weather" style="width: 30px; height: 30px;">`,
                    description: nightHour.condition.text
                }
            };
        });

        return {
            apiSource: APIS.WEATHERAPI,
            location: locationInfo,
            current: {
                temp: Math.round(data.current.temp_c),
                feelsLike: Math.round(data.current.feelslike_c),
                humidity: data.current.humidity,
                windSpeed: data.current.wind_kph,
                uvIndex: data.current.uv,
                condition: {
                    icon: `<img src="https:${data.current.condition.icon}" alt="Weather" style="width: 60px; height: 60px;">`,
                    description: data.current.condition.text
                }
            },
            forecast: forecast
        };
    }

    //////////////////////////////////////////////
    //////////////////////////////////////////////
    ////                                      //// 
    ////    Main weather fetching function    ////
    ////                                      ////
    //////////////////////////////////////////////
    //////////////////////////////////////////////

    async getWeatherData(primaryApi, city) {
        if (!primaryApi) {
            throw new Error('Primary API not specified');
        }

        let lat = null;
        let lon = null;

        const cachedData = this.getCacheData(primaryApi, city);

        if (cachedData) {
            console.log(`Using cached data from ${primaryApi}`);
            this.hideLoading();
            return cachedData
        }
        else if (!city) {
            const coordinates = await this.getLocation();
            lat = coordinates.latitude;
            lon = coordinates.longitude;
        }
        else {
            const coordinates = await this.getLocationByCity(city);
            lat = coordinates.latitude;
            lon = coordinates.longitude;
        }

        this.showLoading();
        this.hideError();

        try {
            let data;
            if (primaryApi === APIS.OPENMETEO) {
                data = await this.fetchOpenMeteoData(lat, lon);
            }
            else if (primaryApi === APIS.WEATHERAPI) {
                data = await this.fetchWeatherApiData(lat, lon);
            }
            else {
                throw new Error(`Unknown primary API: ${primaryApi}`);
            }

            if (!data) {
                throw new Error('Weather API failed to provide data');
            }

            this.saveToCache(primaryApi, data);
            this.hideLoading();
            return data;

        } catch (error) {
            this.hideLoading();
            console.error('Error fetching weather data:', error);
            this.showError(`Error: ${error.message}`);
            throw error;
        }
    }

    async getLocation() {
        if (!navigator.geolocation) {
            this.showError(TRANSLATIONS[currentLanguage].errorGeolocationNotSupported);
            return;
        }

        this.showLoading();
        this.hideError();

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        resolve({ latitude, longitude });
                    } catch (error) {
                        reject(error);
                    }
                },
                (error) => {
                    this.hideLoading();
                    const t = TRANSLATIONS[currentLanguage];
                    let errorMessage = t.errorUnableToGetLocation;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += t.errorLocationDenied;
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += t.errorLocationUnavailable;
                            break;
                        case error.TIMEOUT:
                            errorMessage += t.errorLocationTimeout;
                            break;
                        default:
                            errorMessage += t.errorLocationUnknown;
                            break;
                    }
                    this.showError(errorMessage);
                    reject(new Error(errorMessage));
                }
            );
        });
    }

    //////////////////////////////////////////////
    //////////////////////////////////////////////
    ////                                      //// 
    ////             UI functions             ////
    ////                                      ////
    //////////////////////////////////////////////
    //////////////////////////////////////////////

    displayWeather(data) {
        const { location, current, forecast } = data;

        document.getElementById('location').textContent = location;
        document.getElementById('currentTemp').textContent = `${current.temp}°C`;
        document.getElementById('currentDesc').textContent = current.condition.description;
        document.getElementById('feelsLike').textContent = `${current.feelsLike}°C`;
        document.getElementById('humidity').textContent = `${current.humidity}%`;
        document.getElementById('windSpeed').textContent = `${current.windSpeed} km/h`;
        document.getElementById('uvIndex').textContent = current.uvIndex;

        // Handle icon display (string for emojis, HTML for images)
        const iconElement = document.getElementById('currentIcon');
        if (typeof current.condition.icon === 'string' && current.condition.icon.includes('<img')) {
            iconElement.innerHTML = current.condition.icon;
        } else {
            iconElement.textContent = current.condition.icon;
        }

        this.displayForecast(forecast);
        this.showWeatherContainer();
    }

    displayForecast(forecast) {
        const forecastGrid = document.getElementById('forecastGrid');
        if (!forecastGrid) return;

        forecastGrid.innerHTML = '';

        forecast.forEach((day, index) => {
            const dayRow = this.createDayRow(day, index);
            forecastGrid.appendChild(dayRow);
        });
    }

    createDayRow(dayData, index) {
        const date = new Date(dayData.date);
        const dayName = getDayName(date, index);
        const formattedDate = getFormattedDate(date);

        const row = document.createElement('div');
        row.className = 'forecast-row';

        row.innerHTML = `
            <div class="day-info">
                <div class="day-name">${dayName}</div>
                <div class="day-date">${formattedDate}</div>
            </div>
            <div class="temp-range">
                ${dayData.maxTemp}°/${dayData.minTemp}°
            </div>
            <div class="day-forecast">
                <div class="period-icon">${dayData.dayCondition.icon}</div>
                <div class="period-details">
                    <div class="period-temp">${dayData.maxTemp}°C</div>
                    <div class="period-desc">${dayData.dayCondition.description}</div>
                </div>
            </div>
            <div></div>
            <div class="night-forecast">
                <div class="period-icon">${dayData.nightCondition.icon}</div>
                <div class="period-details">
                    <div class="period-temp">${dayData.minTemp}°C</div>
                    <div class="period-desc">${dayData.nightCondition.description}</div>
                </div>
            </div>
        `;

        return row;
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'block';
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) errorElement.style.display = 'none';
    }

    showWeatherContainer() {
        const container = document.getElementById('weatherContainer');
        if (container) container.style.display = 'block';
    }

    hideWeatherContainer() {
        const container = document.getElementById('weatherContainer');
        if (container) container.style.display = 'none';
    }
}