var nq = require('../');
var assert = require('assert');
var fs = require('fs');
var buf = fs.readFileSync(__dirname + '/trees.pixels');

describe('neuquant', function() {
  it('gets a palette', function() {
    var palette = nq.getPalette(buf);
    assert(Buffer.isBuffer(palette));
    assert.equal(palette.length, 256 * 3);
  });
  
  it('gets a palette at a custom quality setting', function() {
    var palette = nq.getPalette(buf, 5);
    assert(Buffer.isBuffer(palette));
    assert.equal(palette.length, 256 * 3);
    assert.notDeepEqual(palette, nq.getPalette(buf));
  });
  
  it('indexes pixels using the palette', function() {
    var palette = nq.getPalette(buf);
    var indexes = nq.index(buf, palette);
    assert(Buffer.isBuffer(indexes));
    assert.equal(indexes.length, buf.length / 3);
  });
  
  it('can produce palette and indexes in one call', function() {
    var res = nq.quantize(buf);
    assert(Buffer.isBuffer(res.palette));
    assert.equal(res.palette.length, 256 * 3);
    assert(Buffer.isBuffer(res.indexed));
    assert.equal(res.indexed.length, buf.length / 3);
  });
  
  it('can produce palette and indexes in one call using non-default quality', function() {
    var res = nq.quantize(buf, 5);
    assert(Buffer.isBuffer(res.palette));
    assert.equal(res.palette.length, 256 * 3);
    assert.notDeepEqual(res.palette, nq.getPalette(buf));
    assert(Buffer.isBuffer(res.indexed));
    assert.equal(res.indexed.length, buf.length / 3);
  });
  
  describe('stream', function() {
    it('quantizes output', function(done) {
      var s = new nq.Stream(400, 533);
      
      s.on('data', function(data) {
        assert(Buffer.isBuffer(s.palette));
        assert.equal(s.palette.length, 256 * 3);
        assert.equal(data.length, buf.length / 3);
        done();
      });
      
      s.end(buf);
    });
    
    it('handles multiple frames', function(done) {
      var s = new nq.Stream(400, 533);
      var c = 0;
      
      s.on('data', function(data) {
        assert(Buffer.isBuffer(s.palette));
        assert.equal(s.palette.length, 256 * 3);
        assert.equal(data.length, buf.length / 3);
        
        if (++c === 2)
          done();
      });
      
      s.write(buf);
      s.end(buf);
    });
  });
});
