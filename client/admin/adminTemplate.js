Session.setDefault({
    rollcallToggle: false,
    rollcallTimeEnds: 0,
    allGamesTimeEnds: 0
});

nextGame = {};
countEnds = 0;

// checkGameSpec(g) checks that the game in g is valid as to
//   the gameFileSpec in /lib/gameFactorySpec and that the
//   game matrices, and the rownames and colnames have properly matching
//    dimensions.  It also checks that an initial row/col is defined.

var checkGameSpec = function(g){
    "use strict";
    var ok = false;
    var i;
    try {	
	ok = ( 
	    (Match.test(g, gameFileSpec)) &&
		(g.rownames.length) &&
		(g.colnames.length) &&
		(g.rowMatrix.length === g.colMatrix.length) &&
		(g.rowMatrix.length === g.rownames.length) &&
		( (g.row>=0) && (g.row<g.rownames.length) ) &&
		( (g.col>=0) && (g.col<g.colnames.length) ) &&
		(g.gameTemplate in Template) && 
		(Template.hasOwnProperty(g.gameTemplate)) &&
		(g.cellTemplate in Template) &&
		(Template.hasOwnProperty(g.cellTemplate))
	);
	i = 0;
	while( ok && (i<g.colnames.length) ){ 
	    ok = ( 
		(g.rowMatrix[i].length === g.colnames.length) &&
		    (g.colMatrix[i].length === g.colnames.length)
	    );
	    ++i;
	}
    } catch(e) { 
	// in case some game property is ill-defined
	ok = false; 
	console.log("in checkGameSpec");
	console.log(e);
    };
    return ok;
};


// toNextGame() is a function that we will use with CSV.call to parse the incoming .csv file
// The csv data is put into the function by the CSV handler using "this"
// parsed data is stored in "nextGame"

var toNextGame = function(){
    "use strict";
    // set nextGame to a blank game, erasing previous
    nextGame = {
	rowMatrix: [],
	colMatrix: [],
	rownames: [],
	colnames: [],
	row: 0,
	col: 0,
	gameTemplate: '',
	cellTemplate: ''
    };
    // examine the number of rows of .csv file data to reject junk
    // 250 rows is plenty for 2 100x100 game matrices and the other settings
    // if the data has more rows than that something is wrong
    var shared = this;
    if ( (!shared) || (!shared.data) || (!shared.data.rows) )
	throw "Read Error:  could not find any data from file. Maybe the file does not exist or is inaccessible.";
    if (shared.data.rows.length<6) 
	throw "File REJECTED. Too few rows. Look at the example file provided and make sure all the necessary fields are included.";
    if (shared.data.rows.length>250)
	throw "File REJECTED. This file has over 250 rows and is probably not the correct file or in the correct format.";
    var rows = shared.data.rows;
    console.log('.csv file dump follows');
    var needRowLog = false;
    // if the browser has console.table, dump the entire file into a console table
    // otrherwise, set a flag to do it one row at a time 
    if (console.table) 
	console.table(rows);
    else 
	needRowLog = true;
    // mode will be used to track col 1 csv value, ignoring blank cell
    var mode = 'comment';
    var keys = Object.keys(nextGame);
    var keyMap = {};
    keys.forEach(function(k){
	keyMap[k.toLowerCase()] = k;
    });
    rows.forEach(function(row){
	"use strict";
	var k;
	try {
	    if (row && row.length){
		if (needRowLog) console.log(row.join(","));
		if (row[0] && row[0].length) mode = row[0].toLowerCase().trim();
		// data should always be on or begin on the 2nd col cell so
		// if the 2nd col cell (which is row[1]) is blank then ignore the row
		if ((row.length<2) || (row[1].toString().trim().length===0)) return;
		// here there is data on this row to possibly add to a property of nextGame
		// check that mode is in the lowercased keys of nextGame and identify correct case key as k
		k = keyMap[mode];
		if(!k) return;
		// key exists 
		//if a matrix add the remainder of the row to the matrix and return
		if (/matrix$/.test(mode)){
		    nextGame[k].push(row.slice(1));
		    return;
		}
		// not a matrix,  check that mode name matches first cell
		if (mode!==row[0]) return;
		// if an array, copy the remainder of the row. otherwise, copy 1 cell.
		if (nextGame[k] instanceof Array)
		    nextGame[k]=row.slice(1);
		else
		    nextGame[k]=row[1];
	    }
	} 
	catch(e) { console.log(e);}
    });
};


