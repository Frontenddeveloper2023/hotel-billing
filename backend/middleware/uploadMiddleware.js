import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ----------------------------------
// PATH SETUP FOR ES MODULES
// ----------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to normalize extensions to standard jpg/png
const getStandardExtension = (mimetype) => {
    if (mimetype === "image/png") return ".png";
    return ".jpg"; // Defaults jpeg, jpg, jfif to .jpg
};

// ----------------------------------
// 1. COMPANY LOGO UPLOAD CONFIG
// ----------------------------------
const logoUploadDir = path.join(__dirname, "../uploads", "settings");
if (!fs.existsSync(logoUploadDir)) {
    fs.mkdirSync(logoUploadDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, logoUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = getStandardExtension(file.mimetype);
        cb(null, "company-logo-" + uniqueSuffix + ext);
    },
});

const uploadLogoInstance = multer({
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        // Restricted strictly to standard jpg, jpeg, png (removed jfif if you want to avoid it)
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error("Only standard image files (jpg, jpeg, png) are allowed!"));
    },
});

export const uploadLogo = uploadLogoInstance.single("companyLogo");


// ----------------------------------
// 2. FOOD IMAGE UPLOAD CONFIG
// ----------------------------------
const foodUploadDir = path.join(__dirname, "../uploads", "foods");
if (!fs.existsSync(foodUploadDir)) {
    fs.mkdirSync(foodUploadDir, { recursive: true });
}

const foodStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, foodUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = getStandardExtension(file.mimetype);
        cb(null, "food-" + uniqueSuffix + ext);
    },
});

const uploadFoodInstance = multer({
    storage: foodStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed!"));
    },
});

export const uploadFoodImage = uploadFoodInstance.single("foodImage");