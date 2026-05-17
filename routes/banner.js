const express = require('express');
const Banner = require('../models/banner');
const Product = require('../models/product');
const { auth, vendorAuth } = require('../middleware/auth');

const bannerRouter = express.Router();

// Route to add a banner for a specific product
bannerRouter.post('/api/banner',async(req,res)=>{
  try {
      //extract banner 
    const {image } = req.body;
    const banner =  new Banner({image});
    await banner.save();
  
    return res.status(201).json(banner);
  } catch (e) {
      return res.status(500).json({error:e.message});
  }
  });
  

// Route to retrieve all banners with associated product details
bannerRouter.get("/api/banner",async(req,res)=>{
  try {
    const banners =  await Banner.find();
    return res.status(200).json(banners);
  } catch (e) {
     return res.status(500).json({error:e.message});
  }
 });
 

module.exports = bannerRouter;
