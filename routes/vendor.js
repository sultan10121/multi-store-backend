const express = require('express');
const Vendor = require('../models/vendor');
const User = require('../models/user');
const vendorRouter = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {auth} = require('../middleware/auth');
require('dotenv').config();




vendorRouter.post('/api/v2/vendor/signup',async(req,res)=>{
    try {
        const {fullName, email, storeName, storeImage, storeDescription, password} = req.body;

    //check if the email already exists  in the regular users collection
    const existingUserEmail = await  User.findOne({email});

    if(existingUserEmail){
        return res.status(400).json({msg:"A user with the same email already exist"});
    }

    const existingEmail =  await  Vendor.findOne({email});
    if(existingEmail){
        return res.status(400).json({msg:"vendor with same  email already exist"});
    }else{
        //Generate a salt with a cost factor of 10
    const salt = await bcrypt.genSalt(10);
        // hash the password using the generated salt
    const hashedPassword = await bcrypt.hash(password,salt);
     let vendor =   new Vendor({fullName, email, storeName, storeImage, storeDescription, password:hashedPassword});
     vendor =  await vendor.save();
     res.json({vendor});
    }
    } catch (e) {
       res.status(500).json({error:e.message});
    }
});

//signin api endpoint
vendorRouter.post('/api/v2/vendor/signin',async(req, res)=>{
    try {
     const {email, password} = req.body;
    const findUser = await Vendor.findOne({email});
    if(!findUser){
     return res.status(400).json({msg:"Vendor not found with this email"});
 
    }else{
    const isMatch =  await bcrypt.compare(password, findUser.password);
    if(!isMatch){
     return res.status(400).json({msg:'Incorrect Password'});
    }else{
       const token = jwt.sign({id:findUser._id}, process.env.JWT_SECRET,{expiresIn: '30m'});
        
       //remove sensitive information - like the password
       const {password, ...vendorWithoutPassword } = findUser._doc;
 
       //send the respones
 
       res.json({token,vendorWithoutPassword});
    }
    }
    } catch (e) {
      res.status(500).json({error:e.message});
    }
 });

 vendorRouter.post('/vendor-tokenIsValid',async (req,res)=>{
    try {
     const token  = req.header("x-auth-token");
     if(!token) return res.json(false);// if no token , return false
 
     //verify the token
    const  verified =   jwt.verify(token, process.env.JWT_SECRET);
    if(!verified) return res.json(false);
    //if verification failed(expired or invalid ), jwt.verify will throw an error 
    const vendor =  await Vendor.findById(verified.id);
 
    if(!vendor) return  res.json(false);
 
    //if everything is valid,  return true
 
   return  res.json(true);
 
    } catch (e) {
     //if jwt.verify fails or  any other errors occurs , return false 
 
     return res.status(500).json({error:e.message});
    }
 })
 vendorRouter.get("/get-vendor", auth, async (req,res)=>{
    try {
        //Retrieve the Vendor data from the database  using the id from the authenticated vendor 
        const vendor = await Vendor.findById(req.user);
 
        //send the user data as json response , including all the user document fields and the token
        return res.json({...vendor._doc, token: req.token});
    } catch (e) {
     return res.status(500).json({error:e.message});
    }
 })

 vendorRouter.put('/api/vendor/:id',async (req,res)=>{
    try {
     //Extract the 'id' parameter from the request URl
     const {id} = req.params;
     const {storeImage, storeDescription} = req.body;
    
     const updatedUser = await Vendor.findByIdAndUpdate(
         id,
         {storeImage, storeDescription},
         {new:true},
     );
 
     // if no user is found , return 404 page not found status with an error message
     if(!updatedUser){
         return res.status(404).json({error:"Vendor not found"});
     }
     return res.status(200).json(updatedUser);
    } catch (error) {
     res.status(500).json({error:e.message});
    }
 });
 
 vendorRouter.get('/api/vendors',async(req,res)=>{
    try {
      const vendors =  await Vendor.find().select('-password');//Exclude password field
      return  res.status(200).json(vendors);
    } catch (e) {
        res.status(500).json({error:e.message});
    }
});


module.exports = vendorRouter;