import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';
import router from './router';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from './axios';
import VueSocketIO from 'vue-socket.io';
import store from './store/store';

Vue.prototype.$http = axios;

Vue.use(
	new VueSocketIO({
		connection:
			process.env.NODE_ENV === 'production' ? '{{production_url}}' : 'http://localhost:5000',
		vuex: {
			store,
			actionPrefix: 'SOCKET_',
			mutationPrefix: 'SOCKET_',
		},
	})
);

Vue.config.productionTip = false;

Vue.use(VueRouter);

new Vue({
	router,
	store,
	render: h => h(App),
}).$mount('#app');
