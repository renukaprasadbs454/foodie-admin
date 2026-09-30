const http = require('http');

async function run() {
    // 1. Get OTP
    const loginRes = await fetch("http://localhost:8082/api/v1/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "+919686753394" })
    });
    console.log("OTP Request HTTP", loginRes.status);

    // 2. Verify OTP
    const verifyRes = await fetch("http://localhost:8082/api/v1/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: "+919686753394", otp: "123456", userType: "RESTAURANT" })
    });
    console.log("Verify HTTP", verifyRes.status);

    const verifyData = await verifyRes.json();
    const token = verifyData.data.accessToken;
    console.log("Restaurant token obtained.");

    // 3. Get Me
    const meRes = await fetch("http://localhost:8082/api/v1/restaurants/me", {
        headers: { "Authorization": `Bearer ${token}` }
    });
    console.log("Me HTTP", meRes.status);
    const meData = await meRes.json();
    if (!meData.data || !meData.data.restaurantId) {
        console.error("No restaurant ID found!", meData);
        process.exit(1);
    }
    const restId = meData.data.restaurantId;
    console.log("Restaurant ID:", restId);

    // 4. Admin login
    const adminRes = await fetch("http://localhost:8082/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@foodie.local", password: "ChangeMe@123" })
    });
    console.log("Admin login HTTP", adminRes.status);
    const adminData = await adminRes.json();
    if (!adminData.data || !adminData.data.accessToken) {
        console.error("Admin login failed", adminData);
        process.exit(1);
    }
    const adminToken = adminData.data.accessToken;

    // 5. Approve
    const approveRes = await fetch(`http://localhost:8082/api/v1/restaurants/${restId}/approve`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminToken}` }
    });

    console.log("Approve HTTP", approveRes.status);
    console.log(await approveRes.text());
}

run().catch(console.error);
