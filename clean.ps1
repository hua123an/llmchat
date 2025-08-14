# ChatLLM 项目清理脚本
# 删除所有构建生成的文件和目录

Write-Host "🧹 开始清理 ChatLLM 项目..." -ForegroundColor Green

# 要清理的目录列表
$directories = @(
    "dist",
    "dist-electron", 
    "dist-app",
    "release"
)

# 要清理的文件列表
$files = @(
    "auto-imports.d.ts",
    "components.d.ts"
)

# 删除目录
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "删除目录: $dir" -ForegroundColor Yellow
        try {
            # 先尝试正常删除
            Remove-Item -Recurse -Force $dir -ErrorAction Stop
            Write-Host "✅ 已删除: $dir" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️ 无法删除 $dir (可能被进程占用)" -ForegroundColor Red
            Write-Host "   建议: 关闭所有相关进程后重新运行此脚本" -ForegroundColor Gray
        }
    } else {
        Write-Host "跳过不存在的目录: $dir" -ForegroundColor Gray
    }
}

# 删除文件
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "删除文件: $file" -ForegroundColor Yellow
        try {
            Remove-Item -Force $file -ErrorAction Stop
            Write-Host "✅ 已删除: $file" -ForegroundColor Green
        }
        catch {
            Write-Host "❌ 无法删除: $file" -ForegroundColor Red
        }
    }
}

# 可选：清理node_modules（取消注释以启用）
# if (Test-Path "node_modules") {
#     $response = Read-Host "是否删除 node_modules 目录? [y/N]"
#     if ($response -eq "y" -or $response -eq "Y") {
#         Write-Host "删除 node_modules..." -ForegroundColor Yellow
#         Remove-Item -Recurse -Force "node_modules"
#         Write-Host "✅ 已删除 node_modules" -ForegroundColor Green
#         Write-Host "💡 记得运行 'npm install' 重新安装依赖" -ForegroundColor Cyan
#     }
# }

# 可选：清理package-lock.json
# if (Test-Path "package-lock.json") {
#     $response = Read-Host "是否删除 package-lock.json? [y/N]" 
#     if ($response -eq "y" -or $response -eq "Y") {
#         Remove-Item -Force "package-lock.json"
#         Write-Host "✅ 已删除 package-lock.json" -ForegroundColor Green
#     }
# }

Write-Host ""
Write-Host "🎉 清理完成!" -ForegroundColor Green
Write-Host "💡 提示: 下次构建将是全新的构建" -ForegroundColor Cyan

# 显示剩余磁盘空间
$currentPath = Get-Location
$drive = Split-Path -Qualifier $currentPath
$freeSpace = [math]::Round((Get-WmiObject -Class Win32_LogicalDisk | Where-Object DeviceID -eq $drive).FreeSpace / 1GB, 2)
Write-Host "💾 磁盘剩余空间: $freeSpace GB" -ForegroundColor Cyan
