const API_BASE = "/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body } = options;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Gagal terhubung ke server.");
  }

  let data: { message?: string };
  try {
    data = await res.json();
  } catch {
    throw new Error("Server mengembalikan respons yang tidak valid.");
  }

  if (!res.ok)
    throw new Error(data.message || "Terjadi kesalahan pada server.");

  return data as T;
}

export const authApi = {
  register: (name: string, email: string, password: string) =>
    request<{ success: boolean; message: string; emailSent: boolean }>("/auth/register", {
      method: "POST",
      body: { name, email, password },
    }),

  resendVerification: (email: string) =>
    request<{ success: boolean; message: string }>("/auth/resend-verification", {
      method: "POST",
      body: { email },
    }),

  login: (email: string, password: string) =>
    request<{
      success: boolean;
      user: { id: string; name: string; email: string; role: string };
    }>("/auth/login", { method: "POST", body: { email, password } }),

  me: () =>
    request<{
      success: boolean;
      user: { id: string; name: string; email: string; role: string };
    }>("/auth/me"),

  logout: () =>
    request<{ success: boolean; message: string }>("/auth/logout", {
      method: "POST",
    }),

  deleteAccount: () =>
    request<{ success: boolean; message: string }>("/auth/delete-account", {
      method: "DELETE",
    }),
};

export const adminApi = {
  dashboard: () =>
    request<{
      success: boolean;
      totalUsers: number;
      totalAdmins: number;
      latestUsers: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string;
      }>;
    }>("/admin/dashboard"),

  users: () =>
    request<{
      success: boolean;
      users: Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string;
        updatedAt: string;
      }>;
    }>("/admin/users"),

  deleteUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/admin/users/${id}`, {
      method: "DELETE",
    }),

  products: () =>
    request<{
      success: boolean;
      products: Array<{
        id: string;
        game: string;
        category: string;
        label: string;
        diamonds: number | null;
        bonus: string | null;
        price: number;
        originalPrice: number | null;
        discount: number | null;
        popular: boolean;
        isActive: boolean;
        sortOrder: number;
        createdAt: string;
        updatedAt: string;
      }>;
    }>("/admin/products"),

  createProduct: (data: {
    game: string;
    category: string;
    label: string;
    diamonds?: number;
    bonus?: string;
    price: number;
    originalPrice?: number;
    discount?: number;
    popular?: boolean;
  }) =>
    request<{ success: boolean; product: unknown }>("/admin/products", {
      method: "POST",
      body: data,
    }),

  updateProduct: (id: string, data: Record<string, unknown>) =>
    request<{ success: boolean; product: unknown }>(`/admin/products/${id}`, {
      method: "PATCH",
      body: data,
    }),

  toggleProduct: (id: string) =>
    request<{ success: boolean; product: unknown; message: string }>(
      `/admin/products/${id}`,
      { method: "DELETE" },
    ),
};
