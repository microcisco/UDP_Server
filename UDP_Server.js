var dgram = require("dgram");
var server = dgram.createSocket("udp4");

var extend = function (o, n) {
    for (var p in n) {
        if (n.hasOwnProperty(p) && (!o.hasOwnProperty(p) ))
            o[p] = n[p];
    }
};
var playerIdIndex = 5000;
var hasOKPack = [];    //已经处理的包Id

var rooms = {
    1: {truns: [], pids: [], curTrun: {}, packIndex: {}}
};

var actions = {
    sendPid: 'sendPid',
    joinRoom: 'joinRoom',
    recPlayAction: 'recPlayAction',
    sendPlayActions: 'sendPlayActions',
    ackPck: 'ackPck'

};

var uidMapRinfo = {};

server.on("error", function (err) {
    console.log("server error:\n" + err.stack);
    server.close();
});
server.on("message", function (msg, rinfo) {
    console.log("server got: " + msg + " from " +
        rinfo.address + ":" + rinfo.port);

    var message = {};
    try {
        message = JSON.parse(msg.toString());
    } catch (e) {
    }

    //加入房间
    if (message.action === actions.joinRoom) {
        sendPid(rinfo, message.roomId);
        console.log(message);
    }
    //接受客户端
    else if (message.action === actions.recPlayAction) {
        // if(hasOKPack.indexOf(message.packIndex + '') > 0) {
        //     sendAck(rinfo, message.packIndex + '');
        //     return;
        // }
        recPlayAction(message.roomId, message.pid, message.operate);

        // hasOKPack.push(message.packIndex + '');
        sendAck(rinfo, message.packIndex + '');
    }

});
server.on("listening", function () {
    var address = server.address();
    console.log("server listening " +
        address.address + ":" + address.port);


});
server.bind(41234);

var mainLoopFunc = function () {
    for (var roomId in rooms) {
        if (rooms.hasOwnProperty(roomId)) {

            //给该频道所有人发送
            var pids = rooms[roomId].pids;
            pids.forEach(function (pid) {

                var resObj = {action: actions.sendPlayActions};
                extend(resObj, rooms[roomId].curTrun);
                var rinfo = uidMapRinfo[pid];
                var message = new Buffer(JSON.stringify(resObj));
                server.send(message, 0, message.length, rinfo.port, rinfo.address, function (err, byte) {
                });
            });
            rooms[roomId].curTrun = {};

        }
    }
};

var recPlayAction = function (roomId, pid, operate) {
    if(rooms[roomId]) {
        rooms[roomId].curTrun[pid] = operate;
    }
};

var sendAck = function (rinfo, packIndex) {
    var resObj = {
        action: actions.ackPck,
        index: packIndex
    };

    var message = new Buffer(JSON.stringify(resObj));
    server.send(message, 0, message.length, rinfo.port, rinfo.address, function (err, byte) {
    });
};

var sendPid = function (rinfo, roomId) {
    var _pid = ++playerIdIndex;
    var resObj = {
        action: actions.sendPid,
        param1: _pid,
        param2: roomId
    };

    var message = new Buffer(JSON.stringify(resObj));
    server.send(message, 0, message.length, rinfo.port, rinfo.address, function (err, byte) {
        if (!err) {
            uidMapRinfo[_pid] = rinfo;    //加入映射表

            if (!rooms[roomId]) {
                rooms[roomId] = {truns: [], pids: [], curTrun: {}, packIndex: {}};
            }
            rooms[roomId].pids.push(_pid); //加入房间

        }
    });
};

setInterval(function () {
    mainLoopFunc();
}, 20);