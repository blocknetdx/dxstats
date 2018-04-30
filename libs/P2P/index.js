var stream = require('./stream')

module.exports = {
  createDecodeStream: stream.createDecodeStream,
  decode: stream.createDecodeStream,
  createEncodeStream: stream.createEncodeStream,
  encode: stream.createEncodeStream,
  types: require('./types'),
  messages: require('./structs'),
  constants: require('./constants'),

  struct: require('varstruct'),
  varint: require('varuint-bitcoin')
}