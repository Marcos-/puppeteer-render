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
  // https://scon.stj.jus.br/SCON/pesquisar.jsp?b=ACOR&livre=sumula+7&O=JT&l=50
  // const url = 
  //       'https://scon.stj.jus.br/SCON/'

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
    // await page.waitForTimeout(5000)
    // await page.waitForSelector('button.icofont-ui-search', {timeout: 60000})
    // // Fill the search box
    // await page.type('#pesquisaLivre', search)
    // // await page.waitForTimeout(1000)
    // await page.waitForSelector('button.icofont-ui-search')
    // await page.click('button.icofont-ui-search')
    // // await page.waitForTimeout(1500)
    // await page.waitForSelector('.navegacaoDocumento')

    // await page.waitForSelector('#qtdDocsPagina')
    // await page.select('#qtdDocsPagina', '50')

    // await page.waitForTimeout(5000);

    // Wait for the search results page to load and display the results
    await page.waitForSelector('.listadocumentos > div.documento')
    
    let content = await page.$$eval(
        '.listadocumentos > div.documento',
        (elements) =>
            elements.map((el) => {
              function extractUrl(str) {
                // Find the start index of the URL (after the first single quote)
                const startIndex = str.indexOf('(');
                
                // Find the end index of the URL (before the second single quote)
                const endIndex = str.indexOf(')', startIndex);
                
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
                link: extractUrl(el.querySelector('div.row.clsHeaderDocumento > div.col-auto.clsIconesAcoes > a:nth-child(2)')?.href) || '',
              })
            }
          )//document.querySelector("#corpopaginajurisprudencia > div.navegacaoDocumento > div.documentoWrapper > div.listadocumentos > div:nth-child(2) > div.row.clsHeaderDocumento > div.col-auto.clsIconesAcoes > a:nth-child(2)")
    );
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