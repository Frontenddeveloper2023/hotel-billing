import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// =====================================================
// ES Module __dirname setup
// =====================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, "../logs");

// Ensure the logs directory exists
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Helper to get the current date string in YYYY-MM-DD format
 */
function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Helper to get the current date-time string
 */
function getLocalDateTimeString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Core log writer function
 */
function writeLog(level, message) {
    const timestamp = getLocalDateTimeString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;

    // Print to console
    if (level === "ERROR") {
        console.error(formattedMessage);
    } else {
        console.log(formattedMessage);
    }

    // Append to daily log file
    const logFileName = `${getLocalDateString()}.log`;
    const logFilePath = path.join(logsDir, logFileName);

    try {
        fs.appendFileSync(logFilePath, formattedMessage + "\n", "utf8");
    } catch (error) {
        console.error(`[Logger Error] Failed to write to log file: ${error.message}`);
    }
}

/**
 * Main log function that can be called directly: log("message")
 * Enhanced with .info() and .error() methods to match controller expectations.
 */
function log(message) {
    writeLog("INFO", message);
}

log.info = function (message) {
    writeLog("INFO", message);
};

log.error = function (message) {
    writeLog("ERROR", message);
};

log.warn = function (message) {
    writeLog("WARN", message);
};


/**
 * Cleans up old daily log files.
 */
function cleanupOldLogs() {
    try {
        const expiryDays = parseInt(process.env.LOG_EXPIRY_DAYS, 10);

        // Safeguard invalid configuration
        if (isNaN(expiryDays) || expiryDays < 0) {
            log.info(`[Logger] LOG_EXPIRY_DAYS is not configured or invalid (value: ${process.env.LOG_EXPIRY_DAYS}). Retaining all logs.`);
            return;
        }

        log.info(`[Logger] Running log cleanup check. Retention limit: ${expiryDays} days.`);

        const files = fs.readdirSync(logsDir);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let deletedCount = 0;

        for (const file of files) {
            if (path.extname(file) === ".log") {
                const nameWithoutExt = path.basename(file, ".log");
                const fileDate = new Date(nameWithoutExt);

                if (!isNaN(fileDate.getTime())) {
                    fileDate.setHours(0, 0, 0, 0);
                    const diffMs = today.getTime() - fileDate.getTime();
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    if (diffDays > expiryDays) {
                        const filePath = path.join(logsDir, file);
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        log.info(`[Logger] Deleted expired log file: ${file} (Age: ${diffDays} days)`);
                    }
                }
            }
        }

        if (deletedCount > 0) {
            log.info(`[Logger] Cleanup completed. Deleted ${deletedCount} expired log file(s).`);
        } else {
            log.info(`[Logger] Cleanup completed. No expired log files found.`);
        }
    } catch (error) {
        console.error(`[Logger Error] Error running log cleanup:`, error);
    }
}


/**
 * Initializes and schedules log cleanup task.
 */
function startLogCleanupScheduler() {
    cleanupOldLogs();

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    setInterval(cleanupOldLogs, TWENTY_FOUR_HOURS);

    log.info(`[Logger] Automated log cleanup scheduler started (runs every 24 hours).`);
}


// =====================================================
// ES Module Exports
// =====================================================

export {
    log,
    cleanupOldLogs,
    startLogCleanupScheduler,
};