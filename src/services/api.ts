
// Pure Serverless API Configuration
// This service is completely disabled - all operations use localStorage and Supabase

export const api = {
  // All HTTP methods are disabled in serverless mode
  get: () => Promise.reject(new Error('API calls disabled in serverless mode')),
  post: () => Promise.reject(new Error('API calls disabled in serverless mode')),
  put: () => Promise.reject(new Error('API calls disabled in serverless mode')),
  delete: () => Promise.reject(new Error('API calls disabled in serverless mode')),
  create: () => api,
  interceptors: {
    request: {
      use: () => ({})
    },
    response: {
      use: () => ({})
    }
  }
};

// Simple wrapper to return data or throw
export async function fetcher<T>(promise: Promise<any>): Promise<T> {
  throw new Error('fetcher disabled in serverless mode - use localStorage services instead');
}

// Mock API endpoints for compatibility (all return errors)
export const mockApi = {
  get: () => Promise.reject(new Error('API disabled in serverless mode')),
  post: () => Promise.reject(new Error('API disabled in serverless mode')),
  put: () => Promise.reject(new Error('API disabled in serverless mode')),
  delete: () => Promise.reject(new Error('API disabled in serverless mode'))
};

export default api;

