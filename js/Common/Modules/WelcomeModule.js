$(function() {
  var WelcomeModule = {
    handleKeyDown: function(event) {
      if (!$("#welcomePage").is(":visible")) {
        return;
      }
      const keyCode = event.keyCode;
      if (window.keyboard.ENTER.includes(keyCode)) {
        window.vm.navigateTo("#/");
      }
    },

    renderContent: function() {
      if (!$("#welcomePage").is(":visible")) {
        return;
      }
      $("#welcomeTitle").html(
        i18njs.get("welcome.Dear") + "<strong>" + "Mr. Tuấn Lê" + "</strong>"
      );
      $("#welcomeBrief").html(i18njs.get("welcome.Brief"));
      $("#welcomeContinue").html(i18njs.get("welcome.Continue"));
    },

    renderPage: function() {
      $("#app").html('<div id="welcomePage" class="page welcome-page"><div class="video-background"><video width="100%" preload="auto" playsinline autoplay muted loop src="http://103.153.72.195:8080/video/HITEC_Scandic_Video_No_Sound.mp4"></video></div><div class="welcome-wrapper"><h1 id="welcomeTitle">DEAR</h1><div class="welcome"><p id="welcomeBrief">Welcome</p></div><div class="button-continue"><span class="a" id="welcomeContinue">Continue</span></div></div><div class="right-bottom-buttons-wrapper"><div class="right-bottom-buttons"><button><div class="icon" style="background-color:red"></div><div class="text"><span id="buttonTelevision">Television</span></div></button><button><div class="icon" style="background-color:#143f7b"></div><div class="text"><span id="buttonLanguage">Language</span></div></button></div></div><div class="cover"></div></div>');
    },
  };

  window.WelcomeModule = WelcomeModule;
});
