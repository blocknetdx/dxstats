const struct = require('varstruct');
const varint = require('varuint-bitcoin');
const SmartBuffer = require('smart-buffer').SmartBuffer;
const pythonstruct = require('python-struct');
const ip = require('ip');
const bufferEquals = require('buffer-equals');
const settings = require('electron-settings');
const crypto = require('crypto');
//const bufferReverse = require('buffer-reverse');

const packetHashes = [];

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
  };
})();

exports.ipAddress = (function () {
  const IPV4_PREFIX = new Buffer('00000000000000000000ffff', 'hex');

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

    const start = bufferEquals(buffer.slice(offset, offset + 12), IPV4_PREFIX) ? 12 : 0;
    return ip.toString(buffer.slice(offset + start, offset + 16));
  }

  encode.bytes = decode.bytes = 16;
  return {
    encode: encode, decode: decode, encodingLength: function () {
      return 16;
    }
  };
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
  const buffer12 = struct.Buffer(12);

  function encode(value, buffer, offset) {
    const bvalue = new Buffer(value, 'ascii');
    const nvalue = new Buffer(12);
    bvalue.copy(nvalue, 0);
    for (let i = bvalue.length; i < nvalue.length; ++i) nvalue[i] = 0;
    return buffer12.encode(nvalue, buffer, offset);
  }

  function decode(buffer, offset, end) {
    const bvalue = buffer12.decode(buffer, offset, end);
    for (var stop = 0; bvalue[stop] !== 0; ++stop) ;
    for (let i = stop; i < bvalue.length; ++i) {
      if (bvalue[i] !== 0) throw new Error('Found a non-null byte after the first null byte in a null-padded string');
    }
    return bvalue.slice(0, stop).toString('ascii');
  }

  encode.bytes = decode.bytes = 12;
  return {
    encode: encode, decode: decode, encodingLength: function () {
      return 12;
    }
  };
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

exports.txOutput = struct([
  {name: 'outputCount', type: struct.UInt32LE},
  {
    name: 'outputs', type: struct.VarArray(varint, struct([
      {name: 'txid', type: struct.Buffer(32)},
      {name: 'outId', type: struct.UInt32LE}
    ]))
  }
]);

function read33BytePubkey(reader) {
  const integers = pythonstruct.unpack('<8I', reader.readBuffer(32));

  let string = '';
  for (const i in integers) {
    let tempstring = integers[7 - i].toString(16);
    while (tempstring.length < 8)
      tempstring = '0' + tempstring;
    string += tempstring;
  }

  let byte = parseInt(pythonstruct.unpack('B', reader.readBuffer(1))).toString(16);
  if (byte.length < 2)
    byte = '0' + byte;

  string += byte;

  return string;
}

function readUInt256LE(reader) {
  const integers = pythonstruct.unpack('<8I', reader.readBuffer(32));

  let string = '';
  for (const i in integers) {
    let tempstring = integers[7 - i].toString(16);
    while (tempstring.length < 8)
      tempstring = '0' + tempstring;
    string += tempstring;
  }

  return string;
}

function readUInt160LE(reader) {
  const integers = pythonstruct.unpack('<5I', reader.readBuffer(20));

  let string = '';
  for (const i in integers) {
    let tempstring = integers[4 - i].toString(16);
    while (tempstring.length < 8)
      tempstring = '0' + tempstring;
    string += tempstring;
  }

  return string;
}

function removeAllOccurrences(arr, txid) {
  let newArr = arr;

  for (let i = 0; i < arr.length; i++) {
    if (arr[i].txid === txid)
      newArr = arr.splice(i, 1);
  }

  return newArr;
}

exports.xbridge = (function () {

  encode.bytes = decode.bytes = 0;

  function encode(value, buffer, offset) {
    if (!buffer) {
      return null;
    }
    if (!offset) offset = 0;
    encode.bytes = decode.bytes = buffer.length;
    console.log('Xbridge encoding buffer length = ' + buffer.length);
    const xbuffer = buffer.length;
    return xbuffer.encode(value, buffer, offset);
  }

  function decode(buffer, offset, end) {
    if (!offset) offset = 31;
    if (!end) end = buffer.length;
    encode.bytes = decode.bytes = end;

    const reader = SmartBuffer.fromBuffer(buffer);
    reader.readOffset = offset;
    const xBridgeHeader = {
      version: reader.readUInt32LE(),
      command: reader.readUInt32LE(),
      timestamp: reader.readUInt32LE(),
      size: reader.readUInt32LE(),
      extSize: reader.readUInt32LE(),
      crc: reader.readUInt32LE(),
      reservedHeaderField1: reader.readUInt32LE(),
      reservedHeaderField2: reader.readUInt32LE()
    };

    console.log('Packet = ' + buffer.toString('hex'));
    console.log('Xbridge version = ' + xBridgeHeader.version);
    console.log('Xbridge command (in header) = ' + xBridgeHeader.command);

    let xbuffer;
    let add = true;

    reader.readOffset += 97; //filler (97 B) + header (32 B) = 129 bytes

    if (xBridgeHeader.command === 1) { //xbcAnnounceAddresses
      xbuffer = {
        header: xBridgeHeader,
        hubAddr: readUInt160LE(reader)
      };
    } else if (xBridgeHeader.command === 2) { //xbcXChatMessage
      xbuffer = {
        header: xBridgeHeader,
        clientAddr: readUInt160LE(reader),
        message: pythonstruct.unpack('s', reader.readString())
      };
    } else if (xBridgeHeader.command === 3) { //xbcTransaction
      xbuffer = {
        header: xBridgeHeader,
        txid: readUInt256LE(reader),
        sourceAddr: readUInt160LE(reader),
        sourceCurrency: pythonstruct.unpack('8s', reader.readString(8))[0].replace(/\0/g, ''),
        sourceAmt: pythonstruct.unpack('<Q', reader.readBuffer(8))[0].toNumber(),
        destAddr: readUInt160LE(reader),
        destCurrency: pythonstruct.unpack('8s', reader.readString(8))[0].replace(/\0/g, ''),
        destAmt: pythonstruct.unpack('<Q', reader.readBuffer(8))[0].toNumber(),
        timestamp: pythonstruct.unpack('<Q', reader.readBuffer(8))[0].toNumber(),
        outputs: []
      };

      let i = 0;

      console.log('pos = ' + reader.readOffset);

      while (xbuffer.header.extSize > reader.readOffset) {
        if (xbuffer.header.extSize - reader.readOffset < 4)
          break;

        xbuffer.outputs.push({
          outputCount: reader.readUInt32LE(),
          output: []
        });

        console.log('output count for output ' + i + ': ' + xbuffer.outputs[i].outputCount);

        for (let j = 0; j < xbuffer.outputs[i].outputCount; j++) {
          if (xbuffer.header.extSize - reader.readOffset < 36)
            break;

          xbuffer.outputs[i].output.push({
            outputTxid: readUInt256LE(reader),
            outId: reader.readUInt32LE()
          });
        }

        i++;
      }

      console.log(xbuffer);
    } else if (xBridgeHeader.command === 4) { //xbcPendingTransaction

      xbuffer = {
        header: xBridgeHeader,
        txid: readUInt256LE(reader),
        sourceCurrency: pythonstruct.unpack('8s', reader.readString(8))[0].replace(/\0/g, ''),
        sourceAmt: pythonstruct.unpack('<Q', reader.readBuffer(8))[0].toNumber(),
        destCurrency: pythonstruct.unpack('8s', reader.readString(8))[0].replace(/\0/g, ''),
        destAmt: pythonstruct.unpack('<Q', reader.readBuffer(8))[0].toNumber(),
        hubAddr: readUInt160LE(reader),
        timestamp: pythonstruct.unpack('<q', reader.readBuffer(8))[0].toNumber()
        //blockHash: readUInt256LE(reader)
      };

      //console.log(xbuffer);
      //console.log("PASSED");
    } else if (xBridgeHeader.command === 5) { //xbcTransactionAccepting

      xbuffer = {
        header: xBridgeHeader,
        hubAddr: readUInt160LE(reader),
        clientTxid: readUInt256LE(reader),
        sourceAddr: readUInt160LE(reader),
        sourceCurrency: pythonstruct.unpack('8s', reader.readString(8))[0].replace(/\0/g, ''),
        sourceAmt: pythonstruct.unpack('<Q', reader.readBuffer(8))[0],
        destAddr: readUInt160LE(reader),
        destCurrency: pythonstruct.unpack('8s', reader.readString(8))[0].replace(/\0/g, ''),
        destAmt: pythonstruct.unpack('<Q', reader.readBuffer(8))[0],
        txids: []
      };

      let i = 0;

      while (xbuffer.header.extSize > reader.readOffset) {
        if (xbuffer.header.extSize - reader.readOffset < 4)
          break;

        xbuffer.txids.push({
          outputCount: reader.readUInt32LE(),
          output: []
        });

        for (let j = 0; j < xbuffer.txids[i].outputCount; j++) {
          if (xbuffer.header.extSize - reader.readOffset < 36)
            break;

          xbuffer.txids[i].output.push({
            outputTxid: readUInt256LE(reader),
            outId: reader.readUInt32LE()
          });
        }

        i++;
      }

    } else if (xBridgeHeader.command === 6) { //xbcTransactionHold
      xbuffer = {
        header: xBridgeHeader,
        hubAddr: readUInt160LE(reader),
        txid: readUInt256LE(reader)
      };
    } else if (xBridgeHeader.command === 7) { //xbcTransactionHoldApply
      xbuffer = {
        header: xBridgeHeader,
        hubAddr: readUInt160LE(reader),
        clientAddr: readUInt160LE(reader),
        txid: readUInt256LE(reader)
      };
    } else if (xBridgeHeader.command === 8) { //xbcTransactionInit
      xbuffer = {
        header: xBridgeHeader,
        clientAddr: readUInt160LE(reader),
        hubAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader),
        role: reader.readUInt16LE(),
        sourceAddr: readUInt160LE(reader),
        sourceCurrency: pythonstruct.unpack('8s', reader.readString(8))[0].replace(/\0/g, ''),
        sourceAmt: pythonstruct.unpack('<Q', reader.readBuffer(8))[0],
        destAddr: readUInt160LE(reader),
        destCurrency: pythonstruct.unpack('8s', reader.readString(8))[0].replace(/\0/g, '')
      };
    } else if (xBridgeHeader.command === 9) { //xbcTransactionInitialized
      xbuffer = {
        header: xBridgeHeader,
        hubAddr: readUInt160LE(reader),
        clientAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader),
        dataTxid: readUInt256LE(reader)
      };
    } else if (xBridgeHeader.command === 10) { //xbcTransactionCreateA
      xbuffer = {
        header: xBridgeHeader,
        clientAddr: readUInt160LE(reader),
        hubAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader),
        sourceAddr: readUInt160LE(reader),
        dataTxid: readUInt256LE(reader),
        opponentPubkey: read33BytePubkey(reader)
      };
    } else if (xBridgeHeader.command === 11) { //xbcTransactionCreatedA
      xbuffer = {
        header: xBridgeHeader,
        hubAddr: readUInt160LE(reader),
        clientAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader),
        depositTxid: pythonstruct.unpack('32s', reader.readStringNT())[0]
      };
    } else if (xBridgeHeader.command === 12) { //xbcTransactionCreateB
      xbuffer = {
        header: xBridgeHeader,
        clientAddr: readUInt160LE(reader),
        hubAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader)
        //destAddr: pythonstruct.unpack('s', reader.readStringNT())[0],
        //hubWalletAddr: pythonstruct.unpack('s', reader.readStringNT())[0],
        //fee: reader.readUInt32LE(),
        //dataTxid: readUInt256LE(reader),
        //opponentPubkey: read33BytePubkey(reader),
        //depositTxid: pythonstruct.unpack('32s', reader.readStringNT())[0]
      };
    } else if (xBridgeHeader.command === 13) { //xbcTransactionCreatedB
      xbuffer = {
        header: xBridgeHeader,
        hubAddr: readUInt160LE(reader),
        clientAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader),
        depositTxid: pythonstruct.unpack('32s', reader.readStringNT())[0]
      };
    } else if (xBridgeHeader.command === 18) { //xbcTransactionConfirmA
      xbuffer = {
        header: xBridgeHeader,
        clientAddr: readUInt160LE(reader),
        hubAddr: readUInt160LE(reader),
        depositTxid: pythonstruct.unpack('32s', reader.readStringNT())[0]
      };
    } else if (xBridgeHeader.command === 19) { //xbcTransactionConfirmedA
      xbuffer = {
        header: xBridgeHeader,
        hubAddr: readUInt160LE(reader),
        clientAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader),
        pubkey: read33BytePubkey(reader)
      };
    } else if (xBridgeHeader.command === 20) { //xbcTransactionConfirmB
      xbuffer = {
        header: xBridgeHeader,
        clientAddr: readUInt160LE(reader),
        hubAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader),
        pubkey: read33BytePubkey(reader),
        depositTxid: pythonstruct.unpack('32s', reader.readStringNT())[0]
      };
    } else if (xBridgeHeader.command === 21) { //xbcTransactionConfirmedB
      xbuffer = {
        header: xBridgeHeader,
        hubAddr: readUInt160LE(reader),
        clientAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader)
      };
    } else if (xBridgeHeader.command === 22) { //xbcTransactionCancel
      xbuffer = {
        header: xBridgeHeader,
        hubTxid: readUInt256LE(reader),
        reason: reader.readUInt32LE()
      };
      if (settings.get('cancelledOrders') === undefined)
        settings.set('cancelledOrders', []);
      settings.set('cancelledOrders', [...settings.get('cancelledOrders'), xbuffer]);
      add = false;
    } else if (xBridgeHeader.command === 24) { //xbcTransactionFinished
      xbuffer = {
        header: xBridgeHeader,
        clientAddr: readUInt160LE(reader),
        hubTxid: readUInt256LE(reader)
      };
      if (settings.get('finishedOrders') === undefined)
        settings.set('finishedOrders', []);
      settings.set('finishedOrders', [...settings.get('finishedOrders'), xbuffer]);
      add = false;
    } else {
      console.log('Unrecognized command: ' + xBridgeHeader.command);
      console.log('Attempting to locate beginning of header.');

      let o = buffer.toString('hex').indexOf('250000ff') / 2;
      if (o === -1) {
        console.log('Could not find beginning of header.');
      } else {
        console.log('Found beginning of header! Offset = ' + o);
        return decode(buffer, o, end);
      }

      return null;
    }

    if (settings.get('packets') === undefined) {
      settings.set('packets', []);
    }

    const sha256 = crypto.createHash('sha256');
    sha256.update(JSON.stringify(xbuffer));
    const hashedPacket = sha256.digest('hex');
    console.log('hash = ' + hashedPacket);

    if (packetHashes.includes(hashedPacket)) {
      console.log('packet is in hash list, ignoring packet');
      return null;
    } else {
      console.log('added packet to packet hashes');
      packetHashes.push(hashedPacket);
    }

    return xbuffer;
  }

  return {
    encode: encode, decode: decode, encodingLength: function () {
      return encode.bytes;
    }
  };
})();
