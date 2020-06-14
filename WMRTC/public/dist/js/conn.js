var videos = document.getElementById("videos");
// var sendBtn = document.getElementById("sendBtn");
// var msgs = document.getElementById("msgs");
// var sendFileBtn = document.getElementById("sendFileBtn");
// var files = document.getElementById("files");
var rtc = WMRTC();

/**********************************************************/
// sendBtn.onclick = function (event) {
//     var msgIpt = document.getElementById("msgIpt"),
//         msg = msgIpt.value,
//         p = document.createElement("p");
//     p.innerText = "me: " + msg;
//     rtc.broadcast(msg);
//     msgIpt.value = "";
//     msgs.appendChild(p);
// };

// sendFileBtn.onclick = function (event) {
//     rtc.shareFile("fileIpt");
// };
/**********************************************************/

rtc.on("send_file_accepted", function (sendId, socketId, file) {
    var p = document.getElementById("sf-" + sendId);
    p.innerText = "Receiving " + file.name + " File, waiting to be sent";

});
rtc.on("send_file_refused", function (sendId, socketId, file) {
    var p = document.getElementById("sf-" + sendId);
    p.innerText = "The other party refuses to receive " + file.name ;
});
rtc.on('send_file', function (sendId, socketId, file) {
    var p = document.createElement("p");
    p.innerText = "Request to send " + file.name ;
    p.id = "sf-" + sendId;
    files.appendChild(p);
});
rtc.on('sended_file', function (sendId, socketId, file) {
    var p = document.getElementById("sf-" + sendId);
    p.parentNode.removeChild(p);
});
rtc.on('send_file_chunk', function (sendId, socketId, percent, file) {
    var p = document.getElementById("sf-" + sendId);
    p.innerText = file.name + "File is being sent : " + Math.ceil(percent) + "%";
});
rtc.on('receive_file_chunk', function (sendId, socketId, fileName, percent) {
    var p = document.getElementById("rf-" + sendId);
    p.innerText = "Receiving : " + fileName + " ( " + Math.ceil(percent) + "% )";
});
rtc.on('receive_file', function (sendId, socketId, name) {
    var p = document.getElementById("rf-" + sendId);
    p.parentNode.removeChild(p);
});
rtc.on('send_file_error', function (error) {
    console.log(error);
});
rtc.on('receive_file_error', function (error) {
    console.log(error);
});
rtc.on('receive_file_ask', function (sendId, socketId, fileName, fileSize) {
    var p;
    if (window.confirm(socketId + "用户想要给你传送" + fileName + "文件，大小" + fileSize + "KB,是否接受？")) {
        rtc.sendFileAccept(sendId);
        p = document.createElement("p");
        p.innerText = "Ready to receive " + fileName ;
        p.id = "rf-" + sendId;
        //files.appendChild(p);
    } else {
        rtc.sendFileRefuse(sendId);
    }
});
rtc.on("connected", function (socket) {
    rtc.createStream({
        "video": true,
        "audio": true
    });
});
rtc.on("stream_created", function (stream) {
    document.getElementById('me').srcObject = stream;
    document.getElementById('me').play();
    document.getElementById('me').volume = 0.0;
});
rtc.on("stream_create_error", function () {
    alert("create stream failed!");
});
rtc.on('pc_add_stream', function (stream, socketId) {
    var newVideo = document.createElement("video");
    var id = "other-" + socketId;
    document.getElementById('me').setAttribute("class","mini-video");
    newVideo.setAttribute("class", "local-video");
    newVideo.setAttribute("autoplay", "autoplay");
    newVideo.setAttribute("id", id);
    videos.appendChild(newVideo);
    rtc.attachStream(stream, id);
});
rtc.on('remove_peer', function (socketId) {
    var video = document.getElementById('other-' + socketId);
    document.getElementById('me').setAttribute("class","local-video");
    if (video) {
        video.parentNode.removeChild(video);
    }
});
// rtc.on('data_channel_message', function (channel, socketId, message) {
//     var p = document.createElement("p");
//     p.innerText = socketId + ": " + message;
//     msgs.appendChild(p);
// });
rtc.connect("wss:eyes.thewarriormonk.app/wss", getParameterByName("roomid"));