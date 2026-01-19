const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.user.role);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('assigned_ip', data.user.assigned_ip || '');
            
            // Redirect based on role
            if (data.user.role === 'admin') {
                window.location.href = '/admin-dashboard';
            } else if (data.user.role === 'senior') {
                window.location.href = '/dashboard';
            } else {
                window.location.href = '/my-status';
            }
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert('Login failed');
    }
};