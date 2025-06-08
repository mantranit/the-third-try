// 'use strict';

// some debug vodMenuApp..
var logCnt = 0;
var logRows = 43; // default if not defined in page

// Outputs to console, on-screen debug area
function cl ()
{
	if (window.console) {
		window.console.log.apply(window.console, arguments);
	}

	window.config = window.config || {};

	window.menuUrlPrefix = window.menuUrlPrefix || '';

	if (window.environment === 'development') {
		// Please stop overriding DB configs, just set the DB config value
		// to what you need. I spend too much time finding out why the DB
		// config settings are being ignored with exceptions like this.
		// window.config.log_js_console_to_server = 1;

		if (!window.config.log_js_console_device_ip) {
			window.config.log_js_console_device_ip = '';
		}
	}

	if (!window.vodMenuApp) {
		window.vodMenuApp = {
			debug: {
				el: null,
				visible: false
			}
		};
	}

	var $debug = $('#debug');
	window.vodMenuApp.debug = {
		el: $debug,
		visible: $debug.is(':visible')
	};

	var debug_el = window.vodMenuApp.debug.el;
	var debug_visible = window.vodMenuApp.debug.visible;

	config.log_js_console_to_server = parseInt(config.log_js_console_to_server, 10);

	if (!debug_visible && config.log_js_console_to_server !== 1) {
		return;
	}

	var i = 1; // first arg [0] is (usually) plain text..
	var str = '';

	for (; i < arguments.length; i++) {
		str += JSON ? JSON.stringify(arguments[i]) + ' : ' : '';
	}

	if (str.length) {
		str = ' ' + str.substr(0, str.length - 3); // remove trailing ' : '
	}

	if (debug_visible) {
		logCnt++;
		if (logCnt > logRows || arguments[0] === 'clear') {
			clearLog();
		} else if (debug_el) {
			debug_el.append(arguments[0] + str + '<br/>');
		}
	}

	if (!vodMenuApp.device) {
		vodMenuApp.device = { ip: null };
	}

	if (config.log_js_console_to_server === 1) {
		// NOTE: if you want to always enable console logging
		// make sure the config 'log_js_console_device_ip' is blank
		// and the config 'log_js_console_to_server' is enabled (1)
		if ((vodMenuApp.device || window.appName === 'signage') &&
			(!config.log_js_console_device_ip ||
			config.log_js_console_device_ip === vodMenuApp.device.ip)) {
			// prefix done
			$.post(window.menuUrlPrefix + '/api/log/console', {
				'msg': arguments[0] + str
			});
		}
	}
}

function clearLog ()
{
	logCnt = 0;
	$('#debug').empty();
}

