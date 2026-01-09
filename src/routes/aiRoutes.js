const express = require("express");
const {  taoNoiDungAI } = require("../controllers/ChatGPT/geminiAIController");

const router = express.Router();

router.post("/generate", taoNoiDungAI);

module.exports = router;
