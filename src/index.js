
// npm install crypto-js -s 
// npm install axios -s 
import 'dotenv/config'
import CryptoJS from "crypto-js";
import axios from "./axios.js";
const API_KEY = process.env.API_KEY
const API_SECRET = process.env.API_SECRET
const HOST = "open-api.bingx.com"
console.log(Date.now() - (140 * 24*60*60*1000));
const API = {
  "uri": "/openApi/swap/v2/trade/allOrders",
  "method": "GET",
  "payload": {
      "limit": "1000",
      "symbol": "BTC-USDT",
      "timestamp": Date.now()
  },
  "protocol": "https"
}
async function main() {
    await bingXOpenApiTest(API.protocol, HOST, API.uri, API.method, API_KEY, API_SECRET)
}
function getParameters(API, urlEncode) {
    let parameters = ""
    for (const key in API.payload) {
        if (urlEncode) {
            parameters += key + "=" + encodeURIComponent(API.payload[key]) + "&"
        } else {
            parameters += key + "=" + API.payload[key] + "&"
        }
    }
    return parameters
}

main().catch(console.err);
async function bingXOpenApiTest(protocol, host, path, method, API_KEY, API_SECRET) {
    const sign = CryptoJS.enc.Hex.stringify(CryptoJS.HmacSHA256(getParameters(API), API_SECRET))
    const url = protocol+"://"+host+path+"?"+getParameters(API, true)+"&signature="+sign
    console.log(url)
    const config = {
        method: method,
        url: url,
        headers: {
            'X-BX-APIKEY': API_KEY,
        },
        transformResponse: (resp) => {
            console.log(resp); 
            return resp;
        }
    };
    const resp = await axios(config);
    
  }