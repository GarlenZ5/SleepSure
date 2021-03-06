var TCP=function(){
	const querystring = require('querystring');
	const net = require('net');
	const config=require('.././public/config.js');
	const func=require('.././public/func.js');
	const ErrMsg=require('.././public/ErrMsg.js');
	const DBDevice=require('.././db/DBDevice.js');
	const TCP_PORT=config.TCP_PORT;
	
	var redisClient=require('.././db/redisClient.js');
	var self=this;
	this.tcpConnectionArray=[];
	this.dbdevice;

	process.on('message',function(data){
		if(data.action != 'changeAlertType'){
			var type=0xff;
			var mac=data.mac;
			var val=false;
			if(data.action=="onTheGo"){
				type=0x15;
				val=data.status;
			}else if(data.action=="OTA"){
				type=0x0c;
			}
			var fullCommand=func.setCommand(mac, type, val);

			var socketArray=self.tcpConnectionArray.filter(function(socket){
						
				return mac==socket.mac;
			});
			socketArray.forEach(function(socket){
				self.sendCommand(socket, fullCommand)
			});
		}else{
			self.dbdevice.alertTypeyUpdate(function(res){
				var params={
					"action":"alertType",
					"data":res
				}
				process.send(params)
			})
		}
		
	})

	this.initDB=function(){
		var pool=func.connectMySql();
		var redisConnect=func.connectRedis();
		self.dbdevice=new DBDevice(pool, redisConnect);
		self.redis=new redisClient(redisConnect);

	}

	this.logBuffer=function(deviceToServer,buffer){
		var directionStr;
		var additionalStr='';
		if(deviceToServer){
			directionStr='device->server';
		}
		else{
			directionStr='server->device';
		}
		if(buffer.length>=32){
			console.log(buffer)
			additionalStr=additionalStr+'BS:<'+buffer.slice(6,12).toString('hex')+'> ';
			additionalStr=additionalStr+'TK:<'+buffer.slice(18,24).toString('hex')+'> ';
			additionalStr=additionalStr+'C1:<'+buffer.slice(26,27).toString('hex')+'> ';
		}
		if(buffer.length>32){
			additionalStr=additionalStr+'payload:<'+buffer.slice(32,-2).toString('hex')+'> ';
		}
		console.log(new Date(),directionStr,additionalStr);
	}

	var server = net.createServer(function(socket) {
		
		socket.on('error',function(e){
			console.log('[TCP:'+process.pid+']error:',e);
			var index=self.tcpConnectionArray.indexOf(socket);
			if(index!=-1)
				self.tcpConnectionArray.splice(index,1);
		});
		socket.on('end',function(){
			console.log('Socket end',socket.mac);
			var index=self.tcpConnectionArray.indexOf(socket);
			if(index!=-1)
				self.tcpConnectionArray.splice(index,1);
		});
		socket.on('close', function () {
			console.log('Socket end',socket.mac);
			var index=self.tcpConnectionArray.indexOf(socket);
			if(index!=-1)
				self.tcpConnectionArray.splice(index,1);
        });
        var waitTime = 12;
        socket.setTimeout(1000 * waitTime,function() {
		    console.log(socket.mac+" setTimeout.The BaseStation no communication with the server for more than 12s")
		});
		socket.on('timeout', function() {
			var data={
				"mac":socket.mac,
				"errorType":2
			}
			
			self.dbdevice.sendConnectError(data);
		})

        socket.on('data', function(buff){
        	if(!socket.mac){
        		socket.mac=buff.slice(6,12).toString('hex');
        		self.tcpConnectionArray.push(socket);
			}

        	self.logBuffer(true,buff);

        	self.dbdevice.resolveCommandByte(buff,function(err, res){})

        });

        socket.writeCommand=function(buf){
			try{
				self.logBuffer(false,buf);
				socket.write(buf);
				
			}
			catch(e){
				if(socket.destroyed){
					var index=self.tcpConnectionArray.indexOf(socket);
					if(index!=-1)
						self.tcpConnectionArray.splice(index,1);
				}
			}
		}
	});
	this.sendCommand=function(socket,command){
		socket.writeCommand(command);
		
	}
	this.initDB();

	//start TCP
	server.listen(TCP_PORT,function(){
		console.log('[TCP:'+process.pid+'] TCP started');
	})
}
module.exports=TCP;