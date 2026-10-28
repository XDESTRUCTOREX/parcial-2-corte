const { until } = require("selenium-webdriver");

/**
 * BasePage: Encapsula interacciones comunes y esperas explícitas con Selenium WebDriver.
 */
class BasePage {
  constructor(driver, defaultTimeout = 10000) {
    this.driver = driver;
    this.defaultTimeout = defaultTimeout;
  }

  async waitForVisible(locator, timeout = this.defaultTimeout) {
    const element = await this.driver.wait(until.elementLocated(locator), timeout);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  async waitForText(locator, text, timeout = this.defaultTimeout) {
    await this.driver.wait(async () => {
      const el = await this.driver.findElement(locator);
      const current = await el.getText();
      return current.includes(text);
    }, timeout);
  }

  async click(locator, timeout = this.defaultTimeout) {
    const el = await this.waitForVisible(locator, timeout);
    await this.driver.wait(until.elementIsEnabled(el), timeout);
    await el.click();
  }

  async type(locator, text, timeout = this.defaultTimeout) {
    const el = await this.waitForVisible(locator, timeout);
    await el.sendKeys(text);
  }

  async clearAndType(locator, text, timeout = this.defaultTimeout) {
    const el = await this.waitForVisible(locator, timeout);
    await el.clear();
    await el.sendKeys(text);
  }

  async getText(locator, timeout = this.defaultTimeout) {
    const el = await this.waitForVisible(locator, timeout);
    return await el.getText();
  }

  async isDisplayed(locator) {
    try {
      const elements = await this.driver.findElements(locator);
      if (elements.length === 0) return false;
      return await elements[0].isDisplayed();
    } catch {
      return false;
    }
  }

  async selectOptionByValue(selectLocator, value, timeout = this.defaultTimeout) {
    const select = await this.waitForVisible(selectLocator, timeout);
    await select.click();
    const option = await select.findElement({
      xpath: `.//option[@value='${value}']`,
    });
    await option.click();
  }
}

module.exports = BasePage;

