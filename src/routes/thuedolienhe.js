const express = require("express");
const { getOneThueDo, updateThueDo, createThueDo, getOneLienHe, createLienHe, updateLienHe } = require("../controllers/ThueDo_LienHe/text.controller");


const router = express.Router();

router.get("/get-thuedo", getOneThueDo );
router.post("/create-thuedo", createThueDo );
router.put("/update-thuedo", updateThueDo );

router.get("/get-lienhe", getOneLienHe );
router.post("/create-lienhe", createLienHe );
router.put("/update-lienhe", updateLienHe );


module.exports = router;