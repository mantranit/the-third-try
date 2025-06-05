$(function() {
  window.connectivityKeyboard = {
    cursorX: 0,
    cursorY: 0,
  };
  var ConnectivityModule = {
    handleKeyDown: function(event) {
      if (!$("#connectivityPage").is(":visible")) {
        return;
      }
      var itemInARow = 2;
      const keyCode = event.keyCode;
      if (window.keyboard.checkKeyCode("RIGHT", keyCode)) {
        var nextCursorX = Math.min(
          window.connectivityKeyboard.cursorX + 1,
          itemInARow - 1
        );
        if (
          window.sourceList[
            nextCursorX + window.connectivityKeyboard.cursorY * itemInARow
          ]
        ) {
          window.connectivityKeyboard.cursorX = nextCursorX;
        }
      } else if (window.keyboard.checkKeyCode("LEFT", keyCode)) {
        window.connectivityKeyboard.cursorX = Math.max(
          window.connectivityKeyboard.cursorX - 1,
          0
        );
      } else if (window.keyboard.checkKeyCode("TOP", keyCode)) {
        window.connectivityKeyboard.cursorY = Math.max(
          window.connectivityKeyboard.cursorY - 1,
          0
        );
      } else if (window.keyboard.checkKeyCode("BOTTOM", keyCode)) {
        var nextCursorY = Math.min(
          window.connectivityKeyboard.cursorY + 1,
          Math.ceil(window.sourceList.length / itemInARow) - 1
        );
        if (
          window.sourceList[
            window.connectivityKeyboard.cursorX + nextCursorY * itemInARow
          ]
        ) {
          window.connectivityKeyboard.cursorY = nextCursorY;
        } else {
          if (
            window.sourceList[
              window.connectivityKeyboard.cursorX - 1 + nextCursorY * itemInARow
            ]
          ) {
            window.connectivityKeyboard.cursorX =
              window.connectivityKeyboard.cursorX - 1;
            window.connectivityKeyboard.cursorY = nextCursorY;
          }
        }
      } else if (window.keyboard.checkKeyCode("ENTER", keyCode)) {
        $("#connectivityAlert .site-modal-title").text(
          i18njs.get(
            window.sourceList[
              window.connectivityKeyboard.cursorX +
                window.connectivityKeyboard.cursorY * itemInARow
            ].name
          )
        );
        $("#connectivityAlert .intro").text(
          i18njs.get(
            window.sourceList[
              window.connectivityKeyboard.cursorX +
                window.connectivityKeyboard.cursorY * itemInARow
            ].content
          )
        );
        $("#connectivityAlert").toggle();
      } else if (window.keyboard.checkKeyCode("BACK", keyCode)) {
        if ($("#connectivityAlert").is(":visible")) {
          $("#connectivityAlert").toggle();
        } else {
          vm.navigateTo("#/");
        }
      }

      this.renderSources();
    },

    renderSources: function() {
      if (!$("#connectivityPage").is(":visible")) {
        return;
      }
      $("#connectivityCursor").css({
        transform: `translate(${window.connectivityKeyboard.cursorX *
          (400 + 20)}px, ${window.connectivityKeyboard.cursorY * (90 + 20)}px)`,
      });

      $("#connectivityList").empty();
      window.sourceList.forEach(function(item, index) {
        $("#connectivityList").append(
          `<li class="connectivity-item"><i class="` +
            item.icon +
            `"></i><span>` +
            i18njs.get(item.name) +
            `</span></li>`
        );
      });
    },

    renderPage: function() {
      $("#app").html(`<div id="connectivityPage" class="page connectivity-page">
  <div class="site-page-wrapper connectivity-wrapper">
     <h2 class="site-page-title">Connect My Device</h2>
     <div class="site-page-content ">
        <div class="connectivity-content">
           <div class="connectivity-cursor" id="connectivityCursor" style="width: 404px; height: 94px; transform: translate(0px, 110px);"></div>
           <ul class="connectivity-list" id="connectivityList">
              <li class="connectivity-item"><i class="sources-icon-androidwindows"></i><span>Screen Sharing</span></li>
              <li class="connectivity-item"><i class="sources-icon-settings_bluetooth"></i><span>Bluetooth</span></li>
              <li class="connectivity-item"><i class="sources-icon-usb"></i><span>USB</span></li>
              <li class="connectivity-item"><i class="sources-icon-settings_input_hdmi"></i><span>Sources List</span></li>
              <li class="connectivity-item"><i class="sources-icon-airplay"></i><span>Apple TV</span></li>
              <li class="connectivity-item"><i class="sources-icon-cast"></i><span>ChromeCast</span></li>
           </ul>
        </div>
     </div>
  </div>
  <div class="site-modal site-alert" id="connectivityAlert" style="display: none;">
    <div class="site-modal-inner">
       <h3 class="site-modal-title">USB</h3>
       <div class="site-alert-icon">
          <svg id="dialog_alert" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100">
             <path fill-rule="nonzero" d="M50 0C22.413 0 0 22.413 0 50s22.413 50 50 50 50-22.413 50-50S77.587 0 50 0zm0 4.545C75.13 4.545 95.455 24.87 95.455 50c0 25.13-20.324 45.455-45.455 45.455C24.87 95.455 4.545 75.13 4.545 50 4.545 24.87 24.87 4.545 50 4.545zM31.796 29.523a2.273 2.273 0 0 0-1.585 3.902L46.786 50 30.211 66.575a2.273 2.273 0 1 0 3.214 3.214L50 53.214l16.575 16.575a2.273 2.273 0 1 0 3.214-3.214L53.214 50l16.575-16.575a2.273 2.273 0 1 0-3.214-3.214L50 46.786 33.425 30.211a2.273 2.273 0 0 0-1.629-.688z"></path>
          </svg>
       </div>
       <p class="intro">Open USB Browser</p>
       <div class="modal-action"><button type="button" class="site-button site-button--active ">OK</button></div>
    </div>
 </div>
  <div class="left-bottom-buttons-wrapper">
     <div class="left-bottom-buttons">
        <button>
           <span class="icon">
              <svg id="btn_back" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                 <g fill-rule="evenodd">
                    <path fill-rule="nonzero" d="M16.553 19H8.9c-.587 0-1.063-.452-1.063-1.01s.476-1.01 1.063-1.01h7.654c2.936 0 5.316-2.261 5.316-5.05 0-2.789-2.38-5.05-5.316-5.05H3.594l3.094 2.98c.36.4.337.998-.056 1.37a1.104 1.104 0 0 1-1.443.054L.309 6.587a.975.975 0 0 1 0-1.424L5.252.467c.237-.353.678-.53 1.11-.447.43.084.763.412.835.824a.993.993 0 0 1-.51 1.037L3.595 4.86h12.97c4.11.003 7.439 3.17 7.436 7.075-.003 3.905-3.337 7.068-7.447 7.065z"></path>
                 </g>
              </svg>
           </span>
           Back
        </button>
        <button>
           <span class="icon">
              <svg id="btn_navigate" xmlns="http://www.w3.org/2000/svg">
                 <g fill-rule="evenodd">
                    <path stroke="none" fill-rule="nonzero" d="M20.8 16.043V9.949c0-.15.076-.286.199-.357a.35.35 0 0 1 .411.017l4.407 3.039a.39.39 0 0 1 .183.35.416.416 0 0 1-.183.358l-4.407 3.029a.435.435 0 0 1-.212.081.295.295 0 0 1-.2-.064.408.408 0 0 1-.198-.36zM5.2 9.949a.408.408 0 0 0-.199-.357.35.35 0 0 0-.411.017L.183 12.648a.39.39 0 0 0-.183.35.416.416 0 0 0 .183.358l4.407 3.029a.435.435 0 0 0 .212.081.295.295 0 0 0 .2-.064c.123-.07.2-.21.198-.36V9.95zM16.051 20.8c.15 0 .286.076.357.199a.35.35 0 0 1-.017.411l-3.039 4.407a.39.39 0 0 1-.35.183.416.416 0 0 1-.358-.183L9.615 21.41a.435.435 0 0 1-.081-.212.295.295 0 0 1 .064-.2c.07-.123.21-.2.36-.198h6.093zM16.051 5.2a.408.408 0 0 0 .357-.199.35.35 0 0 0-.017-.411L13.352.183a.39.39 0 0 0-.35-.183.416.416 0 0 0-.358.183L9.615 4.59a.435.435 0 0 0-.081.212.295.295 0 0 0 .064.2c.07.123.21.2.36.198h6.093z"></path>
                    <circle stroke="none" cx="13" cy="13" r="4.333"></circle>
                 </g>
              </svg>
           </span>
           Navigation
        </button>
     </div>
  </div>
  <div class="right-bottom-buttons-wrapper">
     <div class="right-bottom-buttons">
        <button>
           <div class="icon" style="background-color: rgb(255, 0, 0);"></div>
           <div class="text"><span>Television</span></div>
        </button>
        <button>
           <div class="icon" style="background-color: rgb(20, 63, 123);"></div>
           <div class="text"><span>Language</span></div>
        </button>
     </div>
  </div>
</div>`);
    },
  };

  window.ConnectivityModule = ConnectivityModule;
});
