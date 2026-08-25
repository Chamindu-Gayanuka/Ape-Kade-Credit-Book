import type {ClientSession} from 'mongoose';import {AuditLog} from '../models/AuditLog.js';
export async function audit(userId:string,action:string,entityType:string,entityId:any,description:string,metadata:any={},ipAddress='',session?:ClientSession){await AuditLog.create([{userId,action,entityType,entityId,description,metadata,ipAddress}],{session})}
