var redisClient=function(client){
	// const redis = require('redis');
	// const config=require('.././config/config.js');

	// var self=this;

	this.setItem=function(key, value, exprires=30*24*60*60){
		client.set(key, value);
	    //设置过期 单位：秒
	    if (exprires) {
	        client.expire(key, exprires);
	    }
	}

	this.getItem=function(key){
		return new Promise((resolve, reject) => {
	        client.get(key, (err, val) => {
	            if(err) {
	                reject(err)
	            }
	            resolve(val);
	        })
	    })
	}

	this.delItem=function(key){
		return client.del(key);
	}

}
module.exports=redisClient;