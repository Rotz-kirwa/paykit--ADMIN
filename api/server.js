import { defaultStreamHandler } from '../dist/server/server.js';
import { toNodeListener } from 'h3-v2';

export default toNodeListener(defaultStreamHandler);
