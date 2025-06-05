$(function () {
  window.settingsKeyboard = {
    cursor: 0,
  };
  var SettingsModule = {
    handleKeyDown: function (event) {
      if (!$("#settingsPage").is(":visible")) {
        return;
      }
      const keyCode = event.keyCode;
      if (window.keyboard.TOP.includes(keyCode)) {
        window.settingsKeyboard.cursor = Math.max(
          window.settingsKeyboard.cursor - 1,
          0
        );
      } else if (window.keyboard.BOTTOM.includes(keyCode)) {
        window.settingsKeyboard.cursor = Math.min(
          window.settingsKeyboard.cursor + 1,
          1
        );
      } else if (window.keyboard.ENTER.includes(keyCode)) {
        if (window.settingsKeyboard.cursor === 0) {
          window.vm.navigateTo("#/settings-language");
        }
        if (window.settingsKeyboard.cursor === 1) {
          window.vm.navigateTo("#/settings-parental-lock");
        }
      } else if (window.keyboard.BACK.includes(keyCode)) {
        window.vm.navigateTo("#/");
      }
    },

    renderOptions: function () {
      if (!$("#settingsPage").is(":visible")) {
        return;
      }
      const currentLanguage = _.find(window.siteLanguages, function (item) {
        return item.code === i18njs.getCurrentLang();
      });

      $("#settingOptionLanguage .setting-option").text(currentLanguage.name);
      if (window.settingsKeyboard.cursor === 0) {
        $("#settingOptionLanguage .setting-option").addClass("active");
        $("#settingOptionParentLock .setting-option").removeClass("active");
      } else {
        $("#settingOptionLanguage .setting-option").removeClass("active");
        $("#settingOptionParentLock .setting-option").addClass("active");
      }
    },

    renderPage: function () {
      $("#app").html(
        '<div id="settingsPage" class="page settings-page"><div class="site-page-wrapper settings-wrapper"><h2 class="site-page-title">Settings</h2><div class="site-page-content"><div class="settings-content"><div class="settings-content-inner"><div class="setting-option-wrapper" id="settingOptionLanguage"><label class="setting-option-label">Application Language</label><div class="setting-option setting-option--language">English</div></div><div class="setting-option-wrapper" id="settingOptionParentLock"><label class="setting-option-label">Parental Lock</label><div class="setting-option setting-option--lock active">Disabled</div></div></div></div></div></div><div class="left-bottom-buttons-wrapper"><div class="left-bottom-buttons"><button><span class="icon"><svg id="btn_back" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><g fill-rule="evenodd"><path fill-rule="nonzero" d="M16.553 19H8.9c-.587 0-1.063-.452-1.063-1.01s.476-1.01 1.063-1.01h7.654c2.936 0 5.316-2.261 5.316-5.05 0-2.789-2.38-5.05-5.316-5.05H3.594l3.094 2.98c.36.4.337.998-.056 1.37a1.104 1.104 0 0 1-1.443.054L.309 6.587a.975.975 0 0 1 0-1.424L5.252.467c.237-.353.678-.53 1.11-.447.43.084.763.412.835.824a.993.993 0 0 1-.51 1.037L3.595 4.86h12.97c4.11.003 7.439 3.17 7.436 7.075-.003 3.905-3.337 7.068-7.447 7.065z"></path></g></svg></span>Back</button><button><span class="icon"><svg id="btn_navigate" xmlns="http://www.w3.org/2000/svg"><g fill-rule="evenodd"><path stroke="none" fill-rule="nonzero" d="M20.8 16.043V9.949c0-.15.076-.286.199-.357a.35.35 0 0 1 .411.017l4.407 3.039a.39.39 0 0 1 .183.35.416.416 0 0 1-.183.358l-4.407 3.029a.435.435 0 0 1-.212.081.295.295 0 0 1-.2-.064.408.408 0 0 1-.198-.36zM5.2 9.949a.408.408 0 0 0-.199-.357.35.35 0 0 0-.411.017L.183 12.648a.39.39 0 0 0-.183.35.416.416 0 0 0 .183.358l4.407 3.029a.435.435 0 0 0 .212.081.295.295 0 0 0 .2-.064c.123-.07.2-.21.198-.36V9.95zM16.051 20.8c.15 0 .286.076.357.199a.35.35 0 0 1-.017.411l-3.039 4.407a.39.39 0 0 1-.35.183.416.416 0 0 1-.358-.183L9.615 21.41a.435.435 0 0 1-.081-.212.295.295 0 0 1 .064-.2c.07-.123.21-.2.36-.198h6.093zM16.051 5.2a.408.408 0 0 0 .357-.199.35.35 0 0 0-.017-.411L13.352.183a.39.39 0 0 0-.35-.183.416.416 0 0 0-.358.183L9.615 4.59a.435.435 0 0 0-.081.212.295.295 0 0 0 .064.2c.07.123.21.2.36.198h6.093z"></path><circle stroke="none" cx="13" cy="13" r="4.333"></circle></g></svg></span>Navigation</button></div></div><div class="right-bottom-buttons-wrapper"><div class="right-bottom-buttons"><button><div class="icon" style="background-color:red"></div><div class="text"><span>Television</span></div></button><button><div class="icon" style="background-color:#143f7b"></div><div class="text"><span>Language</span></div></button></div></div></div>'
      );
    },
  };

  window.SettingsModule = SettingsModule;
});
