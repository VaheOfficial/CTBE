import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import type { Request, Response } from "express";

interface VideoSource {
    name: string;
    link: string;
}

// This should match the videoLinks in the route file
const videoLinks: VideoSource[] = [
    {
        "name": "Cam_Hallway_1",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.10:8554/stream"
    },
    {
        "name": "Cam_Hallway_2",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.20:8554/stream"
    },
    {
        "name": "Cam_Hallway_3",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.30:8554/stream"
    },
    {
        "name": "Cam_Hallway_4",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.40:8554/stream"
    },
    {
        "name": "Cam_Hallway_5",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.50:8554/stream"
    },
    {
        "name": "Cam_Hallway_6",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.60:8554/stream"
    },
    {
        "name": "Cam_Launchpad_1",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.70:8554/stream"
    },
    {
        "name": "Cam_Launchpad_2",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.80:8554/stream"
    },
    {
        "name": "Cam_Launchpad_3",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.90:8554/stream"
    },
    {
        "name": "Cam_Launchpad_4",
        "link": "rtsp://secOfficer01:P@ssw0rd@10.20.40.100:8554/stream"
    }
];

export const getVideoSources = (req: Request, res: Response) => {
    res.send(videoLinks);
};

export const getPreviews = async (req: Request, res: Response) => {
    try {
        const previews = await captureImages();
        res.send(previews);
    } catch (error) {
        res.status(500).send({ error: (error as Error).message });
    }
};

export const streamVideo = (req: Request, res: Response) => {
    const { streamName } = req.params;
    
    const videoSource = videoLinks.find(v => v.name === streamName);
    
    if (!videoSource) {
        return res.status(404).send({ error: "Stream not found" });
    }
    
    console.log(`Starting stream for: ${streamName}`);
    
    // Set headers for progressive MP4 streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    
    // Use ffmpeg with optimized settings for immediate progressive streaming
    const ffmpeg = spawn('ffmpeg', [
        '-i', videoSource.link,
        '-c:v', 'libx264',              // H.264 video codec
        '-preset', 'ultrafast',         // Fastest encoding preset
        '-tune', 'zerolatency',         // Optimize for low latency
        '-profile:v', 'baseline',       // Use baseline profile for better compatibility
        '-level', '3.0',                // H.264 level
        '-c:a', 'aac',                  // AAC audio codec
        '-ac', '2',                     // Stereo audio
        '-ar', '44100',                 // Audio sample rate
        '-b:a', '128k',                 // Audio bitrate
        '-f', 'mp4',                    // MP4 container
        '-movflags', 'frag_keyframe+empty_moov+default_base_moof+faststart', // Critical for streaming
        '-frag_duration', '500000',     // 0.5 second fragments for low latency
        '-min_frag_duration', '500000', // Minimum fragment duration
        '-frag_size', '1048576',        // 1MB fragment size
        '-reset_timestamps', '1',       // Reset timestamps for live stream
        '-avoid_negative_ts', 'make_zero', // Handle timestamp issues
        '-'                             // Output to stdout
    ]);
    
    // Alternative WebM option (uncomment if MP4 doesn't work):
    /*
    const ffmpeg = spawn('ffmpeg', [
        '-i', videoSource.link,
        '-c:v', 'libvpx-vp9',
        '-deadline', 'realtime',
        '-cpu-used', '4',
        '-row-mt', '1',
        '-lag-in-frames', '0',
        '-error-resilient', '1',
        '-auto-alt-ref', '0',
        '-c:a', 'libopus',
        '-f', 'webm',
        '-'
    ]);
    res.setHeader('Content-Type', 'video/webm');
    */
    
    // Pipe ffmpeg output directly to response
    ffmpeg.stdout.pipe(res);
    
    // Handle ffmpeg errors
    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg stderr: ${data.toString()}`);
    });
    
    ffmpeg.on('error', (err) => {
        console.error('FFmpeg process error:', err);
        if (!res.headersSent) {
            res.status(500).send({ error: 'Stream processing error' });
        }
    });
    
    ffmpeg.on('exit', (code, signal) => {
        console.log(`FFmpeg process exited with code ${code} and signal ${signal}`);
        if (!res.headersSent) {
            res.end();
        }
    });
    
    // Handle client disconnect
    req.on('close', () => {
        console.log('Client disconnected, killing ffmpeg process');
        ffmpeg.kill('SIGINT');
    });
    
    req.on('error', (err) => {
        console.error('Request error:', err);
        ffmpeg.kill('SIGINT');
    });
    
    // Handle response errors
    res.on('error', (err) => {
        console.error('Response error:', err);
        ffmpeg.kill('SIGINT');
    });
};

// Helper functions
const cleanupOldPreviews = (previewsDir: string) => {
    try {
        const files = fs.readdirSync(previewsDir);
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

        for (const file of files) {
            const filePath = path.join(previewsDir, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up old preview: ${file}`);
            }
        }
    } catch (error) {
        console.error('Error cleaning up old previews:', error);
    }
};

const captureImageFromRTSP = (rtspUrl: string, outputPath: string) => {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn("ffmpeg", [
            "-i", rtspUrl,
            "-frames:v", "1",
            "-q:v", "2",
            outputPath
        ]);

        ffmpeg.on("close", (code) => {
            if (code === 0) {
                resolve(outputPath);
            } else {
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });

        ffmpeg.on("error", (err) => {
            reject(err);
        });
    });
};

const captureImages = async () => {
    // Create public/previews directory if it doesn't exist
    const previewsDir = path.join(process.cwd(), 'public', 'previews');
    if (!fs.existsSync(previewsDir)) {
        fs.mkdirSync(previewsDir, { recursive: true });
    }

    // Clean up old preview images
    cleanupOldPreviews(previewsDir);

    const previewPromises = videoLinks.map(async (video) => {
        const filename = `${video.name}_preview_${Date.now()}.jpg`;
        const outputPath = path.join(previewsDir, filename);
        try {
            console.log(`Capturing image from ${video.name}`);
            await captureImageFromRTSP(video.link, outputPath);
            return {
                name: video.name,
                link: video.link,
                previewUrl: `/previews/${filename}`
            };
        } catch (error) {
            return {
                name: video.name,
                link: video.link,
                error: (error as Error).message
            };
        }
    });

    return Promise.all(previewPromises);
};