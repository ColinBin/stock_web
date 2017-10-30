// libraries
const express = require('express');
const app = express();
// to serve static files such as the css
app.use(express.static('public'));

var moment = require('moment-timezone');
var fs = require('fs');
var path = require('path');
var dateformat = require('dateformat');
var request = require('request');
var xml_parser = require('xml2js').parseString;

// api related
var alpha_api_key = "N8WQUGU3FLDHHNUV";
var alpha_base_url = "https://www.alphavantage.co/query"; 
var news_base_url = "https://seekingalpha.com/api/sa/combined/";
var markit_base_url = "http://dev.markitondemand.com/MODApis/Api/v2/Lookup/json"

var port = process.env.PORT || 3000

// html file name
var stock_html_file_name = "/stock.html";

app.get('/', function(req, res) {
  if(Object.keys(req.query).length != 0) {
    log(req.url);
    if("type" in req.query && "symbol" in req.query) {
      var type = req.query.type;
      var symbol = req.query.symbol;
      // get data based on request types
      if(type == "news") {
        retrieve_and_send_news(res, symbol);
      } else if(type == "stock_detail"){
        retrieve_and_send_stock_detail(res, symbol);
      } else if(type == "indicator") {
        if("option" in req.query) {
          retrieve_and_send_indicator(res, symbol, req.query.option);
        } else {
          res.send({"msg" : "Bad Request(No indicator type provided)"});
        }
      } else if(type == "stock_history") {
        retrieve_and_send_stock_history(res, symbol);
      } else if(type == 'autocomplete') {
        retrieve_and_send_suggestions(res, symbol);
      }
    } else {
      res.send({"msg" : "Bad Request(No symbol or type parameters)"});
    }
  } else {
    res.sendFile(path.join(__dirname + stock_html_file_name));
    log("Stock html file served");
  }
})

app.listen(port, function() {
  log("Listening on port " + port);
})

function log(msg) {
  console.log(dateformat(new Date, "yy-mm-dd hh:MM:ss----") +msg);
}

function retrieve_and_send_suggestions(res, input) {
  var markit_result = {};
  var params = {
    'input': input,
  };
  request({
    url: markit_base_url,
    qs: params,
    method: "GET"
  }, function(error, response, body) {
    markit_result.status_code = response.statusCode;
    try {
      var parsedData = JSON.parse(body);
      markit_result.data = parsedData;
    } catch(err) {
      log(err);
      markit_result.data = null;
    }
    res.send(markit_result);
  });
}

// get full size stock value (at most 1000)
function retrieve_and_send_stock_history(res, symbol) {
  var stock_history_result = {};
  var params = {
    "function" : "TIME_SERIES_DAILY",
    "symbol" : symbol,
    "apikey" : alpha_api_key,
    "outputsize": "full",
  };
  request({
    url: alpha_base_url,
    qs: params,
    method: "GET"
  }, function(error, response, body) {
    stock_history_result.status_code = response.statusCode;
    try {
      var parsedData = JSON.parse(body);
      if(Object.keys(parsedData).length == 0 || "Error Message" in parsedData) {
        stock_history_result.data = null;
      } else {
        stock_history_result.data = get_stock_history(parsedData);
      }
    } catch(err) {
      log(err);
      stock_history_result.data = null;
    }
    
    res.send(stock_history_result);
  });
}

function get_stock_history(full_stock_history_data) {
  var formatted_stock_history_data = {
    symbol: full_stock_history_data['Meta Data']['2. Symbol'],
    title: full_stock_history_data['Meta Data']['2. Symbol'] + " Stock Value",
    data: [],
  };
  var keys = Object.keys(full_stock_history_data['Time Series (Daily)']);
  for(var index = 0; index < 1000; ++index) {
    // TODO make sure the date is right in terms of timezone
    var time_key = keys[index];
    var current_date = new Date(time_key);
    formatted_stock_history_data.data.unshift([current_date.getTime(), parseFloat(full_stock_history_data['Time Series (Daily)'][time_key]['4. close'])]);
  }
  return formatted_stock_history_data;
}

