export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

export const authStore = {
  getToken: () => localStorage.getItem("token"),

  getUser: (): AuthUser | null => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  save: (token: string, user: AuthUser) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },

  clear: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  isLoggedIn: () => !!localStorage.getItem("token"),
};
