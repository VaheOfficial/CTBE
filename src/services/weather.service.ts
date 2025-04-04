import fs from "fs";
import path from "path";
import { logger } from "../utils/logger";
import { CacheController } from "../controllers/cache.controller";
import User from "../models/user.model";
import type { RequestWithUser } from "express";
import type { ObjectId } from "mongoose";

const cacheKey = 'weather-forecast';

export async function getWeatherForecast() {

    const cachedForecast = await CacheController.getCache(cacheKey);
    if(cachedForecast) {
        return JSON.parse(cachedForecast);
    }

    const filePath = path.join(__dirname, '..', '..', 'media', 'weather', 'weather-forecast.json');
    if(!fs.existsSync(filePath)) {
        return { message: 'Weather forecast file not found' };
    }
    const currentTime = new Date();
    const forecastData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Get current hour and minutes
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    
    // Format for logging
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Find the hourly forecasts before and after current time
    const hourlyForecasts = forecastData.forecast.forecastday[0].hour;
    
    // Get current hour forecast and next hour forecast
    const currentHourForecast = hourlyForecasts.find((hour: any) => {
        const hourTime = hour.time.split(' ')[1];
        const hourValue = parseInt(hourTime.split(':')[0]);
        return hourValue === hours;
    });
    
    const nextHourForecast = hourlyForecasts.find((hour: any) => {
        const hourTime = hour.time.split(' ')[1];
        const hourValue = parseInt(hourTime.split(':')[0]);
        return hourValue === (hours + 1) % 24;
    });
    
    // If we can't find both forecasts, return the one we have
    if (!currentHourForecast && !nextHourForecast) {
        logger.info('No forecast data found for interpolation');
        return { message: 'No forecast data available' };
    } else if (!currentHourForecast) {
        logger.info('Using next hour forecast only');
        return nextHourForecast;
    } else if (!nextHourForecast) {
        logger.info('Using current hour forecast only');
        return currentHourForecast;
    }
    
    // Calculate weight for interpolation (0 to 1) based on minutes
    const weight = minutes / 60;
    
    // Interpolate between the two forecasts
    const interpolatedForecast = interpolateForecasts(currentHourForecast, nextHourForecast, weight);

    const formattedInterpolatedForecast = formatWeatherForecast(interpolatedForecast);
    
    // Add random deviations to make the forecast more realistic
    const realisticForecast = addRealisticDeviation(formattedInterpolatedForecast);

    // Calculate the end of the next minute for cache expiration
    const now = new Date();
    const endHour = now.getHours();
    const endMinute = now.getMinutes() + 1; // Next minute
    
    CacheController.setCacheWithTimeRange(cacheKey, JSON.stringify(realisticForecast), endHour, endMinute);
    return realisticForecast;
}

/**
 * Interpolates between two weather forecasts based on a weight
 * @param forecast1 The first forecast (lower bound)
 * @param forecast2 The second forecast (upper bound)
 * @param weight The weight to apply (0-1), where 0 is forecast1 and 1 is forecast2
 */
function interpolateForecasts(forecast1: any, forecast2: any, weight: number) {
    const result = { ...forecast1 };
    
    // Properties to interpolate
    const numericProps = [
        'temp_c', 'temp_f', 'wind_mph', 'wind_kph', 'wind_degree',
        'pressure_mb', 'pressure_in', 'precip_mm', 'precip_in',
        'humidity', 'cloud', 'feelslike_c', 'feelslike_f',
        'windchill_c', 'windchill_f', 'heatindex_c', 'heatindex_f',
        'dewpoint_c', 'dewpoint_f', 'will_it_rain', 'will_it_snow',
        'chance_of_rain', 'chance_of_snow', 'vis_km', 'vis_miles',
        'gust_mph', 'gust_kph', 'uv'
    ];
    
    // Interpolate numeric properties
    for (const prop of numericProps) {
        if (forecast1[prop] !== undefined && forecast2[prop] !== undefined) {
            result[prop] = forecast1[prop] + (forecast2[prop] - forecast1[prop]) * weight;
        }
    }
    
    // Set the time to the current time
    const currentDate = new Date();
    const datePart = forecast1.time.split(' ')[0];
    const hours = currentDate.getHours().toString().padStart(2, '0');
    const minutes = currentDate.getMinutes().toString().padStart(2, '0');
    result.time = `${datePart} ${hours}:${minutes}`;
    
    // For condition, just use the closest one
    if (weight > 0.5) {
        result.condition = forecast2.condition;
    }
    
    return result;
}

