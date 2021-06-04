var APPsocket=function(callback){
	const config=require('.././public/config.js');
	const SOCKET_IO_PORT=config.SOCKET_IO_PORT;
	const ioSetting={
		'maxHttpBufferSize':config.SOCKET_IO_MAX_HTTP_SIZE
	}
	const io=require('socket.io')(SOCKET_IO_PORT,ioSetting);
	const DBUser=require('.././db/DBUser.js');
	const DBDevice=require('.././db/DBDevice.js');

	var func=require('.././public/func.js');
	var ErrMsg=require('.././public/ErrMsg.js');
	var self=this;
	this.ioConnectionArray=[];
	this.dbuser;
	this.dbdevice;

	process.on('message',function(data){
		var socketConnectArr=self.ioConnectionArray;
		var socketArray=[];
		if(data.action != 'changeAlertType'){
			for(var i=0; i<socketConnectArr.length; i++){
				if(data.action == 'real_data'){
					if(!data.userId) return false;
					if(data.userId == socketConnectArr[i].userId){
						socketArray.push(socketConnectArr[i]);
					}
				}else{
					if(!data.token) return false;
					if(data.token == socketConnectArr[i].userToken){
						socketArray.push(socketConnectArr[i]);
					}
				}
			}
			socketArray.forEach(function(socket){
				switch(data.action){
					case 'real_data':
						socket.sendTrackerData(data);
						break;
					case 'tracker_status':
						socket.sendTrackerStatus(data);
						break;
					case 'connectError':
						socket.connectErr(data);
						break;
					case 'loginInvalid':
						socket.forcedLogout(data);
						break;
				}
			});
		}else{
			self.dbdevice.alertTypeyUpdate(function(res){
				console.log(res)
			})
		}
		
	})

	this.initDB=function(){
		var pool=func.connectMySql();
		var redisConnect=func.connectRedis();
		self.dbuser=new DBUser(pool, redisConnect);
		self.dbdevice=new DBDevice(pool, redisConnect);

	}

	io.on('connection',function(socket){

		console.log('[APPsocket] user entered');
		socket.on('disconnect',function(err){
			console.log('[APPsocket] user quit',err);
			var index=self.ioConnectionArray.indexOf(socket);
			if(index!=-1)
				self.ioConnectionArray.splice(index,1);
		});
		socket.on('error', function(e){
			console.log('[Socket Error]:',err)
		})

		socket.use(function(packet,next){
			var event=packet[0];
			var data=packet[1];
			var ack=packet[2];
			if(event=='login'){
				return next();
			}
			else{
				if(!socket.userToken){
					var err='Please login again.';
					err.pid=data.pid;
					if(ack){
						ack(err);
					}
					else{
						socket.emit(event,err);
					}
				}
				else{
					return next();
				}
			}
		})

		socket.on('login',function(data,ack){
			self.dbuser.verifyToken(data.user_token, function(err, res){
				if(err){
					ack(err);
					return;
				}
				socket.userId=res[0].userKey;
				socket.userToken=data.user_token;
				self.ioConnectionArray.push(socket);
				ack(func.successReturn());

			})

			
		});

		socket.on('on_the_go_current_data', function(data, ack){
			if(!data.tracker_mac || !data.babyid){
				ack(ErrMsg.InvalidInput);
				return;
			}
			data['uid']=socket.userId;
			data['babyid']=Number(data['babyid']);
			self.dbdevice.onTheGoCurrentData(data, function(err, result){
				if(err){
					ack(err);
					return;
				}
				ack(result);
			})
			
		})

		socket.on('bind_device', function(data, ack){
			if(!data.mac || !data.babyid){
				ack(ErrMsg.InvalidInput);
				return;
			}
			console.log(new Date(),"User["+socket.userId+"](Baby["+data['babyid']+"]) Bind Device["+data.mac+"].")
			data['uid']=socket.userId;
			data['babyid']=Number(data['babyid']);
			self.dbdevice.bindDevice(data, function(res){
				console.log("Bind Result",res)
				self.dbuser.getAllInfoAboutUser(socket.userId, true, function(e,r){
            		if(e) {
            			console.log("Get Info Err",e)
            			return ack(e);
            		}
            		r['token']=socket.userToken;
            		ack(func.successReturn(r));
            	})
				// ack(res);
			})
		})

		socket.on('tracker_disconnect', function(data, ack){
			if(!data.tracker_mac){
				ack(ErrMsg.InvalidInput);
				return;
			}
			var outOfR={
				'action':'connectError',
				'errorType':1,
				'token':socket.userToken,
				'mac':' '
			}
			process.send(outOfR);
			ack(func.successReturn());
		})


		socket.sendTrackerData=function(data){
			socket.emit('tracker_data',data);
			console.log("Server Send Real Data To "+data.userId+" Success")
		}
		socket.sendTrackerStatus=function(data){

			socket.emit('tracker_status',data);
			console.log("Server Send Tracker Status To "+data.userId+" Success")
		}
		socket.connectErr=function(data){
			// console.log("connectErr", data)
			// socket.emit('connect_error',data);
			socket.emit('connect_err',data);
			console.log("Server Send Error To "+data.userId+" Success")
		}
		socket.forcedLogout=function(data){
			// console.log("connectErr", data)
			// socket.emit('connect_error',data);
			socket.emit('loginInvalid',data);
			// var index=self.ioConnectionArray.indexOf(socket);
			// if(index!=-1)
			// 	self.ioConnectionArray.splice(index,1);
			console.log('[APPsocket] user is forced logout');
		}

	})
	this.initDB();
	console.log('[APPsocket:'+process.pid+'] socket.io started');
}
module.exports=APPsocket;