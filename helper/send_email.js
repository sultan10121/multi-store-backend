//importe the necessary aws sdk modules for ses
const {SESClient, SendEmailCommand} = require('@aws-sdk/client-ses');

///Load the enviroment variables from the .env file
require('dotenv').config();

//initialize SES client using the enviroment variables - only if credentials are available

let client = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
  client = new SESClient({
     region: process.env.AWS_REGION,
     credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
     }
  });
}

//Function to generate simple HTML content for welcome email

const generateOtpEmailHtml =(otp) =>{
    return `
    <html>
      <body>
        <h1>welcome to ${process.env.APP_NAME} </h1>
        <p>Your One-Time password (OTP) for email verification is: </p>
        <p>${otp}</p>
        <p>please enter this OTP to verify your email address. This code is valid for the next 10 minutes</p>
        <p>if you did not request this, please ignore this email  or contact our support team immediately</p>
      </body>
    </html>
    
    `
};

//function to send welcome email to the provided email address

const sendOtpEmail = async(email, otp)=>{
 //Define the parameters for the SES email message
 const params ={
    Source : process.env.EMAIL_FROM,//THE SENDER'S EMAIL ADDRESS,
    ReplyToAddress: [process.env.EMAIL_TO],// the reply-to email address

    //destination

    Destination:{
        ToAddresses:[email],//the recipient's email address
    },

    Message:{
        Body:{
            Html:{
                Charset:"UTF-8",//ENSURE THE EMAIL BODY IS  IN UTF-8 CHARACTER ENCODING
                Data: generateOtpEmailHtml(otp),//generated from  the function above
            },
        },

        Subject:{
            Charset:"UTF-8",//ENSURE THE EMAIL BODY IS  IN UTF-8 CHARACTER ENCODING
            Data:`Macstore Email Verification`,
        },    
    },
 };

 //create a new SendEmailCommand with the parameters defined above

 const command = new SendEmailCommand(params);

 try {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !client) {
        console.log(`[DEV] Email not configured — OTP for ${email}: ${otp}`);
        return null;
    }
    //send the email using SES client and await response
    const data = await client.send(command);
    console.log(data);
    return data;
 } catch (error) {
    console.log("error sending emails:", error.message);
    if (!process.env.AWS_ACCESS_KEY_ID) {
        console.log(`[DEV] OTP for ${email}: ${otp}`);
        return null;
    }
    throw error;
 }
};


module.exports = sendOtpEmail;