class MeteoApi {
    GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
    WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';

    CACHE_KEYS = {
        LOCATION_DATA: 'weather_location_data_openmeteo',
        LOCATION_DATE: 'weather_location_date_openmeteo',
        SEARCH_PREFIX: 'weather_search_openmeteo_',
        DATE_PREFIX: 'weather_date_openmeteo_'
    };

    WEATHER_CODES = {
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
    };

    getCurrentDateString() {
        return new Date().toDateString();
    }

    getCacheKey(location) {
        return this.CACHE_KEYS.SEARCH_PREFIX + location.toLowerCase().replace(/\s+/g, '_');
    }

    getDateKey(location) {
        return this.CACHE_KEYS.DATE_PREFIX + location.toLowerCase().replace(/\s+/g, '_');
    }

    saveToCache(key, data, dateKey = null) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            if (dateKey) {
                localStorage.setItem(dateKey, this.getCurrentDateString());
            }
        } catch (error) {
            console.warn('Failed to save to cache:', error);
        }
    }

    loadFromCache(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Failed to load from cache:', error);
            return null;
        }
    }

    isCacheValid(dateKey) {
        try {
            const savedDate = localStorage.getItem(dateKey);
            const currentDate = this.getCurrentDateString();
            return savedDate === currentDate;
        } catch (error) {
            return false;
        }
    }

    showCacheInfo() {
        const cacheInfo = document.getElementById('cacheInfo');
        cacheInfo.classList.add('show');
        setTimeout(() => {
            cacheInfo.classList.remove('show');
        }, 3000);
    }

    getWeatherIcon(code) {
        const weather = this.WEATHER_CODES[code] || { icon: '❓', desc: { en: 'Unknown', sk: 'Neznáme' } };
        return {
            icon: weather.icon,
            desc: weather.desc[currentLanguage] || weather.desc.en
        };
    }

    async getLocationWeather() {
        if (!navigator.geolocation) {
            this.showError(TRANSLATIONS[currentLanguage].errorGeolocationNotSupported);
            return;
        }

        this.showLoading();
        this.hideError();

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const locationString = `${latitude},${longitude}`;

                const cacheKey = this.getCacheKey(locationString);
                const dateKey = this.getDateKey(locationString);

                if (this.isCacheValid(dateKey)) {
                    const cachedData = this.loadFromCache(cacheKey);
                    if (cachedData) {
                        console.log('Using cached geolocation data from today');
                        this.displayWeather(cachedData);
                        this.hideLoading();
                        this.showWeatherContainer();
                        this.showCacheInfo();
                        return;
                    }
                }

                await this.getWeatherData(latitude, longitude, null, true);
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
            }
        );
    }

    async getWeatherByCity() {
        const city = document.getElementById('cityInput').value.trim();
        if (!city) {
            this.showError(TRANSLATIONS[currentLanguage].errorEnterCity);
            return;
        }

        const cacheKey = this.getCacheKey(city);
        const dateKey = this.getDateKey(city);

        if (this.isCacheValid(dateKey)) {
            const cachedData = this.loadFromCache(cacheKey);
            if (cachedData) {
                console.log(`Using cached data for ${city} from today`);
                this.displayWeather(cachedData);
                this.showWeatherContainer();
                this.showCacheInfo();
                return;
            }
        }

        this.showLoading();
        this.hideError();
        this.hideWeatherContainer();

        try {
            const geocodeResponse = await fetch(`${this.GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=${currentLanguage}&format=json`);
            const geocodeData = await geocodeResponse.json();

            if (!geocodeData.results || geocodeData.results.length === 0) {
                throw new Error(TRANSLATIONS[currentLanguage].errorCityNotFound);
            }

            const location = geocodeData.results[0];
            await this.getWeatherData(location.latitude, location.longitude, city, false);

        } catch (error) {
            this.hideLoading();
            console.error('Error fetching weather data:', error);
            this.showError(`Error: ${error.message}`);
        }
    }

    async getWeatherData(lat, lon, cityName = null, isLocationData = false) {
        try {
            const weatherResponse = await fetch(
                `${this.WEATHER_URL}?latitude=${lat}&longitude=${lon}` +
                `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index` +
                `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
                `&hourly=temperature_2m,weather_code` +
                `&timezone=auto&forecast_days=16`
            );

            if (!weatherResponse.ok) {
                throw new Error(`HTTP error! status: ${weatherResponse.status}`);
            }

            const weatherData = await weatherResponse.json();

            let locationName = cityName;
            if (!locationName) {
                try {
                    const reverseResponse = await fetch(`${this.GEOCODING_URL}?latitude=${lat}&longitude=${lon}&count=1&language=${currentLanguage}&format=json`);
                    const reverseData = await reverseResponse.json();
                    if (reverseData.results && reverseData.results.length > 0) {
                        locationName = `${reverseData.results[0].name}, ${reverseData.results[0].country}`;
                    } else {
                        locationName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                    }
                } catch (e) {
                    locationName = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                }
            }

            const processedData = {
                location: locationName,
                current: weatherData.current,
                daily: weatherData.daily,
                hourly: weatherData.hourly
            };

            if (isLocationData) {
                this.saveToCache(this.CACHE_KEYS.LOCATION_DATA, processedData, this.CACHE_KEYS.LOCATION_DATE);
            }

            const cacheKey = this.getCacheKey(cityName || `${lat},${lon}`);
            const dateKey = this.getDateKey(cityName || `${lat},${lon}`);
            this.saveToCache(cacheKey, processedData, dateKey);

            console.log(`Fresh data fetched and cached for: ${locationName}`);

            this.displayWeather(processedData);
            this.hideLoading();
            this.showWeatherContainer();

        } catch (error) {
            this.hideLoading();
            console.error('Error fetching weather data:', error);
            this.showError(`Error: ${error.message}`);
        }
    }

    displayWeather(data) {
        const { location, current, daily, hourly } = data;

        document.getElementById('location').textContent = location;
        document.getElementById('currentTemp').textContent = `${Math.round(current.temperature_2m)}°C`;

        const currentWeatherInfo = this.getWeatherIcon(current.weather_code);
        document.getElementById('currentIcon').textContent = currentWeatherInfo.icon;
        document.getElementById('currentDesc').textContent = currentWeatherInfo.desc;

        document.getElementById('feelsLike').textContent = `${Math.round(current.apparent_temperature)}°C`;
        document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
        document.getElementById('windSpeed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('uvIndex').textContent = Math.round(current.uv_index);

        this.displayForecast(daily, hourly);
    }

    displayForecast(daily, hourly) {
        const forecastGrid = document.getElementById('forecastGrid');
        forecastGrid.innerHTML = '';

        for (let i = 0; i < 16; i++) {
            const dayRow = this.createDayRow(daily, hourly, i);
            forecastGrid.appendChild(dayRow);
        }
    }

    createDayRow(daily, hourly, index) {
        const date = new Date(daily.time[index]);
        const dayName = getDayName(date, index);
        const formattedDate = getFormattedDate(date);

        const row = document.createElement('div');
        row.className = 'forecast-row';

        const dayHourIndex = index * 24 + 12;
        const nightHourIndex = index * 24;

        const dayWeatherCode = hourly.weather_code[dayHourIndex] || daily.weather_code[index];
        const nightWeatherCode = hourly.weather_code[nightHourIndex] || daily.weather_code[index];

        const dayWeather = this.getWeatherIcon(dayWeatherCode);
        const nightWeather = this.getWeatherIcon(nightWeatherCode);

        row.innerHTML = `
                    <div class="day-info">
                        <div class="day-name">${dayName}</div>
                        <div class="day-date">${formattedDate}</div>
                    </div>
                    <div class="temp-range">
                        ${Math.round(daily.temperature_2m_max[index])}°/${Math.round(daily.temperature_2m_min[index])}°
                    </div>
                    <div class="day-forecast">
                        <div class="period-icon">${dayWeather.icon}</div>
                        <div class="period-details">
                            <div class="period-temp">${Math.round(daily.temperature_2m_max[index])}°C</div>
                            <div class="period-desc">${dayWeather.desc}</div>
                        </div>
                    </div>
                    <div></div>
                    <div class="night-forecast">
                        <div class="period-icon">${nightWeather.icon}</div>
                        <div class="period-details">
                            <div class="period-temp">${Math.round(daily.temperature_2m_min[index])}°C</div>
                            <div class="period-desc">${nightWeather.desc}</div>
                        </div>
                    </div>
                `;

        return row;
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    hideError() {
        document.getElementById('errorMessage').style.display = 'none';
    }

    showWeatherContainer() {
        document.getElementById('weatherContainer').style.display = 'block';
    }

    hideWeatherContainer() {
        document.getElementById('weatherContainer').style.display = 'none';
    }
}