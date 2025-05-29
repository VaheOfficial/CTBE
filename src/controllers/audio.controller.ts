import type { Request, Response } from "express";
import Launch from "../models/launch.model";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";

interface AudioState {
    timeRemaining: number | null;
    playback: string | null;
    audioState: AudioFiles | null;
    staticLevel: string | null;
}

interface AudioFiles {
    mc: string | null;
    obc: string | null;
    static: string | null;
}

const state: AudioState = {
    "timeRemaining": null,
    "playback": null,
    "audioState": null,
    "staticLevel": null,
}

// Track when we last changed the static level
let lastStaticChange = Date.now();
// How often to potentially change static level (in ms)
const STATIC_CHANGE_INTERVAL = 5000; // 5 seconds (more frequent changes)

const launchTimer = async () => {
    const launches = await Launch.find({
        status: { $in: ['pending', 'scheduled', 'good-to-go', 'launching', 'success', 'failed', 'revoked'] }
    });

    console.log(`Found ${launches.length} launches in database`);
    
    if (launches.length > 0) {
        console.log('Launch details:', launches.map(l => ({
            date: l.date,
            status: l.status,
            timeFromNow: Math.round((new Date(l.date).getTime() - Date.now()) / 60000)
        })));
    }

    let closestLaunch = null;
    let abortedLaunch = null;
    const currentTime = Date.now(); // Use Date.now() for consistency

    for (const launch of launches) {
        const launchDate = new Date(launch.date).getTime(); // Convert to timestamp
        const timeDifference = launchDate - currentTime;
        
        console.log(`Launch ${launch.date}: ${Math.round(timeDifference / 60000)} minutes from now, status: ${launch.status}`);
        
        // Track if there's a failed launch (treating as aborted)
        if (launch.status === 'failed' || launch.status === 'revoked') {
            if (!abortedLaunch || launchDate > new Date(abortedLaunch.date).getTime()) {
                abortedLaunch = launch;
            }
            continue; // Skip failed launches for the normal countdown
        }
        
        // Find closest launch (either upcoming OR recent - within last 2 hours for post-launch audio)
        const isRelevantLaunch = timeDifference > -120 * 60 * 1000; // Within last 2 hours OR future
        
        if (isRelevantLaunch && (closestLaunch === null || Math.abs(timeDifference) < Math.abs(closestLaunch.timeDifference))) {
            closestLaunch = {
                date: launch.date,
                timeDifference: timeDifference,
                status: launch.status
            };
            console.log(`Selected as closest launch: ${launch.date} (${Math.round(timeDifference / 60000)} minutes)`);
        }
    }

    // If there's a recent abort, prioritize it
    if (abortedLaunch) {
        const abortTime = new Date(abortedLaunch.date).getTime();
        // If abort happened in the last 30 minutes, return abort status
        if (currentTime - abortTime < 30 * 60 * 1000) {
            console.log('Returning abort launch');
            return { date: abortedLaunch.date, status: 'failed' };
        }
    }

    if (closestLaunch) {
        console.log(`Returning closest launch: ${closestLaunch.date} (${Math.round(closestLaunch.timeDifference / 60000)} minutes)`);
        return { date: closestLaunch.date, status: closestLaunch.status };
    }
    
    console.log('No relevant launches found');
    return null;
}

// Track active client processes for cleanup on server shutdown
const activeProcesses = new Set<ChildProcess>();

// Cleanup handler for server shutdown
const cleanupAllProcesses = () => {
    console.log(`Cleaning up ${activeProcesses.size} active audio processes...`);
    for (const process of activeProcesses) {
        try {
            // Use SIGKILL for immediate termination
            process.kill('SIGKILL');
        } catch (error) {
            console.error('Error killing process:', error);
        }
    }
    activeProcesses.clear();
};

// Register cleanup handlers
process.on('SIGINT', cleanupAllProcesses);
process.on('SIGTERM', cleanupAllProcesses);
process.on('exit', cleanupAllProcesses);

// Audio sources configuration
const audioLinks = [
    {
        "name": "MC",
        "link": "rtsp://tempy:554433@10.20.10.10:8554"
    },
    {
        "name": "OBC",
        "link": "rtsp://tempy:554433@10.20.10.20:8554"
    }
];

