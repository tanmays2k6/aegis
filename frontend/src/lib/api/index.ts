import { SystemHealthResponse, UserProfile } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiClientError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiClientError';
  }
}

export const apiClient = {
  // Check live API and backend health
  getHealth: async (): Promise<SystemHealthResponse> => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new ApiClientError(`Health check failed with status ${res.status}`, res.status);
      }
      return await res.json();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) throw err;
      throw new ApiClientError(
        'Backend service unreachable. Please ensure the AEGIS API server is running.',
        503
      );
    }
  },

  // Get current authenticated user profile
  getProfile: async (token: string): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new ApiClientError(errorData.message || 'Failed to fetch profile', res.status);
    }

    const response = await res.json();
    return response.data;
  },

  // Update profile
  updateProfile: async (token: string, data: Partial<UserProfile>): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE_URL}/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new ApiClientError(errorData.message || 'Failed to update profile', res.status);
    }

    const response = await res.json();
    return response.data;
  },
};
