var DBUser=function (mysqlPool, redisConnect){
	var self=this;
	
	const config=require('.././public/config.js');
	const func=require('.././public/func.js');
	const ErrMsg=require('.././public/ErrMsg.js');
	const mysql=require('./mysql.js');
	const redisClient=require('./redisClient.js');
	

	var userTable=config.DB_PREFIX+'USER';
	var activateTable=config.DB_PREFIX+'USER_ACTIVATE';
	var tokenTable=config.DB_PREFIX+'USER_TOKEN';
	var bsTable=config.DB_PREFIX+'BASESTATION';
	var babyTable=config.DB_PREFIX+'BABY';
	var babyPushSetTable=config.DB_PREFIX+'BABY_PUSH_SETTING';
	var pushSetTypeTable=config.DB_PREFIX+'PUSH_SETTING_TYPE';
	var deviceTable=config.DB_PREFIX+'DEVICE';
	var babyDataTable=config.DB_PREFIX+'BABY_DATA';
	var babyAlertTable=config.DB_PREFIX+'BABY_ALERT';

	var db=new mysql(mysqlPool);
	var redis=new redisClient(redisConnect);

	this.getUserInfo=function(condition={}, callback){
		try{
			var selectField="userKey AS id,userID AS account,firstName AS first_name,loginType AS login_type,"+
							"createdTime AS create_time,lastName,password,status,notificationToken,timeZone,"+
							"appPlatformInfo";
			db.findOne(userTable, selectField, condition, function(err, res){
				if(err) return callback(err);
				callback(null, res)
			})
		}catch(e){
			console.log(e)
			return callback(ErrMsg.UnknownError);
		}
	}

	this.getAllInfoAboutUser=function(userKey, Refresh=false, callback){
		try{
			redis.getItem("userKey"+userKey)
			.then(redisData=>{
				if(redisData && redisData.length>0 && redisData != "{}" && !Refresh){
					return callback(null, JSON.parse(redisData));
				}else{
					self.getUserInfo({"userKey":userKey},function(err, result){
						if(err){
							return callback(err);
						}
						if(result.length==0) return callback(ErrMsg.UserIsNotExist)
						var userInfo=result[0];

						var babyField= 	"a.babyKey,a.name,a.dueDate,a.birthWeight,a.birthLength,a.userKey,"+
										"a.createdTime,a.gender,a.birthday,a.icon,a.square,a.updatedTime,";

						var bsField=	"b.bsKey,b.mac,b.hardwareVer,b.softwareVer,"+
										"b.createdTime AS create_time,b.updatedTime AS update_time";
						
						var getBabySql=	"SELECT "+babyField+bsField+" FROM "+babyTable+" AS a "+
										"LEFT JOIN "+bsTable+" AS b ON b.babyKey=a.babyKey "+
										"WHERE a.userKey=? AND a.status=?";
						var getBabyVal=[userKey,0];
						var babyList=new Array();
						var bsList=new Array();
						db.doquery(getBabySql, getBabyVal, function(babyE, babyR){
							if(babyE || babyR.length==0){
								console.log("GetAllInfoAboutUser:Get baby[ERROR]",babyE);
								userInfo['baby_list']=babyList;
								userInfo['basestation_list']=bsList;
								if(Refresh)
									redis.setItem("userKey"+userInfo.id, JSON.stringify(userInfo));
								return callback(null, userInfo);
							}else{
								var promise = new Promise(function(resolve, reject) {
									var babyL=new Array();
									var bsL=new Array();
									for(var i=0; i<babyR.length; i++){
										babyL.push({
											"id":babyR[i].babyKey,
											"due_date":babyR[i].dueDate,
											"birth_weight":babyR[i].birthWeight,
											"birth_length":babyR[i].birthLength,
											"parent":babyR[i].userKey,
											"create_time":babyR[i].createdTime,
											"name":babyR[i].name,
											"gender":babyR[i].gender,
											"birthday":babyR[i].birthday,
											"icon":babyR[i].icon,
											"square":babyR[i].square,
											"updatedTime":babyR[i].updatedTime,
											"basestation":babyR[i].mac
										})
										if(babyR[i].bsKey){
											bsL.push({
												"id":babyR[i].bsKey,
												"mac":babyR[i].mac,
												"hardware_ver":babyR[i].hardwareVer,
												"software_ver":babyR[i].softwareVer,
												"uid":babyR[i].userKey,
												"create_time":babyR[i].create_time,
												"update_time":babyR[i].update_time,
												"babyid":babyR[i].babyKey
											})
										}
										
									}
									resolve({
										"babyList":babyL,
										"bsList":bsL
									});
								});
								promise
								.then((onFulfilled, onRejected)=>{
									babyList=onFulfilled.babyList;
									bsList=onFulfilled.bsList;
									var getSetSql=	"SELECT a.*,b.typeName FROM "+babyPushSetTable+" AS a "+
													"LEFT JOIN "+pushSetTypeTable+" AS b ON "+
													"b.settingTypeKey=a.settingTypeKey WHERE a.userKey=?";
									db.doquery(getSetSql, [userKey], function(setE, setR){
										if(setE || setR.length==0){
											console.log("GetAllInfoAboutUser:Get baby setting[ERROR]",setE)
										}else{
											for(var j=0; j<babyList.length; j++){
												var setting=new Object();
												for(var k=0; k<setR.length; k++){
													if(setR[k].babyKey==babyList[j].id){
														setting[setR[k].typeName]={
															"status":setR[k].isPush==0?false:true,
															"bell":setR[k].bell==0?false:true,
															"push":setR[k].notice==0?false:true,
															"shock":setR[k].shake==0?false:true,
														}
														if(setR[k].typeName=="sleepPosition"){
															setting[setR[k].typeName]["check"]=setR[k].check==0?false:true
														}
														if(setR[k].typeName=="sleepActivity"){
															setting[setR[k].typeName]["level"]=setR[k].level
														}
													}
												}
												babyList[j]["setting"]=setting;
											}
										}
										userInfo['baby_list']=babyList;
										userInfo['basestation_list']=bsList;
										if(Refresh)
											redis.setItem("userKey"+userInfo.id, JSON.stringify(userInfo));
										return callback(null, userInfo);
									})
								})
								.catch(e=>{
									console.log("getAllInfoAboutUser.Promise[BUG]",e)
									return callback(ErrMsg.UnknownError);
								})
							}
						})
					})
				}
			})
			.catch(err=>{
				console.log("GetAllInfoAboutUser:Get redis[BUG]",err)
				return callback(ErrMsg.UnknownError);
			})
			
		}catch(e){
			console.log("GetAllInfoAboutUser[BUG]",e)
			return callback(ErrMsg.UnknownError);
		}
	}

	this.createUser=function(data, callback){
		try{
			self.getUserInfo({"userID":data.account},function(err, result){
				if(err) return callback(err);
				if(result.length>0){
					return callback(ErrMsg.UserExist);
				}
				var hashPwd=func.getUserHash(data.account,data.password);
				var insertData={
					'firstName':data.first_name,
					'userID':data.account,
					'password':hashPwd,
					'loginType':1,
					'status':3,
					'createdTime':new Date()
				}
				if(data.hasOwnProperty('lastName')){
					insertData['lastName']=data.lastName
				}
				db.save(userTable, insertData, function(saveErr, insertRes){
					if(saveErr) return callback(saveErr);

					var verification_token=func.createUserToken(insertData.account);
					var verification_URL=config.HTTP_HOST_URL+':'+config.HTTP_PORT+'/verify?verify_token='+verification_token;
					var sendEmailData={
						'account':data.account,
						'first_name':insertData.first_name,
						'verification_URL':verification_URL
					}

					var insertActivateData={
						'userKey':insertRes.insertId,
						'activateToken':verification_token,
						'createdTime':new Date(),
						'status':0
					}
					db.save(activateTable, insertActivateData, function(e, r){
						if(e){
							console.log("createUser[DB save]",e)
						}
						func.sendEmail(sendEmailData)
						callback(func.successReturn(['User registered, please verify your email.']));
					})
				})
			})
		}catch(e){
			console.log("createUser[BUG]",e)
			return callback(ErrMsg.UnknownError);
		}
	}

	this.userLoginWithEmail=function(data, callback){
		try{
			self.getUserInfo({"userID":data.account},function(err, result){
				if(err) return callback(err);
				if(result.length==0){
					return callback(ErrMsg.UserIsNotExist);
				}
				var userInfo=result[0]

				var hashPwd=func.getUserHash(data.account,data.password);

				if(hashPwd !== userInfo.password){
					return callback(ErrMsg.UserPasswordNotMatch);
				}

				if(userInfo.status==3){
					return callback(ErrMsg.AccountNotActive);
				}else if(userInfo.status==2){
					return callback(ErrMsg.AccountBlocked);
				}

				self.updateLoginInfo(userInfo, data, function(error, res){
					if(error) return callback(error);
					callback(res);
				})
			})
		}catch(e){
			console.log("userLoginWithEmail[BUG]",e)
			return callback(ErrMsg.UnknownError);
		}
	}

	this.thirdPartyLogin=function(data, callback){
		try{
			self.getUserInfo({"userID":data.access_token},function(err, result){
				if(err) return callback(err);

				var hashPwd=func.getUserHash(data.access_token,'a123456');
				var loginType=data.type=='google'?3:2;
				var time=new Date();

				var promise = new Promise(function(resolve, reject) {
					if(result.length==0){
						var insertData={
							"userID":data.access_token,
							"firstName":data.first_name,
							"password":hashPwd,
							"loginType":loginType,
							"status":1,
							"createdTime":time
						}
						db.save(userTable, insertData, function(insertE, insertR){
							if(insertE){
								reject(insertE);
							}
							var userInfo={
								"account":data.access_token,
								"password":hashPwd,
								"id":insertR.insertId
							}
							resolve(userInfo);
						})
					}else{
						resolve(result[0]);
					}
				});

				promise
				.then((onFulfilled, onRejected)=>{
					if(onRejected) return callback(ErrMsg.LoginFailed);

					self.updateLoginInfo(onFulfilled, data, function(error, res){
						if(error) return callback(error);
						callback(res);
					})
				})
				.catch(e=>{
					console.log("thirdPartyLogin.Promise[BUG]",e)
					return callback(ErrMsg.UnknownError);
				})
			})
		}catch(e){
			console.log("thirdPartyLogin[BUG]",e)
			return callback(ErrMsg.LoginFailed);
		}
	}

	this.updateLoginInfo=function(userInfo, data, callback){
		try{
			var promise = new Promise(function(resolve, reject){
				db.findOne(tokenTable, "*", {"userKey":userInfo.id}, function(tokenErr, tokenRes){
					if(tokenErr){
						reject(ErrMsg.LoginFailed);
					}
					// isLogined=false
					// console.log('tokenRes', tokenRes)
					if(tokenRes.length>0){
						var invalidLogin={
							'action':'loginInvalid',
							'token':tokenRes[0].token,
							'msg':'login is invalid'
						}
						process.send(invalidLogin);
						// isLogined=tokenRes[0].tokenKey
						resolve({'isLogined':tokenRes[0].tokenKey})
					}else{
						resolve({'isLogined':false})
					}
					
				})
			})
			promise
			.then((onFulfilled, onRejected)=>{
				if(onRejected){
					return callback(onRejected);
				}
				// console.log('onFulfilled', onFulfilled)
				var token=func.createUserLoginToken(userInfo.account, userInfo.password, new Date());
				var updatedTime=new Date();
				var tokenKey=onFulfilled.isLogined
				var sqlString = "";
				var sqlVal=[];
				if(!tokenKey){
					sqlString="INSERT INTO "+tokenTable+"(userKey,token,status,createdTime,updateTime) VALUES(?,?,?,?,?)";
					sqlVal=[userInfo.id,token,0,updatedTime,updatedTime];
				}else{
					sqlString="UPDATE "+tokenTable+" SET token=?,status=? WHERE tokenKey=?";
					sqlVal=[token,0,tokenKey];
				}
				db.doquery(sqlString, sqlVal, function(e1, res){
					if(e1){
						return callback(ErrMsg.LoginFailed);
					}
					var updateUser={
						"notificationToken":data.notification_token,
						"timeZone":data.timezone?Number(data.timezone):0,
						"appPlatformInfo":data.device_type=="iOS"?0:1,
						"appPlatformVer":data.appPlatformVer?data.appPlatformVer:"",
						"appSoftwareVer":data.appSoftwareVer?data.appSoftwareVer:"",
						"updatedTime":updatedTime
					};
					db.update(userTable, updateUser, {"userKey":userInfo.id}, function(upUserE, upUserR){
						if(upUserE){
							return callback(ErrMsg.LoginFailed);
						}
						self.getAllInfoAboutUser(userInfo.id, true, function(e, r){
							if(e) {
								console.log("UserLoginWithEmail:Get all user information[ERROR]",e)
								return callback(func.successReturn({"token":token}));
							}
							r['token']=token;
							r['lastLoginTime']=updatedTime;
							redis.setItem("userKey"+userInfo.id, JSON.stringify(r));
							callback(null, func.successReturn(r));
						})
						
					})
				})
			})

			// var token=func.createUserLoginToken(userInfo.account, userInfo.password, new Date());
			// var updatedTime=new Date();
			// var sqlString=	"INSERT INTO "+tokenTable+"(userKey,token,status,createdTime,updateTime) "+
			// 				"VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE token=?";
			// var sqlVal=[userInfo.id,token,1,updatedTime,updatedTime,token];
			// db.doquery(sqlString, sqlVal, function(e, res){
			// 	if(e){
			// 		return callback(ErrMsg.LoginFailed);
			// 	}

			// 	var updateUser={
			// 		"notificationToken":data.notification_token,
			// 		"timeZone":data.timezone?Number(data.timezone):0,
			// 		"appPlatformInfo":data.device_type=="iOS"?0:1,
			// 		"appPlatformVer":data.appPlatformVer?data.appPlatformVer:"",
			// 		"appSoftwareVer":data.appSoftwareVer?data.appSoftwareVer:"",
			// 		"updatedTime":updatedTime
			// 	};
			// 	db.update(userTable, updateUser, {"userKey":userInfo.id}, function(upUserE, upUserR){
			// 		if(upUserE){
			// 			return callback(ErrMsg.LoginFailed);
			// 		}
			// 		self.getAllInfoAboutUser(userInfo.id, true, function(e, r){
			// 			if(e) {
			// 				console.log("UserLoginWithEmail:Get all user information[ERROR]",e)
			// 				return callback(func.successReturn({"token":token}));
			// 			}
			// 			r['token']=token;
			// 			r['lastLoginTime']=updatedTime;
			// 			redis.setItem("userKey"+userInfo.id, JSON.stringify(r));
			// 			callback(null, func.successReturn(r));
			// 		})
					
			// 	})


			// })

		}catch(e){
			console.log("updateLoginToken[BUG]",e)
			return callback(ErrMsg.UnknownError);
		}
	}

	this.loginOut=function(data, callback){
		try{
			db.findOne(tokenTable, '*', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0) return callback(ErrMsg.InvalidToken);
				db.update(tokenTable, {"status":1}, {"tokenKey":res[0].tokenKey}, function(e, r){
					if(e) return callback(e);
					redis.delItem("userKey"+res[0].userKey);
					callback(func.successReturn());
				})
			})
		}catch(e){
			console.log("loginOut[BUG]",e)
			return callback(ErrMsg.UnknownError);
		}
	}

	this.changePassword=function(data, callback){
		try{
			db.findOne(tokenTable, '*', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				self.getAllInfoAboutUser(res[0].userKey, false, function(e, r){
					if(e) return callback(e);
					var account=r.account;
					var oldhashPwd=func.getUserHash(account,data.oldpassword);
					if(oldhashPwd !== r.password) return callback(ErrMsg.UserPasswordNotMatch);
					var newHashPwd=func.getUserHash(account,data.newpassword);
					db.update(userTable, {'password':newHashPwd}, {'userID':account}, function(updateErr, changeRes){
						if(updateErr){
							return callback(updateErr)
						}
						r['password']=newHashPwd;
						redis.setItem("userKey"+r.id, JSON.stringify(r));
						callback(func.successReturn(r))
					})
				})
			})
		}catch(e){
			console.log("changePassword[BUG]",e)
			return callback(ErrMsg.UnknownError);
		}
	}

	this.setName=function(data, callback){
		try{
			db.findOne(tokenTable, '*', {'token':data.token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0 || 
					new Date(res[0]['updateTime']).getTime()+365*24*60*60*1000 < new Date().getTime()) {
					return callback(ErrMsg.InvalidToken);
				}
				self.getAllInfoAboutUser(res[0].userKey, false, function(e, r){
					if(e) return callback(e);
					var account=r.account;
					db.update(userTable, {'firstName':data.first_name}, {'userID':account}, function(updateErr, changeRes){
						if(updateErr){
							return callback(updateErr)
						}
						r['first_name']=data.first_name;
						redis.setItem("userKey"+r.id, JSON.stringify(r));
						callback(func.successReturn(r))
					})
				})
			})
		}catch(e){
			console.log("setName[BUG]",e)
			return callback(ErrMsg.UnknownError);
		}
		
	}
	this.forgetPassword=function(data, callback){
		try{
			self.getUserInfo({'userID':data.account}, function(err, res){
				if(err) return callback(err);
				if(res.length==0){
					return callback(ErrMsg.UserIsNotExist);
				}
				var userInfo=res[0]
				if(userInfo.status==3){
					return callback(ErrMsg.AccountNotActive);
				}else if(userInfo.status==2){
					return callback(ErrMsg.AccountBlocked);
				}

				var resetPwd_token=func.createUserToken(data.account);
				var resetPwd_URL=config.HTTP_HOST_URL+':'+config.HTTP_PORT+'/resetpwd?token='+resetPwd_token;

				var insertActivateData={
					'userKey':userInfo.id,
					'activateToken':resetPwd_token,
					'createdTime':new Date(),
					'status':0
				}
				db.save(activateTable, insertActivateData, function(e, r){
					if(e){
						console.log("forgetPassword[DB save]",e)
					}
					var sendEmailData={
						'account':userInfo.account,
						'first_name':userInfo.first_name,
						'verification_URL':resetPwd_URL
					}
					var emailInfo={
		                from: 'SleepSure Team'+'<'+config.MAIL_USER+'>',
		                to: userInfo.account,
		                subject: 'Reset your password for HALO SleepSure',
		                text: 'Hello,\r\n\r\nFollow this link to reset your HALO SleepSure password for your '+userInfo.account+' account.\r\n\r\n'+resetPwd_URL+"\r\n\r\nIf you didn't ask to reset your password, you can ignore this email.\r\n\r\nThanks,\r\n\r\nYour HALO SleepSure team"
		            }
					func.sendEmail(sendEmailData, emailInfo)
					callback(func.successReturn(['A reset password link has been sent to your email, please check your email.']));
				})
			})
		}catch(e){
			console.log("forgetPassword[BUG]",e)
			return callback(ErrMsg.UnknownError)
		}
		
	}

	this.emailSend=function(data,callback){
		try{
			self.getUserInfo({'userID':data.account}, function(err, res){
				if(err) return callback(err);
				if(res.length==0){
					return callback(ErrMsg.UserIsNotExist);
				}
				var userInfo=res[0]

				if(Number(userInfo.status) == 1){
					return callback(ErrMsg.UnknownErrorDetail('Your email has been verified.You can now go back to the SleepSure App and complete setup.'))
				}

				var verification_token=func.createUserToken(data.account);
				var verification_URL=config.HTTP_HOST_URL+':'+config.HTTP_PORT+'/verify?verify_token='+verification_token;
				var sendEmailData={
					'account':userInfo.account,
					'first_name':userInfo.first_name,
					'verification_URL':verification_URL
				}

				var insertActivateData={
					'userKey':userInfo.id,
					'activateToken':verification_token,
					'createdTime':new Date(),
					'status':0
				}
				db.save(activateTable, insertActivateData, function(e, r){
					if(e) {
						return callback(ErrMsg.UnknownError)
					}
					func.sendEmail(sendEmailData)
					callback(func.successReturn(['Email sent successfully, please verify your email.']));
				})
			})
		}catch(e){
			console.log("emailSend[BUG]",e)
			return callback(ErrMsg.UnknownError)
		}
	}
	this.isVerified=function(data,callback){
		try{
			self.getUserInfo({'userID':data.account}, function(err, res){
				if(err) return callback(err);
				if(res.length==0){
					return callback(ErrMsg.UserIsNotExist);
				}
				var userInfo=res[0];
				var verifyResult=Number(userInfo.status);
				callback(func.successReturn({'status':verifyResult}));
			})
		}catch(e){
			console.log("isVerified[BUG]",e)
			return callback(ErrMsg.UnknownError)
		}
	}

	this.resetPassword=function(data, callback){
		try{
			console.log(data)
			db.findOne(activateTable, '*', {'activateToken':data.token, 'status':0}, function(err, res){
				if(err) return callback(err);
				console.log(res)
				if(res.length==0) {
					return callback(ErrMsg.InvalidToken);
				}
				var activeData=res[0];
				self.getAllInfoAboutUser(activeData.userKey, false, function(e,r){
					if(e) return callback(e);
					var newHashPwd=func.getUserHash(r.account,data.password);
					db.update(userTable, {'password':newHashPwd}, {'userID':r.account}, function(updateErr, changeRes){
						if(updateErr){
							return callback(updateErr)
						}
						r['password']=newHashPwd;
						redis.setItem("userKey"+r.id, JSON.stringify(r));
						db.update(activateTable, {'status':1}, {'activateToken':data.token}, function(tokenErr, tokenRes){
							if(tokenErr) return callback(tokenErr);
							callback(func.successReturn());
							
						})
					})

				})
			})
		}catch(e){
			console.log("resetPassword[BUG]",e)
			return callback(ErrMsg.UnknownError)
		}
		
	}

	this.verifyAccount=function(token, callback){
		try{
			db.findOne(activateTable, '*', {'activateToken':token}, function(err, res){//, 'status':0
				if(err) return callback(err);
				console.log(res)
				if(res.length==0){
					return callback(ErrMsg.InvalidToken);
				}
				var activeData=res[0];
				if(activeData.status == 1){
					return callback(ErrMsg.UnknownErrorDetail(
						'Your email has been verified.<br>You can now go back to the SleepSure App<br>and complete setup.'
						));
				}
				if(new Date().getTime() > new Date(activeData.createTime).getTime() + (24*60*60*1000)) {
					self.getUserInfo({'userKey':activeData.userKey}, function(getUserError, userInfo){
						if(getUserError) return callback(getUserError);
						if(userInfo.length==0)return callback(ErrMsg.UnknownErrorDetail('The user does not exist, please contact the administrator.'))
						self.sendVerificationEmail(userInfo[0], function(e, r){
							if(e) return callback(e);
							callback(ErrMsg.UnknownErrorDetail('The verification code timed out and was successfully resend,please verify your email.'))
						})

					})
				}else{
					db.update(activateTable, {'status':1}, {'activateToken':token}, function(activateErr, res){
						db.update(userTable, {'status':1}, {'userKey':activeData.userKey}, function(userErr, res){
							callback(func.successReturn());
						})
						
					})
				}
			})
		}catch(e){
			console.log("verifyAccount[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
		
	}
	this.sendVerificationEmail=function(userInfo, callback){
		try{
			var verification_token=func.createUserToken(userInfo.account);
			var verification_URL=config.HTTP_HOST_URL+':'+config.HTTP_PORT+'/verify?verify_token='+verification_token;
			var sendEmailData={
				'account':userInfo.account,
				'first_name':userInfo.first_name,
				'verification_URL':verification_URL
			}
			var insertActivateData={
				'userKey':userInfo.id,
				'activateToken':verification_token,
				'createTime':new Date(),
				'status':0
			}
			db.save(activateTable, insertActivateData, function(e, r){
				if(e) return callback(e)
				func.sendEmail(sendEmailData)
				callback(null, r);
			})
		}catch(e){
			console.log("sendVerificationEmail[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
		
	}

	this.verifyToken=function(token,callback){
		try{
			db.findOne(tokenTable, '*', {'token':token}, function(err, res){
				if(err) return callback(err);
				if(res.length==0) {
					return callback(ErrMsg.InvalidToken);
				}
				if(new Date(res[0]['updateTime']).getTime()+(365*24*60*60*1000) < new Date().getTime()){
					return callback(ErrMsg.UnknownErrorDetail('The verification code timed out,please log in again.'))
				}
				callback(null, res);
			})
		}catch(e){
			console.log("verifyToken[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
		
	}
	this.getAllBaby=function(userKey,callback){
		try{
			db.find(babyTable, "babyKey", {'userKey':userKey}, "", function(err, res){
				var babyKeyArr=[];
				for(var i=0; i<res.length; i++){
					babyKeyArr.push(res[i].babyKey)
				}
				return callback(babyKeyArr)
			})
		}catch(e){
			console.log("removeBaby[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
	}
	this.removeAccount=function(account, callback){
		try{
			db.findOne(userTable, "userKey", {'userID':account}, function(err, res){
				if(err) return callback(err);
				var userKey=res[0].userKey
				db.delData(activateTable,{'userKey':userKey},function(userErr, userRes){})
				db.delData(tokenTable,{'userKey':userKey},function(userErr, userRes){})
				db.delData(babyAlertTable,{'userKey':userKey},function(userErr, userRes){})
				db.delData(babyPushSetTable,{'userKey':userKey},function(userErr, userRes){})
				db.update(bsTable,{'userKey':null,'babyKey':null},{'userKey':userKey},function(userErr, userRes){
					db.update(deviceTable,{'userKey':null,'babyKey':null},{'userKey':userKey},function(userErr, userRes){
						self.getAllBaby(userKey, function(r){
							console.log(r)
							var query=	"delete from "+babyDataTable+" where babyKey in ("+r.join(",")+");"
							db.doquery(query, [], function(e, res){
								db.delData(babyTable,{'userKey':userKey},function(userErr, userRes){
									db.delData(userTable,{'userKey':userKey},function(userErr, userRes){
										callback(null, 'success')
									})
								})
							})
						})
					})
				})
			})
		}catch(e){
			console.log("removeAccount[BUG]",e);
			return callback(ErrMsg.UnknownError);
		}
	}
}
module.exports=DBUser;