// use alpha api to indicator data for one some type
function retrieve_and_send_indicator(res, symbol, indicator_type) {
  var indicator_url = alpha_base_url + "?";
  if(indicator_type == 'Price') {
    indicator_url += "function=TIME_SERIES_DAILY&symbol=" + symbol + "&outputsize=full&apikey=" + alpha_api_key;
  } else if(indicator_type == 'SMA') {
    indicator_url += "function=SMA&symbol=" + symbol + "&interval=daily&time_period=10&series_type=close&apikey=" + alpha_api_key; 
  } else if(indicator_type == 'EMA') {
    indicator_url += "function=EMA&symbol=" + symbol + "&interval=daily&time_period=10&series_type=close&apikey=" + alpha_api_key;
  } else if(indicator_type == 'STOCH') {
    indicator_url += "function=STOCH&symbol=" + symbol + "&interval=daily&slowkmatype=1&slowdmatype=1&apikey=" + alpha_api_key;
  } else if(indicator_type == 'RSI') {
    indicator_url += "function=RSI&symbol=" + symbol + "&interval=daily&time_period=10&series_type=close&apikey=" + alpha_api_key;
  } else if(indicator_type == 'ADX') {
    indicator_url += "function=ADX&symbol=" + symbol + "&interval=daily&time_period=10&apikey=" + alpha_api_key;
  } else if(indicator_type == 'CCI') {
    indicator_url += "function=CCI&symbol=" + symbol + "&interval=daily&time_period=10&apikey=" + alpha_api_key;
  } else if(indicator_type == 'BBANDS') {
    indicator_url += "function=BBANDS&symbol=" + symbol + "&interval=daily&time_period=5&series_type=close&nbdevup=3&nbdevdn=3&apikey=" + alpha_api_key;
  } else if(indicator_type == 'MACD') {
    indicator_url += "function=MACD&symbol=" + symbol + "&interval=daily&series_type=close&apikey=" + alpha_api_key; 
  } else {
    res.send({"msg" : "Bad Request(Invalid indicator type)"});
  }
  request({
    url: indicator_url,
    method: "GET"
  }, function(error, response, body) {
    var indicator_result = {};
    indicator_result.status_code = response.statusCode;
    // client should check both status code and if json data is null to ensure the symobl is valid
    if(response.statusCode == 200) {
      // if there is not matching symbol
      // use try catch to avoid invalid json data
      try {
        var parsedData = JSON.parse(body);
        if(Object.keys(parsedData).length == 0 || !('Meta Data' in parsedData)) {
          indicator_result.data = null;
        } else {
          indicator_result.data = get_trimmed_indicator_data(indicator_type, parsedData);
        }
      } catch(err) {
        log(err);
        indicator_result.data = null;
      }
    }
    res.send(indicator_result);
  })
}

function get_trimmed_indicator_data(indicator_type, full_indicator_data) {
  var max_data_count = 121;
  var trimmed_indicator_data = {};
  var series_data_key = "";
  if(indicator_type == "Price") {
    series_data_key = "Time Series (Daily)";   
    trimmed_indicator_data['title'] = full_indicator_data['Meta Data']['2. Symbol'] + " Stock Price and Volume";
    trimmed_indicator_data['symbol'] = full_indicator_data['Meta Data']['2. Symbol'];  
  } else {
    series_data_key = "Technical Analysis: " + indicator_type;
    trimmed_indicator_data['title'] = full_indicator_data['Meta Data']['2: Indicator'];
    trimmed_indicator_data['symbol'] = full_indicator_data['Meta Data']['1: Symbol'];
  }
  var series_data = full_indicator_data[series_data_key];
  trimmed_indicator_data.xValue = [];
  trimmed_indicator_data.yValue = {};
  if(indicator_type == "Price") {
    trimmed_indicator_data.yValue.price = [];
    trimmed_indicator_data.yValue.volume = [];
  } else if(indicator_type == "STOCH") {
    trimmed_indicator_data.yValue.SlowK = [];
    trimmed_indicator_data.yValue.SlowD = [];
  } else if(indicator_type == "MACD") {
    trimmed_indicator_data.yValue.MACD = [];
    trimmed_indicator_data.yValue.MACD_Hist = [];
    trimmed_indicator_data.yValue.MACD_Signal = [];
  } else if(indicator_type == "BBANDS") {
    trimmed_indicator_data.yValue["Real Lower Band"] = [];
    trimmed_indicator_data.yValue['Real Upper Band'] = [];
    trimmed_indicator_data.yValue['Real Middle Band'] = [];
  } else {
    trimmed_indicator_data.yValue[indicator_type] = [];
  }
  var keys = Object.keys(series_data);
  for(var i = 0; i < max_data_count; ++i) {
    var curr_data = series_data[keys[i]];
    // TODO change the format of date
    
    var unformatted_date = keys[i];
    trimmed_indicator_data.xValue.unshift(dateformat(new Date(unformatted_date), "mm/dd"));
    if(indicator_type == "Price") {
      trimmed_indicator_data.yValue.price.unshift(parseFloat(curr_data['4. close']));
      trimmed_indicator_data.yValue.volume.unshift(parseFloat(curr_data['5. volume']));
    } else if(indicator_type == "STOCH") {
      trimmed_indicator_data.yValue.SlowK.unshift(parseFloat(curr_data.SlowK));
      trimmed_indicator_data.yValue.SlowD.unshift(parseFloat(curr_data.SlowD));
    } else if(indicator_type == "BBANDS") {
      trimmed_indicator_data.yValue["Real Lower Band"].unshift(parseFloat(curr_data["Real Lower Band"]));
      trimmed_indicator_data.yValue['Real Upper Band'].unshift(parseFloat(curr_data['Real Upper Band']));
      trimmed_indicator_data.yValue['Real Middle Band'].unshift(parseFloat(curr_data['Real Middle Band']));
    } else if(indicator_type == "MACD") {
      trimmed_indicator_data.yValue.MACD.unshift(parseFloat(curr_data.MACD));
      trimmed_indicator_data.yValue.MACD_Hist.unshift(parseFloat(curr_data.MACD_Hist));
      trimmed_indicator_data.yValue.MACD_Signal.unshift(parseFloat(curr_data.MACD_Signal));
    } else {
      trimmed_indicator_data.yValue[indicator_type].unshift(parseFloat(curr_data[indicator_type]));
    }
  }
  return trimmed_indicator_data;
}

