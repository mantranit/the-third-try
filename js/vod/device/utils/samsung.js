// SAMSUNG
var samsungSEF;       // IPTV ops ('IPTV')
var samsungSEFNAVI;   // Network ops ('Network')
var samsungSEFTV;     // Closed captions ('TV')
var samsungSEFWindow; // Closed captions ('Window')
var samsungSEFTask;   // Task manager ops (e.g. start screen mirror)
var samsungSEFDRM;    // IPTV+HLS DRM ops
var samsungSEFVOL;    // 2012 Volume ops
var samsungSEFHOTEL;  // Power/reboot ops

var samsungCommon;    // Key management ops
var samsungWindow;    // IPTV ops (screen sizing, RF channel changing)
var samsungTime;      // EPG ops
var samsungTV;        // EPG ops
var samsungWidgetAPI; // misc API ops

// Constants discovered over time through various example code
var PL_TV_EVENT_CHANGE_POWER_STATE = 211;
var PL_TV_SOURCE    = 0;  // RF tuner
var PL_HDMI1_SOURCE = 31; // HDMI1 input
var PL_IPTV_SOURCE  = 45; // playing IPTV content
var PL_MEDIA_SOURCE = 43; // playing HTTP content
var PL_ISP_SOURCE   = 48; // ?? H.Browser
var PL_POWER_OFF_EVENT = 6;
var PL_POWER_ON_EVENT = 7;

var PL_SOURCE_CHANGE_TRIGGER = 126; // I created this one (not SS)

var samsungNetEvent = function (e, data1, data2)
{
	var conn = data1 == 1 ? 'connected' : 'disconnected';
	var type = null;

	switch (e)
	{
		case 0:
			type = 'network cable';
			break;

		case 1:
			type = 'wifi';
			break;

		case 2:
			//type = 'router';
			break;
	}

	cl('SAMSUNG: net event: ' + type + ' ' + conn + ', data2[' + data2 + ']');

	if (conn == 'disconnected' && type)
	{
		// ajaxPing() may not exist in some cases
		if (typeof ajaxPing === 'function')
		{
			ajaxPing(100, 'tv ' + type + ' disconnected', '', 'samsung_net_event');
		}
	}
};
