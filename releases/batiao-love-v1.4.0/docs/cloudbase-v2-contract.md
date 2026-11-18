# CloudBase v2 接入草案

这一份只定义下一阶段的后端边界，当前 v1 不启用云调用。

## 迁移顺序

1. 先接微信身份和 `couples`，完成两台设备绑定与解绑。
2. 再迁移 `users`、`cats`、`messages`、`recipes`、`photos`、`feedback`。
3. 图片走云存储，数据库只保存文件 ID、缩略图信息和描述，不保存大体积 base64。
4. 本地数据先保留，首次登录时做一次可重试迁移；远端确认成功后才标记本地记录已同步。
5. 断网时继续本地读写，恢复网络后按 `updatedAt` 和稳定 ID 做幂等上传。

## 集合字段最小集

| 集合 | 关键字段 | 权限边界 |
| --- | --- | --- |
| `users` | `userId`, `openid`, `coupleId`, `profile`, `updatedAt` | 只读写本人 |
| `couples` | `coupleId`, `inviteCode`, `memberIds`, `anniversary`, `updatedAt` | 只有成员可读写 |
| `cats` | `coupleId`, `form`, `exp`, `stats`, `state`, `updatedAt` | 只有成员可读写 |
| `messages` | `messageId`, `coupleId`, `senderId`, `content`, `createdAt` | 成员可读，发送者可写 |
| `recipes` | `recipeId`, `coupleId`, `name`, `photos`, `likes`, `updatedAt` | 成员可读写 |
| `photos` | `photoId`, `coupleId`, `fileId`, `description`, `tags`, `createdAt` | 成员可读写 |
| `feedback` | `feedbackId`, `userId`, `category`, `content`, `createdAt` | 本人可写；后台可读 |

## 必须先确认的配置

- 真实小程序 AppID 与 CloudBase 环境 ID 的绑定关系；
- 使用 CloudBase 个人版试用还是标准版；
- 数据所在地域；
- 数据保留和删除规则；
- 是否允许接入真实 LLM；如允许，密钥只能放在云函数环境变量中；
- 是否需要自定义域名和独立管理后台。

在这些项目确认前，不在当前 v1 中打开 `wx.cloud` 或远程 API，避免半接入状态破坏离线回退。
