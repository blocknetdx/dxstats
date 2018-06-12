let appWindow = null,
    orderBook = {},
    coins = {
      srcPairs: [],
      destPairs: [],
      bidPairs: [],
      askPairs: [],
      activePairs: []
    };

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

  appWindow.send('currencies', coins.srcPairs);
  appWindow.send('activePairs', coins.activePairs);
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
  let type = det_OrderType(data),
      ask = [],
      bid = [];

  const pair = data.sourceCurrency + '/' + data.destCurrency;

  const arrPair = [data.sourceCurrency, data.destCurrency];

  const pairExists = coins.activePairs.filter(e => {
    return e[0] === data.sourceCurrency && e[1] === data.destCurrency;
  });

  if (pairExists == false) {
    coins.activePairs.push(arrPair);
  }

  if (orderBook[pair] === undefined) {
    orderBook[pair] = {
      asks: [],
      bids: []
    };
  }

  if (type === 0) {
    let i = orderBook[pair].bids.length;
    i=i+1;
    bid = {
      txid: data.txid,
      srcCurr: data.sourceCurrency,
      destCurr: data.destCurrency,
      orderId: i,
      price: data.destAmt/1000000,
      size: data.sourceAmt/1000000
    };
    const bidExists = orderBook[pair].bids.filter(e => {
      return e.txid === data.txid;
    });
    if (bidExists == false) {
      orderBook[pair].bids.push(bid);
    } else if (orderBook[pair].bids.length === 0) {
      orderBook[pair].asks.push(ask);
    }
  } else if (type === 1) {
    let i = orderBook[pair].asks.length;
    i=i+1;
    ask = {
      txid: data.txid,
      orderId: i,
      price: data.destAmt/1000000,
      size: data.sourceAmt/1000000
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
  appWindow.send('orderBook', orderBook);
};

exports.send_xBridgeMsg = (data) => {
  check_coins(data);
  build_OrderBook(data);
};

exports.init = (app) => {
  appWindow = app;
};
