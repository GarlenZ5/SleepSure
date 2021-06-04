var ErrMsg={
	InvalidInput:{
		'code':101,
		'msg':'Input field missing or invalid.'
	},
	InvalidInputDetail:function(msg='Input field missing or invalid.'){
		return {
			'code':101,
			'msg':msg
		}
	},
	UnknownError:{
		'code':102,
		'msg':'Unknown error.'
	},
	UnknownErrorDetail:function(msg='Unknown error.'){
		return {
			'code':102,
			'msg':msg
		}
	},
	UserExist:{
		'code':103,
		'msg':'There is already a user with this email address. Please log in.'
	},
	InvalidToken:{
		'code':104,
		'msg':'Invalid user token.'
	},
	DataBaseError:{
		'code':105,
		'msg':'Database Error.'
	},
	WrongFirstNameFormat:{
		'code':106,
		'msg':'First name cannot be empty.'
	},
	WrongEmailFormat:{
		'code':107,
		'msg':'Wrong email format. Please try again.'
	},
	WrongPasswordFormat:{
		'code':108,
		'msg':'Password cannot be less than six digits.'
	},
	UserIsNotExist:{
		'code':109,
		'msg':'No such user or wrong credentials.'
	},
	UserPasswordNotMatch:{
		'code':110,
		'msg':'Password not match.'
	},
	AccountNotActive:{
		'code':111,
		'msg':'Account not activated.'
	},
	AccountBlocked:{
		'code':112,
		'msg':'Account blocked.'
	},
	WrongToken:{
		'code':113,
		'msg':'Please enter token.'
	},
	WrongLoginType:{
		'code':114,
		'msg':'Please enter login type(facebook or google).'
	},
	LoginFailed:{
		'code':115,
		'msg':'Login Failed!Please try again.'
	},
	WrongBabyNameFormat:{
		'code':201,
		'msg':"Baby's name cannot be empty."
	},
	WrongBabyGender:{
		'code':202,
		'msg':"Please select baby gender."
	},
	WrongBabyBirthday:{
		'code':203,
		'msg':'Please select baby birthday.'
	},
	WrongBabyWeight:{
		'code':204,
		'msg':'Please input the correct baby birth weight.'
	},
	WrongBabyLength:{
		'code':205,
		'msg':'Please input the correct baby birth length.'
	},
	BabyIsNotExist:{
		'code':206,
		'msg':'No such baby.'
	},
	BabyCalibraBasestation:{
		'code':207,
		'msg':'This baby and this basestation is not bind relationship.Please upload the other basestation mac address,or bind again.'
	},
	WrongBabySetting:{
		'code':208,
		'msg':'Please enter the correct data format.'
	},
	BasestationNotExist:{
		'code':301,
		'msg':'Base station not exist.'
	},
	BasestationOccupied:{
		'code':302,
		'msg':'Base station occupied.'
	},
	FileNotFound:{
		'code':401,
		'msg':'HTTP 404 - The file requested not found.'
	},
}
module.exports=ErrMsg;