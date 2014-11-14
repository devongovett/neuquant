/* NeuQuant Neural-Net Quantization Algorithm
 * ------------------------------------------
 *
 * Copyright (c) 1994 Anthony Dekker
 *
 * NEUQUANT Neural-Net quantization algorithm by Anthony Dekker, 1994.
 * See "Kohonen neural networks for optimal colour quantization"
 * in "Network: Computation in Neural Systems" Vol. 5 (1994) pp 351-367.
 * for a discussion of the algorithm.
 * See also  http://members.ozemail.com.au/~dekker/NEUQUANT.HTML
 *
 * Any party obtaining a copy of these files from the author, directly or
 * indirectly, is granted, free of charge, a full and unrestricted irrevocable,
 * world-wide, paid up, royalty-free, nonexclusive right and license to deal
 * in this software and documentation files (the "Software"), including without
 * limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons who receive
 * copies from any such party to do so, with the only requirement being
 * that this copyright notice remain intact.
 *
 * JavaScript port 2012 by Johan Nordberg
 * Updated 2014 by Devon Govett
 */

var ncycles = 100; // number of learning cycles
var netsize = 256; // number of colors used
var maxnetpos = netsize - 1;

// defs for freq and bias
var netbiasshift = 4; // bias for colour values
var intbiasshift = 16; // bias for fractions
var intbias = (1 << intbiasshift);
var gammashift = 10;
var gamma = (1 << gammashift);
var betashift = 10;
var beta = (intbias >> betashift); /* beta = 1/1024 */
var betagamma = (intbias << (gammashift - betashift));

// defs for decreasing radius factor
var initrad = (netsize >> 3); // for 256 cols, radius starts
var radiusbiasshift = 6; // at 32.0 biased by 6 bits
var radiusbias = (1 << radiusbiasshift);
var initradius = (initrad * radiusbias); //and decreases by a
var radiusdec = 30; // factor of 1/30 each cycle

// defs for decreasing alpha factor
var alphabiasshift = 10; // alpha starts at 1.0
var initalpha = (1 << alphabiasshift);
var alphadec; // biased by 10 bits

// radbias and alpharadbias used for radpower calculation
var radbiasshift = 8;
var radbias = (1 << radbiasshift);
var alpharadbshift = (alphabiasshift + radbiasshift);
var alpharadbias = (1 << alpharadbshift);

// four primes near 500 - assume no image has a length so large that it is
// divisible by all four primes
var prime1 = 499;
var prime2 = 491;
var prime3 = 487;
var prime4 = 503;
var minpicturebytes = (3 * prime4);

/**
 * NeuQuant constructor
 * pixels - array of pixels in RGB format
 * samplefac - sampling factor 1 to 30 where lower is better quality
 */
function NeuQuant(pixels, samplefac) {
  this.pixels = pixels;
  this.samplefac = samplefac;
  
  this.network = [];
  this.netindex = new Int32Array(256);
  this.bias = new Int32Array(netsize);
  this.freq = new Int32Array(netsize);
  this.radpower = new Int32Array(netsize >> 3);

  var i, v;
  for (i = 0; i < netsize; i++) {
    v = (i << (netbiasshift + 8)) / netsize;
    this.network[i] = new Float64Array([v, v, v, 0]);
    this.freq[i] = intbias / netsize;
    this.bias[i] = 0;
  }
}

// Unbiases network to give byte values 0..255 and record position i to prepare for sort
NeuQuant.prototype.unbiasnet = function() {
  for (var i = 0; i < netsize; i++) {
    this.network[i][0] >>= netbiasshift;
    this.network[i][1] >>= netbiasshift;
    this.network[i][2] >>= netbiasshift;
    this.network[i][3] = i; // record color number
  }
};

// Moves neuron *i* towards biased (b,g,r) by factor *alpha*
NeuQuant.prototype.altersingle = function(alpha, i, b, g, r) {
  this.network[i][0] -= (alpha * (this.network[i][0] - b)) / initalpha;
  this.network[i][1] -= (alpha * (this.network[i][1] - g)) / initalpha;
  this.network[i][2] -= (alpha * (this.network[i][2] - r)) / initalpha;
};

// Moves neurons in *radius* around index *i* towards biased (b,g,r) by factor *alpha*
NeuQuant.prototype.alterneigh = function(radius, i, b, g, r) {
  var lo = Math.abs(i - radius);
  var hi = Math.min(i + radius, netsize);

  var j = i + 1;
  var k = i - 1;
  var m = 1;

  var p, a;
  while ((j < hi) || (k > lo)) {
    a = this.radpower[m++];

    if (j < hi) {
      p = this.network[j++];
      p[0] -= (a * (p[0] - b)) / alpharadbias;
      p[1] -= (a * (p[1] - g)) / alpharadbias;
      p[2] -= (a * (p[2] - r)) / alpharadbias;
    }

    if (k > lo) {
      p = this.network[k--];
      p[0] -= (a * (p[0] - b)) / alpharadbias;
      p[1] -= (a * (p[1] - g)) / alpharadbias;
      p[2] -= (a * (p[2] - r)) / alpharadbias;
    }
  }
};

