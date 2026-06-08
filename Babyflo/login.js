// 1. Configuration: Easily swap between Local and Production
const API_BASE_URL = "https://babyflo-ultra-pro-max.onrender.com/api";

async function submitLogin(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ email, password })
        });

        // 2. Pro Error Handling: Check status codes specifically
        if (response.status === 401) {
            throw new Error("Invalid email or password.");
        } 
        
        if (!response.ok) {
            throw new Error("Unable to connect to server. Please try again later.");
        }

        const data = await response.json();

        // 3. Legit Data Storage: Ensure the backend actually sent these keys
        if (data.token) localStorage.setItem('authToken', data.token);
        if (data.name) localStorage.setItem('customerName', data.name);
        if (data.email) localStorage.setItem('customerEmail', data.email);
        if (data.role) localStorage.setItem('userRole', data.role);

        // 4. Graceful Redirect
        if (data.role === 'Admin' || email === 'admin@babyflo.com') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'index.html';
        }

    } catch (error) {
        console.error("Login Error:", error);
        alert(error.message); // Tell the user what happened!
    }
}
