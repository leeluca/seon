import { Hono } from 'hono';

const auth = new Hono();


auth.post('/login', (c) => c.text('Login'));

auth.post('/signup', (c) => c.text('Signup'));

auth.get('/currentUser', (c) => c.text('CurrentUser'));

auth.get('/refresh', (c) => c.text('Refresh'));

auth.delete('/logout', (c) => c.text('Logout'));

export default auth;
