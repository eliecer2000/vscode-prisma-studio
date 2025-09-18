"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
function activate(context) {
    // Crear botón en la barra de estado
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = "$(preview) Prisma Studio";
    statusBarItem.command = "prismaStudio.showMenu";
    statusBarItem.tooltip = "Prisma Studio Menu";
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    const onShowMenu = vscode.commands.registerCommand("prismaStudio.showMenu", async () => {
        const items = [
            { label: "$(preview) Open Prisma Studio", command: "prismaStudio.open" },
            { label: "$(play) Start Prisma Studio", command: "prismaStudio.startPrisma" },
            { label: "$(stop) Stop Prisma Studio", command: "prismaStudio.stopPrisma" },
            { label: "$(gear) Config Prisma Studio", command: "prismaStudio.config" }
        ];
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: "Select Prisma Studio action"
        });
        if (selected) {
            vscode.commands.executeCommand(selected.command);
        }
    });
    const onOpen = vscode.commands.registerCommand("prismaStudio.open", () => {
        PreviewPanel.createOrShow(context.extensionUri);
    });
    const onUrl = vscode.commands.registerCommand("prismaStudio.url", async () => {
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel.sendUrl();
        }
    });
    const onBack = vscode.commands.registerCommand("prismaStudio.back", () => {
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel.sendPageBack();
        }
    });
    const onForward = vscode.commands.registerCommand("prismaStudio.forward", () => {
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel.sendPageForward();
        }
    });
    const onRefresh = vscode.commands.registerCommand("prismaStudio.refresh", () => {
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel.sendRefresh();
        }
    });
    const onResponsiveView = vscode.commands.registerCommand("prismaStudio.responsiveView", () => {
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel.sendResponsiveView();
        }
    });
    const onScreenView = vscode.commands.registerCommand("prismaStudio.screenView", () => {
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel.toggleScreenView();
        }
    });
    const onOpenDevTools = vscode.commands.registerCommand("prismaStudio.openDevTools", () => {
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel.openDevTools();
        }
    });
    const onOpenInBrowser = vscode.commands.registerCommand("prismaStudio.openInBrowser", () => {
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel.openInBrowser();
        }
    });
    const onStartPrisma = vscode.commands.registerCommand("prismaStudio.startPrisma", async () => {
        await PrismaManager.startPrismaStudio();
    });
    const onStopPrisma = vscode.commands.registerCommand("prismaStudio.stopPrisma", async () => {
        await PrismaManager.stopPrismaStudio();
    });
    const onConfig = vscode.commands.registerCommand("prismaStudio.config", async () => {
        await vscode.commands.executeCommand("workbench.action.openSettings", "webPreview");
    });
    context.subscriptions.push(onShowMenu, onOpen, onUrl, onBack, onForward, onRefresh, onResponsiveView, onScreenView, onOpenDevTools, onOpenInBrowser, onStartPrisma, onStopPrisma, onConfig);
    if (vscode.window.registerWebviewPanelSerializer) {
        // Make sure we register a serializer in activation event
        vscode.window.registerWebviewPanelSerializer(PreviewPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel, state) {
                // Reset the webview options so we use latest uri for `localResourceRoots`.
                webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
                PreviewPanel.revive(webviewPanel, context.extensionUri, state?.previewUrl);
            },
        });
    }
}
function getWebviewOptions(extensionUri) {
    return {
        // Enable javascript in the webview
        enableScripts: true,
        // And restrict the webview to only loading content from our extension's `media` directory.
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "media")],
    };
}
/**
 * Manages Prisma Studio webview panels
 */
