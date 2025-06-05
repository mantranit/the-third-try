$(function() {
  window.feedbackKeyboard = {
    cursor: 0,
    cursorSelect: 0,
  };
  var FeedbackModule = {
    handleKeyDown: function(event) {
      if (!$("#feedbackPage").is(":visible")) {
        return;
      }
      const keyCode = event.keyCode;
      if (window.keyboard.checkKeyCode("RIGHT", keyCode)) {
        if (
          window.feedbackList[window.feedbackKeyboard.cursor].type === "star"
        ) {
          window.feedbackList.forEach(function(item, index) {
            item.selected = Math.min(5, item.selected + 1);
          });
        }
      } else if (window.keyboard.checkKeyCode("LEFT", keyCode)) {
        if (
          window.feedbackList[window.feedbackKeyboard.cursor].type === "star"
        ) {
          window.feedbackList.forEach(function(item, index) {
            item.selected = Math.max(1, item.selected - 1);
          });
        }
      } else if (window.keyboard.checkKeyCode("TOP", keyCode)) {
        if (
          window.feedbackList[window.feedbackKeyboard.cursor] &&
          window.feedbackList[window.feedbackKeyboard.cursor].type === "select"
        ) {
          const prevCursorSelect = window.feedbackKeyboard.cursorSelect - 1;
          if (prevCursorSelect <= -1) {
            window.feedbackKeyboard.cursor = Math.max(
              window.feedbackKeyboard.cursor - 1,
              0
            );
          } else {
            window.feedbackKeyboard.cursorSelect = prevCursorSelect;
          }
        } else {
          window.feedbackKeyboard.cursor = Math.max(
            window.feedbackKeyboard.cursor - 1,
            0
          );
        }
      } else if (window.keyboard.checkKeyCode("BOTTOM", keyCode)) {
        if (
          window.feedbackList[window.feedbackKeyboard.cursor] &&
          window.feedbackList[window.feedbackKeyboard.cursor].type === "select"
        ) {
          const nextCursorSelect = window.feedbackKeyboard.cursorSelect + 1;
          if (
            nextCursorSelect >=
            window.feedbackList[window.feedbackKeyboard.cursor].options.length
          ) {
            window.feedbackKeyboard.cursor = Math.min(
              window.feedbackKeyboard.cursor + 1,
              window.feedbackList.length
            );
          } else {
            window.feedbackKeyboard.cursorSelect = nextCursorSelect;
          }
        } else {
          window.feedbackKeyboard.cursor = Math.min(
            window.feedbackKeyboard.cursor + 1,
            window.feedbackList.length
          );
        }
      } else if (window.keyboard.checkKeyCode("ENTER", keyCode)) {
        if ($("#feedbackAlert").is(":visible")) {
          window.feedbackList.forEach(function(item, index) {
            item.selected = 1;
            item.value = 0;
          });
          window.feedbackKeyboard.cursor = 0;
          window.feedbackKeyboard.cursorSelect = 0;
          vm.navigateTo("#/");
          return;
        } else if (
          window.feedbackKeyboard.cursor === window.feedbackList.length
        ) {
          console.log("Submit feedback");
          $("#feedbackAlert").fadeIn(200);
          return;
        } else if (
          window.feedbackList[window.feedbackKeyboard.cursor] &&
          window.feedbackList[window.feedbackKeyboard.cursor].type === "star"
        ) {
          window.feedbackList[window.feedbackKeyboard.cursor].value =
            window.feedbackList[window.feedbackKeyboard.cursor].selected;
        } else if (
          window.feedbackList[window.feedbackKeyboard.cursor] &&
          window.feedbackList[window.feedbackKeyboard.cursor].type === "select"
        ) {
          window.feedbackList[window.feedbackKeyboard.cursor].value =
            window.feedbackList[window.feedbackKeyboard.cursor].options[
              window.feedbackKeyboard.cursorSelect
            ];
        }
        // go to next feedback
        window.feedbackKeyboard.cursor = Math.min(
          window.feedbackKeyboard.cursor + 1,
          window.feedbackList.length
        );
      } else if (window.keyboard.checkKeyCode("BACK", keyCode)) {
        vm.navigateTo("#/");
      }

      this.renderFeedback();
      this.scrollTo();
    },

    scrollTo: function() {
      if (!$("#feedbackPage").is(":visible")) {
        return;
      }
      var feedbackContent = $("#feedbackContent").get(0);
      var feedbackContentInner = $("#feedbackContentInner").get(0);
      var children = feedbackContentInner.children;
      var cursor = window.feedbackKeyboard.cursor;
      var cursorElement = children[cursor];
      if (cursorElement) {
        var cursorRect = cursorElement.getBoundingClientRect();
        var feedbackContentRect = feedbackContent.getBoundingClientRect();
        var offsetTop = cursorRect.top - feedbackContentRect.top;
        if (offsetTop < 0) {
          feedbackContent.scrollTop += offsetTop;
        } else if (
          offsetTop + cursorElement.offsetHeight >
          feedbackContent.offsetHeight
        ) {
          feedbackContent.scrollTop +=
            offsetTop -
            feedbackContent.offsetHeight +
            cursorElement.offsetHeight;
        }
      }
    },

    renderFeedback: function() {
      if (!$("#feedbackPage").is(":visible")) {
        return;
      }
      if (window.feedbackKeyboard.cursor === window.feedbackList.length) {
        $("#feedbackSubmit").addClass("site-button--active");
      } else {
        $("#feedbackSubmit").removeClass("site-button--active");
      }
      $("#feedbackContentInner").empty();
      window.feedbackList.forEach(function(item, index) {
        if (item.type === "star") {
          $("#feedbackContentInner").append(
            `<div class="feedback-option-wrapper ` +
              (window.feedbackKeyboard.cursor === index ? "active" : "") +
              `">
            <div class="feedback-option-name">` +
              item.name +
              `</div>
            <div class="feedback-option-star">
              <span class="icons8-star${
                parseInt(item.value.toString(), 10) >= 1 ? "-filled" : ""
              }"></span>
              <span class="icons8-star${
                parseInt(item.value.toString(), 10) >= 2 ? "-filled" : ""
              }"></span>
              <span class="icons8-star${
                parseInt(item.value.toString(), 10) >= 3 ? "-filled" : ""
              }"></span>
              <span class="icons8-star${
                parseInt(item.value.toString(), 10) >= 4 ? "-filled" : ""
              }"></span>
              <span class="icons8-star${
                parseInt(item.value.toString(), 10) >= 5 ? "-filled" : ""
              }"></span>
              <div class="feedback-option-star-cursor" style="transform: translate(` +
              50 * (item.selected - 1) +
              `px, 0px)"></div>
            </div>
          </div>`
          );
        } else if (item.type === "select") {
          var optionHtml = "";
          item.options.forEach(function(option, index) {
            optionHtml +=
              `<div class="feedback-option-select-item"><span>` +
              option +
              `</span>` +
              (item.value === option
                ? `<span class="icon">
                    <svg
                      id="btn_selected"
                      width="65"
                      height="59"
                      viewBox="0 0 65 59"
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M63.0403036,0.0186150948 C62.9870646,0.0318899075 62.9338256,0.0517995779 62.8805866,0.0717109475 C62.4347098,0.18453921 62.048728,0.469929843 61.8158071,0.868148738 L26.9975161,54.7073434 L3.03997644,33.1504272 C2.62071907,32.6194686 1.92195792,32.3871739 1.26312516,32.5597362 C0.604294095,32.7322969 0.118487151,33.2831668 0.0186653471,33.9535015 C-0.0811581607,34.6238379 0.224965105,35.2875361 0.803939407,35.6459322 L26.1989315,58.5833406 C26.5716043,58.9085523 27.0707201,59.0545667 27.5631798,58.9815595 C28.0556412,58.9085523 28.4882075,58.6297999 28.7544024,58.2116696 L64.6907119,2.67340773 C65.0833497,2.11590128 65.1033148,1.3791959 64.7439508,0.801779771 C64.3845886,0.224361949 63.7124452,-0.0809400538 63.0403036,0.0186150948 Z"
                        id="Shape"
                      ></path>
                    </svg>
                  </span>`
                : "") +
              `</div>`;
          });
          $("#feedbackContentInner").append(
            `<div class="feedback-option-wrapper ` +
              (window.feedbackKeyboard.cursor === index ? "active" : "") +
              `">
            <div class="feedback-option-name">` +
              item.name +
              `</div>
            <div class="feedback-option-select-wrapper">
              <div class="feedback-option-select">` +
              optionHtml +
              `<div class="feedback-option-select-cursor" style="transform: translate(0px, ` +
              window.feedbackKeyboard.cursorSelect * 50 +
              `px);"></div>
              </div>
            </div>
          </div>`
          );
        }
      });
    },

    renderPage: function() {
      $("#app").html(`<div id="feedbackPage" class="page feedback-page">
  <div class="site-page-wrapper feedback-wrapper">
    <h2 class="site-page-title">Feedback form</h2>
    <div class="site-page-content ">
      <div class="feedback-content" id="feedbackContent">
        <div class="feedback-content-inner" id="feedbackContentInner">
          <div class="feedback-option-wrapper active">
            <div class="feedback-option-name">Atmosphere</div>
            <div class="feedback-option-star">
              <span class="icons8-star"></span><span class="icons8-star"></span><span class="icons8-star"></span><span class="icons8-star"></span><span class="icons8-star"></span>
              <div class="feedback-option-star-cursor" style="transform: translate(0px, 0px);"></div>
            </div>
          </div>
          <div class="feedback-option-wrapper ">
            <div class="feedback-option-name">Why did you choose us?</div>
            <div class="feedback-option-select-wrapper">
              <div class="feedback-option-select">
                <div class="feedback-option-select-item"><span>Location</span></div>
                <div class="feedback-option-select-item"><span>Price</span></div>
                <div class="feedback-option-select-item"><span>Recommendations</span></div>
                <div class="feedback-option-select-cursor" style="transform: translate(0px, 0px); opacity: 0;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="feedback-button"><button id="feedbackSubmit" type="button" class="site-button  ">Send</button></div>
    </div>
  </div>
  <div class="site-modal site-alert" id="feedbackAlert" style="display: none;">
    <div class="site-modal-inner">
      <div class="site-alert-icon">
        <svg id="dialog_success" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 20">
          <path d="M19.293 5.293l-10.293 10.293-4.293-4.293c-0.391-0.391-1.024-0.391-1.414 0s-0.391 1.024 0 1.414l5 5c0.391 0.391 1.024 0.391 1.414 0l11-11c0.391-0.391 0.391-1.024 0-1.414s-1.024-0.391-1.414 0z"></path>
        </svg>
      </div>
      <p>Feedback sent. Thank you.</p>
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
        <span class="icon icon-double">
          <svg id="btn_channel" xmlns="http://www.w3.org/2000/svg">
            <g fill-rule="evenodd">
              <rect width="22" height="22" x="30" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect>
              <path d="M12 9l4 5H8zM41 15l4-5h-8z"></path>
              <rect width="22" height="22" x="1" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect>
            </g>
          </svg>
        </span>
        Select
      </button>
      <button>
        <span class="icon">
          <svg id="btn_ok" xmlns="http://www.w3.org/2000/svg">
            <g fill-rule="evenodd">
              <rect width="26" height="22" x="1" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect>
              <path fill-rule="nonzero" d="M9.665 8C7.438 8 6 9.541 6 11.927 6 14.401 7.442 16 9.673 16c2.232 0 3.674-1.592 3.674-4.055C13.347 9.55 11.902 8 9.665 8zm5.294 0v8h1.837v-2.989l.581-.594L19.857 16H22l-3.369-4.867L21.694 8H19.55l-2.755 2.82V8h-1.837zM9.663 9.846c1.157 0 1.847.8 1.847 2.14 0 1.337-.7 2.168-1.827 2.168-1.156 0-1.846-.81-1.846-2.168 0-.502.132-2.14 1.826-2.14z"></path>
            </g>
          </svg>
        </span>
        Confirm
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

  window.FeedbackModule = FeedbackModule;
});
