'use strict';

var Realm = require('realm');
var util = require('util')
var fs = require('fs');
var os = require('os');

Realm.defaultPath = os.homedir() + "/.playappstore/realm/default.realm"

const AppIconSchema = {
  name: 'AppIcon',
  primaryKey: 'bundleID',
  primaryKey: 'version',
  primaryKey: 'platform',
  properties: {
    bundleID:  'string', // 
    version: 'string',
    platform: 'string', // ios or android
    icon: 'string', // icon path
    name: {type: 'string', optional: true},
    createAt: {type: 'date',  default: new Date()},
    updateAt: {type: 'date',  default: new Date()},
  }
};

const AppRecordSchema = {
  name: 'AppRecord',
  primaryKey: 'bundleID',
  primaryKey: 'platform',
  properties: {
    bundleID:  'string', // 
    platform: 'string', // ios or android
    version: 'string',
    name: 'string',
    icon: 'string', // icon path
    createAt: {type: 'date',  default: new Date()},
    updateAt: {type: 'date',  default: new Date()},
  }
};

const AppInfoSchema = {
  name: 'AppInfo',
  properties: {
    objectId: 'string',
    bundleID:  'string', 
    version: 'string',
    build: {type: 'string', optional: true}, // build version 
    name: 'string', // app name
    icon: 'string', // icon path
    size: 'string', // package size
    package: 'string', // package download url
    platform: 'string', // ios or android
    manifest: {type: 'string', optional: true}, // ios only, for itms-service download 
    createAt: {type: 'date',  default: new Date()},
    updateAt: {type: 'date',  default: new Date()},
  }
};


const DeviceSchema = {
  name: 'Device', 
  primaryKey: 'uuid',
  primaryKey: 'platform',
  properties: {
    uuid: 'string',
    platform: 'string',
    apnsToken:{type: 'string', optional: true},  // apns device token
    followed: {type: 'list', objectType:'AppRecord'},
    activitedAt: {type: 'date', default: new Date()},
    createdAt: {type: 'date',  default: new Date()},
    updatedAt: {type: 'date',  default: new Date()},
  }
}

var realm = new Realm({schema: [AppIconSchema, AppRecordSchema, AppInfoSchema, DeviceSchema], version:5});


function RealmDB() {
}

RealmDB.prototype.updateAppIcon = function(app) {
  return new Promise(function(resolve, reject) {
    var appIcon;
    realm.write(() => {
      appIcon = realm.create('AppIcon', app, true);
    });
    resolve(appIcon);
  });
}
RealmDB.prototype.updateAppRecord = function(app) {
  return new Promise(function(resolve, reject) {
    var appRecord;
    realm.write(() => {
      appRecord = realm.create('AppRecord', app, true);
    });
    resolve(appRecord);
  });
}

RealmDB.prototype.updateAppInfo = function(app) {
  return new Promise(function(resolve, reject) {
    var appInfo;
        console.log(app);
    realm.write(() => {
      appInfo = realm.create('AppInfo', app, true);
    });
    resolve(appInfo);
  });

}
RealmDB.prototype.findAppIcon = function(app) {
      
  var filter = util.format('bundleID = "%s" AND version = "%s"', app.bundleID, app.version);
  console.log(filter);
  var icons = realm.objects('AppIcon').filtered(filter);
  if (icons.length > 0) {
    return icons[0].icon;
  } else {
    return "";
  }
}
RealmDB.prototype.getRecords = function (platform) {

  var filter = util.format('platform = "%s"', platform);
  console.log(filter);
  var records = realm.objects('AppRecord').filtered(filter);
  var copy = records.slice();
  // for set property values out a transaction.
  var mappedArray = copy.map(function(record) {
    return JSON.parse(JSON.stringify(record));
  })
  return mappedArray;
}

RealmDB.prototype.getAppInfos = function (platform, bundleID, page, count) {
  page = typeof page  !== 'undefined' ? page : 1;
  count = typeof count !== 'undefined' ? count : 10;

  var filter = util.format('platform = "%s" AND bundleID = "%s"', platform, bundleID);
  console.log(filter);
  var infos = realm.objects('AppInfo').filtered(filter);
  // for pagination
  var start = (page-1)*count;
  var firstInfos = infos.slice(start, count);
  var mappedArray = firstInfos.map(function(info) {
    return JSON.parse(JSON.stringify(info));
  })
  return mappedArray;
}
/// action: 1 for follow, 0 for unfollow.
RealmDB.prototype.updateDevice = function (device, bundleID, action) {
  return new Promise(function(resolve, reject) {
    var result;
    realm.write(() => {
      console.log('begin write');
      result = realm.create('Device', device, true);
      if (bundleID === 'undefined') {
        console.log('end write');
        return;
      }
      var records = realm.objects('AppRecord').filtered('bundleID = $0 AND platform = $1', bundleID, 'ios');
      if (records.length == 0) { 
        return;
      }
      var contain = result.followed.filtered('bundleID = $0', bundleID).length > 0;
      if (action === '1') {
        // if this record not in the followed list, then push it.
        if (!contain) {
          result.followed.push(records[0]);
        }
      }
      if (action === '0') {
        // otherwise, remove it from the list
        if (contain) {
          var index = result.followed.findIndex(function(obj, index, collection) {
            if (obj.bundleID === bundleID) {
              return true;
            }
            return false;
          })
          result.followed.splice(index, 1);
        }
      }
    });
    resolve(result);
  });
}

RealmDB.prototype.getFolloweds = function (deviceID, platform) {

  var records = realm.objects('Device').filtered('uuid = $0 AND platform = $1', deviceID, platform);
  if (records.length > 0) {
    var device = records[0];
    var followeds = device.followed;
    // for set property values out a transaction.
    var mappedArray = followeds.map(function(record) {
      return JSON.parse(JSON.stringify(record));
    })
    return mappedArray;
  } else {
    return [];
  }
}

var db = new RealmDB();
var appRecord = {};
appRecord.bundleID = 'com.lashou.com';
appRecord.platform = 'ios';
appRecord.version = '0.1'
appRecord.name = 'grout'
appRecord.icon = 'xxx.pg'


// db.updateAppRecord(appRecord);
// var device = {};
// device.uuid = '2';
// device.platform = 'ios';

// db.updateDevice(device)
// .then(function(result) {
//   console.log(JSON.stringify(result));
// }, function(error) {
//   console.log(error);
// })

// db.updateApnsDevice(db, 'com.xxx.com')
// .then(function(result) {
//   console.log(result);
// }, function(error) {
//   console.log(error);
// })


// var r = db.getFollowedDevices('com.lashou.com');
// console.log('bottom line');
// console.log(r);


module.exports = RealmDB;