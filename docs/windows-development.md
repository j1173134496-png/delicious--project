# Windows 开发交接

## 获取项目

安装 Git for Windows、Node.js LTS 和微信开发者工具。在 PowerShell 中执行：

```powershell
git clone https://github.com/j1173134496-png/delicious--project.git
cd delicious--project
```

在微信开发者工具中选择“导入项目”，选择仓库根目录。
`project.config.json` 的 `miniprogramRoot` 已指向 `miniprogram/`，
当前 AppID 以该配置文件为准；使用对应微信账号的项目开发权限。
README 中早期验收记录里的 `touristappid` 是历史测试信息。
目标基础库为 `3.4.3`。本机 `project.private.config.json` 会由工具生成，
不在 Git 中同步。

当前小程序没有 npm 依赖，不需要执行 `npm install`。
已有业务数据保存在原设备的微信本地 Storage 中，Git 只同步项目文件，
不会迁移聊天、相册、用户资料等本地运行数据。

## 离线检查

在仓库根目录的 PowerShell 中执行：

```powershell
node scripts/audit-assets.js
node scripts/validate-miniapp.js
Get-ChildItem miniprogram -Recurse -Filter *.js | ForEach-Object {
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "JavaScript syntax check failed: $($_.FullName)" }
}
Get-ChildItem scripts -Filter 'smoke-*.js' | ForEach-Object {
    node $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Smoke check failed: $($_.Name)" }
}
```

离线检查通过后，在微信开发者工具中编译并检查主要页面。
`releases/` 是历史发布快照，日常开发使用根目录和 `miniprogram/`。
`artifacts/batiao-3d/` 包含素材及 Blender 源文件；仅重新生成素材时需要 Blender。
`.codex/plans/` 中保留历史开发记录，其中 macOS 绝对路径属于历史环境信息。

## 后续同步

每次开始开发前执行 `git pull --ff-only`。完成修改后：

```powershell
git status
git add .
git commit -m "Describe the change"
git push
```

首次提交前，按自己的身份设置 `git config user.name` 和 `git config user.email`。
推送时使用自己的 GitHub 账号完成认证。
