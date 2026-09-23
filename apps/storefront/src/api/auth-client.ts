import { storefront } from "shared";

export type AuthApiResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "error"; code?: string; message: string };

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function getJson(path: string): Promise<Response> {
  return fetch(path, {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  });
}

function parseErrorMessage(json: unknown, fallback: string): { code?: string; message: string } {
  if (typeof json === "object" && json !== null) {
    const record = json as Record<string, unknown>;
    if (record.error && typeof record.error === "object") {
      const errRecord = record.error as Record<string, unknown>;
      return {
        code: typeof errRecord.code === "string" ? errRecord.code : undefined,
        message: typeof errRecord.message === "string" ? errRecord.message : fallback,
      };
    }
    return {
      code: typeof record.code === "string" ? record.code : undefined,
      message: typeof record.message === "string" ? record.message : fallback,
    };
  }
  return { message: fallback };
}

export async function register(
  data: storefront.RegisterRequest,
): Promise<AuthApiResult<storefront.AuthResponse>> {
  let response: Response;
  try {
    response = await postJson("/api/auth/register", data);
  } catch {
    return { kind: "error", message: "Không thể kết nối tới máy chủ." };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { kind: "error", message: `Máy chủ trả lỗi (HTTP ${response.status}).` };
  }

  if (!response.ok) {
    const err = parseErrorMessage(json, `Máy chủ trả lỗi (HTTP ${response.status}).`);
    return { kind: "error", ...err };
  }

  const parsed = storefront.AuthResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { kind: "error", message: "Dữ liệu trả về không đúng định dạng." };
  }

  return { kind: "ok", data: parsed.data };
}

export async function login(
  data: storefront.LoginRequest,
): Promise<AuthApiResult<storefront.AuthResponse>> {
  let response: Response;
  try {
    response = await postJson("/api/auth/login", data);
  } catch {
    return { kind: "error", message: "Không thể kết nối tới máy chủ." };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { kind: "error", message: `Máy chủ trả lỗi (HTTP ${response.status}).` };
  }

  if (!response.ok) {
    const err = parseErrorMessage(json, "Email hoặc mật khẩu không chính xác.");
    return { kind: "error", ...err };
  }

  const parsed = storefront.AuthResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { kind: "error", message: "Dữ liệu trả về không đúng định dạng." };
  }

  return { kind: "ok", data: parsed.data };
}

export async function logout(): Promise<AuthApiResult<{ success: boolean }>> {
  let response: Response;
  try {
    response = await postJson("/api/auth/logout", {});
  } catch {
    return { kind: "error", message: "Không thể kết nối tới máy chủ." };
  }

  if (!response.ok) {
    return { kind: "error", message: "Đăng xuất không thành công." };
  }

  return { kind: "ok", data: { success: true } };
}

export async function getCurrentUser(): Promise<AuthApiResult<storefront.CurrentUserResponse>> {
  let response: Response;
  try {
    response = await getJson("/api/auth/me");
  } catch {
    return { kind: "error", message: "Không thể kết nối tới máy chủ." };
  }

  if (!response.ok) {
    return { kind: "error", message: `Máy chủ trả lỗi (HTTP ${response.status}).` };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { kind: "error", message: "Dữ liệu người dùng không đúng định dạng." };
  }

  const parsed = storefront.CurrentUserResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { kind: "error", message: "Dữ liệu người dùng không đúng định dạng." };
  }

  return { kind: "ok", data: parsed.data };
}
