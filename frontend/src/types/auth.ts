// Mirrors UserView and LoginRequest in backend/app/schemas.py

export interface UserView {
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}
