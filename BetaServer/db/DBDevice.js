var DBDevice=function (mysqlPool, redisConnect){
	var self=this;
	
	const config=require('.././public/config.js');
	const func=require('.././public/func.js');
	const ErrMsg=require('.././public/ErrMsg.js');
	const mysql=require('./mysql.js');
	const redisClient=require('./redisClient.js');

	var userTable=config.DB_PREFIX+'USER';
	var tokenTable=config.DB_PREFIX+'USER_TOKEN';
	var bsTable=config.DB_PREFIX+'BASESTATION';
	var trackerTable=config.DB_PREFIX+'DEVICE';
	var babyTable=config.DB_PREFIX+'BABY';
	var babyPushSetTable=config.DB_PREFIX+'BABY_PUSH_SETTING';
	var pushSetTypeTable=config.DB_PREFIX+'PUSH_SETTING_TYPE';
	var eventTypeTable=config.DB_PREFIX+'EVENT_TYPE';
	var babyDataTable=config.DB_PREFIX+'BABY_DATA';
	var babyAlertTable=config.DB_PREFIX+'BABY_ALERT';
	var alertTypeTable=config.DB_PREFIX+'ALERT_TYPE';

	var db=new mysql(mysqlPool);
	var redis=new redisClient(redisConnect);
	this.alertType;

	this.init=function(){
		self.getAllAlertType(function(){});
	}

	this.getAllAlertType=function(callback){
		try{
			var sql="SELECT * FROM "+alertTypeTable;
			db.doquery(sql, [], function(err, res){
				if(err){
					console.log("getAllAlertType[ERROR]",e);
				}else{
					self.alertType=res;
					// console.log("getAllAlertType",self.alertType[5].alertThreshold)
					// console.log("getAllAlertType",self.alertType[6].alertThreshold)
					// console.log("getAllAlertType",self.alertType[9].alertThreshold)
				}

				callback()
			});
		}catch(e){
			console.log("getAllAlertType[BUG]",e);
		}
		
	}

	this.resolveCommandByte=function(command,callback){

		var mac=command.slice(6,12).toString('hex');
		var tracker_mac=command.slice(18,24).toString('hex');
		var command1=command.slice(26,27).toString('hex');
		var commandBaseInfo={
			"mac":mac,
			"tracker_mac":tracker_mac
		}
		switch(command1){
			case "11":
				var commandBaseInfo={
					"mac":mac,
					"hardwareVer":parseInt(command.slice(35,36).toString('hex'),16),
					"softwareVer":parseInt(command.slice(37,38).toString('hex'),16),
				}
				self.updateBasestationInfo(commandBaseInfo)
				break;
			case "12":
				self.updateHeartbeatTime(mac)
				break;
			case "14":
				self.updateTrackerStatus(commandBaseInfo,command.slice(34,35).toString('hex'))
				break;
			case "30":
				self.resolveCurrentData(mac,tracker_mac,command.slice(34,-2))
				break;
			case "0d":
				self.OTAResult(mac,command.slice(34,35).toString('hex'))
				break;
		}

	}
	this.updateBasestationInfo=function(data){
		try{
			var timed=new Date();
			var sqlString=	"INSERT INTO "+bsTable+"(mac,hardwareVer,softwareVer,createdTime) "+
							"VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE updatedTime=?,hardwareVer=?"+
							",softwareVer=?";
			var valArr=[data.mac, data.hardwareVer, data.softwareVer, timed, timed, data.hardwareVer, data.softwareVer];
			db.doquery(sqlString, valArr, function(e, res){
				if(e){
					console.log("updateBasestationInfo:save/update basestation[ERROR]");
				}
				var redisData={
					"connectTime":timed,
					"hardwareVer":data.hardwareVer,
					"softwareVer":data.softwareVer
				}
				redis.setItem(data.mac,JSON.stringify(redisData));
				return;
			});
		}catch(e){
			console.log("updateBasestationInfo[BUG]",e);
			return;
		}
	}
	this.updateHeartbeatTime=function(mac){
		try{
			redis.getItem(mac)
			.then(redisData=>{
				if(redisData && redisData.length>0 && redisData!="{}"){
					var bsInfo=JSON.parse(redisData);
					var lastVer=func.getBsBinVer();
					if(bsInfo.hasOwnProperty("softwareVer")
						&& lastVer>Number(bsInfo.softwareVer)
						&& !bsInfo.isSendOTA){
						var param={
							'action':'OTA',
							'mac':mac,
						}
						process.send(param);
						bsInfo['isSendOTA']=true;
					}
					bsInfo['lastHeartbeatTime']=new Date();

					var times=new Date().getTime();
					if(!bsInfo['tracker_offLine'] 
						&& bsInfo.hasOwnProperty("last_tracker_data_time")
						&& times-Number(bsInfo['last_tracker_data_time'])>6000){
						var promises=new Promise(function(resolve, reject){
							if(!bsInfo['userKey']){
								db.findOne(bsTable, "userKey", {"mac":mac}, function(e1, r1){
									if(e1){
										reject(true)
									}else{
										if(r1.length>0){
											resolve({"userKey":r1[0].userKey,"babyKey":r1[0].babyKey});
										}else{
											reject(true)
										}
									}
									
								})
							}else{
								resolve({"userKey":bsInfo['userKey'],"babyKey":bsInfo['babyKey']});
							}
						})
						promises
						.then((onFulfilled, onRejected)=>{
							console.log("updateHeartbeatTime promises",onFulfilled)
							if(onRejected){
								console.log("updateHeartbeatTime:BaseStation["+mac+"] has not user!")
							}
							// var outOfR={
							// 	'action':'connectError',
							// 	'errorType':1,
							// 	'userId':onFulfilled.userKey,
							// 	'mac':mac
							// }
							// process.send(outOfR);
							var outOfR={
								'errorType':1,
								'mac':mac
							}
							self.sendConnectError(outOfR)
							console.log("outOfR:offLine")
							bsInfo['tracker_offLine']=true;
							bsInfo['userKey']=onFulfilled.userKey;
							bsInfo['babyKey']=onFulfilled.babyKey;
							redis.setItem(mac,JSON.stringify(bsInfo));
						})
						.catch(e2=>{
							console.log("updateHeartbeatTime:Promise[BUG]",e2);
							return;
						})
						
					}else{
						redis.setItem(mac,JSON.stringify(bsInfo));
					}
					// redis.setItem(mac,JSON.stringify(bsInfo));
					return;
				}
			})
			.catch(err=>{
				console.log("updateHeartbeatTime:Get Redis[BUG]",err)
				return;
			})
		}catch(e){
			console.log("updateHeartbeatTime[BUG]",e);
			return;
		}
	}
	this.updateTrackerStatus=function(data, trackerStatus){
		try{
			db.findOne(bsTable, "*", {"mac":data.mac}, function(err, res){
				if(err){
					console.log("updateTrackerStatus[ERROR]");
				}
				var bsInfo=res[0];
				var timed=new Date();
				var sql="INSERT INTO "+trackerTable+"(deviceTypeKey,bsKey,userKey,babyKey,mac,createdTime) "+
						"VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE bsKey=?,userKey=?,babyKey=?,updatedTime=?";
				var val=[1,bsInfo.bsKey,bsInfo.userKey,bsInfo.babyKey,data.tracker_mac,
						timed,bsInfo.bsKey,bsInfo.userKey,bsInfo.babyKey,timed];
				db.doquery(sql, val, function(error, res){
					if(error){
						console.log("updateTrackerStatus:Save/Update Tracker[ERROR]");
						return;
					}
					var status=parseInt(trackerStatus,16)==0?2:1;
					var param={
						'action':'tracker_status',
						'status':status,
						'userId':bsInfo.userKey
					}
					// process.send(param);
					self.processSend(bsInfo.userKey, param);
					redis.getItem(data.mac)
					.then(redisData=>{
						if(redisData){
							var bsInfo2=JSON.parse(redisData);
							if(status==1){
								bsInfo2['tracker_offLine']=false;
								bsInfo2['tracker_onLine']=true;
							}else{
								if(!bsInfo2['tracker_offLine']){
									bsInfo2['tracker_offLine']=true;
									bsInfo2['tracker_onLine']=false;
									setTimeout(function(){
										// var outOfR={
										// 	'action':'connectError',
										// 	'errorType':1,
										// 	'userId':bsInfo.userKey,
										// 	'mac':data.mac
										// }
										// process.send(outOfR);
										var outOfR={
											'errorType':1,
											'mac':data.mac
										}
										self.sendConnectError(outOfR)
										console.log("Device OutOfR["+new Date()+"]:"+data.tracker_mac+" OffLine")
									},6000);
								}
								
							}
							redis.setItem(data.mac, JSON.stringify(bsInfo));

						}
					})
					.catch(e=>{
						console.log("updateTrackerStatus:Get Redis[BUG]",e);
					})
				});
			})
		}catch(e){
			console.log("updateTrackerStatus[BUG]",e);
			return;
		}
	}
	this.updateTrackerDataTime=function(mac){
		try{
			redis.getItem(mac)
			.then(redisData=>{
				if(redisData){
					var bsInfo=JSON.parse(redisData);
					bsInfo['last_tracker_data_time']=new Date().getTime();
					redis.setItem(mac, JSON.stringify(bsInfo));
				}
			})
			.catch(e=>{
				console.log("updateTrackerDataTime:Get Redis[BUG]",e);
			})
		}catch(e){
			console.log("updateTrackerDataTime[BUG]",e);
			return;
		}
	}
	this.resolveCurrentData=function(mac,tracker_mac,dataCommand){
		try{
			var data=func.analyCurrentData(dataCommand);
			data['skin_temperature']=data['skin_temperature']/10;
			data['bs_mac']=mac;
			data['tracker_mac']=tracker_mac;

			this.updateTrackerDataTime(mac);

			db.findOne(trackerTable, "bsKey, userKey, babyKey", {"mac":tracker_mac}, function(err, res){
				if(!err && res.length>0){
					var trackerInfo=res[0];
					if(!trackerInfo.userKey || !trackerInfo.babyKey){
						console.log("resolveCurrentData:No User[ERROR]");
						return;
					}
					// console.log("current", data);
					self.isDataTrigger(data, trackerInfo.babyKey, trackerInfo.userKey)
					
				}
				// else{
				// 	console.log("resolveCurrentData:Get Tracker[ERROR]");
				// 	return;
				// }

			})
		}catch(e){
			console.log("resolveCurrentData[BUG]",e);
			return;
		}
	}

	this.onTheGoCurrentData=function(data, callback){
		try{
			var realData={};
			realData['tracker_mac']=data.tracker_mac;
			realData['heart_status']=data.heart_status?Number(data.heart_status):false;
			realData['wear_status']=Number(data.wear_status);
			realData['heart_max']=Number(data.heart_max);
			realData['heart_min']=Number(data.heart_min);
			realData['heart_avg']=Number(data.heart_avg)==0?95:Number(data.heart_avg);
			realData['skin_status']=Number(data.skin_status);
			realData['skin_temperature']=parseFloat(data.skin_temperature);
			realData['sleep_position']=Number(data.sleep_position);
			realData['activity_level']=Number(data.activity_level);
			realData['battery_status']=Number(data.battery_status);
			realData['battery_percent']=Number(data.battery_percent);
			realData['rssi']=Number(data.rssi);
			realData['charging_status']=data.charging_status?Number(data.charging_status):0;
			realData['create_time']=Number(new Date().getTime());
			self.isDataTrigger(realData, data.babyid, data.uid);
			callback(null, func.successReturn());
		}catch(e){
			console.log("onTheGoCurrentData[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
	}
	this.isDataTrigger=function(data, babyKey, userKey){
		try{
			redis.getItem("baby_key_"+babyKey)
			.then(redisData=>{
				var promises=new Promise(function(resolve, reject){
					var babyInfo=new Object();
					self.getBabyInfo(babyKey, userKey, function(error, res){
						if(error){
							reject(true);
						}
						if(redisData && redisData.length>0 && redisData!="{}"){
							babyInfo=JSON.parse(redisData)
						}
						babyInfo['name']=res.name;
						babyInfo['id']=babyKey;
						self.getBabyPushSetting(babyKey, function(e, r){
							if(e){
								console.log("isDataTrigger:Get Baby Push Setting[ERROR]");
								reject(true);
							}
							babyInfo['setting']=r;
							resolve(babyInfo)
						})
					})
				})
				promises
				.then((onFulfilled, onRejected)=>{
					if(onRejected) return;
					var lasetDataTime=data.create_time;

					var temporaryData=new Array();
					if(onFulfilled.hasOwnProperty('temporaryData')){
						temporaryData=onFulfilled.temporaryData;
					}

					var nextSaveData=false;
					if(onFulfilled.hasOwnProperty('nextSaveData')){
						nextSaveData=onFulfilled.nextSaveData;
					}else{
						nextSaveData=lasetDataTime-lasetDataTime%(300*1000)+(300*1000)-1;
					}
					if(lasetDataTime>nextSaveData){
						var saveData=func.getFiveMinData(nextSaveData,temporaryData);
						saveData['babyKey']=babyKey;
						saveData['createdTime']=new Date(lasetDataTime);
						db.save(babyDataTable, saveData, function(saveDataErr, saveDataRes){
							console.log("Save Five Min Data");
							if(saveDataErr){
								console.log("isDataTrigger:Save Data[ERROR]");
							}else{
								console.log("Save Record Success!");
							}
						})
						onFulfilled['nextSaveData']=lasetDataTime-lasetDataTime%(300*1000)+(300*1000)-1;
					}else{
						onFulfilled['nextSaveData']=nextSaveData;
					}
					if(temporaryData.length>=600){
						temporaryData=temporaryData.slice(1);
					}

					temporaryData.push(data);

					var firstDataTime=lasetDataTime;
					if(onFulfilled.hasOwnProperty('firstDataTime')){
						firstDataTime=onFulfilled.firstDataTime;
					}

					var startNotify=false;
					if(data.wear_status==1){
						if(!onFulfilled.hasOwnProperty('wear_time'))
							onFulfilled['wear_time']=lasetDataTime;
						if(!onFulfilled.hasOwnProperty('temp_wear_time'))
							onFulfilled['temp_wear_time']=lasetDataTime;
						onFulfilled['last_wear_time']=lasetDataTime;
						if(lasetDataTime-onFulfilled.wear_time >= 30*60*1000){
							startNotify=true;
						}else{
							if(onFulfilled.hasOwnProperty('startNotify'))
								startNotify=onFulfilled.startNotify;
						}
					}else{
						delete onFulfilled.temp_wear_time;
						if(onFulfilled.hasOwnProperty('last_wear_time')){
							if(lasetDataTime-onFulfilled['last_wear_time'] >= 5*60*1000){
								delete onFulfilled.wear_time;
								delete onFulfilled.last_wear_time;
							}else{
								startNotify=onFulfilled.startNotify;
							}
						}
					}
					onFulfilled['startNotify']=startNotify;
					data['startNotify']=startNotify;
					onFulfilled['temporaryData']=temporaryData;
					onFulfilled['firstDataTime']=firstDataTime;
					onFulfilled['lastDataTime']=lasetDataTime;

					var OORTimes=onFulfilled.hasOwnProperty('OORTimes')?Number(onFulfilled.OORTimes):0;
					if(data.hasOwnProperty('rssi')){
						var newCount=0;
						if(data.rssi>78){
							if(OORTimes>=5){
								newCount=5;
							}else{
								newCount=OORTimes+1;
								if(newCount==5){
									var params={
										"action":"connectError",
										"errorType":1,
										'userId':userKey,
										"mac":''
									}
									self.processSend(userKey, params)
									// redis.getItem("userKey"+userKey)
									// .then(uRedisData=>{
									// 	if(uRedisData && uRedisData.length>0 && uRedisData != "{}"){
									// 		var userInfo = JSON.parse(uRedisData)
									// 		var params={
									// 			"action":"connectError",
									// 			"errorType":1,
									// 			"token":userInfo.token,
									// 			"mac":''
									// 		}
									// 		process.send(params);
									// 	}
									// })
									// .catch(e2=>{
									// 	console.log("isDataTrigger:Get User Redis[BUG]",e2);
									// })
									// var outOfR={
									// 	'action':'connectError',
									// 	'errorType':1,
									// 	'userId':userKey,
									// 	'mac':' '
									// }
									// process.send(outOfR);
								}
							}
							onFulfilled['OORTimes']=newCount;

						}else{
							if(onFulfilled.hasOwnProperty('OORTimes')){
								delete onFulfilled.OORTimes;
							}
						}
					}

					redis.setItem('baby_key_'+babyKey, JSON.stringify(onFulfilled));
					// console.log(self.alertType[5].alertThreshold)
					// console.log(self.alertType[6].alertThreshold)
					// console.log(self.alertType[9].alertThreshold)
					var checkData=func.checkDataTrigger(self.alertType, onFulfilled);
					// console.log("checkData", checkData);
					var currentData=checkData.currentData;
					var targetData=checkData.tragetList;

					currentData['baby_id']=babyKey;
					var param={
						'action':'real_data',
						'data':currentData,
						'userId':userKey
					}
					self.processSend(userKey, param)
					// process.send(param);

					if(data['wear_status']==1 && data['charging_status']==0){
						var sql="SELECT * FROM "+babyAlertTable+" WHERE userKey=? AND babyKey=? AND status=?";
						var sqlVal=[userKey, babyKey, 1]
						db.doquery(sql, sqlVal, function(err, result){
							if(err){
								console.log("isDataTrigger:Get Baby Alert[ERROR]");
								return;
							}
							var babyAlert=new Object();
							for(var i=0; i<result.length; i++){
								babyAlert[result[i].alertTypeKey]=result[i];
							}
							var triggerRes=func.checkIsNotify(targetData, babyAlert, userKey, babyKey);
							var pushData=triggerRes.pushData;
							if(triggerRes.sql.length>0){
								db.doquery(triggerRes.sql, [], function(err1, res1){})
							}
							if(pushData.length>0){
								self.pushNotification(pushData, userKey, startNotify);
							}
						})
					}

				})
				.catch(e1=>{
					console.log("isDataTrigger:Promise[BUG]",e1);
					return;
				})
			})
			.catch(err=>{
				console.log("isDataTrigger:Redis[BUG]",err);
				return;
			})
		}catch(e){
			console.log("isDataTrigger[BUG]",e);
			return;
		}
	}
	this.processSend=function(userKey, data){
		try{
			redis.getItem("userKey"+userKey)
			.then(uRedisData=>{
				if(uRedisData && uRedisData.length>0 && uRedisData != "{}"){
					var userInfo = JSON.parse(uRedisData)
					if(userInfo.token){
						data['token']=userInfo.token
						process.send(data);
					}else{
						db.findOne(tokenTable, "*", {"userKey":userInfo.id}, function(tokenErr, tokenRes){
							if(tokenRes.length>0){
								data['token'] = tokenRes[0].token
								process.send(data);
							}
						})
					}
					
				}
			})
			.catch(e2=>{
				console.log("processSend:Get User Redis[BUG]",e2);
			})
		}catch(e){
			console.log("processSend[BUG]",e);
			return;
		}
	}

	this.pushNotification=function(data, userKey, startNotify){
		try{
			var promises=new Promise(function(resolve, reject){
				redis.getItem("userKey"+userKey)
				.then(redisData=>{
					if(redisData && redisData.length>0 && redisData != "{}"){
						resolve(JSON.parse(redisData));
					}else{
						db.findOne(userTable, "*", {"userKey":userKey}, function(error,r){
							if(error || r.length==0){
								reject(true);
							}
							resolve(r[0]);
						})
					}
				})
				.catch(err=>{
					reject(true);
				})
			})

			promises
			.then((onFulfilled, onRejected)=>{
				if(onRejected) return;
				var device_type=onFulfilled.appPlatformInfo==0?"iOS":"android";
				var notification_token=onFulfilled.notificationToken?onFulfilled.notificationToken:false;
				if(device_type && notification_token){
					var notifyParam={
						'action':'send_notify',
						'device_type':device_type,
						'notification_token':notification_token
					}

					for(var i=0; i<data.length; i++){
						if(!startNotify && (data[i].type!=1 || data[i].type!=2)){
							data[i]['push']=false;
							data[i]['alert']="";
						}
						notifyParam['data']=data[i];
						process.send(notifyParam);
					}
				}
			})
			.catch(e1=>{
				console.log("pushNotification:Promise[BUG]",e1);
				return;
			})
			
		}catch(e){
			console.log("pushNotification[BUG]",e);
			return;
		}
	}

	this.getBabyPushSetting=function(babyKey, callback){
		try{
			var getSetSql=	"SELECT a.*,b.typeName FROM "+babyPushSetTable+" AS a "+
							"LEFT JOIN "+pushSetTypeTable+" AS b ON "+
							"b.settingTypeKey=a.settingTypeKey WHERE a.babyKey=?";
			db.doquery(getSetSql, [babyKey], function(err, res){
				if(err){
					console.log("getBabyPushSetting[ERROR]");
					return callback(err);
				}
				var setObj=new Object();
				for(var i=0; i<res.length; i++){
					setObj[res[i].typeName]={
						"status":res[i].isPush==0?false:true,
						"bell":res[i].bell==0?false:true,
						"push":res[i].notice==0?false:true,
						"shock":res[i].shake==0?false:true,
					}
					if(res[i].typeName=="sleepPosition"){
						setObj[res[i].typeName]["check"]=res[i].check==0?false:true
					}
					if(res[i].typeName=="sleepActivity"){
						setObj[res[i].typeName]["level"]=res[i].level
					}
				}
				callback(null, setObj);
			})
		}catch(e){
			console.log("getBabyPushSetting[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
	}

	this.getBabyInfo=function(babyKey, userKey, callback){
		try{
			db.findOne(babyTable, "name,userKey", {"babyKey":babyKey,"status":0}, function(error, res){
				if(error){
					console.log("getRedisBabySet:Promises[ERROR]");
					return callback(error)
				}
				return callback(null, res[0]);
			})
		}catch(e){
			console.log("getRedisBabySet[BUG]",e);
			return callback(ErrMsg.UnknownError)
		}
	}

	this.bindDevice=function(data, callback){
		try{
			var updateData={
				"userKey":data.uid,
				"babyKey":data.babyid
			}
			db.update(bsTable, {'userKey':null,'babyKey':null}, updateData, function(e1, r){
				if(e1){
					return callback(e1)
				}
				db.update(trackerTable, {'userKey':null,'babyKey':null}, updateData, function(e2, r1){
					if(e2){
						return callback(e2)
					}
					db.update(bsTable, updateData, {'mac':data.mac}, function(err, res){
						if(err){
							return callback(err)
						}
						redis.getItem(data.mac)
						.then(redisData=>{
							if(redisData){
								var bsInfo=JSON.parse(redisData);
								bsInfo['userKey']=data.uid;
								bsInfo['babyKey']=data.babyid;
								redis.setItem(data.mac, JSON.stringify(bsInfo));
							}
						})
						.catch(e=>{
							console.log("bindDevice:Get Redis[BUG]",e);
						})
						callback(func.successReturn());
					})
				})
				
			})
			
		}catch(e){
			console.log("bindDevice[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
	}
	// this.updateRedisBSInfo=function(mac, param){
	// 	try{
	// 		var bsInfo=false;
	// 		redis.getItem(mac)
	// 		.then(redisData=>{
	// 			if(redisData && redisData.length>0 && redisData!="{}"){
	// 				bsInfo=JSON.parse(redisData);
	// 			}
	// 		})
	// 		.then(function(){
	// 			if(!bsInfo){

	// 			}
	// 			for(var i in param){
	// 				bsInfo[i]=param[i];
	// 			}
	// 		})
	// 		.then(function(){
	// 			redis.setItem(mac, JSON.stringify(bsInfo));
	// 			return
	// 		})
	// 		.catch(e1=>{
	// 			console.log("bindDevice:Get Redis[BUG]",e1);
	// 		})
	// 	}catch(e){
	// 		console.log("updateRedisBSInfo[BUG]",e);
	// 		return
	// 	}
	// }
	this.OTAResult=function(mac, OTAstatus){
		try{
			redis.getItem(mac)
			.then(redisData=>{
				var bsInfo=JSON.parse(redisData);
				var status=parseInt(OTAstatus,16)
				bsInfo['isSendOTA']=status==0?false:true;
				redis.setItem(mac,JSON.stringify(bsInfo));
				return;
			})
			.catch(err=>{
				console.log("OTAResult:Get Redis[BUG]",err);
				return;
			})
		}catch(e){
			console.log("OTAResult[BUG]",e);
			return;
		}
	}
	this.sendConnectError=function(data){
		try{
			db.findOne(bsTable, '*', {'mac':data.mac}, function(err, res){
				if(err) console.log("sendConnectError[ERROR]:",err);
				if(res.length>0){
					var params={
						"action":"connectError",
						"errorType":data.errorType,
						"userId":res[0].userKey,
						"mac":data.mac
					}
					self.processSend(res[0].userKey, params)
					console.log("sendConnectError: Send to "+res[0].userKey+" Success!");
					// redis.getItem("userKey"+res[0].userKey)
					// .then(redisData=>{
					// 	if(redisData && redisData.length>0 && redisData != "{}"){
					// 		var userInfo = JSON.parse(redisData)
					// 		var params={
					// 			"action":"connectError",
					// 			"errorType":data.errorType,
					// 			"userId":res[0].userKey,
					// 			"token":userInfo.token,
					// 			"mac":data.mac
					// 		}
					// 		process.send(params);
					// 		console.log("sendConnectError: Send to "+userInfo.first_name+" Success!");
					// 	}
					// })
					// .catch(e=>{
					// 	console.log("sendConnectError: Get Redis[BUG]",e);
					// })
					// var params={
					// 	"action":"connectError",
					// 	"errorType":data.errorType,
					// 	"userId":res[0].userKey,
					// 	"mac":data.mac
					// }
					// process.send(params);
					// console.log("sendConnectError: Send to "+data.mac+" Success!");
				}
			})
		}catch(e){
			console.log("sendConnectError[BUG]",e);
		}
	}
	this.init();
	this.alertTypeyUpdate=function(callback){
		self.getAllAlertType(function(){
			callback(self.alertType)
		});
	}
	this.alertTypeyGet=function(callback){
		callback(self.alertType)
	}
	
}
module.exports=DBDevice;