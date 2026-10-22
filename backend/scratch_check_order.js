import dotenv from "dotenv";
dotenv.config();
import { fetchCashfreeOrder, fetchCashfreeOrderPayments } from "./util/cashfree.js";

async function check() {
  try {
    const order = await fetchCashfreeOrder("UPG_495e4c_1792672767597");
    console.log("ORDER:", JSON.stringify(order, null, 2));
    const payments = await fetchCashfreeOrderPayments("UPG_495e4c_1792672767597");
    console.log("PAYMENTS:", JSON.stringify(payments, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}
check();