// Audio file paths
const AUDIO_DIR = path.join(process.cwd(), 'media/audio');

// Function to get available audio files
function getAudioFiles(): Record<string, string> {
    const audioFiles: Record<string, string> = {};
    const files = fs.readdirSync(AUDIO_DIR);
    
    for (const file of files) {
        if (file.endsWith('.wav')) {
            audioFiles[file] = `/media/audio/${file}`;
        }
    }
    
    return audioFiles;
}

// Function to determine the playback state based on time remaining and launch status
function determinePlayback(timeRemaining: number, launchStatus: string | undefined): string | null {
    // If launch is aborted, return "abort" state
    if (launchStatus === 'failed' || launchStatus === 'revoked') {
        return "abort";
    }
    
    const secondsRemaining = timeRemaining / 1000; // Convert to seconds for precise control
    
    // Reduce debug logging frequency - only log when seconds change significantly
    const shouldLog = Math.abs(secondsRemaining) < 30 || Math.abs(secondsRemaining % 60) < 1;
    if (shouldLog) {
        console.log(`Debug timing - Seconds remaining: ${secondsRemaining.toFixed(1)}`);
    }
    
    // Post-launch: After launch time (negative time remaining)
    if (secondsRemaining < 0) {
        if (shouldLog) console.log('Phase: POST-LAUNCH');
        return "post";
    }
    
    // Launch phase: From 10 seconds before launch to launch time
    if (secondsRemaining >= 0 && secondsRemaining <= 10) {
        if (shouldLog) console.log('Phase: LAUNCH (T-10 seconds to T+0)');
        return "launch";
    }
    
    // Pre-launch: From 30 minutes before launch to 10 seconds before launch
    if (secondsRemaining > 10 && secondsRemaining <= 30 * 60) { // 30 minutes = 1800 seconds
        if (shouldLog) console.log('Phase: PRE-LAUNCH (T-30 minutes to T-10 seconds)');
        return "pre";
    }
    
    // Before T-30 minutes: No audio yet
    if (shouldLog) console.log('Phase: WAITING (before T-30 minutes)');
    return null;
}

// Function to determine the static level (randomly fluctuates between clear, low static, high static)
function determineStaticLevel(): string {
    const now = Date.now();
    
    // Only change static level occasionally to create the feel of radio transmission
    if (now - lastStaticChange < STATIC_CHANGE_INTERVAL) {
        return state.staticLevel || ""; // Return current static level if too soon to change
    }
    
    lastStaticChange = now;
    
    // Randomize static levels with weighted probability
    // Increased probability of static for better effect
    const random = Math.random();
    if (random < 0.4) {
        // Clear audio (40% chance - reduced from 60%)
        return ""; 
    } 
    
    if (random < 0.7) {
        // Low static (30% chance - same)
        return "ls"; 
    } 
    
    // High static (30% chance - increased from 10%)
    return "hs"; 
}

// Function to get the appropriate audio files based on state and static level
function getAudioFilesForState(playbackState: string, staticLevel: string): AudioFiles {
    const audioFiles = getAudioFiles();
    const result: AudioFiles = {
        mc: null,
        obc: null,
        static: audioFiles["static.wav"] || null
    };
    
    // Determine MC audio file
    const mcFileName = `${playbackState}_mc${staticLevel ? `_${staticLevel}` : ''}.wav`;
    if (audioFiles[mcFileName]) {
        result.mc = audioFiles[mcFileName];
    }
    
    // Determine OBC audio file
    const obcFileName = `${playbackState}_obc${staticLevel ? `_${staticLevel}` : ''}.wav`;
    if (audioFiles[obcFileName]) {
        result.obc = audioFiles[obcFileName];
    }
    
    return result;
}

