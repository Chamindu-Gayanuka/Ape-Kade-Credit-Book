import {Schema,model} from 'mongoose';
const userSchema=new Schema({username:{type:String,required:true,unique:true,trim:true},passwordHash:{type:String,required:true,select:false},fullName:{type:String,required:true,trim:true},role:{type:String,enum:['ADMIN','CASHIER'],required:true},phone:{type:String,default:''},email:{type:String,default:'',lowercase:true},address:{type:String,default:''},bio:{type:String,default:''},status:{type:String,enum:['ACTIVE','INACTIVE'],default:'ACTIVE'},lastLogin:Date},{timestamps:true});
export const User=model('User',userSchema);
