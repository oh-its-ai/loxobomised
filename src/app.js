const fs = require("fs");
const path = require("path");
const express = require("express");
const puppeteer = require("puppeteer");
require("dotenv").config();

const miniServerId = process.env.MINI_SERVER_ID;
const login = process.env.LOGIN;
const password = process.env.PASSWORD;

let page = null;

const app = express();

app.get("/exec/:command", async (req, res) => {
  const { command } = req.params;
  const commandPath = path.join(__dirname, "commands", `${command}.js`);

  fs.access(commandPath, fs.constants.F_OK, async (err) => {
    if (err) {
      console.error(`Command ${command} does not exist.`);
      res.status(404).send(`Command ${command} does not exist.`);
    } else {
      const commandModule = require(commandPath);
      if (typeof commandModule.run === "function") {
        await commandModule.run(page);
        res.send(`Command ${command} executed successfully.`);
      } else {
        console.error(`Command ${command} does not have a run function.`);
        res
          .status(500)
          .send(`Command ${command} does not have a run function.`);
      }
    }
  });
});

initPage().then(() => {
  app.listen(3000, () => {
    console.log("Server is listening on port 3000");
  });
});

const FiveMinInMilliseconds = 300000;
setInterval(() => {
  refreshPage();
}, FiveMinInMilliseconds);

async function initPage() {
  const browser = await puppeteer.launch();
  page = await browser.newPage();
  // store in localstorage the loxone config with "ambientOnboardingShown":true
  await page.evaluateOnNewDocument((settingStr) => {
    localStorage.setItem("LoxSettings.json", settingStr);
  }, `{"animations":true,"darkMode":true,"tileRepresentation":true,"simpleDesign":false,"miniservers":{"${miniServerId}":{"homeScreen":{"activated":true,"widget":{"building":0,"skyline":0}},"manualFavorites":{"activated":false},"deviceFavorites":{"activated":false},"entryPointLocation":"favorites","presenceRoom":"","instructionFlags":{},"userManagement":{},"sortingDeviceFavorites":{"Mieter":{"activated":false}},"kvStore":{},"ambientOnboardingShown":true}},"instructionFlags":{},"LOCAL_STORAGE":{},"entryPoint":{"activated":true,"entryPointLocation":"favorites"},"SYNC":{"ENABLED":false},"screenSaver":{"activationTime":300,"brightness":10}}`);

  // login to loxone miniserver
  await page.goto(`https://dns.loxonecloud.com/${miniServerId}`);
  await page.type("input[type=text]", login);
  await page.type("input[type=password]", password);

  await page.click("button[type=submit]");
  await page.waitForNavigation();

  console.log("Successfully logged in to loxone web interface");
}

async function refreshPage() {
  console.log("Refreshing page to keep a logged-in state");
  // login to loxone miniserver
  await page.goto(`https://dns.loxonecloud.com/${miniServerId}`);
  await page.type("input[type=text]", login);
  await page.type("input[type=password]", password);

  await page.click("button[type=submit]");
  await page.waitForNavigation();
}
