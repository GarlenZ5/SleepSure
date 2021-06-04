var DBBaby=function (mysqlPool, redisConnect){
	var self=this;
	
	const config=require('.././public/config.js');
	const func=require('.././public/func.js');
	const ErrMsg=require('.././public/ErrMsg.js');
	const mysql=require('./mysql.js');
	const redisClient=require('./redisClient.js');

	var userTable=config.DB_PREFIX+'USER';
	var tokenTable=config.DB_PREFIX+'USER_TOKEN';
	var bsTable=config.DB_PREFIX+'BASESTATION';
	var deviceTable=config.DB_PREFIX+'DEVICE';
	var babyTable=config.DB_PREFIX+'BABY';
	var babyPushSetTable=config.DB_PREFIX+'BABY_PUSH_SETTING';
	var pushSetTypeTable=config.DB_PREFIX+'PUSH_SETTING_TYPE';

	var db=new mysql(mysqlPool);
	var redis=new redisClient(redisConnect);

	this.settingType;

	this.init=function(){
		self.getAllPushSettingType(function(){});
	}

	this.getAllPushSettingType=function(callback){
		try{
			db.doquery("SELECT * FROM "+pushSetTypeTable, [], function(err, res){
				if(err){
					console.log("getAllPushSettingType[ERROR]",err)
				}else{
					self.settingType=res;
				}

				callback()
			});
		}catch(e){
			console.log("getAllPushSettingType[BUG]",e);
			callback(e)
		}
	}

	this.addNewBaby=function(data,callback){
		try{
			db.findOne(tokenTable, 'userKey,updateTime', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				var userKey=res[0].userKey;
				var instsertData={
					'name':data['name'],
					'gender':Number(data['gender']),
					'birthday':Number(data['birthday']),
					'birthWeight':Number(data['birth_weight']),
					'birthLength':Number(data['birth_length']),
					'userKey':userKey,
					'createdTime': new Date(),
					'icon':data['icon']?data['icon']:'',
					'square':data['square']?data['square']:'',
					'dueDate':data['due_date']?data['due_date']:'',
				}
				db.save(babyTable, instsertData, function(saveErr, saveResult){
					if(saveErr) return callback(saveErr);
					var babyKey=saveResult.insertId;

					var promise = new Promise(function(resolve, reject) {
						var setArr=new Array();
						var setType=self.settingType
						var createTime=new Date();
						for(var i=0; i<setType.length; i++){
							
							var check=null;
							var level=null;
							if(setType[i].check==1){
								check=1
							}
							if(setType[i].level==1){
								level=70
							}
							var oneSet=[userKey,babyKey,setType[i].settingTypeKey,check,level,createTime];
							setArr.push(oneSet)
						}
						resolve(setArr)
					});
					promise
					.then((onFulfilled, onRejected)=>{
						var sql="INSERT INTO "+babyPushSetTable+
								"(`userKey`,`babyKey`,`settingTypeKey`, `check`, `level`, `createTime`) VALUES ?";
						db.doquery(sql, [onFulfilled], function(error, result){
							if(error)console.log("addNewBaby[ERROR]",error);
							callback(null, userKey);
						})
					})
					.catch(e=>{
						console.log("addNewBaby.Promise[BUG]",e)
						return callback(ErrMsg.UnknownError);
					})

					
				})

				
			})
		}catch(e){
			console.log("addNewBaby[BUG]",e)
			return callback(ErrMsg.UnknownError);
		}
		
	}
	this.getBabyList=function(token, callback){
		try{
			db.findOne(tokenTable, 'userKey,updateTime', {'token':token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				var userKey=res[0].userKey;

				redis.getItem("userKey"+userKey)
				.then(redisData=>{
					if(redisData && redisData.length>0 && redisData != "{}"){
						var userInfo=JSON.parse(redisData);
						if(userInfo.baby_list.length==0){
							return callback(new Array());
						}
						callback(userInfo.baby_list);
					}else{
						return callback(new Array());
					}
				})
				.catch(err=>{
					console.log("getBabyList:Get Redis[BUG]",err)
					return callback(ErrMsg.UnknownError);
				})
			})
		}catch(e){
			console.log("getBabyList[BUG]",e)
			return callback(ErrMsg.UnknownError);
		}
		
	}
	this.editBaby=function(babyInfo, callback){
		try{
			db.findOne(tokenTable, 'userKey,updateTime', {'token':babyInfo.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				var userKey=res[0].userKey;
				
				var updateData={
					'name':babyInfo['name'],
					'gender':Number(babyInfo['gender']),
					'birthday':Number(babyInfo['birthday']),
					'birthWeight':Number(babyInfo['birth_weight']),
					'birthLength':Number(babyInfo['birth_length'])
				}
				if(babyInfo['due_date']) {
					updateData['dueDate']=Number(babyInfo['due_date'])//new Date(Number(babyInfo['due_date']));
				}

				if(babyInfo['icon']){
					updateData['icon']=babyInfo['icon']
				}
				if(babyInfo['square']){
					updateData['square']=babyInfo['square']
				}

				db.update(babyTable, updateData, {'babyKey':Number(babyInfo.babyid), 'userKey':userKey}, function(upErr, updateResult){
					if(upErr) return callback(upErr);
					callback(null, userKey);
				})
			})
		}catch(e){
			console.log("editBaby[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
		
	}
	this.uploadIcon=function(data, callback){
		try{
			db.findOne(tokenTable, 'userKey,updateTime', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				var userKey=res[0].userKey;
				callback(null, userKey);
			})
		}catch(e){
			console.log("uploadIcon[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
		
	}

	this.babyNoticeSetting=function(data, callback){
		try{
			db.findOne(tokenTable, 'userKey,updateTime', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				var userKey=res[0].userKey;
				db.findOne(babyTable, '*', {'babyKey':Number(data.babyid)}, function(babyErr, result){
					if(babyErr) return callback(babyErr);
					if(result.length==0) return callback(ErrMsg.BabyIsNotExist);
					
					var promise = new Promise(function(resolve, reject) {
						var newSet=data.setting;
						var setType=self.settingType;
						var sqlString="";
						// var valArr=new Array();
						for(var i=0; i<setType.length; i++){
							// var oneSql = "UPDATE "+babyPushSetTable+"SET isPush=?,bell=?,shake=?,notice=?";
							var status = newSet[setType[i].typeName].status?1:0;
							var bell = newSet[setType[i].typeName].bell?1:0;
							var shake = newSet[setType[i].typeName].shock?1:0;
							var notice = newSet[setType[i].typeName].push?1:0;
							var oneSql ="UPDATE "+babyPushSetTable+" SET isPush="+status+
										",bell="+bell+",shake="+shake+",notice="+notice;//+"";
							// var oneVal=[status,bell,shake,notice]
							if(setType[i].typeName=="sleepPosition"){
								var check = newSet[setType[i].typeName].check?1:0;
								oneSql += ",`check`="+check;
								
								// oneVal.push(check);
							}
							if(setType[i].typeName=="sleepActivity"){
								var level = Number(newSet[setType[i].typeName].level);
								oneSql += ",level="+level;
								
								// oneVal.push(level);
							}
							oneSql+=" WHERE babyKey="+result[0].babyKey+
									" AND userKey="+userKey+" AND settingTypeKey="+setType[i].settingTypeKey+";"
							// oneVal.push(result[0].babyKey, userKey, setType[i].settingTypeKey);
							sqlString +=oneSql;
							// valArr.push(oneVal)
						}
						resolve({
							"sql":sqlString
							// "val":valArr
						})
					})

					promise
					.then((onFulfilled, onRejected)=>{
						db.doquery(onFulfilled.sql, [], function(e, r){
							if(e){
								return callback(e);
							}
							callback(null, userKey)
						})
					})
					.catch(e=>{
						console.log("babyNoticeSetting.Promise[BUG]",e)
						return callback(ErrMsg.UnknownError);
					})
				})
			})
		}catch(e){
			console.log("babyNoticeSetting[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
		
	}

	this.babyStartNotify=function(data, callback){
		try{
			db.findOne(tokenTable, 'userKey,updateTime', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				var userKey=res[0].userKey;
				redis.getItem('baby_key_'+data.babyid)
				.then(redisData=>{
					if(redisData && redisData.length>0){
						var babyInfo=JSON.parse(redisData);
						babyInfo['startNotify']=data.start_notify || Number(data.start_notify)==1?true:false;
						redis.setItem('baby_key_'+data.babyid, JSON.stringify(babyInfo));
					}
					callback(func.successReturn());
				})
				.catch(err4=>{
					console.log("babyStartNotify:Get Redis[BUG]",err4);
					return callback(ErrMsg.UnknownError);
				})
				
			})
		}catch(e){
			console.log("babyStartNotify[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
	}

	this.updateTracker=function(data, callback){
		try{
			db.findOne(tokenTable, 'userKey,updateTime', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				var userKey=res[0].userKey;

				var param={
					'action':'onTheGo',
					'mac':data.base_mac,
					'status':1
				}
				process.send(param);

				callback(null, userKey);
			})
		}catch(e){
			console.log("updateTracker[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
	}

	this.unbindTracker=function(data, callback){
		try{
			db.findOne(tokenTable, 'userKey,updateTime', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				var userKey=res[0].userKey;

				var sql="SELECT a.*,b.mac AS bsMac FROM "+deviceTable+" AS a LEFT JOIN "+
						bsTable+" AS b ON a.bsKey=b.bsKey WHERE b.mac=?";

				db.doquery(sql, [data.mac], function(error, result){
					if(error) return callback(error);
					if(result.length==0) {
						return callback(ErrMsg.InvalidInput);
					}
					var param={
						'action':'onTheGo',
						'mac':result[0].bsMac,
						'status':0
					}
					process.send(param);

					callback(null, userKey);
				})
			})
		}catch(e){
			console.log("unbindTracker[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
		
	}
	this.deleteBaby=function(data, callback){
		try{
			db.findOne(tokenTable, 'userKey,updateTime', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				// var userKey=res[0].userKey;

				db.update(babyTable, {'status':1}, {'babyKey':data.babyid}, function(upErr, updateResult){
					if(upErr) return callback(upErr);
					db.update(bsTable, {'babyKey':null}, {'babyKey':data.babyid}, function(upErr2, upBaseRes){
						if(upErr2) console.log("deleteBaby:Update basestation[BUG]",e);
					})

					// db.delData(hourRecordTable, {'babyKey':data.babyid}, function(upErr3, delRecord){
					// 	if(upErr3) console.log("deleteBaby:Update basestation[BUG]",e);
					// })
					db.update(deviceTable, {'babyKey':null}, {'babyKey':data.babyid}, function(upErr4, upBaseRes){
						if(upErr4) console.log("deleteBaby:Update tracker[BUG]",e);
					})
					callback(func.successReturn());
				})
			})
		}catch(e){
			console.log("deleteBaby[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
		
	}
	this.init();
}
module.exports=DBBaby;