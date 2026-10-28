const { By, until } = require("selenium-webdriver");
const BasePage = require("./BasePage");

/**
 * InventoryPage: Page Object Model para la interfaz del cliente web de inventario.
 * Encapsula todos los selectores estables mediante data-testid y métodos de interacción.
 */
class InventoryPage extends BasePage {
  constructor(driver) {
    super(driver);

    // Selectores estables por data-testid
    this.locators = {
      appTitle: By.css('[data-testid="app-title"]'),
      serverStatus: By.css('[data-testid="server-status"]'),
      btnCheckHealth: By.css('[data-testid="btn-check-health"]'),
      alertBanner: By.css('[data-testid="alert-banner"]'),
      alertMessage: By.css('[data-testid="alert-message"]'),
      formTitle: By.css('[data-testid="form-title"]'),
      inputName: By.css('[data-testid="input-name"]'),
      inputCategory: By.css('[data-testid="input-category"]'),
      inputPrice: By.css('[data-testid="input-price"]'),
      inputStock: By.css('[data-testid="input-stock"]'),
      btnSubmit: By.css('[data-testid="btn-submit"]'),
      btnCancel: By.css('[data-testid="btn-cancel"]'),
      errorName: By.css('[data-testid="error-name"]'),
      errorCategory: By.css('[data-testid="error-category"]'),
      errorPrice: By.css('[data-testid="error-price"]'),
      errorStock: By.css('[data-testid="error-stock"]'),
      filterCategory: By.css('[data-testid="filter-category"]'),
      btnRefresh: By.css('[data-testid="btn-refresh"]'),
      productsTable: By.css('[data-testid="products-table"]'),
      productsTbody: By.css('[data-testid="products-tbody"]'),
      productsCount: By.css('[data-testid="products-count"]'),
      catalogEmpty: By.css('[data-testid="catalog-empty"]'),
      catalogLoading: By.css('[data-testid="catalog-loading"]'),
      detailModal: By.css('[data-testid="detail-modal"]'),
      modalTitle: By.css('[data-testid="modal-title"]'),
      detailName: By.css('[data-testid="detail-name"]'),
      detailCategory: By.css('[data-testid="detail-category"]'),
      detailPrice: By.css('[data-testid="detail-price"]'),
      detailStock: By.css('[data-testid="detail-stock"]'),
      btnCloseModal: By.css('[data-testid="btn-close-modal"]'),
      btnModalDismiss: By.css('[data-testid="btn-modal-dismiss"]'),
    };
  }

  async navigateTo(url) {
    await this.driver.get(url);
    await this.waitForVisible(this.locators.appTitle);
  }

  async getAppTitle() {
    return await this.getText(this.locators.appTitle);
  }

  async getServerStatusText() {
    return await this.getText(this.locators.serverStatus);
  }

  async clickCheckHealth() {
    await this.click(this.locators.btnCheckHealth);
  }

  async fillForm({ name, category, price, stock }) {
    if (name !== undefined) {
      await this.clearAndType(this.locators.inputName, name);
    }
    if (category !== undefined) {
      await this.selectOptionByValue(this.locators.inputCategory, category);
    }
    if (price !== undefined) {
      await this.clearAndType(this.locators.inputPrice, String(price));
    }
    if (stock !== undefined) {
      await this.clearAndType(this.locators.inputStock, String(stock));
    }
  }

  async submitForm() {
    await this.click(this.locators.btnSubmit);
  }

  async createProduct({ name, category, price, stock }) {
    await this.fillForm({ name, category, price, stock });
    await this.submitForm();
  }

  async waitForAlert(timeout = 10000) {
    await this.waitForVisible(this.locators.alertBanner, timeout);
    return await this.getText(this.locators.alertMessage);
  }

  async getAlertMessage() {
    return await this.getText(this.locators.alertMessage);
  }

  async getNameError() {
    return await this.getText(this.locators.errorName);
  }

  async getPriceError() {
    return await this.getText(this.locators.errorPrice);
  }

  async getCategoryError() {
    return await this.getText(this.locators.errorCategory);
  }

  async getProductsCountText() {
    return await this.getText(this.locators.productsCount);
  }

  async getTableRowCount() {
    const rows = await this.driver.findElements(
      By.css('[data-testid="products-tbody"] tr')
    );
    return rows.length;
  }

  async waitForTableRowCount(expectedCount, timeout = 10000) {
    await this.driver.wait(async () => {
      const rows = await this.driver.findElements(
        By.css('[data-testid="products-tbody"] tr')
      );
      return rows.length === expectedCount;
    }, timeout);
  }

  async clickEditProductByIndex(index = 0) {
    const editButtons = await this.driver.findElements(By.css(".btn-edit"));
    if (editButtons.length <= index) {
      throw new Error(`No se encontró botón de editar en índice ${index}`);
    }
    await editButtons[index].click();
  }

  async clickDeleteProductByIndex(index = 0) {
    const deleteButtons = await this.driver.findElements(By.css(".btn-delete"));
    if (deleteButtons.length <= index) {
      throw new Error(`No se encontró botón de eliminar en índice ${index}`);
    }
    await deleteButtons[index].click();

    // Confirmar alerta nativa del navegador
    await this.driver.wait(until.alertIsPresent(), 5000);
    const alert = await this.driver.switchTo().alert();
    await alert.accept();
  }

  async clickViewDetailByIndex(index = 0) {
    const viewButtons = await this.driver.findElements(By.css(".btn-view"));
    if (viewButtons.length <= index) {
      throw new Error(`No se encontró botón de ver en índice ${index}`);
    }
    await viewButtons[index].click();
    await this.waitForVisible(this.locators.detailModal);
  }

  async closeDetailModal() {
    await this.click(this.locators.btnCloseModal);
    await this.driver.wait(async () => {
      const isModalVisible = await this.isDisplayed(this.locators.detailModal);
      return !isModalVisible;
    }, 5000);
  }

  async getModalDetail() {
    return {
      name: await this.getText(this.locators.detailName),
      category: await this.getText(this.locators.detailCategory),
      price: await this.getText(this.locators.detailPrice),
      stock: await this.getText(this.locators.detailStock),
    };
  }

  async filterByCategory(categoryValue) {
    await this.selectOptionByValue(this.locators.filterCategory, categoryValue);
  }
}

module.exports = InventoryPage;

