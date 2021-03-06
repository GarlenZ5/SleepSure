const crypto = require('crypto');
var config=require('./config.js');
var func={
	connectMySql:function(){
        const mysql=require('mysql');
        var pool=mysql.createPool(config.MYSQL)
        console.log('mysql connect');
        return pool;
    },
    connectRedis:function(){
        const redis = require('redis');
        const client = redis.createClient(config.REDIS_PORT, config.REDIS_HOST, {auth_pass:config.REDIS_PWD});
        client.on('connect',function(){
            console.log('redis connect success!');
        });
        client.on('error', function (err) {
            console.log('redis error:', err);
        });
        return client;
    },
    successReturn:function(data){
        var returns={
            'code':0,
            'msg':'success'
        }
        if(data) returns['data']=data;
        return returns;
    },
    getTimeStamps:function(){
        var time=new Date();
        var year = time.getFullYear();
        var month=time.getMonth()+1;
        var day=time.getDate();
        var hour=time.getHours();
        var min=time.getMinutes();
        var sec=time.getSeconds();

        return year+"-"+month+"-"+day+" "+hour+":"+min+":"+sec;
    },
    getUserHash:function(email, password, algo='sha1'){
        
        const secret = '!@####@!abcdefg9-+';
        return crypto.createHmac(algo, secret).update(email + password).digest('hex');
    },
    createUserToken:function(email, expiry=new Date(), algo='sha1'){
        const secret='abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        return crypto.createHmac(algo, secret).update(email+expiry).digest('hex')
    },
    createUserLoginToken:function(email, password='a123456',time, algo='sha1'){
        const secret='abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()'
        return crypto.createHmac(algo, secret).update(email+password+time).digest('hex')
    },
    sendEmail:function(data, emailInfo=false){
        var nodemailer=require('nodemailer');
        var transporter=nodemailer.createTransport({
            host: config.MAIL_HOST,
            port: config.MAIL_PORT,
            secure: config.MAIL_SECURE,
            auth:{
                user: config.MAIL_USER,
                pass: config.MAIL_PASSWORD
            }
        });
        var mailOption={}
        if(emailInfo){
            mailOption=emailInfo;
        }else{
            mailOption={
                from: 'SleepSure Team'+'<'+config.MAIL_USER+'>',
                to: data.account,
                subject: 'Verify your email for HALO SleepSure',
                text: 'Hello,\r\n\r\nFollow this link to verify your email address.\r\n\r\n'+data.verification_URL+"\r\n\r\nIf you didn't ask to verify this address, you can ignore this email.\r\n\r\nThanks,\r\n\r\nYour HALO SleepSure team"
            }
        }

        transporter.sendMail(mailOption,function(err,info){
        	if(err){
        		console.log("Send Email Fail!",err)
        	}
            
            console.log(info)
        });
    },
    getFormData:function(){
        const formidable = require("formidable");
        const path = require("path");
        var form=new formidable.IncomingForm();
        var serverPath=config.BABY_ICON;
        form.encoding = 'utf-8';
        form.uploadDir = path.join(serverPath);
        form.keepExtensions = true;
        form.maxFieldsSize = 2 * 1024 * 1024;
        return form;
    },

    handlePostFiles:function(uploadDir, name, fileObj){
    	const path = require("path");
    	const fs=require('fs');
    	var iconExtname=path.extname(fileObj.path);
    	var newIconName=name+iconExtname;
    	var newIconPath=uploadDir+'/'+newIconName;
    	fs.renameSync(fileObj.path, newIconPath);

    	return newIconName;
    },

    getNewSoftVer:function(filePath=config.BIN_FILE){
        var crc=require('node-crc')
        var path = require("path");
        var fs = require("fs");
        var pathName=filePath;
        var files=fs.readdirSync(pathName);
        var ver=0;
        var downFile='';
        
        for (var i=0; i<files.length; i++){
            var fileName=path.basename(pathName+'/'+files[i],path.extname(pathName+'/'+files[i]));
            if(Number(fileName.substr(-2))>ver){
                ver=Number(fileName.substr(-2));
                downFile=files[i];
            }else{
                continue;
            }
        }
        var data = fs.readFileSync(pathName+'/'+downFile);
        var checksum=crc.crc32(new Buffer(data)).toString('hex');
        var file_ver={
            'ver':ver,
            'file':downFile,
            'checksum':checksum
        }
        return file_ver;
    },
    analyCurrentData:function(buff){
        var data=buff.toString('hex')
        var returnData={
            "wear_status":parseInt(data.slice(12,14),16),
            "heart_max":parseInt(data.slice(14,16),16),
            "heart_avg":parseInt(data.slice(16,18),16)==0?95:parseInt(data.slice(16,18),16),
            "heart_min":parseInt(data.slice(18,20),16),
            "skin_status":parseInt(data.slice(20,22),16),
            "skin_temperature":parseInt(data.slice(24,26)+data.slice(22,24),16),
            "sleep_position":parseInt(data.slice(26,28),16),
            "activity_level":parseInt(data.slice(28,30),16),
            "battery_status":parseInt(data.slice(30,32),16),
            "battery_percent":parseInt(data.slice(32,34),16),
            "charging_status":parseInt(data.slice(34,36),16),
            "create_time":new Date().getTime()

        }
        // console.log("position",data.slice(26,28))
        // console.log("returnData",returnData)

        return returnData;
    },
    isValuesTrigger:function(val, typeList, additional=false){
        var alertTypeKey=0;
        var isTrigger=false;
        var isNotify=false
        for(var i=0; i<typeList.length; i++){
            var alertThreshold=typeList[i].alertThreshold;
            var condition=alertThreshold.split(",");
            var judgeArr=new Array();
            for(var j=0; j<condition.length; j++){
                if(condition[j].indexOf("additional")){
                    if(!additional) console.log("isValuesTrigger[BUG]");
                    judgeArr.push(condition[j].replace('additional',additional)) 
                }else{
                    judgeArr.push(val+condition[j])
                }
            }
            var judgeStr=judgeArr.join(" && ");
            if(eval(judgeStr)){
                alertTypeKey=typeList[i].alertTypeKey;
                isTrigger=true;
                isNotify=typeList[i].notificationSupported;
                break;
            }
        }

        return {
            "alertTypeKey":alertTypeKey,
            "isTrigger":isTrigger,
            "isNotify":isNotify
        }
    },
    getAvg:function(dataList, type, targetTime){
        var count=0;
        var len=0;
        for(var i=0; i<dataList.length; i++){
            // console.log("create_time",dataList[i].create_time)
            // console.log("targetTime",targetTime)
            if(dataList[i].create_time >= targetTime){
                count += dataList[i][type];
                len += 1;
                // console.log(type, count)
            }
        }

        // console.log(type, count)
        return count/len;

    },

    checkDataTrigger:function(alertTypeList, babyMsgData){
        var temporaryData=babyMsgData.temporaryData;
        var data=temporaryData[temporaryData.length-1];

        var pushSet=babyMsgData.setting;
        var lasetDataTime=data.create_time;
        var prevThreeMin=lasetDataTime-3*60*1000;
        // var prevOneMin=lasetDataTime-60*1000;
        var prevOneMin=lasetDataTime-60*1000;
        var tMin=lasetDataTime-30*1000;
        var tragetList=new Array();

        var currentTemp=(data.skin_temperature*1.8)+32;
        var avgTemp=this.getAvg(temporaryData, 'skin_temperature', prevOneMin)
        avgTemp=(avgTemp*1.8)+32
        avgTemp=Number(avgTemp.toFixed(1))
        data['skin_temperature']=Math.round(avgTemp);
        data['heart_status']=0;
        data['sleep_position_status']=0;
        data['activity_level_status']=0;
        data['skin_status']=0;
        data['battery_status']=0;
        var temp_avg=96;
        if(babyMsgData['temp_wear_time'] && lasetDataTime-babyMsgData['temp_wear_time']>=15*60*1000){
            // console.log("here");
            temp_avg=Math.round(avgTemp)
        }

        var three_sec_activity_avg=0;
        var one_sec_activity_avg=0;
        var activityInterTime=(lasetDataTime-babyMsgData.firstDataTime)/1000;
        if(activityInterTime>=60){
            one_sec_activity_avg=this.getAvg(temporaryData, 'activity_level', prevOneMin);
            if(activityInterTime>=3*60){
                three_sec_activity_avg=this.getAvg(temporaryData, 'activity_level', prevThreeMin);
            }
        }

        for(var i=0; i<alertTypeList.length; i++){
            try{
                var isTrigger=false;
                var set=false;
                var getStatus=this.getBabyStatus(alertTypeList[i].alertName);
                if(alertTypeList[i].alertTypeKey == 8){
                    one_sec_activity_avg=one_sec_activity_avg*(Number(pushSet[getStatus['set']].level)/100)
                }
                if(alertTypeList[i].alertTypeKey == 9){
                    three_sec_activity_avg=three_sec_activity_avg*(Number(pushSet[getStatus['set']].level)/100)
                }
                if(eval(alertTypeList[i].alertThreshold)){
                    // console.log(alertTypeList[i].alertThreshold);
                    isTrigger=true;
                    if(alertTypeList[i].alertTypeKey == 3 && !pushSet[getStatus['set']].check){
                        data[getStatus.key]=2;
                    }else{
                        data[getStatus.key]=getStatus.val;
                    }
                    // console.log(pushSet[getStatus['set']].check)
                    // console.log(data.sleep_position)
                    // console.log(data.sleep_position_status)
                    set=pushSet[getStatus['set']]
                }

                var valObj=new Object();
                if(getStatus['set']=="heartRate"){
                    valObj={"heart":data.heart_avg}
                }else if(getStatus['set']=="sleepPosition"){
                    valObj={"position":data.sleep_position}
                }else if(getStatus['set']=="skinTemperature"){
                    valObj={"temp":Number(currentTemp.toFixed(1))}
                }else if(getStatus['set']=="sleepActivity"){
                    valObj={"activity_level":data.activity_level}
                }else if(getStatus['set']=="lowBattery"){
                    valObj={"battery":data.battery_percent}
                }
                var pushObj={
                    "alertTypeKey":alertTypeList[i].alertTypeKey,
                    "isTrigger":isTrigger,
                    "isNotify":alertTypeList[i].notificationSupported,
                    "agingParam":alertTypeList[i].agingParam,
                    "pushSet":set,
                    "valObj":valObj,
                    "babyName":babyMsgData.name,
                    "additionalInfo":alertTypeList[i].additionalInfo,
                    "notifyTemp":alertTypeList[i].notificationTemplate,
                    "alertMsg":alertTypeList[i].alertMessage,
                }
                if(alertTypeList[i].notificationSupported==1){
                    tragetList.push(pushObj);
                }
                // tragetList.push(pushObj);
            }catch(e){
                continue;
            }
        }
        // console.log("current", data);
        return {
            "tragetList":tragetList,
            "currentData":data
        }
    },

    checkIsNotify:function(triggerData, alertData, userKey, babyKey){
        var notifyArr=new Array();
        var sqlStr="";
        var nowTime=this.getTimeStamps();
        // console.log(nowTime);
        for(var i=0; i<triggerData.length; i++){
            var alertTypeKey=triggerData[i].alertTypeKey;
            var isExist=alertData.hasOwnProperty(alertTypeKey)?true:false;
            var oldThreshold=isExist?alertData[alertTypeKey].thresholdCrossCount:0;
            var newThreshold=triggerData[i].isTrigger?oldThreshold+1:oldThreshold-1;

            if(isExist){
                var string=""
                if(newThreshold >= triggerData[i].agingParam){
                    string="thresholdCrossCount="+triggerData[i].agingParam+",alertRaisedTime='"+nowTime+"',`status`=1";
                }else if(newThreshold>0 && newThreshold<triggerData[i].agingParam){
                    string="thresholdCrossCount="+newThreshold+",alertRaisedTime='"+nowTime+"',`status`=1";
                }else{
                    string="thresholdCrossCount=0,alertClearedTime='"+nowTime+"',`status`=0";
                }
                sqlStr+="UPDATE SS_BABY_ALERT SET "+string+" WHERE alertKey="+alertData[alertTypeKey].alertKey+";"
            }else{
                if(newThreshold>0){
                    sqlStr+="INSERT INTO SS_BABY_ALERT (userKey,babyKey,alertTypeKey,thresholdCrossCount,"+
                            "`status`,createdTime) VALUES("+userKey+","+babyKey+","+alertTypeKey+
                            ","+newThreshold+",1,'"+nowTime+"');";
                }
            }
            if(oldThreshold<triggerData[i].agingParam && newThreshold==triggerData[i].agingParam){
                var pushSet=triggerData[i].pushSet;
                var bell=false;
                var push=false;
                var shock=false;
                var valObj=triggerData[i].valObj;
                var babyName=triggerData[i].babyName;
                var additionalInfo=triggerData[i].additionalInfo;

                
                var valObjKeyArr=Object.keys(valObj);
                var alert=triggerData[i].alertMsg;
                // if(triggerData[i].notifyTemp){
                //     var notifyTemp=triggerData[i].notifyTemp;
                //     var repName=notifyTemp.replace("[baby name]",babyName);
                //     alert=repName.replace("[XXX]",valObj[valObjKeyArr[0]]);
                // }
                if(alertTypeKey!=1 || alertTypeKey!=2){
                    if(pushSet.status && triggerData[i].isNotify){
                        bell=pushSet.bell;
                        push=pushSet.push;
                        shock=pushSet.shock;
                    }
                }else{
                    bell=true;
                    push=true;
                    shock=true;
                }
                notifyArr.push({
                    "bell":bell,
                    "push":push,
                    "shock":shock,
                    "type":alertTypeKey,
                    "alert":pushSet.push?alert:"",
                    "additionalInfo":additionalInfo,
                    "name":babyName,
                    "val":valObj
                })
            }
        }
        return {
            "sql":sqlStr,
            "pushData":notifyArr
        }
    },

    getBabyStatus:function(alertTypeName){
        var objKey;
        var objVal;
        var set;
        switch(alertTypeName){
            case 'Heart Rate High':
                objKey="heart_status";
                objVal=1;
                set="heartRate";
                break;
            case 'Heart Rate Low':
                objKey="heart_status";
                objVal=2;
                set="heartRate";
                break;
            case 'Stomach':
                objKey="sleep_position_status";
                objVal=1;
                set="sleepPosition";
                break;
            case 'Skin Temp High':
                objKey="skin_status";
                objVal=1;
                set="skinTemperature";
                break;
            case 'Skin Temp Low':
                objKey="skin_status";
                objVal=2;
                set="skinTemperature";
                break;
            case 'Heart Rate High Caution':
                objKey="heart_status";
                objVal=3;
                set="heartRate";
                break;
            case 'Heart Rate Low Caution':
                objKey="heart_status";
                objVal=4;
                set="heartRate";
                break;
            case 'Stirring':
                objKey="activity_level_status";
                objVal=2;
                set="sleepActivity";
                break;
            case 'Active':
                objKey="activity_level_status";
                objVal=3;
                set="sleepActivity";
                break;
            case 'Heart Rate Normal':
                objKey="heart_status";
                objVal=0;
                set="heartRate";
                break;
            case 'Sensor Battery Low':
                objKey="battery_status";
                objVal=1;
                set="lowBattery";
                break;
        }
        return {
            "key":objKey,
            "val":objVal,
            "set":set
        }
    },
    getFiveMinData:function(time, data){
        var startTime=time-(300*1000)+1;
        var heart_avg_total=0;
        var wear_status=0;
        var battery_percent=0;
        var skin_temperature_total=0;
        var activity_level_total=0;
        var dataLength=0;
        var lastDataTime=new Date().getTime();
        var sleep_position={
            'front':0,
            'back':0
        }
        for(var i=0; i<data.length; i++){
            if(data[i].create_time<=time && data[i].create_time>startTime){
                dataLength += 1;
                heart_avg_total += data[i].heart_avg;
                wear_status=data[i].wear_status;
                battery_percent=data[i].battery_percent;
                skin_temperature_total += data[i].skin_temperature;
                activity_level_total += data[i].activity_level;
                lastDataTime=data[i].create_time;
                if(data[i].sleep_position == 0){
                    sleep_position.front += 1
                }else{
                    sleep_position.back += 1
                }
            }
        }
        var skin_temperature_avg=skin_temperature_total/dataLength;
        var resData={
            "heartAvg":Math.round(heart_avg_total/dataLength),
            "wearStatus":wear_status,
            "activityLevel":Math.round(activity_level_total/dataLength),
            "sleepPos":sleep_position.front>sleep_position.back?0:1,
            "batteryPercent":battery_percent,
            "skinTemperature":skin_temperature_avg.toFixed(1),
            "lastDataTime":new Date(lastDataTime)
        }
        return resData;
    },

    // getHeaderCommand:function(bs_mac, type){
    //     var headerCommand=Buffer.alloc(34,0xff);
    //     headerCommand[0]=0xdb;
    //     headerCommand[28]=0x00;
    //     headerCommand[32]=0xfa;

    //     var command1=Buffer.alloc(1);
    //     command1.writeUIntBE(type,0,1);
    //     command1.copy(headerCommand, 26, 0, 1);

    //     var macBuf=Buffer.from(bs_mac,"hex");
    //     macBuf.copy(headerCommand,6,0,6);

    //     var trackerMacBuf=Buffer.from(tracker_mac,"hex");
    //     trackerMacBuf.copy(headerCommand,18,0,6);
    //     return headerCommand;
        
    // },
    // setCommand:function(headerCommand, length, val=false){
        
    //     var fullCommand=headerCommand;
    //     if(length>0){
    //         var payload=Buffer.alloc(length,0xff);
    //         payload.writeUIntBE(val,0,length);
    //         fullCommand=Buffer.concat([headerCommand,payload]);
    //     }
    //     var sumNum=0;
    //     var commandLength=fullCommand.length;
    //     for(var i=0;i<commandLength;i++){
    //         sumNum=sumNum+fullCommand[i];
    //     }
    //     var checkSumByte=Buffer.from([sumNum]);
    //     var endByte=Buffer.from([0x3e]);
    //     return Buffer.concat([fullCommand,checkSumByte,endByte]);
    // },
    setCommand:function(bs_mac, type, val=false){
        var headerCommand=Buffer.alloc(32,0xff);
        headerCommand[0]=0xdb;
        headerCommand[28]=0x00;
        // headerCommand[32]=0xfa;

        var command1=Buffer.alloc(1);
        command1.writeUIntBE(type,0,1);
        command1.copy(headerCommand, 26, 0, 1);

        var macBuf=Buffer.from(bs_mac,"hex");
        macBuf.copy(headerCommand,6,0,6);
        
        if(val || val===0){
            var payload=Buffer.from([0xfa,0xff,0xff])
            payload.writeUIntBE(val,2,1);
            headerCommand[28]=0x01;
            headerCommand=Buffer.concat([headerCommand,payload]);
        }
        var sumNum=0;
        var commandLength=headerCommand.length;
        for(var i=0;i<commandLength;i++){
            sumNum=sumNum+headerCommand[i];
        }
        var checkSumByte=Buffer.from([sumNum]);
        var endByte=Buffer.from([0x3e]);
        return Buffer.concat([headerCommand,checkSumByte,endByte]);
    },
    getBsBinVer:function(){
        var fs = require("fs");
        var path=require('path');
        var files=fs.readdirSync(config.BIN_FILE);
        var ver=0;
        for(var i=0; i<files.length; i++){
            var extname=path.extname(files[i]);
            if(extname==".txt"){
                ver=path.basename(files[i], '.txt')
            }
        }
        return ver;
    }
}
module.exports=func;