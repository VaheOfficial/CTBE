import { Router, type RequestWithUser, type Response } from "express";
import { getWeatherForecast, updateTemperaturePreference } from "../services/weather.service";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get('/', authenticate, async (req: RequestWithUser, res: Response) => {
    const weatherForecast = await getWeatherForecast();
    res.json(weatherForecast);
});

router.post("/temperature-preference", authenticate, async (req: RequestWithUser, res: Response) => {
    const temperaturePreference = await updateTemperaturePreference(req);
    res.json(temperaturePreference);
});

export default router;