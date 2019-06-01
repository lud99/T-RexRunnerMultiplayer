class MultiplayerManager
{
	constructor()
	{
		this.connectionManager = new ConnectionManager(this);

		this.players = new Map;
		this.localPlayer;

		this.update();
	}

	addLocalPlayer(id)
	{
		this.localPlayer = new Runner(id, true);
		this.localPlayer.raqId = 0;

		this.players.set(id, this.localPlayer);

		startListening();
	}

	addPlayer(id)
	{
		const player = new Runner(id, false);
		player.raqId = 0;

		this.players.set(id, player);
	}

	removePlayer(id)
	{
		this.players.get(id).stop();
		this.players.get(id).tRex = null;
		this.players.delete(id);

		removeElement(id);
	}

	update()
	{
		this.players.forEach(function(player, key, map) {
		    if (player.playing && !player.updatePending) {
	        	player.updatePending = true;
	        	player.raqId++;
				player.update();
			}
		});

	    requestAnimationFrame(this.update.bind(this));
	}

	updatePlayers(msg)
	{
		const data = msg.prop;
		this.players.forEach(function(player, key, map) {
			if (msg.clientId == player.playerId) { //Update the local player corresponding to the player data recieved
				switch(data.type) {
					case "pos": {
						player.playing = true;
						if (data.status) {
							player.tRex.status = data.status;
							player.tRex.update(0, data.status)
						}

						if (data.pos.y) player.tRex.yPos = data.pos.y
						if (data.pos.x) player.tRex.xPos = data.pos.x

						break;
					};
					case "status": {
						player.tRex.status = data.status;
						player.tRex.update(0, data.status)
						player.tRex.ducking = data.isDucking;

						break;
					};
					case "obstacles": {
						const obstacle = player.horizon.newObstacle(data.newObstacle);
		                player.horizon.obstacles.push(obstacle);
						break;
					};
					case "start": {
						break;
					};
					case "game-over": {
						player.horizon.obstacles[0].xPos = data.obstacleXPos;
						
						player.canvasCtx.clearRect(0, 0, 600, 150);
						player.horizon.update(0, 0, true, 0);

						player.gameOver(); 
						player.currentSpeed = 0;
						player.distanceRan = data.score;
						player.distanceMeter.update(0, player.distanceRan)
						break;
					};
					case "restart": {
						player.restart();
						break;
					};
					case "play-intro": {
						player.playIntro();
						break;
					};
				}
			}
		}.bind(this));
	}
}