import React from 'react';
import {Provider} from 'react-redux';
import {Route, Switch} from 'react-router-dom';
import {ConnectedRouter} from 'connected-react-router';

import {components, history, store} from '../components.js';
import styles from './component.less';
import {ipcRenderer} from 'electron';

ipcRenderer.send('connect', 'ping');

const Core = () => {
	return (
		<Provider store={store}>
			<ConnectedRouter history={history}>
				<div className="window">
					<div className="window-content">
						<div className="pane-group">
							<div className="pane-sm sidebar">
								<components.Menu/>
							</div>
							<div className="pane padded"><AppRouter/></div>
						</div>
					</div>
					<components.Footer/>
				</div>
			</ConnectedRouter>
		</Provider>
	);
};

const AppRouter = () => {
	return (
		<Switch>
			<Route exact path="/" component={Home}/>
			<Route exact path="/blocknet" component={components.Blocknet}/>
			<Route exact path="/blocknet/cancelled" component={components.CancelledTX}/>
		</Switch>
	);
};

const Home = () => {
	return (
		<div>
			<h1>BlocknetDX Explorer</h1>
			<p>https://github.com/blocknetdx/dxstats</p>
			<div className='padded'>
				<div className={`box padded ${styles.box}`}>
					<a href="https://github.com/blocknetdx/dxstats">https://github.com/blocknetdx/dxstats</a>
				</div>
			</div>
		</div>
	);
};

export default Core;
