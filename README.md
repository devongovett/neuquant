# neuquant

A JavaScript port of Anthony Dekker's [NeuQuant](http://members.ozemail.com.au/~dekker/NEUQUANT.HTML) 
image quantization algorithm including a [pixel-stream](https://github.com/devongovett/pixel-stream)
interface.

## Installation

    npm install neuquant

## Example

```javascript
var nq = require('neuquant');

// get a palette and indexed pixel data for input RGB image
var res = nq.quantize(pixels, quality);
// => { palette: <Buffer ...>, indexed: <Buffer...> }

// streaming interface example
fs.createReadStream('in.jpg')
  .pipe(new JPEGDecoder)
  .pipe(new nq.Stream)
  .pipe(new GIFDecoder)
  .pipe(fs.createWriteStream('out.gif'));
```

## API

### `getPalette(pixels, quality = 10)`

Returns a buffer containing a palette of 256 RGB colors for the input
RGB image.  The quality parameter is set to `10` by default, but can 
be changed to increase or decrease quality at the expense of performance.
The lower the number, the higher the quality.

### `index(pixels, palette)`

Returns a new buffer containing the indexed pixel data for the input
image using the given palette, which is a buffer obtained from the 
above method.

### `quantize(pixels, quality = 10)`

Combines the above two methods and returns an object containing both
a palette buffer and the indexed pixel data at once.

### `Stream`

As shown in the above example, a streaming API can also be used.
You can pipe data to it, including multi-frame data, and it will
produce an indexed output chunk for each frame. You can access the
palette for each frame by listening for `frame` events on the stream.

## Authors

* The original [NeuQuant](http://members.ozemail.com.au/~dekker/NEUQUANT.HTML)
    algorithm was developed by Anthony Dekker.

* The JavaScript port of NeuQuant was originally done by Johan Nordberg
    for [GIF.js](https://github.com/jnordberg/gif.js).
    
* Streaming interface, wrapper API, and code cleanup by Devon Govett.

## License

MIT
