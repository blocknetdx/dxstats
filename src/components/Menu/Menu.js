import React from 'react';
import {NavLink} from 'react-router-dom'

const Menu = () => {
	return (
		<nav className="nav-group">
			<h5 className="nav-group-title">Navigation</h5>
			<MenuRow path="/" label="Home" icon="home"/>
			<MenuRow path="/blocknet" label="xBridge Active" icon="chart-bar"/>
			<MenuRow path="/blocknet/cancelled/" label="xBridge Cancelled" icon="chart-bar"/>
		</nav>
	);
}

const MenuRow = (props) => {
	return (
		<NavLink to={props.path} className="nav-group-item" activeClassName="active" exact={true}>
			<span className={'icon icon-' + props.icon}/>
			{props.label}
		</NavLink>
	)
}

export default Menu;
