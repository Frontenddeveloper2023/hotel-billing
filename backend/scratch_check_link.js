import dotenv from "dotenv";
dotenv.config();
import { fetchCashfreePaymentLink } from "./util/cashfree.js";

async function check() {
  try {
    const link = await fetchCashfreePaymentLink("REN_495e4c_1792672682151_e9a4a3");
    console.log("LINK:", JSON.stringify(link, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}
check();
