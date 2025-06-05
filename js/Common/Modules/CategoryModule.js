$(function() {
  window.categoryKeyboard = {
    cursorX: 0,
    cursorY: 0,
  };
  var CategoryModule = {
    itemInRow: 2,
    handleKeyDown: function(event) {
      if (!$("#categoryPage").is(":visible")) {
        return;
      }
      const keyCode = event.keyCode;
      if (window.keyboard.checkKeyCode("RIGHT", keyCode)) {
        var nextCursorX = Math.min(
          window.categoryKeyboard.cursorX + 1,
          this.itemInRow - 1
        );
        if (
          window.currentCategory[
            nextCursorX + window.categoryKeyboard.cursorY * this.itemInRow
          ]
        ) {
          window.categoryKeyboard.cursorX = nextCursorX;
        }
      } else if (window.keyboard.checkKeyCode("LEFT", keyCode)) {
        window.categoryKeyboard.cursorX = Math.max(
          window.categoryKeyboard.cursorX - 1,
          0
        );
      } else if (window.keyboard.checkKeyCode("TOP", keyCode)) {
        window.categoryKeyboard.cursorY = Math.max(
          window.categoryKeyboard.cursorY - 1,
          0
        );
      } else if (window.keyboard.checkKeyCode("BOTTOM", keyCode)) {
        var nextCursorY = Math.min(
          window.categoryKeyboard.cursorY + 1,
          Math.ceil(window.currentCategory.length / this.itemInRow) - 1
        );
        if (
          window.currentCategory[
            window.categoryKeyboard.cursorX + nextCursorY * this.itemInRow
          ]
        ) {
          window.categoryKeyboard.cursorY = nextCursorY;
        } else {
          if (
            window.currentCategory[
              window.categoryKeyboard.cursorX - 1 + nextCursorY * this.itemInRow
            ]
          ) {
            window.categoryKeyboard.cursorX =
              window.categoryKeyboard.cursorX - 1;
            window.categoryKeyboard.cursorY = nextCursorY;
          }
        }
      } else if (window.keyboard.checkKeyCode("ENTER", keyCode)) {
        // go to subcategory
      } else if (window.keyboard.checkKeyCode("BACK", keyCode)) {
        vm.navigateTo("#/");
      }

      this.renderCursor();
    },

    renderCursor: function() {
      if (!$("#categoryPage").is(":visible")) {
        return;
      }
      $("#categoryCursor").css({
        transform: `translate(${window.categoryKeyboard.cursorX *
          (390 + 20)}px, ${window.categoryKeyboard.cursorY * (158 + 20)}px)`,
      });

      var categoryOuter = $("#categoryContent").get(0);
      var categoryInner = $("#categoryList").get(0);
      if (categoryOuter.clientHeight >= categoryInner.clientHeight) {
        $("#categoryContent").css({
          "overflow-y": "hidden",
        });
      } else {
        $("#categoryContent").css({
          "overflow-y": "scroll",
        });
      }
      var children = categoryInner.children;

      var child =
        children[
          window.categoryKeyboard.cursorX +
            window.categoryKeyboard.cursorY * this.itemInRow
        ];
      if (child) {
        var top = child.offsetTop;
        var bottom = top + child.clientHeight;
        var outerTop = categoryOuter.scrollTop;
        var outerBottom = outerTop + categoryOuter.clientHeight;
        if (top < outerTop) {
          categoryOuter.scrollTop = top - 3;
        } else if (bottom > outerBottom) {
          categoryOuter.scrollTop = bottom - categoryOuter.clientHeight;
        }
      }
    },

    renderCategory: function(categoryId) {
      if (!$("#categoryPage").is(":visible")) {
        return;
      }
      window.currentCategory = window.dining.filter(
        (item) => item.parentId === categoryId
      );

      $("#categoryTitle").text("Dining");

      $("#categoryList").empty();
      window.currentCategory.forEach(function(item, index) {
        $("#categoryList").append(
          `<div class="category-item">
            <div class="category-item-inner">
              <img alt="" width="390" height="158" src="${item.img}">
              <div class="brief" style="background-image: url(assets/images/icons/pagelist_bg_v3.png);">
                <p class="title">${item.title}</p>
                <p class="time">${item.time}</p>
              </div>
            </div>
          </div>`
        );
      });
    },

    renderPage: function() {
      $("#app").html(`<div id="categoryPage" class="page category-page">
  <div class="site-page-wrapper category-wrapper">
    <h2 class="site-page-title" id="categoryTitle">Dining</h2>
    <div class="site-page-content ">
      <div class="category-content" id="categoryContent">
        <div class="category-cursor" id="categoryCursor"></div>
        <div class="category-list category" id="categoryList">
          <div class="category-item">
            <div class="category-item-inner" style="width: 390px; height: 158px;">
              <img alt="" width="390" height="158" src="http://103.153.72.195:8080/c/i/65779f4293008bc9191a6a6b27a4d1f1.jpg">
              <div class="brief">
                <p class="title">Breakfasts</p>
                <p class="time">07:00-11:00</p>
              </div>
            </div>
          </div>
          <div class="category-item">
            <div class="category-item-inner" style="width: 390px; height: 158px;">
              <img alt="" width="390" height="158" src="http://103.153.72.195:8080/c/i/e4810e983e79f0481a27a6d0355ca16d.jpg">
              <div class="brief">
                <p class="title">Starters</p>
                <p class="time">07:00-23:00</p>
              </div>
            </div>
          </div>
          <div class="category-item">
            <div class="category-item-inner" style="width: 390px; height: 158px;">
              <img alt="" width="390" height="158" src="http://103.153.72.195:8080/c/i/e91ab8d57beecff16499268c3ee5f7cd.jpg">
              <div class="brief">
                <p class="title">Salads</p>
                <p class="time">07:00-23:00</p>
              </div>
            </div>
          </div>
          <div class="category-item">
            <div class="category-item-inner" style="width: 390px; height: 158px;">
              <img alt="" width="390" height="158" src="http://103.153.72.195:8080/c/i/42ce7e8e9f153fbb4c9c333c0194af65.jpg">
              <div class="brief">
                <p class="title">Soups</p>
                <p class="time">10:00-20:00</p>
              </div>
            </div>
          </div>
          <div class="category-item">
            <div class="category-item-inner" style="width: 390px; height: 158px;">
              <img alt="" width="390" height="158" src="http://103.153.72.195:8080/c/i/009808affb6c6322dee201c0dc5739d5.jpg">
              <div class="brief">
                <p class="title">Mains</p>
                <p class="time">10:00-23:00</p>
              </div>
            </div>
          </div>
          <div class="category-item">
            <div class="category-item-inner" style="width: 390px; height: 158px;">
              <img alt="" width="390" height="158" src="http://103.153.72.195:8080/c/i/e2ae3e583ed772713686864079fb6281.jpg">
              <div class="brief">
                <p class="title">Desserts</p>
                <p class="time">24 hours</p>
              </div>
            </div>
          </div>
          <div class="category-item">
            <div class="category-item-inner" style="width: 390px; height: 158px;">
              <img alt="" width="390" height="158" src="http://103.153.72.195:8080/c/i/e6d40d613e7995c63af20a358ae58ffe.jpg">
              <div class="brief">
                <p class="title">Drinks</p>
                <p class="time">24 hours</p>
              </div>
            </div>
          </div>
          <div class="category-item">
            <div class="category-item-inner" style="width: 390px; height: 158px;">
              <img alt="" width="390" height="158" src="http://103.153.72.195:8080/c/i/1a54f71a6a81c8a836b50f6b80b8470d.jpg">
              <div class="brief">
                <p class="title">Hot Drinks</p>
                <p class="time">24 hours</p>
              </div>
            </div>
          </div>
          <div class="category-item">
            <div class="category-item-inner" style="width: 390px; height: 158px;">
              <img alt="" width="390" height="158" src="http://103.153.72.195:8080/c/i/e03c22b7d4f2e6df5821c7d3d1fd2c29.jpg">
              <div class="brief">
                <p class="title">Alcohol</p>
              </div>
            </div>
          </div>
        </div>
      </div>
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

  window.CategoryModule = CategoryModule;
});
