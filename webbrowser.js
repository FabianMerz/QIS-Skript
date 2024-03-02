const { Builder, Browser, By, Key } = require('selenium-webdriver');
const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios');
require('dotenv').config();
// Get credentials from environment variables
const username = process.env.USERNAME;
const password = process.env.PASSWORD;
const botToken = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

async function openGoogle() {
  const driver = await new Builder().forBrowser(Browser.CHROME).build();
  try {
    await driver.get('https://qis.hs-albsig.de/');
    await Sleep(1000);
    await driver.findElement(By.name('asdf')).sendKeys(username);
    await Sleep(1000);
    await driver.findElement(By.name('fdsa')).sendKeys(password, Key.RETURN);
    await Sleep(2000);
    await click(driver, 'Prüfungsverwaltung');
    await Sleep(1000);
    await click(driver, 'Notenspiegel');
    await Sleep(1000);
    await clickByXPath(driver, "//img[@alt='Leistungen für Abschluss 84 Bachelor anzeigen']");

    // Wait for the table to load
    await Sleep(2000);

    // Get the table element
    const tableElement = await driver.findElement(By.xpath("//th[contains(., 'Bachelor')]/ancestor::table[1]"));

    // Get the HTML content of the table
    const tableHtml = await tableElement.getAttribute('innerHTML');

    // Save the current table to a new file
    fs.writeFileSync('current_table.html', tableHtml);

    // Compare tables
    await compareOccurrencesAndRename();

    await clickByXPath(driver, "//a[contains(@href, 'auth.logout')]");
  } finally {
    // Close the browser
    await driver.quit();
  }
}

async function compareOccurrencesAndRename() {
  const currentFile = 'current_table.html';
  const previousFile = 'previous_table.html';

  try {
    // Check if previous_table.html exists
    if (!fs.existsSync(previousFile)) {
      // If it doesn't exist, rename current_table.html to previous_table.html
      await fs.promises.rename(currentFile, previousFile);
      console.log('First run of the script, renamed current_table.html to previous_table.html');
      return;
    }

    const [currentData, previousData] = await Promise.all([
      fs.promises.readFile(currentFile, 'utf8'),
      fs.promises.readFile(previousFile, 'utf8')
    ]);

    const occurrencesCurrentBestanden = (currentData.match(/bestanden/g) || []).length;
    const occurrencesCurrentNichtBestanden = (currentData.match(/nicht bestanden/g) || []).length;
    const occurrencesPreviousBestanden = (previousData.match(/bestanden/g) || []).length;
    const occurrencesPreviousNichtBestanden = (previousData.match(/nicht bestanden/g) || []).length;

    if (
      occurrencesCurrentBestanden !== occurrencesPreviousBestanden ||
      occurrencesCurrentNichtBestanden !== occurrencesPreviousNichtBestanden
    ) {
      await fs.promises.rename(currentFile, previousFile);
      console.log('New grades added');
      await axios.get(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=New%20grades%20have%20been%20added`);
    } else {
      console.log("nothing happened")
    }
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

async function click(driver, text) {
  await driver.findElement(By.xpath("//*[text()='" + text + "']")).click();
}

async function clickByXPath(driver, xpath) {
  await driver.findElement(By.xpath(xpath)).click();
}

function Sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runCode() {
  try {
    const now = new Date();
    const hours = now.getHours();

    // Check if it is between 7 AM and 11 PM
    if (hours >= 7 && hours <= 23) {
      await openGoogle();
    } else {
    }
  } catch (error) {
    console.log('error', error);
  }
}

async function scheduleRunCode() {
  while (true) {
    const intervalMinutes = getRandomInterval();
    const delayMilliseconds = intervalMinutes * 60 * 1000;
    await Sleep(delayMilliseconds);
    await runCode();
  }
}


function getRandomInterval() {
  const minMinutes = 15;
  const maxMinutes = 30;
  return Math.floor(Math.random() * (maxMinutes - minMinutes + 1) + minMinutes);
}

runCode();
scheduleRunCode();
