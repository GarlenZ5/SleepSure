const cluster = require('cluster');
const os = require('os');
const numCPUs = require('os').cpus().length;
const fs=require('fs');
var APP=function(){
	var self=this;

	this.iotHttpClusterArray=[];
	this.iotSocketIOClusterArray=[];
	this.iotTcpClusterArray=[];
	this.iotNotifyClusterArray=[];

	this.init=function (){
		console.log("Server started!");
		self.newHttpCluster();
		self.newSocketIOCluster();
		self.newTcpCluster();
		self.newNotifyCluster();
	}

	this.newHttpCluster=function(){
		const iothttpDir=__dirname+'/server/httpWorker.js';
		cluster.setupMaster({ exec: iothttpDir });
		var proc=cluster.fork();
		self.iotHttpClusterArray.push(proc);
		proc.on('exit',function(){
			self.iotHttpClusterArray.splice(self.iotHttpClusterArray.indexOf(proc),1);
			self.newHttpCluster();
		});
		proc.on('message',function(data){
			switch(data.action){
				case 'onTheGo':
					self.sendMessageToTcp(data);
					break;
				case 'loginInvalid':
					self.sendMessageToSocketIO(data);
					break;
				case 'changeAlertType':
					self.sendMessageToTcp(data);
					self.sendMessageToSocketIO(data);
					break;
			}
		});
		return proc;
	}
	this.newSocketIOCluster=function(){
		const iotsocketioDir=__dirname+'/server/APPsocketWorker.js';
		cluster.setupMaster({ exec: iotsocketioDir });
		var proc=cluster.fork();
		self.iotSocketIOClusterArray.push(proc);
		proc.on('exit',function(){
			self.iotSocketIOClusterArray.splice(self.iotSocketIOClusterArray.indexOf(proc),1);
			self.newSocketIOCluster();
		});
		proc.on('message',function(data){
			switch(data.action){
				case 'real_data':
					self.sendMessageToSocketIO(data);
					break;
				case 'send_notify':
					self.sendMessageToNotify(data);
					break;
				case 'connectError':
					self.sendMessageToSocketIO(data);
					break;
			}
		});
		return proc;
	}
	this.newTcpCluster=function(){
		const iottcpDir=__dirname+'/server/TCPWorker.js';
		cluster.setupMaster({ exec: iottcpDir});
		var proc=cluster.fork();
		self.iotTcpClusterArray.push(proc);
		proc.on('exit',function(){
			self.iotTcpClusterArray.splice(self.iotTcpClusterArray.indexOf(proc),1);
			self.newTcpCluster();
		});
		proc.on('message',function(data){
			switch(data.action){
				case 'real_data':
					self.sendMessageToSocketIO(data);
					break;
				case 'tracker_status':
					self.sendMessageToSocketIO(data);
					break;
				case 'connectError':
					self.sendMessageToSocketIO(data);
					break;
				case 'send_notify':
					self.sendMessageToNotify(data);
					break;
				case 'OTA':
					self.sendMessageToTcp(data);
					break;
				case 'alertType':
					self.sendMessageToHttp(data);
					break;
			}
		});
		return proc;
	}
	this.newNotifyCluster=function(){
		const iotnotifyDir=__dirname+'/server/notifyWorker.js';
		cluster.setupMaster({ exec: iotnotifyDir});
		var proc=cluster.fork();
		self.iotNotifyClusterArray.push(proc);
		proc.on('exit',function(){
			self.iotNotifyClusterArray.splice(self.iotNotifyClusterArray.indexOf(proc),1);
			self.newNotifyCluster();
		});
		return proc;
	}

	this.sendMessageToSocketIO=function(data){
		self.iotSocketIOClusterArray.forEach(function(proc){
			proc.send(data);
		});
	}
	this.sendMessageToTcp=function(data){
		self.iotTcpClusterArray.forEach(function(proc){
			proc.send(data);
		});
	}
	this.sendMessageToNotify=function(data){
		self.iotNotifyClusterArray.forEach(function(proc){
			proc.send(data);
		});
	}
	this.sendMessageToHttp=function(data){
		self.iotHttpClusterArray.forEach(function(proc){
			proc.send(data);
		});
	}

}
var iotapp=new APP();
iotapp.init();