var nq = require('../');
var PixelStream = require('pixel-stream');
var util = require('util');

function NeuQuantStream(width, height, opts) {
  PixelStream.apply(this, arguments);
  this._buffers = null;
}

util.inherits(NeuQuantStream, PixelStream);

NeuQuantStream.prototype._start = function(done) {
  if (this.format.colorSpace !== 'rgb')
    throw new Error('QuantStream only accepts rgb input, got ' + this.format.colorSpace);
    
  this.format.colorSpace = 'indexed';
  done();
};

NeuQuantStream.prototype._startFrame = function(frame, done) {
  this._buffers = [];
  this.format.palette = frame.palette = new Buffer(256 * 3);
  done();
};

NeuQuantStream.prototype._writePixels = function(chunk, done) {
  this._buffers.push(chunk);
  done();
};

NeuQuantStream.prototype._endFrame = function(done) {
  var data = Buffer.concat(this._buffers);
  var res = nq.quantize(data, this.format.quality || 10);
  
  res.palette.copy(this.format.palette);
  this.push(res.indexed);
  
  done();
};

module.exports = NeuQuantStream;
