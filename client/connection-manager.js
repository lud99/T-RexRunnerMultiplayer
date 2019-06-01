class ConnectionManager 
{
    constructor(multiplayerManager) 
    {
        this.socket;
        this.multiplayerManager = multiplayerManager;
    }

    connect()
    {
        this.socket = io.connect();

        //Receive messages
        this.socket.on('message', event => {
            this.receive(event);
        });

        this.socket.on("connect", () => {
            console.log("Connection established with server");

            this.init();
        });
    }

    createId(len = 6, chars = 'abcdefghijklmnopqrstuvwxyz0123456789') 
    {
        let id = "";
        while (len--) {
            id += chars[Math.random() * chars.length | 0];
        }
        return id;
    }

    init()
    {
        let sessionId = window.location.hash.split('#')[1];

        if (!sessionId) {
            sessionId = this.createId();
            window.location.hash = sessionId;
        }

        this.send({
            type: "join-session",
            id: sessionId,
        })
    }

    send(msg)
    {
        let data = JSON.stringify(msg);
        this.socket.send(data);
        console.log("Sending message:", msg);
    }

    receive(msg)
    {
        let data = JSON.parse(msg);
        //console.log("Received message", data)

        switch(data.type) {
            case "session-broadcast": {
                const me = data.you.id;

                if (!this.multiplayerManager.players.has(me))
                    this.multiplayerManager.addLocalPlayer(me);

                //Remove disconnected clients 
                const disconnectedClient = data.disconnectedClient;
                if (disconnectedClient != undefined) {
                    this.multiplayerManager.removePlayer(disconnectedClient.id);
                }

                for (let i = 0; i < data.peers.clients.length; i++) {
                    const peer = data.peers.clients[i].id;

                    if (!this.multiplayerManager.players.has(peer)) { //If the player has not already been added
                        this.multiplayerManager.addPlayer(peer);
                    }
                }

                break;
            };
            case "state-update": {
                this.multiplayerManager.updatePlayers(data);
            }
        }
    }
}