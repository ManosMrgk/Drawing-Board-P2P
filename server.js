const express = require('express');
const path = require('path');
const http = require('http');
const { ExpressPeerServer } = require('peer');
const { v4: uuidV4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = require('socket.io')(server);

const port = process.env.PORT || 3000;
console.log('listening on port', port);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use('/views', express.static(path.join(__dirname, 'views')));

app.get('/:room/views/*', (req, res) => {
  const assetPath = req.params[0] || '';
  res.sendFile(path.join(__dirname, 'views', assetPath), err => {
    if (err) res.status(err.status || 404).end();
  });
});

app.use('/peerjs', ExpressPeerServer(server, { debug: false }));

app.get('/', (_req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get('/:room', (req,res) => {
  res.render('room', {roomId: req.params.room})
})

io.on('connection', socket => {
  socket.on('join-room',(roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).emit('user-connected',userId)
    console.log(roomId,userId)
    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId)
    })
  })
  socket.on('newDoodle',(roomId, data) => {
    socket.join(roomId)
    socket.to(roomId).emit('newDoodle',data)
  })
})

server.listen(port)