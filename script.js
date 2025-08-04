// ===== Configuration =====
const CONFIG = {
  API_KEY: "615c382e8be3981681ca68d33421a9f1", // Replace with your OpenWeatherMap API key
  BASE_URL: "https://api.openweathermap.org/data/2.5",
  ICON_URL: "https://openweathermap.org/img/wn/",
  UNITS: "metric", // "metric" for Celsius, "imperial" for Fahrenheit
  DEFAULT_CITY: "Darbhanga",
  RECENT_SEARCHES_MAX: 5,
  AQI_COLORS: {
    1: "#00E400", // Good
    2: "#FFFF00", // Moderate
    3: "#FF7E00", // Unhealthy for sensitive
    4: "#FF0000", // Unhealthy
    5: "#8F3F97", // Very unhealthy
    6: "#7E0023"  // Hazardous
  }
};

// ===== DOM Elements =====
const elements = {
  searchInput: document.getElementById("city-input"),
  searchBtn: document.getElementById("search-btn"),
  currentLocationBtn: document.getElementById("current-location-btn"),
  recentSearchesList: document.getElementById("recent-searches"),
  weatherContent: document.getElementById("weather-content"),
  weatherLoading: document.getElementById("weather-loading"),
  forecastContainer: document.getElementById("forecast-container"),
  hourlyForecast: document.getElementById("hourly-forecast"),
  humidityValue: document.getElementById("humidity-value"),
  windValue: document.getElementById("wind-value"),
  pressureValue: document.getElementById("pressure-value"),
  visibilityValue: document.getElementById("visibility-value"),
  aqiValue: document.getElementById("aqi-value"),
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toast-message"),
  unitButtons: document.querySelectorAll(".unit-btn"),
  tabButtons: document.querySelectorAll(".tab-btn"),
  tabPanes: document.querySelectorAll(".tab-pane")
};

// ===== State Management =====
let state = {
  currentWeather: null,
  forecast: null,
  recentSearches: JSON.parse(localStorage.getItem("recentSearches")) || [],
  currentUnit: CONFIG.UNITS,
  activeTab: "hourly"
};

// ===== Initialize App =====
function init() {
  // Event listeners
  setupEventListeners();
  
  // Load recent searches
  renderRecentSearches();
  
  // Load default city weather
  fetchWeather(CONFIG.DEFAULT_CITY);
  
  // Set active tab
  setActiveTab(state.activeTab);
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Search button click
  elements.searchBtn.addEventListener("click", handleSearch);
  
  // Enter key in search input
  elements.searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });
  
  // Current location button
  elements.currentLocationBtn.addEventListener("click", getCurrentLocationWeather);
  
  // Unit toggle buttons
  elements.unitButtons.forEach(btn => {
    btn.addEventListener("click", () => handleUnitChange(btn.dataset.unit));
  });
  
  // Tab buttons
  elements.tabButtons.forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });
  
  // Toast close button
  document.querySelector(".toast-close").addEventListener("click", hideToast);
}

// ===== API Functions =====
async function fetchWeather(city) {
  try {
    showLoading();
    
    // Fetch current weather
    const currentWeatherResponse = await fetch(
      `${CONFIG.BASE_URL}/weather?q=${city}&appid=${CONFIG.API_KEY}&units=${state.currentUnit}`
    );
    const currentWeatherData = await currentWeatherResponse.json();
    
    if (currentWeatherData.cod !== 200) {
      throw new Error(currentWeatherData.message || "City not found");
    }
    
    // Fetch 5-day forecast
    const forecastResponse = await fetch(
      `${CONFIG.BASE_URL}/forecast?q=${city}&appid=${CONFIG.API_KEY}&units=${state.currentUnit}`
    );
    const forecastData = await forecastResponse.json();
    
    // Fetch air quality (if available)
    let airQualityData = null;
    try {
      const aqResponse = await fetch(
        `${CONFIG.BASE_URL}/air_pollution?lat=${currentWeatherData.coord.lat}&lon=${currentWeatherData.coord.lon}&appid=${CONFIG.API_KEY}`
      );
      airQualityData = await aqResponse.json();
    } catch (aqError) {
      console.warn("Air quality data not available:", aqError);
    }
    
    // Update state
    state.currentWeather = currentWeatherData;
    state.forecast = forecastData;
    
    // Update UI
    renderCurrentWeather(currentWeatherData);
    renderForecast(forecastData);
    if (airQualityData) renderAirQuality(airQualityData);
    
    // Add to recent searches
    addToRecentSearches(city);
    
    // Hide loading
    hideLoading();
    
  } catch (error) {
    console.error("Error fetching weather:", error);
    showToast(error.message || "Failed to fetch weather data");
    hideLoading();
  }
}

async function getCurrentLocationWeather() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not supported by your browser");
    return;
  }
  
  showLoading();
  
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    
    const { latitude, longitude } = position.coords;
    
    // Fetch weather by coordinates
    const response = await fetch(
      `${CONFIG.BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${CONFIG.API_KEY}&units=${state.currentUnit}`
    );
    const data = await response.json();
    
    if (data.cod !== 200) {
      throw new Error(data.message || "Location not found");
    }
    
    // Update search input
    elements.searchInput.value = data.name;
    
    // Fetch weather for the located city
    await fetchWeather(data.name);
    
  } catch (error) {
    console.error("Geolocation error:", error);
    showToast(error.message || "Unable to get your location");
    hideLoading();
  }
}

