var app = angular.module('searchStock', ['ngSanitize', 'ngAnimate', 'ngMaterial']);
    app.service('ResultDisplayer', function() {
      this.create_detail_table = function(responseData) {
        // process response and return a table html string
        var arrowUrl = (parseFloat(responseData.change) >= 0) ? "http://cs-server.usc.edu:45678/hw/hw8/images/Up.png" : "http://cs-server.usc.edu:45678/hw/hw8/images/Down.png";
        var colorClass = (parseFloat(responseData.change) >= 0) ? "green" : "red";
        var daysRange = "Day's Range";
        var detail_table = "";
        // TODO close and last price icon position, facebook button disable...
        var isTrading = responseData.isTrading;  
        detail_table += "<table class='table table-striped detail-table'><tbody>";
        detail_table += "<tr><th>Stock Ticker Symbol" + "</th><td>" + responseData.symbol + "</td></tr>";
        detail_table += "<tr><th>Last Price" + "</th><td>" + responseData.last_price + "</td></tr>";
        detail_table += "<tr><th>Change (Change Percent)" + "</th><td class='" + colorClass + "' >" + responseData.change + " (" + responseData.change_percent + ")" + "<img src='" + arrowUrl + "'/>" + "</td></tr>";
        detail_table += "<tr><th>Timestamp" + "</th><td>" + responseData.timestamp + "</td></tr>";
        detail_table += "<tr><th>Open" + "</th><td>" + responseData.open + "</td></tr>";
        if(isTrading) {
          detail_table += "<tr><th>Previous Close" + "</th><td>" + responseData.prev_close + "</td></tr>";
        } else {
          detail_table += "<tr><th>Close" + "</th><td>" + responseData.close + "</td></tr>";
        }
        detail_table += "<tr><th>" + daysRange + "</th><td>" + responseData.range + "</td></tr>";
        detail_table += "<tr><th>Volume" + "</th><td>" + responseData.volume + "</td></tr>";
        detail_table += "</tbody></table>";
        return detail_table;
      }
      
      this.create_indicator_charts = function(indicatorData, indicatorType) {
        // based on indicator type, extract data and use highcharts to create charts
        // TODO tickinterval
        var containerID = indicatorType + "-chart-container";   
        var title = {
          text: indicatorData.title
        };
        var subtitle = {
          text: "<a class='indicator' href='https://www.alphavantage.co/' target='_blank'>Source: Alpha Vantage</a>",
          useHTML: true,
        };
        var xAxis = {
          tickInterval: 5,
          categories: indicatorData.xValue,
          labels: {
            rotation: -45,
          }
        };
        var yAxis = {};
        if(indicatorType != "Price") {
          yAxis.title = {
            text: indicatorType,
          };
        } else {
          yAxis = [];
          yAxisSub1 = {
            title: {
              text: "Stock Price",
            },
          };
          yAxisSub2 = {
            title: {
              text: "Volume",
            },
            opposite: true,
          };
          yAxis.push(yAxisSub1);
          yAxis.push(yAxisSub2);
        }
        var series = [];
        if(indicatorType == "Price") {
          var seriesDataPrice = {
            name: "Price",
            color: "rgba(0,0,220,0.8)",
            fillColor: "rgba(0,0,255,0.2)",
            data: indicatorData.yValue.price,
            tooltip: {
              valueDecimals: 2,
            },
            type: "area", 
          };
          var seriesDataVolume = {
            name: "Volume",
            color: "red",
            data: indicatorData.yValue.volume,
            type: "column",
            yAxis: 1,
          };
          series.push(seriesDataPrice);
          series.push(seriesDataVolume);
        } else if(indicatorType == "STOCH") {
          var seriesDataK = {
            name: indicatorData.symbol + " SlowK",
            color: "DodgerBlue",
            data: indicatorData.yValue.SlowK,
          };
          var seriesDataD = {
            name: indicatorData.symbol + " SlowD",
            color: "black",
            data: indicatorData.yValue.SlowD,
          };
          series.push(seriesDataD);
          series.push(seriesDataK);     
        } else if(indicatorType == "MACD") {
          var seriesDataMACD = {
            name: indicatorData.symbol + " MACD",
            color: "DodgerBlue",
            data: indicatorData.yValue.MACD,
          };
          var seriesDataHist = {
            name: indicatorData.symbol + " MACD_Hist",
            color: "black",
            data: indicatorData.yValue.MACD_Hist,
          };
          var seriesDataSig = {
            name: indicatorData.symbol + " MACD_Signal",
            color: "orange",
            data: indicatorData.yValue.MACD_Signal,
          };
          series.push(seriesDataMACD);
          series.push(seriesDataHist);
          series.push(seriesDataSig);
        } else if(indicatorType == "BBANDS") {
          var seriesDataLow = {
            name: indicatorData.symbol + " Real Lower Band",
            color: "DodgerBlue",
            data: indicatorData.yValue['Real Lower Band'],
          };
          var seriesDataMid = {
            name: indicatorData.symbol + " Real Middle Band",
            color: "black",
            data: indicatorData.yValue['Real Middle Band'],
          };
          var seriesDataUp = {
            name: indicatorData.symbol + " Real Upper Band",
            color: "orange",
            data: indicatorData.yValue['Real Upper Band'],
          };
          series.push(seriesDataMid);
          series.push(seriesDataUp);
          series.push(seriesDataLow);
        } else {
          var seriesData = {
            name: indicatorData.symbol,
            color: "DodgerBlue",
            data: indicatorData.yValue[indicatorType],
          };
          series.push(seriesData);
        }
        
        var options = {
          chart: {
            zoomType: 'x'
          },
          title: title,
          subtitle: subtitle,
          yAxis: yAxis,
          xAxis: xAxis,
          series: series,
        };
        
        return Highcharts.chart(containerID, options);
      }
      
      this.create_history_chart = function(historyData, isMobile) {
        var containerID = 'history-chart-container';
        var title = {
          text: historyData.title,
        };
        var subtitle = {
          text: "<a class='indicator' href='https://www.alphavantage.co/' target='_blank'>Source: Alpha Vantage</a>",
          useHTML: true,
        };
        var yAxis = {
          title: {
            text: "Stock Value",
          }
        };
        var seriesData = {
          type: "area",
          data: historyData.data,
          name: historyData.symbol,
        }
        var rangeSelector = {
          selected: 0,
          buttons: [{
              type: 'week',
              count: 1,
              text: '1w'
          }, {
              type: 'month',
              count: 1,
              text: '1m'
          }, {
              type: 'month',
              count: 3,
              text: '3m'
          }, {
              type: 'month',
              count: 6,
              text: '6m'
          }, {
              type: 'ytd',
              text: 'YTD'
          }, {
              type: 'year',
              count: 1,
              text: '1y'
          }, {
              type: 'all',
              text: 'All'
          }],
        }
        if(isMobile) {
          rangeSelector.buttons = [{
                type: 'month',
                count: 1,
                text: '1m'
            }, {
                type: 'month',
                count: 3,
                text: '3m'
            }, {
                type: 'month',
                count: 6,
                text: '6m'
            }, {
                type: 'year',
                count: 1,
                text: '1y'
            }, {
                type: 'all',
                text: 'All'
            }];
          rangeSelector.inputEnabled = false;
        }
        var options = {
          yAxis: yAxis,
          title: title,
          subtitle: subtitle,
          series: [seriesData],
          rangeSelector: rangeSelector,
          tooltip: {
            formatter: function () {
              var s = Highcharts.dateFormat('%A, %b %e, %Y', this.x);
              $.each(this.points, function () {
                  s += '<br/><span style="color:' + this.color+ '">\u25CF</span>' + this.series.name +': <b>' + this.y + '</b>';
              });
              return s;
            }
          } 
        };
      
        Highcharts.stockChart(containerID, options);
      }
    });
    app.controller('searchCtrl', function($scope, $http, $interval, $window, ResultDisplayer){
      $(window).resize(function() {
        $scope.check_is_mobile();
      });
      
      $scope.search = {
        symbolInput : "",
        isSearched: false,
      };
      $scope.progress = {
        isDetailsInProg: false,
        isIndicPriceInProg: false,
        isIndicSMAInProg: false,
        isIndicEMAInProg: false,
        isIndicSTOCHInProg: false,
        isIndicRSIInProg: false,
        isIndicADXInProg: false,
        isIndicCCIInProg: false,
        isIndicBBANDSInProg: false,
        isIndicMACDInProg: false,
        isHistoryInProg: false,
        isNewsInProg: false
      };
      $scope.ready = {
        isDetailsReady: false,
        isIndicPriceReady: false,
        isIndicSMAReady: false,
        isIndicEMAReady: false,
        isIndicSTOCHReady: false,
        isIndicRSIReady: false,
        isIndicADXReady: false,
        isIndicCCIReady: false,
        isIndicBBANDSReady: false,
        isIndicMACDReady: false,
        isHistoryReady: false,
        isNewsReady: false
      };
      $scope.error = {
        isDetailsError: false,
        isIndicPriceError: false,
        isIndicSMAError: false,
        isIndicEMAError: false,
        isIndicSTOCHError: false,
        isIndicRSIError: false,
        isIndicADXError: false,
        isIndicCCIError: false,
        isIndicBBANDSError: false,
        isIndicMACDError: false,
        isHistoryError: false,
        isNewsError: false
      };
      
      $scope.table = {
        detail_table: ""
      };
      $scope.view = {
        isMobile: false,
        show_favorite: true,
        tabs: [
          {type: "Price", href: "#price", active: "active"},
          {type: "SMA", href:"#sma", active:"active"},
          {type: "EMA", href:"#ema", active:"active"},
          {type: "STOCH", href:"#stoch", active:"active"},
          {type: "RSI", href:"#rsi", active:"active"},
          {type: "ADX", href:"#adx", active:"active"},
          {type: "CCI", href:"#cci", active:"active"},
          {type: "BBANDS", href:"#bbands", active:"active"},
          {type: "MACD", href:"#macd", active:"active"},
        ],
        currentActiveIndex: 0,
        charts: {
          Price: null,
          EMA: null,
          SMA: null,
          STOCH: null,
          RSI: null,
          ADX: null,
          CCI: null,
          BBANDS: null,
          MACD: null
        }
      }
      $scope.favorite = {
        currentSymbol: null,
        currentSymbolData: null,
        stockData: [],
        orderPropertyName: 'null',
        reverse: "false",
      };
      $scope.newsList = [];
      // function to fetch hints
      $scope.get_hints = function() {
        var hintConfig = {
          params: {
            symbol: $scope.search.symbolInput,
            type: "autocomplete",
          }
        }
        return $http.get("/", hintConfig).then(function(response) {
          var responseJson = response.data;
          
          if(responseJson.status_code == 200) {
            var responseData = responseJson.data;
            if(responseData != null) {
              return responseData;
            } else {
              return [];
            }
          } else {
            // server to api error
            return [];
          }
        }, function(error_response) {
          // client to server error 
          return [];
        })
      }
      // function to submit the user input symbol to back-end and 
      $scope.submit = function(symbol) {
        $scope.search.symbolInput = symbol;
        $scope.search.isSearched = true;
        $scope.view.show_favorite = false;
        // slide two panels
        // make table and charts invisible, and error disappear
        for(var key in $scope.ready) {
          $scope.ready[key] = false;
        }
        for(var key in $scope.error) {
          $scope.error[key] = false;
        }
        // make progress bar visible
        for(var key in $scope.progress) {
          $scope.progress[key] = true;
        }
        // current stock detail ajax
        var detailConfig = {
            params: {
              symbol: symbol,
              type: "stock_detail"
            }
          }
        $http.get("/", detailConfig).then(function(response){
          var responseJson = response.data;
          $scope.progress.isDetailsInProg = false;
          $scope.error.isDetailsError = false;
          $scope.ready.isDetailsReady = false;
          $scope.favorite.currentSymbol = null;
          $scope.favorite.currentSymbolData = null;
          if(responseJson.status_code == 200) {
            var responseData = responseJson.data;
            // check if data is null, if so display error
            if(responseData == null) {
              $scope.error.isDetailsError = true;
              return ;
            } else {
              $scope.ready.isDetailsReady = true;
            }
            $scope.table.detail_table = ResultDisplayer.create_detail_table(responseData);
            $scope.favorite.currentSymbol = responseData.symbol;
            $scope.favorite.currentSymbolData = responseData;
          } else {
            // server to api error
            $scope.error.isDetailsError = true;
          }
        }, function(error_response) {
          // client to back-end error
          $scope.progress.isDetailsInProg = false;
          $scope.error.isDetailsError = true;
        });
        // indicator ajax
        var indicators = ['Price', 'EMA', 'SMA', 'STOCH', 'RSI', 'ADX', 'CCI', 'BBANDS', 'MACD'];
        for(var index in indicators) {
          var indicator = indicators[index];
          var config = {
            params: {
              symbol: symbol,
              type: "indicator",
              option: indicator
            }
          }
          $http.get("/", config).then(function(response) {
            // fetch indicator type from config, preventing pollution
            var responseJson = response.data;
            var indicator = response.config.params.option;
            var errorKey = "isIndic" + indicator + "Error";
            var inProgressKey = "isIndic" + indicator + "InProg";
            var readyKey = "isIndic" + indicator + "Ready";
            $scope.progress[inProgressKey] = false;
            $scope.error[errorKey] = false;
            $scope.ready[readyKey] = false;
            if(responseJson.status_code == 200) {
              var responseData = responseJson.data;
              if(responseData == null) {
                $scope.error[errorKey] = true;
                return;
              } else {
                $scope.ready[readyKey] = true;
                $scope.view.charts[indicator] = ResultDisplayer.create_indicator_charts(responseData, indicator);
              }
            } else {
              // server to api error
              $scope.error[errorKey] = true;
            }
          }, function(error_response) {
            // client to back-end error
            var errorKey = "isIndic" + indicator + "Error";
            var inProgressKey = "isIndic" + indicator + "InProg";
            $scope.progress[inProgressKey] = false;
            $scope.error[errorKey] = true;
          });
        }
        // news feed ajax
        var newsConfig = {
          params: {
            symbol: symbol,
            type: "news"
          }
        }
        $http.get("/", newsConfig).then(function(response){
          $scope.progress.isNewsInProg = false;
          $scope.error.isNewsError = false;
          $scope.ready.isNewsReady = false;
          var responseJson = response.data;
          if(responseJson.status_code == 200) {
            $scope.ready.isNewsReady = true;
            $scope.newsList = responseJson.data;
          } else {
            // server to api error
            $scope.error.isNewsError = true;
          }
        }, function(response) {
          // client to back-end error 
          $scope.progress.isNewsInProg = false;
          $scope.error.isNewsError = true;
        });
        // stock history ajax
        var historyConfig = {
          params: {
            symbol: symbol,
            type: "stock_history",
          }
        };
        $http.get("/", historyConfig).then(function(response) {
          var responseJson = response.data;
          $scope.progress.isHistoryInProg = false;
          if(responseJson.status_code == 200) {
            var responseData = responseJson.data;
            if(responseData == null) {
              $scope.error.isHistoryError = true;
              return ;
            } else {
              $scope.error.isHistoryError = false;
              $scope.ready.isHistoryReady = true;
              ResultDisplayer.create_history_chart(responseData, $scope.view.isMobile);
            }
          } else {
            // server to api error
            $scope.error.isHistoryError = true;
          }
          
        }, function(response) {
          // client to back-end error
          $scope.progress.isHistoryInProg = false;
          $scope.error.isHistoryError = true;
        });
      }
      // function to clear user input and slide out detail panel and 
      // slide in favorite panel 
      $scope.clear = function(){ 
        $scope.searchForm.$setUntouched();
        $scope.search.symbolInput = "";
        $scope.search.isSearched = false;
        $scope.view.show_favorite = true;
      }

      $scope.set_active = function(index) {
        $scope.view.currentActiveIndex = index;
      }
      $scope.strip_format_float = function(num_str) {
        return parseFloat(num_str.replace(/\,/g,''));
      }
      $scope.enable_facebook = function() {
        var readyKey = "isIndic" + $scope.view.tabs[$scope.view.currentActiveIndex].type + "Ready";
        return $scope.ready[readyKey];
      }
      $scope.post_facebook = function() {
        var indicatorType = $scope.view.tabs[$scope.view.currentActiveIndex].type;
        var options = $scope.view.charts[indicatorType].options;
        var data = {
          options: JSON.stringify(options),
          filename: "hello",
          type: 'image/png',
          async: true
        };
        var exportUrl = 'http://export.highcharts.com/';
        $http({
          url: "/",
          method: "POST",
          data: data
        }).then(function(response){
          var responseJson = response.data;
          if(responseJson.status_code == 200 && responseJson.image_identity != null) {
            var imageIndentity = responseJson.image_identity;
            exportUrl += imageIndentity;
            FB.ui({
              app_id: 126511018033797, 
              method: 'feed',
              display: 'popup',
              picture: exportUrl,
            }, (response) => {
              if (response && !response.error_message) {
                alert("Posted Successfully");
              } else {
                alert("Not Posted");
              }
            }); 
          }
        }, function(error_response) {
          
        });
//        $.post(exportUrl, data, function(data) {
//            exportUrl += data;
//            FB.ui({
//              app_id: 1884682165182321, 
//              method: 'feed',
//              display: 'popup',
//              picture: exportUrl,
//            }, (response) => {
//              if (response && !response.error_message) {
//                alert("Posted Successfully");
//              } else {
//                alert("Not Posted");
//              }
//            }); 
//        });
      }
      $scope.extract_for_favorite = function(stock_detail_data) {
        var arrowUrl = (parseFloat(stock_detail_data.change) >= 0) ? "http://cs-server.usc.edu:45678/hw/hw8/images/Up.png" : "http://cs-server.usc.edu:45678/hw/hw8/images/Down.png";
        var colorClass = (parseFloat(stock_detail_data.change) >= 0) ? "green" : "red";
        var changeHtml = "<span class='" + colorClass + "'>" + stock_detail_data.change + " (" + stock_detail_data.change_percent + ") <img src='" + arrowUrl + "'/>" + "</span>";
        var formatted_favorite_data = {
          price: $scope.strip_format_float(stock_detail_data.last_price),
          priceStr: stock_detail_data.last_price,
          change: $scope.strip_format_float(stock_detail_data.change),
          changeStr: stock_detail_data.change,
          changePercent: $scope.strip_format_float(stock_detail_data.change_percent_num),
          changePercentStr: stock_detail_data.change_percent,
          changeHtml: changeHtml,
          volume: $scope.strip_format_float(stock_detail_data.volume),
          volumeStr: stock_detail_data.volume,
        };
        return formatted_favorite_data;
      }
      $scope.refresh_favorite = function() {
        var favorite_list_length = $scope.favorite.stockData.length;
        for(var index = 0; index < favorite_list_length; ++index) {
          var stock_symbol = $scope.favorite.stockData[index].symbol;
          var refresh_config = {
            params: {
              symbol: stock_symbol,
              type: "stock_detail"
            }
          };
          $http.get("/", refresh_config).then(function(response) {
            var responseJson = response.data;
            if(responseJson.status_code == 200) {
              var responseData = responseJson.data;
              if(responseData != null) {
                var stock_symbol = response.config.params.symbol;
                // only if this symbol is favorited, update data in the stockData array
                var index = $scope.get_symbol_index_from_favorite_list(stock_symbol);
                if(index != -1) {
                  $scope.favorite.stockData[index].data = $scope.extract_for_favorite(responseData);
                }

              } else {
                // TODO invalid symbol error possible?
                // use previously updated data instead of showing N/A
              }
            } else {
              // server to api 5xx error
              // use previously updated data instead of showing N/A
            }
          }, function(error_response){
            // client to backend error
            // use previously updated data instead of showing N/A
          });
        }
      }
      $scope.get_favorite_from_local = function() {
        if (typeof(Storage) !== "undefined") {
          var favorite_list = localStorage.getItem("favorite_list");
          if(!favorite_list) {
            return [];
          } else {
            return JSON.parse(favorite_list);
          }
        } else {
            console.log("Sorry, your browser does not support Web Storage...");
        }
      }
      $scope.set_favorite_from_local = function(new_list) {
        if (typeof(Storage) !== "undefined") {
          localStorage.setItem("favorite_list", JSON.stringify(new_list));
        } else {
            console.log("Sorry, your browser does not support Web Storage...");
        }
      }
      $scope.toggle_favorite = function() {
        var favorite_list = $scope.get_favorite_from_local();
        var target_index = favorite_list.indexOf($scope.favorite.currentSymbol);
        if(target_index != -1) {
          // if already favorited, remove from the list and remove from stockData for favorite
          favorite_list.splice(target_index, 1);
          var index = $scope.get_symbol_index_from_favorite_list($scope.favorite.currentSymbol);
          if(index != -1) {
            $scope.favorite.stockData.splice(index, 1);
          }
        } else {
          // if not favorited, add to the favorite list and add to stockData for favorite
          favorite_list.push($scope.favorite.currentSymbol);
          $scope.favorite.stockData.push({
            symbol: $scope.favorite.currentSymbol,
            data: $scope.extract_for_favorite($scope.favorite.currentSymbolData)
          });
        }
        $scope.set_favorite_from_local(favorite_list);
      }
      
      $scope.remove_favorite = function(symbol) {
        var favorite_list = $scope.get_favorite_from_local();
        var target_index = favorite_list.indexOf(symbol);
        favorite_list.splice(target_index, 1);
        var index = $scope.get_symbol_index_from_favorite_list(symbol);
        if(index != -1) {
          $scope.favorite.stockData.splice(index, 1);
        }
        $scope.set_favorite_from_local(favorite_list);
        
      }
      $scope.check_current_favorited = function() {
        var index = $scope.get_symbol_index_from_favorite_list($scope.favorite.currentSymbol);
        return index != -1;
      }
      $scope.get_symbol_index_from_favorite_list = function(symbol) {
        var favoriteListLength = $scope.favorite.stockData.length;
        for(var index = 0; index < favoriteListLength; ++index) {
          if(symbol == $scope.favorite.stockData[index].symbol) {
            return index;
          }
        }
        return -1;
      }
      var promise = null;
      // TODO 
      $scope.toggle_auto_refresh = function(isAutoRefreshActive) {
        if(isAutoRefreshActive) {
          promise = $interval($scope.refresh_favorite, 5000);
        } else {
          $interval.cancel(promise);
        }
      }
      
      $scope.check_is_mobile = function() {
        if($window.innerWidth < 768)
          $scope.view.isMobile = true;
        else 
          $scope.view.isMobile = false;
      }
      
      // get favorite list when starting
      var favorite_list = $scope.get_favorite_from_local();
      // initialize stockData with favorited symbols as keys
      for(var index in favorite_list) {
        $scope.favorite.stockData.push({
          symbol: favorite_list[index],
          data: null,
        });
      }
      // get stock data for these symbols
      $scope.refresh_favorite();
      $scope.check_is_mobile();
    });
      $(document).ready(function() {
        $('#toggle-refresh').change(function() {
          angular.element(document.getElementById('app')).scope().toggle_auto_refresh(this.checked);
        });
      });