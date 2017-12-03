// libraries
const express = require('express');
const app = express();
// to serve static files such as the css
app.use(express.static('public'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

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
var markit_base_url = "http://dev.markitondemand.com/MODApis/Api/v2/Lookup/json";
var export_url = 'http://export.highcharts.com/';
var maxRetryTimes = 2;

var port = process.env.PORT || 3000;

// html file name
var stock_html_file_name = "/stock.html";

app.get('/', function(req, res) {
  if(Object.keys(req.query).length != 0) {
    log(req.url + " START");
    if("type" in req.query && "symbol" in req.query) {
      var type = req.query.type;
      var symbol = req.query.symbol;
      // get data based on request types
      if(type == "news") {
        retrieve_and_send_news(res, symbol, req.url);
      } else if(type == "stock_detail"){
        retrieve_and_send_stock_detail(res, symbol, req.url, maxRetryTimes);
      } else if(type == "indicator") {
        if("option" in req.query) {
          retrieve_and_send_indicator(res, symbol, req.query.option, req.url, maxRetryTimes);
        } else {
          res.send({"msg" : "Bad Request(No indicator type provided)"});
        }
      } else if(type == "stock_history") {
        retrieve_and_send_stock_history(res, symbol, req.url, maxRetryTimes);
      } else if(type == 'autocomplete') {
        retrieve_and_send_suggestions(res, symbol, req.url);
      }
    } else {
      res.send({"msg" : "Bad Request(No symbol or type parameters)"});
    }
  } else {
    res.sendFile(path.join(__dirname + stock_html_file_name));
    log("Stock html file served");
  }
})

app.post("/", function(req, res) {
  var data = req.body;
  request.post({url: export_url, form: data}, function(error, response, body) {
    log("Post for export DONE");
    var export_result = {};
    try {
      export_result.status_code = response.statusCode;
      if(response.statusCode == 200) {
        export_result.image_identity = body;
        res.send(export_result);
      } else {
        export_result.image_identity = null;
        res.send(export_result);
      }
    } catch(err) {
      export_result.status_code = 404;
      res.send(export_result);
    }
  })
});


app.listen(port, function() {
  log("Listening on port " + port);
})

function log(msg) {
  console.log(dateformat(new Date, "yy-mm-dd hh:MM:ss----") +msg);
}

function retrieve_and_send_suggestions(res, input, requestUrl) {
  var markit_result = {};
  var params = {
    'input': input,
  };
  request({
    url: markit_base_url,
    qs: params,
    method: "GET"
  }, function(error, response, body) {
    log(requestUrl + " DONE " + response.statusCode);
    markit_result.status_code = response.statusCode;
    if(response.statusCode == 200) {
      try {
        var parsedData = JSON.parse(body);
        var formatted_data = [];
        for(var index = 0; index < parsedData.length && index < 5; ++index) {
          formatted_data.push({
            symbol: parsedData[index].Symbol,
            full_description: parsedData[index].Symbol + " - " + parsedData[index].Name + " (" + parsedData[index].Exchange + ")",
          });
        }
        markit_result.data = formatted_data;
      } catch(err) {
        log(err);
        markit_result.data = null;
      }
    } else {
      markit_result.data = null;
    }
    res.send(markit_result);
  });
}

// get full size stock value (at most 1000)
function retrieve_and_send_stock_history(res, symbol, requestUrl, remainRequestTimes) {
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
    log(requestUrl + " DONE WITH " + response.statusCode);
    stock_history_result.status_code = response.statusCode;
    if(response.statusCode == 200) {
      try {
        var parsedData = JSON.parse(body);
        if(Object.keys(parsedData).length == 0 || "Error Message" in parsedData) {
          // if symbol is invalid, block retries
          if("Error Message" in parsedData)
            remainRequestTimes = 0;
          stock_history_result.data = null;
        } else {
          stock_history_result.data = get_stock_history(parsedData);
        }
      } catch(err) {
        log(err);
        stock_history_result.data = null;
      }
    } else {
      stock_history_result.data = null;
    }
    
    if(stock_history_result.data == null && remainRequestTimes > 0) {
      log("Retry for " + requestUrl);
      retrieve_and_send_stock_history(res, symbol, requestUrl, remainRequestTimes - 1);
    } else {
      res.send(stock_history_result);   
    }
  });
}

function get_stock_history(full_stock_history_data) {
  var formatted_stock_history_data = {
    symbol: full_stock_history_data['Meta Data']['2. Symbol'],
    title: full_stock_history_data['Meta Data']['2. Symbol'] + " Stock Value",
    data: [],
  };
  var keys = Object.keys(full_stock_history_data['Time Series (Daily)']);
  for(var index = 0; index < keys.length && index < 1000; ++index) {
    // TODO make sure the date is right in terms of timezone
    var time_key = keys[index];
    var current_date = new Date(time_key);
    formatted_stock_history_data.data.unshift([current_date.getTime(), parseFloat(parseFloat(full_stock_history_data['Time Series (Daily)'][time_key]['4. close']).toFixed(2))]);
    
  }
  return formatted_stock_history_data;
}

