var nq = require('../');
var PixelStream = require('pixel-stream');
var util = require('util');

function NeuQuantStream(width, height, opts) {
  PixelStream.apply(this, arguments);
  
  this.quality = (opts && opts.quality) || 10;
  this._buffers = null;
  this.palette = null;
  this.colorSpace = 'indexed';
  
  this.on('format', function() {
    if (this.colorSpace !== 'rgb')
      throw new Error('QuantStream only accepts rgb input, got ' + this.colorSpace);
      
    this.colorSpace = 'indexed';
  });
}

util.inherits(NeuQuantStream, PixelStream);

NeuQuantStream.prototype._startFrame = function(frame, done) {
  this._buffers = [];
  this.palette = frame.palette = new Buffer(256 * 3);
  done();
};

NeuQuantStream.prototype._writePixels = function(chunk, done) {
  this._buffers.push(chunk);
  done();
};

NeuQuantStream.prototype._endFrame = function(done) {
  var data = Buffer.concat(this._buffers);
  var res = nq.quantize(data, this.quality);
  
  res.palette.copy(this.palette);
  this.push(res.indexed);
  
  done();
};

module.exports = NeuQuantStream;
