import 'dotenv/config';
import CryptoJS from 'crypto-js';
import axios from 'axios'; // Adjust the path as needed

class BingXService {
  static instance;

  constructor() {
    if (BingXService.instance) {
      return BingXService.instance;
    }

    this.API_KEY = process.env.API_KEY;
    this.API_SECRET = process.env.API_SECRET;
    this.API_BASE_URL = process.env.API_BASE_URL;


    BingXService.instance = this;
    return this;
  }

  getParameters(API, urlEncode = true) {
    let parameters = "";
    for (const key in API.payload) {
      parameters += key + "=" + (urlEncode ? encodeURIComponent(API.payload[key]) : API.payload[key]) + "&";
    }
    return parameters;
  }

  async request(API) {
    const sign = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(this.getParameters(API), this.API_SECRET));
    const url = `${this.API_BASE_URL}${API.uri}?${this.getParameters(API, true)}&signature=${sign}`;

    const config = {
      method: API.method,
      url: url,
      headers: {
        'X-BX-APIKEY': this.API_KEY,
      },
      transformResponse: (resp) => {
        return JSON.parse(resp);
      },
      proxy: {
        protocol: process.env.PROXY_POROTOCOL,
        host: process.env.PROXY_HOST,
        port: process.env.PROXY_PORT,
      },
    };

    try {
      const resp = await axios(config);
      return resp.data;
    } catch (error) {
      console.error('Error in BingX request:', error);
      throw error;
    }
  }

  async getAllOrders(startTime, endTime) {
    const API = {
      uri: "/openApi/swap/v1/trade/fullOrder",
      method: "GET",
      payload: {
        limit: "1000",
        timestamp: Date.now(),
        startTime: startTime,
        endTime: endTime,

      }
    };
    return this.request(API);
  }

  async createOrder() {
    const API = {
      "uri": "/openApi/swap/v2/trade/order",
      "method": "POST",
      "payload": {
        "symbol": "ETH-USDT",
        "side": "BUY",
        "positionSide": "LONG",
        "type": "LIMIT",
        "quantity": 0.01,
        "price": '500',
        'timestamp': Date.now()
      },
      "protocol": "https"
    }
    return this.request(API);
  }
  async cancellOrder(orderId, symbol) {
    const API = {
      "uri": "/openApi/swap/v2/trade/order",
      "method": "DELETE",
      "payload": {
        "orderId": orderId,
        "symbol": symbol,
        "timestamp": Date.now()
      },
      "protocol": "https"
    }
    return this.request(API);
  }

  async closePosition(orderId) {
    const API = {
      "uri": "/openApi/swap/v1/trade/closePosition",
      "method": "POST",
      "payload": {
        "timestamp": Date.now(),
        "positionId": "1828354370266206200"
      },
      "protocol": "https"
    }
    return this.request(API);
  }
  async cancellAllOrder() {
    const API = {
      "uri": "/openApi/swap/v2/trade/allOpenOrders",
      "method": "DELETE",
      "payload": {
        "timestamp": Date.now(),
      },
      "protocol": "https"
    }
    return this.request(API);
  }

  async cancellAllOrderBySymbol(symbol) {
    console.log(Date.now() + ':going to cancel order for symbol: ' + symbol)
    const API = {
      "uri": "/openApi/swap/v2/trade/allOpenOrders",
      "method": "DELETE",
      "payload": {
        "timestamp": Date.now(),
        "symbol": symbol,
      },
      "protocol": "https"
    }
    return this.request(API);
  }



  async getAllOpenOrders() {
    const API = {
      "uri": "/openApi/swap/v2/trade/openOrders",
      "method": "GET",
      "payload": {
        "timestamp": Date.now()
      },
      "protocol": "https"
    }
    return this.request(API);
  }
  async pendingOrderStatus(orderId, symbol) {
    const API = {
      "uri": "/openApi/swap/v2/trade/order",
      "method": "GET",
      "payload": {
        "orderId": orderId,
        "symbol": symbol,
        "timestamp": Date.now()
      },
      "protocol": "https"
    }
    return this.request(API);
  }
  async openPositions() {
    const API = {
      "uri": "/openApi/swap/v2/user/positions",
      "method": "GET",
      "payload": {
        "recvWindow": "0",
        "timestamp": Date.now()
      },
      "protocol": "https"
    }
    return this.request(API);
  }

  async positionHistory() {
    const API = {
      "uri": "/openApi/swap/v2/user/positions",
      "method": "GET",
      "payload": {
        "recvWindow": "0",
        "timestamp": Date.now()
      },
      "protocol": "https"
    }
    return this.request(API);
  }


  async closePosition(positionId) {
    console.log(Date.now() + ':going to close position for positionId: ' + positionId)
    const API = {
      "uri": "/openApi/swap/v1/trade/closePosition",
      "method": "POST",
      "payload": {
        "timestamp": Date.now(),
        "positionId": positionId
      },
      "protocol": "https"
    }
    return this.request(API);
  }
}

export default BingXService;
