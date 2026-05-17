const express = require('express');
const Product = require('../models/product');
const productRouter = express.Router();
const {auth, vendorAuth} = require('../middleware/auth');
const Vendor = require('../models/vendor');

productRouter.post('/api/add-product',auth,vendorAuth, async(req, res)=>{
  try {
    const {productName, productPrice, quantity,description, category ,vendorId, fullName, subCategory, images} = req.body;
   const product = new Product({productName, productPrice, quantity,description, category ,vendorId, fullName,  subCategory, images});
   await product.save();
   return res.status(201).send(product);
  } catch (e) {
      res.status(500).json({error:e.message});
  }
});

productRouter.get('/api/popular-products',async(req,res)=>{
  try {
    const product = await Product.find({popular:true});
    if(!product ||product.length==0){
        return res.status(404).json({msg:"products not found"});
    }else{
        return  res.status(200).json(product);
    }
  } catch (e) {
    res.status(500).json({error:e.message})
  }
});

productRouter.get('/api/recommended-products',async(req,res)=>{
    try {
      const product = await Product.find({recommend:true});
      if(!product ||product.length==0){
          return res.status(404).json({msg:"products not found"});
      }else{
          return  res.status(200).json({product});
      }
    } catch (e) {
      res.status(500).json({error:e.message})
    }
  });
//new route for retrieving products by category
productRouter.get('/api/products-by-category/:category', async(req,res)=>{
  try {
    const {category} = req.params;
    const products =  await Product.find({category,popular:true});
    if(!products|| products.length==0){
      return res.status(404).json({msg:"Product not found"});
    }else{
      return res.status(200).json(products);
    }
  } catch (e) {
    res.status(500).json({error:e.message});
  }
});

//new route for retrieving related products by subcategory
productRouter.get('/api/related-products-by-subcategory/:productId',async(req,res)=>{
  try {
    const {productId} = req.params;
    //first ,find the prduct to get its subcategory
  const product =  await Product.findById(productId);
  if(!product){
    return res.status(404).json({msg:"Product not found"});
  }else{
    //find related products base  on the subcategory  of the retrieved product
  const relatedProducts =  await Product.find({
      subCategory: product.subCategory,
      _id:{$ne:productId}//Exclude the current product
    });

   if(!relatedProducts || relatedProducts.length ==0){
    return res.status(404).json({msg:"No related products found"});
   } 
    
   return res.status(200).json(relatedProducts);

  }
  } catch (e) {
    return res.status(500).json({error:e.message});
  }
});


//route for retrieving the top 10 highest-rated products
productRouter.get('/api/top-rated-products',async(req,res)=>{
  try {
    //fetch all products and sort them by avaragerating in decending order(higest rating)
    //sort product by averageRating, with -1 indicating decending
  const topRatedProducts =  await Product.find({}).sort({averageRating: -1}).limit(10);//limit the result to the top highest rated product

  //check if there are any top-rated products  returned
  if(!topRatedProducts||topRatedProducts.length==0){
    return res.status(404).json({msg:"No top-rated products  found"});
  }

  //return the top-rated product as a response 
  return res.status(200).json(topRatedProducts);
  } catch (e) {
    //handle any server errors that occure during the request
    return res.status(500).json({error:e.message});
  }
});


productRouter.get('/api/products-by-subcategory/:subCategory',async (req,res)=>{
  try {
    const {subCategory} = req.params;
   const products =   await Product.find({subCategory:subCategory});
   if(!products || products.length==0){
    return res.status(404).json({msg:"No Products found in this subcategry"});
   }
   return res.status(200).json(products);
  } catch (e) {
    res.status(500).json({error:e.message});
  }
});

//Route for searching products by name or description

productRouter.get('/api/search-products',async(req,res)=>{
  try {
    //Extract the 'query' parameter from the request query string
    const {query} = req.query;
    //Validate that a query parameter is provided;
    //if missing , return a 400 status with an error message 

    if(!query){
      return res.status(400).json({msg:"Query parameter required"});
    }

//search for the Product collection for documents where either 'productName' or "description"
//contains the specified query  String ;

 const products = await Product.find({
   $or:[
    //Regex will match any productName containing   the query String, 
    //For example , if the user  search for "apple ", the regex will check
    //if "apple " is part  of any productName , so product  name "Green Apple pie",
    //or "Fresh Apples" , would all match  because they contain  the world "apple"
    {productName: {$regex:query, $options:'i'}},
    {description: {$regex:query, $options:'i'}},
   ]
  });
   //check if any products were found, if no product match the query 
   //return a 404 status code with a message 
   if(!products|| products.length==0){
    return res.status(404).json({msg:"No  products found matching the query"});
   }

   //if product are found , return 200
   return res.status(200).json(products);
  } catch (e) {
    return res.status(500).json({error:e.message})
  }
});

//Route to edit an existing product
productRouter.put('/api/edit-product/:productId',auth,vendorAuth, async (req, res) => {
  try {
    ///Extract product ID from the request parameter
    const {productId} = req.params;

    //Check if the product exists and if the vendor  is authrorized to edit it 
   const product = await Product.findById(productId);
   if(!product){
    return res.status(404).json({msg:"Product not found "});
   }
   if(product.vendorId.toString()!== req.user.id){
    return res.status(403).json({msg:"Unauthorized to edit this  product"});
   }
   
  //Destructure req.body to exclude  vendorid
  
  const {vendorId, ...updateData} = req.body;
  //update the product with  the fields provided in updateData

 const updatedProduct = await  Product.findByIdAndUpdate(
    productId,
    {$set:updateData},//update only fields in the updateData 
    {new:true}//return the updated  product document  in the response
);

//return the updated product with 200 ok status
return res.status(200).json(updatedProduct);

  } catch (e) {
    return res.status(500).json({error:e.message});
  }
});

//fetch products by vendorId

productRouter.get('/api/products/vendor/:vendorId', async(req,res)=>{
  try {
    const {vendorId} = req.params;

    //Valide the vendor exists
    const vendorExists  = await Vendor.findById(vendorId);
    if(!vendorExists){
      return res.status(404).json({msg:"Vendor not found"});
    }

    //fetch products associated with the vendor Id
    const products = await Product.find({vendorId});

    return res.status(200).json(products);
  } catch (e) {
      return res.status(500).json({error:e.message});
  }
});

module.exports = productRouter;