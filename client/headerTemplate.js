Template.headerTemplate.helpers({
    connectStatus: function(){
	var status = Meteor.status();
	var reloadmsg = " -- consider clicking refresh on your browser ";
	if (status.status==='connected')
	    return 'connected';
	if (status.reason)
	    return 'not connected -- '+status.status+' reason:'+status.reason+reloadmsg;
	return 'not connected -- '+status.status+reloadmsg;
    },
    connectStatusClass: function(){
	var status = Meteor.status();
	if (status.status === 'connected')
	    return 'green';
	return 'red';
    },
    timeRemaining: function(){
	var myUser = Meteor.user();
	var unixTimeMS = +Chronos.currentTime();
	if (!myUser) return undefined;
	if (!myUser.headerTimerEnds) return undefined;
	var ends = myUser.headerTimerEnds;
	if (ends < unixTimeMS) return 0;
	return Math.round((ends-unixTimeMS)/1000);
    },
    showTimer: function(){
	var slack = 5*1000;
	var myUser = Meteor.user();
	var unixTimeMS = +Chronos.currentTime();
	if (!myUser) return false;
	if (!myUser.headerTimerEnds) return false;
	return ( (myUser.headerTimerEnds+slack) > unixTimeMS );
    }
});

Template.headerTemplate.events({
    'click #signoffButton': function(event, template){ 
	if (confirm("Confirm signoff")){ 
	    Meteor.logout(function(e){ console.log('signoff by user'); });
	}
    }
});
