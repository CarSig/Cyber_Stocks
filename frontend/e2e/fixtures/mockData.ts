import type { User } from '@algo/shared';

export const mockUser: User = {
  id: 'test-user-id',
  username: 'testuser',
  role: 'user',
  email: 'test@example.com',
};

export const mockAdminUser: User = {
  id: 'test-admin-id',
  username: 'adminuser',
  role: 'admin',
  email: 'admin@example.com',
};

export const mockCompanies: Record<string, string> = {
  CRWD: 'CrowdStrike Holdings',
  PANW: 'Palo Alto Networks',
};

export const mockAuthResponse = {
  token: 'test-jwt-token',
  user: mockUser,
};

export const mockAdminAuthResponse = {
  token: 'test-admin-jwt-token',
  user: mockAdminUser,
};
