const express = require('express');
const orderRouter = express.Router();
const Order = require('../models/order');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { auth, vendorAuth } = require('../middleware/auth');

// Post route for creating orders
orderRouter.post('/api/orders', auth, async (req, res) => {
  try {
    const {
      fullName,
      email,
      state,
      city,
      locality,
      productName,
      productPrice,
      quantity,
      category,
      image,
      vendorId,
      buyerId,
      paymentStatus,
      paymentIntentId,
      paymentMethod,
    } = req.body;

    const createdAt = new Date().getMilliseconds(); // Get the current date and time

    // Create new order instance with the extracted fields
    const order = new Order({
      fullName,
      email,
      state,
      city,
      locality,
      productName,
      productPrice,
      quantity,
      category,
      image,
      vendorId,
      buyerId,
      createdAt,
      paymentStatus,
      paymentIntentId,
      paymentMethod,
    });

    await order.save();
    return res.status(201).json(order);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});




orderRouter.post('/api/payment-intent',auth,async (req,res)=>{
  try {
    const {amount, currency} = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
    });

    return res.status(200).json(paymentIntent);
  } catch (e) {
    return res.status(500).json({error:e.message});
  }
});

orderRouter.get('/api/payment-intent/:id',auth,async(req,res)=>{
   try {
    const paymentIntent = await stripe.paymentIntents.retrieve(req.params.id);
    return res.status(200).json(paymentIntent);
   } catch (e) {
    return res.status(500).json({error:e.message});
   }
});

// POST route for creating a customer on Stripe
orderRouter.post('/api/stripe/customers', async (req, res) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({ msg: "Full name and email are required" });
    }

    // Create a new customer on Stripe
    const customer = await stripe.customers.create({
      name: fullName,
      email,
    });

    return res.status(201).json(customer);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});


// GET route for fetching orders by buyer ID
orderRouter.get('/api/orders/:buyerId', async (req, res) => {
  try {
    const { buyerId } = req.params;
    const orders = await Order.find({ buyerId });

    if (orders.length === 0) {
      return res.status(400).json({ msg: "No Orders found for this buyer" });
    }

    return res.status(200).json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE route for deleting a specific order by _id
orderRouter.delete("/api/orders/:id",  async (req, res) => {
  try {
    const { id } = req.params;
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    } else {
      return res.status(200).json({ msg: "Order was deleted successfully" });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET route for fetching orders by vendor ID
orderRouter.get('/api/orders/vendors/:vendorId', auth, vendorAuth, async (req, res) => {
  try {
    const { vendorId } = req.params;
    const orders = await Order.find({ vendorId });

    if (orders.length === 0) {
      return res.status(404).json({ msg: "No Orders found for this vendor" });
    }

    return res.status(200).json(orders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH route for marking order as delivered
orderRouter.patch('/api/orders/:id/delivered', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { delivered: true, processing: false },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    } else {
      return res.status(200).json(updatedOrder);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH route for marking order as processing
orderRouter.patch('/api/orders/:id/processing', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { processing: true, delivered: false },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ msg: "Order not found" });
    } else {
      return res.status(200).json(updatedOrder);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET route for fetching all orders
orderRouter.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    return res.status(200).json(orders);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});


module.exports = orderRouter;
