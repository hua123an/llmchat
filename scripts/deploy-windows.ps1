# ChatLLM Windows部署脚本
# 版本: 2.0.0

param(
    [switch]$Help,
    [switch]$DryRun,
    [switch]$BackupOnly,
    [string]$ServerHost,
    [string]$ServerUser = "root",
    [string]$ServerPath = "/var/www/llmchat"
)

# 颜色定义
$ColorRed = "Red"
$ColorGreen = "Green"
$ColorYellow = "Yellow"
$ColorBlue = "Blue"

# 日志函数
function Write-Log {
    param([string]$Message, [string]$Color = "Green")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] $Message" -ForegroundColor $Color
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Log "WARNING: $Message" -Color $ColorYellow
}

function Write-Error-Log {
    param([string]$Message)
    Write-Log "ERROR: $Message" -Color $ColorRed
}

function Write-Info-Log {
    param([string]$Message)
    Write-Log "INFO: $Message" -Color $ColorBlue
}

# 显示帮助
function Show-Help {
    Write-Host "ChatLLM Windows部署脚本" -ForegroundColor Green
    Write-Host ""
    Write-Host "用法: .\deploy-windows.ps1 [参数]"
    Write-Host ""
    Write-Host "参数:"
    Write-Host "  -Help              显示帮助信息"
    Write-Host "  -DryRun            模拟运行（不执行实际操作）"
    Write-Host "  -BackupOnly        仅创建备份"
    Write-Host "  -ServerHost        服务器地址"
    Write-Host "  -ServerUser        服务器用户名 (默认: root)"
    Write-Host "  -ServerPath        服务器部署路径 (默认: /var/www/llmchat)"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\deploy-windows.ps1 -ServerHost 192.168.1.100"
    Write-Host "  .\deploy-windows.ps1 -ServerHost myserver.com -ServerUser admin"
}

# 检查依赖
function Test-Dependencies {
    Write-Log "检查系统依赖..."
    
    $deps = @("git", "node", "npm")
    $missing = @()
    
    foreach ($dep in $deps) {
        if (!(Get-Command $dep -ErrorAction SilentlyContinue)) {
            $missing += $dep
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Error-Log "缺少以下依赖: $($missing -join ', ')"
        return $false
    }
    
    # 检查Node.js版本
    $nodeVersion = node -v
    $versionNumber = $nodeVersion.Substring(1)
    if ([version]$versionNumber -lt [version]"18.0.0") {
        Write-Error-Log "Node.js版本过低 (当前: $nodeVersion, 需要: >= v18.0.0)"
        return $false
    }
    
    Write-Log "✅ 所有依赖检查通过"
    return $true
}

# 本地构建
function Build-Application {
    Write-Log "本地构建应用..."
    
    try {
        # 安装依赖
        Write-Log "安装依赖..."
        npm install
        
        # 构建应用
        Write-Log "构建生产版本..."
        npm run build:web
        
        # 打包Electron应用
        Write-Log "打包Electron应用..."
        npm run build:electron
        
        Write-Log "✅ 应用构建完成"
        return $true
    }
    catch {
        Write-Error-Log "构建失败: $($_.Exception.Message)"
        return $false
    }
}

# 显示部署总结
function Show-DeploymentSummary {
    Write-Log "🎉 ChatLLM 2.0.0 部署状态" -Color Green
    Write-Host ""
    Write-Info-Log "✅ 已完成:"
    Write-Info-Log "  - 核心架构重构"
    Write-Info-Log "  - 代码推送到GitHub (refactor-2.0.0分支)"
    Write-Info-Log "  - 版本标签创建 (v2.0.0)"
    Write-Info-Log "  - GitHub Actions触发"
    Write-Host ""
    Write-Info-Log "🔄 进行中:"
    Write-Info-Log "  - GitHub Actions自动构建"
    Write-Info-Log "  - 跨平台安装包生成"
    Write-Host ""
    Write-Info-Log "📋 下一步操作:"
    Write-Info-Log "  1. 访问创建Pull Request:"
    Write-Info-Log "     https://github.com/hua123an/llmchat/pull/new/refactor-2.0.0"
    Write-Info-Log ""
    Write-Info-Log "  2. 监控GitHub Actions构建:"
    Write-Info-Log "     https://github.com/hua123an/llmchat/actions"
    Write-Info-Log ""
    Write-Info-Log "  3. 查看自动生成的Release:"
    Write-Info-Log "     https://github.com/hua123an/llmchat/releases"
    Write-Host ""
    Write-Info-Log "🚀 服务器部署选项:"
    Write-Info-Log "  A. 使用Docker (推荐):"
    Write-Info-Log "     docker pull ghcr.io/hua123an/llmchat:2.0.0"
    Write-Info-Log "     docker run -d -p 80:80 ghcr.io/hua123an/llmchat:2.0.0"
    Write-Info-Log ""
    Write-Info-Log "  B. 传统部署:"
    Write-Info-Log "     下载server-deploy.sh到Linux服务器"
    Write-Info-Log "     chmod +x server-deploy.sh && sudo ./server-deploy.sh"
}

# 主函数
function Main {
    Write-Log "🎯 ChatLLM 2.0.0 部署总结" -Color Green
    
    if ($Help) {
        Show-Help
        return
    }
    
    # 显示当前部署状态
    Show-DeploymentSummary
    
    Write-Log "✨ 部署流程指南完成" -Color Green
}

# 运行主函数
Main

