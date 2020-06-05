const assert = require('assert');
const expect = require('chai').expect;
const should = require('chai').should();

describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      expect([1,2,3].indexOf(4)).to.be.equal(1);
    });
  });
});
