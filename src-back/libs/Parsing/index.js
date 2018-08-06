const { app, ipcMain } = require('electron');
const fs = require('fs-extra-promise');
const path = require('path');
const SimpleStorage = require('../../storage');
const moment = require("moment");
const closestTo = require('date-fns/closest_to');
const _ = require("lodash");


let dataPath;
if(process.platform === 'win32') {
  dataPath = path.join(process.env.LOCALAPPDATA, 'BLOCKDX-Explorer');
  fs.ensureDirSync(dataPath);
} else {
  dataPath = app.getPath('userData');
}

const storage = new SimpleStorage(path.join(dataPath, 'meta.json'));

let appWindow = null;
const orderBook = {};
const coins = {
  srcPairs: [],
  destPairs: [],
  bidPairs: [],
  askPairs: [],
  activePairs: []
};
let keyPair = [];

exports.init = (app) => {
  appWindow = app;
};

/*
function containsTxidCancelled(packet) {
  for (let i = 0; i < orderBook.cancelled.length(); i++) {
    if (packet.txid === orderBook.cancelled[i].txid)
      return true;
  }

  return false;
}
*/

const check_coins = (data) => {
  if (!coins.srcPairs.includes(data.sourceCurrency)) {
    coins.srcPairs.push(data.sourceCurrency);
  }
  if (!coins.destPairs.includes(data.destCurrency)) {
    coins.destPairs.push(data.destCurrency);
  }

  coins.destPairs.forEach(d => {
    for (let i = 0; i < coins.srcPairs.length; i++) {
      const pair = [coins.srcPairs[i], d];
      const reversed = pair.slice().reverse();

      const el = coins.askPairs.filter(e => {
        return e[0] === coins.srcPairs[i] && e[1] === d;
      });

      if (el.length === 0) {
        coins.askPairs.push(pair);
        coins.bidPairs.push(reversed);
      }
    }
  });
};

const det_OrderType = (data) => {
  const ask = coins.askPairs.filter(e => {
    return e[0] === data.sourceCurrency && e[1] === data.destCurrency;
  });

  const bid = coins.bidPairs.filter(e => {
    return data.sourceCurrency === e[1] && data.destCurrency === e[0];
  });

  if (ask) {
    return 1;
  } else if (bid) {
    return 0;
  }
};

const build_OrderBook = (data) => {
  const type = det_OrderType(data);
  let ask = [], bid = [];

  const pair = data.sourceCurrency + '/' + data.destCurrency;
  const arrPair = [data.sourceCurrency, data.destCurrency];
  if (keyPair === undefined) {
    keyPair = arrPair;
    sendKeyPair();
  }
  const pairExists = coins.activePairs.filter(e => {
    return e[0] === data.sourceCurrency && e[1] === data.destCurrency;
  });

  if (pairExists == false) {
    coins.activePairs.push(arrPair);
  }

  if (orderBook[pair] === undefined) {
    orderBook[pair] = {
      asks: [],
      bids: [],
      cancelled: [],
      finished: []
    };
  }

  const isCancelledOrder = orderBook[pair].cancelled.filter(e => {
    return e.txid === data.txid;
  });

  if (type === 0 && isCancelledOrder.length === 0) {
    let i = orderBook[pair].bids.length;
    i=i+1;
    bid = {
      txid: data.txid,
      orderId: i,
      price: data.destAmt/1000000,
      size: data.sourceAmt/1000000,
      timestamp: data.timestamp
    };
    const bidExists = orderBook[pair].bids.filter(e => {
      return e.txid === data.txid;
    });
    if (bidExists == false) {
      orderBook[pair].bids.push(bid);
    } else if (orderBook[pair].bids.length === 0) {
      orderBook[pair].asks.push(ask);
    }
  } else if (type === 1 && isCancelledOrder.length === 0) {
    let i = orderBook[pair].asks.length;
    i=i+1;
    ask = {
      txid: data.txid,
      orderId: i,
      price: data.destAmt/1000000,
      size: data.sourceAmt/1000000,
      timestamp: data.timestamp
    };
    const askExists = orderBook[pair].asks.filter(e => {
      return e.txid === data.txid;
    });
    if (askExists == false) {
      orderBook[pair].asks.push(ask);
    } else if (orderBook[pair].asks.length === 0) {
      orderBook[pair].asks.push(ask);
    }
  }
  console.log(orderBook);
  sendKeyPair();
  appWindow.send('orderBook', orderBook);
};


const build_CanceledOrders = (data) => {
  for (const pair in orderBook) {
    orderBook[pair].bids.filter(e => {
      return e.txid === data.hubTxid;
    });

    orderBook[pair].asks.map(e => {
      if (e.txid === data.hubTxid) {
        const index = orderBook[pair].asks.indexOf(e);
        orderBook[pair].asks.splice(index,1);

        if (e.orderId) {
          const order = {
            orderId: e.orderId,
            makerSize: e.size,
            takerSize: e.price,
            side: 'buy',
            type: 'Cancel',
            created_at: e.timestamp / 1000,
            status: 'canceled',
            txid: e.txid
          };

          if (order.orderId) {
            orderBook[pair].cancelled.push(order);
            appWindow.send('canceledOrder', orderBook[pair].cancelled, [pair.split('/')]);
            return;
          }
        }
      }
    });
  }
};

