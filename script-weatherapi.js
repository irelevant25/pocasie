class WeatherApi {
    API_KEY = 'f98f99a02c5547fa8c692204252908';
    FORECAST_URL = 'https://api.weatherapi.com/v1/forecast.json';

    CACHE_KEYS = {
        LOCATION_DATA: 'weather_location_data_weatherapi',
        LOCATION_DATE: 'weather_location_date_weatherapi',
        SEARCH_PREFIX: 'weather_search_weatherapi_',
        DATE_PREFIX: 'weather_date_weatherapi_'
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

                await this.getWeatherData(locationString, true);
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

        await this.getWeatherData(city, false);
    }

    async getWeatherData(location, isLocationData = false) {
        this.showLoading();
        this.hideError();
        this.hideWeatherContainer();

        if (this.API_KEY === 'YOUR_API_KEY_HERE') {
            this.hideLoading();
            this.showError(TRANSLATIONS[currentLanguage].errorApiKey);
            return;
        }

        try {
            const lang = currentLanguage === 'sk' ? 'sk' : 'en';
            const response = await fetch(`${this.FORECAST_URL}?key=${this.API_KEY}&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=no&lang=${lang}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            if (isLocationData) {
                this.saveToCache(this.CACHE_KEYS.LOCATION_DATA, data, this.CACHE_KEYS.LOCATION_DATE);
            }

            const cacheKey = this.getCacheKey(location);
            const dateKey = this.getDateKey(location);
            this.saveToCache(cacheKey, data, dateKey);

            console.log(`Fresh data fetched and cached for: ${location}`);

            this.displayWeather(data);
            this.hideLoading();
            this.showWeatherContainer();

        } catch (error) {
            this.hideLoading();
            console.error('Error fetching weather data:', error);
            this.showError(`Error: ${error.message}`);
        }
    }

    displayWeather(data) {
        const { location, current, forecast } = data;

        document.getElementById('location').textContent = `${location.name}, ${location.country}`;
        document.getElementById('currentTemp').textContent = `${Math.round(current.temp_c)}°C`;
        document.getElementById('currentDesc').textContent = current.condition.text;
        document.getElementById('feelsLike').textContent = `${Math.round(current.feelslike_c)}°C`;
        document.getElementById('humidity').textContent = `${current.humidity}%`;
        document.getElementById('windSpeed').textContent = `${current.wind_kph} km/h`;
        document.getElementById('uvIndex').textContent = current.uv;

        const iconUrl = `https:${current.condition.icon}`;
        document.getElementById('currentIcon').innerHTML = `<img src="${iconUrl}" alt="Weather" style="width: 60px; height: 60px;">`;

        this.displayForecast(forecast.forecastday);
    }

    displayForecast(forecastDays) {
        const forecastGrid = document.getElementById('forecastGrid');
        forecastGrid.innerHTML = '';

        forecastDays.forEach((day, index) => {
            const dayCard = this.createDayRow(day, index);
            forecastGrid.appendChild(dayCard);
        });
    }

    createDayRow(dayData, index) {
        const date = new Date(dayData.date);
        const dayName = getDayName(date, index);
        const formattedDate = getFormattedDate(date);

        const row = document.createElement('div');
        row.className = 'forecast-row';

        const hourlyData = dayData.hour;
        const dayHour = hourlyData[12];
        const nightHour = hourlyData[0];

        row.innerHTML = `
                <div class="day-info">
                    <div class="day-name">${dayName}</div>
                    <div class="day-date">${formattedDate}</div>
                </div>
                <div class="temp-range">
                    ${Math.round(dayData.day.maxtemp_c)}°/${Math.round(dayData.day.mintemp_c)}°
                </div>
                <div class="day-forecast">
                    <img class="period-icon" src="https:${dayHour.condition.icon}" alt="Day weather" style="width: 30px; height: 30px;">
                    <div class="period-details">
                        <div class="period-temp">${Math.round(dayData.day.maxtemp_c)}°C</div>
                        <div class="period-desc">${dayHour.condition.text}</div>
                    </div>
                </div>
                <div></div>
                <div class="night-forecast">
                    <img class="period-icon" src="https:${nightHour.condition.icon}" alt="Night weather" style="width: 30px; height: 30px;">
                    <div class="period-details">
                        <div class="period-temp">${Math.round(dayData.day.mintemp_c)}°C</div>
                        <div class="period-desc">${nightHour.condition.text}</div>
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