// Searches for biased BGR values
NeuQuant.prototype.contest = function(b, g, r) {
  /*
    finds closest neuron (min dist) and updates freq
    finds best neuron (min dist-bias) and returns position
    for frequently chosen neurons, freq[i] is high and bias[i] is negative
    bias[i] = gamma * ((1 / netsize) - freq[i])
  */

  var bestd = ~(1 << 31);
  var bestbiasd = bestd;
  var bestpos = -1;
  var bestbiaspos = bestpos;

  var i, n, dist, biasdist, betafreq;
  for (i = 0; i < netsize; i++) {
    n = this.network[i];

    dist = Math.abs(n[0] - b) + Math.abs(n[1] - g) + Math.abs(n[2] - r);
    if (dist < bestd) {
      bestd = dist;
      bestpos = i;
    }

    biasdist = dist - ((this.bias[i]) >> (intbiasshift - netbiasshift));
    if (biasdist < bestbiasd) {
      bestbiasd = biasdist;
      bestbiaspos = i;
    }

    betafreq = (this.freq[i] >> betashift);
    this.freq[i] -= betafreq;
    this.bias[i] += (betafreq << gammashift);
  }

  this.freq[bestpos] += beta;
  this.bias[bestpos] -= betagamma;

  return bestbiaspos;
};

// Sorts network and builds netindex[0..255]
NeuQuant.prototype.inxbuild = function() {
  var i, j, p, q, smallpos, smallval, previouscol = 0, startpos = 0;
  for (i = 0; i < netsize; i++) {
    p = this.network[i];
    smallpos = i;
    smallval = p[1]; // index on g
    // find smallest in i..netsize-1
    for (j = i + 1; j < netsize; j++) {
      q = this.network[j];
      if (q[1] < smallval) { // index on g
        smallpos = j;
        smallval = q[1]; // index on g
      }
    }
    q = this.network[smallpos];
    // swap p (i) and q (smallpos) entries
    if (i != smallpos) {
      j = q[0];   q[0] = p[0];   p[0] = j;
      j = q[1];   q[1] = p[1];   p[1] = j;
      j = q[2];   q[2] = p[2];   p[2] = j;
      j = q[3];   q[3] = p[3];   p[3] = j;
    }
    // smallval entry is now in position i

    if (smallval != previouscol) {
      this.netindex[previouscol] = (startpos + i) >> 1;
      for (j = previouscol + 1; j < smallval; j++)
        this.netindex[j] = i;
      previouscol = smallval;
      startpos = i;
    }
  }
  this.netindex[previouscol] = (startpos + maxnetpos) >> 1;
  for (j = previouscol + 1; j < 256; j++)
    this.netindex[j] = maxnetpos; // really 256
};

// Main Learning Loop
NeuQuant.prototype.learn = function() {
  var i;

  var lengthcount = this.pixels.length;
  var alphadec = 30 + ((this.samplefac - 1) / 3);
  var samplepixels = lengthcount / (3 * this.samplefac);
  var delta = samplepixels / ncycles | 0;
  var alpha = initalpha;
  var radius = initradius;

  var rad = radius >> radiusbiasshift;

  if (rad <= 1) rad = 0;
  for (i = 0; i < rad; i++)
    this.radpower[i] = alpha * (((rad * rad - i * i) * radbias) / (rad * rad));

  var step;
  if (lengthcount < minpicturebytes) {
    this.samplefac = 1;
    step = 3;
  } else if ((lengthcount % prime1) !== 0) {
    step = 3 * prime1;
  } else if ((lengthcount % prime2) !== 0) {
    step = 3 * prime2;
  } else if ((lengthcount % prime3) !== 0)  {
    step = 3 * prime3;
  } else {
    step = 3 * prime4;
  }

  var b, g, r, j;
  var pix = 0; // current pixel

  i = 0;
  while (i < samplepixels) {
    b = (this.pixels[pix] & 0xff) << netbiasshift;
    g = (this.pixels[pix + 1] & 0xff) << netbiasshift;
    r = (this.pixels[pix + 2] & 0xff) << netbiasshift;

    j = this.contest(b, g, r);

    this.altersingle(alpha, j, b, g, r);
    if (rad !== 0) this.alterneigh(rad, j, b, g, r); // alter neighbours

    pix += step;
    if (pix >= lengthcount) pix -= lengthcount;

    i++;

    if (delta === 0) delta = 1;
    if (i % delta === 0) {
      alpha -= alpha / alphadec;
      radius -= radius / radiusdec;
      rad = radius >> radiusbiasshift;

      if (rad <= 1) rad = 0;
      for (j = 0; j < rad; j++)
        this.radpower[j] = alpha * (((rad * rad - j * j) * radbias) / (rad * rad));
    }
  }
};

/**
 * 1. initializes network
 * 2. trains it
 * 3. removes misconceptions
 * 4. builds colorindex
 */
NeuQuant.prototype.buildColorMap = function() {
  this.learn();
  this.unbiasnet();
  this.inxbuild();
  
  var map = new Buffer(netsize * 3);
  var index = new Buffer(netsize);

  for (var i = 0; i < netsize; i++)
    index[this.network[i][3]] = i;

  var k = 0;
  for (var l = 0; l < netsize; l++) {
    var j = index[l];
    map[k++] = this.network[j][0] & 0xff;
    map[k++] = this.network[j][1] & 0xff;
    map[k++] = this.network[j][2] & 0xff;
  }
  
  return map;
};

module.exports = NeuQuant;
