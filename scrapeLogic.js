const puppeteer = require( 'puppeteer-extra')
require("dotenv").config();

const scrapeLogic = async (res) => {
  const StealthPlugin = require('puppeteer-extra-plugin-stealth')
  puppeteer.use(StealthPlugin())
  
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  const url = 
        'https://scon.stj.jus.br/SCON/'

  const search = "Operação Lava Jato"

  try {
    const page = await browser.newPage()
    await page.goto(url, {timeout: 60000})
    // print
    await page.screenshot({ path: 'example.png' })
    await page.waitForSelector('button.icofont-ui-search')
    // Fill the search box
    await page.type('#pesquisaLivre', search)
    await page.click('button.icofont-ui-search')

    await page.waitForSelector('.navegacaoDocumento')

    await page.select('#qtdDocsPagina', '50')

    await page.waitForTimeout(2500);

    // Wait for the search results page to load and display the results
    await page.waitForSelector('.listadocumentos > div.documento')

    let content = await page.$$eval(
        '.listadocumentos > div.documento',
        (elements) =>
            elements.map((el) => ({
                process: el.querySelector('.clsIdentificacaoDocumento')?.textContent || '',
                relator: el.querySelector('div:nth-child(4) > div:nth-child(1) > div > div.docTexto > pre')?.textContent || '',
                classe: el.querySelector('div:nth-child(4) > div:nth-child(2) > div > div.docTexto > pre')?.textContent || '',
                ementa: el.querySelector('div:nth-child(5) > div > div > div.docTexto')?.textContent || '',
            }))
    );
        (elements) =>
            elements.map((el) => el)
    console.log(content);
    res.send(content);
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
