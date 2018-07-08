let struct = require('varstruct');
let varint = require('varuint-bitcoin');
let defaultTypes = require('./types.js');

function createMessages(messages) {
	function extend(child) {
		let output = {};
		for (var k in messages) output[k] = messages[k]
		for (k in child) output[k] = child[k]
		return createMessages(output)
	}

	for (let k in messages) {
		extend[k] = messages[k];
	}
	return extend
}

function createStructs(overrideTypes) {
	let types = {};
	for (var k in defaultTypes) types[k] = defaultTypes[k]
	for (k in overrideTypes) types[k] = overrideTypes[k]

	// TODO: add segwit
	let reject = (function () {
		var baseStruct = struct([
			{name: 'message', type: struct.VarString(varint, 'ascii')},
			{name: 'ccode', type: struct.UInt8},
			{name: 'reason', type: struct.VarString(varint, 'ascii')}
		]);

		function encode(value, buffer, offset) {
			if (!buffer) buffer = new Buffer(encodingLength(value));
			if (!offset) offset = 0;
			baseStruct.encode(value, buffer, offset);
			encode.bytes = baseStruct.encode.bytes;
			if (Buffer.isBuffer(value.data)) {
				if (offset + encode.bytes + value.data.length > buffer.length) {
					throw new RangeError('destination buffer is too small')
				}
				value.data.copy(buffer, offset + encode.bytes);
				encode.bytes += value.data.length
			}
			return buffer
		}

		function decode(buffer, offset, end) {
			if (!offset) offset = 0;
			if (!end) end = buffer.length;
			let value = baseStruct.decode(buffer, offset, end);
			decode.bytes = baseStruct.decode.bytes;
			if (decode.bytes === end) {
				value.data = new Buffer(0)
			} else {
				value.data = buffer.slice(decode.bytes, end);
				decode.bytes = end
			}
			return value
		}

		function encodingLength(value) {
			let dataLength = Buffer.isBuffer(value.data) ? value.data.length : 0;
			return baseStruct.encodingLength(value) + dataLength
		}

		return {encode: encode, decode: decode, encodingLength: encodingLength}
	})();

	// https://bitcoin.org/en/developer-reference#p2p-network
	// TODO: move to own files
	return createMessages({
		// Data Messages
		block: struct([
			{name: 'header', type: types.standardHeader},
			{name: 'transactions', type: struct.VarArray(varint, types.transaction)}
		]),
		getblocks: struct([
			{name: 'version', type: struct.UInt32BE},
			{name: 'locator', type: struct.VarArray(varint, types.buffer32)},
			{name: 'hashStop', type: types.buffer32}
		]),
		getdata: struct.VarArray(varint, types.inventoryVector),
		getheaders: struct([
			{name: 'version', type: struct.UInt32BE},
			{name: 'locator', type: struct.VarArray(varint, types.buffer32)},
			{name: 'hashStop', type: types.buffer32}
		]),
		headers: struct.VarArray(varint, struct([
			{name: 'header', type: types.standardHeader},
			{name: 'numTransactions', type: varint}
		])),
		inv: struct.VarArray(varint, types.inventoryVector),
		mempool: struct([]),
		merkleblock: struct([
			{name: 'header', type: types.standardHeader},
			{name: 'numTransactions', type: struct.UInt32LE},
			{name: 'hashes', type: struct.VarArray(varint, types.buffer32)},
			{name: 'flags', type: types.varBuffer}
		]),
		notfound: struct.VarArray(varint, types.inventoryVector),
		tx: types.transaction,

		// Control Messages
		addr: struct.VarArray(varint, struct([
			{name: 'time', type: struct.UInt32LE},
			{name: 'services', type: types.buffer8},
			{name: 'address', type: types.ipAddress},
			{name: 'port', type: struct.UInt16BE}
		])),
		alert: struct([
			{name: 'payload', type: types.varBuffer}, // TODO: parse automatically?
			{name: 'signature', type: types.varBuffer}
		]),
		filteradd: struct([
			{name: 'data', type: types.varBuffer}
		]),
		filterload: struct([
			{name: 'data', type: struct.VarArray(varint, struct.UInt8)},
			{name: 'nHashFuncs', type: struct.UInt32LE},
			{name: 'nTweak', type: struct.UInt32LE},
			{name: 'nFlags', type: struct.UInt8}
		]),
		filterclear: struct([]),
		getaddr: struct([]),
		ping: struct([{name: 'nonce', type: types.buffer8}]),
		pong: struct([{name: 'nonce', type: types.buffer8}]),
		reject: reject,
		sendheaders: struct([]),
		verack: struct([]),
		version: struct([
			{name: 'version', type: struct.UInt32LE},
			{name: 'services', type: types.buffer8},
			{name: 'timestamp', type: struct.UInt64LE},
			{name: 'receiverAddress', type: types.peerAddress},
			{name: 'senderAddress', type: types.peerAddress},
			{name: 'nonce', type: types.buffer8},
			{name: 'userAgent', type: struct.VarString(varint, 'ascii')},
			{name: 'startHeight', type: struct.Int32LE},
			{name: 'relay', type: types.boolean}
		]), /*,
		xbcPendingTransaction: struct([
		  { name: 'hashSize' },
		  { name: 'fc' },
		  { name: 'tra' },
		  { name: 'sc' },
		  { name: 'trb' },
		  { name: 'm_myid' },
		  { name: 'createdTime' },
		  { name: 'blockHash' },
		  { name: 'sign' }
		])*/
		processGetBlockCount: struct([
			{name: 'uuid', type: struct.VarString(varint, 'ascii')},
			{name: 'currency', type: struct.VarString(varint, 'ascii')}
		]),
		/*xbridge: struct([
			{name: 'header', type: types.xbridgeHeader},
			{name: 'hubAddr', type: struct.Buffer(20)},
			{name: 'id', type: struct.Buffer(32)},
			{name: 'sourceAddr', type: struct.Buffer(20)},
			{name: 'sourceCurrency', type: struct.Buffer(8)},
			{name: 'sourceAmt', type: struct.Buffer(8)},
			{name: 'destAddr', type: struct.Buffer(20)},
			{name: 'destCurrency', type: struct.Buffer(8)},
			{name: 'destAmt', type: struct.Buffer(8)},
			{name: 'outputAmt', type: struct.Buffer(8)},
            {name: 'txids', type: struct.VarArray(varint, struct([
            	{name: 'txids', type: struct.VarArray(varint, struct([
					{name: 'txid', type: struct.Buffer(32)},
					{name: 'outId', type: struct.UInt32LE}
				]))}
			]))}
		]),*/
		xbridge: struct([
			{name: 'xbridgePacket', type: types.xbridge}
		]),
		//begin masternode commands
		mnget: struct([
			{name: 'mnCount', type: struct.Int32LE}
		]),
		mnp: struct([
			{name: 'vin', type: struct.Buffer(41)},
			{name: 'blockHash', type: struct.Buffer(32)},
			{name: 'sigTime', type: struct.Int64LE},
			{name: 'vchSig', type: types.varBuffer}
		]),
		ssc: struct([
			{name: 'itemId', type: struct.Int32LE},
			{name: 'count', type: struct.Int32LE}
		]),
    getsporks: struct([
      {name: 'nSporkID', type: struct.UInt32LE},
      {name: 'nValue', type: struct.Int64LE},
      {name: 'nTimeSigned', type: struct.Int64LE},
      {name: 'vchSig', type: types.varBuffer}
    ])
	});
}

exports.defaultMessages = createStructs(defaultTypes);
exports.createMessages = createMessages;
exports.createStructs = createStructs;
