<template>
	<div class="container d-flex flex-column h-100 justify-content-center">
		<div class="row justify-content-center">
			<div class="col-md-6">
				<input type="text" class="form-control" id="name" v-model="name" placeholder="Name" :disabled="awaitingConfirmation === true"/>
			</div>
		</div>
		<div class="row justify-content-center">
			<div class="col-md-6">
				<select class="form-control" name="rooms" id="rooms" @change="handleRoomChange" :disabled="awaitingConfirmation === true">
					<option selected value="">Select a Room</option>
					<option v-for="room in $store.getters.getRooms" :key="room" :value="room">{{
						room
					}}</option>
				</select>
			</div>
		</div>
		<div class="row justify-content-center mt-1">
			<div class="col-md-6">
				<select class="form-control" name="quality" id="quality" @change="handleQualityChange" :disabled="awaitingConfirmation === true">
					<option selected value="">Choose Call Quality</option>
					<option value="12">Normal</option>
					<option value="30">High</option>
				</select>
			</div>
		</div>
		<div v-if="awaitingConfirmation" class="row justify-content-center mt-1">
			<div class="col-md-6 d-flex justify-content-between align-items-center">
				<span class="red-text">
					Awaiting confirmation...
				</span>
				<button class="btn btn-danger" @click="cancelJoin">Cancel</button>
			</div>
		</div>
		<div v-if="denied" class="row justify-content-center mt-1">
			<div class="col-md-6">
				<span class="red-text">
					Access Denied!
				</span>
			</div>
		</div>
		<div class="row justify-content-center mt-1">
			<div class="col-md-6">
				<button :disabled="awaitingConfirmation === true" class="btn btn-success" @click="joinRoom()">Join Room</button>
			</div>
		</div>
	</div>
</template>

<script>
import { v4 as uuidv4 } from 'uuid';

export default {
	name: 'Home',
	sockets: {
		confirmed() {
			this.enterRoom()
		},
		denied() {
			this.awaitingConfirmation = null
			this.denied = true
		}
	},
	data() {
		return {
			name: '',
			id: '',
			selectedRoom: '',
			quality: '',
			awaitingConfirmation: null,
			denied: null
		};
	},
	methods: {
		async joinRoom() {
			if (this.selectedRoom && this.quality) {
				const users = await this.getUsers();
        if (users && users.rooms[this.selectedRoom] && users.rooms[this.selectedRoom].length) {
					this.$socket.emit('request-to-connect', {id: this.id, name: this.name, room: this.selectedRoom})
					this.awaitingConfirmation = true;
					this.denied = null
				} else {
					this.enterRoom()
				}
			}
		},
		handleRoomChange(e) {
			this.selectedRoom = e.target.value;
		},
		handleQualityChange(e) {
			this.quality = e.target.value;
		},
		enterRoom() {
			this.$router.push({
				path: `${this.selectedRoom}`,
				query: { quality: this.quality, name: this.name },
			});
		},
		cancelJoin() {
			this.$socket.emit('cancel-join-request', {id: this.id, room: this.selectedRoom})
			this.awaitingConfirmation = null;
			this.denied = null
		},
		async getUsers() {
			const { data } = await this.$http.get('/users');
			return data
		},
	},
	created() {
		this.id = uuidv4();
		window.addEventListener('beforeunload', () => {
      this.$socket.emit('cancel-join-request', {id: this.id, room: this.selectedRoom})
    })
	}
};
</script>

<style>
.red-text {
	color: red;
}
</style>