// Update state based on current launch timer
async function updateState() {
    const launchInfo = await launchTimer();
    if (launchInfo === null) {
        state.timeRemaining = null;
        state.playback = null;
        state.audioState = null;
        state.staticLevel = null;
        console.log('No launch scheduled');
        return;
    }
    
    const currentTime = new Date();
    const timeDifference = new Date(launchInfo.date).getTime() - currentTime.getTime();
    state.timeRemaining = timeDifference;
    
    // Determine playback state based on time and launch status
    const newPlaybackState = determinePlayback(timeDifference, launchInfo.status);
    
    // Only provide audio state if we have a valid playback state
    if (!newPlaybackState) {
        // Before T-10 minutes: No audio available yet
        state.playback = null;
        state.audioState = null;
        state.staticLevel = null;
        console.log('Audio not available yet - waiting for T-10 minutes');
        return;
    }
    
    // Within the audio window (T-10 to T+post)
    state.playback = newPlaybackState;
    
    // Determine static level
    state.staticLevel = determineStaticLevel();
    
    // Get audio files based on playback state and static level
    state.audioState = getAudioFilesForState(state.playback, state.staticLevel);
    
    console.log(`State updated - Playback: ${state.playback}, Static: ${state.staticLevel}`);
}

// Initialize the timer with appropriate update intervals
let timerInterval: NodeJS.Timeout | undefined;

function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Initial update
    updateState();
    
    // Set interval based on time remaining with more appropriate intervals for the new timing
    timerInterval = setInterval(async () => {
        await updateState();
        
        // Adjust update frequency based on time remaining
        if (state.timeRemaining === null) {
            // Check every 5 minutes if no launch is scheduled
            clearInterval(timerInterval);
            timerInterval = setInterval(updateState, 5 * 60 * 1000);
        } else {
            const secondsRemaining = state.timeRemaining / 1000;
            
            if (secondsRemaining < -300) {
                // More than 5 minutes after launch - check every 5 minutes
                clearInterval(timerInterval);
                timerInterval = setInterval(updateState, 5 * 60 * 1000);
            } else if (secondsRemaining <= 30) { 
                // 30 seconds or less to launch or just after - update every 1 second for precision
                clearInterval(timerInterval);
                timerInterval = setInterval(updateState, 1000);
            } else if (secondsRemaining <= 300) {
                // Within 5 minutes of launch - update every 5 seconds
                clearInterval(timerInterval);
                timerInterval = setInterval(updateState, 5 * 1000);
            } else if (secondsRemaining <= 1800) {
                // Within the T-30 minute window - update every 30 seconds
                clearInterval(timerInterval);
                timerInterval = setInterval(updateState, 30 * 1000);
            } else {
                // More than 30 minutes before launch - check every 2 minutes
                clearInterval(timerInterval);
                timerInterval = setInterval(updateState, 2 * 60 * 1000);
            }
        }
    }, 1000); // Initial check after 1 second
}

// Start the timer when the module is loaded
startTimer();

export const getAudioSources = async (req: Request, res: Response) => {
    // Force an update to get the latest state
    await updateState();
    
    if (state.timeRemaining === null) {
        return res.status(404).json({ error: "No upcoming launches found" });
    }
    
    // Check if we're before the T-30 minute window
    const secondsRemaining = state.timeRemaining / 1000;
    const minutesRemaining = secondsRemaining / 60;
    
    if (secondsRemaining > 30 * 60) { // More than 30 minutes
        return res.json({
            timeRemaining: state.timeRemaining,
            secondsRemaining: Math.round(secondsRemaining),
            minutesRemaining: Math.round(minutesRemaining),
            playback: null,
            audioFiles: null,
            staticLevel: null,
            message: `Audio will begin at T-30 minutes (${Math.round(minutesRemaining - 30)} minutes from now)`,
            audioStartsIn: (secondsRemaining - 1800) * 1000, // Time until audio starts in ms
            rtspSources: audioLinks,
            exactTimestamps: {
                launchTime: new Date(Date.now() + state.timeRemaining).toISOString(),
                audioStartTime: new Date(Date.now() + (secondsRemaining - 1800) * 1000).toISOString(),
                prePhaseStart: new Date(Date.now() + (secondsRemaining - 1800) * 1000).toISOString(), // T-30 minutes
                launchPhaseStart: new Date(Date.now() + (secondsRemaining - 10) * 1000).toISOString(), // T-10 seconds
                postPhaseStart: new Date(Date.now() + state.timeRemaining).toISOString() // T+0
            }
        });
    }
    
    // Within audio window or no audio state available
    if (!state.audioState) {
        return res.status(404).json({ 
            error: "No audio available", 
            timeRemaining: state.timeRemaining,
            secondsRemaining: Math.round(secondsRemaining),
            minutesRemaining: Math.round(minutesRemaining),
            playback: state.playback 
        });
    }
    
    // Return the current audio state to the client with exact timestamps
    res.json({
        timeRemaining: state.timeRemaining,
        secondsRemaining: Math.round(secondsRemaining),
        minutesRemaining: Math.round(minutesRemaining),
        playback: state.playback,
        audioFiles: state.audioState,
        staticLevel: state.staticLevel,
        rtspSources: audioLinks,
        phase: getPhaseDescription(state.playback, secondsRemaining),
        exactTimestamps: {
            launchTime: new Date(Date.now() + state.timeRemaining).toISOString(),
            currentTime: new Date().toISOString(),
            prePhaseStart: new Date(Date.now() + (secondsRemaining - 1800) * 1000).toISOString(), // T-30 minutes
            launchPhaseStart: new Date(Date.now() + (secondsRemaining - 10) * 1000).toISOString(), // T-10 seconds
            postPhaseStart: new Date(Date.now() + state.timeRemaining).toISOString() // T+0
        }
    });
};

