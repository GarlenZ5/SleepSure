/**
 * [This `.js` is the HTTP service handler.
 * Define all HTTP resource here.
 * HTTP service should handle user custom data I/O; and some admin function]
 * @Author   Garlen
 * @DateTime 2020-12-14T16:19:14+0800
 * @return   {[type]}
 */
var http=function(){
	var self=this;
	const app = require('express')();
	const httpServer = require('http').Server(app);
	const bodyParser = require('body-parser');
	const validate=require('jsonschema').validate;
	const ejs=require('ejs');
	const assert = require('assert');
	const fs=require('fs');
	const path = require("path");
	const config=require('.././public/config.js');
	const func=require('.././public/func.js');
	const ValidatorSchema=require('.././public/ValidatorSchema.js');
	const ErrMsg=require('.././public/ErrMsg.js');

	const DBUser=require('.././db/DBUser.js');
	const DBBaby=require('.././db/DBBaby.js');
	const DBDevice=require('.././db/DBDevice.js');

	this.dbuser;
	this.dbbaby;
	this.dbdevice;
	this.app=app;

	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
	  extended: true
	}));


	this.initDB=function(){
		var pool=func.connectMySql();
		var redisConnect=func.connectRedis();
		self.dbuser=new DBUser(pool, redisConnect);
		self.dbbaby=new DBBaby(pool, redisConnect);
		self.dbdevice=new DBDevice(pool, redisConnect);

	}

	/**
	 * [Check data]
	 * @Author   Garlen
	 * @DateTime 2020-12-16T10:10:23+0800
	 * @param    {[Object]}                 body           [description]
	 * @param    {[type]}                 validateSchema [description]
	 * @return   {[type]}                 callback           [description]
	 */
	this.checkRequiredParam=function(body, validateSchema, callback){
		var check = self.invalidInSchema(body,validateSchema);
		if(check){
			return callback(check);
		}else{
			return callback(null);
		}
	}
	this.invalidInSchema=function(data,schema){
		var validateResult=validate(data,schema);
		if(validateResult.errors.length){
			var errType=validateResult.errors[0].schema.message
			// var err=ErrMsg.InvalidInput;
			var err=ErrMsg[errType];

			// err['error_message_detail']=validateResult;
			return err;
		}
		return null;
	}

	/**
	 * User
	 */
	app.post('/user/signup',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.UserEMailRegister, function(err, cheResult){
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.createUser(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})

	app.post('/user/login',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.UserEMailLogin, function(err, cheResult){
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.userLoginWithEmail(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})

	app.post('/user/login/thirdParty',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.LoginWithThirdPartyLogin, function(err, cheResult){
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.thirdPartyLogin(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})

	app.post('/user/loginout',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.UserLoginOut, function(err, cheResult){
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.loginOut(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})

	app.post('/user/changePassword',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.ResetPassword, function(err, cheResult){
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.changePassword(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})

	app.post('/user/setName',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.UserSettingName, function(err, cheResult){
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.setName(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})

	app.post('/user/forgetPassword',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.ForgetPassword, function(err, cheResult){
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.forgetPassword(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})

	app.post('/user/resend',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.ResendEmail, function(err, cheResult){
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.emailSend(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})

	app.post('/user/verifyResult',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.ResendEmail, function(err, cheResult){
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.isVerified(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})

	// app.post('/resetPassword',function (req, res){
	// 	self.checkRequiredParam(req.body,ValidatorSchema.ResetPasswordF, function(err, cheResult){
	// 		if(err){
	// 			return res.end(JSON.stringify(err));
	// 		}
	// 		self.dbuser.resetPassword(req.body, function(result){
	// 			fs.readFile('./html/resetResult.html','utf-8',function(err,data){
	// 	            if(err){
	// 	                return res.end(JSON.stringify(err));
	// 	            }
	// 	            var resetResult
	// 	            if(result.code===0){
	// 	            	resetResult='Your password has been reset.'
	// 	            }else{
	// 	            	resetResult=result.msg
	// 	            }
	// 	            var html=data.replace('%result%',resetResult);
	// 	            res.end(html);
	// 	        });
	// 		})
	// 	})
	// })

	app.post('/resetPassword',function (req, res){
		self.checkRequiredParam(req.body,ValidatorSchema.ResetPasswordF, function(err, cheResult){
			// console.log(req.body)
			// console.log(ValidatorSchema.ResetPasswordF)
			if(err){
				return res.end(JSON.stringify(err));
			}
			self.dbuser.resetPassword(req.body, function(result){
				res.end(JSON.stringify(result));
			})
		})
	})
	/**
	 * Baby
	 */

	app.post('/baby/add',function (req, res){
	 	var form=func.getFormData();
	 	form.parse(req, function (err, fields, files){
	 		self.checkRequiredParam(fields,ValidatorSchema.BabyAdd, function(err, cheResult){
	 			if(err){
					return res.end(JSON.stringify(err));
				}
				if(files.icon){
					fields['icon']='babyIcon?path='+func.handlePostFiles(
						form.uploadDir, 
						fields.name.replace(/ /g, '')+'_icon', 
						files.icon)
	            }
	            if(files.square){
	            	fields['square']='babyIcon?path='+func.handlePostFiles(
						form.uploadDir, 
						fields.name.replace(/ /g, '')+'_square', 
						files.square)
	            }
	            self.dbbaby.addNewBaby(fields,function(err, result){
	            	if(err){
	            		return res.end(JSON.stringify(err));
	            	}
	            	self.dbuser.getAllInfoAboutUser(result, true, function(e,r){
	            		if(e) return res.end(JSON.stringify(e));
	            		res.end(JSON.stringify(func.successReturn(r)));
	            	})
				})
	 		})    
		})
		
	})
	app.post('/baby/babyList',function (req, res){
	 	if (!req.body.token) return res.end(ErrMsg.InvalidToken);
	 	self.dbbaby.getBabyList(req.body.token, function(result){
	 		console.log("babyList",result)
	 		res.end(JSON.stringify(func.successReturn(result)));
	 	})
		
	})
	app.post('/baby/editBaby',function (req, res){
		var form=func.getFormData();
	 	form.parse(req, function (err, fields, files){
	 		self.checkRequiredParam(fields,ValidatorSchema.BabyEdit, function(err, cheResult){
	 			if(err){
					return res.end(JSON.stringify(err));
				}
				if(files.icon){
					fields['icon']='babyIcon?path='+func.handlePostFiles(
						form.uploadDir, 
						fields.name.replace(/ /g, '')+'_icon', 
						files.icon)
	            }
	            if(files.square){
	            	fields['square']='babyIcon?path='+func.handlePostFiles(
						form.uploadDir, 
						fields.name.replace(/ /g, '')+'_square', 
						files.square)
	            }
	            self.dbbaby.editBaby(fields,function(err, result){
	            	if(err){
	            		return res.end(JSON.stringify(err));
	            	}
	            	self.dbuser.getAllInfoAboutUser(result, true, function(e,r){
	            		if(e) return res.end(JSON.stringify(e));
	            		var promise = new Promise(function(resolve, reject) {
	            			var babyList=r.baby_list;
		            		var babyInfo=new Object();
		            		for(var i=0; i<babyList.length; i++){
		            			if(babyList[i].id==fields.babyid){
		            				babyInfo=babyList[i]
		            				break;
		            			}
		            		}
		            		resolve(babyInfo);
	            		})
	            		promise
	            		.then((onFulfilled, onRejected)=>{
	            			res.end(JSON.stringify(func.successReturn(onFulfilled)));
	            		})
	            		.catch(e=>{
	            			return res.end(JSON.stringify(func.successReturn()));
	            		})
	            		
	            		
	            	})
				})
	 		})    
		})
		
	})

	app.post('/baby/uploadIcon',function (req, res){
		var form=func.getFormData();
	 	form.parse(req, function (err, fields, files){
	 		self.checkRequiredParam(fields,ValidatorSchema.UploadIcon, function(err, cheResult){
	 			if(err){
					return res.end(JSON.stringify(err));
				}
				self.dbbaby.uploadIcon(fields,function(e, r){
					if(e){
						return res.end(JSON.stringify(e));
					}
					self.dbuser.getAllInfoAboutUser(r, false, function(e1,r1){
	            		if(e1) return res.end(JSON.stringify(e1));
	            		var promise = new Promise(function(resolve, reject) {
	            			var babyList=r1.baby_list;
		            		var babyInfo=new Object();
		            		for(var i=0; i<babyList.length; i++){
		            			if(babyList[i].id==fields.babyid){
		            				babyInfo=babyList[i]
		            				break;
		            			}
		            		}
		            		resolve(babyInfo);
	            		})
	            		promise
	            		.then((onFulfilled, onRejected)=>{
	            			var babyName=onFulfilled.name;
	            			if(files.icon){
								func.handlePostFiles(
									form.uploadDir, 
									babyName.replace(/ /g, '')+'_icon', 
									files.icon)
				            }
				            if(files.square){
				            	func.handlePostFiles(
				            		form.uploadDir, 
				            		babyName.replace(/ /g, '')+'_square', 
				            		files.square)
				            }
				            res.end(JSON.stringify(func.successReturn(r1)));
	            		})
	            		.catch(e=>{
	            			return res.end(JSON.stringify(func.successReturn()));
	            		})
	            		
	            		
	            	})
				})
	 		})    
		})
	})

	app.post('/baby/noticeSet',function (req, res){
	 	self.checkRequiredParam(req.body,ValidatorSchema.BabyNoticeSet, function(err, cheResult){
	 		if(err){
				return res.end(JSON.stringify(err));
			}
	 		self.dbbaby.babyNoticeSetting(req.body, function(e, r){
	 			if(e){
	 				return res.end(JSON.stringify(e));
	 			}
				self.dbuser.getAllInfoAboutUser(r, true, function(e1,r1){
					if(e1){
						return res.end(JSON.stringify(e1));
					}
					res.end(JSON.stringify(func.successReturn(r1)));
				})
			})
	 	})
		
	})

	app.post('/baby/startNotify',function (req, res){
	 	self.checkRequiredParam(req.body,ValidatorSchema.BabyStartNotify, function(err, cheResult){
	 		if(err){
				return res.end(JSON.stringify(err));
			}
	 		self.dbbaby.babyStartNotify(req.body, function(result){
				return res.end(JSON.stringify(result));
			})
	 	})
		
	})

	app.post('/baby/updateTracker',function (req, res){
	 	self.checkRequiredParam(req.body,ValidatorSchema.UpdateTracker, function(err, cheResult){
	 		if(err){
				return res.end(JSON.stringify(err));
			}
	 		self.dbbaby.updateTracker(req.body, function(error, r){
				if(error){
	 				return res.end(JSON.stringify(error));
	 			}
				self.dbuser.getAllInfoAboutUser(r, false, function(e1,r1){
					if(e1){
						return res.end(JSON.stringify(e1));
					}
					res.end(JSON.stringify(func.successReturn(r1)));
				})
			})
	 	})
		
	})

	app.post('/baby/unbindTracker',function (req, res){
	 	self.checkRequiredParam(req.body,ValidatorSchema.DisconnectTracker, function(err, cheResult){
	 		if(err){
				return res.end(JSON.stringify(err));
			}
	 		self.dbbaby.unbindTracker(req.body, function(error, result){
	 			if(error){
	 				return res.end(JSON.stringify(error));
	 			}
				self.dbuser.getAllInfoAboutUser(result, false, function(e1,r1){
					if(e1){
						return res.end(JSON.stringify(e1));
					}
					res.end(JSON.stringify(func.successReturn(r1)));
				})
				// if(result.data){
				// 	var resDate=result.data;
				// 	self.dbuser.getUserAllMsg(resDate.uid,function(userInfo){
				// 		if(!userInfo.code){
				// 			userInfo['token']=req.body.token
				// 			result['data']=userInfo
				// 		}
				// 		return res.end(JSON.stringify(result));
				// 	})

				// }else{
				// 	return res.end(JSON.stringify(func.successReturn()));
				// }
			})
	 	})
		
	})

	app.post('/baby/delBaby',function (req, res){
	 	self.checkRequiredParam(req.body,ValidatorSchema.BabyDel, function(err, cheResult){
	 		if(err){
				return res.end(JSON.stringify(err));
			}
	 		self.dbbaby.deleteBaby(req.body, function(result){
				res.end(JSON.stringify(result));
			})
	 	})
		
	})

	app.post('/OTA/tracker',function (req, res){
		var data=req.body;
	 	var fs = require("fs");
		var type=data.type;
		var start=Number(data.start);
		var length=Number(data.length);
		var tracker_ver_info=func.getNewSoftVer(config.TRACKER_BIN_FILE)
		var newTrackerVer=tracker_ver_info['ver']
		var binInfomation=fs.readFileSync(config.TRACKER_BIN_FILE+'/'+tracker_ver_info['file']);
		var stringBuf=new Buffer(binInfomation).toString('hex')
		var result={
			'code':"100",
			'msg':'Success'
		}
		var resData=new Object();
		switch(type){
			case '00':
				resData['total']=binInfomation.length
				break;
			case '02':
				resData['version']='V'+newTrackerVer
				break;
			default:
				var targetString=stringBuf.substr(start*2,length*2)
				var resString='';
				for(var i=0; i < targetString.length/2; i++){
					resString += targetString.substr(i*2,2)+" ";
				}
				resData['str']=resString
		}
		result['data']=resData;
		res.end(JSON.stringify(result));
		
	})

	app.get('/resource', function(req, res){
		var params=req.query
		var resource_type = Object.keys(params);
		var resourceURL='./html_resource/'+params[resource_type];
		fs.readFile(resourceURL,'utf-8',function(err,data){
            res.end(data);
        });
	})
	app.get('/babyIcon', function(req, res){
		var params=req.query
		var iconPath=config.BABY_ICON+'/'+params['path'];
        res.sendFile(iconPath,function(err){
			if(err){
				res.status(404).json(ErrMsg.FileNotFound);
			}
		});
	})
	app.get('/verify', function(req, res){
		self.dbuser.verifyAccount(req.query.verify_token,function(result){
			fs.readFile('./html/verifyResult.html','utf-8',function(err,data){
	            if(err){
	                res.end(JSON.stringify(err));
	            }
	            var resetResult
	            if(result.code===0){
	            	resetResult='Your account has been activated.'
	            }else{
	            	resetResult=result.msg
	            }
	            var html=data.replace('%result%',resetResult);
	            res.end(html);
	        });
		})
	})

	app.get('/resetpwd', function(req, res){
		fs.readFile('./html/resetPassword.html','utf-8',function(err,data){
            if(err){
                res.end(JSON.stringify(err));
            }
            var html=data.replace('%token%',req.query.token);
            res.end(html);
        });
	})

	app.get('/firmware/basestation/update.bin', function(req, res){
		var newVer=func.getNewSoftVer();
		var filesPath=config.BIN_FILE+'/'+newVer.file;
		res.sendFile(filesPath,function(err){
			if(err){
				res.status(404).json(ErrMsg.FileNotFound);
			}
		});
	})

	app.get('/SleepSureBS_OTA/:bin',function(req, res){
		res.set({'Access-Control-Allow-Origin':'*'});
		var file=req.params.bin;
		var lastVer=func.getBsBinVer();
		var filesPath=config.BIN_FILE+'/'+lastVer+"/"+file;
		res.sendFile(filesPath,function(err){
			if(err){
				res.status(404).json(ErrMsg.FileNotFound);
			}
		});
		// res.end(JSON.stringify({"test":"test"}))
	})
	app.get('/removeAccount/:account',function(req, res){
		var params=req.params
		self.dbuser.removeAccount(params['account'], function(e,result){
			if(e){
				return res.end(JSON.stringify(e));
			}
			res.end(result);
		})
		// console.log(req.params)
		// res.end(JSON.stringify({"test":"test"}))
	})
	app.get('/updateAlertType',function(req, res){
		var params={
			"action":"changeAlertType"
		}
		process.send(params)
		process.on('message',function(data){
			res.end(JSON.stringify(data.data));
		})
		// res.end('success');
		// self.dbdevice.alertTypeyUpdate(function(){
		// 	res.end('success');
		// })
	})
	app.get('/getAlertType',function(req, res){
		self.dbdevice.alertTypeyGet(function(result){
			res.set({'Access-Control-Allow-Origin':'*'});
			res.end(JSON.stringify(result));
		})
	})
	app.get('/test',function(req, res){
		fs.readFile('./html/test.html','utf-8',function(err,data){
            if(err){
                res.end(JSON.stringify(err));
            }
            // var html=data.replace('%token%',req.query.token);
            res.end(data);
        });
	})

	require('events').EventEmitter.defaultMaxListeners = 0;
	httpServer.listen(config.HTTP_PORT, function(){
	  console.log('[HTTP:'+process.pid+'] HTTP started');
	});
	this.initDB();
}
module.exports=http;