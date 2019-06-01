var express = require('express');
var app = express();
app.use(express.static('client'))
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
const Client = require('./server/client');
const Session = require('./server/session');

sessions = new Map;

function createId(len = 6, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') {
	let id = "";
	while (len--) {
		id += chars[Math.random() * chars.length | 0];
	}
	return id;
}

function createClient(conn, id = createId()) {
	return new Client(conn, id);
}

function createSession(id = createId()) {
	if (sessions.has(id)) {
		throw new Error(`Session ${id} already exists`);
	}

	const session = new Session(id);
	console.log("Creating", session);

	sessions.set(id, session);

	return session;
}

function getSession(id) {
	return sessions.get(id);
}

function broadcastSession(session, disconnectedClient) {
	if (!session) {
		console.log("Can't broadcast without session");
		return;
	}
	
	const clients = [...session.clients];
	clients.forEach(client => {
		client.send({
			type: 'session-broadcast',
			you: {
				id: client.id,
				username: client.username,
			},
			disconnectedClient,
			peers: {
				clients: clients.map(client => {
					return {
						id: client.id,
						username: client.username,
					}
				}),
			},
		});
	})
}

server.listen(process.env.PORT || 3000);
process.stdout.write('\033c') //Clear console
console.log("Server started");

app.get("/", function(req, res) {
	res.sendFile(__dirname + "/client/index.html");
});
app.get("/favicon.ico", function(req, res) {
	res.sendFile(__dirname + "/client/favicon.ico");
});

io.sockets.on("connection", conn => {

	const client = createClient(conn);
	console.log("Connection established with a client");

	//Disconnect
	conn.on('disconnect', () => {
		console.log("Connection closed with a client")
		const session = client.session;

		if (session) {
			session.leave(client);
			if (session.clients.size == 0) {
				sessions.delete(session.id);
			}
		}

		broadcastSession(session, {
			id: client.id,
		});
	});

	//Receive messages
	conn.on('message', msg => {
		const data = JSON.parse(msg);

		console.log("Message received", data);

		switch(data.type) {
			case "join-session": {
				const session = getSession(data.id) || createSession(data.id);
				session.join(client);

				broadcastSession(session);

				break;
			};
			case "state-update": {
				client.broadcast({
					type: "state-update",
					prop: data.prop,
				});

				break;
			};
		}
	});
});