// Helper function to describe the current phase
function getPhaseDescription(playback: string | null, secondsRemaining: number): string {
    if (!playback) return "Waiting for T-30 minutes";
    
    switch (playback) {
        case "pre":
            if (secondsRemaining > 60) {
                return `Pre-launch communications (T-${Math.round(secondsRemaining / 60)} minutes)`;
            }
            return `Pre-launch communications (T-${Math.round(secondsRemaining)} seconds)`;
        case "launch":
            if (secondsRemaining >= 0) {
                return `Launch sequence (T-${Math.round(secondsRemaining)} seconds)`;
            }
            return `Launch in progress (T+${Math.abs(Math.round(secondsRemaining))} seconds)`;
        case "post":
            if (Math.abs(secondsRemaining) < 60) {
                return `Post-launch communications (T+${Math.abs(Math.round(secondsRemaining))} seconds)`;
            }
            return `Post-launch communications (T+${Math.abs(Math.round(secondsRemaining / 60))} minutes)`;
        case "abort":
            return "Launch aborted - emergency communications";
        default:
            return "Unknown phase";
    }
}

export const getAudioState = async (req: Request, res: Response) => {
    await updateState();
    res.json(state);
};

// Cached ffmpeg instance for continuous streaming - now per client
// Remove global streaming state to allow multiple clients

// Stream combined audio files based on current state
export const getAudio = async (req: Request, res: Response) => {
    await updateState();
    
    // If no state or no audio available, return an error
    if (!state.audioState || !state.playback) {
        const secondsRemaining = state.timeRemaining ? state.timeRemaining / 1000 : null;
        const minutesRemaining = secondsRemaining ? secondsRemaining / 60 : null;
        if (secondsRemaining && minutesRemaining && secondsRemaining > 30 * 60) { // More than 30 minutes
            return res.status(404).json({ 
                error: `Audio not available yet. Will start at T-30 minutes (${(minutesRemaining - 30).toFixed(1)} minutes from now)`,
                timeRemaining: state.timeRemaining,
                secondsRemaining: Math.round(secondsRemaining),
                minutesRemaining: Math.round(minutesRemaining),
                audioStartsIn: (secondsRemaining - 1800) * 1000
            });
        }
        return res.status(404).json({ error: "No audio state available" });
    }
    
    return startAudioStream(req, res, state.playback);
};

