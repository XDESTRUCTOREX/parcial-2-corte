const { Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

class DriverFactory {
  static async createDriver() {
    const options = new chrome.Options();
    options.addArguments(
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1280,900"
    );

    const driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    // Configuración de timeouts por defecto
    await driver.manage().setTimeouts({
      implicit: 0, // Evitar esperas implícitas para favorecer esperas explícitas
      pageLoad: 30000,
      script: 30000,
    });

    return driver;
  }
}

module.exports = DriverFactory;

