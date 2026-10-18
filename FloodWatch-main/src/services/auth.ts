/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth service — DEMO MODE ONLY.
 *
 * This build does NOT perform real authentication. There is no backend
 * credential validation, no JWT, no /auth/login and no /auth/register.
 *
 * - Any email/username and any password are accepted.
 * - Registration is not required (and is not possible).
 * - The only thing persisted locally is the demo session / selected role,
 *   so a page refresh keeps the current role.
 * - The selected role determines which portal opens:
 *     Citizen -> CitizenHome, Admin -> AdminOverview.
 */

import {
  User, UserRole, LogoutResponse
} from '../types';

const SESSION_KEY = 'floodwatch_demo_session_v1';

/**
 * Normalize a raw role value. Only 'admin' and 'citizen' are valid
 * (matched case-insensitively). Anything else throws so callers can
 * surface a clear error instead of opening the wrong portal.
 */
export function toUserRole(role: unknown): UserRole {
  if (typeof role === 'string') {
    const normalized = role.trim().toLowerCase();
    if (normalized === 'admin') return 'admin';
    if (normalized === 'citizen') return 'citizen';
  }
  throw new Error('Unrecognized demo role. Please log in again.');
}

/**
 * Build a lightweight demo user for the selected role. No real account is
 * created — this only feeds the demo UI.
 */
function buildDemoUser(identifier: string, role: UserRole): User {
  const display = identifier && identifier.trim() ? identifier.trim() : (role === 'admin' ? 'Demo Administrator' : 'Demo Citizen');
  return {
    id: `demo-${role}-${Date.now()}`,
    name: display,
    email: display.includes('@') ? display : `${display.toLowerCase().replace(/\s+/g, '_')}@demo.floodwatch`,
    role,
    createdAt: new Date().toISOString(),
  };
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return parsed?.user || null;
  } catch {
    return null;
  }
}

function saveSession(user: User): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
  }
}

function clearSession(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY);
  }
}

export const authService = {
  /**
   * Demo login. Accepts an arbitrary identifier (username/email) and does
   * NOT validate any password. The selected role determines which portal
   * opens. The demo session is persisted locally.
   */
  async loginDemo(identifier: string, role: UserRole): Promise<User> {
    const user = buildDemoUser(identifier, role);
    saveSession(user);
    return user;
  },

  /**
   * Demo logout. Clears the local demo session only; nothing is revoked
   * server-side because there is no server-side session.
   */
  async logout(): Promise<LogoutResponse> {
    clearSession();
    return { success: true };
  },

  /**
   * Return the currently persisted demo session/user, if any.
   */
  async getCurrentUser(): Promise<User | null> {
    return getStoredUser();
  },
};
