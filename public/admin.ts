// Admin Panel Alpine.js Component
declare global {
  interface Window {
    adminPanel: () => AdminPanelData;
  }
}

interface Credentials {
  username: string;
  password: string;
}

interface AdminPanelData {
  authenticated: boolean;
  username: string;
  credentials: Credentials;
  loginError: string;
  init: () => void;
  login: () => void;
  logout: () => void;
}

window.adminPanel = function (): AdminPanelData {
  return {
    // Authentication state
    authenticated: !!localStorage.getItem('adminToken'),
    username: localStorage.getItem('adminUsername') || '',
    credentials: {
      username: '',
      password: ''
    },
    loginError: '',

    // Initialize
    init() {
      console.log('Admin panel initialized');
      console.log('Authenticated:', this.authenticated);
    },

    // Authentication
    login() {
      this.loginError = '';

      // TODO: Replace with actual API call when backend is ready
      // For now, accept any credentials for demo purposes
      if (this.credentials.username && this.credentials.password) {
        const token = 'demo-token-' + Date.now();
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUsername', this.credentials.username);
        this.authenticated = true;
        this.username = this.credentials.username;
        console.log('Login successful');
      } else {
        this.loginError = 'Please enter both username and password';
      }

      /*
      // Future API call implementation:
      const res = await fetch('/.netlify/functions/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.credentials)
      });

      if (res.ok) {
        const { token, username } = await res.json();
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUsername', username);
        this.authenticated = true;
        this.username = username;
      } else {
        const error = await res.json();
        this.loginError = error.error || 'Login failed';
      }
      */
    },

    logout() {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUsername');
      this.authenticated = false;
      this.username = '';
      this.credentials = { username: '', password: '' };
      console.log('Logged out');
    }
  };
};
