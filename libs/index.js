const dns = require('dns');
const net = require('net');
const coinParams = require('../config/coins.js');
const network = require('./P2P');

"use strict";

class Coin {
	constructor (network) {
		this.network = network
	}

	init() {
		console.log("test")
		console.log("init: " + this.network.name + " api")
		this.lastBlock()
	}

	lastBlock() {
		var self = this;

		self.connectAndBroadcastLastBlock();
		setInterval(function() {
			self.connectAndBroadcastLastBlock();
		}, 10000);
	}

	async connectAndBroadcastLastBlock() {
		const s = this.createConnectionToPeer(null),
		socket = s[0],
		recv = s[1],
		self = this;

		recv.on('data', function (data) {
			if (data !== undefined && data.command === 'version' && data.magic !== undefined) {
				console.log(data)
				console.log('blockheight:' + data.magic.toString(), data.payload.startHeight);
				socket.end();		
			}
		});

		socket.on('error', function (err) {
		    console.log(err);
		});

		socket.on('uncaughtException', function (err) {
		    console.log(err);
		}); 
	}

	// writedata for future use
	createConnectionToPeer(writeData) {
		const self = this,
		recv = network.createDecodeStream(),
		send = network.createEncodeStream(),

		socket = net.connect(self.network.defaultPort, self.network.dnsSeeds[0], function () {
		  	socket.pipe(recv)
		  	send.pipe(socket)
		  	//send.write(self.versionPayload());
		  	send.write(self.getBlocksPayload())
		
		  	if (writeData !== null && writeData !== undefined) {
		  		send.write(writeData);
		  	}
		})

		return [ socket, recv, send ]
	}

	getBlocksPayload() {
		return {
		    magic: this.network.magic,
		    command: 'getblocks',
		    payload: {
				version: this.network.protocolVersion,
				locator: [
					new Buffer(32)
				],
				hashStop: new Buffer(32)
		    }
	  	}
	}

	versionPayload() {
		return {
		    magic: this.network.magic,
		    command: 'version',
		    payload: {
		      version: this.network.protocolVersion,
		      services: Buffer(8).fill(0),
		      timestamp: Math.round(Date.now() / 1000),
		      receiverAddress: {
		        services: Buffer('0100000000000000', 'hex'),
		        address: '0.0.0.0'
		      },
		      senderAddress: {
		        services: (new Buffer(8)).fill(0),
		        address: '0.0.0.0'
		      },
		      nonce: Buffer(8).fill(123),
		      userAgent: 'Node P2P',
		      startHeight: 0
		    }
	  	}
	}
}


coinParams.forEach(function(coinParam) {
	if (coinParam.useCoin) {
		new Coin(coinParam).init(io);
	}
});

module.exports = Coin;