// Separate function to handle the actual audio streaming per client
async function startAudioStream(req: Request, res: Response, playbackState: string) {
    // Each client gets their own process - no global state needed
    let clientProcess: ChildProcess | null = null;
    let stateMonitor: NodeJS.Timeout | null = null;
    
    const cleanup = () => {
        if (stateMonitor) {
            clearInterval(stateMonitor);
            stateMonitor = null;
        }
        if (clientProcess) {
            activeProcesses.delete(clientProcess);
            // Use SIGKILL for immediate termination to prevent overlap
            clientProcess.kill('SIGKILL');
            clientProcess = null;
        }
    };
    
    // Get current static level to determine which files to use
    const currentStaticLevel = state.staticLevel || "";
    
    // Select the appropriate audio files based on current static level
    const mcFile = `${playbackState}_mc${currentStaticLevel ? `_${currentStaticLevel}` : ''}.wav`;
    const obcFile = `${playbackState}_obc${currentStaticLevel ? `_${currentStaticLevel}` : ''}.wav`;
    
    // Convert to absolute paths
    const mcPath = path.join(process.cwd(), 'media/audio', mcFile);
    const obcPath = path.join(process.cwd(), 'media/audio', obcFile);
    
    // Check if the selected files exist
    const filesToCheck = [mcPath, obcPath];
    const missingFiles = filesToCheck.filter(file => !fs.existsSync(file));
    
    if (missingFiles.length > 0) {
        console.error('Missing audio files:', missingFiles);
        // Try fallback to clear versions if static versions don't exist
        const fallbackMcPath = path.join(process.cwd(), 'media/audio', `${playbackState}_mc.wav`);
        const fallbackObcPath = path.join(process.cwd(), 'media/audio', `${playbackState}_obc.wav`);
        
        if (!fs.existsSync(fallbackMcPath) || !fs.existsSync(fallbackObcPath)) {
            return res.status(404).json({ error: "Required audio files not found on server" });
        }
        
        // Use fallback clear versions
        console.log(`Using fallback clear versions for ${playbackState}`);
        return startSimpleAudioStream(req, res, fallbackMcPath, fallbackObcPath, playbackState);
    }
    
    console.log(`Selected audio files - MC: ${mcFile}, OBC: ${obcFile}, Static: ${currentStaticLevel || 'clear'}`);
    
    return startSimpleAudioStream(req, res, mcPath, obcPath, playbackState);
}

