const express = require("express");
const { scrapeLogic } = require("./scrapeLogic");
const app = express();
var bodyParser = require('body-parser')

const PORT = process.env.PORT || 3000;

var jsonParser = bodyParser.json()
app.use(bodyParser.json());

app.post("/scrape", jsonParser, (req, res) => {
  scrapeLogic(req, res);
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
