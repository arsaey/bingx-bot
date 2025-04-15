import BingXService from './services/BingXService.js'; // Adjust the path as needed
import PositionRepository from './repositories/PositionRepository.js';
import SettingRepository from './repositories/SettingRepository.js';
import knexInstance from './knexInstance.js';
import nodemailer from 'nodemailer'
// Create a transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'Kalaqe.mast@gmail.com', // Your Gmail address
    pass: 'hrty gqoh xzei vqmr ',   // Your app password
  },
});

const DUAL_POSITION_PROFIT = 200;
const DUAL_POSITION_THRILING_STOP_PERCENT = .1;
const DUAL_POSITION_LOSS = -1000;
const SINGLE_POSITION_PROFIT = 100;
const SINGLE_POSITION_LOSS = -100;
const SINGLE_POSITION_THRILING_STOP_PERCENT = .01;
// ----
const UNIQUE_CHECK_POSITION = 1
const UNIQUE_CHECK_PUT_ORDER = 1
const UNIQUE_CHECK_PERCENT = 0.2
const UNIQUE_CHECK_ORDER_PRICE_PERCENT_LONG = -0.3
const UNIQUE_CHECK_ORDER_PRICE_PERCENT_SHORT = 0.3
const UNIQUE_CHECK_ALERT_EMAIL = 'Khalghe.mast@gmail.com'
// ----


// ---- 

const MINIMUM_PROFIT_USDT_BOTH = 0.05

const TRIGGER_FOLLOW = 1
const EACH_X_PERCENT_DISTANCE = 0.1
const EACH_X_PERCENT_VALUE = 0.1
//  ----- 


