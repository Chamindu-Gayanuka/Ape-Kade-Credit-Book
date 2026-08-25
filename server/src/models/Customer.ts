import {Schema,model} from 'mongoose';
const schema=new Schema({customerCode:{type:String,required:true,unique:true,index:true},name:{type:String,required:true,trim:true,index:true},phone:{type:String,default:'',index:true},nic:{type:String,default:'',index:true},address:{type:String,default:''},notes:{type:String,default:''},status:{type:String,enum:['ACTIVE','INACTIVE'],default:'ACTIVE',index:true}},{timestamps:true});
schema.index({name:'text',phone:'text',nic:'text',customerCode:'text'});export const Customer=model('Customer',schema);
