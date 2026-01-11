//importing reqiored modules
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require("dotenv").config();
//
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000", // Allow our future React app to connect
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;

//middlewares
app.use(cors()); //Allow cross-origin requests
app.use(express.json());// allow server to understand json data

//mongodb connection
const uri = process.env.ATLAS_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("MongoDB database connection established successfully");
});
//define alert api schema(the api contract)
const alertSchema = new mongoose.Schema({
    engine: {type: String, required: true},
    severity: {type: String, required: true},
    alertType: {type: String, required: true},
    timestamp: {type: Date, default: Date.now},
    details: {type: Object }// flexible enough to hold any details
});
const Alert = mongoose.model('Alert', alertSchema);
// define api endpoints
app.post('/api/alerts', async (req , res) => {
    console.log("recieved new alert via post request.....")
    const newAlert = new Alert(req.body);
    try {
        const savedAlert = await newAlert.save();
        console.log("Alert saved to database:", savedAlert);
        // real time work here 
        //after saving we broadcast the new alert to all connected web clients via socket.io
        io.emit('newAlert', savedAlert);
        console.log("Broadcasted new alert to connected clients.");
        res.status(201).json(savedAlert); //send a new created response

    } catch (error) {
        console.error("error saving alert:", error);
        res.status(400).json({message: "error saving alert", error});
    };
});
//websocket connection logic
io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
    });
});

//start the server 
http.listen(PORT, () => {
    console.log('server is running on the port :' + PORT);
});