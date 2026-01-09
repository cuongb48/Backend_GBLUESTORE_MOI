const express = require("express");
import { taoNoiDungAI } from "../controllers/ChatGPT/geminiAIController";

const router = express.Router();

router.post("/generate", taoNoiDungAI);

module.exports = router;
