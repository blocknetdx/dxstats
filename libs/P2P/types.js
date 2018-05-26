'use strict';
let struct = require('varstruct');
let varint = require('varuint-bitcoin');
let ip = require('ip');
let bufferEquals = require('buffer-equals');
const bufferReverse = require('buffer-reverse');

exports.buffer8 = struct.Buffer(8);
exports.buffer32 = struct.Buffer(32);
exports.varBuffer = struct.VarBuffer(varint);

exports.boolean = (function () {
	function encode(value, buffer, offset) {
		return struct.UInt8.encode(+!!value, buffer, offset);
	}

	function decode(buffer, offset, end) {
		return !!struct.UInt8.decode(buffer, offset, end);
	}

	encode.bytes = decode.bytes = 1;
	return {
		encode: encode, decode: decode, encodingLength: function () {
			return 1;
		}
	}
})();

exports.ipAddress = (function () {
	let IPV4_PREFIX = new Buffer('00000000000000000000ffff', 'hex');

	function encode(value, buffer, offset) {
		if (!buffer) buffer = new Buffer(16);
		if (!offset) offset = 0;
		if (offset + 16 > buffer.length) throw new RangeError('destination buffer is too small');

		if (ip.isV4Format(value)) {
			IPV4_PREFIX.copy(buffer, offset);
			ip.toBuffer(value, buffer, offset + 12);
		} else if (ip.isV6Format(value)) {
			ip.toBuffer(value, buffer, offset);
		} else {
			throw new Error('Invalid IP address value');
		}

		return buffer;
	}

	function decode(buffer, offset, end) {
		if (!offset) offset = 0;
		if (!end) end = buffer.length;
		if (offset + 16 > end) throw new RangeError('not enough data for decode5');

		let start = bufferEquals(buffer.slice(offset, offset + 12), IPV4_PREFIX) ? 12 : 0;
		return ip.toString(buffer.slice(offset + start, offset + 16))
	}

	encode.bytes = decode.bytes = 16;
	return {
		encode: encode, decode: decode, encodingLength: function () {
			return 16
		}
	}
})();

exports.peerAddress = struct([
	{name: 'services', type: exports.buffer8},
	{name: 'address', type: exports.ipAddress},
	{name: 'port', type: struct.UInt16BE}
]);

exports.inventoryVector = struct([
	{name: 'type', type: struct.UInt32LE},
	{name: 'hash', type: exports.buffer32}
]);

exports.alertPayload = struct([
	{name: 'version', type: struct.Int32LE},
	{name: 'relayUntil', type: struct.UInt64LE},
	{name: 'expiration', type: struct.UInt64LE},
	{name: 'id', type: struct.Int32LE},
	{name: 'cancel', type: struct.Int32LE},
	{name: 'cancelSet', type: struct.VarArray(varint, struct.Int32LE)},
	{name: 'minVer', type: struct.Int32LE},
	{name: 'maxVer', type: struct.Int32LE},
	{name: 'subVerSet', type: struct.VarArray(varint, struct.VarString(varint, 'ascii'))},
	{name: 'priority', type: struct.Int32LE},
	{name: 'comment', type: struct.VarString(varint, 'ascii')},
	{name: 'statusBar', type: struct.VarString(varint, 'ascii')},
	{name: 'reserved', type: struct.VarString(varint, 'ascii')}
]);

exports.messageCommand = (function () {
	let buffer12 = struct.Buffer(12);

	function encode(value, buffer, offset) {
		let bvalue = new Buffer(value, 'ascii');
		let nvalue = new Buffer(12);
		bvalue.copy(nvalue, 0);
		for (let i = bvalue.length; i < nvalue.length; ++i) nvalue[i] = 0
		return buffer12.encode(nvalue, buffer, offset)
	}

	function decode(buffer, offset, end) {
		let bvalue = buffer12.decode(buffer, offset, end);
		for (var stop = 0; bvalue[stop] !== 0; ++stop) ;
		for (let i = stop; i < bvalue.length; ++i) {
			if (bvalue[i] !== 0) throw new Error('Found a non-null byte after the first null byte in a null-padded string');
		}
		return bvalue.slice(0, stop).toString('ascii')
	}

	encode.bytes = decode.bytes = 12;
	return {
		encode: encode, decode: decode, encodingLength: function () {
			return 12
		}
	}
})();

