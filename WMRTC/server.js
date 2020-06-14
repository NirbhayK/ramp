const express = require('express');
const app = express();
const server = require('http').createServer(app);
const path = require("path");
const WMRTC = require('./public/dist/js/WMRTC.js').listen(server);
const port = process.env.PORT || 3000;
const hostname = "0.0.0.0";  
self =this;
self.rooms =new Map();

app.use(express.static(path.join(__dirname, 'public')), null);


server.listen(port, hostname, function() {
    console.log(`Server running at http://${hostname}:${port}/`);
});


app.get('/', function(req, res) {
    res.sendfile(__dirname + '/index.html');
});

app.get('/getrooms', function(req, res){ 
    res.send(  [ ...self.rooms.keys() ]);
});

WMRTC.rtc.on('new_connect', function(socket) {
    console.log('New Conn Created');
});

WMRTC.rtc.on('remove_peer', function(socketId) {
    console.log(socketId + " Removed peer");
});

WMRTC.rtc.on('new_peer', function(socket, room) {
    if(self.rooms.has(room)){
        self.rooms.delete(room);
    } else {
        self.rooms.set(room, 'room-'+ room);
    }
    
    console.log("New Peer" + socket.id + "room id : " + room);
});

WMRTC.rtc.on('socket_message', function(socket, msg) {
    console.log("Socket Message " + socket.id + "Message：" + msg);
});

WMRTC.rtc.on('ice_candidate', function(socket, ice_candidate) {
    console.log("ice_candidate" + socket.id + "ICE Candidate");
});

WMRTC.rtc.on('offer', function(socket, offer) {
    console.log("offer" + socket.id + "Offer");
});

WMRTC.rtc.on('answer', function(socket, answer) {
    console.log("answer" + socket.id + "answer");
});

WMRTC.rtc.on('error', function(error) {
    console.log("error" + error.message);
});