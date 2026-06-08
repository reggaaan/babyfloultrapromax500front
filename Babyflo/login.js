async function submitLogin(email, password) {
  const res = await fetch('http://localhost:5190/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  localStorage.setItem('authToken', data.token);          // <--- store JWT
  localStorage.setItem('customerName', data.name);
  localStorage.setItem('customerEmail', data.email);
  // redirect to admin if role or email indicates admin
  if (data.role === 'Admin' || data.email === 'admin@babyflo.com') window.location.href = 'admin.html';
}