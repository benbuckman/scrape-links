# CLI script to scrape links from a website

`npm install -g scrape-links`

```
Usage: scrape-links --url URL --out FILE --max-depth N`
Scrapes all links, recursively loading each found link on the same domain.

Options:
  --url        initial URL to scrape                   [required]
  --out        file to write URLs
  --max-depth  Scrape only this number of pages deep.
```
