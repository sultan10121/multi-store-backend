//import the express module
const express = require('express');
const mongoose = require("mongoose");
const authRouter = require('./routes/auth');
const bannerRouter = require('./routes/banner');
const categoryRouter = require('./routes/category');
const subcategoryRouter = require('./routes/sub_category');
const productRouter = require('./routes/product');
const productReviewRouter = require('./routes/product_review');
const vendorRouter = require('./routes/vendor');
const orderRouter = require('./routes/order');
const cors = require('cors'); 
require("dotenv").config();
//Defind the port number the server will listen on
const PORT = process.env.PORT  || 3000;

//create an instance of an express application
//because it give us the starting point

const app = express();
//mongodb connection  String

app.use(express.json());
app.use(cors());///enable cors for all routes and origin
app.use(authRouter);
app.use(bannerRouter);
app.use(categoryRouter);
app.use(subcategoryRouter);
app.use(productRouter);
app.use(productReviewRouter);
app.use(vendorRouter);
app.use(orderRouter);


mongoose.connect(process.env.DATABASE).then(()=>{
 console.log('mongodb connected');
});

// Export app for Vercel
module.exports = app;

// Only listen on local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT,"0.0.0.0", function(){
      console.log(`server is running on port ${PORT}`);
      console.log(`Local:   http://localhost:${PORT}`);
      if (process.env.HOST) {
          console.log(`Network: http://${process.env.HOST}:${PORT}`);
      }
  } );
}
