const multer = require("multer");
const path = require("path");
const fs = require("fs");
const xlsx = require("xlsx");
const { log } = require("console");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Cấu hình Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cấu hình multer để lưu file tạm
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "../../public/uploads/")); // Lưu tạm file vào thư mục temp/
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

// Upload 1 file
const uploadFile1 = (req, res) => {
    upload.single("file")(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err });

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded. Vui lòng chọn file để upload.",
            });
        }

        try {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: "folderupload",
            });
            fs.unlinkSync(req.file.path);
            return res.status(200).json({
                data: {
                  url: result.secure_url,
                  public_id: result.public_id, // 👈 thêm public_id ở đây
                  type: "ImageChinh",
                },
            });
        } catch (error) {
            return res.status(500).json({ message: "Lỗi khi upload file." });
        }
    });
};

const deleteFile1 = async (req, res) => {
    const { public_id } = req.body;

    console.log("public_id:", public_id); // Kiểm tra giá trị public_id    

    if (!public_id) {
        return res.status(400).json({ message: "Thiếu public_id." });
    }

    try {
        const result = await cloudinary.uploader.destroy(public_id); // ← dùng nguyên public_id là "folderupload/..."

        if (result.result !== "ok") {
            return res.status(500).json({ message: "Xóa ảnh thất bại." });
        }

        return res.status(200).json({ message: "Xóa ảnh thành công." });
    } catch (error) {
        console.error("Lỗi xóa ảnh:", error);
        return res.status(500).json({ message: "Lỗi server khi xóa ảnh." });
    }
};


// Upload nhiều file (field: files - ảnh slider)
const uploadFiles1 = (req, res) => {
    upload.array("files", 12)(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err.message });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "No files uploaded. Vui lòng chọn file để upload.",
            });
        }

        try {
            const results = await Promise.all(
                req.files.map(async (file) => {
                    const uploaded = await cloudinary.uploader.upload(file.path, {
                        folder: "folderupload",
                    });
                    fs.unlinkSync(file.path);
                    return { 
                        url: uploaded.secure_url, 
                        public_id: uploaded.public_id, // 👈 thêm ở đây
                        type: "ImageSlider"
                    };
                })
            );

            return res.status(200).json({
                data: results, // results là mảng chứa nhiều { url, type }
            });
            
        } catch (error) {
            return res.status(500).json({ message: "Lỗi khi upload file." });
        }
    });
};

// ------------------------------------


// Upload nhiều file (field: file)
const uploadFileMutiple1 = (req, res) => {
    upload.array("file", 10)(req, res, async (err) => {
        if (err) return res.status(400).json({ message: err });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "No files uploaded. Vui lòng chọn file để upload.",
            });
        }

        try {
            const results = [];
            for (const file of req.files) {
                const uploaded = await cloudinary.uploader.upload(file.path, {
                    folder: "folderupload",
                });
                fs.unlinkSync(file.path);
                results.push({ url: uploaded.secure_url, type: "ImageChinh" });
            }

            return res.json({ files: results });
        } catch (error) {
            return res.status(500).json({ message: "Lỗi khi upload file." });
        }
    });
};



// === PHẦN XỬ LÝ EXCEL (GIỮ NGUYÊN) ===

const excelStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../../public/excel/");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const originalFileName = req.body.originalFileName || file.originalname;
        cb(null, originalFileName);
    },
});

const uploadExcel1 = multer({
    storage: excelStorage,
    fileFilter: (req, file, cb) => {
        const extname = path.extname(file.originalname).toLowerCase();
        if (extname !== ".xlsx" && extname !== ".xls") {
            return cb(new Error("Chỉ chấp nhận file Excel (.xlsx, .xls)"));
        }
        cb(null, true);
    },
}).single("file");





module.exports = {
    uploadFile1,
    uploadFiles1,
    uploadExcel1,
    deleteFile1,
    uploadFileMutiple1,
};
