import React, {Component} from 'react';
import styles from './component.less';
import {resetUID} from '../inputs';
import config from 'electron-json-config';

const settings = require('electron-settings');

const CancelledTX_xBridge_Cancelled = () => {
	return (
		<div>
			<h1>Cancelled Transactions</h1>
			<CancelledTX/>
		</div>
	);
};

const CancelledTX_mapStateToProps = (state) => {
	return {
		...state.CancelledTX
	}
};
const CancelledTX_mapDispatchToProps = (dispatch) => {
	return {
		saveSettings: (s) => {
			config.set('CancelledTX.cancelledPackets', s.cancelledPackets);
			config.set('CancelledTX.selectBox', s.selectBox);
		}
	}
};

class CancelledTX extends Component {
	constructor(props) {
		super(props);
		this.state = {
			firstTime: true,
			textInput: props.textInput,
			selectBox: props.selectBox,
			cancelledPackets: []
		};
		//this.originalState = this.state;
		resetUID();
	}

	componentDidMount = () => {
		this.Stream();
	};

	save = () => {
		this.forceUpdate();
	};

	packetExists = (txid) => {
		for (let i = 0; i < this.state.cancelledPackets.length; i++) {
			if (txid === JSON.parse(this.state.cancelledPackets[i]).txid) {
				return true;
			}
		}

		return false;
	};

	Stream = () => {
		console.log('Stream called');

		if (this.state.firstTime) {
			let packet = settings.get('cancelledOrders');
			this.setState({
				cancelledPackets: packet === undefined ? [] : [JSON.stringify(packet.payload.xbridgePacket)],
				firstTime: false
			});
			this.forceUpdate();
			console.log(packet === undefined ? 'no packets first time' : packet.payload.xbridgePacket);
		}

		settings.watch('cancelledOrders', (newPacket, oldPacket) => {
			console.log('packet txid = ' + newPacket.payload.xbridgePacket.txid);
			const exists = this.packetExists(newPacket.payload.xbridgePacket.txid);
			console.log('packet exists = ' + exists);
			if (!exists) {
				this.setState({
					cancelledPackets: [...this.state.cancelledPackets, JSON.stringify(newPacket.payload.xbridgePacket)]
				});
			}

			this.forceUpdate();
			this.Stream();
		})
	};

	fullTd = (e) => {
		return (
			<tr key={e.txid}>
				<td key={e.txid + '-timestamp'}>{JSON.parse(e).timestamp}</td>
				<td key={e.txid + '-sourceCurrency'}>{JSON.parse(e).sourceCurrency}</td>
				<td key={e.txid + '-destCurrency'}>{JSON.parse(e).destCurrency}</td>
				<td key={e.txid + '-sourceAmt'}>{JSON.parse(e).sourceAmt / 1000000}</td>
				<td key={e.txid + '-destAmt'}>{JSON.parse(e).destAmt / 1000000}</td>
				<td key={e.txid + '-txid'}>{JSON.parse(e).txid}</td>
			</tr>
		);
	};

	render() {
		console.log('Testing CancelledTX');
		let packetSize = this.state.cancelledPackets.length;
		console.log(this.state.cancelledPackets);

		return (
			<div className='padded'>
				<div className={`box padded ${styles.box}`}>
					<table>
						<thead>
						<tr>
							<th>Timestamp</th>
							<th>Source Currency</th>
							<th>Destination Currency</th>
							<th>Source Amount</th>
							<th>Destination Amount</th>
							<th>TXID</th>
						</tr>
						</thead>
						<tbody>
						{packetSize > 0 ? (
							this.state.cancelledPackets.map(item => (
								this.fullTd(item)
							))) : null
						}
						</tbody>
					</table>
				</div>
				<button className="btn btn-primary pull-right" onClick={this.save}>Save</button>
			</div>
		)
	}
}

export default CancelledTX_xBridge_Cancelled;