// armFileInput is a function to activate the file chooser box and connects it to the CSV parser
// and toNextGame extraction function. CSV.begin() will deactivate the file chooser on processing to avoid
// multiple clicks.  Finally, we reactivate the file chooser 1 sec after the data has been processed.
// 
// Session var adminGoodCSVFile is used to report the results of parsing and extraction to Trackers below

var armFileInput = function(){
    'use strict';
    $('#adminFileInput').prop('disabled',false);
    CSV.begin('#adminFileInput').call(toNextGame).go(
	function(e,d){
	    if (e) {
		// report any error to console.log and unset adminGoodCSVFile
		console.log(e);
		Session.set('adminGoodCSVFile',false);
	    } else {
		// if no error, checkGameSpec and set session var for green checkmark in step 1
		Session.set('adminGoodCSVFile', checkGameSpec(nextGame));
	    }
	    // rearm after 1 sec to quell the impatient
	    Meteor.setTimeout(armFileInput, 1000);
	}
    );
};

var updateEnds = function(){
    ++countEnds;
    Meteor.call('allGamesTimeEnds', Session.get('allGamesTimeEnds'), function(e,d){
	if (d && (+d>Session.get('allGamesTimeEnds'))) Session.set('allGamesTimeEnds', +d);
    });
};

Template.adminTemplate.helpers({
    goodFile: function(){ 		     
	return Session.get('adminGoodCSVFile');
    },
    countUsersByScreen: function(s){
	return Meteor.users.find({screen: s}).count();
    },
    countUsersWithStrikes: function(){
	return Meteor.users.find({strikes: {$gt: 0}}).count();
    },
    gameFinished: function(){ 
	return (Session.get('allGamesTimeEnds') < +Chronos.currentTime());
    },
    lastGameCountdown: function(){
	var t = Math.round( (Session.get('allGamesTimeEnds') - (+Chronos.currentTime())) / 1000);
	if (t<0) return 0;
	return t;
    },
    rollcallToggle: function(){
	return Session.get('rollcallToggle');
    },
    rollcallFinished: function(){
	return (
	    (Session.get('rollcallTimeEnds')) &&
		(Session.get('rollcallTimeEnds') < (+Chronos.currentTime()))
	);
    },
    rollcallCountdown: function(){ 
	if (Session.get('rollcallTimeEnds')){ 
	    return Math.max(0,Math.round((Session.get('rollcallTimeEnds')-(+Chronos.currentTime()))/1000));
	} 
	return 0;
    },
    countRollCall: function(){
	return (RollCall.find({}).count());
    }
});

// getDurationInputMS examines number box input data for valid input and returns millisecond duration or throws an error

var getDurationInputMS = function(jqselector){ 
    var durationMS = 1000*parseInt($(jqselector).val());
    if (!(durationMS>0)) 
	throw new Meteor.Error('InvalidUserInput', 
			       'time duration for '+jqselector+' requires a positive integer, got:'+durationMS);
    return durationMS;
};

// custom Meteor.methods we will need to call to do roll call and run the experiment
// startRollCall(timerEnds) -- clears user list, sets screens to rollcall with timer and yes/present button
// endRollCall() -- puts rollcall screen back to wait screen, clears headerTimer, and adds strike to nonresponder
// pairRollBeginExperiment(gameFilledIn) -- splits user list into pairs, inserts games into Game table