// ===== Render Functions =====
function renderCurrentWeather(data) {
  const weatherClass = getWeatherClass(data.weather[0].main);
  const date = new Date(data.dt * 1000);
  
  // Update weather card class
  document.querySelector(".current-weather").className = `weather-card current-weather ${weatherClass}`;
  
  // Populate weather content
  elements.weatherContent.innerHTML = `
    <div class="weather-location">
      ${data.name}, ${data.sys.country}
    </div>
    <div class="weather-date">
      ${date.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
    <div class="weather-icon">
      <img src="${CONFIG.ICON_URL}${data.weather[0].icon}@2x.png" alt="${data.weather[0].description}">
    </div>
    <div class="weather-temp">
      ${Math.round(data.main.temp)}
    </div>
    <div class="weather-desc">
      ${data.weather[0].description}
    </div>
  `;
  
  // Update weather details
  elements.humidityValue.textContent = `${data.main.humidity}%`;
  elements.windValue.textContent = `${data.wind.speed} km/h`;
  elements.pressureValue.textContent = `${data.main.pressure} hPa`;
  elements.visibilityValue.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
}

function renderForecast(data) {
  elements.forecastContainer.innerHTML = "";
  
  // Group forecast by day
  const dailyForecast = {};
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000).toLocaleDateString();
    if (!dailyForecast[date]) {
      dailyForecast[date] = item;
    }
  });
  
  // Display 5-day forecast
  Object.values(dailyForecast).slice(0, 5).forEach(day => {
    const date = new Date(day.dt * 1000);
    const dayElement = document.createElement("div");
    dayElement.className = "forecast-day";
    dayElement.innerHTML = `
      <div class="forecast-date">
        ${date.toLocaleDateString("en-US", { weekday: "short" })}
      </div>
      <div class="forecast-icon">
        <img src="${CONFIG.ICON_URL}${day.weather[0].icon}.png" alt="${day.weather[0].description}">
      </div>
      <div class="forecast-temp">
        <span class="forecast-temp-max">${Math.round(day.main.temp_max)}°</span>
        <span class="forecast-temp-min">${Math.round(day.main.temp_min)}°</span>
      </div>
    `;
    elements.forecastContainer.appendChild(dayElement);
  });
  
  // Render hourly forecast for today
  renderHourlyForecast(data);
}

function renderHourlyForecast(data) {
  elements.hourlyForecast.innerHTML = "";
  
  // Get current hour
  const now = new Date();
  const currentHour = now.getHours();
  
  // Display next 24 hours
  data.list.slice(0, 8).forEach(hour => { // Show next 24 hours (3-hour intervals)
    const time = new Date(hour.dt * 1000);
    const hourElement = document.createElement("div");
    hourElement.className = "hourly-item";
    hourElement.innerHTML = `
      <div class="hourly-time">
        ${time.getHours()}:00
      </div>
      <div class="hourly-icon">
        <img src="${CONFIG.ICON_URL}${hour.weather[0].icon}.png" alt="${hour.weather[0].description}">
      </div>
      <div class="hourly-temp">
        ${Math.round(hour.main.temp)}°
      </div>
    `;
    elements.hourlyForecast.appendChild(hourElement);
  });
}

function renderAirQuality(data) {
  const aqi = data.list[0].main.aqi;
  elements.aqiValue.textContent = aqi;
  elements.aqiValue.style.color = CONFIG.AQI_COLORS[aqi] || "#000";
}

function renderRecentSearches() {
  elements.recentSearchesList.innerHTML = "";
  
  state.recentSearches.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.addEventListener("click", () => {
      elements.searchInput.value = city;
      fetchWeather(city);
    });
    elements.recentSearchesList.appendChild(li);
  });
}

// ===== Helper Functions =====
function getWeatherClass(weatherCondition) {
  const condition = weatherCondition.toLowerCase();
  if (condition.includes("rain")) return "weather-rainy";
  if (condition.includes("cloud")) return "weather-cloudy";
  if (condition.includes("clear")) return "weather-sunny";
  if (condition.includes("snow")) return "weather-snow";
  if (condition.includes("thunder") || condition.includes("storm")) return "weather-storm";
  return "weather-sunny"; // Default
}

function addToRecentSearches(city) {
  // Avoid duplicates
  state.recentSearches = state.recentSearches.filter(item => item.toLowerCase() !== city.toLowerCase());
  
  // Add to beginning
  state.recentSearches.unshift(city);
  
  // Limit to max items
  if (state.recentSearches.length > CONFIG.RECENT_SEARCHES_MAX) {
    state.recentSearches.pop();
  }
  
  // Save to localStorage
  localStorage.setItem("recentSearches", JSON.stringify(state.recentSearches));
  
  // Update UI
  renderRecentSearches();
}

function showLoading() {
  elements.weatherLoading.style.display = "flex";
  elements.weatherContent.style.display = "none";
}

function hideLoading() {
  elements.weatherLoading.style.display = "none";
  elements.weatherContent.style.display = "block";
}

function showToast(message) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.add("show");
  
  // Auto-hide after 5 seconds
  setTimeout(hideToast, 5000);
}

function hideToast() {
  elements.toast.classList.remove("show");
}

function setActiveTab(tabId) {
  // Update active tab button
  elements.tabButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  
  // Show active tab pane
  elements.tabPanes.forEach(pane => {
    pane.classList.toggle("active", pane.id === `${tabId}-tab`);
  });
  
  state.activeTab = tabId;
}

// ===== Event Handlers =====
function handleSearch() {
  const city = elements.searchInput.value.trim();
  if (city) {
    fetchWeather(city);
  } else {
    showToast("Please enter a city name");
  }
}

function handleUnitChange(unit) {
  if (unit === state.currentUnit) return;
  
  state.currentUnit = unit;
  
  // Update active button
  elements.unitButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.unit === unit);
  });
  
  // Refresh weather data with new units
  if (state.currentWeather) {
    fetchWeather(state.currentWeather.name);
  }
}

// ===== Initialize the App =====
document.addEventListener("DOMContentLoaded", init);