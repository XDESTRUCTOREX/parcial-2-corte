/**
 * Cliente de Comunicación con la API REST de Inventario
 * UNIPUTUMAYO - Pruebas de Software
 */

class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

class InventoryApiClient {
  constructor() {
    this.defaultBaseUrl = window.location.origin.includes("http")
      ? window.location.origin
      : "http://localhost:3000";
    this.storageKey = "inventario_api_url";
  }

  getBaseUrl() {
    const saved = localStorage.getItem(this.storageKey);
    return (saved && saved.trim()) || this.defaultBaseUrl;
  }

  setBaseUrl(url) {
    if (!url) {
      localStorage.removeItem(this.storageKey);
    } else {
      localStorage.setItem(this.storageKey, url.trim().replace(/\/$/, ""));
    }
  }

  async _request(endpoint, options = {}) {
    const url = `${this.getBaseUrl()}${endpoint}`;
    const headers = {
      Accept: "application/json",
      ...(options.headers || {}),
    };

    if (options.body && typeof options.body === "object") {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, { ...options, headers });

      // 204 No Content no contiene cuerpo
      if (response.status === 204) {
        return null;
      }

      let payload = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        payload = await response.json();
      } else {
        const text = await response.text();
        if (text) payload = { message: text };
      }

      if (!response.ok) {
        const errorMsg =
          (payload && (payload.message || payload.error)) ||
          `Error en la petición: HTTP ${response.status}`;
        const errorsList = (payload && payload.errors) || [];
        throw new ApiError(response.status, errorMsg, errorsList);
      }

      return payload;
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      // Error de red, conexión rechazada o CORS
      throw new ApiError(
        0,
        `No fue posible comunicarse con la API en ${this.getBaseUrl()}. Verifique que el servidor esté activo. (${err.message})`,
        []
      );
    }
  }

  async checkHealth() {
    return await this._request("/health", { method: "GET" });
  }

  async getProducts(filters = {}) {
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, val);
      }
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    return await this._request(`/api/v1/products${query}`, { method: "GET" });
  }

  async getProductById(id) {
    return await this._request(`/api/v1/products/${encodeURIComponent(id)}`, {
      method: "GET",
    });
  }

  async createProduct(productData) {
    return await this._request("/api/v1/products", {
      method: "POST",
      body: productData,
    });
  }

  async updateProduct(id, productData) {
    return await this._request(`/api/v1/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: productData,
    });
  }

  async deleteProduct(id) {
    return await this._request(`/api/v1/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
}

// Instancia global
window.apiClient = new InventoryApiClient();