// Copies the prototype functions to another object
function copyPrototype (descendant, parent)
{
	var sConstructor = parent.toString();
	var aMatch = sConstructor.match(/\s*function (.*)\(/);

	if (aMatch && aMatch[1]) {
		descendant.prototype[aMatch[1]] = parent;
	}

	for (var m in parent.prototype) {
		descendant.prototype[m] = parent.prototype[m];
	}
}

// Output object contents
function dump (obj)
{
	var out='';
	for (var i in obj) {
		out+= i+': '+obj[i]+"\n";
	}
	cl(out);
}

function obj_dump_recursive (object)
{
	for (var property in object) {
		if (object.hasOwnProperty(property)) {
			if (typeof object[property] === 'object') {
				cl('odump: KEY[' + property + ']=[Object]');
				obj_dump_recursive(object[property]);
			} else {
				cl('odump: [---] KEY[' + property + ']=[' + object[property] + ']');
			}
		} else {
			cl('odump: [+++] KEY[' + property + ']=[' + object[property] + ']');
		}
	}
}

function getDeviceIdFromVisit ()
{
	var deviceId = 0;

	if (window.visit && visit.devices && visit.devices[0] && visit.devices[0].device_id) {
		deviceId = parseInt(visit.devices[0].device_id);
	}

	return deviceId;
}

function getRestrictionData (callback)
{
	var geturl = window.menuUrlPrefix +
		'/api/restriction/hw_id=' + browser.GetMacAddress();

	// prefix done
	$.get(geturl, function(res)
	{
		res = res || { 'data': [] };

		// just get the level_id's into an array..
		var arr = [];
		$.each(res.data, function(k, obj) {
			arr.push(parseInt(obj.level_id));
		});

		visit.restrictions = arr;

		if (typeof callback == 'function')
		{
			callback();
		}
	}, 'json');
}

function updateDevice (opts) // old params: (force, wsid, callback)
{
	opts = $.extend({
		force: false,
		wsid: null,
		complete: function(){},
		serial_number: null
	}, opts);

	var url = window.menuUrlPrefix +
		'/api/device/set_ip' +
		'/hw_id=' + browser.GetMacAddress();

	if (opts.wsid) {
		url += '/websocket_id=' + opts.wsid;
	}

	if (opts.serial_number) {
		url += '/serial_number=' + opts.serial_number;
	}

	switch (browser.deviceVendor) {
		case 'default':
		case 'chrome':
			if (opts.force) { // do not update the WS/IP for PC (emulation) unless forced..
				cl('functions.js: updateDevice: forced device update for' +
					' chrome/default emulation: PUT [' + url + ']');

				// prefix done
				$.ajax({
					type: 'PUT',
					url: url,
					error: opts.complete,
					success: opts.complete
				});
			} else {
				cl('functions.js: updateDevice: *** skipping device update and complete for' +
					' chrome/default emulation *** : PUT [' + url + ']');
				// opts.complete(); // nope, only do this on update complete..
			}
			break;

		default:
			cl('functions.js: updateDevice: PUT [' + url + ']');

			// prefix done
			$.ajax({
				type: 'PUT',
				url: url,
				error: opts.complete,
				success: opts.complete
			});
			break;
	}
}

function initKeyHandler (vendor, model)
{
	if (!window.browser) {
		browser = {
			'deviceVendor': null,
			'deviceModel': null
		};
	}

	// may not be a function if outside normal app (e.g. /start)
	// so as a last resort just make every key perform a reload
	if (typeof window.keyhandleTodo !== 'function') {
		window.keyhandleTodo = function()
		{
			window.location.reload();
		};
	}

	if (!browser.deviceVendor || !browser.deviceModel) {
		var d = getDeviceInfo();
		browser.deviceVendor = d.deviceVendor;
		browser.deviceModel  = d.deviceModel;
	}

	vendor = vendor || browser.deviceVendor;
	model = model || browser.deviceModel;
	cl('functions.js: initKey Handler, using browser[' + vendor + ':' + model + ']');

	// leave these as typeof, using !window.RMT_RED will also be true if the value is 0 !!
	if (typeof RMT_RED === 'undefined' || typeof RMT_HELP2 === 'undefined') {
		// some of the key js files depend on browser.deviceModel..
		var geturl = window.menuUrlPrefix +
			'/common/js/vod/device/keys/' + browser.deviceVendor + '.js';

		// prefix done
		$.getScript(geturl, function()
		{
			cl('functions.js: initKey Handler, RMT_RED or RMT_HELP2 not set, ' +
				'get keys for browser[' + browser.deviceVendor + ':' + browser.deviceModel + ']');

			initKeyHandler(browser.deviceVendor, browser.deviceModel);
		})
		.fail(function()
		{
			// failsafe if getscript fails..
			cl('functions.js: initKey Handler, getscript failed, setting up failsafe handlers');

			document.onkeydown = function()
			{
				window.location.reload();
			};

			document.onkeypress = document.onkeydown;
		});

		return;
	}

	switch (vendor) {
		// webkit based browsers (hbrowser, procentric, motorola)..
		case 'lge':
		case 'samsung':
		case 'sstizen':
		case 'chrome':
		case 'motorola':
			document.onkeydown = keyhandleTodo;
			document.onkeypress = null;

			if (window.vodMenuApp) {
				vodMenuApp.flags.keyhandlerLoaded = true;
			}
			break;

		// opera / mozilla based browsers (amino 130/140, philips 2k11-14)
		default:
			// well, well, amino has switched sides with the 150..
			if (model === 'a150h') {
				document.onkeypress = null;
				document.onkeydown = keyhandleTodo;
			} else {
				document.onkeypress = keyhandleTodo;
				document.onkeydown = null;
			}

			if (window.vodMenuApp) {
				vodMenuApp.flags.keyhandlerLoaded = true;
			}
			break;
	}
}

// Displays popup with single OK button, waits for user to press OK before continuing
function prompt (message, opts)
{
	var settings = $.extend({
		'complete'    : function(){},
		'enablekeys'  : true,
		'autoclear'   : false,
		'header'      : null,
		'padding_top' : null,
		'fadetime'    : 300
	}, opts);

	if (!window.config) {
		window.config = {};
	}

	if (!window.iptv) {
		window.iptv = {
			'playing': false
		};
	}

	if (!window.vodMenuApp) {
		window.vodMenuApp = {
			'flags': {
				'ignoreKeyUntil': false
			},
			'timers': {
				'promptAutoClear': null
			},
			'menuType': 'unknown'
		};
	}

	if (!window.menuPageController) {
		window.menuPageController = {};
	}

	if (!menuPageController.storeKeyHandlers) {
		menuPageController.storedKeyHandler = {};

		menuPageController.storeKeyHandlers = function(name)
		{
			this.storedKeyHandler[name] = window.currentKeyAction;
		};

		menuPageController.restoreKeyHandlers = function(name)
		{
			if (this.storedKeyHandler[name]) {
				window.currentKeyAction = this.storedKeyHandler[name];
				this.storedKeyHandler[name] = null;
			}
		};
	}

	var pageid = 'body';
	if ($('#pageload')[0]) {
		pageid = '#pageload';
	}

	var storeKeys = true;

	vodMenuApp.menuHelpers.enableKeyControl();

	cl('functions.js: prompt init: message[' + message + '] pageid[' + pageid + ']');

	if (settings.header)
	{
		message = '<div id="prompt-header">' + settings.header + '</div>' + message;
	}

	if (settings.enablekeys)
	{
		message += '<div class="ok">OK</div>';
	}

	var $promptMessage = $('#prompt-message');
	if ($promptMessage[0])
	{
		/*
		// if the prompt is on the screen, they haven't pressed
		// OK, which means currentKeyAction is still promptkeys..
		// in this case, we don't want to override storedKeyaction
		// with the prompt keys, we want to keep it as it was stored
		// when the prompt first appeared
		*/
		storeKeys = false;
		$promptMessage.html(message);

	}
	else
	{
		$(pageid).append(
			'<div id="prompt-message">' + message + '</div>'
		);
		$promptMessage = $('#prompt-message');
	}

	// vodtranslate() is not always available because prompt() can
	// be called by pages that do not include the translate plugin..
	if (typeof $.fn.vodtranslate === 'function')
	{
		$promptMessage.vodtranslate();
	}

	//
	// begin config of prompt css (should be below the append)
	//

	var e_top = '';
	var e_left = '';
	var e_height = '';
	var e_width = '';
	var e_padding_top = '';

	switch (config.menu_prompts_window_size)
	{
		case 'small-box':
		{
			e_top = '220px';
			e_left = '280px';
			e_width = '60%';
			e_height = 'auto';
			e_padding_top = settings.padding_top ? settings.padding_top : '15px';
		} break;

		case 'large-box':
		{
			e_top = '210px';
			e_left = '130px';
			e_width = '80%';
			e_height = '250px';
			e_padding_top = settings.padding_top ? settings.padding_top : '30px';
		} break;

		case 'fit-screen':
		{
			e_top = '0px';
			e_left = '0px';
			e_height = '100%';
			e_width = '100%';
			e_padding_top = settings.padding_top ? settings.padding_top : '230px';
		} break;

		default:
		case 'fit-width':
		{
			e_top = '50px';
			e_left = '0px';
			e_height = '370px';
			e_width = '100%';
			e_padding_top = settings.padding_top ? settings.padding_top : '130px';
		} break;
	}

	$promptMessage.css({
		'font-variant' : config.menu_prompts_font_variant,
		'top'          : e_top,
		'left'         : e_left,
		'width'        : e_width,
		'min-height'   : e_height,
		'padding-top'  : e_padding_top
	}).show();

	$('#loadingScreen').hide(); // this will be over the top of our early prompts..

	//
	// end config of prompt css
	//

	function promptEnter ()
	{
		clearTimeout(vodMenuApp.timers.promptAutoClear);

		cl('functions.js: prompt: promptEnter init..');

		var promptEnterHidden = function(rem)
		{
			if (rem)
			{
				$('#prompt-message').remove();
			}

			// todo this is hack,
			// todo need to rewrite the prompt
			if (config.menu_type === 'dropdown' && !$('#pageload').html() && menuPageController)
			{
				//back to homepage
				menuPageController.backToHomePage();
			}
			menuPageController.restoreKeyHandlers('pre-prompt');
			settings.complete();
		};

		var $promptMessage = $('#prompt-message');
		if ($promptMessage[0])
		{
			if (settings.fadetime > 0 && window.browser && browser.deviceVendor !== 'exterity')
			{
				$promptMessage.hide(settings.fadetime, function() {
					promptEnterHidden(true);
				});
			}
			else
			{
				promptEnterHidden(true);
			}
		}
		else
		{
			promptEnterHidden(false);
		}
	}

	if (settings.autoclear)
	{
		clearTimeout(vodMenuApp.timers.promptAutoClear);
		vodMenuApp.timers.promptAutoClear = setTimeout(function() {
			promptEnter();
		}, settings.autoclear);
	}

	// if we haven't even got to the keyhandler yet
	// make every key run the enter function..
	// this is common if the DB is down on first page load
	if (!vodMenuApp.flags.keyhandlerLoaded)
	{
		initKeyHandler();
	}

	if (vodMenuApp.menuType !== 'vod')
	{
		return;
	}

	var PromptProcessKeys = function PromptProcessKeys(){
		base_Keys.call(this);
	};

	var launchIptvIfConfigured = function()
	{
		if (window.config &&
			config.iptv_enabled == 1 &&
			window.menuPageController &&
			typeof menuPageController.switchIptv === 'function') {
			menuPageController.switchIptv();
		}
	};

	PromptProcessKeys.prototype = Object.create(base_Keys.prototype);
	PromptProcessKeys.prototype.constructor = PromptProcessKeys;

	PromptProcessKeys.prototype.keyChannelUp = launchIptvIfConfigured;
	PromptProcessKeys.prototype.keyChannelDown = launchIptvIfConfigured;
	PromptProcessKeys.prototype.keyTv = launchIptvIfConfigured;

	PromptProcessKeys.prototype.keyYellow = function()
	{
		if (window.menuPageController && typeof menuPageController.reset === 'function') {
			menuPageController.reset();
		} else {
			window.location.reload(true);
		}
	};

	var promptKeyAction = new PromptProcessKeys();

	if (storeKeys)
	{
		menuPageController.storeKeyHandlers('pre-prompt');
	}

	if (!settings.enablekeys)
	{
		// disabling all keys..
		currentKeyAction = promptKeyAction;
		return;
	}

	PromptProcessKeys.prototype.keyEnter = promptEnter;

	currentKeyAction = promptKeyAction;
}

function secondsToTime (seconds)
{
	// STTv2
	if (isNaN(seconds) || seconds === 0)
	{
		return '0:00:00';
	}

	var minus = '';

	if (seconds < 0)
	{
		minus = '-';
		seconds = Math.abs(seconds);
	}

	if (seconds < 60)
	{
		if (seconds < 10)
		{
			seconds = '0' + seconds;
		}

		return minus + '0:00:' + seconds;
	}

	var mins = Math.floor(seconds / 60);
	var srem = seconds % 60;

	if (mins < 60)
	{
		if (mins < 10)
		{
			mins = '0' + mins;
		}

		if (srem < 10)
		{
			srem = '0' + srem;
		}

		return minus + '0:' + mins + ':' + srem;
	}

	var hrs = Math.floor(mins / 60);
	var mrem = mins % 60;

	if (mrem < 10)
	{
		mrem = '0' + mrem;
	}

	if (srem < 10)
	{
		srem = '0' + srem;
	}

	return minus + hrs + ':' + mrem + ':' + srem;
}

function timestamp ()
{
	var d = new Date();
	return d.getTime();
}

function pad10 (n)
{
	if (n.length > 1) return n;
	return (n < 10 && n >= 0) ? ('0' + n) : n;
}

function get_mysql_datetime ()
{
	var d = new Date();
	return d.getFullYear() + '-' +
		pad10(d.getMonth() + 1) + '-' +
		pad10(d.getDate()) + ' ' +
		pad10(d.getHours()) + ':' +
		pad10(d.getMinutes()) + ':' +
		pad10(d.getSeconds());
}

function ucfirst(str)
{
	//  discuss at: http://phpjs.org/functions/ucfirst/
	// original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// bugfixed by: Onno Marsman
	// improved by: Brett Zamir (http://brett-zamir.me)
	//   example 1: ucfirst('kevin van zonneveld');
	//   returns 1: 'Kevin van zonneveld'

	str += '';
	var f = str.charAt(0).toUpperCase();
	return f + str.substr(1);
}

function ucwords (str)
{
	/*
	discuss at: http://phpjs.org/functions/ucwords/
	original by: Jonas Raoni Soares Silva (http://www.jsfromhell.com)
	improved by: Waldo Malqui Silva (http://waldo.malqui.info)
	improved by: Robin
	improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	bugfixed by: Onno Marsman
	   input by: James (http://www.james-bell.co.uk/)
	  example 1: ucwords('kevin van  zonneveld');
	  returns 1: 'Kevin Van  Zonneveld'
	  example 2: ucwords('HELLO WORLD');
	  returns 2: 'HELLO WORLD'
	*/

	return (str + '').replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g, function ($1) {
		return $1.toUpperCase();
	});
}

