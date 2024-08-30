import BingXService from './services/BingXService.js'; // Adjust the path as needed
import PositionRepository from './repositories/PositionRepository.js';
import SettingRepository from './repositories/SettingRepository.js';
import knexInstance from './knexInstance.js';

const DUAL_POSITION_PROFIT = 4;
const DUAL_POSITION_THRILING_STOP_PERCENT = .5;
const DUAL_POSITION_LOSS = -2;
const SINGLE_POSITION_PROFIT = 4;
const SINGLE_POSITION_LOSS = -2;
const SINGLE_POSITION_THRILING_STOP_PERCENT = .5;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function arraysAreEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  return arr1.every((element) => arr2.findIndex(i=>i===element) !== -1);
}

async function main() {
  try {
    const bingXService = new BingXService(); // bingx api class
    let openPositions = await bingXService.openPositions();
    openPositions = openPositions.data.sort((a, b) => b.updateTime - a.updateTime)
    let openOrders = await bingXService.getAllOpenOrders()
    openOrders = openOrders.data.orders.sort((b, a) => b.time - a.time);

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
      console.log('stop due to change',openPositionSymbols, extra_info.open_positions ?? [],openOrderSymbols, extra_info.open_orders ?? []);
      await sleep(1500);
      return;
    }

    let lastInProcess = await PositionRepository.lastInProcess();
    await SettingRepository.updateWaitFor(lastInProcess ? (lastInProcess.second_order_id ? 'order' : 'match') : 'order')
    setting = await SettingRepository.findOrCreateFirst(); // get or create setting for knowing last order id last order wait for match or we are waiting for main order and start time to know about when script starts

    let allInProcessOrders = await PositionRepository.getAllInProcessOrders()
    // ezafe kardan jadid ha age position ya triger jadid ezafe shod
    let allOrders = [...openOrders, ...openPositions].sort((b, a) => a.updateTime - b.updateTime);
    let newOrdersAfterLastCheck = openOrders.filter(i => (allInProcessOrders.findIndex(b => i.symb == b.first_order_id || i.orderId == b.second_order_id) === -1))
    let newPositionsAfterLastCheck = openPositions.filter(i => (allInProcessOrders.findIndex(b => i.positionId == b.first_order_id || i.positionId == b.second_order_id) === -1))

    let allNewOrder = [...newPositionsAfterLastCheck, ...newOrdersAfterLastCheck].sort((b, a) => b.updateTime - a.updateTime)
    1
    for (let index = 0; index < allNewOrder.length; index++) {
      let previouslyOrderNowPosition = false;
      let previouslyOrderIndex = allInProcessOrders.findIndex(i => (i.first_order_symbol == allNewOrder[index].symbol && i.first_order_type == 'order') || (i.second_order_symbol == allNewOrder[index].symbol && i.second_order_type == 'order'))
      if (previouslyOrderIndex !== -1) {
        previouslyOrderNowPosition = 1;
        let firstOrSecond = allInProcessOrders[previouslyOrderIndex].first_order_symbol === allNewOrder[index].symbol ? 'first' : 'second';
        if (firstOrSecond == 'first') {
          await PositionRepository.updatePosition(allInProcessOrders[previouslyOrderIndex].id ?? 0, {
            first_order_type: allNewOrder[index].positionId ? 'position' : 'order',
            first_order_id: allNewOrder[index].positionId ?? allNewOrder[index].orderId,
            first_order_symbol: allNewOrder[index].symbol,
            first_order_profit: 0
          });
        } else {
          await PositionRepository.updatePosition(allInProcessOrders[previouslyOrderIndex].id ?? 0, {
            second_order_type: allNewOrder[index].positionId ? 'position' : 'order',
            second_order_id: allNewOrder[index].positionId ?? allNewOrder[index].orderId,
            second_order_symbol: allNewOrder[index].symbol,
            second_order_profit: 0
          });
        }
      }
      if (!previouslyOrderNowPosition) {
        if (setting.wait_for == 'order') {
          await PositionRepository.createPosition({
            first_order_type: allNewOrder[index].positionId ? 'position' : 'order',
            first_order_id: allNewOrder[index].positionId ?? allNewOrder[index].orderId,
            first_order_symbol: allNewOrder[index].symbol,
            second_order_id: null,
            second_order_symbol: null,
            first_order_profit: 0,
            second_order_profit: null,
            is_in_process: 1,
            final_status: null,
            maximum_profit: 0
          });
          setting.wait_for = 'match';
        } else {
          const lastOrderWithoutMatch = await PositionRepository.getLastOrderWithoutMatch();
          await PositionRepository.updatePosition(lastOrderWithoutMatch.id ?? 0, {
            second_order_type: allNewOrder[index].positionId ? 'position' : 'order',
            second_order_id: allNewOrder[index].positionId ?? allNewOrder[index].orderId,
            second_order_symbol: allNewOrder[index].symbol,
            second_order_profit: 0
          });
          setting.wait_for = 'order';
        }
      }
    }

    allInProcessOrders = await PositionRepository.getAllInProcessOrders()


    // check if we have cancel order - then check for cancel position
    for (let index = 0; index < allInProcessOrders.length; index++) {
      let element = allInProcessOrders[index];
      let firstOrderStillExists = allOrders.findIndex(i => (i.positionId ?? i.orderId) == element.first_order_id) === -1 ? false : true
      let secondOrderStillExists = allOrders.findIndex(i => (i.positionId ?? i.orderId) == element.second_order_id) === -1 ? false : true
      if (!firstOrderStillExists && !secondOrderStillExists) {
        // just the order is not anymore in process update in process to set 0 and both-cancelled
        await PositionRepository.updatePosition(element.id, {
          'final_status': 'cancel-both',
          'is_in_process': 0,
        })
      } else if ((!firstOrderStillExists && secondOrderStillExists) && element.final_status != 'thriling-first' && element.first_order_id) {

        let successfullyCancelled = false;

        if (element.second_order_type == 'order') {
          let res = await bingXService.cancellAllOrderBySymbol(element.second_order_symbol);
          if (res.data?.success?.length) {
            successfullyCancelled = true;
          }
        } else if (element.second_order_type == 'position') {
          let res = await bingXService.closePosition(element.second_order_id);
          if (res.data.orderId) {
            successfullyCancelled = true;
          }
        }
        if (successfullyCancelled) {
          await PositionRepository.updatePosition(element.id, {
            'final_status': 'cancel-both',
            'is_in_process': 0,
          })
        }
      } else if ((firstOrderStillExists && !secondOrderStillExists) && element.final_status != 'thriling-first' && element.second_order_id) {
        // cancel first position and in process to set 0 and both-cancelled --- if not cancel keep everything same
        let successfullyCancelled = false;
        if (element.first_order_type == 'order') {
          let res = await bingXService.cancellAllOrderBySymbol(element.first_order_symbol);
          if (res.data?.success?.length) {
            successfullyCancelled = true;
          }
        } else if (element.first_order_type == 'position') {
          let res = await bingXService.closePosition(element.first_order_id);
          if (res.data.orderId) {
            successfullyCancelled = true;
          }
        }
        if (successfullyCancelled) {
          await PositionRepository.updatePosition(element.id, {
            'final_status': 'cancel-both',
            'is_in_process': 0,
          })
        }
      }

    }

    allInProcessOrders = await PositionRepository.getAllInProcessOrders()

    for (let index = 0; index < allInProcessOrders.length; index++) {
      let element = allInProcessOrders[index];
      element.first_order_api_data = allOrders.find(i => (i.orderId ?? i.positionId) == element.first_order_id);
      element.second_order_api_data = allOrders.find(i => (i.orderId ?? i.positionId) == element.second_order_id)
    }



    for (let index = 0; index < allInProcessOrders.length; index++) {
      let element = allInProcessOrders[index];
      if (element.first_order_type == 'position' && element.second_order_type == 'position') {
        let avgPrice = Number(element.first_order_api_data.avgPrice);
        let markPrice = Number(element.first_order_api_data.markPrice);
        let leverage = Number(element.first_order_api_data.leverage);
        let positionSide = element.first_order_api_data.positionSide;

        let firstProfit;
        if (positionSide === 'SHORT') {
          firstProfit = ((avgPrice - markPrice) / avgPrice) * leverage * 100;
        } else if (positionSide === 'LONG') {
          firstProfit = ((markPrice - avgPrice) / avgPrice) * leverage * 100;
        }


        avgPrice = Number(element.second_order_api_data.avgPrice);
        markPrice = Number(element.second_order_api_data.markPrice);
        leverage = Number(element.second_order_api_data.leverage);
        positionSide = element.second_order_api_data.positionSide;

        let secondProfit;
        if (positionSide === 'SHORT') {
          secondProfit = ((avgPrice - markPrice) / avgPrice) * leverage * 100;
        } else if (positionSide === 'LONG') {
          secondProfit = ((markPrice - avgPrice) / avgPrice) * leverage * 100;
        }

        let profit = firstProfit + secondProfit;

        if (profit >= DUAL_POSITION_PROFIT) {
          if (element.maximum_profit < profit) {
            PositionRepository.updatePosition(element.id, {
              final_status: 'thriling-both',
              maximum_profit: profit
            })
          }
        }
        if (element.final_status == 'thriling-both') {
          if (profit < element.maximum_profit - DUAL_POSITION_THRILING_STOP_PERCENT) {
            await bingXService.closePosition(element.first_order_id)
            await bingXService.closePosition(element.second_order_id)
          }
        }

        if (profit <= DUAL_POSITION_LOSS) {
          await bingXService.closePosition(element.first_order_id)
          await bingXService.closePosition(element.second_order_id)
        }
      } else if (element.first_order_type == 'position' && element.second_order_type != 'position') {
        let avgPrice = Number(element.first_order_api_data.avgPrice);
        let markPrice = Number(element.first_order_api_data.markPrice);
        let leverage = Number(element.first_order_api_data.leverage);
        let positionSide = element.first_order_api_data.positionSide;

        let profit;
        if (positionSide === 'SHORT') {
          profit = ((avgPrice - markPrice) / avgPrice) * leverage * 100;
        } else if (positionSide === 'LONG') {
          profit = ((markPrice - avgPrice) / avgPrice) * leverage * 100;
        }
        if (profit >= SINGLE_POSITION_PROFIT) {

          if (element.first_order_profit < profit) {
            PositionRepository.updatePosition(element.id, {
              final_status: 'thriling-first',
              first_order_profit: profit
            })
          }
          if (element.second_order_symbol) {
            await bingXService.cancellAllOrderBySymbol(element.second_order_symbol)
          }
        }

        if (element.final_status == 'thriling-first') {
          if (profit < element.first_order_profit - SINGLE_POSITION_THRILING_STOP_PERCENT) {
            await bingXService.closePosition(element.first_order_id)
            PositionRepository.updatePosition(element.id, {
              final_status: null
            })
          }
        }

        if (profit <= SINGLE_POSITION_LOSS) {
          await bingXService.closePosition(element.first_order_id)
          await bingXService.cancellAllOrderBySymbol(element.second_order_symbol)
        }
      } else if (element.first_order_type != 'position' && element.second_order_type == 'position') {
        let avgPrice = Number(element.second_order_api_data.avgPrice);
        let markPrice = Number(element.second_order_api_data.markPrice);
        let leverage = Number(element.second_order_api_data.leverage);
        let positionSide = element.second_order_api_data.positionSide;

        let profit;
        if (positionSide === 'SHORT') {
          profit = ((avgPrice - markPrice) / avgPrice) * leverage * 100;
        } else if (positionSide === 'LONG') {
          profit = ((markPrice - avgPrice) / avgPrice) * leverage * 100;
        }
        if (profit >= SINGLE_POSITION_PROFIT) {

          if (element.second_order_profit < profit) {
            PositionRepository.updatePosition(element.id, {
              final_status: 'thriling-first',
              second_order_profit: profit
            })
          }
          if (element.first_order_symbol) {
            await bingXService.cancellAllOrderBySymbol(element.first_order_symbol)
          }
        }

        if (element.final_status == 'thriling-first') {
          if (profit < element.second_order_profit - SINGLE_POSITION_THRILING_STOP_PERCENT) {
            await bingXService.closePosition(element.second_order_id)
            PositionRepository.updatePosition(element.id, {
              final_status: null
            })
          }
        }


        if (profit <= SINGLE_POSITION_LOSS) {
          await bingXService.cancellAllOrderBySymbol(element.first_order_symbol)
          await bingXService.closePosition(element.second_order_id)
        }
      }
    }



    lastInProcess = await PositionRepository.lastInProcess();
    await SettingRepository.updateWaitFor(lastInProcess ? (lastInProcess.second_order_id ? 'order' : 'match') : 'order')
    await sleep(500);
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main().then(() => {
  console.log('end');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
}).finally(() => {
  knexInstance.destroy()
});

