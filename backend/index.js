const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = process.env.PORT || 5000;

let rooms = {};

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'production') app.use(express.static(path.join(__dirname, 'dist')));

app.get('/users', (req, res) => {
	res.send({ rooms });
});

io.on('connection', socket => {
	console.log('socket established');
	socket.on('join-room', userData => {
		const { roomId, userId, name, streaming } = userData;

		if (!rooms[roomId]) rooms[roomId] = [{ name, userId, streaming }];
		else rooms[roomId].push({ name, userId, streaming });

		socket.join(roomId);
		socket.to(roomId).broadcast.emit('new-user-connect', userData);

		socket.on('peer-listeners-set', (userData) => {
			socket.to(roomId).broadcast.emit('connect-to-new-peer', userData);
		})

		socket.on('disconnect', () => {
			socket.to(roomId).broadcast.emit('user-disconnected', userId);
			const removeIndex = rooms[roomId].map(user => user.name).indexOf(name);
			rooms[roomId].splice(removeIndex, 1);
		});

		socket.on('broadcast-message', message => {
			socket.to(roomId).broadcast.emit('new-broadcast-messsage', message);
		});

		socket.on('display-media', value => {
			rooms[roomId].find(user => user.userId === userId).streaming = value
			socket.to(roomId).broadcast.emit('display-media', { userId, value });
		});

		socket.on('user-video-on', data => {
			rooms[roomId].find(user => user.userId === data.id).streaming = true
			socket.to(roomId).broadcast.emit('user-video-on', data);
		});

		socket.on('user-video-off', value => {
			rooms[roomId].find(user => user.userId === value.id).streaming = false
			socket.to(roomId).broadcast.emit('user-video-off', value);
		});
	});

	socket.on('request-to-connect', ({id, name, room}) => {
		socket.join(id)
		socket.to(room).broadcast.emit('request-to-connect', {id, name});
	})

	socket.on('user-confirmed', ({id, room}) => {
		socket.to(id).broadcast.emit('confirmed');
		socket.to(room).broadcast.emit('remove-popup', id);
	})

	socket.on('user-denied', ({id, room}) => {
		socket.to(id).broadcast.emit('denied');
		socket.to(room).broadcast.emit('remove-popup', id);
	})

	socket.on('cancel-join-request', ({id, room}) => {
		socket.to(room).broadcast.emit('cancel-join-request', id);
	})
});

// Server listen initilized
server
	.listen(port, () => {
		console.log(`Listening on the port ${port}`);
	})
	.on('error', e => {
		console.error(e);
	});
