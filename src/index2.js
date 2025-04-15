import BingXService from './services/BingXService.js'; // Adjust the path as needed
import PositionRepository from './repositories/PositionRepository.js';
import SettingRepository from './repositories/SettingRepository.js';
import knexInstance from './knexInstance.js';

const DUAL_POSITION_PROFIT = 3.25;
const DUAL_POSITION_THRILING_STOP_PERCENT = .25;
const DUAL_POSITION_LOSS = -195;
const SINGLE_POSITION_PROFIT = 1.5;
const SINGLE_POSITION_LOSS = -10;
const SINGLE_POSITION_THRILING_STOP_PERCENT = .13;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function arraysAreEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  return arr1.every((element) => arr2.findIndex(i => i === element) !== -1);
}

async function main() {

    const bingXService = new BingXService(); // bingx api class
    let [a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,openPositions, openOrders] = await Promise.all([
      bingXService.openPositions(),
      bingXService.getAllOpenOrders(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.openPositions(),
      bingXService.getAllOpenOrders()
    ]);
    
    console.log(openPositions,openOrders)
       openPositions = openPositions.data.sort((a, b) => b.updateTime - a.updateTime)
    //  let openOrders = await bingXService.getAllOpenOrders()
    openOrders = openOrders.data.orders.sort((b, a) => b.time - a.time);
//    console.log(openPositions,openOrders);

    let openOrderSymbols = openOrders.map(i => i.symbol)
    let openPositionSymbols = openPositions.map(i => i.symbol)
    let setting = await SettingRepository.findOrCreateFirst(); // get or create setting for knowing last order id last order wait for match or we are waiting for main order and start time to know about when script starts

    let extra_info = JSON.parse(setting.extra_info ?? '{}');

    let positionArrayAreEqual = arraysAreEqual(openPositionSymbols, extra_info.open_positions ?? [])
    let orderArrayAreEqual = arraysAreEqual(openOrderSymbols, extra_info.open_orders ?? [])

    await SettingRepository.updateExtraInfo({
      'open_positions': openPositionSymbols,
      'open_orders': openOrderSymbols,
    });

    if (!positionArrayAreEqual || !orderArrayAreEqual) {
      console.log('stop due to change', openPositionSymbols, extra_info.open_positions ?? [], openOrderSymbols, extra_info.open_orders ?? []);
      await sleep(200);
      return;
    }

    let lastInProcess = await PositionRepository.lastInProcess();
    await SettingRepository.updateWaitFor(lastInProcess ? (lastInProcess.second_order_id ? 'order' : 'match') : 'order')
    setting = await SettingRepository.findOrCreateFirst(); // get or create setting for knowing last order id last order wait for match or we are waiting for main order and start time to know about when script starts

    let allInProcessOrders = await PositionRepository.getAllInProcessOrders()
    let allOrdersInstead = await PositionRepository.getAllOrders()
    // ezafe kardan jadid ha age position ya triger jadid ezafe shod
    let allOrders = [...openOrders, ...openPositions].sort((b, a) => a.updateTime - b.updateTime);
    let newOrdersAfterLastCheck = openOrders.filter(i => (allOrdersInstead.findIndex(b => i.orderId == b.first_order_id || i.orderId == b.second_order_id) === -1))
    let newPositionsAfterLastCheck = openPositions.filter(i => (allOrdersInstead.findIndex(b => i.positionId == b.first_order_id || i.positionId == b.second_order_id) === -1))

//check for closed but actually not closed orders and positions;
let allClosedOrders = allOrdersInstead.filter(i=>i.is_in_process != 1)
let newOrdersPreviouslyClosed = openOrders.filter(i => (allClosedOrders.findIndex(b => i.orderId == b.first_order_id || i.orderId == b.second_order_id) !== -1))
let newPositionsPreviouslyClosed = openPositions.filter(i => (allClosedOrders.findIndex(b => i.positionId == b.first_order_id || i.positionId == b.second_order_id) !== -1))

    for (let index = 0; index < newOrdersPreviouslyClosed.length; index++) {
           await bingXService.cancellAllOrderBySymbol(newOrdersPreviouslyClosed[index].symbol);
       }

    for (let index = 0; index < newPositionsPreviouslyClosed.length; index++) {
          await bingXService.closePosition(newPositionsPreviouslyClosed[index].positionId);
       }

//.............................................................
    let allNewOrder = [...newPositionsAfterLastCheck, ...newOrdersAfterLastCheck].sort((b, a) => b.updateTime - a.updateTime)
     console.log(allNewOrder);

     console.log('hereeee?')

}

main()
