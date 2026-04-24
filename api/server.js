import { defaultStreamHandler } from '../dist/server/server.js';
import { createNodeMiddleware } from 'h3-v2';

export default createNodeMiddleware(defaultStreamHandler);
