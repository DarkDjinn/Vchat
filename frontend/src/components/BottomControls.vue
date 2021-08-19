<template>
	<div
		class="btn-toolbar d-flex justify-content-around border"
		role="toolbar"
		aria-label="Toolbar with button groups"
	>
		<div class="btn-group" role="group">
			<button
				type="button"
				:class="[{ 'btn-success': !chatToggle }, { 'btn-danger': chatToggle }, 'btn']"
				@click="handleChat"
			>
				<message-square-icon size="1.5x" class="custom-class"></message-square-icon>
			</button>
		</div>
		<div class="btn-group" role="group">
			<button
				type="button"
				:class="[{ 'btn-success': !micStatus }, { 'btn-danger': micStatus }, 'btn']"
				@click="handleMic"
			>
				<mic-off-icon v-if="micStatus" size="1.5x" class="custom-class"></mic-off-icon>
				<mic-icon v-if="!micStatus" size="1.5x" class="custom-class"></mic-icon>
			</button>
		</div>
		<div class="btn-group" role="group">
			<button
				type="button"
				:class="[{ 'btn-success': !camStatus }, { 'btn-danger': camStatus }, 'btn']"
				@click="handleCam"
			>
				<camera-off-icon v-if="camStatus" size="1.5x" class="custom-class"></camera-off-icon>
				<camera-icon v-if="!camStatus" size="1.5x" class="custom-class"></camera-icon>
			</button>
		</div>
		<div class="btn-group" role="group">
			<button
				type="button"
				:class="[{ 'btn-success': !shareScreenStatus }, { 'btn-danger': shareScreenStatus }, 'btn']"
				@click="handleScreenShare"
			>
				<pause-icon v-if="shareScreenStatus" size="1.5x" class="custom-class"></pause-icon>
				<cast-icon v-if="!shareScreenStatus" size="1.5x" class="custom-class"></cast-icon>
			</button>
		</div>
		<div class="btn-group" role="group">
			<button type="button" class="btn btn-danger" @click="handleDisconnect">
				<phone-off-icon size="1.5x" class="custom-class"></phone-off-icon>
			</button>
		</div>
	</div>
</template>

<script>
import {
	CameraIcon,
	CameraOffIcon,
	MicIcon,
	MicOffIcon,
	PhoneOffIcon,
	CastIcon,
	PauseIcon,
	MessageSquareIcon,
} from 'vue-feather-icons';

export default {
	name: 'BottomControls',
	props: {
		myId: String,
		getVideoAudioStream: Function,
		createVideo: Function,
		getMyVideo: Function,
		reInitializeStream: Function,
		replaceStream: Function,
		toggleVideoTrack: Function,
		removeVideo: Function,
		destoryConnection: Function,
		replaceBlackDisplay: Function,
		replaceTempImage: Function,
	},
	components: {
		CameraOffIcon,
		CameraIcon,
		MicIcon,
		MicOffIcon,
		PhoneOffIcon,
		CastIcon,
		PauseIcon,
		MessageSquareIcon,
	},
	data() {
		return {
			shareScreenStatus: false,
			micStatus: false,
			camStatus: true,
			chatToggle: false,
		};
	},
	methods: {
		handleMic() {
			const myVideo = this.getMyVideo();
			if (myVideo) {
				const audioTracks = myVideo.srcObject.getAudioTracks();
				if (audioTracks.length) {
					myVideo.srcObject.getAudioTracks().forEach(track => {
						if (track.kind === 'audio') track.enabled = !this.micStatus;
					});
				}
			}
			this.micStatus = !this.micStatus;
		},
		async handleCam() {
			if (!this.shareScreenStatus) {
				await this.toggleVideoTrack({ video: !this.camStatus, audio: true });
				const myVideo = this.getMyVideo();
				this.handleAudioTracks(myVideo);
				this.camStatus = !this.camStatus;
			} else {
				await this.toggleVideoTrack({ video: true, audio: true });
				await this.reInitializeStream(true, true);
				const myVideo = this.getMyVideo();
				this.handleAudioTracks(myVideo);
				this.shareScreenStatus = !this.shareScreenStatus;
				this.camStatus = true;
			}
		},
		async handleScreenShare() {
			const myVideo = this.getMyVideo();
			const audioTrack = myVideo.srcObject.getAudioTracks()[0] || false;
			this.shareScreenStatus && (await this.toggleVideoTrack({ video: false, audio: true }));
			await this.reInitializeStream(
				true,
				false,
				!this.shareScreenStatus ? 'displayMedia' : false,
				audioTrack
			);
			const myNewVideo = this.getMyVideo();
			this.handleAudioTracks(myNewVideo);
			this.shareScreenStatus = !this.shareScreenStatus;
			this.camStatus = false;
		},
		handleChat() {
			this.chatToggle = !this.chatToggle;
			this.$emit('chatToggled', this.chatToggle);
		},
		handleDisconnect() {
			this.destoryConnection();
			this.$router.push({
				path: '/',
			});
			window.location.reload();
		},
		handleAudioTracks(video) {
			const audioTracks = video.srcObject.getAudioTracks();
			if (audioTracks.length) {
				audioTracks.forEach(track => {
					if (track.kind === 'audio') track.enabled = this.micStatus;
				});
			}
		},
	},
	watch: {
		shareScreenStatus: function(val) {
			const video = this.getMyVideo();
			if (video) {
				if (!val && !this.camStatus) this.replaceBlackDisplay(video);
				else this.replaceTempImage(video);
			}
		},
		camStatus: function(val) {
			const video = this.getMyVideo();
			if (video) {
				if (!val && !this.shareScreenStatus) this.replaceBlackDisplay(video);
				else this.replaceTempImage(video);
			}
		},
	},
};
</script>

<style scoped>
.border {
	border: 1px solid black !important;
	border-radius: 3px;
	padding: 5px;
}
.btn-toolbar {
	margin-left: -5px;
}
</style>
