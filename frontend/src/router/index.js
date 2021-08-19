import Vue from 'vue';
import Router from 'vue-router';

import Home from '../components/Home';
import Room from '../components/Room';

Vue.use(Router);

const router = new Router({
	mode: 'history',
	routes: [
		{ path: '/', component: Home },
		{ path: '/:room', component: Room },
		{
			path: '*',
			name: 'catchAll',
			component: Home,
		},
	],
});

export default router;
