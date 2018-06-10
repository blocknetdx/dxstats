import React, {Component} from 'react';
import styles from './component.less';
import {resetUID} from '../inputs';
import config from 'electron-json-config';

const settings = require('electron-settings');

const Blocknet_xBridge = () => {
    return (
        <div>
	        <h1>Active Transactions</h1>
            <Blocknet />
        </div>
    );
};

const Blocknet_mapStateToProps = (state) => { return {
    ...state.Blocknet
} };
const Blocknet_mapDispatchToProps = (dispatch) => { return {
    saveSettings: (s) => {
        config.set('Blocknet.packets', s.packets);
        config.set('Blocknet.selectBox', s.selectBox);
    }
} };

class Blocknet extends Component {
    constructor(props) {
        super(props);
        this.state = {
	        firstTime: true,
	        textInput: props.textInput,
	        selectBox: props.selectBox,
	        packets: []
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
		for (let i = 0; i < this.state.packets.length; i++) {
			if (txid === JSON.parse(this.state.packets[i]).txid) {
				return true;
			}
		}

		return false;
	};

    Stream = () => {
	    console.log('Stream called');

        if (this.state.firstTime) {
            let packet = settings.get('xPacket');
            this.setState({
	            packets: packet === undefined ? [] : [JSON.stringify(packet.payload.xbridgePacket)],
                firstTime: false
            });
            this.forceUpdate();
	        console.log(packet === undefined ? 'no packets first time' : packet.payload.xbridgePacket);
        }

        settings.watch('xPacket', (newPacket, oldPacket) => {
	        console.log('packet txid = ' + newPacket.payload.xbridgePacket.txid);
	        const exists = this.packetExists(newPacket.payload.xbridgePacket.txid);
	        console.log('packet exists = ' + exists);
	        if (!exists) {
                this.setState({
                    packets: [...this.state.packets, JSON.stringify(newPacket.payload.xbridgePacket)]
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
        console.log("Testing");
        let packetSize = this.state.packets.length;
        console.log(this.state.packets);

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
                            { packetSize > 0 ? (
                                this.state.packets.map(item => (
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

export default Blocknet_xBridge;