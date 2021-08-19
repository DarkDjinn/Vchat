<template>
	<div class="video-modal-wrapper">
		<div class="content-wrapper">
			<video class="modal-video" id="modal-video" :class="modalVideoId"></video>
			<div>
				<button class="btn video-content align-self-center" type="submit" @click="$emit('close')">
					X
				</button>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'VideoModal',
	props: {
		video: MediaStream,
		modalVideoId: String,
	},
	methods: {
		injectVideo() {
			const video = window.document.getElementById('modal-video');
			video.srcObject = this.video;
			video.muted = true;
			video.style.width = '100%';
			video.style.height = '100%';
			video.autoplay = true;
			video.playsinline = true;
		},
	},
	async mounted() {
		this.injectVideo();
	},
};
</script>

<style scoped>
.content-wrapper {
	position: absolute;
	width: 90.5%;
	height: 94.5%;
	left: 9%;
}

.content-wrapper .modal-video {
	position: absolute;
	width: 100%;
	height: 100%;
	object-fit: fill;
	background-color: #383838;
}

.content-wrapper .video-content {
	position: absolute;
	font-size: 25px;
	font-weight: bold;
	top: 0px;
	right: 0px;
	opacity: 0.5;
	background-color: #000;
	color: #fff;
}

.video-modal-wrapper {
	z-index: 200;
}
</style>