exports.transaction = struct([
	{name: 'version', type: struct.Int32LE},
	{
		name: 'ins',
		type: struct.VarArray(varint, struct([
			{name: 'hash', type: exports.buffer32},
			{name: 'index', type: struct.UInt32LE},
			{name: 'script', type: exports.varBuffer},
			{name: 'sequence', type: struct.UInt32LE}
		]))
	},
	{
		name: 'outs',
		type: struct.VarArray(varint, struct([
			{name: 'valueBuffer', type: exports.buffer8},
			{name: 'script', type: exports.varBuffer}
		]))
	},
	{name: 'locktime', type: struct.UInt32LE}
]);

exports.standardHeader = struct([
	{name: 'version', type: struct.Int32LE},
	{name: 'prevHash', type: exports.buffer32},
	{name: 'merkleRoot', type: exports.buffer32},
	{name: 'timestamp', type: struct.UInt32LE},
	{name: 'bits', type: struct.UInt32LE},
	{name: 'nonce', type: struct.UInt32LE}
]);

exports.xbridgeHeader = struct([
	{name: 'version', type: struct.Buffer(4)},
	{name: 'commandSize', type: struct.Buffer(4)},
	{name: 'timestampSize', type: struct.Buffer(4)},
	{name: 'oldSizeField', type: struct.Buffer(4)},
	{name: 'sizeField', type: struct.Buffer(4)},
	{name: 'pubkeyField', type: struct.Buffer(33)},
	{name: 'signatureField', type: struct.Buffer(64)}
]);

/*exports.xbridgeHeader = struct([
	{name: 'version', type: struct.UInt32LE},
	{name: 'commandField', type: struct.UInt32LE},
	{name: 'timestamp', type: struct.UInt32LE},
	{name: 'size', type: struct.UInt32LE},
	{name: 'extSize', type: struct.UInt32LE},
	{name: 'crc', type: struct.UInt32LE},
	{name: 'reservedHeaderField1', type: struct.UInt32LE},
	{name: 'reservedHeaderField2', type: struct.UInt32LE}
]);*/

exports.xbridge = (function () {
	let xbuffer = exports.varBuffer;
	let gbuffer, gvalue;

	function encode(value, buffer, offset) {
		if (!buffer) {
			buffer = types.varBuffer;
			gbuffer = buffer;
		}
		if (!offset) offset = 0;
		console.log('Xbridge encoding buffer length = ' + buffer.length);
		//xbuffer = buffer.length;
		gbuffer = xbuffer.encode(value, buffer, offset);
		encode.bytes = decode.bytes = gbuffer.length;
		return gbuffer;
	}

	function decode(buffer, offset, end) {
		if (!offset) offset = 0;
		if (!end) end = buffer.length;
		//let headerBuffer = exports.xbridgeHeader;
		let headerLength = exports.xbridgeHeader.encodingLength({
			version: 0,
			commandSize: 7,
			timestampSize: 4,
			oldSizeField: 0,
			sizeField: 0,
			pubkeyField: new Buffer('040000000000000000000000000000000000000000000000000000000000000000', 'hex'),
			signatureField: new Buffer('00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', 'hex')
		});
		//let headerValue = headerBuffer.decode(buffer, offset, headerLength);

		xbuffer = struct.Buffer(buffer.length);
		console.log('Xbridge header length = ' + headerLength);
		console.log('Xbridge header = ' + Buffer.from(bufferReverse(buffer.slice(0, headerLength))).toString('hex'));
		console.log('Xbridge offset = ' + offset);
		console.log('Xbridge length = ' + buffer.length);
		gvalue = xbuffer.decode(buffer, offset, end);
		encode.bytes = decode.bytes = gvalue.length;
		return gvalue;
	}

	encode.bytes = decode.bytes = -1;

	return {
		encode: encode, decode: decode, encodingLength: function () {
			if (gbuffer) return gbuffer.length; else return gvalue.length;
		}
	}
})();
