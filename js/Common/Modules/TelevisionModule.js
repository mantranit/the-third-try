$(function () {
  window.televisionKeyboard = {
    cursorX: 0,
    cursorY: 0,
    iptvPlayer: null,
  };
  window.televisionFilterKeyboard = {
    cursor: 0,
    selected: [],
  };
  var TelevisionModule = {
    itemInRow: 4,
    timeHideTVControls: 0,
    handleKeyDown: function (event) {
      if (!$("#televisionPage").is(":visible")) {
        return;
      }
      const keyCode = event.keyCode;
      if ($("#filterChannels").is(":visible")) {
        if (window.keyboard.TOP.includes(keyCode)) {
          window.televisionFilterKeyboard.cursor = Math.max(
            window.televisionFilterKeyboard.cursor - 1,
            0
          );
        } else if (window.keyboard.BOTTOM.includes(keyCode)) {
          window.televisionFilterKeyboard.cursor = Math.min(
            window.televisionFilterKeyboard.cursor + 1,
            window.channelCategories.length
          );
        } else if (window.keyboard.ENTER.includes(keyCode)) {
          var selectedItem =
            window.channelCategories[
              window.televisionFilterKeyboard.cursor - 1
            ];
          if (selectedItem) {
            if (
              window.televisionFilterKeyboard.selected.includes(selectedItem)
            ) {
              window.televisionFilterKeyboard.selected = _.filter(
                window.televisionFilterKeyboard.selected,
                function (item) {
                  return item !== selectedItem;
                }
              );
            } else {
              window.televisionFilterKeyboard.selected.push(selectedItem);
            }
          } else {
            window.televisionFilterKeyboard.selected = [];
          }

          this.renderChannels();
          window.televisionKeyboard.cursorX = 0;
          window.televisionKeyboard.cursorY = 0;
          this.renderCursor();
        } else if (
          window.keyboard.BACK.includes(keyCode) ||
          window.keyboard.BUTTON_YELLOW.includes(keyCode)
        ) {
          $("#filterChannels").toggle();
          $("#televisionPlayer").toggle();
        }

        this.renderCategories();

        return;
      }
      // Hide filter channels
      if (window.keyboard.RIGHT.includes(keyCode)) {
        if (window.televisionKeyboard.cursorX === this.itemInRow - 1) {
          if (
            window.filteredChannels[
              (window.televisionKeyboard.cursorY + 1) * this.itemInRow
            ]
          ) {
            window.televisionKeyboard.cursorX = 0;
            window.televisionKeyboard.cursorY++;
          }
        } else {
          var nextCursorX = Math.min(
            window.televisionKeyboard.cursorX + 1,
            this.itemInRow - 1
          );
          if (
            window.filteredChannels[
              nextCursorX + window.televisionKeyboard.cursorY * this.itemInRow
            ]
          ) {
            window.televisionKeyboard.cursorX = nextCursorX;
          }
        }
      } else if (window.keyboard.LEFT.includes(keyCode)) {
        if (window.televisionKeyboard.cursorX === 0) {
          if (
            window.filteredChannels[
              this.itemInRow -
                1 +
                (window.televisionKeyboard.cursorY - 1) * this.itemInRow
            ]
          ) {
            window.televisionKeyboard.cursorX = this.itemInRow - 1;
            window.televisionKeyboard.cursorY--;
          }
        } else {
          window.televisionKeyboard.cursorX = Math.max(
            window.televisionKeyboard.cursorX - 1,
            0
          );
        }
      } else if (window.keyboard.TOP.includes(keyCode)) {
        window.televisionKeyboard.cursorY = Math.max(
          window.televisionKeyboard.cursorY - 1,
          0
        );
      } else if (window.keyboard.BOTTOM.includes(keyCode)) {
        var nextCursorY = Math.min(
          window.televisionKeyboard.cursorY + 1,
          Math.ceil(window.filteredChannels.length / this.itemInRow) - 1
        );
        if (
          !window.filteredChannels[
            window.televisionKeyboard.cursorX + nextCursorY * this.itemInRow
          ]
        ) {
          window.televisionKeyboard.cursorX =
            (window.filteredChannels.length % this.itemInRow) - 1;
        }
        window.televisionKeyboard.cursorY = nextCursorY;
      } else if (window.keyboard.ENTER.includes(keyCode)) {
        var activeChannel =
          window.filteredChannels[
            window.televisionKeyboard.cursorX +
              window.televisionKeyboard.cursorY * this.itemInRow
          ];
        if (activeChannel) {
          $("#televisionPlayer")
            .removeClass("not-fullscreen")
            .addClass("fullscreen");
        }
      } else if (window.keyboard.BACK.includes(keyCode)) {
        if ($("#televisionPlayer").hasClass("fullscreen")) {
          $("#televisionPlayer")
            .removeClass("fullscreen")
            .addClass("not-fullscreen");

          if (this.timeHideTVControls) {
            clearTimeout(this.timeHideTVControls);
          }
          if (navigator.userAgent.search(/Maple/) > -1) {
            pluginIPTV.Execute('StopCurrentChannel', 0);
						pluginIPTV.Execute('FreeNowPlayingInfo', 0);
          }
          $("#header").show();
          $("#televisionPlayerInfo").show();
        } else {
          window.televisionFilterKeyboard.selected = [];
          vm.navigateTo("#/");
        }
      } else if (window.keyboard.BUTTON_YELLOW.includes(keyCode)) {
        $("#filterChannels").toggle();
        $("#televisionPlayer").toggle();
      }

      this.renderCursor();
    },
    initIPTVPlayer: function () {
      if (!$("#televisionPage").is(":visible")) {
        return;
      }
      try {
        var activeChannel =
          window.filteredChannels[
            window.televisionKeyboard.cursorX +
              window.televisionKeyboard.cursorY * 4
          ];
        var url =
          "rtp://" +
          activeChannel.ipAddress +
          ":" +
          activeChannel.port +
          "|HW|NO_RTCP";
        console.log("=======================", url, activeChannel.name);

        // Samsung +2015
        if (navigator.userAgent.search(/Maple/) > -1) {
          pluginIPTV.Open("IPTV", "1.010", "IPTV");
          pluginObjectTVMW.SetSource(48);
          pluginIPTV.Execute("SetPlayerWindow", 0, 0, 0, 1920, 1080);

          pluginIPTV.Execute("SIInit");
          pluginIPTV.Execute("SetTuneURL", url, 0);
        }

        $("#channelTitle").html(activeChannel.name);
        $("#channelCategory").html(activeChannel.category.join(", "));
      } catch (e) {
        console.error("Error initializing video player:", e);
      }
    },
    changeSourceIPTV: function () {
      if (!$("#televisionPage").is(":visible")) {
        return;
      }
      var activeChannel =
        window.filteredChannels[
          window.televisionKeyboard.cursorX +
            window.televisionKeyboard.cursorY * 4
        ];
      if (activeChannel) {
        var url =
          "rtp://" +
          activeChannel.ipAddress +
          ":" +
          activeChannel.port +
          "|HW|NO_RTCP";
        console.log("=======================", url, activeChannel.name);
        // Samsung +2015
        if (navigator.userAgent.search(/Maple/) > -1) {
          pluginIPTV.Execute("SetTuneURL", url, 0);
        }

        $("#channelTitle").html(activeChannel.name);
        $("#channelCategory").html(activeChannel.category.join(", "));

        if ($("#televisionPlayer").hasClass("fullscreen")) {
          $("#televisionPlayerInfo").show();
          this.timeHideTVControls = setTimeout(function () {
            $("#header").fadeOut(2000);
            $("#televisionPlayerInfo").fadeOut(2000);
          }, 3000);
        }
      }
    },
    renderCursor: function () {
      if (!$("#televisionPage").is(":visible")) {
        return;
      }
      $("#televisionCursor").css({
        "-webkit-transform":
          "translate(" +
          window.televisionKeyboard.cursorX * (152 + 36) +
          "px, " +
          window.televisionKeyboard.cursorY * (123 + 36) +
          "px)",
      });

      var televisionOuter = $("#televisionContent").get(0);
      var televisionInner = $("#televisionList").get(0);
      var children = televisionInner.children;
      var child =
        children[
          window.televisionKeyboard.cursorX +
            window.televisionKeyboard.cursorY * this.itemInRow
        ];
      if (child) {
        var top = child.offsetTop;
        var bottom = top + child.clientHeight;
        var outerTop = televisionOuter.scrollTop;
        var outerBottom = outerTop + televisionOuter.clientHeight;
        if (top < outerTop) {
          televisionOuter.scrollTop = top;
        } else if (bottom > outerBottom) {
          televisionOuter.scrollTop = bottom - televisionOuter.clientHeight;
        }

        this.changeSourceIPTV();
      }
    },
    renderChannels: function () {
      if (!$("#televisionPage").is(":visible")) {
        return;
      }
      window.filteredChannels = window.channels;
      var filteredCategories = window.televisionFilterKeyboard.selected;
      if (filteredCategories.length > 0) {
        window.filteredChannels = _.filter(window.channels, function (item) {
          return _.some(filteredCategories, function (selectedItem) {
            return item.category.includes(selectedItem);
          });
        });
      }

      $("#televisionTitle").html(
        "<strong>" +
          i18njs.get("TV Channels") +
          "</strong> <span>" +
          window.filteredChannels.length +
          " of " +
          window.channels.length +
          "</span>"
      );
      $("#televisionList").empty();
      window.filteredChannels.forEach(function (item, index) {
        $("#televisionList").append(
          '<div class="television-item active"><div class="television-item-inner"><img alt="" width="152" height="86" src="' +
            item.image +
            '"></div><p class="title">' +
            item.name +
            "</p></div>"
        );
      });
    },
    renderCategories: function () {
      if (!$("#televisionPage").is(":visible")) {
        return;
      }
      if (window.televisionFilterKeyboard.selected.length > 0) {
        $("#televisionFilter").html(
          window.televisionFilterKeyboard.selected.join(", ")
        );
      } else {
        $("#televisionFilter").html(i18njs.get("Any category"));
      }
      var allActive = "";
      if (window.televisionFilterKeyboard.cursor === 0) {
        allActive = " active";
      }
      $("#filterChannels .filter-channels-inner").html(
        '<div class="filter-channels-item' +
          allActive +
          '"><div><div class="text">Any</div><div class="count">' +
          window.channels.length +
          "</div></div></div>"
      );
      window.channelCategories.forEach(function (item, index) {
        var activeCls = "",
          selectedCls = "";
        if (window.televisionFilterKeyboard.cursor === index + 1) {
          activeCls = " active";
        }
        if (window.televisionFilterKeyboard.selected.includes(item)) {
          selectedCls = " selected";
        }
        $("#filterChannels .filter-channels-inner").append(
          '<div class="filter-channels-item' +
            activeCls +
            selectedCls +
            '"><div><div class="text"><span class="icon"><svg id="btn_selected" width="65" height="59" viewBox="0 0 65 59" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M63.0403036,0.0186150948 C62.9870646,0.0318899075 62.9338256,0.0517995779 62.8805866,0.0717109475 C62.4347098,0.18453921 62.048728,0.469929843 61.8158071,0.868148738 L26.9975161,54.7073434 L3.03997644,33.1504272 C2.62071907,32.6194686 1.92195792,32.3871739 1.26312516,32.5597362 C0.604294095,32.7322969 0.118487151,33.2831668 0.0186653471,33.9535015 C-0.0811581607,34.6238379 0.224965105,35.2875361 0.803939407,35.6459322 L26.1989315,58.5833406 C26.5716043,58.9085523 27.0707201,59.0545667 27.5631798,58.9815595 C28.0556412,58.9085523 28.4882075,58.6297999 28.7544024,58.2116696 L64.6907119,2.67340773 C65.0833497,2.11590128 65.1033148,1.3791959 64.7439508,0.801779771 C64.3845886,0.224361949 63.7124452,-0.0809400538 63.0403036,0.0186150948 Z" id="Shape"></path></svg></span>' +
            item +
            '</div><div class="count">' +
            window.channelCategoriesCount[item] +
            "</div></div></div>"
        );
      });
    },
    renderPage: function () {
      $("#app").html(
        '<div id="televisionPage" class="page television-page"><div class="television-wrapper"><div class="television-container"><div class="television-left"><div class="television-header"><div class="television-title" id="televisionTitle"><strong>TV Channels</strong><span>19 of 19</span></div><div class="television-filters"><div class="television-filter-category" id="televisionFilter">Any category</div></div></div><div class="television-left-content" id="televisionContent"><div class="television-cursor" id="televisionCursor"></div><div class="television-list" id="televisionList"><div class="television-item active"><div class="television-item-inner" style="width:152px;height:86px"><img alt="" width="152" height="86" src="http://103.153.72.195:8080/channellist/icon/BBC_World_News.png"></div><p class="title">BBC WORLD NEWS</p></div></div></div></div><div class="television-right"><div class="television-right-header"><div class="television-header"><div class="television-title"><strong>&nbsp;</strong></div></div><div class="television-right-content"><div class="television-player not-fullscreen" id="televisionPlayer"><div class="television-player-header"></div><div class="television-react-player"><video width="100%" preload="auto" playsinline autoplay loop id="iptv-video"></video></div><div class="television-player-info" id="televisionPlayerInfo"><div class="channel-title" id="channelTitle">1. BBC WORLD NEWS</div><div class="channel-category" id="channelCategory">News, Drama</div><div class="television-control"><div class="television-control-content"><button><span class="icon"><svg id="btn_back" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><g fill-rule="evenodd"><path fill-rule="nonzero" d="M16.553 19H8.9c-.587 0-1.063-.452-1.063-1.01s.476-1.01 1.063-1.01h7.654c2.936 0 5.316-2.261 5.316-5.05 0-2.789-2.38-5.05-5.316-5.05H3.594l3.094 2.98c.36.4.337.998-.056 1.37a1.104 1.104 0 0 1-1.443.054L.309 6.587a.975.975 0 0 1 0-1.424L5.252.467c.237-.353.678-.53 1.11-.447.43.084.763.412.835.824a.993.993 0 0 1-.51 1.037L3.595 4.86h12.97c4.11.003 7.439 3.17 7.436 7.075-.003 3.905-3.337 7.068-7.447 7.065z"></path></g></svg></span>Back</button><button><span class="icon icon-double"><svg id="btn_volume" xmlns="http://www.w3.org/2000/svg"><g fill-rule="evenodd"><rect width="22" height="22" x="30" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect><rect width="22" height="22" x="1" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect><text font-family="ArialMT, Arial" font-size="20"><tspan x="6" y="19">+</tspan></text><text font-family="ArialMT, Arial" font-size="20"><tspan x="35" y="19">−</tspan></text></g></svg></span>Volume</button><button><span class="icon icon-double"><svg id="btn_channel" xmlns="http://www.w3.org/2000/svg"><g fill-rule="evenodd"><rect width="22" height="22" x="30" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect><path d="M12 9l4 5H8zM41 15l4-5h-8z"></path><rect width="22" height="22" x="1" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect></g></svg></span>Channels</button></div></div></div></div><div class="filter-channels" id="filterChannels" style="display:none"><div class="filter-channels-content"><div class="filter-channels-inner"><div class="filter-channels-item selected active"><div><div>Any</div><div class="count">19</div></div></div><div class="filter-channels-item"><div><div>Culture</div><div class="count">1</div></div></div></div></div></div></div></div></div></div></div><div class="left-bottom-buttons-wrapper"><div class="left-bottom-buttons"><button><span class="icon"><svg id="btn_back" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><g fill-rule="evenodd"><path fill-rule="nonzero" d="M16.553 19H8.9c-.587 0-1.063-.452-1.063-1.01s.476-1.01 1.063-1.01h7.654c2.936 0 5.316-2.261 5.316-5.05 0-2.789-2.38-5.05-5.316-5.05H3.594l3.094 2.98c.36.4.337.998-.056 1.37a1.104 1.104 0 0 1-1.443.054L.309 6.587a.975.975 0 0 1 0-1.424L5.252.467c.237-.353.678-.53 1.11-.447.43.084.763.412.835.824a.993.993 0 0 1-.51 1.037L3.595 4.86h12.97c4.11.003 7.439 3.17 7.436 7.075-.003 3.905-3.337 7.068-7.447 7.065z"></path></g></svg></span><span>Back</span></button><button><span class="icon"><svg id="btn_navigate" xmlns="http://www.w3.org/2000/svg"><g fill-rule="evenodd"><path stroke="none" fill-rule="nonzero" d="M20.8 16.043V9.949c0-.15.076-.286.199-.357a.35.35 0 0 1 .411.017l4.407 3.039a.39.39 0 0 1 .183.35.416.416 0 0 1-.183.358l-4.407 3.029a.435.435 0 0 1-.212.081.295.295 0 0 1-.2-.064.408.408 0 0 1-.198-.36zM5.2 9.949a.408.408 0 0 0-.199-.357.35.35 0 0 0-.411.017L.183 12.648a.39.39 0 0 0-.183.35.416.416 0 0 0 .183.358l4.407 3.029a.435.435 0 0 0 .212.081.295.295 0 0 0 .2-.064c.123-.07.2-.21.198-.36V9.95zM16.051 20.8c.15 0 .286.076.357.199a.35.35 0 0 1-.017.411l-3.039 4.407a.39.39 0 0 1-.35.183.416.416 0 0 1-.358-.183L9.615 21.41a.435.435 0 0 1-.081-.212.295.295 0 0 1 .064-.2c.07-.123.21-.2.36-.198h6.093zM16.051 5.2a.408.408 0 0 0 .357-.199.35.35 0 0 0-.017-.411L13.352.183a.39.39 0 0 0-.35-.183.416.416 0 0 0-.358.183L9.615 4.59a.435.435 0 0 0-.081.212.295.295 0 0 0 .064.2c.07.123.21.2.36.198h6.093z"></path><circle stroke="none" cx="13" cy="13" r="4.333"></circle></g></svg></span><span>Navigation</span></button><button><span class="icon"><svg id="btn_ok" xmlns="http://www.w3.org/2000/svg"><g fill-rule="evenodd"><rect width="26" height="22" x="1" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect><path fill-rule="nonzero" d="M9.665 8C7.438 8 6 9.541 6 11.927 6 14.401 7.442 16 9.673 16c2.232 0 3.674-1.592 3.674-4.055C13.347 9.55 11.902 8 9.665 8zm5.294 0v8h1.837v-2.989l.581-.594L19.857 16H22l-3.369-4.867L21.694 8H19.55l-2.755 2.82V8h-1.837zM9.663 9.846c1.157 0 1.847.8 1.847 2.14 0 1.337-.7 2.168-1.827 2.168-1.156 0-1.846-.81-1.846-2.168 0-.502.132-2.14 1.826-2.14z"></path></g></svg></span><span>Watch</span></button></div></div><div class="right-bottom-buttons-wrapper"><div class="right-bottom-buttons"><button><div class="icon" style="background-color:#e7bf11"></div><div class="text"><span>Category</span></div></button></div></div></div>'
      );
    },
  };

  window.TelevisionModule = TelevisionModule;
});