function retrieve_and_send_stock_detail(res, symbol) {
  var stock_detail_result = {};
  var params = {
    "function" : "TIME_SERIES_DAILY",
    "symbol" : symbol,
    "apikey" : alpha_api_key
  };
  request({
    url: alpha_base_url,
    qs: params,
    method: "GET"
  }, function(error, response, body) {
    stock_detail_result.status_code = response.statusCode;
    try {
      var parsedData = JSON.parse(body);
       if(Object.keys(parsedData).length == 0 || "Error Message" in parsedData) {
          stock_detail_result.data = null;
        } else {
          stock_detail_result.data = get_stock_info(parsedData);
        }
    } catch(err) {
      log(err);
      stock_detail_result.data = null;
    }
   
    res.send(stock_detail_result);
  });
}

function get_stock_info(full_stock_data) {
  // TODO transform the timestamp
  var compact_stock_data = {
    "symbol" : full_stock_data['Meta Data']['2. Symbol'],
    "timestamp" : full_stock_data['Meta Data']['3. Last Refreshed'] + " EDT",
    "timezone" : full_stock_data['Meta Data']['5. Time Zone']
  };
  var keys = Object.keys(full_stock_data['Time Series (Daily)']);

  var last_day_data = full_stock_data['Time Series (Daily)'][keys[0]];
  var second_last_day_data = full_stock_data['Time Series (Daily)'][keys[1]];
  
  var close = parseFloat(last_day_data['4. close']);
  var prev_close = parseFloat(second_last_day_data['4. close']);
  var open = parseFloat(last_day_data['1. open']);
  var low = parseFloat(last_day_data['3. low']);
  var high = parseFloat(last_day_data['2. high']);
  var volume = parseInt(last_day_data['5. volume']);
  compact_stock_data.close = close.toFixed(2);
  compact_stock_data.open = open.toFixed(2);
  compact_stock_data.volume = volume.toLocaleString('en');
  compact_stock_data.range = low.toFixed(2) + "-" + high.toFixed(2);
  compact_stock_data.prev_close = prev_close.toFixed(2);
  compact_stock_data.change = (close - prev_close).toFixed(2);
  compact_stock_data.change_percent = (((close - prev_close) / prev_close) * 100).toFixed(2) + "%";
  return compact_stock_data;
}

function retrieve_and_send_news(res, symbol) {
  var news_full_url = news_base_url + symbol + ".xml";
  request({
    url: news_full_url,
    method: "GET"
  }, function(error, response, body) {
    var news_result = {};
    news_result.status_code = response.statusCode;
    if(response.statusCode == 200) {
      // when valid stock symbol, attach news list
      news_result.data = get_parsed_news_list(body);
    } 
    res.send(news_result);
  });
}

function get_parsed_news_list(xml_data) {
  var news_list = [];
  xml_parser(xml_data, function(err, result) {
        var item_list = result.rss.channel[0].item;
        var news_count = 0;
        for(var i = 0; i < item_list.length; ++i) {
          var news_item = item_list[i];
          if(news_item.link[0].indexOf("article") != -1) {  // valid news article
            // TODO remove -0400 and transform to EDT
            var hyphen_position = news_item.pubDate[0].indexOf("-");
            var compact_news_item = {
              "link" : news_item.link[0],
              "title" : news_item.title[0],
              "date" : news_item.pubDate[0].substring(0, hyphen_position) + "EDT",
              "author" : news_item['sa:author_name'][0]
            };
            news_list.push(compact_news_item);
            ++news_count;
            if(news_count >= 5) {
              break;
            }
          }
        } 
      });
  return news_list;
}

function get_two_decimals_of_str(str_number) {
  return parseFloat(str_number).toFixed(2);
}

function get_thousand_commas_of_str(str_number) {
  return (parseFloat(str_number)).toLocaleString('en')
}