Template.adminTemplate.events({
    'click #adminRollCallButton': function(event, template){
	'use strict';
	// choose file first
	if (!Session.get('adminGoodCSVFile'))
	    return console.log('no .csv file loaded. must Choose file before running roll call.');
	// you should not start a roll call with games running
	if (Session.get('allGamesTimeEnds')>(+new Date()))
	    return console.log("While matrix games as still running, you can not start a new roll call. Wait until those games are over or terminate them.");
	// if you have run a roll call, you need to use it. duplicates are potentially messy.
	if (Session.get('rollcallToggle')) 
	    return console.log('roll call begun. running a second rollcall is not recommended as this may confuse participants.  To do it anyway, refresh the admin browser window and that will clear the rollcall checkmark on the admin screen');
	try {
	    // this next function throws on invalid user input
	    var rcDuration = getDurationInputMS('#adminRollCallDurationInput');
	    var rcExpires = +new Date()+rcDuration;
	    Meteor.call('startRollCall', rcExpires, function(e){ 
		if(e){
		    console.log('startRollCall failed, error message follows');
		    console.log(e);
		} else {
		    // start roll call succeeded. 
		    // set the toggle so we get a green mark and do not accidentally start another one.
		    // and set the local expiration on the admin screen so we can watch it tick down
		    Session.set('rollcallToggle', true);
		    Session.set('rollcallTimeEnds', rcExpires);
		    // disable the GO button until the rollcall is finished
		    $('#adminGoButton').prop('disabled',1);
		    Meteor.setTimeout(function(){ 
			$('#adminGoButton').prop('disabled',0);
		    }, rcDuration);
		}
	    });
	} catch(e){ console.log(e); }	
    },
    'click #adminGoButton': function(event, template){
	'use strict';
	if (!Session.get('rollcallToggle')) 
	    return console.log('need to run rollcall before starting next matrix game');
	if (Session.get('rollcallTimeEnds') > (+new Date()))
	    return console.log('need to wait until rollcall ends before starting next matrix game');
	if (!Session.get('adminGoodCSVFile'))
	    return console.log('can not GO: need confirmed good .csv file to configfure matrix game');
	if (RollCall.find({}).count()<2)
	    return console.log('can not GO: need at least 2 participants');
	// clear rollcallToggle and disable button to avoid multiple GO clicks
	$('#adminGoButton').prop('disabled',1);
	Session.set('rollcallToggle', false); 
	try {
	    // this next function throws on invalid user input
	    var gameDuration = getDurationInputMS('#adminGameDurationInput');
	    var now = +new Date();
	    // slackMS allows for some internet delay in communicating the start of the game. 500 = 0.5 sec
	    var slackMS = 500;
	    // every game needs these properties
	    var initGame = {
		visible: true,
		moves: []
	    };
	    // game also needs a begin and end time
	    var gameTimer = {
		timeBegins: now+slackMS,
		timeEnds: now+gameDuration+slackMS,
	    };
	    // assemble the game from various variables into var gameFactory
	    myGame = Object.assign({}, nextGame, gameTimer, initGame);
	    // tell the server to call the pairRollBeginExperiment function that
	    // makes multiple games from gameFactory to pairs of participants randomly pulled from roll call
	    Meteor.call('pairRollBeginExperiment', myGame, function(e){
		if (e){
		    // there was an error running the server call to start the experiment
		    console.log(e); 
		    // set the rollcallToggle and button states so we can GO again
		    Session.set('rollcallToggle', true);
		    $('#adminGoButton').prop('disabled',false);
		} else {
		    // the server call to start the experiment succeeded
		    // The GO button was disabled earlier. make the admin run another roll call.
		    // end the previous rollcall and increment baseball strikes
		    Meteor.call('endRollCall', function(e){ if (e) console.log(e); });
		    // in 1 second update time Ends 
		    Meteor.setTimeout(updateEnds, 1000);
		    Session.set('gameUpdated', +new Date());
		}

	    });
	} catch(e){ console.log(e); }
    }
});

// Template...onRendered is called on admin screen refresh or new admin login
//    set the good .csv checkmark based on the goodness of existing data
//    clear the good roll call checkmark
//    disable the GO button until the file is loaded and/or rollcall run

Template.adminTemplate.onRendered(function(){
    Session.set('adminGoodCSVFile', checkGameSpec(nextGame));
    Session.set('rollcallToggle', false);
    $('#adminGoButton').prop('disabled', true);
    armFileInput();
    Meteor.setInterval(updateEnds, 10000);

    Tracker.autorun(function(){
	'use strict';
	// only enable the roll call button when there is a known good csv file
	$('#adminRollCallButton').prop('disabled', 
				       (!Session.get('adminGoodCSVFile')));
    });

});
