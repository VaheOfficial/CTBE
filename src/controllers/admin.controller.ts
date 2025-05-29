import { spawn, exec } from "node:child_process";
import type { Request, Response } from "express";

// ⚠️ WARNING: INTENTIONAL SECURITY VULNERABILITY FOR EDUCATIONAL PURPOSES ⚠️
// This controller contains a deliberate Remote Code Execution (RCE) vulnerability
// designed for ethical hacking practice and security awareness training.
// DO NOT USE IN PRODUCTION ENVIRONMENTS!

export const getAdminDashboard = (req: Request, res: Response) => {
    res.json({
        message: "System Administration Dashboard",
        version: "1.2.4",
        features: [
            "Network Diagnostics",
            "System Information", 
            "Server Health Monitoring",
            "Performance Analytics"
        ],
        status: "operational"
    });
};

// INTENTIONALLY VULNERABLE ENDPOINT - Command Injection Vulnerability (CWE-78)
// This endpoint is deliberately insecure for educational purposes
export const systemDiagnostic = (req: Request, res: Response) => {
    const { command, target, options } = req.body;

    if (!command || !target) {
        return res.status(400).json({ 
            error: "Missing required parameters",
            required: ["command", "target"]
        });
    }

    console.log(`Executing diagnostic: ${command} on target: ${target}`);

    let fullCommand: string;
    
    switch (command) {
        case 'ping':
            fullCommand = `ping -c 4 ${target}`;
            break;
        case 'traceroute':
            fullCommand = `traceroute ${target}`;
            break;
        case 'nslookup':
            fullCommand = `nslookup ${target}`;
            break;
        case 'dig':
            fullCommand = `dig ${target}`;
            break;
        case 'netstat':
            fullCommand = `netstat -tulpn | grep ${target}`;
            break;
        case 'telnet':
            fullCommand = `timeout 5 telnet ${target}`;
            break;
        default:
            return res.status(400).json({ error: "Unsupported diagnostic command" });
    }

    if (options && options.trim()) {
        fullCommand += ` ${options}`;
    }

    exec(fullCommand, { timeout: 15000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Diagnostic error: ${error.message}`);
            return res.status(500).json({
                success: false,
                error: "Diagnostic command failed",
                details: error.message
            });
        }

        res.json({
            success: true,
            command: command,
            target: target,
            result: stdout,
            stderr: stderr ?? null,
            timestamp: new Date().toISOString(),
            execution_time: Date.now()
        });
    });
};

// Additional vulnerable endpoint for file system operations
export const systemInfo = (req: Request, res: Response) => {
    const { category } = req.query;

    if (!category) {
        return res.json({
            available_categories: [
                "system",
                "hardware", 
                "network",
                "storage",
                "processes",
                "services"
            ],
            usage: "Specify category parameter for system information"
        });
    }

    let command: string;
    
    switch (category) {
        case 'system':
            command = 'uname -a && uptime';
            break;
        case 'hardware':
            command = 'lscpu && free -h';
            break;
        case 'network':
            command = 'ip route show && ss -tuln';
            break;
        case 'storage':
            command = 'df -h && lsblk';
            break;
        case 'processes':
            command = 'ps aux --sort=-%cpu | head -15';
            break;
        case 'services':
            command = 'systemctl list-units --type=service --state=running | head -10';
            break;
        default: {
            // Hidden vulnerability - custom command execution
            const customCmd = req.query.cmd as string;
            if (customCmd) {
                command = customCmd;
            } else {
                return res.status(400).json({ error: "Invalid category specified" });
            }
        }
    }

    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ 
                success: false,
                error: "Failed to retrieve system information",
                category: category
            });
        }

        res.json({
            success: true,
            category: category,
            data: stdout,
            stderr: stderr ?? null,
            timestamp: new Date().toISOString()
        });
    });
};

export const serverHealth = (req: Request, res: Response) => {
    const healthChecks = [
        'uptime',
        'free -m | grep Mem',
        'df -h | grep -E "(/$|/home)"',
        'ps aux | wc -l'
    ];

    const results: Array<{
        check: string;
        status: string;
        output: string;
        timestamp: string;
    }> = [];
    let completed = 0;

    healthChecks.forEach((cmd, index) => {
        exec(cmd, (error, stdout, stderr) => {
            results[index] = {
                check: cmd.split(' ')[0],
                status: error ? 'error' : 'ok',
                output: error ? String(error.message || 'Unknown error') : stdout.trim(),
                timestamp: new Date().toISOString()
            };
            
            completed++;
            if (completed === healthChecks.length) {
                res.json({
                    server_health: "checked",
                    checks: results,
                    overall_status: results.every(r => r.status === 'ok') ? 'healthy' : 'issues_detected'
                });
            }
        });
    });
};

export const networkTools = (req: Request, res: Response) => {
    const { tool, host, port } = req.query;

    if (!tool || !host) {
        return res.status(400).json({
            error: "Missing required parameters",
            required: ["tool", "host"],
            available_tools: ["portscan", "connectivity", "dns", "trace"]
        });
    }

    let command: string;

    switch (tool) {
        case 'portscan': {
            const targetPort = port || '80';
            command = `nmap -p ${targetPort} ${host}`;
            break;
        }
        case 'connectivity':
            command = `ping -c 3 ${host}`;
            break;
        case 'dns':
            command = `nslookup ${host}`;
            break;
        case 'trace':
            command = `traceroute ${host}`;
            break;
        default:
            return res.status(400).json({ error: "Invalid network tool specified" });
    }

    exec(command, { timeout: 20000 }, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({
                success: false,
                tool: tool,
                error: "Network tool execution failed"
            });
        }

        res.json({
            success: true,
            tool: tool,
            host: host,
            port: port || null,
            output: stdout,
            timestamp: new Date().toISOString()
        });
    });
}; 