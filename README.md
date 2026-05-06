# ccfddl_python_app

一个可长期对外访问的 Flask 网页（CCF 会议倒计时），可直接部署到 Render（无需域名/服务器）。

## 本地运行

```bash
cd ccfddl_python_app
python -m pip install -r requirements.txt
python app.py
```

打开 `http://127.0.0.1:5001`。

## Render 部署（长期稳定公网访问）

### 方式 1：用 `render.yaml`（推荐）

1. 把整个仓库推到 GitHub（确保 `ccfddl_python_app/` 在仓库中）。
2. Render 控制台选择 **New → Blueprint**。
3. 选择你的 GitHub 仓库，Render 会读取 `ccfddl_python_app/render.yaml` 自动创建服务。

部署完成后，Render 会提供固定地址：`https://<your-service>.onrender.com`

### 方式 2：手动创建 Web Service

1. Render 控制台：**New → Web Service**，选择 GitHub 仓库。
2. **Root Directory**：
   - 如果你的仓库根目录就是 `ccfddl_python_app`：留空
   - 如果 `ccfddl_python_app` 是仓库里的一个子目录：填 `ccfddl_python_app`
3. **Build Command**：

```bash
pip install -r requirements.txt
```

4. **Start Command**：

```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

Render 会自动注入 `PORT`，无需自己写死端口。

## 数据来源

- 默认使用 `data/conferences.json`
- 可用环境变量切换文件路径：
  - `CONF_DATA_FILE=/path/to/conferences.json`