class PreviewPanel {
    static createOrShow(extensionUri) {
        // If we already have a panel, show it.
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel._panel.reveal(PreviewPanel.currentPanel._panel.viewColumn);
            return;
        }
        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(PreviewPanel.viewType, "Prisma Studio", vscode.ViewColumn.Two, getWebviewOptions(extensionUri));
        PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri);
    }
    static revive(panel, extensionUri, oldUrl) {
        PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri);
        PreviewPanel.currentPanel._currentUrl = oldUrl;
    }
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        vscode.commands.executeCommand("setContext", "PrismaStudioActive", true);
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);
        panel.iconPath = {
            light: vscode.Uri.joinPath(extensionUri, "media", "icons", "preview-light.svg"),
            dark: vscode.Uri.joinPath(extensionUri, "media", "icons", "preview-dark.svg"),
        };
        // Set the webview's initial html content
        this._update();
        // Listen for when the panel is disposed
        // This happens when the user closes the panel or when the panel is closed programmatically
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Update the content based on view changes
        this._panel.onDidChangeViewState((_e) => {
            if (this._panel.visible) {
                this._update();
            }
        }, null, this._disposables);
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("webPreview")) {
                this._currentUrl = undefined;
                this._update();
            }
        });
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage((message) => {
            if (message.command) {
                vscode.window.showInformationMessage(message.text);
                return;
            }
        }, null, this._disposables);
    }
    async sendUrl() {
        const url = await vscode.window.showInputBox({
            value: this._currentUrl,
            // @ts-expect-error
            valueSelection: [this._currentUrl?.length, this._currentUrl?.length],
            placeHolder: "http://localhost:5555",
        });
        if (!url)
            return;
        this._currentUrl = url;
        this._panel.webview.postMessage({ preview: { url } });
    }
    sendPageBack() {
        this._panel.webview.postMessage({ preview: { back: true } });
    }
    sendPageForward() {
        this._panel.webview.postMessage({ preview: { forward: true } });
    }
    sendRefresh() {
        this._panel.webview.postMessage({ preview: { refresh: true } });
    }
    sendResponsiveView() {
        this._panel.webview.postMessage({ preview: { responsive: true } });
    }
    toggleScreenView() {
        // @ts-expect-error
        if (this._panel.viewColumn > 1) {
            this._panel.reveal(vscode.ViewColumn.One);
        }
        else if (this._panel.viewColumn === 1) {
            this._panel.reveal(vscode.ViewColumn.Two);
        }
    }
    openDevTools() {
        vscode.commands.executeCommand("workbench.action.webview.openDeveloperTools");
    }
    openInBrowser() {
        const url = vscode.Uri.parse(`${this._currentUrl}`);
        vscode.env.openExternal(url);
    }
    dispose() {
        PreviewPanel.currentPanel = undefined;
        vscode.commands.executeCommand("setContext", "PrismaStudioActive", false);
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _update() {
        const config = vscode.workspace.getConfiguration("webPreview");
        const url = config.get("url", "http://localhost:5555");
        if (!this._currentUrl) {
            this._currentUrl = url;
        }
        const mediaScreenOverride = config.get("mediaScreenOverride", false);
        let mediaScreen = config.get("mediaScreen", {});
        if (mediaScreenOverride) {
            const inspect = config.inspect("mediaScreen");
            // @ts-expect-error
            mediaScreen = inspect.workspaceValue
                ? inspect?.workspaceValue
                : inspect?.globalValue
                    ? inspect?.globalValue
                    : inspect?.defaultValue;
        }
        // Vary the webview's content based on where it is located in the editor.
        if (this._panel.viewColumn) {
            this._panel.webview.postMessage({
                preview: { url: this._currentUrl, mediaScreen },
            });
        }
    }
    _getHtmlForWebview(webview) {
        // Local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, "media", "main.js");
        // And the uri we use to load this script in the webview
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);
        // Local path to css styles
        const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, "media", "main.css");
        // Uri to load styles into webview
        const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta name="theme-color" content="#000000">
				<title>Prisma Studio</title>
				<link href="${stylesMainUri}" rel="stylesheet">
                <script defer="defer" nonce="${nonce}" src="${scriptUri}"></script>
			</head>
			<body class="w-full min-h-full flex text-white bg-gray-900 !p-0 overflow-hidden">
                <noscript>You need to enable JavaScript to run this app.</noscript>
                <div id="root" class="w-full flex flex-none flex-col"></div>
            </body>
			</html>`;
    }
}
PreviewPanel.viewType = "prismaStudio";
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
class PrismaManager {
    static async startPrismaStudio() {
        try {
            const config = vscode.workspace.getConfiguration("webPreview");
            const port = config.get("port", 5555);
            // Check if port is already in use
            const isPortInUse = await PrismaManager.checkPort(port);
            if (isPortInUse) {
                const action = await vscode.window.showWarningMessage(`Port ${port} is already in use. Stop existing process?`, "Stop and Start", "Cancel");
                if (action === "Stop and Start") {
                    await PrismaManager.stopPrismaStudio();
                    // Wait a moment for process to stop
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                else {
                    return;
                }
            }
            const schemaPath = await PrismaManager.getSchemaPath();
            if (!schemaPath)
                return;
            vscode.window.showInformationMessage("Starting Prisma Studio...");
            const { spawn } = require("child_process");
            const command = "npx";
            const args = [
                "--yes",
                "prisma@latest",
                "studio",
                "--port",
                port.toString(),
                "--hostname",
                "0.0.0.0",
                "--browser",
                "none",
                "--schema",
                schemaPath
            ];
            PrismaManager.process = spawn(command, args, {
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
                detached: false
            });
            PrismaManager.process.stdout?.on("data", (data) => {
                const output = data.toString();
                if (output.includes("Studio is up")) {
                    vscode.window.showInformationMessage("Prisma Studio started successfully!");
                }
            });
            PrismaManager.process.stderr?.on("data", (data) => {
                const error = data.toString();
                if (error.includes("EADDRINUSE")) {
                    vscode.window.showErrorMessage(`Port ${port} is already in use`);
                }
                else {
                    vscode.window.showErrorMessage(`Prisma Studio error: ${error}`);
                }
            });
            PrismaManager.process.on("close", (code) => {
                PrismaManager.process = null;
                if (code !== 0 && code !== null) {
                    vscode.window.showErrorMessage(`Prisma Studio exited with code ${code}`);
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error starting Prisma Studio: ${error}`);
        }
    }
    static async stopPrismaStudio() {
        try {
            const config = vscode.workspace.getConfiguration("webPreview");
            const port = config.get("port", 5555);
            // Kill tracked process if exists
            if (PrismaManager.process) {
                PrismaManager.process.kill("SIGTERM");
                PrismaManager.process = null;
            }
            // Kill any process using the port
            const { exec } = require("child_process");
            const command = process.platform === 'win32'
                ? `netstat -ano | findstr :${port}`
                : `lsof -ti :${port}`;
            exec(command, (error, stdout) => {
                if (!error && stdout.trim()) {
                    const killCmd = process.platform === 'win32'
                        ? `taskkill /PID ${stdout.trim().split(/\s+/).pop()} /F`
                        : `kill -9 ${stdout.trim()}`;
                    exec(killCmd, (killError) => {
                        if (!killError) {
                            vscode.window.showInformationMessage("Prisma Studio stopped successfully!");
                        }
                        else {
                            vscode.window.showWarningMessage(`Could not stop process on port ${port}`);
                        }
                    });
                }
                else {
                    vscode.window.showInformationMessage("No Prisma Studio process found running");
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error stopping Prisma Studio: ${error}`);
        }
    }
    static async getSchemaPath() {
        // 1. Check configuration
        const config = vscode.workspace.getConfiguration("webPreview");
        const configPath = config.get("schemaPath", "");
        if (configPath) {
            return configPath;
        }
        // 2. Try to find schema.prisma in common locations
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const commonPaths = [
                "prisma/schema.prisma",
                "packages/prisma/schema.prisma",
                "apps/api/prisma/schema.prisma",
                "schema.prisma"
            ];
            for (const path of commonPaths) {
                try {
                    const fullPath = vscode.Uri.joinPath(workspaceFolder.uri, path);
                    const stat = await vscode.workspace.fs.stat(fullPath);
                    if (fullPath.fsPath.endsWith('schema.prisma')) {
                        return fullPath.fsPath;
                    }
                }
                catch {
                    // File doesn't exist, continue
                }
            }
        }
        // 3. Ask user to select schema file
        const selectedFile = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                "Prisma Schema": ["schema.prisma"]
            },
            openLabel: "Select Prisma Schema",
            title: "Select your schema.prisma file"
        });
        if (selectedFile && selectedFile[0]) {
            const schemaPath = selectedFile[0].fsPath;
            if (!schemaPath.endsWith('schema.prisma')) {
                vscode.window.showErrorMessage("Please select a valid schema.prisma file");
                return undefined;
            }
            // Save to configuration (workspace if available, otherwise global)
            try {
                const target = vscode.workspace.workspaceFolders
                    ? vscode.ConfigurationTarget.Workspace
                    : vscode.ConfigurationTarget.Global;
                await config.update("schemaPath", schemaPath, target);
            }
            catch (error) {
                // Ignore configuration save errors
            }
            return schemaPath;
        }
        vscode.window.showErrorMessage("Prisma schema file is required to start Prisma Studio");
        return undefined;
    }
    static async checkPort(port) {
        return new Promise((resolve) => {
            const { exec } = require("child_process");
            const command = process.platform === 'win32'
                ? `netstat -ano | findstr :${port}`
                : `lsof -i :${port}`;
            exec(command, (error, stdout) => {
                resolve(!error && stdout.trim().length > 0);
            });
        });
    }
}
PrismaManager.process = null;
//# sourceMappingURL=extension.js.map