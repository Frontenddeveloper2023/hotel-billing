import fs from "fs";
const c = fs.readFileSync("cashfree_sdk_v3.js", "utf8");
const idx = c.indexOf("checkoutURL:r");
console.log("SANDBOX BLOCK:", c.substring(idx - 1600, idx - 800));
