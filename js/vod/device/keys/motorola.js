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
var RMT_PLAY     = 917528;
var RMT_PAUSE    = 917528;
var RMT_FF       = 917524;
var RMT_RW       = 917523;
var RMT_STOP     = 917522;
var RMT_STOP2    = 27; // Moto has 2 stop keys (square and 'STOP') !
var RMT_RED      = 917504;
var RMT_GREEN    = 917505;
var RMT_YELLOW   = 917506;
var RMT_BLUE     = 917507;
var RMT_HELP     = 0;   // No help key on motorola remote
var RMT_HELP2    = 0;   // No help key on motorola remote
var RMT_ASTERISK = 0;
var RMT_PGFWD    = 917526;
var RMT_PGBACK   = 917525;
var RMT_PGFWD2   = 917526;
var RMT_PGBACK2  = 917525;
var RMT_VOLUP    = 917747;
var RMT_VOLDOWN  = 917748;
var RMT_POWER    = 0;
var RMT_MUTE     = 917744;
var RMT_UP       = 38;   
var RMT_DOWN     = 40;   
var RMT_LEFT     = 37;   
var RMT_RIGHT    = 39;   
var RMT_MOVIES   = 917783; // PORTAL on MOT RCU
var RMT_CHUP     = 917554; // TV key on MOT RCU. NOTE: the up arrow doubles as ch+, this needs to be set to '38' in IPTV mode..
var RMT_CHDN     = 917554; // TV key on MOT RCU. NOTE: the down arrow doubles as ch-, this needs to be set to '40' in IPTV mode..
var RMT_HASH     = 0;
var RMT_INFO     = 917556; // INFO on MOT RCU
var RMT_MENU     = 917783; // PORTAL on MOT RCU (note there is a 'MENU' key as well, code = 917555 but it is less obvious..
var RMT_BACK     = 917536;
var RMT_TITLES   = 0;
var RMT_TITLES2  = 0;
var RMT_EPG      = 917776;
var RMT_TV       = 0;
var RMT_SOURCE   = 0;
var RMT_INPUT    = 0;
var RMT_EXIT     = 0;

if (visit.control_type == 'rf2') // tp
{
	RMT_PLAY   = 79;
	RMT_PAUSE  = 19;
	RMT_STOP   = 75;
	RMT_FF     = 70;
	RMT_RW     = 76;
	RMT_RED    = 917777;
	RMT_GREEN  = 917554;
	RMT_YELLOW = 917782;
	RMT_BLUE   = 917556;
	RMT_MOVIES = 917783;
	RMT_CHUP   = 33;
	RMT_CHDN   = 34;
	RMT_INFO   = 917505;
	RMT_MENU   = 36;
	RMT_TITLES = 917504;
	RMT_EPG    = 917507;
	RMT_TV     = 917506;
	RMT_BACK   = 27;
	RMT_STOP2  = 0;
}

// 0 = no function 

