import type { AuthStatus, UserRole } from "@/types/enums";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyName: string;
  phone: string | null;
}

/** What the Next.js route returns to the browser: the refresh token never reaches JavaScript. */
export interface UserSession {
  accessToken: string;
  user: PublicUser;
}

export interface AuthState {
  status: AuthStatus;
  user: PublicUser | null;
}

export interface AuthContextValue extends AuthState {
  logout: () => Promise<void>;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload extends LoginPayload {
  name: string;
  role: UserRole;
  companyName: string;
  phone?: string;
}
