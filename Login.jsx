// After successful login
localStorage.setItem('token', res.data.token);
if (res.data.isAdmin) {
  localStorage.setItem('admin', 'true');
}
if (res.data.displayName) {
  localStorage.setItem('displayName', res.data.displayName);
}
navigate('/dashboard');