function formatWeatherForecast(forecast: any) {
    const formattedData: weatherForecast = {
        temperatureC: forecast.temp_c.toFixed(1),
        temperatureF: forecast.temp_f.toFixed(1),
        humidity: forecast.humidity,
        windSpeed: forecast.wind_mph.toFixed(1),
        windDirection: forecast.wind_dir,
        pressure: forecast.pressure_mb,
        condition: forecast.condition.text,
        updatedAt: forecast.time,
        altitude: forecast.altitude,
        windChill: forecast.windchill_c.toFixed(1)
    }
    return formattedData;
}

/**
 * Adds slight random deviations to weather forecast values to make them more realistic
 * @param forecast The formatted weather forecast
 * @returns The forecast with realistic deviations applied
 */
function addRealisticDeviation(forecast: weatherForecast): weatherForecast {
    const result = { ...forecast };
    
    // Apply small random deviations to numerical properties
    // Temperature: ±0.3°C
    result.temperatureC = applyDeviation(parseFloat(forecast.temperatureC.toString()), 0.3);
    result.temperatureF = applyDeviation(parseFloat(forecast.temperatureF.toString()), 0.3);
    
    // Humidity: ±2%
    result.humidity = applyDeviation(forecast.humidity, 2, true);
    
    // Wind Speed: ±0.5 mph
    result.windSpeed = applyDeviation(parseFloat(forecast.windSpeed.toString()), 0.5);
    
    // Pressure: ±0.5 mb
    result.pressure = applyDeviation(forecast.pressure, 0.5);
    
    // Wind Chill: ±0.2°C
    result.windChill = applyDeviation(parseFloat(forecast.windChill.toString()), 0.2);
    
    return result;
}

/**
 * Applies a random deviation to a numeric value
 * @param value The original value
 * @param maxDeviation The maximum amount of deviation to apply (±)
 * @param isInteger Whether the result should be an integer
 * @returns The value with deviation applied
 */
function applyDeviation(value: number, maxDeviation: number, isInteger: boolean = false): number {
    // Generate a random deviation between -maxDeviation and +maxDeviation
    const deviation = (Math.random() * 2 - 1) * maxDeviation;
    
    // Apply the deviation
    let result = value + deviation;
    
    // Round to integer if needed
    if (isInteger) {
        result = Math.round(result);
        
        // Ensure values stay within logical bounds (e.g., humidity 0-100%)
        if (result < 0) result = 0;
        if (result > 100) result = 100;
    } else {
        // Round to 1 decimal place for floating point values
        result = Math.round(result * 10) / 10;
    }
    
    return result;
}

interface weatherForecast { 
    temperatureC: number;
    temperatureF: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    pressure: number;
    condition: string;
    updatedAt: string;
    altitude: number;
    windChill: number;
}

export async function updateTemperaturePreference(req: RequestWithUser) {
    const user = await User.findById(req.user.userId);
    if (!user) {
        return { message: 'User not found' };
    }
    user.temperaturePreference = req.body.preference;
    const formattedUser: ReturnUser = {
        name: user.name,
        email: user.email,
        role: user.role,
        clearanceLevel: user.clearanceLevel,
        temperaturePreference: user.temperaturePreference,
        accountStatus: user.accountStatus,
        lastActive: user.lastActive,
        lastLogin: user.lastLogin,
        logEntries: user.logEntries ? user.logEntries : [],
        activeSessions: user.activeSessions || [], // Include full active sessions, not just IDs
        lastPasswordChange: user.lastPasswordChange,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        _id: user._id.toString(),
      }

    await user.save();
    return formattedUser;
}

interface ReturnUser {
    name: string;
    email: string;
    role: string;
    clearanceLevel: string;
    temperaturePreference: string;
    accountStatus: string;
    lastActive: Date;
    lastLogin: Date;
    logEntries: ObjectId[];
    activeSessions: ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    _id: string | ObjectId;
    lastPasswordChange: Date;
}
