import { Router, type RequestWithUser, type Response } from "express";
import { getWeatherForecast } from "../services/weather.service";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.get('/', authenticate, async (req: RequestWithUser, res: Response) => {
    const weatherForecast = await getWeatherForecast();
    res.json(weatherForecast);
});

export default router;