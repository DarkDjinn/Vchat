<template>
	<div class="d-flex h-100 w-100 black-background">
		<VideoModal
			v-if="showModal"
			:modalVideoId="modalVideoId"
			:video="modalVideo"
			@close="showModal = false"
		/>
		<div class="d-flex h-100 users-container">
			<div class="users align-self-start mr-2 h-100">
				<ul class="list-group">
					<li class="list-group-item text-break" v-for="user of this.users" :key="user.userId">
						{{ user.name }}
					</li>
				</ul>
			</div>
		</div>
		<div class="d-flex flex-column align-self-start w-100 h-100">
			<div id="room-container" class="h-100 w-100 room-container"></div>
			<BottomControls
				:removeVideo="removeVideo"
				:getVideoAudioStream="getVideoAudioStream"
				:createVideo="createVideo"
				:getMyVideo="getMyVideo"
				:reInitializeStream="reInitializeStream"
				:replaceStream="replaceStream"
				:toggleVideoTrack="toggleVideoTrack"
				:destoryConnection="destoryConnection"
				:replaceBlackDisplay="replaceBlackDisplay"
				:replaceTempImage="replaceTempImage"
				:myId="myId"
				@chatToggled="toggleChat"
				class="w-100"
			/>
		</div>
		<Chat
			v-if="chatToggled"
			:username="userDetails.name"
			:messages="messages"
			@newMessage="newMessageReceived"
		/>
	</div>
</template>

<script>
import Peer from 'peerjs';
import BottomControls from './BottomControls';
import VideoModal from './VideoModal';
import laptopUser from '../../public/assets/images/laptop-user.png';
import Chat from './Chat';

