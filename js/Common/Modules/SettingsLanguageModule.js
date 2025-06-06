$(function() {
  window.settingsLanguageKeyboard = {
    cursor: 0,
  };
  var SettingsLanguageModule = {
    handleKeyDown: function (event) {
      if (!$("#settingsLanguagePage").is(":visible")) {
        return;
      }
      const keyCode = event.keyCode;
      if (window.keyboard.TOP.includes(keyCode)) {
        window.settingsLanguageKeyboard.cursor = Math.max(
          window.settingsLanguageKeyboard.cursor - 1,
          0
        );
      } else if (window.keyboard.BOTTOM.includes(keyCode)) {
        window.settingsLanguageKeyboard.cursor = Math.min(
          window.settingsLanguageKeyboard.cursor + 1,
          window.siteLanguages.length - 1
        );
      } else if (window.keyboard.ENTER.includes(keyCode)) {
        i18njs.setLang(
          window.siteLanguages[window.settingsLanguageKeyboard.cursor].code
        );
        window.vm.navigateTo("#/settings");
      } else if (window.keyboard.BACK.includes(keyCode)) {
        window.vm.navigateTo("#/settings");
      }

      this.renderOptions();
    },

    renderOptions: function () {
      if (!$("#settingsLanguagePage").is(":visible")) {
        return;
      }
      $("#settingLanguageList").empty();
      window.siteLanguages.forEach(function (item, index) {
        var cls = "";
        if (item.code === i18njs.getCurrentLang()) {
          cls = " active";
        }
        $("#settingLanguageList").append(
          '<div class="setting-option-wrapper-language-item"><div class="setting-option ' +
            cls +
            '"><span>' +
            item.name +
            '</span><span class="icon"><svg id="btn_selected" width="65" height="59" viewBox="0 0 65 59" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M63.0403036,0.0186150948 C62.9870646,0.0318899075 62.9338256,0.0517995779 62.8805866,0.0717109475 C62.4347098,0.18453921 62.048728,0.469929843 61.8158071,0.868148738 L26.9975161,54.7073434 L3.03997644,33.1504272 C2.62071907,32.6194686 1.92195792,32.3871739 1.26312516,32.5597362 C0.604294095,32.7322969 0.118487151,33.2831668 0.0186653471,33.9535015 C-0.0811581607,34.6238379 0.224965105,35.2875361 0.803939407,35.6459322 L26.1989315,58.5833406 C26.5716043,58.9085523 27.0707201,59.0545667 27.5631798,58.9815595 C28.0556412,58.9085523 28.4882075,58.6297999 28.7544024,58.2116696 L64.6907119,2.67340773 C65.0833497,2.11590128 65.1033148,1.3791959 64.7439508,0.801779771 C64.3845886,0.224361949 63.7124452,-0.0809400538 63.0403036,0.0186150948 Z" id="Shape"></path></svg></span></div></div>'
        );
      });

      $("#settingLanguageCursor").css({
        "-webkit-transform":
          "translate(0, " + window.settingsLanguageKeyboard.cursor * 56 + "px)",
      });
    },

    renderPage: function () {
      $("#app").html(
        '<div id="settingsLanguagePage" class="page setting-language-page"><div class="site-page-wrapper settings-language-wrapper"><h2 class="site-page-title">Choose language</h2><div class="site-page-content"><div class="settings-language-content"><div class="setting-option-wrapper-language"><div class="setting-option-wrapper-language-cursor" id="settingLanguageCursor"></div><div class="setting-option-wrapper-language-inner" id="settingLanguageList"><div class="setting-option-wrapper-language-item"><div class="setting-option active"><span>English</span><span class="icon"><svg id="btn_selected" width="65" height="59" viewBox="0 0 65 59" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M63.0403036,0.0186150948 C62.9870646,0.0318899075 62.9338256,0.0517995779 62.8805866,0.0717109475 C62.4347098,0.18453921 62.048728,0.469929843 61.8158071,0.868148738 L26.9975161,54.7073434 L3.03997644,33.1504272 C2.62071907,32.6194686 1.92195792,32.3871739 1.26312516,32.5597362 C0.604294095,32.7322969 0.118487151,33.2831668 0.0186653471,33.9535015 C-0.0811581607,34.6238379 0.224965105,35.2875361 0.803939407,35.6459322 L26.1989315,58.5833406 C26.5716043,58.9085523 27.0707201,59.0545667 27.5631798,58.9815595 C28.0556412,58.9085523 28.4882075,58.6297999 28.7544024,58.2116696 L64.6907119,2.67340773 C65.0833497,2.11590128 65.1033148,1.3791959 64.7439508,0.801779771 C64.3845886,0.224361949 63.7124452,-0.0809400538 63.0403036,0.0186150948 Z" id="Shape"></path></svg></span></div></div></div></div></div></div></div><div class="left-bottom-buttons-wrapper"><div class="left-bottom-buttons"><button><span class="icon"><svg id="btn_back" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><g fill-rule="evenodd"><path fill-rule="nonzero" d="M16.553 19H8.9c-.587 0-1.063-.452-1.063-1.01s.476-1.01 1.063-1.01h7.654c2.936 0 5.316-2.261 5.316-5.05 0-2.789-2.38-5.05-5.316-5.05H3.594l3.094 2.98c.36.4.337.998-.056 1.37a1.104 1.104 0 0 1-1.443.054L.309 6.587a.975.975 0 0 1 0-1.424L5.252.467c.237-.353.678-.53 1.11-.447.43.084.763.412.835.824a.993.993 0 0 1-.51 1.037L3.595 4.86h12.97c4.11.003 7.439 3.17 7.436 7.075-.003 3.905-3.337 7.068-7.447 7.065z"></path></g></svg></span>Back</button><button><span class="icon icon-double"><svg id="btn_channel" xmlns="http://www.w3.org/2000/svg"><g fill-rule="evenodd"><rect width="22" height="22" x="30" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect><path d="M12 9l4 5H8zM41 15l4-5h-8z"></path><rect width="22" height="22" x="1" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect></g></svg></span>Select</button><button><span class="icon"><svg id="btn_ok" xmlns="http://www.w3.org/2000/svg"><g fill-rule="evenodd"><rect width="26" height="22" x="1" y="1" fill="none" stroke="currentColor" stroke-width="2" rx="5"></rect><path fill-rule="nonzero" d="M9.665 8C7.438 8 6 9.541 6 11.927 6 14.401 7.442 16 9.673 16c2.232 0 3.674-1.592 3.674-4.055C13.347 9.55 11.902 8 9.665 8zm5.294 0v8h1.837v-2.989l.581-.594L19.857 16H22l-3.369-4.867L21.694 8H19.55l-2.755 2.82V8h-1.837zM9.663 9.846c1.157 0 1.847.8 1.847 2.14 0 1.337-.7 2.168-1.827 2.168-1.156 0-1.846-.81-1.846-2.168 0-.502.132-2.14 1.826-2.14z"></path></g></svg></span>Confirm</button></div></div><div class="right-bottom-buttons-wrapper"><div class="right-bottom-buttons"><button><div class="icon" style="background-color:red"></div><div class="text"><span>Television</span></div></button><button><div class="icon" style="background-color:#143f7b"></div><div class="text"><span>Language</span></div></button></div></div></div>'
      );
    },
  };

  window.SettingsLanguageModule = SettingsLanguageModule;
});
