# C# 核心代码
```csharp
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace WinFormWebView2
{
	public partial class Form1 : Form
	{
		private WebView2 webView;
		private const int WM_HOTKEY = 0x0312;
		private const int HOT_KEY_ID = 1;
		private NotifyIcon trayIcon;

		// Win32 API 常量和方法
		private const int WM_NCHITTEST = 0x84;
		private const int HTCLIENT = 0x1;
		private const int HTCAPTION = 0x2;

		[DllImport("user32.dll")]
		private static extern bool RegisterHotKey(IntPtr hWnd, int id, int fsModifiers, int vk);

		[DllImport("user32.dll")]
		private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

		[DllImport("user32.dll")]
		private static extern IntPtr SendMessage(IntPtr hWnd, int Msg, IntPtr wParam, IntPtr lParam);

		[DllImport("user32.dll")]
		private static extern bool ReleaseCapture();

		public Form1()
		{
			InitializeComponent();

			// 设置基本窗体属性
			this.FormBorderStyle = FormBorderStyle.None;
			this.ShowInTaskbar = false;
			this.ControlBox = false;
			this.MinimizeBox = false;
			this.MaximizeBox = false;

			InitializeWebView();
			InitializeForm();
			InitializeTrayIcon();
			RegisterHotKey(this.Handle, HOT_KEY_ID, 2, (int)Keys.F4); // Alt + F4

			// 添加与前端的通信处理
			webView.WebMessageReceived += WebView_WebMessageReceived;

			// 添加鼠标按下事件处理
			this.MouseDown += Form1_MouseDown;

			// 添加键盘事件处理
			this.KeyPreview = true;
			this.KeyDown += Form1_KeyDown;
		}

		private void Form1_MouseDown(object sender, MouseEventArgs e)
		{
			if (e.Button == MouseButtons.Left)
			{
				ReleaseCapture();
				SendMessage(Handle, 0xA1, (IntPtr)0x2, IntPtr.Zero);
			}
		}

		private void Form1_KeyDown(object sender, KeyEventArgs e)
		{
			// 按下 F12 打开开发者工具
			if (e.KeyCode == Keys.F12)
			{
				webView.CoreWebView2.OpenDevToolsWindow();
			}
		}

		protected override void WndProc(ref Message m)
		{
			switch (m.Msg)
			{
				case WM_NCHITTEST:
					base.WndProc(ref m);
					if ((int)m.Result == HTCLIENT)
						m.Result = (IntPtr)HTCAPTION;
					return;
				case WM_HOTKEY:
					if (m.WParam.ToInt32() == HOT_KEY_ID)
					{
						this.Close();
					}
					break;
			}
			base.WndProc(ref m);
		}

		private void InitializeForm()
		{
			// 计算屏幕宽度的1/4
			int screenWidth = Screen.PrimaryScreen.WorkingArea.Width;
			int formWidth = screenWidth / 4;

			this.Width = formWidth;
			this.StartPosition = FormStartPosition.Manual;
			this.Location = new Point(Screen.PrimaryScreen.WorkingArea.Width - this.Width, 0);
			this.Height = Screen.PrimaryScreen.WorkingArea.Height;
			this.TopMost = true;
		}

		private async void InitializeWebView()
		{
			webView = new WebView2();
			webView.Dock = DockStyle.Fill;
			this.Controls.Add(webView);

			await webView.EnsureCoreWebView2Async();

			// 禁用默认的右键菜单
			webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
			// 禁用默认的缩放功能
			webView.CoreWebView2.Settings.IsZoomControlEnabled = false;
			// 禁用状态栏
			webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

			// 注入自定义 CSS 来隐藏滚动条
			await webView.CoreWebView2.ExecuteScriptAsync(@"
                document.head.insertAdjacentHTML('beforeend', '<style>
                    body::-webkit-scrollbar { display: none; }
                    body { 
                        margin: 0;
                        padding: 0;
                        overflow: hidden;
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                    #root {
                        width: 100%;
                        height: 100vh;
                        overflow: auto;
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                    #root::-webkit-scrollbar {
                        display: none;
                    }
                </style>');
            ");
			string reactFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "react");

			webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
				"app.local",
				reactFolder,
				CoreWebView2HostResourceAccessKind.Allow);

			webView.Source = new Uri("https://app.local/index.html");
		}

		private void InitializeTrayIcon()
		{
			trayIcon = new NotifyIcon
			{
				Icon = SystemIcons.Application,
				Visible = false,
				Text = "My Application"
			};

			trayIcon.DoubleClick += (sender, e) =>
			{
				this.Show();
				this.WindowState = FormWindowState.Normal;
				trayIcon.Visible = false;
			};

			var contextMenu = new ContextMenuStrip();
			var openMenuItem = new ToolStripMenuItem("打开");
			var exitMenuItem = new ToolStripMenuItem("退出");

			openMenuItem.Click += (sender, e) =>
			{
				this.Show();
				this.WindowState = FormWindowState.Normal;
				trayIcon.Visible = false;
			};

			exitMenuItem.Click += (sender, e) =>
			{
				trayIcon.Visible = false;
				Application.Exit();
			};

			contextMenu.Items.Add(openMenuItem);
			contextMenu.Items.Add(exitMenuItem);
			trayIcon.ContextMenuStrip = contextMenu;
		}

		private void WebView_WebMessageReceived(object sender, Microsoft.Web.WebView2.Core.CoreWebView2WebMessageReceivedEventArgs e)
		{

			string message = e.WebMessageAsJson;
			System.Diagnostics.Debug.WriteLine($"Received message: {message}");

			try
			{
				if (message.Contains("\"command\":\"minimize\""))
				{
					System.Diagnostics.Debug.WriteLine("Minimizing window");
					this.WindowState = FormWindowState.Minimized;
					this.Hide();
					trayIcon.Visible = true;
					// 发送确认消息回前端
					webView.CoreWebView2.PostWebMessageAsJson("{\"response\":\"minimize_success\"}");
				}
				else if (message.Contains("\"command\":\"close\""))
				{
					System.Diagnostics.Debug.WriteLine("Closing window");
					this.Close();
				}
				else if (message.Contains("\"command\":\"test\""))
				{
					System.Diagnostics.Debug.WriteLine("Received test message");
					// 发送确认消息回前端
					webView.CoreWebView2.PostWebMessageAsJson("{\"response\":\"test_success\"}");
				}
			}
			catch (Exception ex)
			{
				System.Diagnostics.Debug.WriteLine($"Error processing message: {ex.Message}");
			}
		}

		protected override void OnFormClosing(FormClosingEventArgs e)
		{
			if (trayIcon != null)
			{
				trayIcon.Dispose();
			}
			UnregisterHotKey(this.Handle, HOT_KEY_ID);
			base.OnFormClosing(e);
		}
	}
}
```
# 项目包含react 目录
```xml
<ItemGroup>
	  <Content Include="react\**\*">
		<CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>
	  </Content>
	</ItemGroup>
```


