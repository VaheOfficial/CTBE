import express from "express";
import { getAdminDashboard, systemDiagnostic, systemInfo, serverHealth, networkTools } from "../controllers/admin.controller";

const router = express.Router();

// Admin dashboard
router.get("/", (req, res) => {
    getAdminDashboard(req, res);
});

// Network and system diagnostic tools
router.post("/diagnostic", (req, res) => {
    systemDiagnostic(req, res);
});

// System information endpoint
router.get("/system-info", (req, res) => {
    systemInfo(req, res);
});

// Server health monitoring
router.get("/health", (req, res) => {
    serverHealth(req, res);
});

// Network diagnostic tools
router.get("/network", (req, res) => {
    networkTools(req, res);
});

// API documentation
router.get("/docs", (req, res) => {
    res.json({
        title: "Admin API Documentation",
        version: "1.2.4",
        endpoints: [
            {
                path: "/admin",
                method: "GET",
                description: "Admin dashboard overview"
            },
            {
                path: "/admin/diagnostic",
                method: "POST",
                description: "Network diagnostic tools",
                parameters: {
                    command: "ping | traceroute | nslookup | dig | netstat | telnet",
                    target: "IP address or hostname",
                    options: "Additional command options (optional)"
                }
            },
            {
                path: "/admin/system-info",
                method: "GET", 
                description: "System information by category",
                parameters: {
                    category: "system | hardware | network | storage | processes | services"
                }
            },
            {
                path: "/admin/health",
                method: "GET",
                description: "Server health check"
            },
            {
                path: "/admin/network",
                method: "GET",
                description: "Network diagnostic utilities",
                parameters: {
                    tool: "portscan | connectivity | dns | trace",
                    host: "Target hostname or IP",
                    port: "Port number (for portscan)"
                }
            }
        ]
    });
});

export default router; 