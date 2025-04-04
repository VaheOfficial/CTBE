import nodeMediaServer from "node-media-server";
import path from "node:path";

const server = new nodeMediaServer({
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        mediaroot: '/home/devuser/git/CTBE/media',
        allow_origin: '*'
    }
});

export const initVideoStreamingServer = () => {
    server.run();
};

export const stopVideoStreamingServer = () => {
    server.stop();
};

export const getVideoStreamingServer = () => {
    return server;
};