// use alpha api to indicator data for one some type
function retrieve_and_send_indicator(res, symbol, indicator_type, requestUrl, remainRequestTimes) {
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
    log(requestUrl + " DONE WITH " + response.statusCode);
    var indicator_result = {};
    indicator_result.status_code = response.statusCode;
    // client should check both status code and if json data is null to ensure the symobl is valid
    if(response.statusCode == 200) {
      // if there is not matching symbol
      // use try catch to avoid invalid json data
      try {
        var parsedData = JSON.parse(body);
        if(Object.keys(parsedData).length == 0 || !('Meta Data' in parsedData)) {
          // if symbol is invalid block retries
          if("Error Message" in parsedData)
            remainRequestTimes = 0;
          indicator_result.data = null;
        } else {
          indicator_result.data = get_trimmed_indicator_data(indicator_type, parsedData);
        }
      } catch(err) {
        log(err);
        indicator_result.data = null;
      }
    } else {
      indicator_result.data = null;
    }
    // if failed and is permitted to retry,
    if(indicator_result.data == null && remainRequestTimes > 0) {
      log("Retry for " + requestUrl);
      retrieve_and_send_indicator(res, symbol, indicator_type, requestUrl, remainRequestTimes - 1);
    } else {
      res.send(indicator_result);
    }
  });
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
    trimmed_indicator_data.xValue.unshift(moment.tz(unformatted_date, "America/New_York").format('MM/DD'));
    
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

function retrieve_and_send_stock_detail(res, symbol, requestUrl, remainRequestTimes) {
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
    log(requestUrl + " DONE WITH " + response.statusCode);
    stock_detail_result.status_code = response.statusCode;
    if(response.statusCode == 200) {
      try {
        var parsedData = JSON.parse(body);
        if(Object.keys(parsedData).length == 0 || "Error Message" in parsedData) {
          // if request symbol is invalid, block retries
          if("Error Message" in parsedData)
            remainRequestTimes = 0;
          stock_detail_result.data = null;
        } else {
          stock_detail_result.data = get_stock_info(parsedData);
        }
      } catch(err) {
        log(err);
        stock_detail_result.data = null;
      }
    } else {
      stock_detail_result.data = null;
    }
    // if fail to fetch data and is permitted to retry
    if(stock_detail_result.data == null && remainRequestTimes > 0) {
      log("Retry for " + requestUrl);
      retrieve_and_send_stock_detail(res, symbol, requestUrl, remainRequestTimes - 1);
    } else {
      res.send(stock_detail_result);
    }
  });
}

function get_stock_info(full_stock_data) {
  // TODO transform the timestamp
  var last_refresh_time_str = full_stock_data['Meta Data']['3. Last Refreshed'];
  var last_refresh_time = moment.tz(last_refresh_time_str, "America/New_York"); 
  var isTrading = false;
  if(last_refresh_time.hours() != 0) {
    // during trading hour
    isTrading = true;
  } else {
    // not in trading hour
    last_refresh_time.set('hour', 16);
    isTrading = false;
  }
  var timestamp = last_refresh_time.format("YYYY-MM-DD HH:mm:ss") + " EDT";
  var compact_stock_data = {
    "symbol" : full_stock_data['Meta Data']['2. Symbol'],
    "timestamp" : timestamp,
    "timezone" : full_stock_data['Meta Data']['5. Time Zone'],
    "isTrading": isTrading,
  };
  var keys = Object.keys(full_stock_data['Time Series (Daily)']);

  var last_day_data = full_stock_data['Time Series (Daily)'][keys[0]];
  var second_last_day_data = full_stock_data['Time Series (Daily)'][keys[1]];
  
  var prev_close = parseFloat(second_last_day_data['4. close']);
  var close = parseFloat(last_day_data['4. close']);
  var open = parseFloat(last_day_data['1. open']);
  var low = parseFloat(last_day_data['3. low']);
  var high = parseFloat(last_day_data['2. high']);
  var volume = parseInt(last_day_data['5. volume']);
  
  if(isTrading) {
    // use prev close data
    compact_stock_data.prev_close = get_fixed_two_and_thousand_seperator_str(prev_close);
  } else {
    // use close data on last refreshed day 
    compact_stock_data.close = get_fixed_two_and_thousand_seperator_str(close);
  }
  compact_stock_data.last_price = get_fixed_two_and_thousand_seperator_str(close);
  compact_stock_data.open = get_fixed_two_and_thousand_seperator_str(open);
  compact_stock_data.volume = volume.toLocaleString('en');
  compact_stock_data.range = get_fixed_two_and_thousand_seperator_str(low) + "-" + get_fixed_two_and_thousand_seperator_str(high);
  compact_stock_data.change = (close - prev_close).toFixed(2);
  compact_stock_data.change_percent = (((close - prev_close) / prev_close) * 100).toFixed(2) + "%";
  compact_stock_data.change_percent_num = (((close - prev_close) / prev_close) * 100).toFixed(2);
  return compact_stock_data;
}

function retrieve_and_send_news(res, symbol, requestUrl) {
  var news_full_url = news_base_url + symbol + ".xml";
  request({
    url: news_full_url,
    method: "GET"
  }, function(error, response, body) {
    log(requestUrl + " DONE WITH " + response.statusCode);
    var news_result = {};
    news_result.status_code = response.statusCode;
    if(response.statusCode == 200) {
      // when valid stock symbol, attach news list
      try {
        news_result.data = get_parsed_news_list(body);
      } catch(err) {
        log(err);
        news_result.status_code = 404;
      }
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

function get_thousand_commas_of_str(str_number) {
  return (parseFloat(str_number)).toLocaleString('en')
}
function get_fixed_two_and_thousand_seperator_str(str_number) {
  return (parseFloat(str_number)).toLocaleString('en', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}