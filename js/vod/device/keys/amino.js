if (!window.browser) // no browser at all
{
	window.browser = { 'deviceModel': null };
}

if (!window.visit) // no visit at all
{
	window.visit = { 'control_type': 'ruwido' };
}

if (!window.visit.control_type) // visit but no control_type
{
	window.visit.control_type = 'ruwido';
}

var RMT_0        = 48;
var RMT_1        = 49;
var RMT_2        = 50;
var RMT_3        = 51;
var RMT_4        = 52;
var RMT_5        = 53;
var RMT_6        = 54;
var RMT_7        = 55;
var RMT_8        = 56;
var RMT_9        = 57;
var RMT_CR       = 13;
var RMT_OK       = 13;
var RMT_PLAY     = 8499;
var RMT_PAUSE    = 8504;
var RMT_FF       = 8500;
var RMT_RW       = 8502;
var RMT_STOP     = 8501;
var RMT_STOP2    = 0;
var RMT_RED      = 8512;
var RMT_GREEN    = 8513;
var RMT_YELLOW   = 8514;
var RMT_BLUE     = 8515;
var RMT_HELP     = 8537; // Guide key on A130H black remote
var RMT_HELP2    = 8517; // Home key on A110H white remote
var RMT_ASTERISK = 8526; // PG down button on black and white amino remotes (for maintenance)
var RMT_PGFWD    = 8508; // Page forward on A110H white remote
var RMT_PGBACK   = 8511; // Page forward on A110H white remote
var RMT_PGFWD2   = 8567; // Skip forward on A130H black remote
var RMT_PGBACK2  = 8566; // Skip forward on A130H black remote
var RMT_VOLUP    = 8495;
var RMT_VOLDOWN  = 8496;
var RMT_POWER    = 8498; // power key on white and black remote
var RMT_MUTE     = 8497; // "Mute"   key on black a130h remote
var RMT_UP       = 38;
var RMT_DOWN     = 40;
var RMT_LEFT     = 37;
var RMT_RIGHT    = 39;
var RMT_MOVIES   = 8571;
var RMT_CHUP     = 8492;
var RMT_CHDN     = 8494;
var RMT_HASH     = 8525; // PG up button on both black/white amino (INFO KEY)
var RMT_INFO     = 8534; // INFO button on black amino (INFO KEY)
var RMT_MENU     = 8516; // Menu key on black a130h remote
var RMT_BACK     = 8568; // Back key on black a130h remote
var RMT_TITLES   = 8572; // Titles key on black a130h remote
var RMT_TITLES2  = 0;
var RMT_EPG      = 8537; // GUIDE button
var RMT_TV       = 8570;
var RMT_SOURCE   = 0;
var RMT_INPUT    = 0;
var RMT_EXIT     = 0;

if (visit.control_type === 'ruwido_tilgin_chan')
{
	RMT_CHUP = 8511; // CHUP using tilgin codes - NOTE: set RMT_PGBACK to 0 if using this
	RMT_CHDN = 8507; // CHDN using tilgin codes
	RMT_PGBACK = 0; // avoid conflict with default
}

if (browser.deviceModel === 'a150h')
{
	RMT_0        = 48;
	RMT_1        = 49;
	RMT_2        = 50;
	RMT_3        = 51;
	RMT_4        = 52;
	RMT_5        = 53;
	RMT_6        = 54;
	RMT_7        = 55;
	RMT_8        = 56;
	RMT_9        = 57;
	RMT_CR       = 13;
	RMT_OK       = 13;
	RMT_PLAY     = 415;
	RMT_PAUSE    = 463;
	RMT_FF       = 417;
	RMT_RW       = 412;
	RMT_STOP     = 413;
	RMT_STOP2    = 0;
	RMT_RED      = 403;
	RMT_GREEN    = 404;
	RMT_YELLOW   = 405;
	RMT_BLUE     = 406;
	RMT_HELP     = 0;   // No native help keys
	RMT_HELP2    = 0;   // No native help keys
	RMT_ASTERISK = 34;  // Arrow down (not up) button on 140/150 remote
	RMT_PGFWD    = 425; // Skip forward on A130H black remote
	RMT_PGBACK   = 424; // Skip forward on A130H black remote
	RMT_PGFWD2   = 425; // Skip forward on A130H black remote
	RMT_PGBACK2  = 424; // Skip forward on A130H black remote
	RMT_VOLUP    = 447;
	RMT_VOLDOWN  = 448;
	RMT_POWER    = 409; // power key on white and black remote
	RMT_MUTE     = 449; // "Mute"   key on black a130h remote
	RMT_UP       = 38;
	RMT_DOWN     = 40;
	RMT_LEFT     = 37;
	RMT_RIGHT    = 39;
	RMT_MOVIES   = 256; // "movies" logo on 140/150 remote (left of menu)
	RMT_CHUP     = 427;
	RMT_CHDN     = 428;
	RMT_HASH     = 33;  // Arrow up (not up) button on 140/150 remote
	RMT_INFO     = 457; // INFO button on  140/150 remote
	RMT_MENU     = 462; // Menu key on 140/150 remote
	RMT_BACK     = 461; // Back key on 140/150 remote
	RMT_TITLES   = 460; // Titles key on 140/150 remote (assuming this is subtitles)
	RMT_TITLES2  = 0;
	RMT_EPG      = 458; // GUIDE button on 140/150 remote
	RMT_TV       = 0;   // no native 'TV' key
	RMT_SOURCE   = 0;
	RMT_INPUT    = 0;
	RMT_EXIT     = 0;
}

// rf1 = vod, rf2 = tps..
if (visit.control_type.indexOf('rf') > -1) // ruwido rf/tp
{
	RMT_PLAY   = 111;
	RMT_PAUSE  = 19;
	RMT_FF     = 102; // seem to get 3-6 repeats when pressed quickly..
	RMT_RW     = 108; // seem to get 3-6 repeats when pressed quickly..
	RMT_RED    = 113;
	RMT_GREEN  = 114;
	RMT_YELLOW = 115;
	RMT_BLUE   = 112;
	RMT_MOVIES = 120;
	RMT_CHUP   = 33;
	RMT_CHDN   = 34;
	RMT_INFO   = 117; // reloads page / browser home / history / back ??
	RMT_MENU   = 36;
	RMT_BACK   = 27;  // Seems to be the native back key (fixed in fkeys.conf, comment out all 'Home' and 'Back' refs.)
	RMT_TITLES = 116;
	RMT_EPG    = 119; // reloads page (fixed in fkeys.conf '#0x40000068 6')
	RMT_TV     = 118;
	RMT_STOP   = 107; // alt: 75
	RMT_STOP2  = 75;
	RMT_HELP   = 96;  // OPT key, alt: 192
	RMT_HELP2  = 192;

	// yep, these are different on the 150 for some reason..
	if (browser.deviceModel === 'a150h')
	{
		RMT_PLAY = 79;
		RMT_FF = 70;
		RMT_RW = 76;
	}
}