// Simple audio streaming function that plays one MC and one OBC file
async function startSimpleAudioStream(req: Request, res: Response, mcPath: string, obcPath: string, initialPhase: string) {
    let clientProcess: ChildProcess | null = null;
    let stateMonitor: NodeJS.Timeout | null = null;
    const currentPhase = initialPhase; // Track current phase for this stream
    
    const cleanup = () => {
        if (stateMonitor) {
            clearInterval(stateMonitor);
            stateMonitor = null;
        }
        if (clientProcess) {
            activeProcesses.delete(clientProcess);
            // Use SIGKILL for immediate termination to prevent overlap
            clientProcess.kill('SIGKILL');
            clientProcess = null;
        }
    };
    
    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache'); // HTTP/1.0 compatibility
    res.setHeader('Expires', '0'); // Prevent caching
    res.setHeader('Connection', 'close'); // Close connection when done
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present
    
    // Disable response buffering
    if (res.socket) {
        res.socket.setNoDelay(true);
        res.socket.setTimeout(0); // No timeout
    }
    
    // Use ffmpeg to mix and loop the two selected audio files
    try {
        console.log(`Starting looping audio stream for client - MC: ${mcPath}, OBC: ${obcPath}`);
        
        const ffmpegArgs = [
            '-loglevel', 'error',
            // Real-time streaming flags to prevent buffering
            '-re', // Read input at native frame rate (real-time)
            '-flush_packets', '1', // Flush packets immediately
            '-fflags', '+nobuffer', // Disable buffering
            '-flags', '+low_delay', // Low delay mode
            '-strict', '-2', // Allow experimental codecs if needed
            // Loop the input files indefinitely
            '-stream_loop', '-1', // Loop infinitely
            // Input the two selected files
            '-i', mcPath,   // [0] MC
            '-stream_loop', '-1', // Loop infinitely
            '-i', obcPath,  // [1] OBC
            // Simple mix of the two inputs
            '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=longest',
            // Real-time output format settings
            '-f', 'wav',
            '-flush_packets', '1', // Flush output packets immediately
            '-fflags', '+flush_packets', // Enable packet flushing
            // Force unbuffered output to pipe
            'pipe:1'
        ];
        
        // Create the ffmpeg process for this client
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        clientProcess = ffmpegProcess;
        
        // Track this process for cleanup on server shutdown
        activeProcesses.add(ffmpegProcess);
        
        // Setup a monitoring system to check for state changes every 5 seconds (more frequent for instant switching)
        stateMonitor = setInterval(async () => {
            await updateState();
            
            // Check if playback state changed - if so, kill current process and restart with new audio
            if (currentPhase !== state.playback && state.playback) {
                console.log(`Phase changed from ${currentPhase} to ${state.playback} - switching audio instantly`);
                
                // Kill current process to stop current audio
                cleanup();
                
                // Wait longer to ensure complete cleanup before starting new audio
                setTimeout(() => {
                    if (state.playback) {
                        startAudioStream(req, res, state.playback).catch(err => {
                            console.error('Error switching to new audio phase:', err);
                            if (!res.writableEnded) {
                                res.end();
                            }
                        });
                    }
                }, 500); // Increased delay to ensure cleanup completes
                
                return; // Exit this interval
            }
        }, 5000); // Check every 5 seconds for phase changes
        
        // Handle errors - but don't log stderr since we reduced verbosity
        ffmpegProcess.stderr.on('data', (data) => {
            // Only log actual errors, not info messages
            const errorMessage = data.toString();
            if (errorMessage.includes('Error') || errorMessage.includes('Failed')) {
                console.error(`ffmpeg error for client: ${errorMessage}`);
            }
        });
        
        // Handle unexpected termination
        ffmpegProcess.on('error', (err) => {
            console.error('Failed to start ffmpeg process for client:', err);
            cleanup();
            if (!res.headersSent) {
                res.status(500).json({ error: "Failed to process audio streams" });
            }
        });
        
        // Handle process ending (shouldn't happen with infinite loop, but just in case)
        ffmpegProcess.on('close', (code) => {
            console.log(`Looping audio process ended unexpectedly (code: ${code})`);
            
            // If the process ends but we still should be playing audio, restart it
            updateState().then(() => {
                const shouldContinue = !res.writableEnded && state.audioState && state.playback;
                
                if (shouldContinue) {
                    console.log(`Restarting looping audio - Phase: ${state.playback}`);
                    cleanup();
                    
                    setTimeout(() => {
                        if (state.playback) {
                            startAudioStream(req, res, state.playback).catch(err => {
                                console.error('Error restarting looping audio:', err);
                                cleanup();
                            });
                        }
                    }, 1000);
                } else {
                    console.log('Audio cycle complete, ending stream');
                    cleanup();
                    if (!res.writableEnded) {
                        res.end();
                    }
                }
            }).catch(err => {
                console.error('Error checking state for restart:', err);
                cleanup();
                if (!res.writableEnded) {
                    res.end();
                }
            });
        });
        
        // Pipe the mixed audio to the response
        ffmpegProcess.stdout.pipe(res, { end: false });
        
        // Handle client disconnect - use once to prevent memory leaks
        const onClose = () => {
            console.log('Client disconnected, stopping looping audio stream');
            cleanup();
        };
        
        res.once('close', onClose);
        res.once('error', onClose);
        
    } catch (error) {
        console.error('Error starting looping audio stream:', error);
        cleanup();
        
        // If all else fails, just play the MC file in a loop
        console.log('Emergency fallback - looping MC only');
        const emergencyProcess = spawn('ffmpeg', [
            '-loglevel', 'error',
            '-re',
            '-flush_packets', '1',
            '-fflags', '+nobuffer',
            '-flags', '+low_delay',
            '-stream_loop', '-1', // Loop the emergency file too
            '-i', mcPath,
            '-f', 'wav',
            '-flush_packets', '1',
            '-fflags', '+flush_packets',
            'pipe:1'
        ]);
        
        activeProcesses.add(emergencyProcess);
        emergencyProcess.stdout.pipe(res);
        
        emergencyProcess.once('close', () => {
            console.log('Emergency fallback stream ended');
            activeProcesses.delete(emergencyProcess);
        });
    }
}

