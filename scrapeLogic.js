require("dotenv").config();

const puppeteer = require( 'puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())
const anonymizeUaPlugin = require('puppeteer-extra-plugin-anonymize-ua');
puppeteer.use(anonymizeUaPlugin());

function formatStringForURL(input) {
  if (!input || typeof input !== 'string') {
      return '';
  }

  // Trim whitespace from both ends of the string
  let trimmedInput = input.trim();

  // Normalize the string to NFD form and remove diacritics
  let normalized = trimmedInput.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Remove special characters except spaces
  let formatted = normalized.replace(/[^a-zA-Z0-9\s]/g, '');

  // Replace spaces with +
  formatted = formatted.replace(/\s+/g, '+');

  // Encode the result
  // return encodeURIComponent(formatted);
  return formatted;
}

const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
puppeteer.use(
  RecaptchaPlugin({
    provider: { id: '2captcha', token: process.env.CAPTCHA_API_KEY },
    visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
  })
)

const scrapeLogic = async (req, res) => {

  const proxyURL = process.env.PROXY_URL
  const proxyUsername = process.env.PROXY_USERNAME
  const proxyPassword = process.env.PROXY_PASSWORD

  if (req.method != "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const StealthPlugin = require('puppeteer-extra-plugin-stealth')
  puppeteer.use(StealthPlugin())
  
  const browser = await puppeteer.launch({
    headless: 'shell',
    // headless: false,
    ignoreHTTPSErrors:true,
    args: [
      `--proxy-server=${proxyURL}`,
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      "--disable-setuid-sandbox",
      '--disable-dev-shm-usage',
      "--no-sandbox",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  const search = req.body.search
  // const livre = search.split(' ').join('+').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const livre = formatStringForURL(search)
  const url = `https://scon.stj.jus.br/SCON/pesquisar.jsp?b=ACOR&livre=${livre}&O=JT&l=100`

  if (!search) {
    res.status(400).send("Bad Request: Missing search parameter");
    return;
  }

  try {
    const page = await browser.newPage()
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (req.resourceType() === 'stylesheet' || req.resourceType() === 'font' || req.resourceType() === 'image') {
            req.abort();
        } else {
            req.continue();
        }
    });

    console.log(`Starting search for: ${search}`)

    await page.authenticate({
      username: proxyUsername,
      password: proxyPassword,
    })  
    
    await page.goto(url, {timeout: 60000})

    // if (await page.$('#turnstile-wrapper', {timeout: 5000})) {
    //   await page.solveRecaptchas()
    //   console.log('Recaptcha solved')

    //   // return a screenshot
    //   const screenshot = await page.screenshot({ path: 'screenshot.png' });
    //   return res.send(screenshot);

    //   await Promise.all([
    //     page.waitForSelector('#turnstile-wrapper > div > label > input[type=checkbox]', {timeout: 5000}),
    //     page.click(`#turnstile-wrapper > div > label > input[type=checkbox]`)
    //   ])
    // }
    // document.querySelector("#turnstile-wrapper > div > label > input[type=checkbox]")
    let content = await page.$$eval(
        '.listadocumentos > div.documento',
        (elements) =>
            elements.map((el) => {
              function extractUrl(str) {
                if (!str) 
                  return null;

                // Find the start index of the URL (after the first single quote)
                const startIndex = str.indexOf('(') + 2;
                
                // Find the end index of the URL (before the second single quote)
                const endIndex = str.indexOf(')', startIndex);

                if (startIndex === -1 || endIndex === -1) {
                  return null;
                }
                
                // Extract the substring that contains the URL
                const url = str.substring(startIndex, endIndex);
                
                return url;
              }
              return ({
                process: el.querySelector('.clsIdentificacaoDocumento')?.textContent || '',
                relator: el.querySelector('div:nth-child(4) > div:nth-child(1) > div > div.docTexto > pre')?.textContent || '',
                classe: el.querySelector('div:nth-child(4) > div:nth-child(2) > div > div.docTexto > pre')?.textContent || '',
                ementa: el.querySelector('div:nth-child(5) > div > div > div.docTexto')?.textContent || '',
                acordao: el.querySelector('div:nth-child(6) > div > div > div.docTexto')?.textContent || '',
                misc: el.querySelector('div:nth-child(7) > div > div > div.docTexto')?.textContent || '',
                link: extractUrl(el.querySelector('div.row.clsHeaderDocumento > div.col-auto.clsIconesAcoes > a[aria-label="Consulta Processual"]')?.href || '') || '',
              })
            }
          ));
        (elements) =>
            elements.map((el) => el)

    console.log(`Found ${content.length} results from search: ${search}`)

    // if (content.length === 0) {
    //   res.status(404).send("No results found");
    //   return;
    // }
    res.send(content);
  } catch (e) {
    console.error(e);
    console.error(search)
    console.error(url)
    // res.send(`Something went wrong while running Puppeteer: ${e}`);
    res.send([])
  } finally {
    if (browser)
      await browser.close();
  }
};

module.exports = { scrapeLogic };