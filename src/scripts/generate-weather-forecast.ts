import axios from "axios";
import fs from "fs";
import path from "path";

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_URL = `https://api.weatherapi.com/v1/forecast.json`;
const filePath = path.join(__dirname, '..', '..', 'media', 'weather', 'weather-forecast.json');

async function generateWeatherForecast() {
    if(fs.existsSync(filePath)) {
        console.log('Weather forecast file already exists');
        return;
    }
    const response = await axios.get(`${WEATHER_API_URL}?key=${WEATHER_API_KEY}&q=93437&days=1&aqi=yes`);
    fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));
}

generateWeatherForecast();