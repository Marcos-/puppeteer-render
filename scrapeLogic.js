const puppeteer = require( 'puppeteer-extra')
require("dotenv").config();

const scrapeLogic = async (req, res) => {
  
  if (req.method != "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const StealthPlugin = require('puppeteer-extra-plugin-stealth')
  puppeteer.use(StealthPlugin())
  
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: [
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
  const livre = search.split(' ').join('+').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const url = `https://scon.stj.jus.br/SCON/pesquisar.jsp?b=ACOR&livre=${livre}&O=JT&l=50`

  if (!search) {
    res.status(400).send("Bad Request: Missing search parameter");
    return;
  }

  try {
    const page = await browser.newPage()
    await page.goto(url, {timeout: 60000})
    await page.waitForSelector('.listadocumentos > div.documento')
    
    let content = await page.$$eval(
        '.listadocumentos > div.documento',
        (elements) =>
            elements.map((el) => {
              function extractUrl(str) {
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
                link: extractUrl(el.querySelector('div.row.clsHeaderDocumento > div.col-auto.clsIconesAcoes > a[aria-label="Consulta Processual"]')?.href) || '',
              })
            }
          ));
        (elements) =>
            elements.map((el) => el)
    res.send(content);
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    if (browser)
      await browser.close();
  }
};

module.exports = { scrapeLogic };