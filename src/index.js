import React from 'react';
import { render } from 'react-dom';

import "./assets/css/globals.css";
import './vendor/photon/css/photon.css';

import { components } from './components/components.js';

import coin from './libs/index.js';

let root = document.createElement('div');
root.id = "root";
document.body.appendChild( root );

render( <components.Core />, document.getElementById('root') );

if (module.hot) {
  module.hot.accept( './components/components.js', () => {
    render( <components.Core />, document.getElementById('root') );
  });
}
