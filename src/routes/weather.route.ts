import { Router, type Request, type Response } from "express";
import { getWeatherForecast } from "../services/weather.service";

const router = Router();

router.get('/', async (req: Request, res: Response) => {
    const weatherForecast = await getWeatherForecast();
    res.json(weatherForecast);
});

export default router;