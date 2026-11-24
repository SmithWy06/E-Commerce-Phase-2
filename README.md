# JazzScratch

A responsive, static e-commerce mockup for jazz records, CDs, and digital music. It uses plain HTML, CSS, and vanilla JavaScript; there are no build steps or framework dependencies.

## Run locally

Open `index.html` in a browser, or serve this directory with any static file server. Product images and the optional typefaces load from Unsplash and Google Fonts.

## Pages

- `index.html` — storefront home and featured records
- `products.html` — searchable, filterable, sortable catalog
- `product-detail.html?id=blue-train` — item information and add-to-bag controls
- `cart.html` — editable shopping bag
- `checkout.html` — simulated order form and confirmation
- `product-review.html` — reviews and structured listening preferences
- `profile.html` — local demo account, reviews, and preference summary

The shopping bag, demo order, reviews, and listening preferences are saved in browser `localStorage`. Checkout does not collect payment or send data to a server.