const express = require('express')
const app = express()
const server = require('http').createServer(app)
var ExpressPeerServer = require('peer').ExpressPeerServer;
var options = {
    debug: false
}
const io = require('socket.io')(server)
const { v4:uuidV4 } = require('uuid')
const port = process.env.PORT || 3000;
console.log('listening on port',port)
app.set('view engine','ejs')
app.use(express.static('.'))
app.use('/peerjs', ExpressPeerServer(server, options));
app.get('/', (req,res) =>{
    res.redirect(`/${uuidV4()}`)
})

app.get('/:room', (req,res) => {
    res.render('room', {roomId: req.params.room})
})

io.on('connection', socket => {
    socket.on('join-room',(roomId, userId) => {
        socket.join(roomId)
        socket.to(roomId).broadcast.emit('user-connected',userId)
        console.log(roomId,userId)
        socket.on('disconnect', () => {
            socket.to(roomId).broadcast.emit('user-disconnected', userId)
        })
    })
    socket.on('newDoodle',(roomId, data) => {
        socket.join(roomId)
        socket.to(roomId).broadcast.emit('newDoodle',data)
    })
})

server.listen(port)