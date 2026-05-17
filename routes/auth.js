
const express = require('express');
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const authRouter = express.Router();
const Vendor = require('../models/vendor');
const {auth} = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const sendOtpEmail =require('../helper/send_email');
require('dotenv').config();

const crypto = require('crypto');


const otpStore = new Map();

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const findUserByEmail = (email) => {
    const normalizedEmail = normalizeEmail(email);
    return User.findOne({
        email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
};

authRouter.post('/api/signup',async(req,res)=>{
    try {
        const {fullName, email, password} = req.body;
        const normalizedEmail = normalizeEmail(email);

        if(!normalizedEmail || !password || !fullName){
            return res.status(400).json({msg:"fullName, email and password are required"});
        }

     const  existingVendorEmail = await  Vendor.findOne({email: normalizedEmail});

     if(existingVendorEmail){
      return res.status(400).json({msg:"account already own by a vendor"});
     }

    const existingEmail =  await findUserByEmail(normalizedEmail);

    if(existingEmail && existingEmail.isVerified){
        return res.status(400).json({msg:"user with same  email already exist"});
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);
    const otp = crypto.randomInt(100000,999999).toString();

    otpStore.set(normalizedEmail,{otp,expiresAt:Date.now()+10*60*1000});

    if(existingEmail && !existingEmail.isVerified){
        existingEmail.fullName = fullName;
        existingEmail.email = normalizedEmail;
        existingEmail.password = hashedPassword;
        await existingEmail.save();
    } else {
        const user = new User({
            fullName,
            email: normalizedEmail,
            password: hashedPassword,
            isVerified: false,
        });
        await user.save();
    }

    const emailResponse = await sendOtpEmail(normalizedEmail, otp);
    const emailConfigured = Boolean(process.env.AWS_ACCESS_KEY_ID);

    res.status(201).json({
        msg: emailConfigured
            ? "Signup successful. OTP sent to email"
            : "Signup successful. Check server console for OTP (email not configured)",
        emailResponse,
    });
    } catch (e) {
       res.status(500).json({error:e.message});
    }
});

//signin api endpoint
authRouter.post('/api/signin',async(req, res)=>{
   try {
    const {email, password} = req.body;
   const findUser = await findUserByEmail(email);
   if(!findUser){
    return res.status(400).json({msg:"User not found with this email"});

   }
   //check if user is verified

   if(!findUser.isVerified){
    return res.status(403).json({msg:"Email not verified. Please  verify your email to sign in"});
   }
   
   else{
   const isMatch =  await bcrypt.compare(password, findUser.password);
   if(!isMatch){
    return res.status(400).json({msg:'Incorrect Password'});
   }else{

    ///set the token to  expire in  1 minute
      const token = jwt.sign({id:findUser._id}, process.env.JWT_SECRET,{expiresIn: '30m'});
       
      //remove sensitive information
      const {password, ...userWithoutPassword } = findUser._doc;

      //send the respones

      res.json({token,userWithoutPassword});
   }
   }
   } catch (e) {
     res.status(500).json({error:e.message});
   }
});


//check token validity

authRouter.post('/tokenIsValid',async (req,res)=>{
   try {
    const token  = req.header("x-auth-token");
    if(!token) return res.json(false);// if no token , return false

    //verify the token
   const  verified =   jwt.verify(token, process.env.JWT_SECRET);
   if(!verified) return res.json(false);
   //if verification failed(expired or invalid ), jwt.verify will throw an error 
   const user =  await User.findById(verified.id);

   if(!user) return  res.json(false);

   //if everything is valid,  return true

  return  res.json(true);

   } catch (e) {
    //if jwt.verify fails or  any other errors occurs , return false 

    return res.status(500).json({error:e.message});
   }
})


//Define a Get Route for the authentication router

authRouter.get("/", auth, async (req,res)=>{
   try {
       //Retrieve the user data from the database  using the id from the authenticated user 
       const user = await User.findById(req.user);

       //send the user data as json response , including all the user document fields and the token
       return res.json({...user._doc, token: req.token});
   } catch (e) {
    return res.status(500).json({error:e.message});
   }
})


//Verify OTP Route

authRouter.post('/api/verify-otp',async(req,res)=>{
  try {
    const {email, otp} = req.body;
    const normalizedEmail = normalizeEmail(email);

    //check if OTP exist and if it is valid
  
   const storedOtpData = otpStore.get(normalizedEmail);
   if(!storedOtpData){
    return res.status(400).json({msg:"OTP not found or expired"});
   }

   if(storedOtpData.otp!==otp){
    return res.status(400).json({msg:"Invalid OTP"});
   }

   //check if OTP  has expired

   if(storedOtpData.expiresAt < Date.now()){
    otpStore.delete(normalizedEmail);
    return res.status(400).json({msg:"OTP has expired."});
   }

   //Mark user as verified

const user = await findUserByEmail(normalizedEmail);
    if(user){
        user.isVerified = true;
        user.email = normalizedEmail;
        await user.save();
    }

 if(!user){
    return res.status(400).json({msg:"User not found"});
 }


  otpStore.delete(normalizedEmail);

  //send welcome email

  return res.status(200).json({msg:"Email verified Successfull", user} );

  } catch (e) {
    return res.status({error:e.message});
  }
});
//Put route for updating user's state, city and locality
authRouter.put('/api/users/:id',async (req,res)=>{
   try {
    //Extract the 'id' parameter from the request URl
    const {id} = req.params;
    //Extract the "state","city" and locality fields from the request body
    const {state, city, locality} = req.body;
    //Find the user by their ID and update the state, city and locality fields
    // the {new:true} option ensures the updated document is returned
    const updatedUser = await User.findByIdAndUpdate(
        id,
        {state, city, locality},
        {new:true},
    );

    // if no user is found , return 404 page not found status with an error message
    if(!updatedUser){
        return res.status(404).json({error:"User not found"});
    }
    return res.status(200).json(updatedUser);
   } catch (error) {
    res.status(500).json({error:e.message});
   }
});

//Fetch all users(exclude password)

authRouter.get('/api/users',async(req,res)=>{
    try {
      const users =  await User.find().select('-password');//Exclude password field
      return  res.status(200).json(users);
    } catch (e) {
        res.status(500).json({error:e.message});
    }
});

//Delete user or vendor API
authRouter.delete('/api/user/delete-account/:id', auth, async(req,res)=>{
 try {
  ///Extract the ID from the request parameter 

  const {id} = req.params;
  //check if a regular user or vendor with the provided ID exist in the Database
 const user =  await User.findById(id)//MongoDb matches "id" to "_id";
 const vendor = await Vendor.findById(id);

 //we can check if regular user or vendor 

 if(!user && !vendor){
  return res.status(404).json({msg:"user or vendor not found"});
 }

 ///Delete the user or vendor based on their type

 if(user){
  await User.findByIdAndDelete(id);


 }else if(vendor){
  await Vendor.findByIdAndDelete(id);
 }

 return res.status(200).json({msg:"User deleted successfully"});

 } catch (e) {
   return res.status({error:e.message});
 }
});

module.exports =authRouter;
