// const puppeteer = require("puppeteer");
import puppeteer from 'puppeteer-extra'
require("dotenv").config();

const scrapeLogic = async (res) => {
    const StealthPlugin = require('puppeteer-extra-plugin-stealth')
    puppeteer.use(StealthPlugin())

    let { search } = await req.json()

    const url = 
        'https://scon.stj.jus.br/SCON/'
    
    if (!url) {
        return new Response('Missing url query parameter', { status: 400 })
    }

    try {
        console.log('Launching browser...')
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
        const page = await browser.newPage()
        await page.goto(url, {timeout: 60000})
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

        return NextResponse.json( content )
    
    } catch (err) {
        return new Response(err?.toString(), { status: 500 })
    } finally {
        if (browser) {
            await browser.close()
        }
    }

  // const browser = await puppeteer.launch({
  //   args: [
  //     "--disable-setuid-sandbox",
  //     "--no-sandbox",
  //     "--single-process",
  //     "--no-zygote",
  //   ],
  //   executablePath:
  //     process.env.NODE_ENV === "production"
  //       ? process.env.PUPPETEER_EXECUTABLE_PATH
  //       : puppeteer.executablePath(),
  // });
  // try {
  //   const page = await browser.newPage();

  //   await page.goto("https://developer.chrome.com/");

  //   // Set screen size
  //   await page.setViewport({ width: 1080, height: 1024 });

  //   // Type into search box
  //   await page.type(".search-box__input", "automate beyond recorder");

  //   // Wait and click on first result
  //   const searchResultSelector = ".search-box__link";
  //   await page.waitForSelector(searchResultSelector);
  //   await page.click(searchResultSelector);

  //   // Locate the full title with a unique string
  //   const textSelector = await page.waitForSelector(
  //     "text/Customize and automate"
  //   );
  //   const fullTitle = await textSelector.evaluate((el) => el.textContent);

  //   // Print the full title
  //   const logStatement = `The title of this blog post is ${fullTitle}`;
  //   console.log(logStatement);
  //   res.send(logStatement);
  // } catch (e) {
  //   console.error(e);
  //   res.send(`Something went wrong while running Puppeteer: ${e}`);
  // } finally {
  //   await browser.close();
  // }
};

module.exports = { scrapeLogic };
