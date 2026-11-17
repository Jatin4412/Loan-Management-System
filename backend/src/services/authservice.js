const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const userRepository=require('../repositories/userrepo');

exports.register=async(data)=>{
const{name,email,password,phone=null}=data;
const role='USER';
const existingUser=await userRepository.findByEmail(email);
if(existingUser)throw new Error('Email already exists');
const hashedPassword=await bcrypt.hash(password,10);
const result=await userRepository.create({name,email,password:hashedPassword,role,phone});
return{id:result.insertId};
};

exports.login=async(data)=>{
const{email,password}=data;
const user=await userRepository.findByEmail(email);
if(!user)throw new Error('Invalid credentials');
const isMatch=await bcrypt.compare(password,user.password);
if(!isMatch)throw new Error('Invalid credentials');
const token=jwt.sign({id:user.id,email:user.email,role:user.role},process.env.JWT_SECRET,{expiresIn:'1d'});
return{token,user:{id:user.id,name:user.name,email:user.email,role:user.role}};
};

exports.profile=async(id)=>{
return await userRepository.findById(id);
};