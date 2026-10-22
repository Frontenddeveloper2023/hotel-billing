const sessionId = "session_j1_OsRGpJ2xfQ8zbZcy-VA93H_qWlzjObOhVp-mvFrb9Sdlvsg_Qx9RSOtngxm2kLI7hkPivLNgtzjxJ2JS1jlI-9LUogiBOw4URYlVno718yr3igEM5gfTOsVISOgpaymentpayment";

async function testSession() {
  const params = new URLSearchParams();
  params.append("payment_session_id", sessionId);
  params.append("x_request_id", "x_request_id_form_atom");
  params.append("form_id", "form_id_atom");

  const res = await fetch("https://sandbox.cashfree.com/pg/view/sessions/checkout", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    },
    body: params.toString()
  });

  console.log("STATUS:", res.status);
  console.log("REDIRECT URL:", res.url);
  const text = await res.text();
  console.log("BODY SNIPPET:", text.substring(0, 1000));
}

testSession();
