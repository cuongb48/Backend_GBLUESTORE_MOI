const LienHe = require("../../model/LienHe");
const ThueDo = require("../../model/ThueDo");


module.exports = {

    getOneThueDo: async (req, res) => {
        try {
            const thueDo = await ThueDo.findOne({});
            res.status(200).json({data: thueDo});
        } catch (error) {
            res.json({ message: error });
        }
    },

    getOneLienHe: async (req, res) => {
        try {
            const thueDo = await LienHe.findOne({});
            res.status(200).json({data: thueDo});
        } catch (error) {
            res.json({ message: error });
        }
    },

    updateThueDo: async (req, res) => {
        try {
            const { _id, text } = req.body;
            const updateThueDo = await ThueDo.updateOne({ _id: _id }, { text: text });
            if (updateThueDo) {
                res.status(200).json({ message: "Update ThueDo thành công", data: updateThueDo });
            } else {
                res.status(404).json({ message: "Update ThueDo thất bại" });
            }
        } catch (error) {
            res.json({ message: error });
        }
    },
    updateLienHe: async (req, res) => {
        try {
            const { _id, text } = req.body;
            const updateLienHe = await LienHe.updateOne({ _id: _id }, { text: text });
            if (updateLienHe) {
                res.status(200).json({ message: "Update LienHe thành công", data: updateLienHe });
            } else {
                res.status(404).json({ message: "Update LienHe thất bại" });
            }
        } catch (error) {
            res.json({ message: error });
        }
    },

    createThueDo: async (req, res) => {
        try {
            const { text } = req.body;
            const newThueDo = new ThueDo({ text });
            await newThueDo.save();
            res.status(200).json({ message: "Thêm ThueDo thành công", data: newThueDo });
        } catch (error) {
            res.json({ message: error });
        }
    },

    createLienHe: async (req, res) => {
        try {
            const { text } = req.body;
            const newLienHe = new LienHe({ text });
            await newLienHe.save();
            res.status(200).json({ message: "Thêm LienHe thành công", data: newLienHe });
        } catch (error) {
            res.json({ message: error });
        }
    },
}