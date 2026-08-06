// Client-side API wrapper that replaces supabase.from() calls
// All data operations go through Vercel API routes which use the Neon pg adapter

type ApiResponse<T> = { data?: T; error?: { message: string; code?: string } };

const API_BASE = "/api";

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("clerk_session_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiClient {
  // Generic request helper
  private static async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.error || res.statusText);
    }
    return payload.data ?? payload;
  }

  // Profile operations (replaces supabase.from("profiles"))
  static from(table: string) {
    return {
      select: async (columns: string = "id"): Promise<ApiResponse<any>> => {
        const data = await ApiClient.request("GET", `/db/${table}?select=${encodeURIComponent(columns)}`);
        return { data };
      },
      selectOne: async (columns: string = "id"): Promise<ApiResponse<any | null>> => {
        const data = await ApiClient.request("GET", `/db/${table}?select=${encodeURIComponent(columns)}&single=true`);
        return { data: data[0] ?? null };
      },
      selectById: async (id: string): Promise<ApiResponse<any | null>> => {
        const data = await ApiClient.request("GET", `/db/${table}/${id}`);
        return { data: data ?? null };
      },
      insert: async (values: Record<string, unknown>): Promise<ApiResponse<any>> => {
        const data = await ApiClient.request("POST", `/db/${table}`, values);
        return { data };
      },
      update: async (values: Record<string, unknown>, match: Record<string, unknown> = {}): Promise<ApiResponse<any>> => {
        const data = await ApiClient.request("PATCH", `/db/${table}`, { values, match });
        return { data };
      },
      eq: (column: string, value: unknown) => ({
        select: async (columns: string = "id"): Promise<ApiResponse<any[]>> => {
          const data = await ApiClient.request("GET", `/db/${table}?filter=${encodeURIComponent(column)}&eq=${encodeURIComponent(String(value))}&select=${encodeURIComponent(columns)}`);
          return { data };
        },
        selectOne: async (columns: string = "id"): Promise<ApiResponse<any | null>> => {
          const data = await ApiClient.request("GET", `/db/${table}?filter=${encodeURIComponent(column)}&eq=${encodeURIComponent(String(value))}&select=${encodeURIComponent(columns)}&single=true`);
          return { data: data[0] ?? null };
        },
        update: async (values: Record<string, unknown>): Promise<ApiResponse<any>> => {
          const data = await ApiClient.request("PATCH", `/db/${table}`, { values, match: { [column]: value } });
          return { data };
        },
      }),
      // For chaining like .eq("id", userId).select("*")
      insertInto: (values: Record<string, unknown>) => ({
        select: async (columns: string = "id"): Promise<ApiResponse<any>> => {
          const data = await ApiClient.request("POST", `/db/${table}`, values);
          return { data };
        },
      }),
    };
  }

  // Stored procedures (replaces supabase.rpc())
  static async rpc(name: string, payload?: Record<string, unknown>): Promise<ApiResponse<any>> {
    const data = await ApiClient.request("POST", `/rpc/${name}`, payload);
    return { data };
  }
}

// Export for backwards compat with existing .from("...") patterns
export const api = ApiClient;
