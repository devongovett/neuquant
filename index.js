var NeuQuant = require('./src/neuquant');

/**
 * Produces a color palette for the given pixels, 
 * at the provided quality level.
 */
exports.getPalette = function(pixels, quality) {
  var nq = new NeuQuant(pixels, quality || 10);
  return nq.buildColorMap();
};

/**
 * Returns a new buffer of indexed pixels for each pixel
 * in the provided buffer, using the given color palette.
 */
exports.index = function(pixels, palette) {
  var indexed = new Buffer(pixels.length / 3);
  var j = 0;
  var memo = {};
  
  for (var i = 0; i < pixels.length;) {
    var r = pixels[i++], g = pixels[i++], b = pixels[i++];
    var k = r << 16 | g << 8 | b;
    
    // check if we already computed the index for this color
    if (k in memo)
      indexed[j++] = memo[k];
    else
      indexed[j++] = memo[k] = findClosestRGB(palette, r, g, b);
  }
  
  return indexed;
};

// Helper function that finds the closest palette index for the given color
function findClosestRGB(palette, r, g, b) {
  var minpos = 0;
  var dmin = 256 * 256 * 256;

  for (var i = 0; i < palette.length;) {
    var dr = r - palette[i++];
    var dg = g - palette[i++];
    var db = b - palette[i];
    var d = dr * dr + dg * dg + db * db;
    var index = i / 3 | 0;
    if (d < dmin) {
      dmin = d;
      minpos = index;
    }
    
    i++;
  }

  return minpos;
}

/**
 * Combines the above two methods.
 * Returns an object containing { palette, indexed }
 * keys for the provided image at the given quality.
 */
exports.quantize = function(pixels, quality) {
  var palette = exports.getPalette(pixels, quality);
  var indexed = exports.index(pixels, palette);
  return {
    palette: palette,
    indexed: indexed
  };
};

// Export the streaming interface
exports.Stream = require('./src/stream');