var prices = {}
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
  try {
    const bingXService = new BingXService(); // bingx api class
    let [openPositions, openOrders] = await Promise.all([
      bingXService.openPositions(),
      bingXService.getAllOpenOrders()
    ]);

    //    let openPositions = await bingXService.openPositions();
    openPositions = openPositions.data.sort((a, b) => b.updateTime - a.updateTime)
    //console.log(openPositions)
    //  let openOrders = await bingXService.getAllOpenOrders()
    openOrders = openOrders.data.orders.sort((b, a) => b.time - a.time);
    //    console.log(openPositions,openOrders);

    if (openPositions.filter(i => i.symbol == 'BTC-USDT').length < 1) {
      console.log('BTC not exists in position')
      await sleep(5000);
      return;
    } else {
      let btcIndexPos = openPositions.findIndex(i => i.symbol == 'BTC-USDT')
      if (btcIndexPos !== -1) { // Check if BTC-USDT exists in the array
        openPositions.splice(btcIndexPos, 1);
      }
      btcIndexPos = openPositions.findIndex(i => i.symbol == 'BTC-USDT')
      if (btcIndexPos !== -1) { // Check if BTC-USDT exists in the array
        openPositions.splice(btcIndexPos, 1);
      }

    }

    if (openOrders.filter(i => i.symbol == 'BTC-USDT').length < 1) {
      console.log('BTC not exists in order')
      await sleep(5000);
      return;
    } else {
      let btcIndexOrder = openOrders.findIndex(i => i.symbol == 'BTC-USDT')
      if (btcIndexOrder !== -1) { // Check if BTC-USDT exists in the array
        openOrders.splice(btcIndexOrder, 1);
      }
      btcIndexOrder = openOrders.findIndex(i => i.symbol == 'BTC-USDT')
      if (btcIndexOrder !== -1) { // Check if BTC-USDT exists in the array
        openOrders.splice(btcIndexOrder, 1);
      }

    }

    async function updateOrderStep(element, orderIndex) {
      if (TRIGGER_FOLLOW == 0) {
        return;
      }

      // Determine if Working on First or Second Order
      const isFirstOrder = (orderIndex === 'first');
      const prefix = isFirstOrder ? 'first_order' : 'second_order';

      // Get Dynamic Property Names
      const initPriceKey = `${prefix}_init_price`;
      const symbolKey = `${prefix}_symbol`;
      const updatePercentKey = `${prefix}_update_percent`;
      const apiDataKey = `${prefix}_api_data`;
      const orderIdKey = `${prefix}_id`;

      // Check and Cache the Current Price
      if (!prices[element[symbolKey]]) {
        let response_price = await bingXService.getPrice(element[symbolKey]);
        if (!response_price?.data?.markPrice) {
          console.log(['wrong response price for ', element[symbolKey], response_price])
        }
        prices[element[symbolKey]] = Number(response_price.data.markPrice);
      }

      // Set Initial Price if Not Already Set
      if (!element[initPriceKey]) {
        await PositionRepository.updatePosition(element.id, {
          [initPriceKey]: prices[element[symbolKey]]
        });
      } else {
        element[updatePercentKey] = Number(element[updatePercentKey] ?? 0);

        // Calculate Percentage Difference
        let target_api = element[apiDataKey];
        target_api.price = Number(target_api.price);

        let init_price_is_bigger = (element[initPriceKey] > target_api.price);
        let how_many_percent_difference = init_price_is_bigger
          ? ((element[initPriceKey] - prices[element[symbolKey]]) * 100) / element[initPriceKey]
          : ((prices[element[symbolKey]] - element[initPriceKey]) * 100) / element[initPriceKey];

        // Check if the Percentage Difference Reached the Threshold
        if ((how_many_percent_difference % EACH_X_PERCENT_DISTANCE) > 0 &&
          how_many_percent_difference >= element[updatePercentKey] + EACH_X_PERCENT_DISTANCE) {

          try {
            // Cancel the Existing Order
            let result = await bingXService.cancellOrder(element[symbolKey], element[orderIdKey]);
            if (Number(result.code) === 0) {

              // Calculate New Target Price
              let target_price = init_price_is_bigger
                ? target_api.price - (target_api.price * EACH_X_PERCENT_VALUE / 100)
                : target_api.price + (target_api.price * EACH_X_PERCENT_VALUE / 100);

              // Create the New Order
              result = await bingXService.createOrder(
                target_api.symbol,
                target_api.side,
                target_api.positionSide,
                Number(target_api.origQty),
                'TRIGGER_MARKET',
                target_price
              );

              if (result?.data?.order?.orderId) {
                // Update Position with New Order Details
                await PositionRepository.updatePosition(element.id, {
                  [orderIdKey]: result.data.order.orderId,
                  [updatePercentKey]: how_many_percent_difference
                });
              } else {
                console.error('Failed to create new order:', result);
              }
            } else {
              console.error('Failed to cancel order:', result);
            }
          } catch (error) {
            console.error('Error in updateOrderStep:', error);
          }
        }
      }
    }



    let openOrderSymbols = openOrders.map(i => i.symbol)
    let openPositionSymbols = openPositions.map(i => i.symbol)

    openPositions.map(i => {
      prices[i.symbol] = Number(i.markPrice)
    })

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

    //    if (!allOrders.length) {
    //            console.log('please clear db', openPositionSymbols, extra_info.open_positions ?? [], openOrderSymbols, extra_info.open_orders ?? []);
    //      await sleep(1000);
    //      return;
    //    }

    //check for closed but actually not closed orders and positions;
    let allClosedOrders = allOrdersInstead.filter(i => i.is_in_process != 1)
    let newOrdersPreviouslyClosed = openOrders.filter(i => (allClosedOrders.findIndex(b => i.orderId == b.first_order_id || i.orderId == b.second_order_id) !== -1))
    let newPositionsPreviouslyClosed = openPositions.filter(i => (allClosedOrders.findIndex(b => i.positionId == b.first_order_id || i.positionId == b.second_order_id) !== -1))

    for (let index = 0; index < newOrdersPreviouslyClosed.length; index++) {
      await bingXService.cancellOrder(newOrdersPreviouslyClosed[index].symbol, newOrdersPreviouslyClosed[index].orderId);
    }

    for (let index = 0; index < newPositionsPreviouslyClosed.length; index++) {
      await bingXService.closePosition(newPositionsPreviouslyClosed[index].positionId);
    }

    //.............................................................
    let allNewOrder = [...newPositionsAfterLastCheck, ...newOrdersAfterLastCheck].sort((b, a) => b.updateTime - a.updateTime)

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
          try {
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
          } catch (e) {
            console.log(e)
          }
          //          setting.wait_for = 'match';
        } else {
          const lastOrderWithoutMatch = await PositionRepository.getLastOrderWithoutMatch();
          try {
            await PositionRepository.updatePosition(lastOrderWithoutMatch.id ?? 0, {
              second_order_type: allNewOrder[index].positionId ? 'position' : 'order',
              second_order_id: allNewOrder[index].positionId ?? allNewOrder[index].orderId,
              second_order_symbol: allNewOrder[index].symbol,
              second_order_profit: 0
            });
            setting.wait_for = 'order';

          } catch (e) {
            console.log(e)
          }
          //          setting.wait_for = 'order';
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
          let res = await bingXService.cancellOrder(element.second_order_symbol, element.second_order_id);
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
          let res = await bingXService.cancellOrder(element.first_order_symbol, element.first_order_id);
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


      if (element.first_order_type != 'position') {
        await updateOrderStep(element, 'first')
      }


      if (element.second_order_type != 'position') {
        await updateOrderStep(element, 'second')
      }

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

        let sum_usdt_profit = Number(element.second_order_api_data.unrealizedProfit) + Number(element.first_order_api_data.unrealizedProfit);

        let profit = firstProfit + secondProfit;
        await PositionRepository.updatePosition(element.id, {
          current_sum_profit: profit
        });
        // check if both are unique position. in this case do the thriling. and blah blah
        // -------------------------------
        if (UNIQUE_CHECK_POSITION) {
          // console.log(profit, ' - ', element.unique_maximum_profit - UNIQUE_CHECK_PERCENT, profit <= element.unique_maximum_profit - UNIQUE_CHECK_PERCENT)
          if (element.unique_maximum_profit === null) {
            element.unique_maximum_profit = profit
          }


          let countFirstOrder =
            allInProcessOrders.filter(i => (element.first_order_symbol == i.first_order_symbol && i.is_in_process == 1) || (element.first_order_symbol == i.second_order_symbol && i.is_in_process == 1))
          let countSecondOrder =
            allInProcessOrders.filter(i => (element.second_order_symbol == i.first_order_symbol && i.is_in_process == 1) || (element.second_order_symbol == i.second_order_symbol && i.is_in_process == 1))
          let should_max_be_null = false;
          if (countFirstOrder.length == 1 && countSecondOrder.length == 1) {
            if (profit <= element.unique_maximum_profit - UNIQUE_CHECK_PERCENT) {

              if (UNIQUE_CHECK_PUT_ORDER) {
                // Determine which order is worse (lower profit)
                let market_api, limit_api;

                if (firstProfit < secondProfit) {
                  market_api = element.first_order_api_data;
                  limit_api = element.second_order_api_data;
                } else {
                  market_api = element.second_order_api_data;
                  limit_api = element.first_order_api_data;
                }

                console.log(['going to create market',
                  market_api.symbol,
                  market_api.positionSide == 'LONG' ? 'SELL' : 'BUY',
                  market_api.positionSide == 'LONG' ? 'SHORT' : 'LONG',
                  market_api.positionAmt,
                  'MARKET'])

                // Place market opposite the worst
                await bingXService.createOrder(
                  market_api.symbol,
                  market_api.positionSide == 'LONG' ? 'SELL' : 'BUY',
                  market_api.positionSide == 'LONG' ? 'SHORT' : 'LONG',
                  market_api.positionAmt,
                  'MARKET'
                );
                should_max_be_null = true;
                // Calculate the limit price and place limit order for the other one
                let limit_price;
                if (limit_api.positionSide == 'LONG') {
                  limit_price = parseFloat(limit_api.markPrice) + (parseFloat(limit_api.markPrice) * UNIQUE_CHECK_ORDER_PRICE_PERCENT_LONG / 100);
                } else if (limit_api.positionSide == 'SHORT') {
                  limit_price = parseFloat(limit_api.markPrice) - (parseFloat(limit_api.markPrice) * UNIQUE_CHECK_ORDER_PRICE_PERCENT_LONG / 100);
                }

                console.log(['going to create order',
                  limit_api.symbol,
                  limit_api.positionSide == 'LONG' ? 'SELL' : 'BUY',
                  limit_api.positionSide == 'LONG' ? 'SHORT' : 'LONG',
                  limit_api.positionAmt,
                  'LIMIT',
                  limit_price])

                await bingXService.createOrder(
                  limit_api.symbol,
                  limit_api.positionSide == 'LONG' ? 'SELL' : 'BUY',
                  limit_api.positionSide == 'LONG' ? 'SHORT' : 'LONG',
                  limit_api.positionAmt,
                  'TRIGGER_MARKET',
                  limit_price
                );
              }
              const mailOptions = {
                from: 'Kalaqe.mast@gmail.com', // Sender's email
                to: UNIQUE_CHECK_ALERT_EMAIL, // Recipient's email
                subject: 'alert for position', // Subject line
                text: `${element.first_order_symbol}-${element.second_order_symbol} is under UNIQUE_CHECK_PERCENT ${element.first_order_symbol}:${firstProfit} and ${element.second_order_symbol}:${secondProfit}`, // Email body
              };

              // Send the email
              if (element.created_at.getTime() == element.updated_at.getTime()) {
                await transporter.sendMail(mailOptions);
                // Update the position only after successful email sending
                await PositionRepository.updatePosition(element.id, {
                  updated_at: new Date()
                });
              }
            }

            if (should_max_be_null == true) {
              await PositionRepository.updatePosition(element.id, {
                unique_maximum_profit: null, updated_at: element.created_at
              });

            } else {
              await PositionRepository.updatePosition(element.id, {
                unique_maximum_profit: element.unique_maximum_profit > profit ? element.unique_maximum_profit : profit
              });
            }
          } else {
            await PositionRepository.updatePosition(element.id, {
              updated_at: element.created_at,
              unique_maximum_profit: null
            });
          }




        }


        //  ------------------------------
        if (profit >= DUAL_POSITION_PROFIT) {
          if (element.maximum_profit < profit && sum_usdt_profit >= MINIMUM_PROFIT_USDT_BOTH) {
            PositionRepository.updatePosition(element.id, {
              final_status: 'thriling-both',
              maximum_profit: profit
            })
          }
        }
        if (element.final_status == 'thriling-both') {
          if (profit < element.maximum_profit - DUAL_POSITION_THRILING_STOP_PERCENT && sum_usdt_profit >= MINIMUM_PROFIT_USDT_BOTH) {
            await Promise.all([
              bingXService.closePosition(element.first_order_id),
              bingXService.closePosition(element.second_order_id)
            ]);

          }
        }

        if (profit <= DUAL_POSITION_LOSS) {
          await Promise.all([
            bingXService.closePosition(element.first_order_id),
            bingXService.closePosition(element.second_order_id)
          ]);

        }
      } else if (element.first_order_type == 'position' && element.second_order_type != 'position') {
        let avgPrice = Number(element.first_order_api_data.avgPrice);
        let markPrice = Number(element.first_order_api_data.markPrice);
        let leverage = Number(element.first_order_api_data.leverage);
        let positionSide = element.first_order_api_data.positionSide;
        let sum_usdt_profit = Number(element.first_order_api_data.unrealizedProfit);

        let profit;
        if (positionSide === 'SHORT') {
          profit = ((avgPrice - markPrice) / avgPrice) * leverage * 100;
        } else if (positionSide === 'LONG') {
          profit = ((markPrice - avgPrice) / avgPrice) * leverage * 100;
        }
        await PositionRepository.updatePosition(element.id, {
          current_sum_profit: profit
        });
        if (profit >= SINGLE_POSITION_PROFIT) {

          if (element.first_order_profit < profit) {
            PositionRepository.updatePosition(element.id, {
              final_status: 'thriling-first',
              first_order_profit: profit
            })
          }
          if (element.second_order_symbol) {
            await bingXService.cancellOrder(element.second_order_symbol, element.second_order_id)
          }
        }

        if (element.final_status == 'thriling-first') {
          if (profit < element.first_order_profit - SINGLE_POSITION_THRILING_STOP_PERCENT) {
            await bingXService.closePosition(element.first_order_id)
            await PositionRepository.updatePosition(element.id, {
              final_status: null
            })
          }
        }

        if (profit <= SINGLE_POSITION_LOSS) {
          await Promise.all([
            bingXService.closePosition(element.first_order_id),
            bingXService.cancellOrder(element.second_order_symbol, element.second_order_id)
          ]);

        }
      } else if (element.first_order_type != 'position' && element.second_order_type == 'position') {
        let avgPrice = Number(element.second_order_api_data.avgPrice);
        let markPrice = Number(element.second_order_api_data.markPrice);
        let leverage = Number(element.second_order_api_data.leverage);
        let positionSide = element.second_order_api_data.positionSide;
        let sum_usdt_profit = Number(element.second_order_api_data.unrealizedProfit);
        let profit;
        if (positionSide === 'SHORT') {
          profit = ((avgPrice - markPrice) / avgPrice) * leverage * 100;
        } else if (positionSide === 'LONG') {
          profit = ((markPrice - avgPrice) / avgPrice) * leverage * 100;
        }
        await PositionRepository.updatePosition(element.id, {
          current_sum_profit: profit
        });


        if (profit >= SINGLE_POSITION_PROFIT) {

          if (element.second_order_profit < profit) {
            await PositionRepository.updatePosition(element.id, {
              final_status: 'thriling-first',
              second_order_profit: profit
            })
          }
          if (element.first_order_symbol) {
            await bingXService.cancellOrder(element.first_order_symbol, element.first_order_id)
          }
        }

        if (element.final_status == 'thriling-first') {
          if (profit < element.second_order_profit - SINGLE_POSITION_THRILING_STOP_PERCENT) {
            await Promise.all([
              bingXService.closePosition(element.second_order_id),
              PositionRepository.updatePosition(element.id, { final_status: null })
            ]);

          }
        }


        if (profit <= SINGLE_POSITION_LOSS && sum_usdt_profit) {
          await Promise.all([
            bingXService.cancellOrder(element.first_order_symbol, element.first_order_id),
            bingXService.closePosition(element.second_order_id)
          ]);

        }
      }

    }



    lastInProcess = await PositionRepository.lastInProcess();
    await SettingRepository.updateWaitFor(lastInProcess ? (lastInProcess.second_order_id ? 'order' : 'match') : 'order')
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
}).finally(() => {
  knexInstance.destroy()
});
