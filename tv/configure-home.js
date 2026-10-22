'use strict';
require('./luna').call('luna://com.webos.settingsservice/setSystemSettings',{
 category:'general',settings:{homeAutoLaunch:'off'},store:true
},2500).then(function(result){process.exit(result.returnValue?0:1);});
