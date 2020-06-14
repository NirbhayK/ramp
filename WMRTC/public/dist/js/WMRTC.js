let WebSocketServer = require('ws').Server;
let UUID = require('node-uuid');
let events = require('events');
let util = require('util');

let errorCb = function (rtc) {
    return function (error) {
        if (error) {
            rtc.emit("error", error);
        }
    };
};

function WMRTC() {
    this.sockets = [];
    this.rooms = {};
    // Join event
    this.on('__join', function (data, socket) {

        console.log("Joined the room : " + this.sockets.length + " people");

        let ids = [],
            i, m,
            room = data.room || "__default",
            curSocket,
            curRoom;

        curRoom = this.rooms[room] = this.rooms[room] || [];

        for (i = 0, m = curRoom.length; i < m; i++) {
            curSocket = curRoom[i];
            if (curSocket.id === socket.id) {
                continue;
            }
            ids.push(curSocket.id);
            curSocket.send(JSON.stringify({
                "eventName": "_new_peer",
                "data": {
                    "socketId": socket.id
                }
            }), errorCb);
        }

        curRoom.push(socket);
        socket.room = room;

        socket.send(JSON.stringify({
            "eventName": "_peers",
            "data": {
                "connections": ids,
                "you": socket.id
            }
        }), errorCb);

        this.emit('new_peer', socket, room);
    });

    this.on('__ice_candidate', function (data, socket) {
        var soc = this.getSocket(data.socketId);

        if (soc) {
            soc.send(JSON.stringify({
                "eventName": "_ice_candidate",
                "data": {
                    "id": data.id,
                    "label": data.label,
                    "sdpMLineIndex" :data.label,
                    "candidate": data.candidate,
                    "socketId": socket.id
                }
            }), errorCb);

            this.emit('ice_candidate', socket, data);
        }
    });

    this.on('__offer', function (data, socket) {
        var soc = this.getSocket(data.socketId);

        if (soc) {
            soc.send(JSON.stringify({
                "eventName": "_offer",
                "data": {
                    "sdp": data.sdp,
                    "socketId": socket.id
                }
            }), errorCb);
        }
        this.emit('offer', socket, data);
    });

    this.on('__answer', function (data, socket) {
        var soc = this.getSocket(data.socketId);
        if (soc) {
            soc.send(JSON.stringify({
                "eventName": "_answer",
                "data": {
                    "sdp": data.sdp,
                    "socketId": socket.id
                }
            }), errorCb);
            this.emit('answer', socket, data);
        }
    });

    this.on('__heartbeat', function (data, socket) {
        var soc = this.getSocket(data.socketId);
        var HB_MSG = data.msg || "~H#C~"; //client heartbeat recd message
        console.log("Heartbeat Received From : " + data.socketId);
        if (soc) {
            soc.send(JSON.stringify({
                "eventName": "_heartbeat_ack",
                "data": {
                    "msg": "~H#S~", //heartbeat out message
                    "socketId": socket.id
                }
            }), errorCb);
            this.emit('heartbeat_ack', socket, data);
        }
    });

    // Initiate invitation
    this.on('__invite', function (data) {

    });
    // On ACK
    this.on('__ack', function (data) {

    });
}

util.inherits(WMRTC, events.EventEmitter);

WMRTC.prototype.addSocket = function (socket) {
    this.sockets.push(socket);
};

WMRTC.prototype.removeSocket = function (socket) {
    var i = this.sockets.indexOf(socket),
        room = socket.room;
    this.sockets.splice(i, 1);
    if (room) {
        i = this.rooms[room].indexOf(socket);
        this.rooms[room].splice(i, 1);
        if (this.rooms[room].length === 0) {
            delete this.rooms[room];
        }
    }
};

WMRTC.prototype.broadcast = function (data, errorCb) {
    var i;
    for (i = this.sockets.length; i--;) {
        this.sockets[i].send(data, errorCb);
    }
};


WMRTC.prototype.broadcastInRoom = function (room, data, errorCb) {
    var curRoom = this.rooms[room], i;
    if (curRoom) {
        for (i = curRoom.length; i--;) {
            curRoom[i].send(data, errorCb);
        }
    }
};

WMRTC.prototype.getRooms = function () {
    let rooms = [],
        room;
    for (room in this.rooms) rooms.push(room);
    return rooms;
};

WMRTC.prototype.getSocket = function (socketId) {
    let i, curSocket;
    if (!this.sockets) {
        return;
    }
    for (i = this.sockets.length; i--;) {
        curSocket = this.sockets[i];
        if (socketId === curSocket.id) {
            return curSocket;
        }
    }

};

WMRTC.prototype.init = function (socket) {
    let that = this;
    socket.id = UUID.v4();
    that.addSocket(socket);
    //Bind event handlers for new sockets
    socket.on('message', function (data) {
        console.log(data);
        let json = JSON.parse(data);
        if (json.eventName) {
            that.emit(json.eventName, json.data, socket);
        } else {
            that.emit("socket_message", socket, data);
        }
    });
    //After the connection is closed, remove the connection from the WMRTC instance and notify other connected sockets
    socket.on('close', function () {
        let i, m,
            room = socket.room,
            curRoom;
        if (room) {
            curRoom = that.rooms[room];
            for (i = curRoom.length; i--;) {
                if (curRoom[i].id === socket.id) {
                    continue;
                }
                curRoom[i].send(JSON.stringify({
                    "eventName": "_remove_peer",
                    "data": {
                        "socketId": socket.id
                    }
                }), errorCb);
            }
        }

        that.removeSocket(socket);
        that.emit('remove_peer', socket.id, that);
    });
    that.emit('new_connect', socket);
};

module.exports.listen = function (server) {
    let WMRTCServer;
    if (typeof server === 'number') {
        WMRTCServer = new WebSocketServer({
            port: server
        });
    } else {
        WMRTCServer = new WebSocketServer({
            server: server
        });
    }

    WMRTCServer.rtc = new WMRTC();
    errorCb = errorCb(WMRTCServer.rtc);
    WMRTCServer.on('connection', function (socket) {
        this.rtc.init(socket);
    });


    return WMRTCServer;
};