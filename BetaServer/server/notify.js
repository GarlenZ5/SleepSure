var notify=function(){
	var self=this;
	const config=require('.././public/config.js');
	const func=require('.././public/func.js');
	const ErrMsg=require('.././public/ErrMsg.js');
	const firebaseAdmin = require("firebase-admin");
	const apn=require('apn');
	const firebaseServiceAccount = require(".././uploaded_file/notify_file/halosleepsure-firebase-adminsdk-gu98n-d40327fe16.json");

	process.on('message',function(data){
		if(data.action=='send_notify'){
			self.sendNotification(data);
		}
	});
	this.initFCMService=function(){
		firebaseAdmin.initializeApp({
			credential: firebaseAdmin.credential.cert(firebaseServiceAccount),
			databaseURL: config.FIREBASE_DATABASE_URL
		});
	}
	self.initFCMService();

	/**
		IOS push notification setting
	**/
	this.sendAPNMessage=function(msg,payload,token,callback){
		var apnConnection = new apn.Provider({
			cert: config.IOS_PUSH_DEV_PEM,// __dirname+"/notify_identity/reac_apns_dev.pem",
			key: config.IOS_PUSH_DEV_PEM,
			passphrase:"123456",//"sllin",
			production: false,
			productmode: true,
			rejectUnauthorized: false
		});
		var apnProductionConnection = new apn.Provider({
			cert: config.IOS_PUSH_DIS_PEM, //__dirname+"/notify_identity/reac_apns_production.pem",
			key: config.IOS_PUSH_DIS_PEM,
			passphrase:"123456",//"sllin",
			production: true,
			rejectUnauthorized: false
		});
		var note = new apn.Notification();
		note.topic = config.IOS_APP_ID;
		note.alert=msg;
		note.sound = payload.sound;//"ping.aiff";
		note.mutableContent=1;
		note.payload=payload;
		apnConnection.send(note,token).then(function(result){
			console.log("sendAPNMessage", result.failed)
			if(result.failed){
				callback(ErrMsg.NotificationError);
			}
			else{
				callback();
			}
			apnConnection.shutdown();
		})
		.catch(function(e){
			console.log("sendAPNMessage2",e)
			apnConnection.shutdown();
		});
		apnProductionConnection.send(note,token).then(function(result){
			apnProductionConnection.shutdown();
		})
		.catch(function(e){
			console.log("sendAPNMessage3",e)
			apnProductionConnection.shutdown();
		});
	}

	this.sendFCMMessage = function(msg, payload,  recipients, callback){
		if(!payload.data){
			payload.data={};
		}
		payload.data.message=msg;
		firebaseAdmin.messaging().sendToDevice(recipients, payload)
		.then(function(response) {
			console.log("sendFCMMessage")
			console.log(response)
			callback();
		})
		.catch(function(error) {
			console.log("sendFCMMessageERR",error)
			callback(ErrMsg.NotificationError);
		});
	}
	this.flattenObjectAndToString = function(ob) {
		var toReturn = {};
		
		for (var i in ob) {
			if (!ob.hasOwnProperty(i)) continue;
			if ((typeof ob[i]) == 'object') {
				var flatObject = self.flattenObjectAndToString(ob[i]);
				for (var x in flatObject) {
					if (!flatObject.hasOwnProperty(x)) continue;
					
					toReturn[i + '.' + x] = flatObject[x].toString();
				}
			} else {
				if((typeof ob[i])=='boolean'){
					if(ob[i]){
						ob[i]=1
					}else{
						ob[i]=0
					}
				}
				toReturn[i] = ob[i].toString();
			}
		}
		return toReturn;
	};
	this.sendNotification=function(data){
		var notifyData=data['data'];
		var msg=notifyData.alert
		switch(data.device_type){
			case 'iOS':
				if(notifyData.bell){
					var sound="default.mp3";
					if(notifyData.type == 1 || notifyData.type == 2){
						sound="sound.wav"
					}
					notifyData['sound']=sound;//"sound.wav";
				}else if(notifyData.shock && !notifyData.bell){
					notifyData['sound']="notSound.wav";
				}
				self.sendAPNMessage(msg,notifyData,data.notification_token,function(){});
				break;
			case 'android':
				var payload={'data':notifyData};
				payload.data=self.flattenObjectAndToString(payload.data);
				self.sendFCMMessage(msg,payload,data.notification_token,function(){});
				break;
		}
	}
}
module.exports=notify;