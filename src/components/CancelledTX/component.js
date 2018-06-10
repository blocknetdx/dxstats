import config from 'electron-json-config';
// Init reduxHelper
import reduxHelper from '../../utils/reduxHelper.js';
// Include component
import component from './CancelledTX.js';

const reduxUtil = reduxHelper('CancelledTX');


// Action Definitions
const SAVE_SETTINGS = reduxUtil.defineAction('SAVE_SETTINGS');

// Initial State
const initialState = {
	// get this from config file (second parameter is the default value if not found)
	textInput: config.get('CancelledTX.textInput', ''),
	selectBox: config.get('CancelledTX.selectBox', '1')
};

// Make Actions
const actions = {
	saveSettings: reduxUtil.createAction(SAVE_SETTINGS)
};

// Make reducer
const reducer = reduxUtil.createReducer({
	[SAVE_SETTINGS]: function (state, action) {
		return {...state, ...action.payload};
	}
}, initialState);

// Export
export {
	component,
	actions,
	reducer
};
