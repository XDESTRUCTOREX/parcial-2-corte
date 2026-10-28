/**
 * Lógica de Interfaz de Usuario y Gestión de Eventos
 * UNIPUTUMAYO - Inventario de Productos
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elementos del DOM
  const serverStatus = document.getElementById("server-status");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const btnCheckHealth = document.getElementById("btn-check-health");

  const apiBaseUrlInput = document.getElementById("api-base-url");
  const btnSaveApiUrl = document.getElementById("btn-save-api-url");

  const alertBanner = document.getElementById("alert-banner");
  const alertMessage = document.getElementById("alert-message");
  const btnDismissAlert = document.getElementById("btn-dismiss-alert");

  const productForm = document.getElementById("product-form");
  const formTitle = document.getElementById("form-title");
  const formBadge = document.getElementById("form-badge");
  const productIdInput = document.getElementById("product-id");
  const productNameInput = document.getElementById("product-name");
  const productCategorySelect = document.getElementById("product-category");
  const productPriceInput = document.getElementById("product-price");
  const productStockInput = document.getElementById("product-stock");
  const btnSubmitProduct = document.getElementById("btn-submit-product");
  const submitBtnText = document.getElementById("submit-btn-text");
  const submitSpinner = document.getElementById("submit-spinner");
  const btnCancelEdit = document.getElementById("btn-cancel-edit");

  const errorName = document.getElementById("error-name");
  const errorCategory = document.getElementById("error-category");
  const errorPrice = document.getElementById("error-price");
  const errorStock = document.getElementById("error-stock");

  const filterCategory = document.getElementById("filter-category");
  const btnRefreshCatalog = document.getElementById("btn-refresh-catalog");
  const productsCount = document.getElementById("products-count");
  const catalogLoading = document.getElementById("catalog-loading");
  const catalogEmpty = document.getElementById("catalog-empty");
  const tableContainer = document.getElementById("table-container");
  const productsTbody = document.getElementById("products-tbody");

  const detailModal = document.getElementById("detail-modal");
  const modalBody = document.getElementById("modal-body");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnModalDismiss = document.getElementById("btn-modal-dismiss");

  // Inicialización de URL
  apiBaseUrlInput.value = window.apiClient.getBaseUrl();

  btnSaveApiUrl.addEventListener("click", () => {
    const newUrl = apiBaseUrlInput.value.trim();
    window.apiClient.setBaseUrl(newUrl);
    showAlert("URL de la API actualizada a: " + window.apiClient.getBaseUrl(), "success");
    checkServerHealth();
    loadProducts();
  });

  // Funciones de Notificación
  function showAlert(message, type = "success") {
    alertMessage.textContent = message;
    alertBanner.className = `alert-banner ${type}`;
    alertBanner.classList.remove("hidden");
  }

  function hideAlert() {
    alertBanner.classList.add("hidden");
  }

  btnDismissAlert.addEventListener("click", hideAlert);

  // Verificación de Salud de la API
  async function checkServerHealth() {
    statusDot.className = "status-dot";
    statusText.textContent = "Verificando API...";

    try {
      const res = await window.apiClient.checkHealth();
      statusDot.className = "status-dot online";
      statusText.textContent = res.message || "API en línea";
      return true;
    } catch (err) {
      statusDot.className = "status-dot offline";
      statusText.textContent = "API Desconectada";
      showAlert(err.message, "error");
      return false;
    }
  }

  btnCheckHealth.addEventListener("click", async () => {
    const ok = await checkServerHealth();
    if (ok) showAlert("El servidor de inventario está en línea y respondiendo adecuadamente.", "success");
  });

  // Limpieza de Errores del Formulario
  function clearFormErrors() {
    [errorName, errorCategory, errorPrice, errorStock].forEach((el) => {
      el.textContent = "";
    });
    document.querySelectorAll(".form-group").forEach((group) => {
      group.classList.remove("has-error");
    });
  }

  // Validación en Cliente
  function validateClientForm(data) {
    let isValid = true;
    clearFormErrors();

    if (!data.name || !data.name.trim()) {
      errorName.textContent = "El nombre del producto es obligatorio";
      errorName.closest(".form-group").classList.add("has-error");
      isValid = false;
    }

    if (!data.category || !data.category.trim()) {
      errorCategory.textContent = "La categoría es obligatoria";
      errorCategory.closest(".form-group").classList.add("has-error");
      isValid = false;
    }

    if (data.price === "" || isNaN(Number(data.price))) {
      errorPrice.textContent = "El precio es obligatorio";
      errorPrice.closest(".form-group").classList.add("has-error");
      isValid = false;
    } else if (Number(data.price) < 0) {
      errorPrice.textContent = "El precio no puede ser negativo";
      errorPrice.closest(".form-group").classList.add("has-error");
      isValid = false;
    }

    if (data.stock !== "" && Number(data.stock) < 0) {
      errorStock.textContent = "El stock no puede ser negativo";
      errorStock.closest(".form-group").classList.add("has-error");
      isValid = false;
    }

    return isValid;
  }

  // Carga del Catálogo
  async function loadProducts() {
    catalogLoading.classList.remove("hidden");
    catalogEmpty.classList.add("hidden");
    tableContainer.classList.add("hidden");
    productsTbody.innerHTML = "";

    const category = filterCategory.value;
    const filters = {};
    if (category) filters.category = category;

    try {
      const response = await window.apiClient.getProducts(filters);
      const products = response.data || [];

      productsCount.textContent = `Total: ${products.length} producto${products.length === 1 ? "" : "s"}`;

      if (products.length === 0) {
        catalogEmpty.classList.remove("hidden");
      } else {
        renderProductsTable(products);
        tableContainer.classList.remove("hidden");
      }
    } catch (err) {
      showAlert(`Error al cargar catálogo: ${err.message}`, "error");
      catalogEmpty.classList.remove("hidden");
      productsCount.textContent = "Error de conexión";
    } finally {
      catalogLoading.classList.add("hidden");
    }
  }

  // Renderizado de Filas
  function renderProductsTable(products) {
    productsTbody.innerHTML = "";

    products.forEach((product) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-testid", `product-row-${product._id}`);

      const formattedPrice = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
      }).format(product.price);

      tr.innerHTML = `
        <td class="product-name-cell" data-testid="row-name-${product._id}">${escapeHtml(product.name)}</td>
        <td data-testid="row-category-${product._id}"><span class="badge">${escapeHtml(product.category)}</span></td>
        <td data-testid="row-price-${product._id}">${formattedPrice}</td>
        <td data-testid="row-stock-${product._id}">${product.stock}</td>
        <td class="table-actions">
          <button class="btn btn-outline btn-sm btn-view" data-id="${product._id}" data-testid="btn-view-${product._id}">Ver</button>
          <button class="btn btn-secondary btn-sm btn-edit" data-id="${product._id}" data-testid="btn-edit-${product._id}">Editar</button>
          <button class="btn btn-danger btn-sm btn-delete" data-id="${product._id}" data-testid="btn-delete-${product._id}">Eliminar</button>
        </td>
      `;

      productsTbody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Guardar (Crear o Actualizar) Producto
  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = productIdInput.value.trim();
    const rawData = {
      name: productNameInput.value,
      category: productCategorySelect.value,
      price: productPriceInput.value,
      stock: productStockInput.value || "0",
    };

    // Validación cliente
    if (!validateClientForm(rawData)) {
      return;
    }

    const payload = {
      name: rawData.name.trim(),
      category: rawData.category.trim(),
      price: Number(rawData.price),
      stock: Number(rawData.stock),
    };

    // Estado de carga en botón
    setSubmitLoading(true);
    hideAlert();

    try {
      if (id) {
        // Actualizar
        await window.apiClient.updateProduct(id, payload);
        showAlert(`Producto "${payload.name}" actualizado correctamente.`, "success");
        resetForm();
      } else {
        // Crear
        await window.apiClient.createProduct(payload);
        showAlert(`Producto "${payload.name}" creado con éxito.`, "success");
        resetForm();
      }
      await loadProducts();
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        showAlert(`Errores de validación: ${err.errors.join(", ")}`, "error");
        // Mapear a inputs
        err.errors.forEach((msg) => {
          if (msg.includes("nombre")) {
            errorName.textContent = msg;
            errorName.closest(".form-group").classList.add("has-error");
          }
          if (msg.includes("precio")) {
            errorPrice.textContent = msg;
            errorPrice.closest(".form-group").classList.add("has-error");
          }
          if (msg.includes("stock")) {
            errorStock.textContent = msg;
            errorStock.closest(".form-group").classList.add("has-error");
          }
        });
      } else {
        showAlert(err.message, "error");
      }
    } finally {
      setSubmitLoading(false);
    }
  });

  function setSubmitLoading(loading) {
    btnSubmitProduct.disabled = loading;
    if (loading) {
      submitSpinner.classList.remove("hidden");
      submitBtnText.textContent = "Procesando...";
    } else {
      submitSpinner.classList.add("hidden");
      submitBtnText.textContent = productIdInput.value ? "Actualizar Producto" : "Guardar Producto";
    }
  }

  function resetForm() {
    productForm.reset();
    productIdInput.value = "";
    formTitle.textContent = "Registrar Producto";
    formBadge.textContent = "Modo Creación";
    formBadge.className = "badge";
    submitBtnText.textContent = "Guardar Producto";
    btnCancelEdit.classList.add("hidden");
    clearFormErrors();
  }

  btnCancelEdit.addEventListener("click", resetForm);

  // Delegación de eventos en la tabla (Ver, Editar, Eliminar)
  productsTbody.addEventListener("click", async (e) => {
    const target = e.target;
    const id = target.getAttribute("data-id");
    if (!id) return;

    if (target.classList.contains("btn-edit")) {
      await enterEditMode(id);
    } else if (target.classList.contains("btn-delete")) {
      await handleDelete(id);
    } else if (target.classList.contains("btn-view")) {
      await handleViewDetail(id);
    }
  });

  async function enterEditMode(id) {
    try {
      const res = await window.apiClient.getProductById(id);
      const prod = res.data;

      productIdInput.value = prod._id;
      productNameInput.value = prod.name;
      productCategorySelect.value = prod.category;
      productPriceInput.value = prod.price;
      productStockInput.value = prod.stock;

      formTitle.textContent = "Editar Producto";
      formBadge.textContent = "Modo Edición";
      formBadge.className = "badge badge-warning";
      submitBtnText.textContent = "Actualizar Producto";
      btnCancelEdit.classList.remove("hidden");
      clearFormErrors();

      productNameInput.focus();
    } catch (err) {
      showAlert(`No fue posible cargar el producto para edición: ${err.message}`, "error");
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm("¿Está seguro de que desea eliminar este producto del inventario?");
    if (!confirmed) return;

    try {
      await window.apiClient.deleteProduct(id);
      showAlert("Producto eliminado satisfactoriamente.", "success");
      if (productIdInput.value === id) {
        resetForm();
      }
      await loadProducts();
    } catch (err) {
      showAlert(`Error al eliminar: ${err.message}`, "error");
    }
  }

  async function handleViewDetail(id) {
    try {
      const res = await window.apiClient.getProductById(id);
      const prod = res.data;

      const formattedPrice = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
      }).format(prod.price);

      modalBody.innerHTML = `
        <dl>
          <dt>ID:</dt>
          <dd><code data-testid="detail-id">${prod._id}</code></dd>
          <dt>Nombre:</dt>
          <dd data-testid="detail-name">${escapeHtml(prod.name)}</dd>
          <dt>Categoría:</dt>
          <dd data-testid="detail-category">${escapeHtml(prod.category)}</dd>
          <dt>Precio:</dt>
          <dd data-testid="detail-price">${formattedPrice}</dd>
          <dt>Stock:</dt>
          <dd data-testid="detail-stock">${prod.stock} unidades</dd>
          <dt>Registrado:</dt>
          <dd>${new Date(prod.createdAt).toLocaleString("es-CO")}</dd>
          <dt>Actualizado:</dt>
          <dd>${new Date(prod.updatedAt).toLocaleString("es-CO")}</dd>
        </dl>
      `;

      detailModal.classList.remove("hidden");
    } catch (err) {
      showAlert(`Error al consultar detalle: ${err.message}`, "error");
    }
  }

  function closeModal() {
    detailModal.classList.add("hidden");
  }

  btnCloseModal.addEventListener("click", closeModal);
  btnModalDismiss.addEventListener("click", closeModal);
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) closeModal();
  });

  // Filtros y Recargas
  filterCategory.addEventListener("change", loadProducts);
  btnRefreshCatalog.addEventListener("click", () => {
    loadProducts();
    checkServerHealth();
  });

  // Arranque Inicial
  checkServerHealth();
  loadProducts();
});

