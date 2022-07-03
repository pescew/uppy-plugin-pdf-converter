# Uppy PDF Converter

<img src="https://uppy.io/images/logos/uppy-logo-2019.svg" width="120" alt="Uppy logo: a superman puppy in a pink suit" align="right">

PDFConverter is an [Uppy](https://github.com/transloadit/uppy) plugin, that converts PDFs to images before upload.

PDFConverter uses Mozilla's [PDF.js](https://github.com/mozilla/pdf.js/).

:warning: This is not an official Uppy plugin. Please notify of any bugs and use at your own risk.

Uppy is developed by [Transloadit](https://transloadit.com).

https://user-images.githubusercontent.com/1776798/177047294-dd9315d2-f741-4b55-9d38-ffd1bf49d440.mp4

## Example

```js
const Uppy = require('@uppy/core')
import PDFConverter from 'uppy-plugin-pdf-converter';

const uppy = Uppy()
uppy.use(PDFConverter, {
    type: "image/webp",
    quality: .8,
    maxPages: 50,
    width: 0,
    height: 0,
    minWidth: 2048,
    minHeight: 2048,
    maxWidth: 4096,
    maxHeight: 4096,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    dontFlip: false,
})
```

## Installation

```bash
$ npm install https://github.com/pescew/uppy-plugin-pdf-converter
```

## Options

"type" option supports one of "image/png", "image/jpeg", or "image/webp"

"quality" option only works for "image/jpeg" or "image/webp" types.  Between 0-1.

Because PDF documents often have text content, [it is not recommended to use jpeg encoding](https://www.youtube.com/watch?v=yBX8GFqt6GA).  "image/webp" or "image/png" are preferable.
"image/png" type will ignore the "quality" option.
For this reason, the default is "image/webp"