// http://phpjs.org/functions/nl2br/
function nl2br (str, is_xhtml)
{
	/*
	original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	example 1: nl2br('Kevin\nvan\nZonneveld');
	returns 1: 'Kevin<br />\nvan<br />\nZonneveld'

	example 2: nl2br("\nOne\nTwo\n\nThree\n", false);
	returns 2: '<br>\nOne<br>\nTwo<br>\n<br>\nThree<br>\n'

	example 3: nl2br("\nOne\nTwo\n\nThree\n", true);
	returns 3: '<br />\nOne<br />\nTwo<br />\n<br />\nThree<br />\n'
	*/
	var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>';
	return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

function basename (path, suffix)
{
	/*
	discuss at: http://phpjs.org/functions/basename/
	original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	improved by: Ash Searle (http://hexmen.com/blog/)
	improved by: Lincoln Ramsay
	improved by: djmix
	improved by: Dmitry Gorelenkov
	  example 1: basename('/www/site/home.htm', '.htm');
	  returns 1: 'home'
	  example 2: basename('ecra.php?p=1');
	  returns 2: 'ecra.php?p=1'
	  example 3: basename('/some/path/');
	  returns 3: 'path'
	  example 4: basename('/some/path_ext.ext/','.ext');
	  returns 4: 'path_ext'
	*/

	var b = path;
	var lastChar = b.charAt(b.length - 1);

	if (lastChar === '/' || lastChar === '\\')
		b = b.slice(0, -1);

	b = b.replace(/^.*[\/\\]/g, '');

	if (typeof suffix === 'string' && b.substr(b.length - suffix.length) == suffix)
		b = b.substr(0, b.length - suffix.length);

	return b;
}

// get query string in JS
// NOTE: location.search will be the caller page (i.e. /menu/index.php), not ajax.load()ed ones
// for that, see the 'pageLoad Qs' global object (js/pagecontroller.js)
function qstr (a)
{
	a = a || location.search; // includes '?'
	if (!a) return {};
	var c=a.indexOf('?');
	if (c===-1) return {};
	a = a.substr(c+1).split('&');

	var b={};
	for (var i=0;i<a.length;++i)
	{
		var p=a[i].split('=',2);
		if (p.length==1)
			b[p[0]]='';
		else
			b[p[0]]=decodeURIComponent(p[1].replace(/\+/g,' '));
	}
	return b;
}

// http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
function escapeRegExp (string)
{
	return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll (string, find, replace)
{
	return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function getDeviceInfo ()
{
	var ua = navigator.userAgent || 'unknown';

	var deviceVendor = 'default'; // was browserType.  This is the vendor (philips/amino etc)
	var deviceModel = 'pc'; // this is the closest to cms 'device_type' (device table 'type' field) it was 'deviceType' This is the model (a130h/vip1113 etc)
	var content_type = 'text/html; charset=utf-8';
	var protocol_support = ['http:', 'https:'];
	var video_format_support = ['h264_mp4'];

	if (ua.indexOf('Philips') > -1)
	{
		deviceVendor = 'philips_2k14';

		if (ua.match(/HFL[57]011/))
		{
			deviceModel = '2k17';
		}
		else
		{
			deviceModel = '2k14';
		}

		content_type = 'application/ce-html+xml; charset=UTF-8';
	}
	else if (ua.indexOf('LG Browser') > -1) // Normal Pro:Centric (LY750/LT760)
	{
		deviceVendor = 'lge';
		deviceModel = 'lge';
	}
	else if (ua.indexOf('LGE') > -1) // WebOS Pro:Centric (2015+, LX76x) - 'PBRM/1.0 ( ;LGE ;32LX761H-GA ;03.00.07 ;0x00000001)'
	{
		deviceVendor = 'lge';
		deviceModel = 'lge';
	}
	else if (ua.indexOf('moto-mob') > -1 ||
		ua.indexOf('KreaTV') > -1 ||
		ua.indexOf('-arris') > -1)
	{
		deviceVendor = 'motorola';
		deviceModel = 'vip1113';
		protocol_support = ['rtsp:'];
		video_format_support = ['mpeg2_ts'];
	}
	else if (ua.indexOf('SmartHub') > -1)
	{
		deviceVendor = 'samsung';
		deviceModel = 'samsung';
	}
	else if (ua.toLowerCase().indexOf('smart-tv; linux; tizen') > -1)
	{
		deviceVendor = 'sstizen';
		deviceModel = 'sstizen';
	}
	else if (ua.indexOf('Amino') > -1)
	{
		protocol_support = ['rtsp:'];
		video_format_support = ['mpeg2_ts'];

		deviceVendor = 'amino';
		deviceModel = 'a140h';

		if (ua.indexOf('Version/10.') > -1)
		{
			deviceModel = 'a130h';
		}

		if (ua.indexOf('Version/12.') > -1)
		{
			deviceModel = 'a150h';
			video_format_support.push('h264_mp4');
			protocol_support.push('http:');
		}
	}
	else if (ua.indexOf('curl') > -1)
	{
		deviceVendor = 'curl';
	}
	else if (ua.indexOf('ANTGalio') > -1)
	{
		deviceModel = 'r9300';
		deviceVendor = 'exterity';
		protocol_support = ['rtsp:'];
		video_format_support = ['mpeg2_ts'];
	}
	else if (ua.indexOf('Chrome') > -1 || ua.indexOf('AppleWebKit') > -1)
	{
		deviceVendor = 'chrome';
	}

	return {
		'deviceVendor': deviceVendor,
		'deviceModel': deviceModel,
		'content_type': content_type,
		'protocol_support': protocol_support,
		'video_format_support': video_format_support
	};
}

function ajaxPing (statusCode, statusText, responseText, originalUrl, thrownError)
{
	originalUrl = originalUrl || 'not_set';
	cl('functions.js: ajaxPing: code[' + statusCode+'] err[' + statusText + '] url[' + originalUrl + ']');

	// urls where we dont throw an error..
	// basically urls not required for initial loading or critical operation..
	// these may occasionally timeout on slow connections, we don't want to alarm
	// the user..
	if (statusCode === 0 || statusText === 'timeout')
	{
		if (originalUrl == '/api/customise')
		{
			return;
		}
		else if (originalUrl.indexOf('/api/device/set_ip') > -1)
		{
			return;
		}
		else if (originalUrl.indexOf('/api/weather') > -1)
		{
			return;
		}
		else if (originalUrl.indexOf('/api/twitter') > -1)
		{
			return;
		}
		else if (originalUrl.indexOf('/api/welcome') > -1)
		{
			return;
		}
		else if (originalUrl.indexOf('/api/info') > -1)
		{
			return;
		}
		else if (originalUrl.indexOf('/api/tv/reminder') > -1)
		{
			return;
		}
		else if (originalUrl.indexOf('/api/tv/epg') > -1)
		{
			return;
		}
		else if (originalUrl.indexOf('/api/folio') > -1)
		{
			return;
		}
		else if (originalUrl.indexOf('/api/internet') > -1)
		{
			return;
		}
	}

	var m = {};
	m.url = '/api/ping';
	m.originalurl = originalUrl;
	m.code = statusCode || 0;
	m.err = statusText || 'unknown';
	m.thrownerror = thrownError || '';
	m.text = responseText || '';
	m.pinginterval = 5000;
	m.showprompt = true;
	m.enablekeys = false;

	// non timeouts are treated differently..
	// need to check the original URL, ping url is only for timeout cases..
	if (statusCode >= 400)
	{
		m.url = originalUrl || '/whatthe/heck'; // originalUrl should always be defined here..
		m.enablekeys = true;
		m.pinginterval = 25000;

		cl('functions.js: ajaxPing: FATAL ERROR code (non-timeout) [' + statusCode + '] [' + statusText + '] originalUrl[' + originalUrl + ']');
	}
	else
	{
		originalUrl = originalUrl || '/api/ping'; // make sure original URL isn't undefined..
	}

	if (vodMenuApp.fault.url !== null)
	{
		cl('functions.js: ajaxPing: faulturl[' + vodMenuApp.fault.url + '] registered, ignoring this one[' + originalUrl + ']');
		return;
	}

	vodMenuApp.fault.url = originalUrl;
	vodMenuApp.fault.status = m.code;
	vodMenuApp.fault.error = m.err;
	vodMenuApp.fault.text = m.thrownerror + ', code:' + m.text;

	doerror(m);

	clearInterval(vodMenuApp.timers.ping);

	if (!window.iptv)
	{
		window.iptv = { 'playing': false };
	}

	if (!window.config)
	{
		window.config = {
			iptv_error_prompt: 1
		};
	}

	if (!iptv.playing)
	{
		vodMenuApp.timers.ping = setInterval(function() {
			doping(m);
		}, m.pinginterval);
	}

	function doping (m)
	{
		cl('functions.js: ajaxPing: doping: m.code[' + m.code + '] m.err[' + m.err + ']');

		// prefix not needed
		$.ajax({
			'url': m.url,
			'timeout': 2000,
			'dataType': 'json',
			'success': function()
			{
				cl('ajaxPing: doping success');
				clearInterval(vodMenuApp.timers.ping);
				var d = new Date();
				var n = d.toLocaleTimeString();
				var promptMessage =
					'Connection to the server restored at [' + n + ']<br/><br/>' +
					'Press OK to close this message and load the menu';

				var posturl = window.menuUrlPrefix +
					'/api/log/ajax/ERROR';

				// prefix done
				$.post(posturl, {
					'msg': 'UI recovered from AJAX error',
					'extra':
						'url[' + vodMenuApp.fault.url + '], ' +
						'status['+ vodMenuApp.fault.status + '], ' +
						'error[' + vodMenuApp.fault.error + '], ' +
						'text[' + vodMenuApp.fault.text + ']'
				})
				.done(function() {
					cl('functions.js: ajaxPing: POST /api/log success after connection restored');
				})
				.fail(function() {
					cl('functions.js: ajaxPing: POST /api/log failed after connection restored');
				})
				.always(function() {
					vodMenuApp.fault.url = null;
					vodMenuApp.fault.status = null;
					vodMenuApp.fault.error = null;
					vodMenuApp.fault.text = null;
				});

				prompt(promptMessage, {
					'autoclear': 30000, // show prompt for 30s but clear if user doesn't press OK..
					'complete': function()
					{
						if (!window.iptv)
						{
							iptv = { 'playing': false };
						}

						if (!window.ssGlobalTodo)
						{
							ssGlobalTodo = { 'playing': false };
						}

						if (iptv.playing || vodMenuApp.screensaver.isScreenSaverOn())
						{
							/*
							//If we're on these pages, we don't need
							//to do this, they should recover on their own..
							//location.href = '/menu';
							*/
							return;
						}

						if (window.menuPageController &&
							vodMenuApp.menuTypeCarousel.getMenu().pages)
						{
							menuPageController.pageOptions = {};
							menuPageController.backToHomePage();
							return;
						}

						redirectUrlDepressed();
					}
				});
			},
			'error': function() {
				doerror(m);
			}
		});
	}

	function redirectUrlDepressed()
	{
		window.location.href = '/start/index.html';
	}

	function doerror (m)
	{
		// update prompt to indicate still problem
		var d = new Date();
		var n = d.toLocaleTimeString();

		cl('functions.js: ajaxPing: doerror: m.code[' + m.code + '] m.err[' + m.err + '] n[' + n + ']');

		var promptMessage =
			'Whoops, we lost connection to our server at [' + n + ']<br/>' +
			'[Code: ' + m.code + ', Text: ' + m.err + ']<br/>' +
			'[URL: ' + m.url + ', oURL: ' + m.originalurl + ']<br/>';

		if (m.code == 490) // js eval, the UI won't recover from this without code change, so log+email it..
		{
			var posturl = window.menuUrlPrefix +
				'/api/log/ajax/ERROR';

			// prefix done
			$.post(posturl, {
				'msg': 'UI JS EVAL error',
				'extra':
					'url[' + m.originalurl + '], ' +
					'code['+ m.code + '], ' +
					'error[' + m.err + '], ' +
					'thrownerror[' + m.thrownerror + '], ' +
					'text[' + m.text + ']'
			});
		}

		var thiscomplete = redirectUrlDepressed;

		var autoclear = false;

		// If user is watching TV we want to show an error
		// but not stop them from continuing to watch TV..
		// The IPTV page can sustain network loss to our server
		// as long as the initial channel plan has loaded OK..
		if (iptv.playing)
		{
			vodMenuApp.fault.url = null;
			vodMenuApp.fault.status = null;
			vodMenuApp.fault.error = null;
			vodMenuApp.fault.text = null;

			// disable prompt display if config off
			if (config.iptv_error_prompt != 1)
			{
				cl('ajaxPing: suppress prompt on iptv page as configured, m:', m);
				return;
			}

			cl('ajaxPing: show prompt on iptv page as configured, m:', m);

			thiscomplete = function()
			{
				iptv.switchchannel(iptv.startchannel);
				iptv.showosd();
				iptv.hideosd(); // after 6sec timer
			};

			m.enablekeys = true;
			autoclear = 10000;

			promptMessage += 'Press OK to close..';
		}
		else
		{
			if (m.enablekeys)
			{
				promptMessage += 'Press OK to try and reload menu..';
			}
			else
			{
				promptMessage += 'Attempting to restore connection..';
				thiscomplete = null;
			}
		}

		prompt(promptMessage, {
			'complete': thiscomplete,
			'enablekeys': m.enablekeys,
			'autoclear': autoclear
		});
	}
}

function enterFullscreen (el, buttonId)
{
	if (el.requestFullscreen)
	{
		el.requestFullscreen();
		cl('el.requestFullscreen called');
	}
	else if (el.mozRequestFullScreen)
	{
		el.mozRequestFullScreen();
		cl('el.mozRequestFullScreen called');
	}
	else if (el.webkitRequestFullscreen)
	{
		el.webkitRequestFullscreen();
		cl('el.webkitRequestFullscreen called');
	}
	else if (el.msRequestFullscreen)
	{
		el.msRequestFullscreen();
		cl('el.msRequestFullscreen called');
	}
	else
		cl('no fullscreen function for el:', el);

	$(buttonId).html('Exit Fullscreen');
	// this for the freestyle menu only
	$('#fullscreen_img').css("background-image","url(images/exit_fullscreen.png)");
}

function exitFullscreen (buttonId)
{
	if (document.exitFullscreen)
	{
		document.exitFullscreen();
	}
	else if (document.mozCancelFullScreen)
	{
		document.mozCancelFullScreen();
	}
	else if (document.webkitExitFullscreen)
	{
		document.webkitExitFullscreen();
	}
	else if (document.msExitFullscreen)
	{
		document.msExitFullscreen();
	}

	$(buttonId).html('Enter Fullscreen');
	// this for the freestyle menu only
	$('#fullscreen_img').css("background-image","url(images/enter_fullscreen.png)");
}

function toggleFullscreen (el, buttonId)
{
	var fullscreenEnabled =
		document.fullscreenEnabled ||
		document.mozFullScreen || // mozFullscreenEnabled
		document.webkitIsFullScreen;

	if (fullscreenEnabled)
	{
		exitFullscreen(buttonId);
	}
	else
	{
		enterFullscreen(el, buttonId);
	}
}

function makeid (len)
{
	len = len || 5;
	var t = '';
	var p = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (var i = 0; i < len; i++)
	{
		t += p.charAt(Math.floor(Math.random() * p.length));
	}

	return t;
}

// Some jQ helpers
$.fn.visible = function(){
	return this.css('visibility', 'visible');
};

$.fn.invisible = function(){
	return this.css('visibility', 'hidden');
};

$.fn.toggleVisibility = function(){
	return this.css('visibility', function(i, visibility){
		return (visibility == 'visible') ? 'hidden' : 'visible';
	});
};

// Setting up a jQuery special event to trigger the destroy event on remove
// This is required for [ $('#el').on('destroyed', function(){}) ] to work
$(function()
{
	$.event.special.destroyed = {
		'remove': function(o){
			if (o.handler)
				o.handler();
		}
	};

	if (!window.vodMenuApp)
	{
		window.vodMenuApp = {
			screensaver: {
				isScreenSaverOn: function(){},
				stopScreenSaver: function(){}
			}
		};
	}

	vodMenuApp.clearUiForVideo = function()
	{
		// This covers case where screensaver is already playing
		// This would be quite rare..
		if (vodMenuApp.screensaver.isScreenSaverOn()) {
			vodMenuApp.screensaver.stopScreenSaver();
		}

		// this prevents the screensaver from starting. this is very important
		ssGlobalTodo.enabled = false;
		ssGlobalTodo.clearSetTimeout();

		if (window.config && config.scrolling_background == 1) {
			$.vegas('stop');
			$.vegas('destroy');
		}
		$('.vegas-background').remove();

		// The remove() must be above cb.hide() because cb.update() is called inside
		// .page destroyed callback on the info.js page which re-adds the buttons
		// if (for example) you press channel up while on the info page (or other page that)
		// has a .page destroyed event handler..

		// VL: Changed from .remove() to .hide() 5/11/17 in prep for being able to re-enter
		// the main menu without a page reload.. tagging these changes with '#VOD-387#'
		var divsToHide = '#pagewrap, #js-display-signage, #loadingScreen, #popupmessage, #inputselect';

		if (browser.deviceVendor === 'sstizen' ||
			browser.deviceVendor === 'chrome') {
			$(divsToHide).hide();
		} else { // old behaviour
			$(divsToHide).remove();
		}

		$('#js-cron-indicators').hide();

		if (window.cb && typeof cb.hide === 'function') {
			cb.hide();
		}

		if (window.menuPageController &&
			typeof menuPageController.stopSignageJsFunctions === 'function') {
			menuPageController.stopSignageJsFunctions();
		}

		if (window.browser &&
			typeof browser.SetVideoWindow === 'function') {
			browser.SetVideoWindow({'remove': true});
		}
	};

	vodMenuApp.configBgStartFp = function(opts)
	{
		opts = opts || {
            isToStartFrontPage: true
		};

		// only exec this if not booting to IPTV otherwise
		// 'checkWelcome' will redirect us back to the UI
		// if there is an unread welcome message!
		$('#messages').vodNotification('init');

		menuPageController.ConfigureBackground(function()
		{
			if (!window.visit) {
				window.visit = {si_logo: 'none'};
			}

			visit.si_logo = visit.si_logo || 'none';

			var siLogoUrl = window.menuUrlPrefix +
				'/common/uploads/logos/si/' + visit.si_logo;

			if (visit.si_logo !== 'none') {
				$('#sibranding')
					.css('background', 'url(\'' + siLogoUrl + '\') no-repeat')
					.show();
			}

			if (opts.isToStartFrontPage === true) {
				menuPageController.startFrontPage();
			}

			$('#contextbuttons').vodtranslate();
			cb.show();

			window.sharedModules.uiHelpers.hideLoadingScreen();
		});
	};
});
// END jQ helpers


function requestCallAPI (url, data, opts, method)
{
	opts = opts || {};
	method = method || 'get';

	url = window.menuUrlPrefix + url;

	// prefix done
	$.ajax({
		url: url,
		data: data,
		dataType: 'json',
		method: method,
		success: function(res)
		{
			if (res.result === 'success' && _.isFunction(opts.success))
			{
				opts.success(res);
			}
			else if (_.isFunction(opts.error))
			{
				opts.error(res.description);
			}
		},
		error: function(jqXHR, texStatus, errorThrown)
		{
			if (_.isFunction(opts.error))
			{
				opts.error(texStatus + ' - ' + errorThrown);
			}
		}
	});
}

function clearScreenAndPlayMulticast(data)
{
	data = data || {};

	window.vodMenuApp.clearUiForVideo();

	$('#player_wrap, #multicast_wrap').css({
		'box-shadow'    : 'none',
		'border'        : 'none',
		'border-radius' : 0
	});

	browser.SetVideoWindow({
		'protocol': 'udp',
		'complete': function()
		{
			browser.PlayIPTV({
				'ip': data.opt1,
				'port': data.opt2,
				'protocol': 'udp',
				'left': 0,
				'top': 0,
				'width': $(window).width(),
				'height': $(window).height()
			});
		}
	});
}

var disableKeyCtrlCount = 0;

function disableKeyControl() {
	cl('[functions.js] disableKeyControl');
    vodMenuApp.flags.ignoreKeyUntil = true;
    disableKeyCtrlCount++;
    setTimeout(function(){
        disableKeyCtrlCount--;
        if(!disableKeyCtrlCount) {
            vodMenuApp.flags.ignoreKeyUntil = false;
		}
	}, 6000);
}



function signagePlayMulticast(data)
{
	data = data || {};
	$('#js-display-signage').remove();
	$('#player_wrap, #multicast_wrap').css({
		'box-shadow'    : 'none',
		'border'        : 'none',
		'border-radius' : 0
	});

	browser.SetVideoWindow({
		'protocol': 'udp',
		'complete': function()
		{
			browser.PlayIPTV({
				'ip': data.opt1,
				'port': data.opt2,
				'protocol': 'udp',
				'left': 0,
				'top': 0,
				'width': $(window).width(),
				'height': $(window).height()
			});
		}
	});
}
