import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.send("Hello World");
});

router.post("/:streamName", (req, res) => {
    const { streamName } = req.params;
    res.send(`Hello ${streamName}`);
});

export default router;
