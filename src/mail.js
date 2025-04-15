import nodemailer from 'nodemailer';

// Create a transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'Kalaqe.mast@gmail.com', // Your Gmail address
        pass: 'hrty gqoh xzei vqmr ',   // Your app password
    },
});

// Email options
const mailOptions = {
    from: 'Kalaqe.mast@gmail.com', // Sender's email
    to: 'a.r.s.a.ey@gmail.com', // Recipient's email
    subject: 'Test Email from Node.js', // Subject line
    text: 'Hello, this is a test email sent from Node.js using Nodemailer!', // Email body
};

// Send the email
transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.log('Error:', error);
    } else {
        console.log('Email sent:', info.response);
    }
});
