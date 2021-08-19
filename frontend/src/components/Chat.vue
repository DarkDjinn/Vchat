<template>
	<div class="card mt-3 w-25 black-background chat-container">
		<div class="card-body">
			<div class="card-title">
				<h3>Chat</h3>
				<hr />
			</div>
			<div class="card-body chat-body">
				<div>
					<div class="messages" v-for="(msg, index) in messages" :key="index">
						<p :class="['msg-p-container', { 'msg-current-user': msg.user === username }]">
							<small class="font-weight-bold msg-user-name">{{ msg.user }}:</small>
							{{ msg.message }}
							<span class="msg-time">{{ msg.timestamp }}</span>
						</p>
						<hr />
					</div>
				</div>
			</div>
		</div>
		<div class="card-footer">
			<form @submit.prevent="sendMessage">
				<div class="gorm-group pb-3">
					<label for="message">Message:</label>
					<input type="text" v-model="message" class="form-control" />
				</div>
				<button type="submit" class="btn btn-success">Send</button>
			</form>
		</div>
	</div>
</template>

<script>
export default {
	name: 'Chat',
	props: {
		username: String,
		messages: Array,
	},
	data() {
		return {
			message: '',
		};
	},
	methods: {
		sendMessage(e) {
			e.preventDefault();

			const data = {
				user: this.username,
				message: this.message,
        timestamp: new Date(Date.now()).toLocaleString().split(', ')[1]
			};

			this.$socket.emit('broadcast-message', data);
			this.$emit('newMessage', data);
			this.message = '';
		},
	},
};
</script>

<style scoped>
.chat-container {
}

.chat-container .chat-body {
	max-height: 90%;
	overflow-y: auto;
}

.black-background {
	background-color: white;
	color: black;
}

.msg-p-container {
	padding: 10px;
	max-width: 80%;
	background-color: #666;
	color: white;
	border-radius: 5px;
}

.msg-p-container:not(.msg-current-user) {
	margin-left: auto;
}

.msg-user-name {
	display: block;
	margin-bottom: 10px;
	font-size: 12px;
}

.msg-time {
	display: block;
	margin-top: 10px;
	font-size: 12px;
}
</style>
