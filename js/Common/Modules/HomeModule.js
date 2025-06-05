$(function() {
  window.homeKeyboard = {
    currentIndex: 0,
    cursor: 0,
  };
  var HomeModule = {
    visibleItem: 5,
    handleKeyDown: function(event) {
      if (!$("#homePage").is(":visible")) {
        return;
      }
      const keyCode = event.keyCode;
      if (window.keyboard.RIGHT.includes(keyCode)) {
        window.homeKeyboard.currentIndex = Math.min(
          window.homeKeyboard.currentIndex + 1,
          window.menu.length - 1
        );
        window.homeKeyboard.cursor = Math.min(
          window.homeKeyboard.cursor + 1,
          this.visibleItem - 1
        );
      } else if (window.keyboard.LEFT.includes(keyCode)) {
        window.homeKeyboard.currentIndex = Math.max(
          window.homeKeyboard.currentIndex - 1,
          0
        );
        window.homeKeyboard.cursor = Math.max(
          window.homeKeyboard.cursor - 1,
          0
        );
      } else if (window.keyboard.ENTER.includes(keyCode)) {
        const currentItem = window.menu[window.homeKeyboard.currentIndex];
        console.log("#" + currentItem.path);
        window.vm.navigateTo("#" + currentItem.path);
      } else if (window.keyboard.BACK.includes(keyCode)) {
        window.vm.navigateTo("#/welcome");
      }

      this.renderMenu();
    },

    renderMenu: function() {
      if (!$("#homePage").is(":visible")) {
        return;
      }
      if (window.homeKeyboard.cursor === window.homeKeyboard.currentIndex) {
        $("#btnArrowLeft").addClass("disabled");
      } else {
        $("#btnArrowLeft").removeClass("disabled");
      }
      if (
        this.visibleItem - window.homeKeyboard.cursor === window.menu.length - window.homeKeyboard.currentIndex
      ) {
        $("#btnArrowRight").addClass("disabled");
      } else {
        $("#btnArrowRight").removeClass("disabled");
      }
      $("#menuCursor").css({
        transform: 'translate(' + (window.homeKeyboard.cursor * 236) + 'px, 0)',
      });
      $("#menuScroller").css({
        transform: 'translateX(' + (-(window.homeKeyboard.currentIndex - window.homeKeyboard.cursor) * 236) + 'px)',
      });

      $("#menuScroller").empty();
      window.menu.forEach(function(item, index) {
        $("#menuScroller").append('<div class="menu-item"><div class="a"><div class="icon">' + item.icon + '</div><div class="text"><span>' + item.text + '</span></div></div></div>');
      });
    },

    renderPage: function() {
      $("#app").html('<div id="homePage" class="page home-page"><div class="video-background"><video width="100%" preload="auto" playsinline autoplay muted loop src="http://103.153.72.195:8080/video/HITEC_Scandic_Video_No_Sound.mp4"></video><div class="overlay" style="background:url(assets/images/icons/shadow.png)"></div></div><div class="menu-container"><div class="navigate back" id="btnArrowLeft"><svg id="btn_arrow_left" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 40"><path fillRule="nonzero" stroke="none" d="M19.651 0L23 3.408 6.66 20 23 36.63 19.688 40 1.693 21.685 0 20l1.693-1.685z"/></svg></div><div class="navigate next" id="btnArrowRight"><svg id="btn_arrow_right" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 40"><path fillRule="nonzero" stroke="none" d="M3.494 0L0 3.408 17.05 20 0 36.63 3.456 40l18.778-18.315L24 20l-1.766-1.685z"/></svg></div><div class="menu-wrapper"><div class="menu-cursor" id="menuCursor" style="transform:translate(0,0)"><div>&nbsp;</div></div><div class="menu-scroller" id="menuScroller" style="transform:translateX(0)"><div class="menu-item" style="flex-basis:236px;height:236px"><div class="a"><div class="icon"><svg id="icon-tv" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 130 130"><g fillrule="nonzero"><path d="M19 23v58.66h92V23H19zm3.68 3.666h84.64v51.327H22.68V26.666zm16.215 58.66a1.847 1.847 0 0 0-1.668 2.005 1.85 1.85 0 0 0 2.013 1.661h51.52a1.852 1.852 0 0 0 1.617-.91c.33-.572.33-1.274 0-1.847a1.852 1.852 0 0 0-1.617-.91H38.895z"></path></g></svg></div><div class="text"><span>Television</span></div></div></div></div></div></div><div class="right-bottom-buttons-wrapper"><div class="right-bottom-buttons"><button><div class="icon" style="background-color:red"></div><div class="text"><span id="buttonTelevision">Television</span></div></button><button><div class="icon" style="background-color:#143f7b"></div><div class="text"><span id="buttonLanguage">Language</span></div></button></div></div><div class="cover"></div></div>');
    },
  };

  window.HomeModule = HomeModule;
});
