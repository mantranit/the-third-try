// 'use strict';

function SetPIG2 (m_top, m_left, m_width, m_height)
{
	var preview_video_window = VideoDisplay.GetVideoWindow();
	if (preview_video_window != null)
	{
		var video_window = preview_video_window.GetRectangle();

		if (m_width == 0)
		{
			preview_video_window.state = 'fullscreen';
			preview_video_window.SetRectangle(video_window);
			return true;
		}

		preview_video_window.state = 'window';
		video_window.top = m_top;
		video_window.left = m_left;
		video_window.width = m_width;
		video_window.height = m_height;
		preview_video_window.SetRectangle(video_window);
		cl('AMI: SetPIG2: top:' + m_top + ', left:' + m_left + ', res:' + m_width + ' x ' + m_height);
		return true;
	}
	else
	{
		cl('AMI: ERROR: SetPIG2: preview_video_window is null!');
	}
}

// must not be called without browser object
function aminoSxpGetPowerStatus (str)
{
	// Split on SXP trailing bytes 0xA5A5
	var tmp = str.split("A5A5");
	var len = tmp.length - 1;

	for (var i = 0; i < len; i++)
	{
		// Get 2 hex bytes (4 string chars):
		// - command type (0x20 - 0x22)
		// - command code (we only care about extended status response [0x22 0x14])
		var sxpcmd = tmp[i].substr(16, 4);

		if (sxpcmd === "2214") // 0x2214
		{
			// Power status
			// we only care about the top 2 bits of 2nd param
			// (NN)xxxxxx
			// (00) 0x00/0   = TV in standby mode
			// (01) 0x40/64  = TV in on mode
			// (10) 0x80/128 = TV transiting standby to on
			// (11) 0xC0/192 = TV transiting on to standby
			var extstatparam2 = tmp[i].substr(22, 2); // get 1 byte (param2)
			var res = 0xC0 & parseInt(extstatparam2, 16);

			switch (res)
			{
				case 0:
				{
					// TV is in standby mode
					browser.tvPowerOn = false;
				} break;

				case 64:
				{
					// TV is on
					browser.tvPowerOn = true;
				} break;

				case 128:
				{
					// TV transiting from standby to on
					browser.tvPowerOn = false;
				} break;

				case 192:
				{
					// TV transiting from on to standby
					browser.tvPowerOn = true;
				} break;
			}
		}
	}
}

// must not be called without browser object
function aminoSxpTVIEvent ()
{
	if (!amino_tvi_support)
	{
		return;
	}

	if (TVI.Event === '1A')
	{
		return true;
	}

	// We wanted a request for power, and we're getting it
	if (browser.sxpPowerRequest)
	{
		aminoSxpGetPowerStatus(TVI.Event);
		browser.sxpPowerRequest = false;
		browser.sxpGotPowerStatus = true;
	}
}

function amino_processNetManEvent(e)
{
	cl('AMI: NetMan event [' + NetMan.Event + ']');
}

function vodAminoEvent (e)
{
	var message = e.split('|');

	cl('vodAminoEvent: message[' + message[0] + ']');

	switch (message[0])
	{
		// These 3 are the 'core' (important) ones
		// the rest and just ideas/concepts to play with..
		case 'redirect':
		{
			location.href = message[1];
		} break;

		case 'welcome':
		case 'welcome_message':
		{
			/*
			 Only redirect if not turning on to IPTV.
			 If the hotel expects the TV to always turn on to IPTV
			 then it is VERY likely they will expect the same for the
			 welcome switch on.
			*/

			// note: config is in scope for legacy and modern..
			if (window.config)
			{
				config = {'amino_tvi_on_to_iptv': '0'};
			}

			if (config.amino_tvi_on_to_iptv != '1')
			{
				location.href = window.menuUrlPrefix + '/menu/?from=menu&event=welcome';
			}
		} break;

		case 'tvon':
		case 'tvOn':
		{
			TVI.TVOn();
			//TVI.Send('0E0E00000505000C20180139A5A5'); // serial express
		} break;

		case 'tvoff':
		case 'tvOff':
		{
			TVI.TVOff();
			//TVI.Send('0E0E00000505000C20180038A5A5'); // serial express
		} break;

		case 'message':
		{
			$('#messages').vodNotification('updateMessageCount', {
				'type': 'unicast'
			});
		} break;

		case 'screensaver':
		{
			if (window.ssGlobalTodo)
			{
				ssGlobalTodo.show();
			}
		} break;
	}
}
