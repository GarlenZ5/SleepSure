var mysql=function(mysqlPool){

	var self=this;
	var ErrMsg=require('.././public/ErrMsg.js');

	this.doquery=function(query, value, callback){
		mysqlPool.getConnection(function(err,con){
			if(err) {
				return callback(err);
			}else{
				con.query(query, value, function(error, results, fields) {
					con.release();
					if (error) {
						console.log("sql",error)
						return callback(error);
					}else{
						return callback(null,results);
					}
				});
			}
		})
	}

	this.findOne=function(tableName, returnFields='*', condition={}, callback){

		var query='select '+returnFields+' from '+tableName;
		var condition=self.applyConditionToQuery(condition)
		if(!condition['status']){
			return callback(condition);
		}
		query += condition['data'].query + ' limit 1';

		self.doquery(query, condition['data'].value,function(err, res){
			if(err){
				return callback(ErrMsg.DataBaseError);
			}
			callback(false, res)
		})
	}
	this.find=function(tableName, returnFields='*', condition={}, limit="", callback){
		var query='select '+returnFields+' from '+tableName;
		var condition=self.applyConditionToQuery(condition);
		if(!condition['status']){
			return callback(condition);
		}
		query += condition['data'].query+limit;

		self.doquery(query, condition['data'].value,function(err, res){
			if(err){
				return callback(ErrMsg.DataBaseError);
			}
			callback(false, res)
		})
	}
	this.save=function(tableName, field={}, callback){
		var query='insert into '+tableName;
		var insertQuery=self.applyInsertDataToQuery(field);
		if(!insertQuery['status']){
			return callback(insertQuery);
		}
		query += insertQuery['data'].query;

		self.doquery(query, insertQuery['data'].value,function(err, res){
			if(err){
				return callback(ErrMsg.DataBaseError);
			}
			callback(false, res)
		})
	}
	this.update=function(tableName, field={}, condition={}, callback){
		var query='update '+tableName+' set ';
		var updateDate=self.applyUpdateDateToQuery(field);
		var condition=self.applyConditionToQuery(condition)
		if(!updateDate['status'] || !condition['status']){
			return callback({
				'status':false,
				'error':ErrMsg.InvalidInput
			});
		}
		query += updateDate['data'].query+condition['data'].query;
		self.doquery(query, updateDate['data']['value'].concat(condition['data']['value']),function(err, res){
			if(err){
				return callback(ErrMsg.DataBaseError);
			}
			callback(false, res)
		})

	}
	this.delData=function(tableName, condition, callback){
		var query='delete from '+tableName;
		var condition=self.applyConditionToQuery(condition);
		if(!condition['status']){
			return callback(condition);
		}
		query += condition['data'].query;

		self.doquery(query, condition['data'].value,function(err, res){
			if(err){
				return callback(ErrMsg.DataBaseError);
			}
			callback(false, res)
		})
	}

	this.applyConditionToQuery=function(condition){
		var str='';
		var field=[];
		var value=[];
		for(let k in condition){
			if (!condition.hasOwnProperty(k)) continue;
			field.push(k+"=?" );
			value.push(condition[k]);
		}
		if((field.length>0 && value.length>0) && field.length==value.length){
			str=' where '+field.join(' and ');
			return {
				'status':true,
				'data':{
					'query':str,
					'value':value
				}
			}
		}else{
			return {
				'status':false,
				'error':ErrMsg.InvalidInput
			}
		}
	}
	this.applyInsertDataToQuery=function(insertData){
		var str='';
		var field=[];
		var value=[];
		var field_value=[];
		for(let k in insertData){
			field.push(k);
			value.push('?');
			field_value.push(insertData[k]);
		}
		if((field.length>0 && field_value.length>0) && field.length==field_value.length){
			str='('+field.join(',')+') values('+value.join(',')+')';
			return {
				'status':true,
				'data':{
					'query':str,
					'value':field_value
				}
			}
		}else{
			return {
				'status':false,
				'error':ErrMsg.InvalidInput
			}
		}
	}
	this.applyUpdateDateToQuery=function(updateDate){
		var str='';
		var field=[];
		var value=[];
		for(let k in updateDate){
			if(!updateDate.hasOwnProperty(k)) continue;
			field.push(k+'=?');
			value.push(updateDate[k]);
		}
		if((field.length>0 && value.length>0) && field.length==value.length){
			str=field.join(',');
			return {
				'status':true,
				'data':{
					'query':str,
					'value':value
				}
			}
		}else{
			return {
				'status':false,
				'error':ErrMsg.InvalidInput
			}
		}
	}


}
module.exports=mysql;