# 前后端通信
```csharp

using Microsoft.Web.WebView2.Core;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;

namespace MyApp
{
    public partial class MainForm : Form
    {
        private WebView2 webView;
        private Dictionary<string, TaskCompletionSource<string>> pendingRequests = new();

        public MainForm()
        {
            InitializeComponent();
            InitializeWebViewAsync();
        }

        private async void InitializeWebViewAsync()
        {
            webView = new WebView2
            {
                Dock = DockStyle.Fill
            };
            this.Controls.Add(webView);

            await webView.EnsureCoreWebView2Async();

            string reactFolder = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "react");

            webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                "app.local",
                reactFolder,
                CoreWebView2HostResourceAccessKind.Allow);

            webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            webView.Source = new Uri("https://app.local/index.html");
        }

        private void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var json = e.WebMessageAsJson;
                var request = JsonSerializer.Deserialize<FrontendRequest>(json);

                if (request != null && request.RequestId != null)
                {
                    HandleRequest(request);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("处理消息失败: " + ex.Message);
            }
        }

        private async void HandleRequest(FrontendRequest request)
        {
            var response = new
            {
                requestId = request.RequestId,
                data = $"后端收到指令：{request.Command}"
            };

            string jsonResponse = JsonSerializer.Serialize(response);
            await webView.CoreWebView2.ExecuteScriptAsync($@"
                window.dispatchEvent(new CustomEvent('backendResponse', {{ detail: {jsonResponse} }}));
            ");
        }

        private class FrontendRequest
        {
            public string? RequestId { get; set; }
            public string? Command { get; set; }
        }
    }
}

```
```ts
import React from 'react';
import useBackendApi from './useBackendApi';

const App = () => {
  const { sendRequest } = useBackendApi();

  const handleClick = async () => {
    try {
      const response = await sendRequest({ command: 'testCommand' });
      console.log('后端返回:', response);
    } catch (error) {
      console.error('请求失败', error);
    }
  };

  return (
    <div>
      <h1>前后端通信示例</h1>
      <button onClick={handleClick}>发送消息到后端</button>
    </div>
  );
};

export default App;

```
```ts
//useBackendApi.ts

import { useEffect, useRef } from 'react';

type RequestMap = {
  [requestId: string]: {
    resolve: (data: any) => void;
    reject: (reason?: any) => void;
  };
};

const useBackendApi = () => {
  const requests = useRef<RequestMap>({});

  useEffect(() => {
    const handler = (event: any) => {
      const { requestId, data } = event.detail;
      if (requestId && requests.current[requestId]) {
        requests.current[requestId].resolve(data);
        delete requests.current[requestId];
      }
    };

    window.addEventListener('backendResponse', handler);

    return () => {
      window.removeEventListener('backendResponse', handler);
    };
  }, []);

  const sendRequest = (payload: any) => {
    const requestId = Math.random().toString(36).substring(2);
    const message = { ...payload, requestId };

    return new Promise<any>((resolve, reject) => {
      requests.current[requestId] = { resolve, reject };
      (window as any).chrome?.webview?.postMessage(JSON.stringify(message));
    });
  };

  return { sendRequest };
};

export default useBackendApi;

```

