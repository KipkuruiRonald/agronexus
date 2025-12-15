// Serverless Authentication Service
// This service works entirely client-side without requiring a backend

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
  private usersKey = "agronexus_users"; // Store registered users locally

  /**
   * Generate a simple token (for demo purposes)
   */
  private generateToken(): string {
    return btoa(Date.now().toString() + Math.random().toString());
  }

  /**
   * Generate a simple user ID
   */
  private generateUserId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get all registered users from localStorage
   */
  private getStoredUsers(): Record<string, User> {
    const users = localStorage.getItem(this.usersKey);
    return users ? JSON.parse(users) : {};
  }

  /**
   * Store users in localStorage
   */
  private storeUsers(users: Record<string, User>): void {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  /**
   * Hash password (simple demo hashing)
   */
  private hashPassword(password: string): string {
    // Simple demo hashing - in production use proper crypto
    return btoa(password + 'agronexus_salt_2024');
  }

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
      // Check if user already exists
      const users = this.getStoredUsers();
      const existingUser = Object.values(users).find(user => 
        user.email === data.email || user.username === data.username
      );

      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      // Create new user
      const userId = this.generateUserId();
      const now = new Date().toISOString();
      
      const user: User = {
        id: userId,
        email: data.email,
        username: data.username,
        full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.username,
        first_name: data.first_name,
        last_name: data.last_name,
        user_type: data.user_type,
        farm_name: data.user_type === "farmer" ? data.farm_name : undefined,
        location: data.location,
        created_at: now,
        updated_at: now,
      };

      // Store user
      users[data.email] = user;
      this.storeUsers(users);

      // Store password separately (in production, this would be server-side)
      const passwords = JSON.parse(localStorage.getItem('agronexus_passwords') || '{}');
      passwords[data.email] = this.hashPassword(data.password);
      localStorage.setItem('agronexus_passwords', JSON.stringify(passwords));

      // Generate token and store session
      const token = this.generateToken();
      this.setUser(user);
      this.setToken(token);

      console.log('✅ User registered successfully:', user.email);

      return { user, token };
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
      // Get stored users and passwords
      const users = this.getStoredUsers();
      const passwords = JSON.parse(localStorage.getItem('agronexus_passwords') || '{}');
      
      const user = users[email];
      if (!user) {
        throw new Error('User not found');
      }

      const storedPassword = passwords[email];
      if (!storedPassword || storedPassword !== this.hashPassword(password)) {
        throw new Error('Invalid password');
      }

      // Generate new token and store session
      const token = this.generateToken();
      this.setUser(user);
      this.setToken(token);

      console.log('✅ User logged in successfully:', user.email);

      return { user, token };
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
      const user = this.getUser();
      if (!user) {
        throw new Error('No user logged in');
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
      this.clearAuth();
      console.log('✅ User logged out successfully');
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
    return !!this.getToken() && !!this.getUser();
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

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const currentUser = this.getUser();
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const updatedUser = { ...currentUser, ...updates, updated_at: new Date().toISOString() };
      
      // Update in stored users
      const users = this.getStoredUsers();
      users[currentUser.email] = updatedUser;
      this.storeUsers(users);
      
      // Update current session
      this.setUser(updatedUser);
      
      console.log('✅ Profile updated successfully');
      return updatedUser;
    } catch (error) {
      console.error("Profile update error:", error);
      throw error;
    }
  }

  /**
   * Demo function to seed some test users
   */
  async seedTestUsers(): Promise<void> {
    const users = this.getStoredUsers();
    
    // Only seed if no users exist
    if (Object.keys(users).length === 0) {
      const testUsers = [
        {
          email: 'farmer@agronexus.com',
          password: 'password123',
          data: {
            username: 'john_farmer',
            email: 'farmer@agronexus.com',
            password: 'password123',
            user_type: 'farmer' as const,
            first_name: 'John',
            last_name: 'Farmer',
            farm_name: 'Green Valley Farm',
            location: 'Nairobi, Kenya'
          }
        },
        {
          email: 'buyer@agronexus.com',
          password: 'password123',
          data: {
            username: 'jane_buyer',
            email: 'buyer@agronexus.com',
            password: 'password123',
            user_type: 'buyer' as const,
            first_name: 'Jane',
            last_name: 'Buyer',
            location: 'Mombasa, Kenya'
          }
        }
      ];

      for (const testUser of testUsers) {
        await this.register(testUser.data);
      }
      
      // Clear the current session after seeding
      this.clearAuth();
      
      console.log('✅ Test users seeded successfully');
    }
  }
}

export default new AuthService();
