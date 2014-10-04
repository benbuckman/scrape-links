#!/usr/bin/env node

/*
scrape links from an initial URL,
recursively, on same domain, down to max depth,
and output all found links to a file.

@TODO
  - follow redirects?
*/

var request = require('request'),
    cheerio = require('cheerio'),
    parseUrl = require('url').parse,
    fs = require('fs');

var argv = require('yargs')
  .usage('Usage: $0 --url URL --out FILE --max-depth N\n' +
    'Scrapes all links, recursively loading each found link on the same domain.')
  .demand('url').describe('url', 'initial URL to scrape')
  .describe('out', 'file to write URLs')
  .describe('max-depth', 'Scrape only this number of pages deep.')
  .showHelpOnFail(true)
  .argv;

var startUrl = argv.url;
var baseUrl = 'http://' + parseUrl(startUrl).host;

var found = [],    // URLs
    queued = [],   // {url,depth}
    finished = [], // URLs
    maxDepth = +argv['max-depth'] || 0;

function scrapeNext(done) {
  var next = queued.shift();
  if (!next) return done(new Error("Nothing in queue"));

  var url = next.url,
      depth = next.depth,
      $,
      linkUrl;

  console.log("Loading", url);

  return request(url, function(err, res, body) {
    if (err) return done(err);
    finished.push(url);

    $ = cheerio.load(body);
    $('a').each(function() {
      linkUrl = normalizeUrl($(this).attr('href'));
      if (linkUrl) addUrl(linkUrl, depth + 1);
    });

    if (queued.length) scrapeNext(done);
    else done();
  });
}

function normalizeUrl(url) {
  try {
    // ignore anchor links
    if (url.substr(0, 1) === '#') throw new Error;

    // neutral procotocl
    if (url.substr(0, 2) === '//') url = 'http:' + url;

    // relative
    if (url.substr(0, 1) === '/') url = baseUrl + url;

    // remove trailing slash
    if (url.substr(-1, 1) === '/') url = url.substr(0, url.length - 1);

    url = url.replace(/^https/, 'http');
    return url;

  } catch (ignErr) {
    console.error("Invalid URL", url);
    return null;
  }
}

function addUrl(url, depth) {
  if (found.indexOf(url) === -1) {
    console.log("Found link (depth:" + depth + ")", url);
    found.push(url);
  }
  if ((maxDepth && depth <= maxDepth) &&
    url.substr(0, baseUrl.length) === baseUrl &&
    finished.indexOf(url) === -1 &&
    queued.indexOf(url) === -1) {
      console.log("Queued", url);
      return queued.push({ url: url, depth: depth });
  }
}

addUrl(startUrl, 1);

scrapeNext(function(err) {
  found.sort();

  function _line(url) { return '  ' + url; }

  console.log("\n\nScraped" +
    (maxDepth ? " (" + maxDepth + " deep)" : "") +
    ":\n" + finished.map(_line).join('\n'));

  console.log("\n\nFound:\n" + found.map(_line).join('\n') + "\n");

  if (argv.out) {
    fs.writeFileSync(argv.out, found.join('\n'), { encoding: 'utf8' });
    console.log("Wrote found links to '" + argv.out + "'\n");
  }

  if (err) throw err;
});