# Markdown 带按钮代码
```ts
import { UserOutlined } from '@ant-design/icons';
import { Bubble } from '@ant-design/x';
import type { BubbleProps } from '@ant-design/x';
import { Typography } from 'antd';
import markdownit from 'markdown-it';
/* eslint-disable react/no-danger */
import React from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-okaidia.css'; // 推荐主题
import 'prismjs/components/prism-iecst';
const md = markdownit({
    html: true,
    breaks: true,
    highlight: function (str, lang) {
      let codeHtml = '';
      if (lang && Prism.languages[lang]) {
        try {
            codeHtml = Prism.highlight(str, Prism.languages[lang], lang);
        } catch (__) {}
      } else {
        codeHtml = md.utils.escapeHtml(str);
      }
      const codeId = `code-${Math.random().toString(36).slice(2)}`;
      console.log(codeId);
      console.log(codeHtml);
      //这里必须注意，不能格式化代码，否则会包含换行符到你的代码块中，导致空行出现
      return `<div style="position:relative;"><button class="copy-btn" data-target="${codeId}" style="position:absolute;right:8px;top:8px;z-index:2;">复制</button><div id="${codeId}" style="padding-top:32px;">${codeHtml}</div></div>`;
    }
  });
//
const text = `
> Render as markdown content to show rich text!
\`\`\`iecst
VAR;
\`\`\`
Link: [Ant Design X](https://x.ant.design)
\`\`\`iecst
END_VAR;
\`\`\`
`.trim();

const renderMarkdown: BubbleProps['messageRender'] = (content) => (
  <Typography>
    <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
  </Typography>
);

const Test = () => {
  const [renderKey, setRenderKey] = React.useState(0);

  React.useEffect(() => {
    const handler = (e) => {
        debugger;
      if (e.target.classList.contains('copy-btn')) {
        const codeId = e.target.getAttribute('data-target');
        const code = document.getElementById(codeId);
        if (code) {
          navigator.clipboard.writeText(code.innerText);
          e.target.innerText = '已复制!';
          setTimeout(() => { e.target.innerText = '复制'; }, 1000);
        }
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [renderKey]);

  return (
    <div style={{ height: 100 }} key={renderKey}>
      <Bubble
        typing
        content={text}
        messageRender={renderMarkdown}
        avatar={{ icon: <UserOutlined /> }}
      />
    </div>
  );
};

export default Test;
```
# 前端构建
```cmd
@echo off
set REACT_PATH=C:\Your\ReactApp
set WINFORM_PROJECT_PATH=C:\Your\WinFormApp
set OUTPUT_PATH=%WINFORM_PROJECT_PATH%\bin\Release\net6.0\win-x64\publish

cd /d %REACT_PATH%
call npm run build
xcopy build %WINFORM_PROJECT_PATH%\react /E /I /Y

cd /d %WINFORM_PROJECT_PATH%
dotnet publish -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true

explorer %OUTPUT_PATH%

```