export default {
	name: 'Room',
	components: {
		BottomControls,
		VideoModal,
		Chat,
	},
	data() {
		return {
			peers: {},
			socketInstance: null,
			streaming: false,
			userDetails: null,
			isSocketConnected: false,
			isPeersConnected: false,
			myPeer: null,
			videoContainer: {},
			myId: '',
			users: [],
			currentStream: null,
			showModal: false,
			modalVideo: null,
			modalVideoId: null,
			chatToggled: false,
			messages: [],
		};
	},
	sockets: {
		async 'new-user-connect'(userData) {
			console.log('New user connected:', userData);
			await this.getUsers();
		},
		'connect-to-new-peer'(userData) {
			console.log('connecting');
			this.connectToNewUser(userData, this.currentStream);
		},
		async 'user-disconnected'(userId) {
			console.log('user disconnected, closing peers', userId);
			this.removeVideo(userId);
			this.peers[userId] && this.peers[userId].close();
			await this.getUsers();
		},
		disconnect() {
			console.log('socket disconnected');
		},
		error(err) {
			console.log('socket error', err);
		},
		async 'display-media'({ userId, value }) {
			await this.getUsers();
			this.checkStreamingUsers();
			const video = window.document.getElementById(userId);
			video &&
				video.srcObject.getVideoTracks().forEach(track => {
					if (track.kind === 'video') {
						track.enabled = value;
					}
				});
			video &&
				video.srcObject.getAudioTracks().forEach(track => {
					if (track.kind === 'audio') {
						track.enabled = value;
					}
				});
			this.replaceTempImage(video);
			const controlsDiv = [...video.parentElement.childNodes].find(el =>
				el.className.includes('video-controls')
			);
			controlsDiv.style.height = video.offsetHeight;
		},
		async 'user-video-off'(data) {
			await this.getUsers();
			this.checkStreamingUsers();
			const video = window.document.getElementById(data.id);
			video &&
				video.srcObject.getVideoTracks().forEach(track => {
					if (track.kind === 'video') {
						track.enabled = false;
					}
				});
			if (this.showModal) {
				const video = window.document.getElementsByClassName(data.id);
				if (video.length) this.showModal = false;
			}

			video && this.replaceBlackDisplay(video);
		},
		async 'user-video-on'({ id }) {
			await this.getUsers();
			this.checkStreamingUsers();
			const audioTrack = this.videoContainer[id].stream.getVideoTracks();
			audioTrack[0].enabled = true;
			this.createVideo({ id, stream: this.videoContainer[id].stream });
			const video = this.getMyVideo(id);
			this.replaceTempImage(video);
			const controlsDiv = [...video.parentElement.childNodes].find(el =>
				el.className.includes('video-controls')
			);
			controlsDiv.style.height = video.offsetHeight;
		},
		'new-broadcast-messsage'(data) {
			this.newMessageReceived(data);
		},
		'request-to-connect'(userData) {
			const confirmationPopupContainer = window.document.getElementById(
				'confirmation-popup-container'
			);
			if (confirmationPopupContainer) {
				this.createConfirmationPopup(userData, confirmationPopupContainer);
			} else {
				const roomContainer = window.document.getElementById('room-container');
				const confirmationPopupContainer = window.document.createElement('div');
				confirmationPopupContainer.className = 'd-flex justify-content-center';
				confirmationPopupContainer.id = 'confirmation-popup-container';

				this.createConfirmationPopup(userData, confirmationPopupContainer);
				roomContainer.parentElement.prepend(confirmationPopupContainer);
			}
		},
		'cancel-join-request'(id) {
			this.removePopup(id);
		},
		'remove-popup'(id) {
			this.removePopup(id);
		},
	},
	methods: {
		removePopup(id) {
			const popup = window.document.getElementById(`confirmation-popup.${id}`);
			if (popup) popup.remove();
			const popupContainer = window.document.getElementById('confirmation-popup-container');
			if (popupContainer && !popupContainer.childNodes.length) popupContainer.remove();
		},
		createConfirmationPopup(userData, confirmationPopupContainer) {
			const confirmationPopup = window.document.createElement('div');
			const confirmButton = window.document.createElement('button');
			const denyButton = window.document.createElement('button');

			confirmButton.innerHTML = 'Confirm';
			confirmButton.className = 'btn btn-sm btn-success align-self-center d-inline-block w-50 mt-2';
			confirmButton.id = userData.id;
			confirmButton.addEventListener('click', this.confirmUserEventListener);

			denyButton.innerHTML = 'Deny';
			denyButton.className = 'btn btn-sm btn-danger align-self-center d-inline-block w-50 mt-2';
			denyButton.id = userData.id;
			denyButton.addEventListener('click', this.denyUserEventListener);

			confirmationPopup.innerHTML = `<b class="align-self-center">${userData.name}</b> wants to join the room`;
			confirmationPopup.className = 'align-self-center d-flex flex-column mr-2 confirmation-popup';
			confirmationPopup.id = `confirmation-popup.${userData.id}`;
			confirmationPopup.append(confirmButton);
			confirmationPopup.append(denyButton);

			confirmationPopupContainer.append(confirmationPopup);
		},
		confirmUserEventListener(e) {
			this.$socket.emit('user-confirmed', { id: e.target.id, room: this.userDetails.roomId });
			this.removePopup(e.target.id);
		},
		denyUserEventListener(e) {
			this.$socket.emit('user-denied', { id: e.target.id, room: this.userDetails.roomId });
			this.removePopup(e.target.id);
		},
		initializePeerConnection() {
			return new Peer('', {
				host: process.env.NODE_ENV === 'development' ? 'localhost' : '{{ production_url }}',
				path: '/peer',
				port: process.env.NODE_ENV === 'development' ? 9000 : 443,
				secure: process.env.NODE_ENV === 'development' ? false : true,
			});
		},
		initializePeersEvents() {
			this.myPeer.on('open', async id => {
				this.myId = id;
				this.userDetails['userId'] = id;
				this.$socket.emit('join-room', this.userDetails);
				await this.getUsers();
				await this.setNavigatorToStream();
				this.$children[0].handleCam();
			});
			this.myPeer.on('error', err => {
				console.log('peer connection error', err);
				this.myPeer.reconnect();
			});
		},
		async setNavigatorToStream(video = true, audio = true) {
			const stream = await this.getVideoAudioStream(video, audio);
			if (stream) {
				this.currentStream = stream;
				this.streaming = true;
				this.createVideo({ id: this.myId, stream });
				const video = this.getMyVideo();
				video &&
					video.srcObject.getAudioTracks().forEach(track => {
						track.enabled = false;
					});
				this.setPeersListeners(stream);
				this.$socket.emit('peer-listeners-set', this.userDetails);
			}
			await this.getUsers();
		},
		async getVideoAudioStream(video = true, audio = true) {
			let quality = this.userDetails.quality;
			if (quality) quality = parseInt(quality);
			return navigator.mediaDevices.getUserMedia({
				video: video
					? {
							frameRate: quality ? quality : 12,
							noiseSuppression: true,
					  }
					: false,
				audio: audio,
			});
		},
		async createVideo(video) {
			const videoId = video.id;
			const stream = video.stream;
			this.videoContainer[videoId] = {
				stream,
			};
			if (window.document.getElementById(videoId)) {
				const video = window.document.getElementById(videoId);
				video.srcObject = stream;
				video.style.maxWidth = '100%';
			} else {
				this.appendVideoToGrid(videoId);
			}
			await this.getUsers();
			this.checkStreamingUsers();
		},
		appendVideoToGrid(videoId) {
			const roomContainer = window.document.getElementById('room-container');
			const videoContainer = window.document.createElement('div');
			const userName = window.document.createElement('span');
			const videoObj = window.document.createElement('video');
			userName.className = 'align-self-center user-name';
			userName.style.color = 'white';
			videoObj.srcObject = this.videoContainer[videoId].stream;
			videoObj.id = videoId;
			videoObj.style.maxWidth = '100%';
			videoObj.autoplay = true;
			videoContainer.classList.add('d-flex', 'flex-column');
			videoContainer.style.position = 'relative';
			if (this.myId === videoId) {
				videoObj.muted = true;
				videoContainer.classList.add('my-video-container-div');
				videoContainer.classList.add('justify-content-center');
				userName.textContent = this.userDetails.name;
			} else {
				videoContainer.classList.add('peer-video-container-div');
				videoContainer.classList.add('justify-content-center');
				userName.textContent = this.users.find(user => user.userId === videoId).name;
			}
			const controlsDiv = window.document.createElement('div');
			const expandVideoButton = this.createExpandVideoButton(videoId);
			const fullScreenButton = this.createFullScreenButton(videoId);
			const divider = window.document.createElement('div');
			controlsDiv.className = 'video-controls d-flex justify-content-around align-items-center';
			divider.className = 'control-buttons-divider';
			controlsDiv.appendChild(expandVideoButton);
			controlsDiv.appendChild(divider);
			controlsDiv.appendChild(fullScreenButton);
			videoContainer.appendChild(controlsDiv);
			videoContainer.appendChild(videoObj);
			videoContainer.appendChild(userName);
			this.myId === videoId
				? roomContainer.prepend(videoContainer)
				: roomContainer.append(videoContainer);
		},
		createExpandVideoButton(videoId) {
			const expandVideoButton = window.document.createElement('button');
			expandVideoButton.innerHTML = 'Expand';
			expandVideoButton.className = 'video-controls-button btn';
			expandVideoButton.id = `${videoId}.button`;
			expandVideoButton.addEventListener('click', this.expandVideoEventListener);
			return expandVideoButton;
		},
		createFullScreenButton(videoId) {
			const fullScreenButton = window.document.createElement('button');
			fullScreenButton.innerHTML = 'Fullscreen';
			fullScreenButton.className = 'video-controls-button btn';
			fullScreenButton.id = `${videoId}.button`;
			fullScreenButton.addEventListener('click', this.fullScreenEventListener);
			return fullScreenButton;
		},
		expandVideoEventListener(e) {
			this.modalVideoId = e.target.id.split('.')[0];
			this.modalVideo = this.videoContainer[this.modalVideoId].stream;
			this.showModal = true;
		},
		fullScreenEventListener(e) {
			const video = window.document.getElementById(e.target.id.split('.')[0]);
			if (this.showModal) this.showModal = false;
			video.requestFullscreen();
		},
		async getUsers() {
			const { data } = await this.$http.get('/users');
			this.users = data.rooms[this.userDetails.roomId];
		},
		checkStreamingUsers() {
			this.users.map(user => {
				const video = this.getMyVideo(user.userId);
				if (video) {
					if (!user.streaming) {
						this.replaceBlackDisplay(video);
					} else {
						this.replaceTempImage(video);
					}
				}
			});
		},
		getMyVideo(id = this.myId) {
			return document.getElementById(id);
		},
		reInitializeStream(video, audio, type = 'userMedia', audioTrack = false) {
			const myVideo = this.getMyVideo();
			if (type && myVideo) {
				myVideo.srcObject.getVideoTracks().forEach(track => {
					track.stop();
				});
			}
			const media =
				type === 'userMedia'
					? this.getVideoAudioStream(video, audio)
					: type !== false
					? navigator.mediaDevices.getDisplayMedia({ video, audio })
					: null;
			if (media)
				return new Promise(resolve => {
					media.then(stream => {
						this.currentStream = stream;
						if (type === 'displayMedia') {
							if (audioTrack) stream.addTrack(audioTrack);
							this.videoContainer[this.myId]['stream'] = { stream };
							this.$socket.emit('display-media', true);
							this.replaceStream(stream);
							this.listenToEndStream(stream, { video, audio });
							resolve(true);
						}
						this.createVideo({ id: this.myId, stream });
						const video = this.getMyVideo();
						video &&
							video.srcObject.getAudioTracks().forEach(track => {
								if (track.kind === 'audio') {
									track.enabled = false;
								}
							});
						this.replaceStream(stream);
						this.videoContainer[this.myId]['stream'] = { stream };
						resolve(true);
					});
				});
			else return new Promise(resolve => resolve(false));
		},
		replaceStream(mediaStream) {
			Object.values(this.peers).map(peer => {
				if (peer && peer.peerConnection)
					peer.peerConnection.getSenders().map(sender => {
						if (sender.track.kind == 'audio') {
							if (mediaStream.getAudioTracks().length > 0) {
								sender.replaceTrack(mediaStream.getAudioTracks()[0]);
							}
						}
						if (sender.track.kind == 'video') {
							if (mediaStream.getVideoTracks().length > 0) {
								sender.replaceTrack(mediaStream.getVideoTracks()[0]);
							}
						}
					});
			});
		},
		setPeersListeners(stream) {
			this.myPeer.on('call', call => {
				call.answer(stream);
				call.on('stream', userVideoStream => {
					this.createVideo({ id: call.metadata.id, stream: userVideoStream });
				});
				call.on('close', () => {
					console.log('closing peers listeners', call.metadata.id);
					this.removeVideo(call.metadata.id, true);
				});
				call.on('error', () => {
					console.log('peer error ------');
					this.removeVideo(call.metadata.id, true);
				});
				this.peers[call.metadata.id] = call;
			});
		},
		connectToNewUser(userData, stream) {
			const { userId } = userData;
			const call = this.myPeer.call(userId, stream, { metadata: { id: this.myId } });
			call.on('stream', userVideoStream => {
				this.createVideo({ id: userId, stream: userVideoStream, userData });
			});
			call.on('close', () => {
				console.log('closing new user', userId);
				this.removeVideo(userId, true);
			});
			call.on('error', () => {
				console.log('peer error ------');
				this.removeVideo(userId, true);
			});
			this.peers[userId] = call;
		},
		removeVideo(id, flushVideoContainer = false) {
			if (flushVideoContainer) delete this.videoContainer[id];
			const video = document.getElementById(id);
			if (id === this.myId) {
				const videoDiv = document.getElementsByClassName('my-video-container-div');
				if (videoDiv.length) videoDiv[0].remove();
			} else {
				if (video) {
					const peerVideoDiv = video.parentElement;
					if (peerVideoDiv) peerVideoDiv.remove();
				}
			}
			if (video) video.remove();
		},
		async toggleVideoTrack(status) {
			let myVideo = this.getMyVideo();
			if (myVideo && !status.video) {
				myVideo.srcObject.getVideoTracks().forEach(track => {
					if (track.kind === 'video') {
						this.$socket.emit('user-video-off', { id: this.myId, status: true });
						// if (!status.video) track.enabled = false;
						if (!status.video) track.stop();
					}
				});
			} else {
				this.reInitializeStream(true, status.audio);
				this.$socket.emit('user-video-on', { id: this.myId });
				await this.getUsers();
				this.checkStreamingUsers();
			}
		},
		listenToEndStream(stream, status) {
			const videoTrack = stream.getVideoTracks();
			if (videoTrack[0]) {
				videoTrack[0].onended = () => {
					this.$socket.emit('display-media', false);
					this.reInitializeStream(status.video, status.audio, 'userMedia');
					this.toggleVideoTrack(status);
				};
			}
		},
		destoryConnection() {
			this.$socket.emit('disconnect');
			this.$socket.disconnect();
			this.myPeer.destroy();
		},
		replaceBlackDisplay(video) {
			const img = [...video.parentElement.childNodes].find(el => el.tagName == 'IMG');
			if (img) return;
			const imageDisplay = window.document.createElement('img');
			imageDisplay.style.width = '100%';
			imageDisplay.style.height = '97%';
			imageDisplay.style.zIndex = '100';
			imageDisplay.style.position = 'absolute';
			imageDisplay.style.top = '0';
			imageDisplay.style.backgroundColor = '#383838';
			imageDisplay.src = laptopUser;
			imageDisplay.style.position = 'absolute';
			video.parentElement.prepend(imageDisplay);

			const videoControls = [...video.parentElement.childNodes].find(el =>
				el.className.includes('video-controls')
			);
			videoControls.style.visibility = 'hidden';
		},
		replaceTempImage(video) {
			const videoControls = [...video.parentElement.childNodes].find(el =>
				el.className.includes('video-controls')
			);
			videoControls.style.visibility = 'visible';

			const img = [...video.parentElement.childNodes].find(el => el.tagName == 'IMG');
			if (img) img.remove();
		},
		toggleChat(val) {
			this.chatToggled = val;
		},
		newMessageReceived({ message, user, timestamp }) {
			this.messages = [...this.messages, { message, user, timestamp }];
			setTimeout(() => {
				const lastMessage = window.document.querySelector('.chat-container .messages:last-child');
				if (lastMessage) lastMessage.scrollIntoView();
			}, 100);
		},
	},
	async created() {
		this.userDetails = {
			roomId: this.$route.params.room,
			quality: this.$route.query.quality,
			name: this.$route.query.name,
			streaming: true,
		};

		if (this.$socket) {
			this.isSocketConnected = true;
		}

		this.myPeer = this.initializePeerConnection();
		if (this.myPeer) {
			this.isPeersConnected = true;
			await this.initializePeersEvents();
		}
	},
	watch: {
		streaming: async function(val) {
			if (val) await this.getUsers();
		},
	},
	beforeDestroy() {
		this.$socket.emit('disconnect', this.userDetails);
		window.removeEventListener('click', this.expandVideoEventListener);
		window.removeEventListener('click', this.fullScreenEventListener);
		this.destoryConnection();
		window.location.reload();
	},
};
</script>

