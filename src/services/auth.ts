import { api } from "./api";


export interface User {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  user_type: "farmer" | "buyer";
  phone?: string;
  address?: string;
  location?: string;
  farm_name?: string;
  profile_image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  private tokenKey = "agronexus_token";
  private userKey = "agronexus_user";



  /**
   * Register new user
   */
  async register(data: {
    username: string;
    email: string;
    password: string;
    user_type: "farmer" | "buyer";
    first_name?: string;
    last_name?: string;
    farm_name?: string;
    location?: string;
  }): Promise<AuthResponse> {
    try {
      // Map frontend fields to backend schema - send exactly what backend expects
      const backendData = {
        username: data.username,
        email: data.email,
        password: data.password,
        user_type: data.user_type,
        first_name: data.first_name,
        last_name: data.last_name,
        farm_name: data.user_type === "farmer" ? data.farm_name : null,
        location: data.location,
        phone: null,
        address: data.location || null,
        profile_image_url: null
      };

      const response = await api.post("/auth/register", backendData);
      const { token, user } = response.data;
      
      // Ensure full_name exists (backend should provide it, but add fallback)
      if (!user.full_name && (user.first_name || user.last_name)) {
        user.full_name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      }
      if (!user.full_name) {
        user.full_name = user.username || user.email || 'User';
      }
      
      // Store user locally; token is also set as HttpOnly cookie by the server for security
      this.setUser(user);
      if (token) this.setToken(token);
      return response.data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { token, user } = response.data;
      
      // Ensure full_name exists (backend should provide it, but add fallback)
      if (!user.full_name && (user.first_name || user.last_name)) {
        user.full_name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      }
      if (!user.full_name) {
        user.full_name = user.username || user.email || 'User';
      }
      
      // Store user locally; server sets HttpOnly cookie for the token
      this.setUser(user);
      if (token) this.setToken(token);
      return response.data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  async getMe(): Promise<User> {
    try {
      const response = await api.get("/auth/me");
      const user = response.data.user;
      
      // Ensure full_name exists (backend should provide it, but add fallback)
      if (!user.full_name && (user.first_name || user.last_name)) {
        user.full_name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      }
      if (!user.full_name) {
        user.full_name = user.username || user.email || 'User';
      }
      
      return user;
    } catch (error) {
      console.error("Get user error:", error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
      this.clearAuth();
    } catch (error) {
      console.error("Logout error:", error);
      this.clearAuth();
    }
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Set token in localStorage
   */
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  /**
   * Get stored user
   */
  getUser(): User | null {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Set user in localStorage
   */
  setUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken() || !!this.getUser();
  }

  /**
   * Check if user is farmer
   */
  isFarmer(): boolean {
    return this.getUser()?.user_type === "farmer";
  }

  /**
   * Check if user is buyer
   */
  isBuyer(): boolean {
    return this.getUser()?.user_type === "buyer";
  }

  /**
   * Clear authentication data
   */
  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }
}

export default new AuthService();