const build_FinishedOrders = (data) => {
  for (const pair in orderBook) {
    orderBook[pair].bids.filter(e => {
      return e.txid === data.hubTxid;
    });

    orderBook[pair].asks.map(e => {
      if (e.txid === data.hubTxid) {
        const index = orderBook[pair].asks.indexOf(e);
        orderBook[pair].asks.splice(index, 1);

        if (e.orderId) {
          const order = {
            orderId: e.orderId,
            time: e.timestamp / 1000,
            id: e.id,
            maker: pair.split('/')[0],
            makerSize: e.size,
            takerSize: e.price,
            side: 'buy'
          };

          if (order.orderId) {
            orderBook[pair].finished.push(order);
            appWindow.send('tradeHistory', orderBook[pair].finished, [pair.split('/')]);
            return;
          }
        }
      }
    });
  }
};

exports.send_xBridgeMsg = (data) => {
  //keyPair = storage.getItem('keyPair');
  appWindow.send('currencies', coins.srcPairs);
  appWindow.send('activePairs', coins.activePairs);
  console.log(keyPair);
  check_coins(data);
  build_OrderBook(data);
};

exports.canceled_xBridgeOrder = (data) => {
  appWindow.send('currencies', coins.srcPairs);
  appWindow.send('activePairs', coins.activePairs);

  check_coins(data);
  build_CanceledOrders(data);
};

exports.finished_xBridgeOrder = (data) => {
  appWindow.send('currencies', coins.srcPairs);
  appWindow.send('activePairs', coins.activePairs);

  check_coins(data);
  build_FinishedOrders(data);
};

function refresh() {
  if (keyPair[0] === undefined || keyPair[1] === undefined) {
    console.log('Pair is undefined! Setting pair to first in list, then refreshing.');
    keyPair = coins.activePairs[0];
    storage.setItem('keyPair', keyPair);
    sendKeyPair();
    return;
  }

  const pair = keyPair[0] + '/' + keyPair[1];

  console.log('Refreshing UI for pair ' + pair);

  if (orderBook === undefined)
    return;

  appWindow.send('orderBook', orderBook);

  if (orderBook[pair] === undefined)
    return;

  appWindow.send('canceledOrder', orderBook[pair].cancelled, [pair.split('/')]);
  appWindow.send('tradeHistory', orderBook[pair].finished, [pair.split('/')]);
  appWindow.send('orderHistory', build_TradeHistory(orderBook[pair].asks));
}

function sendKeyPair() {
  appWindow.send('setNewPair', keyPair);
  refresh();
}

function selectMarketPair(e, arr) {
  keyPair = arr;
  storage.setItem('keyPair', arr);
  sendKeyPair();
  appWindow.send('orderHistory', build_TradeHistory(orderBook[pair].asks));
}

const build_TradeHistory = (data) => {
  const object = _.groupBy(data, (result) => moment.unix(result['timestamp']/1000000).startOf('minute'));
  let x = [];
  _(object).forEach((obj, time) => {
    const t = time;
    const epoch = moment(t).unix()*1000;
    const isOk = moment(t).isAfter(moment().subtract(1, 'days'));
    if (isOk === false) return;

    x.push({
      time: epoch,
      high: _.maxBy(obj, o => o.price).price,
      low: _.minBy(obj, o => o.price).price,
      open: _.minBy(obj, o => o.timestamp/1000000).price,
      close: _.maxBy(obj, o => o.timestamp/1000000).price,
      volume: _.sumBy(obj, o => o.size)
    });
  });
  if (!x.length) return;
  let arr={}, dates=[];

  x.forEach(el => {
    arr[new Date(el.time)] = el.close;
    dates.push(new Date(el.time));
  });

  for (let m = moment.unix(_.minBy(x, o => o.time).time/1000); m.isBefore(moment()); m.add(1, 'minute')) {
    if (new Date(m.unix()*1000) in dates) {
      continue;
    }
    if (!x.filter(e => e.time === m.unix()*1000).length > 0 && x.length > 0) {
      const date = new Date(m.unix()*1000);
      const result = closestTo(date, dates);
      const last = arr[result];
      x.push({
        time: m.unix()*1000,
        high: last,
        low: last,
        open: last,
        close: last,
        volume: 0
      });
    }
  }

  x.sort(function(a,b){
    return new Date(a.time) - new Date(b.time);
  });

  return x;
};

ipcMain.on('getOrderHistory', () => {
  //refresh();
});
ipcMain.on('selectMarketPair', selectMarketPair);