<style>
.users-container {
	width: 10%;
}

.users {
	border: 1px solid black;
	border-radius: 3px;
	max-width: 100%;
	width: 100%;
}

video {
	border-radius: 5px;
}

.black-background {
	background-color: #383838;
}

.room-container {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	grid-gap: 15px;
	max-width: 100%;
	padding: 15px;
	margin: auto;
	box-sizing: border-box;
	align-items: center;
}

.my-video-container-div {
	width: 100%;
	height: 258px;
	min-height: 150px;
	box-sizing: border-box;
	transition: all 0.2s ease-in;
	max-width: 300px;
	max-height: 258px;
}

.peer-video-container-div {
	width: 100%;
	height: 258px;
	min-height: 150px;
	box-sizing: border-box;
	max-width: 300px;
	max-height: 258px;
}

.video-controls {
	width: 100%;
	height: 100%;
	position: absolute;
	opacity: 0;
	background-color: #383838;
	backface-visibility: hidden;
}

.my-video-container-div:hover {
	backface-visibility: block;
	opacity: 0.5;
}

.peer-video-container-div:hover {
	backface-visibility: block;
	opacity: 0.5;
}

.my-video-container-div:hover .video-controls,
.peer-video-container-div:hover .video-controls {
	opacity: 0.5;
}

.my-video-container-div:hover,
.peer-video-container-div:hover {
	cursor: pointer;
	opacity: 1;
}

.my-video-container-div:hover::after,
.peer-video-container-div:hover::after {
	opacity: 0.5;
}

.my-video-container-div::after,
.peer-video-container-div::after {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	opacity: 0;
	background-color: #383838;
	transition: all 0.2s ease-in;
}

.my-video-container-div .video-controls,
.peer-video-container-div .video-controls {
	background: 0;
}

.my-video-container-div:hover .video-controls,
.peer-video-container-div:hover .video-controls {
	opacity: 1;
	position: absolute;
	z-index: 1000;
}

.my-video-container-div .user-name,
.peer-video-container-div .user-name {
	display: flex;
	width: 100%;
	align-items: center;
	justify-content: center;
	background: #383838;
	z-index: 10;
	position: absolute;
	bottom: -15px;
}

.video-controls-button {
	color: white !important;
	width: 50%;
	height: 100%;
}

.control-buttons-divider {
	border-left: 2px solid white;
	height: 70%;
}

.confirmation-popup {
	border: 2px solid black;
	border-radius: 5px;
	background-color: white;
	padding: 5px;
}
</style>
